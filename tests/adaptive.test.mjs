/* Federated Adaptive Learning — math correctness tests.
   Loads adaptive.js in a sandbox with minimal stubs and exercises the pure
   estimation and federated-averaging logic (no browser required). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const JS = join(dirname(fileURLToPath(import.meta.url)), "..", "js");

function freshAdaptive() {
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const ctx = {
    console, Math, JSON, Date,
    localStorage,
    Cloud: { enabled: false },
    Auth: { currentEmail: () => "test@vitstudent.ac.in" },
    HANDBOOK: [],
    chapterStatusFor: () => ({ done: 0, total: 1, quiz: false, chal: false, complete: false })
  };
  vm.createContext(ctx);
  const src = readFileSync(join(JS, "adaptive.js"), "utf8") + "\n;Adaptive";
  return vm.runInContext(src, ctx);
}

test("estimate: bounded in [0,1] and monotonic in struggle", () => {
  const A = freshAdaptive();
  const easy = A._estimate({ errors: 0, hints: 0, attempts: 0, solved: false });
  const mid = A._estimate({ errors: 2, hints: 1, attempts: 0, solved: false });
  const hard = A._estimate({ errors: 5, hints: 3, attempts: 2, solved: false });
  for (const v of [easy, mid, hard]) assert.ok(v >= 0 && v <= 1);
  assert.ok(easy < mid && mid < hard, "more struggle → higher difficulty");
});

test("estimate: solving a module attenuates its difficulty", () => {
  const A = freshAdaptive();
  const sig = { errors: 3, hints: 1, attempts: 1 };
  const unsolved = A._estimate({ ...sig, solved: false });
  const solved = A._estimate({ ...sig, solved: true });
  assert.ok(solved < unsolved);
});

test("federated averaging: weighted mean is exact", () => {
  const A = freshAdaptive();
  A._aggregateLocal({ "3": { est: 0.8, w: 2 } });
  assert.equal(A.globalModel()["3"].n, 2);
  assert.equal(A.globalModel()["3"].diff, 0.8);
  A._aggregateLocal({ "3": { est: 0.4, w: 2 } });          // (0.8*2 + 0.4*2)/4 = 0.6
  assert.equal(A.globalModel()["3"].n, 4);
  assert.ok(Math.abs(A.globalModel()["3"].diff - 0.6) < 1e-9);
});

test("k-anonymity: difficulty is hidden below MIN_SAMPLES", () => {
  const A = freshAdaptive();
  A._aggregateLocal({ "5": { est: 0.9, w: 1 } });          // n=1 < MIN_SAMPLES(2)
  assert.equal(A.difficultyOf("5"), null, "single-sample estimate not exposed");
  A._aggregateLocal({ "5": { est: 0.9, w: 1 } });          // n=2
  assert.notEqual(A.difficultyOf("5"), null, "exposed once the floor is met");
});

test("differential-privacy perturbation stays in [0,1]", () => {
  const A = freshAdaptive();
  for (let i = 0; i < 200; i++) {
    const v = A._dp(i % 2 ? 0 : 1);
    assert.ok(v >= 0 && v <= 1);
  }
});

test("contribution never double-counts a device's evidence", () => {
  const A = freshAdaptive();
  A.observe(2, { errors: 2 });                 // contributes once
  const n1 = A.globalModel()["2"].n;
  A.observe(2, {});                            // no new evidence → no growth
  const n2 = A.globalModel()["2"].n;
  assert.equal(n1, n2, "re-contributing without new evidence must not grow n");
  A.observe(2, { errors: 1 });                 // new evidence → grows
  assert.ok(A.globalModel()["2"].n > n2);
});

test("global model holds only aggregates — no identity, no raw events", () => {
  const A = freshAdaptive();
  A.observe(4, { errors: 3, hints: 1 });
  const model = A.globalModel();
  for (const v of Object.values(model)) {
    assert.deepEqual(Object.keys(v).sort(), ["diff", "n"]);
  }
  assert.equal(JSON.stringify(model).includes("test@"), false);
});

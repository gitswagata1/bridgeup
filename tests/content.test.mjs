/* Content-integrity tests — the course data must stay well-formed.
   Loads the pure data modules (no DOM) in a sandbox and asserts on them. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const JS = join(dirname(fileURLToPath(import.meta.url)), "..", "js");
const read = (f) => readFileSync(join(JS, f), "utf8");

// data.js + handbook.js are pure (data + one scoring fn); evaluate together and
// return the bindings via a trailing expression in the same scope.
const src = read("data.js") + "\n" + read("handbook.js") +
  "\n;({ EXAM, LEVELS, SKILL_AREAS, CURRICULUM, HANDBOOK, placementFor })";
const ctx = { console };
vm.createContext(ctx);
const { EXAM, LEVELS, SKILL_AREAS, CURRICULUM, HANDBOOK, placementFor } = vm.runInContext(src, ctx);

test("handbook: 8 chapters numbered 1..8", () => {
  assert.equal(HANDBOOK.length, 8);
  assert.equal(HANDBOOK.map((c) => c.ch).join(","), "1,2,3,4,5,6,7,8");
  HANDBOOK.forEach((c) => assert.ok(c.title && typeof c.title === "string"));
});

test("handbook: exactly 99 lessons, all with unique ids", () => {
  const secs = HANDBOOK.flatMap((c) => c.sections);
  assert.equal(secs.length, 99);
  const ids = secs.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "section ids must be unique");
  secs.forEach((s) => {
    assert.ok(s.id && s.title, "each section has id + title");
    assert.ok(Array.isArray(s.blocks) && s.blocks.length, "each section has blocks");
  });
});

test("handbook: every code block is a non-empty string", () => {
  HANDBOOK.flatMap((c) => c.sections).flatMap((s) => s.blocks)
    .filter((b) => b.t === "code")
    .forEach((b) => assert.ok(typeof b.x === "string" && b.x.length, "code block has source"));
});

test("exam: 10 questions, valid answers and known levels", () => {
  assert.equal(EXAM.length, 10);
  const levels = new Set(SKILL_AREAS);
  EXAM.forEach((q, i) => {
    assert.ok(Array.isArray(q.options) && q.options.length >= 2, `q${i} has options`);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `q${i} answer in range`);
    assert.ok(levels.has(q.level), `q${i} has a known skill area (${q.level})`);
  });
});

test("levels: 3 levels whose ranges cover the whole 0..10 score space", () => {
  assert.equal(LEVELS.length, 3);
  for (let score = 0; score <= 10; score++) {
    const hit = LEVELS.filter((l) => score >= l.range[0] && score <= l.range[1]);
    assert.equal(hit.length, 1, `score ${score} maps to exactly one level`);
  }
});

test("placementFor: returns a valid level for every score 0..10", () => {
  for (let s = 0; s <= 10; s++) {
    const p = placementFor(s);
    assert.ok(p && p.name && p.key, `score ${s} placed`);
    assert.ok(LEVELS.some((l) => l.key === p.key));
  }
});

test("curriculum: every unit id is unique", () => {
  const ids = CURRICULUM.map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
});

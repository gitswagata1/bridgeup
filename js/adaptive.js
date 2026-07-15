/* ============================================================
   BridgeUp — Federated Adaptive Learning engine  (patent PoC)

   A privacy-preserving adaptive system with three layers:

   1. LOCAL OBSERVATION — each learner's struggle signals
      (quiz errors, challenge retries, hint reveals, code errors)
      are recorded ON DEVICE and never leave it as raw data.

   2. FEDERATED MODEL — the device periodically derives a compact,
      per-module difficulty *estimate* (a single number + a bounded
      weight), optionally perturbed with differential-privacy noise,
      and contributes it to a shared global model via weighted
      averaging (FedAvg-style). Raw events and identity are never
      transmitted; the global model holds only aggregates.

   3. CONTEXT-PRESERVING MEMORY — a device-resident memory of the
      concepts a learner has found hard, carried across lessons and
      sessions into the AI tutor's context.

   In local mode the aggregate lives in this browser (simulating the
   federation server). In campus mode contributions are merged
   server-side by the contribute_adaptive() RPC (see schema.sql), so
   the global model improves from every device without centralising
   any student's raw learning data.
   ============================================================ */

const Adaptive = {
  MODEL_KEY: "bridgeup_global_model",
  DP_EPSILON: 0.06,          // differential-privacy noise scale on contributions
  WEIGHT_CAP: 5,             // clip any single device's per-round contribution weight
  MIN_SAMPLES: 2,            // k-anonymity floor: don't expose an estimate below this
  DIFFICULTY_PRIOR: 0.3,     // neutral prior for an unseen module
  HARD_THRESHOLD: 0.5,       // public "commonly challenging" flag (conservative)
  MEMORY_THRESHOLD: 0.4,     // private tutor-memory capture (more sensitive)

  _obsKey() { return "bridgeup:obs:" + (Auth.currentEmail() || "guest"); },
  _memKey() { return "bridgeup:memory:" + (Auth.currentEmail() || "guest"); },

  /* ---------- 1. LOCAL OBSERVATION (device-only) ---------- */
  _obs() { try { return JSON.parse(localStorage.getItem(this._obsKey()) || "{}"); } catch { return {}; } },
  _saveObs(o) { localStorage.setItem(this._obsKey(), JSON.stringify(o)); },

  /* Record a struggle signal for a module (chapter number).
     signal: { errors?, hints?, attempts?, solved? } */
  observe(ch, signal) {
    if (!ch) return;
    const o = this._obs();
    const e = o[ch] || { errors: 0, hints: 0, attempts: 0, solved: false, cw: 0 };
    if (signal.errors) e.errors += signal.errors;
    if (signal.hints) e.hints += signal.hints;
    if (signal.attempts) e.attempts += signal.attempts;
    if (signal.solved) e.solved = true;
    o[ch] = e;
    this._saveObs(o);
    this._updateMemory(ch, e);
    this.contribute();   // fold new evidence into the federated model
  },

  /* Local difficulty estimate for one module from its raw signals (0..1). */
  _estimate(e) {
    const raw = Math.max(0, e.attempts) * 0.30 + e.hints * 0.20 + e.errors * 0.15;
    let s = 1 - Math.exp(-raw);                 // saturating: more struggle → closer to 1
    if (e.solved) s *= 0.7;                       // solving it eventually lowers difficulty
    return Math.max(0, Math.min(1, s));
  },
  _evidence(e) { return e.errors + e.hints + e.attempts + (e.solved ? 1 : 0); },

  /* Differential privacy: clip, then add bounded uniform noise. */
  _dp(x) {
    const noise = (Math.random() - 0.5) * this.DP_EPSILON;
    return Math.max(0, Math.min(1, x + noise));
  },

  /* ---------- 2. FEDERATED MODEL ---------- */
  globalModel() {
    if (typeof Cloud !== "undefined" && Cloud.enabled) return Cloud.cache.globalModel || {};
    try { return JSON.parse(localStorage.getItem(this.MODEL_KEY) || "{}"); } catch { return {}; }
  },

  /* Contribute only the NEW evidence accrued since the last round, so a
     device is never double-counted. Sends {est, w} per module — never raw
     events, never identity. */
  contribute() {
    const o = this._obs();
    const update = {};
    let changed = false;
    for (const [ch, e] of Object.entries(o)) {
      const delta = this._evidence(e) - (e.cw || 0);
      if (delta <= 0) continue;
      update[ch] = { est: this._dp(this._estimate(e)), w: Math.min(delta, this.WEIGHT_CAP) };
      e.cw = this._evidence(e);
      changed = true;
    }
    if (!changed) return;
    this._saveObs(o);
    if (typeof Cloud !== "undefined" && Cloud.enabled) { Cloud.contributeAdaptive(update); return; }
    this._aggregateLocal(update);
  },

  /* Local-mode federation server: weighted-average merge (FedAvg analogue). */
  _aggregateLocal(update) {
    let m; try { m = JSON.parse(localStorage.getItem(this.MODEL_KEY) || "{}"); } catch { m = {}; }
    for (const [ch, u] of Object.entries(update)) {
      const g = m[ch] || { diff: this.DIFFICULTY_PRIOR, n: 0 };
      g.diff = (g.diff * g.n + u.est * u.w) / (g.n + u.w);
      g.n += u.w;
      m[ch] = g;
    }
    localStorage.setItem(this.MODEL_KEY, JSON.stringify(m));
  },

  /* ---------- adaptation outputs ---------- */
  difficultyOf(ch) {
    const g = this.globalModel()[ch];
    return g && g.n >= this.MIN_SAMPLES ? g.diff : null;
  },
  isHard(ch) { const d = this.difficultyOf(ch); return d != null && d >= this.HARD_THRESHOLD; },
  difficultyLabel(ch) {
    const d = this.difficultyOf(ch);
    if (d == null) return null;
    return d >= 0.66 ? "Commonly challenging" : d >= 0.5 ? "Takes practice" : "Approachable";
  },

  /* Personal mastery (device-private) from the learner's own progress. */
  mastery(progress, ch) {
    const st = chapterStatusFor(progress, ch);
    const parts = st.total ? st.done / st.total : 0;
    return Math.round((parts * 0.6 + (st.quiz ? 0.2 : 0) + (st.chal ? 0.2 : 0)) * 100);
  },

  /* Recommend the next module to focus on, blending the learner's own
     progress with the federated difficulty signal. */
  recommend(progress) {
    const next = HANDBOOK.find(c => !chapterStatusFor(progress, c.ch).complete);
    if (!next) return null;
    const d = this.difficultyOf(next.ch);
    return {
      ch: next.ch, title: next.title,
      difficulty: d, hard: d != null && d >= this.HARD_THRESHOLD,
      label: this.difficultyLabel(next.ch),
      mastery: this.mastery(progress, next.ch)
    };
  },

  /* ---------- 3. CONTEXT-PRESERVING MEMORY (device-resident) ---------- */
  memory() { try { return JSON.parse(localStorage.getItem(this._memKey()) || "{}"); } catch { return {}; } },
  _updateMemory(ch, e) {
    const m = this.memory();
    m.struggled = m.struggled || {};
    if (this._estimate(e) >= this.MEMORY_THRESHOLD && !e.solved) m.struggled[ch] = true; else delete m.struggled[ch];
    m.lastModule = ch;
    m.updatedAt = Date.now();
    localStorage.setItem(this._memKey(), JSON.stringify(m));
  },
  memorySummary() {
    const struggled = Object.keys(this.memory().struggled || {});
    if (!struggled.length) return "";
    const titles = struggled.map(ch => (HANDBOOK.find(c => String(c.ch) === String(ch)) || {}).title).filter(Boolean);
    return "Tutor memory — this learner has previously found these modules challenging: " + titles.join(", ") +
      ". Offer extra patience and concrete examples there.";
  },

  /* Local-mode demo seed: a bootstrap global model representing prior
     federated rounds (aggregate difficulty only — no student data). */
  seedGlobalModel() {
    if (typeof Cloud !== "undefined" && Cloud.enabled) return;
    if (localStorage.getItem(this.MODEL_KEY)) return;
    const boot = { 2: [0.44, 26], 3: [0.61, 31], 4: [0.38, 22], 6: [0.57, 24], 7: [0.68, 29], 8: [0.41, 18] };
    const m = {};
    for (const [ch, [diff, n]] of Object.entries(boot)) m[ch] = { diff, n };
    localStorage.setItem(this.MODEL_KEY, JSON.stringify(m));
  }
};

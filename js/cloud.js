/* ============================================================
   BridgeUp cloud layer — Supabase adapter for campus deployment.

   When js/config.js has a project URL + anon key, this module
   replaces the browser-local "database" with a real one:
   auth, progress, tests, marks and materials become shared
   across every device. The app keeps its synchronous reads by
   working from an in-memory cache that this layer hydrates on
   login and keeps fresh after every write.

   Design notes:
   - Roles are assigned by the database (see supabase/schema.sql),
     never trusted from the client.
   - Progress is one jsonb blob per user — the exact object the
     app already uses — saved with a short debounce.
   - Test approval votes go through the vote_test() RPC so the
     panel rules are enforced server-side.
   - For local testing without a real project, setting
     localStorage["bridgeup:mockcloud"] = "1" swaps in a tiny
     in-browser mock of the Supabase client with the same rules.
   ============================================================ */

const Cloud = {
  enabled: false,
  client: null,
  me: null,                    // { id, email, name, role }
  progressData: {},            // my progress blob (live reference for store)
  cache: { profiles: [], tests: [], materials: [], results: [], progressByEmail: {}, globalModel: {} },
  _saveTimer: null,
  _lastRefresh: 0,

  config() { return window.BRIDGEUP_CONFIG || {}; },

  /* A backend is "configured" only when a URL + anon key are present AND demo
     mode isn't forced. `?demo=1` (persisted) forces the local demo cohort even
     on a campus deployment — one URL for the real pilot, `?demo=1` for instant
     click-around demos. `?demo=0` (or `?live=1`) returns to the real backend. */
  demoForced() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("demo") === "1") localStorage.setItem("bridgeup:demo", "1");
      if (q.get("demo") === "0" || q.get("live") === "1") localStorage.removeItem("bridgeup:demo");
      return localStorage.getItem("bridgeup:demo") === "1";
    } catch { return false; }
  },

  configured() {
    if (this.demoForced()) return false;
    const c = this.config();
    return !!(c.supabaseUrl && c.supabaseAnonKey) || localStorage.getItem("bridgeup:mockcloud") === "1";
  },

  async init() {
    if (!this.configured()) return false;
    if (localStorage.getItem("bridgeup:mockcloud") === "1") {
      this.client = _mockSupabase();
    } else {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      this.client = createClient(this.config().supabaseUrl, this.config().supabaseAnonKey);
    }
    this.enabled = true;
    const { data } = await this.client.auth.getSession();
    if (data && data.session) await this.hydrate();
    return true;
  },

  /* ---------- auth ---------- */
  async signup({ name, email, password }) {
    const { data, error } = await this.client.auth.signUp({
      email: (email || "").trim().toLowerCase(),
      password: password || "",
      options: { data: { name: (name || "").trim() } }
    });
    if (error) return { error: error.message };
    if (!data.session) return { error: "Account created — confirm the email we sent you, then log in." };
    await this.hydrate();
    return { ok: true };
  },

  async login({ email, password }) {
    if (this._logoutP) { await this._logoutP; this._logoutP = null; }
    const { error } = await this.client.auth.signInWithPassword({
      email: (email || "").trim().toLowerCase(), password: password || ""
    });
    if (error) return { error: error.message };
    await this.hydrate();
    if (!this.me) return { error: "Signed in, but no profile was found. Ask the admin to check the database setup." };
    return { ok: true };
  },

  logout() {
    // clear state synchronously so the UI can't show stale data,
    // then flush the last progress save and end the session.
    clearTimeout(this._saveTimer);
    const meWas = this.me, dataWas = this.progressData;
    this.me = null;
    this.progressData = {};
    this.cache = { profiles: [], tests: [], materials: [], results: [], progressByEmail: {}, globalModel: {} };
    this._logoutP = (async () => {
      if (meWas) {
        await this.client.from("progress")
          .upsert({ user_id: meWas.id, data: dataWas, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      }
      await this.client.auth.signOut();
    })();
    return this._logoutP;
  },

  /* ---------- hydrate: pull everything this role needs ---------- */
  async hydrate() {
    const { data: s } = await this.client.auth.getSession();
    const uidNow = s && s.session && s.session.user && s.session.user.id;
    if (!uidNow) { this.me = null; return; }

    const { data: prof } = await this.client.from("profiles").select("*").eq("id", uidNow);
    this.me = (prof && prof[0]) || null;
    if (!this.me) return;

    const { data: mine } = await this.client.from("progress").select("*").eq("user_id", uidNow);
    this.progressData = (mine && mine[0] && mine[0].data) || {};

    await this.refreshAll(true);
  },

  async refreshAll(force) {
    if (!this.me) return;
    if (!force && Date.now() - this._lastRefresh < 4000) return;
    this._lastRefresh = Date.now();

    const [profiles, tests, materials, results] = await Promise.all([
      this.client.from("profiles").select("*"),
      this.client.from("tests").select("*"),
      this.client.from("materials").select("*"),
      this.client.from("test_results").select("*")
    ]);
    this.cache.profiles = profiles.data || [];
    const byId = Object.fromEntries(this.cache.profiles.map(p => [p.id, p]));
    const emailOf = id => (byId[id] || {}).email || "unknown";
    const nameOf = id => (byId[id] || {}).name || "Unknown";

    this.cache.tests = (tests.data || []).map(t => ({
      id: t.id, title: t.title, ch: t.ch, questions: t.questions, status: t.status,
      approvals: t.approvals || [], rejections: t.rejections || [],
      author: emailOf(t.author), authorName: nameOf(t.author), authorId: t.author, at: +new Date(t.created_at)
    }));
    this.cache.materials = (materials.data || []).map(m => ({
      id: m.id, ch: m.ch, kind: m.kind, title: m.title, content: m.content,
      author: emailOf(m.author), authorName: nameOf(m.author), at: +new Date(m.created_at)
    }));
    this.cache.results = (results.data || []).map(r => ({
      testId: r.test_id, userId: r.user_id, email: emailOf(r.user_id), name: nameOf(r.user_id),
      score: r.score, total: r.total, answers: r.answers, at: +new Date(r.at)
    }));

    if (this.me.role === "faculty" || this.me.role === "admin") {
      const { data: allProg } = await this.client.from("progress").select("*");
      this.cache.progressByEmail = Object.fromEntries((allProg || []).map(row => [emailOf(row.user_id), row.data || {}]));
    }
    this.cache.progressByEmail[this.me.email] = this.progressData;

    const gm = await this.client.from("global_model").select("*");
    this.cache.globalModel = Object.fromEntries((gm.data || []).map(r => [r.module_id, { diff: r.difficulty, n: r.samples }]));
  },

  /* ---------- accounts (app-shape) ---------- */
  accounts() { return this.cache.profiles.map(p => ({ email: p.email, name: p.name, role: p.role })); },
  idFor(email) { const p = this.cache.profiles.find(x => x.email === email); return p && p.id; },

  /* ---------- progress ---------- */
  queueSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveNow(), 800);
  },
  async saveNow() {
    clearTimeout(this._saveTimer);
    if (!this.me) return;
    const { error } = await this.client.from("progress")
      .upsert({ user_id: this.me.id, data: this.progressData, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) console.warn("BridgeUp: progress save failed —", error.message);
  },

  /* ---------- tests ---------- */
  async saveTest(t, status) {
    const row = { title: t.title, ch: t.ch, questions: t.questions, status };
    if (status === "pending") { row.approvals = []; row.rejections = []; }
    let error;
    if (t.id && this.cache.tests.some(x => x.id === t.id)) {
      ({ error } = await this.client.from("tests").update(row).eq("id", t.id));
    } else {
      row.author = this.me.id;
      ({ error } = await this.client.from("tests").insert(row));
    }
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  },
  async setTestStatus(id, status, resetVotes) {
    const row = resetVotes ? { status, approvals: [], rejections: [] } : { status };
    const { error } = await this.client.from("tests").update(row).eq("id", id);
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  },
  async deleteTest(id) {
    const { error } = await this.client.from("tests").delete().eq("id", id);
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  },
  /* federated adaptive: contribute derived per-module estimates (no raw data). */
  async contributeAdaptive(update) {
    if (!this.me || !update || !Object.keys(update).length) return;
    const { error } = await this.client.rpc("contribute_adaptive", { p_update: update });
    if (error) { console.warn("BridgeUp: adaptive contribution failed —", error.message); return; }
    // reflect locally so the UI updates without a full refresh
    for (const [k, u] of Object.entries(update)) {
      const g = this.cache.globalModel[k] || { diff: 0.3, n: 0 };
      g.diff = (g.diff * g.n + u.est * u.w) / (g.n + u.w); g.n += u.w;
      this.cache.globalModel[k] = g;
    }
  },

  async vote(id, approve, reason) {
    const { error } = await this.client.rpc("vote_test", { p_test: id, p_approve: approve, p_reason: reason || "" });
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  },
  async submitResult(testId, score, total, answers) {
    const { error } = await this.client.from("test_results")
      .insert({ test_id: testId, user_id: this.me.id, score, total, answers });
    if (error && !/duplicate|unique/i.test(error.message)) return { error: error.message };
    this.cache.results.push({ testId, userId: this.me.id, email: this.me.email, name: this.me.name, score, total, answers, at: Date.now() });
    return { ok: true };
  },
  marksFor(testId) {
    return this.cache.results.filter(r => r.testId === testId)
      .map(r => ({ name: r.name, email: r.email, score: r.score, total: r.total, at: r.at }))
      .sort((a, b) => b.score - a.score);
  },
  myResult(testId) {
    const r = this.cache.results.find(x => x.testId === testId && this.me && x.userId === this.me.id);
    return r ? { score: r.score, total: r.total, at: r.at, answers: r.answers } : null;
  },

  /* ---------- materials ---------- */
  async addMaterial(m) {
    const { error } = await this.client.from("materials")
      .insert({ ch: m.ch, kind: m.kind, title: m.title, content: m.content, author: this.me.id });
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  },
  async deleteMaterial(id) {
    const { error } = await this.client.from("materials").delete().eq("id", id);
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  },

  /* ---------- admin ---------- */
  async setRole(email, role) {
    const id = this.idFor(email);
    if (!id) return { error: "User not found" };
    const { error } = await this.client.rpc("set_role", { p_user: id, p_role: role });
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  },
  async resetProgress(email) {
    const id = this.idFor(email);
    if (!id) return { error: "User not found" };
    const { error } = await this.client.rpc("admin_reset_progress", { p_user: id });
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  },
  async deleteUser(email) {
    const id = this.idFor(email);
    if (!id) return { error: "User not found" };
    const { error } = await this.client.rpc("admin_delete_user", { p_user: id });
    if (error) return { error: error.message };
    await this.refreshAll(true);
    return { ok: true };
  }
};

/* ============================================================
   Mock Supabase client — testing only (bridgeup:mockcloud=1).
   Implements the narrow query surface Cloud uses, with the same
   server-side rules as supabase/schema.sql, persisted to
   localStorage so multiple logins simulate multiple devices.
   ============================================================ */
function _mockSupabase() {
  const DB_KEY = "bridgeup_cloud_mock_db";
  const load = () => { try { return JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch { return null; } };
  const db = load() || { users: [], profiles: [], progress: [], tests: [], materials: [], test_results: [], global_model: [], session: null, seq: 1 };
  if (!db.global_model) db.global_model = [];
  const save = () => localStorage.setItem(DB_KEY, JSON.stringify(db));
  const uuid = () => "m-" + (db.seq++) + "-" + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();
  const adminEmail = ((window.BRIDGEUP_CONFIG || {}).adminEmail || "").toLowerCase();
  const roleFor = e =>
    e === adminEmail ? "admin" :
    /@vit\.ac\.in$/.test(e) ? "faculty" :
    /@vitstudent\.ac\.in$/.test(e) ? "student" : "student";
  const myId = () => db.session && db.session.user.id;
  const myRole = () => { const p = db.profiles.find(x => x.id === myId()); return p && p.role; };

  const auth = {
    async signUp({ email, password, options }) {
      email = email.toLowerCase();
      if (db.users.some(u => u.email === email)) return { data: {}, error: { message: "User already registered" } };
      const user = { id: uuid(), email, pw: btoa(password) };
      db.users.push(user);
      db.profiles.push({ id: user.id, email, name: (options && options.data && options.data.name) || email.split("@")[0], role: roleFor(email), created_at: now() });
      db.progress.push({ user_id: user.id, data: {}, updated_at: now() });
      db.session = { user: { id: user.id, email } };
      save();
      return { data: { user, session: db.session }, error: null };
    },
    async signInWithPassword({ email, password }) {
      email = email.toLowerCase();
      const u = db.users.find(x => x.email === email && x.pw === btoa(password));
      if (!u) return { data: {}, error: { message: "Invalid login credentials" } };
      db.session = { user: { id: u.id, email } }; save();
      return { data: { session: db.session }, error: null };
    },
    async signOut() { db.session = null; save(); return { error: null }; },
    async getSession() { return { data: { session: db.session } }; }
  };

  function table(name) {
    const rows = () => db[name];
    const visible = () => {
      if (name === "tests" && myRole() === "student") return rows().filter(r => r.status === "approved");
      if (name === "progress" && myRole() === "student") return rows().filter(r => r.user_id === myId());
      if (name === "test_results" && myRole() === "student") return rows().filter(r => r.user_id === myId());
      return rows();
    };
    return {
      select() {
        const q = { _f: [] };
        q.eq = (col, val) => { q._f.push([col, val]); return q; };
        q.then = (res) => res({ data: visible().filter(r => q._f.every(([c, v]) => r[c] === v)).map(r => ({ ...r })), error: null });
        return q;
      },
      insert(obj) {
        return (async () => {
          const row = { ...obj, created_at: now(), at: now() };
          if (name === "tests") { row.id = uuid(); row.approvals = row.approvals || []; row.rejections = row.rejections || []; }
          if (name === "materials") row.id = uuid();
          if (name === "test_results" && rows().some(r => r.test_id === row.test_id && r.user_id === row.user_id))
            return { error: { message: "duplicate key value violates unique constraint" } };
          rows().push(row); save();
          return { data: [row], error: null };
        })();
      },
      update(obj) {
        return { eq: (col, val) => (async () => {
          rows().forEach(r => { if (r[col] === val) Object.assign(r, obj); }); save();
          return { data: null, error: null };
        })() };
      },
      upsert(obj, opts) {
        return (async () => {
          const key = (opts && opts.onConflict) || "id";
          const hit = rows().find(r => r[key] === obj[key]);
          if (hit) Object.assign(hit, obj); else rows().push({ ...obj });
          save();
          return { data: null, error: null };
        })();
      },
      delete() {
        return { eq: (col, val) => (async () => {
          db[name] = rows().filter(r => r[col] !== val); save();
          return { data: null, error: null };
        })() };
      }
    };
  }

  async function rpc(fn, args) {
    const err = m => ({ data: null, error: { message: m } });
    if (fn === "vote_test") {
      const me = db.profiles.find(p => p.id === myId());
      const t = db.tests.find(x => x.id === args.p_test);
      if (!me || me.role !== "faculty") return err("Only faculty can vote");
      if (!t) return err("Test not found");
      if (t.author === me.id) return err("Authors cannot vote on their own test");
      if (t.status !== "pending") return err("This test is not in review");
      if (t.approvals.includes(me.email) || t.rejections.some(r => r.email === me.email)) return err("You have already voted on this test");
      if (args.p_approve) t.approvals.push(me.email);
      else t.rejections.push({ email: me.email, reason: args.p_reason || "" });
      const needed = Math.min(3, Math.max(1, db.profiles.filter(p => p.role === "faculty" && p.id !== t.author).length));
      if (t.approvals.length >= needed) t.status = "approved";
      else if (t.rejections.length >= needed) t.status = "rejected";
      save();
      return { data: null, error: null };
    }
    if (fn === "set_role") {
      if (myRole() !== "admin") return err("Admin only");
      if (!["student", "faculty"].includes(args.p_role)) return err("Invalid role");
      const p = db.profiles.find(x => x.id === args.p_user);
      if (p && p.role !== "admin") { p.role = args.p_role; save(); }
      return { data: null, error: null };
    }
    if (fn === "admin_reset_progress") {
      if (myRole() !== "admin") return err("Admin only");
      const pr = db.progress.find(x => x.user_id === args.p_user);
      if (pr) pr.data = {};
      db.test_results = db.test_results.filter(r => r.user_id !== args.p_user);
      save();
      return { data: null, error: null };
    }
    if (fn === "admin_delete_user") {
      if (myRole() !== "admin") return err("Admin only");
      const p = db.profiles.find(x => x.id === args.p_user);
      if (p && p.role !== "admin") {
        db.profiles = db.profiles.filter(x => x.id !== args.p_user);
        db.progress = db.progress.filter(x => x.user_id !== args.p_user);
        db.test_results = db.test_results.filter(x => x.user_id !== args.p_user);
        db.tests = db.tests.filter(x => x.author !== args.p_user);
        db.materials = db.materials.filter(x => x.author !== args.p_user);
        save();
      }
      return { data: null, error: null };
    }
    if (fn === "contribute_adaptive") {
      const u = args.p_update || {};
      for (const k of Object.keys(u)) {
        const est = Math.max(0, Math.min(1, +u[k].est)); const w = Math.max(0, Math.min(5, +u[k].w));
        if (w <= 0) continue;
        let g = db.global_model.find(r => r.module_id === k);
        if (!g) { g = { module_id: k, difficulty: est, samples: w }; db.global_model.push(g); }
        else { g.difficulty = (g.difficulty * g.samples + est * w) / (g.samples + w); g.samples += w; }
      }
      save();
      return { data: null, error: null };
    }
    return err("Unknown RPC " + fn);
  }

  return { auth, from: table, rpc };
}

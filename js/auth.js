/* ============================================================
   BridgeUp auth — client-side accounts for VIT students.
   Demo-grade: accounts live in this browser's localStorage.
   Passwords are never stored in plaintext — only a salted
   SHA-256 hash is kept. Registration is limited to
   @vitstudent.ac.in email addresses.
   ============================================================ */

const Auth = {
  // Students register with @vitstudent.ac.in, faculty with @vit.ac.in.
  // Admins can't self-register — a default admin is seeded on first load.
  DOMAINS: { student: "@vitstudent.ac.in", faculty: "@vit.ac.in", admin: "@bridgeup.app" },
  roleLabel: { student: "Student", faculty: "Faculty", admin: "Admin" },
  accountsKey: "bridgeup_accounts",
  sessionKey: "bridgeup_session",
  progressPrefix: "bridgeup:progress:",
  ADMIN_EMAIL: "admin@bridgeup.app",
  ADMIN_DEFAULT_PW: "admin123",

  _accounts() {
    try { return JSON.parse(localStorage.getItem(this.accountsKey) || "{}"); }
    catch { return {}; }
  },
  _saveAccounts(a) { localStorage.setItem(this.accountsKey, JSON.stringify(a)); },

  currentEmail() {
    if (typeof Cloud !== "undefined" && Cloud.enabled) return Cloud.me ? Cloud.me.email : null;
    return localStorage.getItem(this.sessionKey) || null;
  },
  currentUser() {
    if (typeof Cloud !== "undefined" && Cloud.enabled) return Cloud.me ? { email: Cloud.me.email, name: Cloud.me.name, role: Cloud.me.role } : null;
    const e = this.currentEmail();
    if (!e) return null;
    const acc = this._accounts()[e];
    return acc ? { email: e, name: acc.name, role: acc.role || "student" } : null;
  },

  validEmailFor(role, email) {
    email = String(email).trim();
    // campus mode: the configured admin address may sign up regardless of domain
    if (typeof Cloud !== "undefined" && Cloud.enabled &&
        email.toLowerCase() === ((window.BRIDGEUP_CONFIG || {}).adminEmail || "").toLowerCase()) return true;
    const re = role === "faculty"
      ? /^[^\s@]+@vit\.ac\.in$/i
      : /^[^\s@]+@vitstudent\.ac\.in$/i;
    return re.test(email);
  },

  async _hash(pw) {
    const salted = pw + "::bridgeup::v1";
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback for non-secure contexts (e.g. file://) — still avoids plaintext.
    let h = 0;
    for (let i = 0; i < salted.length; i++) h = (h * 31 + salted.charCodeAt(i)) | 0;
    return "f" + (h >>> 0).toString(16);
  },

  async signup({ name, email, password, role }) {
    role = role === "faculty" ? "faculty" : "student";
    name = (name || "").trim();
    email = (email || "").trim().toLowerCase();
    password = password || "";
    if (name.length < 2) return { error: "Please enter your full name." };
    if (!this.validEmailFor(role, email)) {
      return { error: role === "faculty"
        ? "Faculty must use a VIT email ending in @vit.ac.in."
        : "Students must use a VIT email ending in @vitstudent.ac.in." };
    }
    if (password.length < 6) return { error: "Password must be at least 6 characters." };

    if (typeof Cloud !== "undefined" && Cloud.enabled) return Cloud.signup({ name, email, password });

    const accounts = this._accounts();
    if (accounts[email]) return { error: "An account with this email already exists — try logging in." };

    accounts[email] = { name, hash: await this._hash(password), role };
    this._saveAccounts(accounts);
    localStorage.setItem(this.sessionKey, email);
    return { ok: true };
  },

  async login({ email, password }) {
    email = (email || "").trim().toLowerCase();
    password = password || "";
    if (typeof Cloud !== "undefined" && Cloud.enabled) return Cloud.login({ email, password });
    const acc = this._accounts()[email];
    if (!acc) return { error: "No account found for that email. Create one with the “New account” tab." };
    if ((await this._hash(password)) !== acc.hash) return { error: "Incorrect password. Please try again." };
    localStorage.setItem(this.sessionKey, email);
    return { ok: true };
  },

  logout() {
    if (typeof Cloud !== "undefined" && Cloud.enabled) return Cloud.logout();
    localStorage.removeItem(this.sessionKey);
  },

  /* ---------- admin capabilities ---------- */
  isAdmin() { const u = this.currentUser(); return !!u && u.role === "admin"; },

  allAccounts() {
    if (typeof Cloud !== "undefined" && Cloud.enabled) return Cloud.accounts();
    const a = this._accounts();
    return Object.keys(a).map(email => ({ email, name: a[email].name, role: a[email].role || "student" }));
  },

  deleteAccount(email) {
    const a = this._accounts();
    delete a[email];
    this._saveAccounts(a);
    localStorage.removeItem(this.progressPrefix + email);
  },

  setRole(email, role) {
    if (!["student", "faculty"].includes(role)) return;   // never promote to admin from the UI
    const a = this._accounts();
    if (a[email] && a[email].role !== "admin") { a[email].role = role; this._saveAccounts(a); }
  },

  /* Seed the default admin account once, so someone can always sign in. */
  async init() {
    if (typeof Cloud !== "undefined" && Cloud.enabled) return;   // campus mode: roles live in the database
    const a = this._accounts();
    if (!a[this.ADMIN_EMAIL]) {
      a[this.ADMIN_EMAIL] = { name: "Administrator", hash: await this._hash(this.ADMIN_DEFAULT_PW), role: "admin" };
      this._saveAccounts(a);
    }
  }
};

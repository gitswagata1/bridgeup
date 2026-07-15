/* ============================================================
   BridgeUp app — tiny hash-free router + views
   ============================================================ */

const app = document.getElementById("app");

/* Progress is stored per logged-in account, so each VIT student
   keeps their own exam result and lesson completion. */
function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const store = {
  _key() { return "bridgeup:progress:" + (Auth.currentEmail() || "guest"); },
  get() {
    if (Cloud.enabled && Cloud.me) return Cloud.progressData;
    try { return JSON.parse(localStorage.getItem(this._key()) || "{}"); }
    catch { return {}; }
  },
  set(patch) {
    if (Cloud.enabled && Cloud.me) {
      Object.assign(Cloud.progressData, patch);
      Cloud.progressData.activity = { ...(Cloud.progressData.activity || {}), [todayKey()]: true };
      Cloud.queueSave();
      return Cloud.progressData;
    }
    const next = { ...this.get(), ...patch };
    // every save marks today as an active day — this is what streaks count
    next.activity = { ...(next.activity || {}), [todayKey()]: true };
    localStorage.setItem(this._key(), JSON.stringify(next));
    return next;
  },
  clear() {
    if (Cloud.enabled && Cloud.me) {
      Object.keys(Cloud.progressData).forEach(k => delete Cloud.progressData[k]);
      Cloud.queueSave();
      return;
    }
    localStorage.removeItem(this._key());
  }
};

/* Admin helpers — read/reset any account's progress and export the DB. */
function progressForEmail(email) {
  if (Cloud.enabled) return Cloud.cache.progressByEmail[email] || {};
  try { return JSON.parse(localStorage.getItem(Auth.progressPrefix + email) || "{}"); }
  catch { return {}; }
}
function resetProgressFor(email) { localStorage.removeItem(Auth.progressPrefix + email); }

function adminExport() {
  const dump = Cloud.enabled
    ? {
        exportedAt: new Date().toISOString(), mode: "campus",
        accounts: Cloud.accounts(), progress: Cloud.cache.progressByEmail,
        tests: Cloud.cache.tests, materials: Cloud.cache.materials, results: Cloud.cache.results
      }
    : {
        exportedAt: new Date().toISOString(),
        accounts: JSON.parse(localStorage.getItem(Auth.accountsKey) || "{}"),
        progress: {}
      };
  if (!Cloud.enabled) Auth.allAccounts().forEach(a => { dump.progress[a.email] = progressForEmail(a.email); });
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bridgeup-database.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Handbook course (real content) ---------- */
const CH_META = {
  1: { color: "#3b82f6", icon: "sprout", level: "Beginner", time: "~45 min",
    outcome: "Use Python as a calculator, and work with text and lists.",
    overview: "Meet Python hands-on. Use it as a calculator, manipulate text (strings), and group values into lists — the three building blocks you'll reach for in every program you write.",
    objectives: ["Use Python as a calculator with + - * / // % **", "Create and slice strings", "Build and modify lists", "Take your first steps toward programming with variables"],
    takeaways: ["/ always returns a float; // floors and % gives the remainder", "Strings are immutable; index from 0 and slice with [a:b]", "Lists are mutable, ordered collections", "len() gives the length of a string or list"],
    practice: ["Compute the area of a circle with radius 5", "Print the first three letters of your name with a slice", "Build a list of five numbers and print the last two", "Swap two variables with a, b = b, a"] },
  2: { color: "#6366f1", icon: "bolt", level: "Beginner", time: "~1 hour",
    outcome: "Branch, loop, and write your own functions.",
    overview: "Give your programs a brain and reusable parts. Branch with if, repeat with for and while, generate ranges, and define your own functions with def.",
    objectives: ["Branch with if / elif / else", "Loop with for and the range() function", "Use break, continue, and loop else", "Define functions with def and return"],
    takeaways: ["for iterates over any sequence; range() makes number sequences", "break exits a loop; continue skips to the next pass", "def defines a function; return sends a value back", "Functions support default and keyword arguments"],
    practice: ["Print FizzBuzz for 1 to 20", "Write a function that returns the larger of two numbers", "Sum a list of numbers with a loop", "Write fib(n) that prints the Fibonacci series below n"] },
  3: { color: "#14b8a6", icon: "layers", level: "Core", time: "~1.5 hours",
    outcome: "Master lists, comprehensions, tuples, sets, and dicts.",
    overview: "Go deep on Python's collections. Use lists as stacks and queues, write elegant comprehensions, and reach for tuples, sets, and dictionaries to model real-world data.",
    objectives: ["Use list methods and list comprehensions", "Work with tuples and sequence unpacking", "Use sets for unique values and membership", "Store key-value data in dictionaries"],
    takeaways: ["Comprehensions build lists in one readable expression", "Tuples are immutable; sets hold only unique items", "dict maps keys to values; loop with .items()", "del removes items or slices from a list"],
    practice: ["Build a list of squares with a comprehension", "Remove duplicates from a list using a set", "Count word frequencies with a dictionary", "Unpack a tuple into three variables"] },
  4: { color: "#0ea5e9", icon: "book", level: "Core", time: "~45 min",
    outcome: "Organise code into modules and packages.",
    overview: "As programs grow, you split them across files. Learn to import modules, run a module as a script, structure code into packages, and tap into Python's standard modules.",
    objectives: ["Import modules and specific names from them", "Run a module as a script", "Structure larger programs with packages", "Use standard modules like math and sys"],
    takeaways: ["import module, then use module.function()", "from module import name imports one name", "if __name__ == '__main__' detects script execution", "Packages are folders of related modules"],
    practice: ["Import math and print math.pi and math.sqrt(2)", "Use from random import choice to pick from a list", "Write a small module and import it", "Print sys.path to see the search path"] },
  5: { color: "#f59e0b", icon: "download", level: "Core", time: "~1 hour",
    outcome: "Format output beautifully and read/write files.",
    overview: "Make output readable and make data last. Format strings with f-strings and str.format(), then read from and write to files — including saving structured data as JSON.",
    objectives: ["Format output with f-strings and str.format()", "Convert between strings and numbers", "Read from and write to files", "Save and load data with json"],
    takeaways: ["f-strings: f\"{value:.2f}\" formats inline", "with open(...) closes files automatically", "Modes: 'r' read, 'w' write, 'a' append", "json.dump / json.load save and load data"],
    practice: ["Print pi to 3 decimal places with an f-string", "Write three lines to a file and read them back", "Right-align a number in a field of width 10", "Save a dictionary to a JSON file"] },
  6: { color: "#ef4444", icon: "alert", level: "Core", time: "~45 min",
    outcome: "Handle errors gracefully with try / except.",
    overview: "Every program hits errors. Learn to tell syntax errors from exceptions, read tracebacks, handle problems with try/except, and raise your own exceptions.",
    objectives: ["Tell syntax errors from exceptions", "Handle exceptions with try / except", "Use else and finally clauses", "Raise exceptions with raise"],
    takeaways: ["try runs risky code; except handles the failure", "Catch specific types (ValueError, ZeroDivisionError, ...)", "finally always runs; else runs when no error occurs", "raise triggers an exception yourself"],
    practice: ["Catch the error when int('abc') fails", "Write safe_divide that handles division by zero", "Use finally to always print 'done'", "Raise a ValueError for a negative age"] },
  7: { color: "#8b5cf6", icon: "target", level: "Advanced", time: "~1.5 hours",
    outcome: "Model the world with classes and objects.",
    overview: "Object-oriented programming lets you model real things as objects. Define classes, create instances, add methods and attributes, and reuse code with inheritance.",
    objectives: ["Define a class and create instances", "Add attributes and methods using self", "Initialise objects with __init__", "Reuse and extend classes with inheritance"],
    takeaways: ["A class is a blueprint; an instance is an object", "self refers to the current instance", "__init__ runs when an object is created", "class Child(Parent) inherits from Parent"],
    practice: ["Make a Dog class with a bark() method", "Store a name attribute set in __init__", "Create a Counter class with an increment method", "Subclass Animal to make a Cat that overrides speak()"] },
  8: { color: "#ec4899", icon: "rocket", level: "Advanced", time: "~1 hour",
    outcome: "Explore Python's 'batteries included' library.",
    overview: "Python ships with a vast standard library. Take a guided tour — files and the OS, maths and statistics, dates and times, and reaching out to the web — all built in.",
    objectives: ["Work with files and the OS via os and shutil", "Do maths and stats with math, random, statistics", "Handle dates and times with datetime", "Discover modules for the web and more"],
    takeaways: ["The standard library covers a huge range of tasks", "os and pathlib work with files and folders", "random and statistics handle chance and data", "datetime works with dates and times"],
    practice: ["Roll a die with random.randint(1, 6)", "Print today's date with datetime", "Compute the mean of a list with statistics", "List files in a folder with os.listdir"] }
};

/* Lightweight Python syntax highlighter (safe: escapes as it tokenizes). */
function highlightPython(code) {
  const KEY = new Set("def return if elif else for while in and or not import from as with class lambda is del yield assert global nonlocal pass break continue try except finally raise".split(" "));
  const CONST = new Set(["True", "False", "None"]);
  const BUILT = new Set("print input int float str bool list dict set tuple len range type abs round sum min max sorted reversed enumerate open ord chr map filter zip".split(" "));
  const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const re = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/g;
  let out = "", last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="t-str">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="t-num">${esc(m[3])}</span>`;
    else {
      const w = m[4];
      if (KEY.has(w)) out += `<span class="t-kw">${w}</span>`;
      else if (CONST.has(w)) out += `<span class="t-const">${w}</span>`;
      else if (BUILT.has(w)) out += `<span class="t-fn">${w}</span>`;
      else out += esc(w);
    }
    last = re.lastIndex;
  }
  out += esc(code.slice(last));
  return out;
}

/* Tutorial code is often a REPL session (>>> and output). Strip prompts and
   drop output lines so what lands in the Scratchpad actually runs. */
function runnableCode(code) {
  if (code == null) return code;
  if (!code.includes(">>>")) return code;
  const lines = [];
  for (const line of code.split("\n")) {
    const m = line.match(/^(>>>|\.\.\.)\s?(.*)$/);
    if (m) lines.push(m[2]);   // keep only input lines, without the prompt
  }
  return lines.length ? lines.join("\n") : code;
}

const ALL_SECTIONS = HANDBOOK.flatMap(c => c.sections.map(s => ({ ...s, chapter: c })));

/* Topics that step beyond the basics get an "Advanced" tag in lesson lists.
   Chapters 7-8 are Advanced at chapter level, so their lessons aren't re-tagged. */
const ADV_SECTIONS = new Set([
  "s14",                                    // match statements
  "s19", "s20", "s21", "s22", "s24",        // special params, *args/**kwargs, unpacking, lambda, annotations
  "s30", "s31", "s38",                      // list comprehensions, nested comprehensions, sequence comparison
  "s42", "s43", "s47", "s48", "s49",        // module search path, compiled files, import *, relative imports, __path__
  "s64", "s65", "s68", "s69"                // exception chaining, custom exceptions, exception groups, notes
]);
const advTag = id => ADV_SECTIONS.has(id) ? ` <span class="adv-tag">Advanced</span>` : "";

/* Optional nice-to-know topics get a "Bonus" tag — extras, style guides, legacy notes. */
const BONUS_SECTIONS = new Set([
  "s25",                        // Intermezzo: Coding Style
  "s55",                        // Old string formatting
  "s80", "s84",                 // Random Remarks, Odds and Ends
  "s97", "s98", "s99"           // Performance measurement, Quality control, Batteries included
]);
const bonusTag = id => BONUS_SECTIONS.has(id) ? ` <span class="bonus-tag">Bonus</span>` : "";
const topicTags = id => advTag(id) + bonusTag(id);

/* ---------- Gamification: XP, levels, streaks ----------
   XP is derived from progress (never stored), so it can't drift out of sync. */
const XP_RULES = { section: 10, quiz: 25, challenge: 50, exam: 20 };
const XP_LEVELS = [
  { xp: 0,    name: "Newcomer"   },
  { xp: 150,  name: "Learner"    },
  { xp: 450,  name: "Coder"      },
  { xp: 900,  name: "Builder"    },
  { xp: 1400, name: "Pythonista" }
];
const XP_MAX = ALL_SECTIONS.length * XP_RULES.section + HANDBOOK.length * (XP_RULES.quiz + XP_RULES.challenge) + XP_RULES.exam;

function xpForProgress(p) {
  const s = studentSummary(p);
  return s.sec * XP_RULES.section + s.quizzes * XP_RULES.quiz + s.challenges * XP_RULES.challenge +
    (typeof p.score === "number" ? XP_RULES.exam : 0);
}

function levelForXP(xp) {
  let idx = 0;
  XP_LEVELS.forEach((l, i) => { if (xp >= l.xp) idx = i; });
  const cur = XP_LEVELS[idx], next = XP_LEVELS[idx + 1] || null;
  const pct = next ? Math.round((xp - cur.xp) / (next.xp - cur.xp) * 100) : 100;
  return { n: idx + 1, name: cur.name, next, pct };
}

/* Streak = consecutive active days ending today (or yesterday, so it
   doesn't read as broken before you've studied today). */
function streakInfo(p) {
  const days = Object.keys(p.activity || {}).sort();
  if (!days.length) return { current: 0, best: 0 };
  const has = d => !!(p.activity || {})[d];
  const key = (dt) => dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]), cur = new Date(days[i]);
    run = (cur - prev === 86400000) ? run + 1 : 1;
    if (run > best) best = run;
  }
  const anchor = new Date();
  if (!has(key(anchor))) anchor.setDate(anchor.getDate() - 1);   // grace: count up to yesterday
  let current = 0;
  while (has(key(anchor))) { current++; anchor.setDate(anchor.getDate() - 1); }
  return { current, best: Math.max(best, current) };
}

/* Certificate unlocks when the whole course is genuinely done. */
function certificateEligible(p) {
  const s = studentSummary(p);
  return s.sec === TOTAL_SECTIONS && s.quizzes === HANDBOOK.length && s.challenges === HANDBOOK.length;
}

/* ---------- Shared stores: faculty tests & materials ----------
   Cross-role data (any signed-in role reads the same list). Demo-grade,
   same localStorage constraints as accounts. */
function sharedGet(key) { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function sharedSet(key, v) { localStorage.setItem(key, JSON.stringify(v)); }
const TESTS_KEY = "bridgeup_tests";
const MATERIALS_KEY = "bridgeup_materials";
const allTests = () => Cloud.enabled ? Cloud.cache.tests : sharedGet(TESTS_KEY);
const saveTests = t => sharedSet(TESTS_KEY, t);            // local mode only
const allMaterials = () => Cloud.enabled ? Cloud.cache.materials : sharedGet(MATERIALS_KEY);
const saveMaterials = m => sharedSet(MATERIALS_KEY, m);    // local mode only
const uid = () => "t" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

/* Faculty tests are peer-reviewed before students see them: a panel of up
   to 5 faculty decides, majority (3 approvals) publishes. Small pilots
   scale the threshold down to however many other faculty exist. */
function approvalsNeededFor(test) {
  const others = Auth.allAccounts().filter(a => a.role === "faculty" && a.email !== test.author).length;
  return Math.max(1, Math.min(3, others));
}
function refreshTestStatus(t) {
  if (Cloud.enabled) return t;   // campus mode: status is decided server-side (vote_test RPC)
  if (t.status === "pending") {
    const need = approvalsNeededFor(t);
    if ((t.approvals || []).length >= need) t.status = "approved";
    else if ((t.rejections || []).length >= need) t.status = "rejected";
  }
  return t;
}
function updateTest(id, fn) {
  const tests = allTests();
  const t = tests.find(x => x.id === id);
  if (!t) return;
  fn(t); refreshTestStatus(t); saveTests(tests);
}
function approvedTests() { return allTests().map(refreshTestStatus).filter(t => t.status === "approved"); }
function testResultFor(p, id) {
  if (Cloud.enabled) return Cloud.myResult(id);
  return (p.tests || {})[id] || null;
}
function testMarks(testId) {
  if (Cloud.enabled) return Cloud.marksFor(testId);
  return Auth.allAccounts().filter(a => a.role === "student").map(a => {
    const r = (progressForEmail(a.email).tests || {})[testId];
    return r ? { name: a.name, email: a.email, ...r } : null;
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}
const TEST_STATUS = {
  draft:    { label: "Draft",        cls: "ts-draft" },
  pending:  { label: "In review",    cls: "ts-pending" },
  approved: { label: "Live",         cls: "ts-live" },
  rejected: { label: "Rejected",     cls: "ts-rejected" }
};

/* ---------- Personal AI tutor ----------
   "Personal" is literal: each user brings their own free Gemini API key,
   stored only in this browser. Requests go straight to Google — there is
   no BridgeUp server in between. */
const Tutor = {
  KEY: "bridgeup_llm_key",
  MODEL: "bridgeup_llm_model",
  MODELS: ["gemini-2.5-flash", "gemini-2.0-flash"],
  key() { return localStorage.getItem(this.KEY) || ""; },
  model() { return localStorage.getItem(this.MODEL) || this.MODELS[0]; },
  save(key, model) {
    if (key) localStorage.setItem(this.KEY, key.trim()); else localStorage.removeItem(this.KEY);
    if (model) localStorage.setItem(this.MODEL, model);
  },
  async ask(history, sys) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      this.model() + ":generateContent?key=" + encodeURIComponent(this.key());
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sys }] },
        contents: history.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
        generationConfig: { maxOutputTokens: 600, temperature: 0.4 }
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error((e.error && e.error.message) || "Request failed (" + r.status + ")");
    }
    const data = await r.json();
    const text = ((data.candidates || [])[0]?.content?.parts || []).map(p => p.text).join("");
    if (!text) throw new Error("The model returned an empty reply — try again.");
    return text;
  }
};
const TOTAL_SECTIONS = ALL_SECTIONS.length;
function sectionById(id) { return ALL_SECTIONS.find(s => s.id === id) || null; }
function sectionDoneIn(p, id) { return !!(p.sections && p.sections[id]); }
function sectionsDoneForProgress(p) { return ALL_SECTIONS.reduce((n, s) => n + (sectionDoneIn(p, s.id) ? 1 : 0), 0); }
function firstUndoneSection(p) { const s = ALL_SECTIONS.find(x => !sectionDoneIn(p, x.id)); return s ? s.id : ALL_SECTIONS[0].id; }

/* transient exam session state */
let exam = null;
/* handbook section state */
let currentSection = null;
let currentSectionCode = [];
/* which chapter overview is open */
let currentChapter = null;
/* which faculty test is being taken */
let currentTestId = null;
/* in-progress faculty test draft (null = builder closed) */
let testBuilder = null;
/* which student row is expanded in a dashboard */
let expandedStudent = null;
let openChapter = null;
/* auth screen state */
let authMode = "login";
let authRole = "student";

/* First name for greetings — skips honorifics so "Dr. Meera Rao" greets as "Meera". */
function firstNameOf(name) {
  return String(name || "").replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "").split(" ")[0] || "there";
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const BRIDGE_LOGO = `
  <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
    <path d="M16 7 L29 12.5 L16 18 L3 12.5 Z" fill="currentColor"/>
    <path d="M9 15 V21 C9 22.7 12.1 24 16 24 C19.9 24 23 22.7 23 21 V15" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M29 12.5 V19.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
    <circle cx="29" cy="21" r="1.7" fill="currentColor"/>
  </svg>`;

/* Professional line-icon set (monochrome, inherit currentColor). */
const ICONS = {
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-2 4-5 5-5 9.5A5 5 0 0 0 17 11c0-1.8-.8-3.2-1.8-4.6.1 1.6-1 2.6-2 2.6.1-2.8 0-4.8-1.2-7z"/></svg>`,
  cap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 9 12 5 2 9l10 4 10-4z" fill="currentColor" stroke="none"/><path d="M6 11v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4"/><line x1="22" y1="9.5" x2="22" y2="14"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 3v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V5l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/></svg>`,
  bulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 18h5"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>`,
  sprout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-9"/><path d="M12 13C12 9 9 7 4 7c0 4 3 6 8 6z"/><path d="M12 15c0-3 2.5-5 6-5 0 3.3-2.5 5-6 5z"/></svg>`,
  rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c3 1.6 5 5 5 9l-2.5 2.5h-5L7 11c0-4 2-7.4 5-9z"/><circle cx="12" cy="9" r="1.4"/><path d="M9.5 16c-1.6.4-2.7 2-2.7 4 2 0 3.6-1.1 4-2.7"/><path d="M14.5 16c1.6.4 2.7 2 2.7 4-2 0-3.6-1.1-4-2.7"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><line x1="9" y1="7" x2="15" y2="7"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`
};

/* Each chapter mapped to the authoritative section of the official Python Tutorial. */
const CH_DOCS = {
  1: { url: "https://docs.python.org/3/tutorial/introduction.html", title: "3. Introduction to Python" },
  2: { url: "https://docs.python.org/3/tutorial/controlflow.html", title: "4. More Control Flow Tools" },
  3: { url: "https://docs.python.org/3/tutorial/datastructures.html", title: "5. Data Structures" },
  4: { url: "https://docs.python.org/3/tutorial/modules.html", title: "6. Modules" },
  5: { url: "https://docs.python.org/3/tutorial/inputoutput.html", title: "7. Input and Output" },
  6: { url: "https://docs.python.org/3/tutorial/errors.html", title: "8. Errors and Exceptions" },
  7: { url: "https://docs.python.org/3/tutorial/classes.html", title: "9. Classes" },
  8: { url: "https://docs.python.org/3/tutorial/stdlib.html", title: "10. Brief Tour of the Standard Library" }
};
const DOCS_INDEX = "https://docs.python.org/3/tutorial/index.html";

/* Per-chapter "Check your understanding" quizzes. */
const QUIZ = {
  1: [
    { q: "What does 8 / 5 produce in Python?", options: ["1.6", "1", "2", "'1.6'"], answer: 0, why: "Division with / always returns a float." },
    { q: "For word = 'Python', what is word[-1]?", options: ["'n'", "'P'", "'o'", "Error"], answer: 0, why: "Negative indexes count from the end; -1 is the last character." },
    { q: "Strings in Python are...", options: ["immutable", "mutable", "lists of ints", "numbers"], answer: 0, why: "You can't change a string in place; you make a new one." },
    { q: "What does 'Python'[0:2] give?", options: ["'Py'", "'Pyt'", "'yt'", "'P'"], answer: 0, why: "Slicing includes the start (0) and excludes the end (2)." }
  ],
  2: [
    { q: "What does range(5) produce?", options: ["0, 1, 2, 3, 4", "1 to 5", "0 to 5", "just 5"], answer: 0, why: "range(5) yields 0 up to but not including 5." },
    { q: "Which keyword returns a value from a function?", options: ["return", "def", "yield", "print"], answer: 0, why: "return hands a value back to the caller." },
    { q: "What does break do inside a loop?", options: ["exits the loop", "skips one pass", "restarts the loop", "nothing"], answer: 0, why: "break stops the loop immediately." },
    { q: "How do you define a function?", options: ["def name():", "function name()", "func name()", "define name()"], answer: 0, why: "Functions start with the def keyword." }
  ],
  3: [
    { q: "What is [x*x for x in range(3)]?", options: ["[0, 1, 4]", "[1, 4, 9]", "[0, 1, 2]", "Error"], answer: 0, why: "x runs 0,1,2 so the squares are 0,1,4." },
    { q: "A tuple is...", options: ["immutable", "mutable", "unique-only", "key-value"], answer: 0, why: "Tuples can't be changed after creation." },
    { q: "Which type stores only unique values?", options: ["set", "list", "tuple", "str"], answer: 0, why: "Sets automatically drop duplicates." },
    { q: "What does d.items() return?", options: ["key-value pairs", "keys only", "values only", "the length"], answer: 0, why: "It yields (key, value) pairs for looping." }
  ],
  4: [
    { q: "Before using math.sqrt, you must...", options: ["import math", "include math", "require math", "load math"], answer: 0, why: "import brings the module into your program." },
    { q: "After from math import pi, you write...", options: ["pi", "math.pi", "import.pi", "Math.pi"], answer: 0, why: "from ... import name brings the name in directly." },
    { q: "if __name__ == '__main__' is True when the file is...", options: ["run directly", "imported", "always", "never"], answer: 0, why: "It's the standard way to detect direct execution." },
    { q: "A package is...", options: ["a folder of modules", "a single file", "a variable", "a function"], answer: 0, why: "Packages group related modules in a directory." }
  ],
  5: [
    { q: "What does f\"{3.14159:.2f}\" produce?", options: ["3.14", "3.141", "3", "3.14159"], answer: 0, why: ":.2f formats the number to two decimal places." },
    { q: "Which mode overwrites a file?", options: ["'w'", "'r'", "'a'", "'x'"], answer: 0, why: "'w' opens for writing and truncates existing content." },
    { q: "Why use with open(...)?", options: ["it closes the file automatically", "it's faster", "it reads twice", "it encrypts"], answer: 0, why: "The with block guarantees the file is closed." },
    { q: "json.dump is used to...", options: ["write JSON to a file", "read JSON", "format text", "open a file"], answer: 0, why: "json.dump serialises an object to a file." }
  ],
  6: [
    { q: "Which clause handles an error?", options: ["except", "try", "finally", "raise"], answer: 0, why: "except catches and handles the exception try raised." },
    { q: "When does the finally block run?", options: ["always", "only on error", "only on success", "never"], answer: 0, why: "finally runs whether or not an exception occurred." },
    { q: "int('abc') raises which exception?", options: ["ValueError", "TypeError", "NameError", "SyntaxError"], answer: 0, why: "The text isn't a valid integer, so it's a ValueError." },
    { q: "To trigger an exception yourself, use...", options: ["raise", "throw", "error", "except"], answer: 0, why: "raise deliberately signals an exception." }
  ],
  7: [
    { q: "Inside a method, the current object is...", options: ["self", "this", "me", "obj"], answer: 0, why: "By convention the first parameter, self, is the instance." },
    { q: "Which method runs when an object is created?", options: ["__init__", "__new__ only", "__main__", "create"], answer: 0, why: "__init__ initialises a new instance." },
    { q: "class Cat(Animal) means Cat...", options: ["inherits from Animal", "contains Animal", "equals Animal", "imports Animal"], answer: 0, why: "The parent in parentheses is inherited from." },
    { q: "An object built from a class is called...", options: ["an instance", "a module", "a package", "a method"], answer: 0, why: "Each object created from a class is an instance." }
  ],
  8: [
    { q: "random.randint(1, 6) returns...", options: ["an int from 1 to 6", "a float", "a list", "always 1"], answer: 0, why: "randint returns a random integer in the inclusive range." },
    { q: "Which module handles dates and times?", options: ["datetime", "math", "os", "sys"], answer: 0, why: "datetime provides date and time types." },
    { q: "What is statistics.mean([2, 4, 6])?", options: ["4", "12", "3", "6"], answer: 0, why: "(2+4+6)/3 = 4." },
    { q: "The standard library is...", options: ["included with Python", "installed with pip", "a website", "a book"], answer: 0, why: "It ships with Python - batteries included." }
  ]
};

function quizStats(ch, answers) {
  const qs = QUIZ[ch] || [];
  return {
    total: qs.length,
    answered: qs.filter((q, i) => answers[i] != null).length,
    correct: qs.filter((q, i) => answers[i] === q.answer).length
  };
}

/* One graded, auto-checked coding challenge per chapter — the "prove it" moment. */
const CHALLENGE = {
  1: {
    prompt: `Set <code>word = "Python"</code>. Print its length, then its first three letters (a slice). Output exactly:<br><code>6</code><br><code>Pyt</code>`,
    starter: 'word = "Python"\n# print len(word), then the slice word[:3]\n',
    expected: "6\nPyt",
    hint: "Use <code>print(len(word))</code> then <code>print(word[:3])</code>.",
    solution: 'word = "Python"\nprint(len(word))\nprint(word[:3])'
  },
  2: {
    prompt: `Print <b>FizzBuzz</b> for 1 to 15: <code>Fizz</code> for multiples of 3, <code>Buzz</code> for multiples of 5, <code>FizzBuzz</code> for both, otherwise the number - one per line.`,
    starter: "for n in range(1, 16):\n    # check %3 and %5\n",
    expected: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
    hint: "Check <code>n % 15 == 0</code> first, then <code>n % 3</code>, then <code>n % 5</code>, else print n.",
    solution: 'for n in range(1, 16):\n    if n % 15 == 0:\n        print("FizzBuzz")\n    elif n % 3 == 0:\n        print("Fizz")\n    elif n % 5 == 0:\n        print("Buzz")\n    else:\n        print(n)'
  },
  3: {
    prompt: `Use a <b>list comprehension</b> to build the squares of 1 to 5, and print the list. Output exactly:<br><code>[1, 4, 9, 16, 25]</code>`,
    starter: "# build squares with a comprehension, then print it\n",
    expected: "[1, 4, 9, 16, 25]",
    hint: "<code>squares = [n*n for n in range(1, 6)]</code> then print it.",
    solution: "squares = [n * n for n in range(1, 6)]\nprint(squares)"
  },
  4: {
    prompt: `Import the <code>math</code> module, then print the square root of 144 and pi rounded to 2 decimals. Output exactly:<br><code>12.0</code><br><code>3.14</code>`,
    starter: "import math\n# print sqrt of 144, then pi rounded to 2 decimals\n",
    expected: "12.0\n3.14",
    hint: "<code>math.sqrt(144)</code> and <code>round(math.pi, 2)</code>.",
    solution: "import math\nprint(math.sqrt(144))\nprint(round(math.pi, 2))"
  },
  5: {
    prompt: `Using an <b>f-string</b>, print the price 7.5 formatted to 2 decimal places. Output exactly:<br><code>Total: 7.50</code>`,
    starter: "price = 7.5\n# print with an f-string using :.2f\n",
    expected: "Total: 7.50",
    hint: "<code>print(f\"Total: {price:.2f}\")</code>.",
    solution: 'price = 7.5\nprint(f"Total: {price:.2f}")'
  },
  6: {
    prompt: `Complete <code>safe_divide(a, b)</code> so it returns <code>a / b</code>, but returns <code>Cannot divide by zero</code> when b is 0. The tests should print:<br><code>5.0</code><br><code>Cannot divide by zero</code>`,
    starter: "def safe_divide(a, b):\n    # use try / except ZeroDivisionError\n    pass\n\nprint(safe_divide(10, 2))\nprint(safe_divide(5, 0))\n",
    expected: "5.0\nCannot divide by zero",
    hint: "<code>try: return a / b</code> then <code>except ZeroDivisionError: return \"Cannot divide by zero\"</code>.",
    solution: 'def safe_divide(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return "Cannot divide by zero"\n\nprint(safe_divide(10, 2))\nprint(safe_divide(5, 0))'
  },
  7: {
    prompt: `Make a <code>Dog</code> class with a method <code>bark()</code> that prints <code>Woof!</code>. Create a Dog and call it. Output exactly:<br><code>Woof!</code>`,
    starter: "class Dog:\n    def bark(self):\n        # print Woof!\n        pass\n\n# create a Dog and call bark()\n",
    expected: "Woof!",
    hint: "Inside bark: <code>print(\"Woof!\")</code>. Then <code>Dog().bark()</code>.",
    solution: 'class Dog:\n    def bark(self):\n        print("Woof!")\n\nDog().bark()'
  },
  8: {
    prompt: `Import <code>statistics</code> and print the mean of <code>[2, 4, 6, 8]</code>.`,
    starter: "import statistics\n# print the mean of [2, 4, 6, 8]\n",
    expected: "5",
    hint: "<code>statistics.mean([2, 4, 6, 8])</code>.",
    solution: "import statistics\nprint(statistics.mean([2, 4, 6, 8]))"
  }
};
function quizPassed(ch) {
  const a = (store.get().quiz || {})[ch] || {};
  const { answered, correct, total } = quizStats(ch, a);
  return total > 0 && answered === total && correct / total >= 0.7;
}

/* The concrete steps to complete a chapter (auto-tracked + one manual). */
function chapterItems(ch) {
  const chapter = HANDBOOK.find(c => c.ch === ch);
  const p = store.get();
  const total = chapter.sections.length;
  const cDone = chapter.sections.filter(s => sectionDoneIn(p, s.id)).length;
  return [
    { key: "lessons", label: "Read every lesson", detail: `${cDone}/${total}`, done: cDone === total, auto: true },
    { key: "challenge", label: "Solve the coding challenge", done: !!(p.challenges || {})[ch], auto: true },
    { key: "quiz", label: "Pass the chapter quiz", done: quizPassed(ch), auto: true }
  ];
}
function chapterComplete(ch) { return chapterItems(ch).every(i => i.done); }

/* ---- progress computed from ANY student's progress object (for dashboards) ---- */
function quizPassedFor(p, ch) {
  const a = (p.quiz || {})[ch] || {};
  const { answered, correct, total } = quizStats(ch, a);
  return total > 0 && answered === total && correct / total >= 0.7;
}
function challengeSolvedFor(p, ch) { return !!(p.challenges || {})[ch]; }
function chapterStatusFor(p, ch) {
  const chapter = HANDBOOK.find(c => c.ch === ch);
  const done = chapter.sections.filter(s => sectionDoneIn(p, s.id)).length;
  const total = chapter.sections.length;
  const quiz = quizPassedFor(p, ch);
  const chal = challengeSolvedFor(p, ch);
  return { done, total, quiz, chal, complete: done === total && quiz && chal };
}
function studentSummary(p) {
  return {
    sec: sectionsDoneForProgress(p),
    secPct: Math.round(sectionsDoneForProgress(p) / TOTAL_SECTIONS * 100),
    chapters: HANDBOOK.filter(c => chapterStatusFor(p, c.ch).complete).length,
    quizzes: HANDBOOK.filter(c => quizPassedFor(p, c.ch)).length,
    challenges: HANDBOOK.filter(c => challengeSolvedFor(p, c.ch)).length,
    started: sectionsDoneForProgress(p) > 0 || typeof p.score === "number"
  };
}

/* Shared: the student progress table (used by faculty read-only and admin) + per-student drill-down. */
function studentProgressTable(rows, admin) {
  if (!rows.length) return `<p class="muted">No students have signed up yet. As soon as they do, their progress will appear here.</p>`;
  return `<div class="table-scroll"><table class="admin-table stu-table">
    <thead><tr>
      <th>Student</th>${admin ? "<th>Role</th>" : ""}<th>Level</th><th>Course progress</th>
      <th class="ctr">Chapters</th><th class="ctr">Quizzes</th><th class="ctr">Challenges</th>${admin ? "<th></th>" : ""}
    </tr></thead>
    <tbody>
      ${rows.map(r => {
        const p = r.progress;
        const sum = studentSummary(p);
        const open = expandedStudent === r.email;
        const done8 = v => `<span class="cell-frac ${v === 8 ? "cell-full" : ""}">${v}<span>/8</span></span>`;
        const roleCell = admin
          ? `<select class="role-select" data-admin-role="${esc(r.email)}"><option value="student" selected>Student</option><option value="faculty">Faculty</option></select>`
          : "";
        const main = `<tr class="stu-row ${open ? "stu-open" : ""}" data-student="${esc(r.email)}">
          <td><span class="stu-toggle">${open ? "▾" : "▸"}</span><span class="stu-name">${esc(r.name)}</span><span class="stu-email mono">${esc(r.email)}</span></td>
          ${admin ? `<td>${roleCell}</td>` : ""}
          <td>${r.score != null ? `<b>${r.score}</b>/10 ${r.place ? `<span class="stu-lvl" style="color:${r.place.color}">${r.place.name}</span>` : ""}` : `<span class="muted">not placed</span>`}</td>
          <td><div class="prog-cell"><div class="mini-bar"><div style="width:${sum.secPct}%"></div></div><span>${sum.secPct}%</span></div></td>
          <td class="ctr">${done8(sum.chapters)}</td>
          <td class="ctr">${done8(sum.quizzes)}</td>
          <td class="ctr">${done8(sum.challenges)}</td>
          ${admin ? `<td class="row-actions"><button class="mini-btn" data-admin-reset="${esc(r.email)}">Reset</button><button class="mini-btn mini-danger" data-admin-delete="${esc(r.email)}">Delete</button></td>` : ""}
        </tr>`;
        const detail = open ? `<tr class="stu-detail"><td colspan="${admin ? 8 : 6}">
          <div class="chap-status-grid">
            ${HANDBOOK.map(c => {
              const st = chapterStatusFor(p, c.ch);
              const m = CH_META[c.ch];
              return `<div class="chap-status ${st.complete ? "cs-done" : ""}" style="--accent:${m.color}">
                <div class="cs-top"><span class="cs-badge">${icon(m.icon)}</span><b>Ch ${c.ch}</b>${st.complete ? `<span class="cs-check">${icon("check")}</span>` : ""}</div>
                <div class="cs-title">${esc(c.title)}</div>
                <div class="cs-line"><span>Lessons</span><b>${st.done}/${st.total}</b></div>
                <div class="cs-line"><span>Quiz</span><b class="${st.quiz ? "cs-yes" : "cs-no"}">${st.quiz ? "passed" : "—"}</b></div>
                <div class="cs-line"><span>Challenge</span><b class="${st.chal ? "cs-yes" : "cs-no"}">${st.chal ? "solved" : "—"}</b></div>
              </div>`;
            }).join("")}
          </div>
        </td></tr>` : "";
        return main + detail;
      }).join("")}
    </tbody>
  </table></div>`;
}

/* Class-level analytics: for each chapter, how many students started / completed it. */
function chapterEngagement(rows) {
  return `<div class="dist">
    ${HANDBOOK.map(c => {
      const m = CH_META[c.ch];
      const started = rows.filter(r => chapterStatusFor(r.progress, c.ch).done > 0).length;
      const complete = rows.filter(r => chapterStatusFor(r.progress, c.ch).complete).length;
      const pct = rows.length ? started / rows.length * 100 : 0;
      const cpct = rows.length ? complete / rows.length * 100 : 0;
      return `<div class="dist-row eng-row">
        <span class="dist-label"><span class="dist-ic" style="color:${m.color}">${icon(m.icon)}</span> Ch ${c.ch} · ${esc(c.title)}</span>
        <div class="dist-track eng-track"><div class="eng-started" style="width:${pct}%;background:color-mix(in srgb, ${m.color} 35%, transparent)"></div><div class="eng-complete" style="width:${cpct}%;background:${m.color}"></div></div>
        <span class="dist-val">${complete}<span class="muted">/${started || 0}</span></span>
      </div>`;
    }).join("")}
  </div>`;
}

function checklistCardHTML(ch) {
  const meta = CH_META[ch] || { color: "#3b82f6" };
  const items = chapterItems(ch);
  const doneN = items.filter(i => i.done).length;
  const complete = doneN === items.length;
  return `<div id="checklist-card" class="side-card checklist-card ${complete ? "ck-card-done" : ""}" style="--accent:${meta.color}">
    <h3>${icon("check")} Module checklist</h3>
    <ul class="checklist">
      ${items.map(it => `
        <li class="ck-item ${it.done ? "ck-on" : ""}">
          <span class="ck-box" title="Tracked automatically as you learn">${it.done ? icon("check") : ""}</span>
          <span class="ck-label">${it.label}${it.detail ? ` <span class="ck-detail">${it.detail}</span>` : ""}</span>
        </li>`).join("")}
    </ul>
    <div class="ck-foot"><div class="cp-bar"><div style="width:${doneN / items.length * 100}%"></div></div><span>${doneN}/${items.length}</span></div>
    ${complete ? `<div class="ck-complete">${icon("checkCircle")} Chapter ${ch} complete!</div>` : ""}
  </div>`;
}
function icon(name) { return ICONS[name] || ""; }

/* ---------- Auth screen (shown before the app) ---------- */

function viewAuth() {
  const isAdmin = authRole === "admin";
  const isFaculty = authRole === "faculty";
  const isLogin = isAdmin ? true : (authMode === "login");   // admins can only log in
  const roleWord = Auth.roleLabel[authRole];
  const domain = Auth.DOMAINS[authRole];
  const emailHint = isAdmin ? Auth.ADMIN_EMAIL : "you" + domain;
  return `
    <section class="auth">
      <aside class="auth-showcase">
        <div class="showcase-inner">
          <div class="auth-brand"><span class="brand-mark">${BRIDGE_LOGO}</span><span>Bridge<strong>Up</strong></span></div>
          <h2 class="showcase-title">Where first-years<br/>become <span class="grad">programmers.</span></h2>
          <ul class="showcase-list">
            <li><span class="sc-check">${icon("check")}</span> Real Python running in your browser — zero setup</li>
            <li><span class="sc-check">${icon("check")}</span> Instant feedback on every exercise you write</li>
          </ul>
        </div>
      </aside>
      <div class="auth-panel">
      <div class="auth-card">
        <div class="auth-brand"><span class="brand-mark">${BRIDGE_LOGO}</span><span>Bridge<strong>Up</strong></span></div>
        <h1 class="auth-title">${isAdmin ? "Admin sign-in" : (isLogin ? "Welcome back" : "Create your account")}</h1>
        <p class="auth-sub">${isAdmin ? "Access the BridgeUp console." : (isLogin ? "Log in to continue." : "Choose your role and sign up with your VIT email.")}</p>

        <div class="role-toggle" role="tablist" aria-label="I am a">
          <button class="role-opt ${authRole === "student" ? "on" : ""}" data-auth-role="student">${icon("cap")} Student</button>
          <button class="role-opt ${isFaculty ? "on" : ""}" data-auth-role="faculty">${icon("user")} Faculty</button>
          ${Cloud.enabled ? "" : `<button class="role-opt role-opt-admin ${isAdmin ? "on" : ""}" data-auth-role="admin">${icon("shield")} Admin</button>`}
        </div>

        ${isAdmin ? "" : `
        <div class="auth-tabs">
          <button class="auth-tab ${isLogin ? "on" : ""}" data-auth-tab="login">Log in</button>
          <button class="auth-tab ${!isLogin ? "on" : ""}" data-auth-tab="signup">New account</button>
        </div>`}

        ${isLogin ? `
          <form class="auth-form" data-auth-form="login">
            <label>${roleWord} email
              <input type="email" name="email" placeholder="${emailHint}" autocomplete="username" required />
            </label>
            <label>Password
              <input type="password" name="password" placeholder="Your password" autocomplete="current-password" required />
            </label>
            <button class="btn btn-lg auth-submit ${isAdmin ? "btn-admin" : ""}" type="submit">Log in as ${roleWord} →</button>
          </form>
        ` : `
          <form class="auth-form" data-auth-form="signup">
            <label>Full name
              <input type="text" name="name" placeholder="e.g. Swagata Banerjee" autocomplete="name" required />
            </label>
            <label>${roleWord} email
              <input type="email" name="email" placeholder="${emailHint}" autocomplete="username" required />
            </label>
            <label>Password
              <input type="password" name="password" placeholder="At least 6 characters" autocomplete="new-password" required />
            </label>
            <button class="btn btn-lg auth-submit btn-finish" type="submit">Create ${roleWord} account →</button>
          </form>
        `}

        ${isAdmin ? "" : `
        <p class="auth-foot">
          ${isLogin
            ? `New to BridgeUp? <button class="link-inline" data-auth-tab="signup">Create an account</button>`
            : `Already have an account? <button class="link-inline" data-auth-tab="login">Log in</button>`}
        </p>`}
        <p class="auth-note">${Cloud.enabled
          ? `${icon("lock")} Campus mode — one account, every device. ${isFaculty ? "Faculty" : "Students"} use their <b>${domain}</b> email. Your progress syncs automatically.`
          : isAdmin
          ? `${icon("shield")} Admin console access. Demo login — <b>${Auth.ADMIN_EMAIL}</b> / <b>${Auth.ADMIN_DEFAULT_PW}</b>. Change these before real use.`
          : isLogin
            ? `${icon("lock")} Demo login — <b>${isFaculty ? "rao@vit.ac.in" : "swagata@vitstudent.ac.in"}</b> / <b>${isFaculty ? "teach123" : "python123"}</b>. Try it instantly.`
            : `${icon("lock")} ${isFaculty ? "Faculty" : "Students"} register with <b>${domain}</b> emails. This is a demo — accounts are saved locally in this browser, and passwords are stored only as a secure hash.`}</p>
      </div>
      </div>
    </section>`;
}

function renderAuth() {
  document.body.classList.add("pre-auth");
  app.innerHTML = viewAuth();
  const first = app.querySelector("input");
  if (first) first.focus();
}

function showAuthError(msg) {
  const card = app.querySelector(".auth-card");
  if (!card) return;
  let el = card.querySelector(".auth-error");
  if (!el) {
    el = document.createElement("div");
    el.className = "auth-error";
    card.querySelector(".auth-tabs").insertAdjacentElement("afterend", el);
  }
  el.textContent = msg;
}

const ROLE_ICON = { student: "cap", faculty: "user", admin: "shield" };

function updateNavUser() {
  const el = document.getElementById("navUser");
  if (!el) return;
  const u = Auth.currentUser();
  if (!u) { el.innerHTML = ""; return; }
  const roleName = Auth.roleLabel[u.role] || "Student";
  el.innerHTML = `<span class="nav-role nav-role-${u.role}">${icon(ROLE_ICON[u.role] || "cap")} ${roleName}</span><span class="nav-hi" title="${esc(u.email)}">Hi, ${esc(u.name.split(" ")[0])}</span><button class="nav-logout" data-auth="logout">Log out</button>`;
}

function enterApp() {
  const role = Auth.currentUser() ? Auth.currentUser().role : "student";
  document.body.classList.remove("pre-auth");
  document.body.classList.toggle("admin-mode", role === "admin");
  document.body.classList.toggle("faculty-mode", role === "faculty");
  updateNavUser();
  exam = null;
  render(role === "admin" ? "admin" : role === "faculty" ? "faculty" : "home");
}

/* ---------- Views ---------- */

function viewHome() {
  const saved = store.get();
  const hasResult = typeof saved.score === "number";
  const place = hasResult ? placementFor(saved.score) : null;
  const user = Auth.currentUser();
  const firstName = user ? esc(firstNameOf(user.name)) : "there";

  return `
    <section class="hero reveal-up">
      <div class="hero-copy">
        <span class="hero-badge"><span class="badge-star">★</span> #1 Python course, built for first-year students</span>
        <h1>Go from zero to<br/><span class="grad">real Python</span>, faster.</h1>
        <p class="lead">
          BridgeUp meets you exactly where you are. Take a two-minute coding proficiency test, get a
          path built for your level, and write <b>real Python in your browser</b> from lesson one.
        </p>
        <div class="hero-actions">
          <button class="btn btn-xl" data-nav="exam">${hasResult ? "Continue learning →" : "Start free — take the exam"}</button>
          <button class="btn btn-ghost btn-xl" data-nav="curriculum">Explore curriculum</button>
        </div>
        ${hasResult ? `
          <div class="resume-card" data-nav="result">
            <div class="resume-dot" style="background:${place.color}"></div>
            <div>
              <strong>Welcome back, ${firstName}.</strong> You placed into
              <b style="color:${place.color}">${place.level}</b>. Tap to see your path.
            </div>
          </div>` : ""}
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="code-window">
          <div class="cw-bar"><span></span><span></span><span></span><em>main.py</em></div>
          <pre class="cw-body"><span class="k">def</span> <span class="fn">bridge_up</span>(you):
    <span class="k">while</span> you.curious:
        you.skill <span class="op">+=</span> <span class="n">1</span>
        <span class="k">yield</span> <span class="s">"one step further"</span></pre>
        </div>
        <div class="float-card fc-1"><span class="fc-ic">${icon("check")}</span><span class="fc-text"><b>Exercise passed</b><span>+10 XP</span></span></div>
        <div class="float-card fc-2"><span class="fc-ic">${icon("flame")}</span><span class="fc-text"><b>5-day streak</b><span>keep going!</span></span></div>
      </div>
    </section>

    <section class="cta-band reveal-up">
      <div class="cta-inner">
        <h2>Your Python journey starts with one exam.</h2>
        <p>Two minutes to find your level. A lifetime skill to gain.</p>
        <button class="btn btn-xl" data-nav="exam">${hasResult ? "Jump back in →" : "Take the coding proficiency test →"}</button>
      </div>
    </section>
  `;
}

function viewExam() {
  if (!exam) {
    exam = { i: 0, answers: Array(EXAM.length).fill(null) };
  }
  const q = EXAM[exam.i];
  const total = EXAM.length;
  const chosen = exam.answers[exam.i];
  const progress = Math.round((exam.i / total) * 100);

  return `
    <section class="exam">
      <div class="exam-head">
        <button class="link-back" data-nav="home">← Exit</button>
        <div class="exam-count">Question ${exam.i + 1} <span>of ${total}</span></div>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${progress}%"></div></div>

      <div class="qcard">
        <p class="qprompt">${esc(q.prompt)}</p>
        ${q.code ? `<pre class="qcode">${esc(q.code)}</pre>` : ""}
        <div class="opts">
          ${q.options.map((opt, idx) => `
            <button class="opt ${chosen === idx ? "opt-on" : ""}" data-opt="${idx}">
              <span class="opt-key">${String.fromCharCode(65 + idx)}</span>
              <span class="opt-text">${esc(opt)}</span>
            </button>`).join("")}
        </div>
      </div>

      <div class="exam-nav">
        <button class="btn btn-ghost" data-exam="prev" ${exam.i === 0 ? "disabled" : ""}>Back</button>
        ${exam.i < total - 1
          ? `<button class="btn" data-exam="next" ${chosen === null ? "disabled" : ""}>Next →</button>`
          : `<button class="btn btn-finish" data-exam="finish" ${chosen === null ? "disabled" : ""}>See my results →</button>`}
      </div>
      <p class="exam-hint">No grade on your record — this only decides where you start.</p>
    </section>
  `;
}

function viewResult() {
  const saved = store.get();
  if (typeof saved.score !== "number") return viewHome();
  const score = saved.score;
  const place = placementFor(score);
  const placedIdx = LEVELS.findIndex(l => l.key === place.key);

  // per-area breakdown
  const areas = SKILL_AREAS.map(lvl => {
    const qs = EXAM.map((q, i) => ({ q, i })).filter(x => x.q.level === lvl);
    const correct = qs.filter(x => saved.answers?.[x.i] === x.q.answer).length;
    return { lvl, correct, total: qs.length };
  });
  const areaName = { basics: "Basics", control: "Logic & Loops", data: "Collections", functions: "Functions" };
  const unitShort = id => CURRICULUM.find(u => u.id === id).title.replace(/^Unit \d+ · /, "");

  return `
    <section class="result">
      <div class="result-card" style="--accent:${place.color}">
        <div class="score-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" class="ring-bg"/>
            <circle cx="60" cy="60" r="52" class="ring-fg"
              stroke="${place.color}"
              stroke-dasharray="${(score / 10) * 326.7} 326.7"/>
          </svg>
          <div class="score-num"><b>${score}</b><span>/ 10</span></div>
        </div>
        <div class="result-copy">
          <span class="pill" style="background:${place.color}1a;color:${place.color}">Your placement</span>
          <h1>${place.level}</h1>
          <p class="lead">${esc(place.message)}</p>
        </div>
      </div>

      <div class="breakdown">
        <h3>How you did by area</h3>
        <div class="bars">
          ${areas.map(a => `
            <div class="bar-row">
              <span class="bar-label">${areaName[a.lvl]}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(a.correct / a.total) * 100}%;background:${place.color}"></div></div>
              <span class="bar-val">${a.correct}/${a.total}</span>
            </div>`).join("")}
        </div>
      </div>

      <div class="path">
        <h3>Your learning track</h3>
        <p class="muted">Three levels, CS50-style. You begin at <b style="color:${place.color}">${place.name}</b> — earlier levels stay open for review, later ones are where you're headed.</p>
        <div class="track-list">
          ${LEVELS.map((l, idx) => {
            const state = idx < placedIdx ? "review" : (idx === placedIdx ? "current" : "next");
            const label = state === "review" ? "Review" : state === "current" ? "You start here" : "Up next";
            const units = l.units.map(unitShort).join("  ·  ");
            return `
              <div class="track-node ${state}" style="--accent:${l.color}">
                <div class="track-badge">${icon(l.icon)}</div>
                <div class="track-body">
                  <div class="track-head"><b>${l.name}</b><span class="track-flag">${label}</span></div>
                  <p>${esc(l.tagline)}</p>
                  <span class="track-units">${esc(units)}</span>
                </div>
              </div>`;
          }).join("")}
        </div>
        <button class="btn btn-lg" data-nav="course">Start the course →</button>
      </div>
    </section>
  `;
}

/* ---------- Code editor (chapter challenge + scratchpad) ---------- */

function renderEditor(id, code, stdin, checkable) {
  const usesInput = /input\s*\(/.test(code) || stdin != null;
  const rows = Math.max(3, code.split("\n").length);
  return `
    <div class="editor">
      <div class="editor-head">
        <span class="ed-dot"></span><span class="ed-dot"></span><span class="ed-dot"></span>
        <span class="ed-name">main.py</span>
      </div>
      <textarea id="code-${id}" class="code-input" spellcheck="false" rows="${rows}">${esc(code)}</textarea>
      ${usesInput ? `
        <div class="editor-stdin">
          <label for="stdin-${id}">Input <span>— what the user types (one per line)</span></label>
          <textarea id="stdin-${id}" class="stdin-input" spellcheck="false" rows="${Math.max(1, (stdin || "").split("\n").length)}">${esc(stdin || "")}</textarea>
        </div>` : ""}
      <div class="editor-actions">
        <button class="btn btn-run" data-run="${id}">▶ Run</button>
        ${checkable ? `<button class="btn btn-ghost" data-check="${id}">Check answer</button>` : ""}
      </div>
      <div id="out-${id}" class="out out-hidden"></div>
    </div>`;
}

/* ---------- Running code ---------- */

function paintOutput(outEl, res) {
  outEl.innerHTML = "";
  const pre = document.createElement("pre");
  pre.className = "out-body";
  const text = (res.output || "").replace(/\n$/, "");
  if (text) { const o = document.createElement("span"); o.textContent = text; pre.appendChild(o); }
  if (res.error) {
    const er = document.createElement("span");
    er.className = "out-err";
    er.textContent = (text ? "\n" : "") + res.error;
    pre.appendChild(er);
  }
  if (!text && !res.error) {
    const m = document.createElement("span");
    m.className = "out-muted";
    m.textContent = "(ran with no output)";
    pre.appendChild(m);
  }
  outEl.appendChild(pre);
}

async function runEditor(id, btn) {
  const ta = document.getElementById("code-" + id);
  if (!ta) return null;
  const stdinEl = document.getElementById("stdin-" + id);
  const outEl = document.getElementById("out-" + id);
  outEl.classList.remove("out-hidden");
  outEl.innerHTML = `<div class="out-status">${Runner.isReady() ? "Running…" : "Starting Python…"}</div>`;

  const affected = [btn, document.querySelector(`[data-check="${id}"]`)].filter(Boolean);
  affected.forEach(b => b.disabled = true);

  const res = await Runner.run(ta.value, stdinEl ? stdinEl.value : "", (msg) => {
    const s = outEl.querySelector(".out-status");
    if (s) s.textContent = msg === "ready" ? "Running…" : msg;
  });

  affected.forEach(b => b.disabled = false);
  paintOutput(outEl, res);
  return res;
}

/* Run raw code and paint the result into a specific output element (run-in-place). */
async function runInto(code, stdin, outEl, btn) {
  if (!outEl) return null;
  outEl.classList.remove("out-hidden");
  outEl.innerHTML = `<div class="out-status">${Runner.isReady() ? "Running…" : "Starting Python…"}</div>`;
  if (btn) btn.disabled = true;
  const res = await Runner.run(code, stdin || "", (msg) => {
    const s = outEl.querySelector(".out-status");
    if (s) s.textContent = msg === "ready" ? "Running…" : msg;
  });
  if (btn) btn.disabled = false;
  paintOutput(outEl, res);
  return res;
}

function normalizeOut(s) {
  return (s || "").replace(/\r/g, "").split("\n").map(l => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
}

/* Check a chapter's coding challenge by running the student's code. */
async function checkChallenge(ch, id, btn) {
  const res = await runEditor(id, btn);
  if (!res) return;
  const chal = CHALLENGE[ch];
  const statusEl = document.getElementById("check-status-" + id);
  statusEl.classList.remove("out-hidden");
  const expected = normalizeOut(chal.expected);
  const got = normalizeOut(res.output);
  if (res.ok && got === expected) {
    statusEl.className = "check-status check-pass";
    statusEl.innerHTML = `${icon("checkCircle")} <b>Solved!</b> Nice — this challenge counts toward completing the chapter.`;
    const d = { ...(store.get().challenges || {}) };
    d[ch] = true;
    store.set({ challenges: d });
    if (typeof Adaptive !== "undefined") Adaptive.observe(ch, { solved: true });
    // reflect it on the checklist without wiping the editor / success message
    const el = document.getElementById("checklist-card");
    if (el) el.outerHTML = checklistCardHTML(ch);
  } else if (res.error) {
    statusEl.className = "check-status check-fail";
    statusEl.innerHTML = `${icon("alert")} Your code hit an error — read the message in the output above, then try again.`;
    if (typeof Adaptive !== "undefined") Adaptive.observe(ch, { errors: 1, attempts: 1 });
  } else {
    statusEl.className = "check-status check-fail";
    statusEl.innerHTML = `Not quite yet. <div class="cmp"><div><span>Expected</span><pre class="sol-code">${esc(chal.expected)}</pre></div><div><span>Your output</span><pre class="sol-code">${esc(res.output.replace(/\n$/, "")) || "(no output)"}</pre></div></div>Try the hint if you're stuck.`;
  }
}

/* ---------- Admin console ---------- */

function viewAdmin() {
  if (!Auth.isAdmin()) return viewHome();   // only admins can see the console
  const all = Auth.allAccounts();
  const students = all.filter(a => a.role === "student").map(a => {
    const p = progressForEmail(a.email);
    const score = typeof p.score === "number" ? p.score : null;
    return { ...a, score, place: score != null ? placementFor(score) : null, progress: p, sum: studentSummary(p) };
  }).sort((a, b) => b.sum.secPct - a.sum.secPct);
  const staff = all.filter(a => a.role !== "student");
  const faculty = staff.filter(a => a.role === "faculty");
  const avgProg = students.length ? Math.round(students.reduce((s, r) => s + r.sum.secPct, 0) / students.length) : 0;
  const totalQuiz = students.reduce((s, r) => s + r.sum.quizzes, 0);
  const totalChal = students.reduce((s, r) => s + r.sum.challenges, 0);

  const rawDump = JSON.stringify({
    accounts: JSON.parse(localStorage.getItem(Auth.accountsKey) || "{}"),
    progress: Object.fromEntries(all.map(a => [a.email, progressForEmail(a.email)]))
  }, null, 2);

  return `
    <section class="admin">
      <div class="admin-head">
        <div>
          <span class="pill pill-admin">Admin console</span>
          <h1>Everything, at a glance</h1>
          <p class="lead">Full control of BridgeUp — student progress, accounts, analytics, and the raw database.</p>
        </div>
        <div class="admin-top-actions">
          ${Cloud.enabled ? `<button class="btn btn-ghost" data-cloud-refresh>↻ Refresh data</button>` : ""}
          <button class="btn btn-ghost" data-admin-raw>View raw DB</button>
          <button class="btn" data-admin-export>${icon("download")} Export JSON</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-tile"><b>${students.length}</b><span>students</span></div>
        <div class="stat-tile"><b>${faculty.length}</b><span>faculty</span></div>
        <div class="stat-tile"><b>${avgProg}<span class="stat-pct">%</span></b><span>avg progress</span></div>
        <div class="stat-tile"><b>${totalQuiz}</b><span>quizzes passed</span></div>
        <div class="stat-tile"><b>${totalChal}</b><span>challenges solved</span></div>
      </div>

      <div class="admin-panel">
        <h3>Progress by chapter <span class="muted">· completed vs started</span></h3>
        ${students.length ? chapterEngagement(students) : `<p class="muted">No student activity yet.</p>`}
      </div>

      <div class="admin-panel">
        <h3>Students <span class="muted">· ${students.length} · click a name for the breakdown, change role, reset or delete</span></h3>
        ${studentProgressTable(students, true)}
      </div>

      <div class="admin-panel">
        <h3>Faculty tests &amp; materials <span class="muted">· oversight — publish overrides the review panel</span></h3>
        ${(() => {
          const tests = allTests().map(refreshTestStatus);
          const mats = allMaterials();
          if (!tests.length && !mats.length) return `<p class="muted">No faculty tests or materials yet.</p>`;
          return `
        ${tests.map(t => `
          <div class="test-row">
            <div class="test-info"><b>${esc(t.title)}</b><span class="muted">by ${esc(t.authorName)} · ${t.questions.length} questions · ${testMarks(t.id).length} attempts</span></div>
            ${testStatusChip(t)}
            <div class="row-actions">
              ${t.status !== "approved" ? `<button class="mini-btn" data-test-publish="${t.id}">Publish now</button>` : ""}
              <button class="mini-btn mini-danger" data-test-del="${t.id}">Delete</button>
            </div>
          </div>`).join("")}
        ${mats.map(m => `
          <div class="test-row">
            <div class="test-info"><b>${esc(m.title)}</b><span class="muted">material · Chapter ${m.ch} · by ${esc(m.authorName)}</span></div>
            <div class="row-actions"><button class="mini-btn mini-danger" data-mat-del="${m.id}">Delete</button></div>
          </div>`).join("")}`;
        })()}
      </div>

      <div class="admin-panel">
        <h3>Staff &amp; accounts <span class="muted">· ${staff.length}</span></h3>
        <div class="table-scroll">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              ${staff.map(a => `
                <tr>
                  <td>${esc(a.name)}</td>
                  <td class="mono">${esc(a.email)}</td>
                  <td>${a.role === "admin"
                    ? `<span class="tag tag-admin">Admin</span>`
                    : `<select class="role-select" data-admin-role="${esc(a.email)}"><option value="faculty" selected>Faculty</option><option value="student">Student</option></select>`}</td>
                  <td class="row-actions">${a.role === "admin"
                    ? `<span class="muted">protected</span>`
                    : `<button class="mini-btn mini-danger" data-admin-delete="${esc(a.email)}">Delete</button>`}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel">
        <h3>Course PDF library <span class="muted">· ${HANDBOOK.length} chapters</span></h3>
        <div class="res-grid">
          ${HANDBOOK.map(c => { const m = CH_META[c.ch]; return `<button class="res-btn" data-pdf="${c.ch}" style="--accent:${m.color}"><span class="res-ic">${icon(m.icon)}</span><span><b>Chapter ${c.ch}</b><span class="muted">${esc(c.title)}</span></span>${icon("download")}</button>`; }).join("")}
        </div>
      </div>

      <div id="admin-raw" class="admin-panel out-hidden">
        <h3>Raw database <span class="muted">· localStorage</span></h3>
        <pre class="sol-code raw-db">${esc(rawDump)}</pre>
      </div>
    </section>`;
}

/* ---------- The course (student) ---------- */

const REC_CHAPTER = { beginner: 1, intermediate: 3, advanced: 7 };

/* Students unlock the course by taking the proficiency test first.
   Faculty and admin can always preview. */
function courseLocked() {
  const u = Auth.currentUser();
  return (!u || u.role === "student") && typeof store.get().score !== "number";
}

function viewCourseGate() {
  return `
    <section class="course-gate reveal-up">
      <div class="gate-card">
        <div class="gate-ic">${icon("target")}</div>
        <span class="eyebrow">First step</span>
        <h1>Unlock your course with the <span class="grad">coding proficiency test.</span></h1>
        <p class="lead">Ten questions, about two minutes. It places you at the right level — Beginner, Intermediate or Advanced — so the course starts exactly where you should. Your course opens the moment you finish.</p>
        <button class="btn btn-xl btn-finish" data-nav="exam">Start the test →</button>
        <p class="muted gate-note">${icon("lock")} No pressure — the score never goes on a record, it only shapes your path.</p>
      </div>
    </section>`;
}

function viewCourse() {
  if (courseLocked()) return viewCourseGate();
  const p = store.get();
  const done = sectionsDoneForProgress(p);
  const pct = Math.round(done / TOTAL_SECTIONS * 100);
  const place = typeof p.score === "number" ? placementFor(p.score) : null;
  const nextId = firstUndoneSection(p);
  if (openChapter === null) openChapter = sectionById(nextId) ? sectionById(nextId).chapter.ch : 1;

  const ring = (pctVal, size, sw) => {
    const r = (size - sw) / 2, circ = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${sw}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pctVal / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>`;
  };

  return `
    <section class="course reveal-up">
      <div class="course-hero">
        <div class="ch-copy">
          <span class="eyebrow">Built on the official Python Tutorial</span>
          <h1>Master Python,<br/><span class="grad">chapter by chapter.</span></h1>
          <p class="lead">Eight chapters, ${TOTAL_SECTIONS} lessons — the complete official Python tutorial from docs.python.org, rebuilt as an interactive course with quizzes and graded challenges. Every example runs live in your browser.</p>
          <div class="ch-actions">
            <button class="btn btn-xl" data-section="${nextId}">${done ? "Continue learning →" : "Start Chapter 1 →"}</button>
            ${done ? "" : `<button class="btn btn-ghost btn-xl" data-nav="exam">Take the coding proficiency test</button>`}
          </div>
          ${place ? `<p class="muted cp-rec">Placed into <b style="color:${place.color}">${place.name}</b> — Chapter ${REC_CHAPTER[place.key]} is a great place to focus first.</p>` : ""}
          <p class="hero-source">Source: <a href="${DOCS_INDEX}" target="_blank" rel="noopener">docs.python.org</a></p>
        </div>
        <div class="ch-ring" style="--accent:${pct >= 100 ? "#14b8a6" : "#3b82f6"}">
          ${ring(pct, 168, 12)}
          <div class="ch-ring-label"><b>${pct}<span>%</span></b><span class="crl-sub">${done}/${TOTAL_SECTIONS} lessons</span></div>
        </div>
      </div>

      ${(() => {
        const xp = xpForProgress(p);
        const lvl = levelForXP(xp);
        const streak = streakInfo(p);
        return `
      <div class="game-strip">
        <div class="game-cell">
          <span class="game-ic gi-xp">${icon("bolt")}</span>
          <div><b>${xp} XP</b><span>of ${XP_MAX} · +10 per lesson, +25 quiz, +50 challenge</span></div>
        </div>
        <div class="game-cell">
          <span class="game-ic gi-lvl">${icon("rocket")}</span>
          <div>
            <b>Level ${lvl.n} · ${lvl.name}</b>
            <span class="lvl-track"><i style="width:${lvl.pct}%"></i></span>
            <span>${lvl.next ? `${lvl.next.xp - xp} XP to ${lvl.next.name}` : "Top level reached"}</span>
          </div>
        </div>
        <div class="game-cell">
          <span class="game-ic gi-streak">${icon("flame")}</span>
          <div><b>${streak.current}-day streak</b><span>${streak.best > streak.current ? `best: ${streak.best} days` : streak.current ? "keep it alive — learn a little daily" : "complete a lesson today to start one"}</span></div>
        </div>
      </div>`;
      })()}

      ${(() => {
        if (typeof Adaptive === "undefined") return "";
        const rec = Adaptive.recommend(p);
        if (!rec) return `
      <div class="adapt-card done">
        <div class="adapt-ic">${icon("target")}</div>
        <div class="adapt-body"><span class="eyebrow">Adaptive path</span><h3>Every module complete — outstanding.</h3><p class="muted">Your personalised path has nothing left to recommend. Revisit anything you'd like to sharpen.</p></div>
      </div>`;
        const flag = rec.label ? `<span class="adapt-chip ${rec.hard ? "ac-hard" : ""}">${icon("bolt")} ${rec.label} for most learners</span>` : "";
        return `
      <div class="adapt-card" style="--accent:${(CH_META[rec.ch] || {}).color || "#3b82f6"}">
        <div class="adapt-ic">${icon("target")}</div>
        <div class="adapt-body">
          <span class="eyebrow">Adaptive path · recommended next</span>
          <h3>Chapter ${rec.ch} — ${esc(rec.title)}</h3>
          <p class="muted">Chosen from your own progress${rec.difficulty != null ? " and the federated signal from ~" + Math.round(Adaptive.globalModel()[rec.ch].n) + " learners (no individual data shared)" : ""}. Your mastery of this module: <b>${rec.mastery}%</b>.</p>
          <div class="adapt-tags">${flag}${rec.hard ? `<span class="adapt-tip">${icon("bulb")} Tip: take it slowly and lean on the AI tutor.</span>` : ""}</div>
          <button class="btn chap-cta" data-chapter="${rec.ch}">Open Chapter ${rec.ch} →</button>
        </div>
      </div>`;
      })()}

      <div class="chapters-grid">
        ${HANDBOOK.map(c => {
          const meta = CH_META[c.ch] || { color: "#3b82f6", icon: "layers", level: "Core", outcome: "" };
          const cDone = c.sections.filter(s => sectionDoneIn(p, s.id)).length;
          const cPct = Math.round(cDone / c.sections.length * 100);
          const open = openChapter === c.ch;
          return `
          <div class="chap-card ${cPct === 100 ? "chap-done" : ""}" style="--accent:${meta.color}">
            <div class="chap-head">
              <button class="chap-open" data-chapter="${c.ch}">
                <div class="chap-ring">${ring(cPct, 52, 5)}<span class="chap-ring-n">${c.ch}</span></div>
                <div class="chap-info">
                  <div class="chap-title">${esc(c.title)} <span class="chap-open-hint">Open chapter →</span></div>
                  <div class="chap-sub"><span class="chap-level">${meta.level}</span><span class="muted">${c.sections.length} lessons</span><span class="muted">${cDone}/${c.sections.length} done</span>${chapterComplete(c.ch) ? `<span class="chap-master done">${icon("checkCircle")} Complete</span>` : quizPassed(c.ch) ? `<span class="chap-master">${icon("check")} Quiz passed</span>` : ""}${(typeof Adaptive !== "undefined" && Adaptive.isHard(c.ch)) ? `<span class="fed-chip" title="From privacy-preserving federated data — no individual student is identified">${icon("bolt")} ${Adaptive.difficultyLabel(c.ch)}</span>` : ""}</div>
                  <p class="chap-outcome muted">${esc(meta.outcome)}</p>
                </div>
              </button>
              <div class="chap-actions">
                <button class="btn btn-ghost mod-pdf" data-pdf="${c.ch}">${icon("download")} PDF</button>
                <button class="chap-chev" data-opench="${c.ch}" title="${open ? "Collapse" : "Expand"} lessons">${open ? "▾" : "▸"}</button>
              </div>
            </div>
            <div class="chap-lessons ${open ? "" : "collapsed"}">
              ${c.sections.map(s => {
                const sd = sectionDoneIn(p, s.id);
                const codeCount = s.blocks.filter(b => b.t === "code").length;
                return `<button class="day-row ${sd ? "day-done" : ""}" data-section="${s.id}">
                  <span class="day-num">${s.num || "•"}</span>
                  <span class="day-main"><b>${esc(s.title)}${topicTags(s.id)}</b><span class="muted">${codeCount ? codeCount + " runnable example" + (codeCount === 1 ? "" : "s") : "Reading lesson"}</span></span>
                  <span class="day-check">${sd ? icon("check") : icon("clock")}</span>
                </button>`;
              }).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>

      ${(() => {
        const live = approvedTests();
        if (!live.length) return "";
        return `
      <div class="tests-block">
        <h3>${icon("target")} Tests from your faculty <span class="muted">· ${live.length}</span></h3>
        <div class="tests-grid">
          ${live.map(t => {
            const r = testResultFor(p, t.id);
            return `
            <div class="test-card">
              <div class="test-info">
                <b>${esc(t.title)}</b>
                <span class="muted">${t.questions.length} question${t.questions.length === 1 ? "" : "s"} · by ${esc(t.authorName)}${t.ch ? " · Chapter " + t.ch : ""}</span>
              </div>
              ${r
                ? `<span class="test-score ${r.score / r.total >= 0.5 ? "good" : ""}">${r.score}/${r.total}</span>
                   <button class="btn btn-ghost" data-taketest="${t.id}">Review</button>`
                : `<button class="btn" data-taketest="${t.id}">Take test →</button>`}
            </div>`;
          }).join("")}
        </div>
      </div>`;
      })()}

      ${(() => {
        const s = studentSummary(p);
        const ok = certificateEligible(p);
        const frac = (a, b) => `<span class="cert-frac ${a === b ? "cf-done" : ""}">${a}/${b}</span>`;
        return `
      <div class="cert-card ${ok ? "cert-ready" : ""}">
        <div class="cert-ic">${icon("cap")}</div>
        <div class="cert-body">
          <h3>Certificate of Completion</h3>
          ${ok
            ? `<p>You've completed every lesson, quiz and challenge. Download your certificate — it carries your name and completion date.</p>`
            : `<p>Finish the whole course to earn it: ${frac(s.sec, TOTAL_SECTIONS)} lessons · ${frac(s.quizzes, HANDBOOK.length)} quizzes · ${frac(s.challenges, HANDBOOK.length)} challenges.</p>`}
        </div>
        <button class="btn ${ok ? "btn-finish" : "btn-ghost"} cert-btn" data-cert ${ok ? "" : "disabled"}>${ok ? `${icon("download")} Download certificate` : `${icon("lock")} Locked`}</button>
      </div>`;
      })()}
    </section>`;
}

function renderQuizScoreInner(ch) {
  const answers = (store.get().quiz || {})[ch] || {};
  const { answered, correct, total } = quizStats(ch, answers);
  if (answered < total) {
    return `<span class="qs-progress">${answered}/${total} answered${answered ? ` · ${correct} correct so far` : ""}</span>`;
  }
  const pct = Math.round(correct / total * 100);
  const pass = pct >= 70;
  return `<div class="qs-done ${pass ? "qs-pass" : "qs-fail"}">
    ${icon(pass ? "checkCircle" : "target")}
    <span>You scored <b>${correct}/${total}</b> (${pct}%) — ${pass ? "chapter mastered!" : "review the lessons, then retake."}</span>
    <button class="link-inline qs-reset" data-quizreset="${ch}">Retake</button>
  </div>`;
}

function renderQuiz(ch) {
  const qs = QUIZ[ch] || [];
  const answers = (store.get().quiz || {})[ch] || {};
  return `<div class="quiz">
    ${qs.map((q, qi) => {
      const chosen = answers[qi];
      const answered = chosen != null;
      return `<div class="quiz-q ${answered ? "answered" : ""}" data-qi="${qi}">
        <p class="quiz-prompt"><b>Q${qi + 1}.</b> ${esc(q.q)}</p>
        <div class="quiz-opts">
          ${q.options.map((o, oi) => {
            let cls = "quiz-opt";
            if (answered) {
              if (oi === q.answer) cls += " opt-correct";
              else if (oi === chosen) cls += " opt-wrong";
            }
            return `<button class="${cls}" data-quizopt data-ch="${ch}" data-qi="${qi}" data-oi="${oi}" ${answered ? "disabled" : ""}><span class="qo-key">${String.fromCharCode(65 + oi)}</span><span class="qo-text">${esc(o)}</span></button>`;
          }).join("")}
        </div>
        <div class="quiz-why ${answered ? "" : "out-hidden"}">${icon("bulb")} <span>${esc(q.why)}</span></div>
      </div>`;
    }).join("")}
    <div class="quiz-score">${renderQuizScoreInner(ch)}</div>
  </div>`;
}

function answerQuiz(ch, qi, oi) {
  const saved = store.get();
  const quiz = { ...(saved.quiz || {}) };
  quiz[ch] = { ...(quiz[ch] || {}) };
  if (quiz[ch][qi] != null) return;         // already answered
  quiz[ch][qi] = oi;
  store.set({ quiz });

  const q = QUIZ[ch][qi];
  const qEl = document.querySelector(`.quiz-q[data-qi="${qi}"]`);
  if (!qEl) return;
  qEl.classList.add("answered");
  qEl.querySelectorAll(".quiz-opt").forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add("opt-correct");
    else if (i === oi) btn.classList.add("opt-wrong");
  });
  qEl.querySelector(".quiz-why").classList.remove("out-hidden");
  const scoreEl = document.querySelector(".quiz-score");
  if (scoreEl) scoreEl.innerHTML = renderQuizScoreInner(ch);
  if (typeof Adaptive !== "undefined") Adaptive.observe(ch, oi === q.answer ? {} : { errors: 1 });
}

function viewChapter(ch) {
  if (courseLocked()) return viewCourseGate();
  const chapter = HANDBOOK.find(c => c.ch === ch);
  if (!chapter) return viewCourse();
  const meta = CH_META[ch];
  const p = store.get();
  const total = chapter.sections.length;
  const cDone = chapter.sections.filter(s => sectionDoneIn(p, s.id)).length;
  const chIdx = HANDBOOK.findIndex(c => c.ch === ch);
  const prevCh = chIdx > 0 ? HANDBOOK[chIdx - 1].ch : null;
  const nextCh = chIdx < HANDBOOK.length - 1 ? HANDBOOK[chIdx + 1].ch : null;
  const firstUndone = chapter.sections.find(s => !sectionDoneIn(p, s.id));
  const startId = (firstUndone || chapter.sections[0]).id;

  return `
    <section class="chapter-view" style="--accent:${meta.color}">
      <div class="chap-hero">
        <div class="sec-hero-top">
          <button class="link-back" data-nav="course">← All chapters</button>
          <span class="sec-prog">Chapter ${ch} <span>/ ${HANDBOOK.length}</span></span>
        </div>
        <div class="chap-hero-main">
          <div class="chap-hero-badge">${icon(meta.icon)}</div>
          <div>
            <div class="chap-labels"><span class="level-pill">${meta.level}</span><span class="chl-dot">·</span><span>${meta.time}</span><span class="chl-dot">·</span><span>${total} lessons</span></div>
            <h1>Chapter ${ch} <span class="chap-hdot">·</span> ${esc(chapter.title)}</h1>
          </div>
        </div>
        <div class="chap-hero-prog"><div class="cp-bar"><div style="width:${cDone / total * 100}%"></div></div><span>${cDone}/${total} complete</span></div>
      </div>

      <div class="chap-grid">
        <div class="chap-main">
          <div class="chap-block">
            <h2>Overview</h2>
            <p class="chap-overview-text">${esc(meta.overview)}</p>
          </div>
          <div class="chap-block">
            <h2>Learning objectives</h2>
            <p class="muted obj-lead">By the end of this chapter, you'll be able to:</p>
            <ul class="obj-list">${meta.objectives.map(o => `<li><span class="obj-check">${icon("check")}</span>${esc(o)}</li>`).join("")}</ul>
          </div>
          <div class="chap-block">
            <h2>Lessons <span class="muted">· ${total}</span></h2>
            <div class="mod-days">
              ${chapter.sections.map(s => {
                const sd = sectionDoneIn(p, s.id);
                const cn = s.blocks.filter(b => b.t === "code").length;
                return `<button class="day-row ${sd ? "day-done" : ""}" data-section="${s.id}">
                  <span class="day-num">${s.num || "•"}</span>
                  <span class="day-main"><b>${esc(s.title)}${topicTags(s.id)}</b><span class="muted">${cn ? cn + " code example" + (cn === 1 ? "" : "s") : "Reading lesson"}</span></span>
                  <span class="day-tag ${cn ? "tag-lesson" : "tag-practice"}">${cn ? "Interactive" : "Reading"}</span>
                  <span class="day-check">${sd ? icon("check") : ""}</span>
                </button>`;
              }).join("")}
            </div>
          </div>
          ${CHALLENGE[ch] ? `
          <div class="chap-block challenge-block" style="--accent:${meta.color}">
            <div class="chal-head"><span class="chal-tag">Coding challenge</span>${(store.get().challenges || {})[ch] ? `<span class="chal-solved">${icon("checkCircle")} Solved</span>` : ""}</div>
            <h2>${icon("rocket")} Prove your skills</h2>
            <p class="chal-prompt">${CHALLENGE[ch].prompt}</p>
            ${renderEditor("chal-" + ch, CHALLENGE[ch].starter, CHALLENGE[ch].stdin || "", true)}
            <div id="check-status-chal-${ch}" class="check-status out-hidden"></div>
            <div class="task-help">
              <button class="link-inline" data-hint="chal-${ch}">Show hint</button>
              <span class="dot-sep">·</span>
              <button class="link-inline" data-solution="chal-${ch}">Show solution</button>
            </div>
            <div id="hint-chal-${ch}" class="reveal out-hidden"><b>Hint · </b>${CHALLENGE[ch].hint}</div>
            <div id="solution-chal-${ch}" class="reveal out-hidden"><b>Solution</b><pre class="sol-code">${esc(CHALLENGE[ch].solution)}</pre></div>
          </div>` : ""}
          <div class="chap-block">
            <h2>Practice challenges</h2>
            <p class="muted prac-note">Extra ideas to try in the Scratchpad on any lesson.</p>
            <ol class="practice-list">${meta.practice.map(pr => `<li>${esc(pr)}</li>`).join("")}</ol>
          </div>
          ${(() => {
            const mats = allMaterials().filter(m => m.ch === ch);
            if (!mats.length) return "";
            return `
          <div class="chap-block mats-block">
            <h2>${icon("book")} Faculty materials <span class="muted">· added by your teachers</span></h2>
            ${mats.map(m => `
              <div class="mat-card">
                <div class="mat-top"><b>${esc(m.title)}</b><span class="muted">by ${esc(m.authorName)} · ${new Date(m.at).toLocaleDateString()}</span></div>
                ${m.kind === "link"
                  ? `<a class="mat-link" href="${esc(m.content)}" target="_blank" rel="noopener">${esc(m.content)} ${icon("external")}</a>`
                  : m.kind === "pdf"
                  ? `<a class="mat-link mat-pdf" href="${esc(m.content)}" download="${esc(m.title)}.pdf">${icon("download")} Download PDF — ${esc(m.title)}</a>`
                  : `<p class="mat-note">${esc(m.content).replace(/\n/g, "<br>")}</p>`}
              </div>`).join("")}
          </div>`;
          })()}
          ${QUIZ[ch] ? `
          <div class="chap-block quiz-block" style="--accent:${meta.color}">
            <h2>${icon("target")} Check your understanding</h2>
            <p class="muted">A quick quiz on Chapter ${ch}. Pick an answer and you'll see the explanation instantly.</p>
            ${renderQuiz(ch)}
          </div>` : ""}
        </div>

        <aside class="chap-side">
          ${checklistCardHTML(ch)}
          <div class="side-card">
            <h3>${icon("bulb")} Key takeaways</h3>
            <ul class="take-list">${meta.takeaways.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
          </div>
          <button class="btn btn-lg chap-cta" data-section="${startId}">${cDone ? "Continue chapter →" : "Start Chapter " + ch + " →"}</button>
          <button class="btn btn-ghost chap-pdf-cta" data-pdf="${ch}">${icon("download")} Download chapter PDF</button>
        </aside>
      </div>

      <div class="lesson-foot">
        ${prevCh ? `<button class="btn btn-ghost" data-chapter="${prevCh}">← Chapter ${prevCh}</button>` : "<span></span>"}
        ${nextCh ? `<button class="btn" data-chapter="${nextCh}">Chapter ${nextCh} →</button>` : `<button class="btn" data-nav="course">Back to course ✓</button>`}
      </div>
    </section>`;
}

function viewSection(id) {
  if (courseLocked()) return viewCourseGate();
  const s = sectionById(id);
  if (!s) return viewCourse();
  const meta = CH_META[s.chapter.ch] || { color: "#3b82f6", icon: "layers" };
  const p = store.get();
  const done = sectionDoneIn(p, id);
  const idx = ALL_SECTIONS.findIndex(x => x.id === id);
  const prev = idx > 0 ? ALL_SECTIONS[idx - 1].id : null;
  const next = idx < ALL_SECTIONS.length - 1 ? ALL_SECTIONS[idx + 1].id : null;

  const words = s.blocks.filter(b => b.t === "p").reduce((n, b) => n + b.x.trim().split(/\s+/).length, 0);
  const mins = Math.max(1, Math.round(words / 170));
  const codeN = s.blocks.filter(b => b.t === "code").length;

  currentSectionCode = [];
  const body = s.blocks.map(b => {
    if (b.t === "p") return `<p class="hb-p">${esc(b.x)}</p>`;
    let action;
    if (b.norun) {
      // deliberate error-demo or an input()-driven example: read-only, output is shown in the code
      action = `<span class="hb-ref">reference</span>`;
    } else {
      const ci = currentSectionCode.length;
      currentSectionCode.push(b.run || runnableCode(b.x));   // clean, runnable code
      action = `<button class="hb-send" data-editblock="${ci}">Copy to Scratchpad ↓</button>`;
    }
    return `<div class="hb-code-wrap ${b.norun ? "code-ref" : ""}">
      <div class="hb-code-bar">
        <span class="cc-dots"><i></i><i></i><i></i></span>
        <span class="cc-lang">python</span>
        ${action}
      </div>
      <pre class="hb-code">${highlightPython(b.x)}</pre>
    </div>`;
  }).join("");

  return `
    <section class="section-view">
      <div class="sec-hero" style="--accent:${meta.color}">
        <div class="sec-hero-top">
          <button class="link-back" data-nav="course">← Course</button>
          <span class="sec-prog">Lesson ${idx + 1} <span>/ ${TOTAL_SECTIONS}</span></span>
        </div>
        <span class="sec-chapter">${icon(meta.icon)} Chapter ${s.chapter.ch} · ${esc(s.chapter.title)}</span>
        <h1 class="sec-title">${s.num ? `<span class="sec-num">${s.num}</span>` : ""}${esc(s.title)}</h1>
        <div class="sec-meta">
          <span>${icon("clock")} ${mins} min read</span>
          ${codeN ? `<span>${icon("bolt")} ${codeN} code example${codeN === 1 ? "" : "s"}</span>` : ""}
          ${ADV_SECTIONS.has(s.id) ? `<span class="adv-tag">Advanced</span>` : ""}
          ${BONUS_SECTIONS.has(s.id) ? `<span class="bonus-tag">Bonus</span>` : ""}
          ${done ? `<span class="sec-done-badge">${icon("check")} Completed</span>` : ""}
        </div>
      </div>

      <article class="hb-body">${body}</article>

      <div class="hb-sandbox">
        <div class="sandbox-head">
          <h3>${icon("bolt")} Scratchpad — run Python here</h3>
          <p class="muted">This is the one place code runs. Tap <b>Copy to Scratchpad ↓</b> on any example above to drop it in, then press <b>▶ Run</b>. Edit anything and run again — it's yours to experiment with.</p>
        </div>
        ${renderEditor("hb-sandbox", 'print("Hello! Edit me, or copy an example above and press Run.")', "", false)}
      </div>

      <div class="sec-complete" style="--accent:${meta.color}">
        <div class="sc-copy">
          <b>${done ? "Lesson complete" : "Finished reading?"}</b>
          <span class="muted">${done ? "Nice work — on to the next one." : "Mark it done to track your progress."}</span>
        </div>
        <button class="btn ${done ? "btn-ghost" : "btn-finish"}" data-section-done="${id}">
          ${done ? icon("check") + " Completed" : "Mark lesson complete"}
        </button>
      </div>

      <div class="lesson-foot">
        ${prev ? `<button class="btn btn-ghost" data-section="${prev}">← Previous</button>` : "<span></span>"}
        ${next ? `<button class="btn" data-section="${next}">Next lesson →</button>` : `<button class="btn" data-nav="course">Finish the course ✓</button>`}
      </div>

      <div class="tutor-dock ${tutorOpen ? "open" : ""}" id="tutorDock">
        <button class="tutor-head" data-tutor-toggle>
          <span class="tutor-dot ${Tutor.key() ? "on" : ""}"></span>
          <b>AI Tutor</b><span class="tutor-sub">personal · your own key</span>
          <span class="tutor-chev">${tutorOpen ? "▾" : "▴"}</span>
        </button>
        <div class="tutor-panel">
          <div class="tutor-msgs" id="tutorMsgs"></div>
          <div class="tutor-setup ${Tutor.key() && !tutorSetup ? "out-hidden" : ""}" id="tutorSetup">
            <p class="muted">The tutor runs on <b>your own free Gemini API key</b> — it stays in this browser and calls Google directly. <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Get a free key ${icon("external")}</a></p>
            <div class="tutor-setup-row">
              <input id="tutorKey" type="password" placeholder="Paste your API key" value="${esc(Tutor.key())}">
              <select id="tutorModel">${Tutor.MODELS.map(m => `<option value="${m}" ${Tutor.model() === m ? "selected" : ""}>${m}</option>`).join("")}</select>
              <button class="btn" data-tutor-savekey>Save</button>
            </div>
          </div>
          <div class="tutor-input-row">
            <input id="tutorInput" type="text" placeholder="Ask about this lesson, or your code…" ${tutorBusy ? "disabled" : ""}>
            <button class="btn btn-run" data-tutor-send ${tutorBusy ? "disabled" : ""}>Ask</button>
            <button class="tutor-gear" data-tutor-gear title="API key & model">⚙</button>
          </div>
        </div>
      </div>
    </section>`;
}

/* Tutor chat state + painter. Messages are DOM-built (textContent), never
   injected as HTML, so model output can't script the page. */
let tutorOpen = false, tutorBusy = false, tutorSetup = false, tutorMsgs = [], tutorFor = null;

function tutorContext() {
  const s = sectionById(currentSection);
  if (!s) return "You are BridgeUp's friendly Python tutor for first-year students.";
  const text = s.blocks.map(b => (b.t === "code" ? "```python\n" + b.x + "\n```" : b.x)).join("\n").slice(0, 1600);
  const code = (document.getElementById("code-hb-sandbox") || {}).value || "";
  const mem = (typeof Adaptive !== "undefined") ? Adaptive.memorySummary() : "";
  return `You are BridgeUp's friendly Python tutor for first-year students at VIT.
Be concise (under 150 words), encouraging, and never invent facts.
Prefer guiding hints over full answers for graded work.
The student is on the lesson "${s.title}" (Chapter ${s.chapter.ch}: ${s.chapter.title}).
${mem ? mem + "\n" : ""}Lesson excerpt:\n${text}\n${code ? "Student's current Scratchpad code:\n```python\n" + code + "\n```" : ""}`;
}

function paintTutor() {
  const box = document.getElementById("tutorMsgs");
  if (!box) return;
  if (tutorFor !== currentSection) { tutorMsgs = []; tutorFor = currentSection; }
  box.innerHTML = "";
  if (!tutorMsgs.length) {
    const hint = document.createElement("div");
    hint.className = "tutor-empty muted";
    hint.textContent = Tutor.key()
      ? "Ask anything about this lesson — concepts, errors, or the code in your Scratchpad."
      : "Add your free API key below to start chatting.";
    box.appendChild(hint);
  }
  tutorMsgs.forEach(m => {
    const el = document.createElement("div");
    el.className = "tutor-msg " + (m.role === "user" ? "tm-user" : m.role === "error" ? "tm-error" : "tm-ai");
    el.textContent = m.text;
    box.appendChild(el);
  });
  if (tutorBusy) {
    const el = document.createElement("div");
    el.className = "tutor-msg tm-ai tm-busy";
    el.textContent = "Thinking…";
    box.appendChild(el);
  }
  box.scrollTop = box.scrollHeight;
}

async function tutorSend() {
  const input = document.getElementById("tutorInput");
  const q = (input && input.value || "").trim();
  if (!q || tutorBusy) return;
  if (!Tutor.key()) { tutorSetup = true; document.getElementById("tutorSetup")?.classList.remove("out-hidden"); return; }
  input.value = "";
  tutorMsgs.push({ role: "user", text: q });
  tutorBusy = true; paintTutor();
  try {
    const reply = await Tutor.ask(tutorMsgs.filter(m => m.role !== "error").slice(-10), tutorContext());
    tutorMsgs.push({ role: "ai", text: reply });
  } catch (e) {
    tutorMsgs.push({ role: "error", text: "Tutor error: " + (e.message || e) });
  }
  tutorBusy = false; paintTutor();
  document.getElementById("tutorInput")?.focus();
}

/* ---------- Faculty test: student taking + review ---------- */

function viewTestTake(id) {
  const t = allTests().map(refreshTestStatus).find(x => x.id === id);
  if (!t || t.status !== "approved") return viewCourse();
  const r = testResultFor(store.get(), id);

  if (r) {
    // already attempted — one attempt per student; show the review
    return `
    <section class="test-view">
      <div class="test-head">
        <button class="link-back" data-nav="course">← Course</button>
        <h1>${esc(t.title)}</h1>
        <p class="muted">By ${esc(t.authorName)} · attempted ${new Date(r.at).toLocaleDateString()} · one attempt per student</p>
        <div class="test-result-band ${r.score / r.total >= 0.5 ? "trb-good" : ""}">Your score: <b>${r.score}/${r.total}</b> (${Math.round(r.score / r.total * 100)}%)</div>
      </div>
      ${t.questions.map((q, i) => {
        const mine = (r.answers || {})[i];
        return `
        <div class="tq-card tq-review">
          <p class="tq-text"><span class="tq-n">Q${i + 1}</span>${esc(q.q)}</p>
          ${q.opts.map((o, oi) => o.trim() ? `
            <div class="tq-opt ${oi === q.ans ? "tq-correct" : ""} ${mine === oi && oi !== q.ans ? "tq-wrong" : ""}">
              <span class="qo-key">${String.fromCharCode(65 + oi)}</span> ${esc(o)}
              ${oi === q.ans ? `<span class="tq-flag">Correct answer</span>` : mine === oi ? `<span class="tq-flag">Your answer</span>` : ""}
            </div>` : "").join("")}
        </div>`;
      }).join("")}
      <div class="lesson-foot"><span></span><button class="btn" data-nav="course">Back to course →</button></div>
    </section>`;
  }

  return `
    <section class="test-view">
      <div class="test-head">
        <button class="link-back" data-nav="course">← Course</button>
        <h1>${esc(t.title)}</h1>
        <p class="muted">${t.questions.length} questions · 1 mark each · one attempt — answers lock when you submit.</p>
      </div>
      ${t.questions.map((q, i) => `
        <div class="tq-card">
          <p class="tq-text"><span class="tq-n">Q${i + 1}</span>${esc(q.q)}</p>
          ${q.opts.map((o, oi) => o.trim() ? `
            <label class="tq-opt tq-pick">
              <input type="radio" name="tq-${i}" value="${oi}">
              <span class="qo-key">${String.fromCharCode(65 + oi)}</span> ${esc(o)}
            </label>` : "").join("")}
        </div>`).join("")}
      <div class="test-submit-row">
        <span class="muted" id="testWarn"></span>
        <button class="btn btn-finish btn-lg" data-test-finish="${t.id}">Submit test</button>
      </div>
    </section>`;
}

/* ---------- Faculty dashboard (read-only student view) ---------- */

function viewFaculty() {
  const u = Auth.currentUser();
  if (!u || u.role !== "faculty") return viewHome();
  const rows = Auth.allAccounts().filter(a => a.role === "student").map(a => {
    const p = progressForEmail(a.email);
    const score = typeof p.score === "number" ? p.score : null;
    return { ...a, score, place: score != null ? placementFor(score) : null, progress: p, sum: studentSummary(p) };
  }).sort((a, b) => b.sum.secPct - a.sum.secPct);

  const active = rows.filter(r => r.sum.started).length;
  const avgProg = rows.length ? Math.round(rows.reduce((s, r) => s + r.sum.secPct, 0) / rows.length) : 0;
  const totalQuiz = rows.reduce((s, r) => s + r.sum.quizzes, 0);
  const totalChal = rows.reduce((s, r) => s + r.sum.challenges, 0);
  const fullyDone = rows.filter(r => r.sum.chapters === HANDBOOK.length).length;

  return `
    <section class="admin">
      <div class="admin-head">
        <div>
          <span class="pill pill-faculty">Faculty dashboard</span>
          <h1>Your class, at a glance</h1>
          <p class="lead">Track every student through the Python course — who's flying, who's stuck, and where. Welcome, ${esc(firstNameOf(u.name))}.</p>
        </div>
        <div class="admin-top-actions">
          ${Cloud.enabled ? `<button class="btn btn-ghost" data-cloud-refresh>↻ Refresh data</button>` : ""}
          <button class="btn btn-ghost" data-nav="course">Preview the course →</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-tile"><b>${rows.length}</b><span>students</span></div>
        <div class="stat-tile"><b>${active}</b><span>started the course</span></div>
        <div class="stat-tile"><b>${avgProg}<span class="stat-pct">%</span></b><span>avg progress</span></div>
        <div class="stat-tile"><b>${totalQuiz}</b><span>quizzes passed</span></div>
        <div class="stat-tile"><b>${totalChal}</b><span>challenges solved</span></div>
      </div>

      <div class="admin-panel">
        <h3>Progress by chapter <span class="muted">· completed vs started</span></h3>
        <p class="muted res-note">See how far the class has travelled and where students drop off. The solid bar is <b>completed</b>, the faded bar is <b>started</b>.</p>
        ${rows.length ? chapterEngagement(rows) : `<p class="muted">No student activity yet.</p>`}
      </div>

      <div class="admin-panel">
        <h3>Students <span class="muted">· ${rows.length} · click a name for the breakdown</span></h3>
        ${studentProgressTable(rows, false)}
      </div>

      <div class="admin-panel">
        <h3>Teaching resources <span class="muted">· chapter PDFs</span></h3>
        <p class="muted res-note">Download any chapter of the official Python tutorial as a formatted PDF to share or print.</p>
        <div class="res-grid">
          ${HANDBOOK.map(c => { const m = CH_META[c.ch]; return `<button class="res-btn" data-pdf="${c.ch}" style="--accent:${m.color}"><span class="res-ic">${icon(m.icon)}</span><span><b>Chapter ${c.ch}</b><span class="muted">${esc(c.title)}</span></span>${icon("download")}</button>`; }).join("")}
        </div>
      </div>

      ${facultyTestPanels(u)}
      ${facultyMaterialPanel(u)}
    </section>`;
}

/* ---------- Faculty: create tests, review peers' tests, see marks ---------- */

function testStatusChip(t) {
  const s = TEST_STATUS[t.status] || TEST_STATUS.draft;
  const votes = t.status === "pending" ? ` ${(t.approvals || []).length}/${approvalsNeededFor(t)} approvals` : "";
  return `<span class="ts-chip ${s.cls}">${s.label}${votes}</span>`;
}

function facultyTestPanels(u) {
  const tests = allTests().map(refreshTestStatus);
  const mine = tests.filter(t => t.author === u.email);
  const queue = tests.filter(t => t.status === "pending" && t.author !== u.email);
  const live = tests.filter(t => t.status === "approved");

  const builder = testBuilder ? `
    <div class="tb-form" id="tbForm">
      <div class="tb-row">
        <label>Test title <input id="tb-title" type="text" placeholder="e.g. Unit test 1 — Basics & control flow" value="${esc(testBuilder.title || "")}"></label>
        <label>Chapter (optional)
          <select id="tb-ch">
            <option value="0" ${!testBuilder.ch ? "selected" : ""}>General</option>
            ${HANDBOOK.map(c => `<option value="${c.ch}" ${testBuilder.ch === c.ch ? "selected" : ""}>Chapter ${c.ch} — ${esc(c.title)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${testBuilder.questions.map((q, i) => `
        <div class="tb-q" data-qi="${i}">
          <div class="tb-q-head"><b>Question ${i + 1}</b>${testBuilder.questions.length > 1 ? `<button class="mini-btn mini-danger" data-tb-delq="${i}">Remove</button>` : ""}</div>
          <input class="tb-qtext" type="text" placeholder="The question…" value="${esc(q.q || "")}">
          <div class="tb-opts">
            ${[0, 1, 2, 3].map(oi => `<input class="tb-opt" type="text" placeholder="Option ${String.fromCharCode(65 + oi)}" value="${esc((q.opts || [])[oi] || "")}">`).join("")}
          </div>
          <label class="tb-anslabel">Correct answer
            <select class="tb-ans">${[0, 1, 2, 3].map(oi => `<option value="${oi}" ${q.ans === oi ? "selected" : ""}>${String.fromCharCode(65 + oi)}</option>`).join("")}</select>
          </label>
        </div>`).join("")}
      <div class="tb-actions">
        <button class="btn btn-ghost" data-tb-addq>+ Add question</button>
        <span class="tb-spacer"></span>
        <button class="btn btn-ghost" data-tb-cancel>Cancel</button>
        <button class="btn" data-tb-save>Save draft</button>
        <button class="btn btn-finish" data-tb-submit>Submit for review →</button>
      </div>
      <p class="muted tb-note" id="tbWarn"></p>
    </div>` : "";

  return `
      <div class="admin-panel fac-tests">
        <h3>Assessments <span class="muted">· create tests — a faculty panel of up to 5 reviews each one; majority approval publishes it</span></h3>
        ${builder || `<button class="btn" data-tb-new>+ Create a test</button>`}
        ${mine.length ? `
        <div class="test-list">
          ${mine.map(t => `
            <div class="test-row">
              <div class="test-info"><b>${esc(t.title)}</b><span class="muted">${t.questions.length} questions${t.ch ? " · Chapter " + t.ch : ""}</span></div>
              ${testStatusChip(t)}
              <div class="row-actions">
                ${t.status === "draft" ? `<button class="mini-btn" data-test-submit="${t.id}">Submit for review</button>` : ""}
                ${t.status !== "approved" ? `<button class="mini-btn mini-danger" data-test-del="${t.id}">Delete</button>` : ""}
              </div>
            </div>`).join("")}
        </div>` : ""}
      </div>

      <div class="admin-panel">
        <h3>Review queue <span class="muted">· tests from other faculty awaiting your decision</span></h3>
        ${queue.length ? queue.map(t => {
          const voted = (t.approvals || []).includes(u.email) || (t.rejections || []).some(r => r.email === u.email);
          return `
          <div class="review-card">
            <div class="test-info">
              <b>${esc(t.title)}</b>
              <span class="muted">by ${esc(t.authorName)} · ${t.questions.length} questions${t.ch ? " · Chapter " + t.ch : ""} · needs ${approvalsNeededFor(t)} approval${approvalsNeededFor(t) === 1 ? "" : "s"}</span>
            </div>
            ${testStatusChip(t)}
            <details class="review-peek"><summary>View questions</summary>
              <ol>${t.questions.map(q => `<li>${esc(q.q)} <span class="muted">(answer: ${String.fromCharCode(65 + q.ans)}. ${esc(q.opts[q.ans] || "")})</span></li>`).join("")}</ol>
            </details>
            ${voted ? `<span class="muted">You've voted on this test.</span>` : `
            <div class="row-actions">
              <button class="mini-btn" data-test-approve="${t.id}">Approve</button>
              <button class="mini-btn mini-danger" data-test-reject="${t.id}">Reject</button>
            </div>`}
          </div>`;
        }).join("") : `<p class="muted">Nothing waiting for review.</p>`}
      </div>

      <div class="admin-panel">
        <h3>Test marks <span class="muted">· results across the class</span></h3>
        ${live.length ? live.map(t => {
          const rowsM = testMarks(t.id);
          const totalStu = Auth.allAccounts().filter(a => a.role === "student").length;
          const avg = rowsM.length ? Math.round(rowsM.reduce((s, r) => s + r.score / r.total, 0) / rowsM.length * 100) : 0;
          return `
          <div class="marks-group">
            <div class="marks-head"><b>${esc(t.title)}</b><span class="muted">${rowsM.length}/${totalStu} attempted${rowsM.length ? ` · class average ${avg}%` : ""}</span></div>
            ${rowsM.length ? `
            <div class="table-scroll"><table class="admin-table marks-table">
              <thead><tr><th>Student</th><th>Email</th><th class="ctr">Marks</th><th class="ctr">%</th></tr></thead>
              <tbody>${rowsM.map(r => `<tr><td>${esc(r.name)}</td><td class="mono">${esc(r.email)}</td><td class="ctr cell-frac">${r.score}<span>/${r.total}</span></td><td class="ctr">${Math.round(r.score / r.total * 100)}%</td></tr>`).join("")}</tbody>
            </table></div>` : `<p class="muted">No attempts yet.</p>`}
          </div>`;
        }).join("") : `<p class="muted">No live tests yet — create one above and get it approved.</p>`}
      </div>`;
}

function facultyMaterialPanel(u) {
  const mine = allMaterials().filter(m => m.author === u.email);
  return `
      <div class="admin-panel">
        <h3>Course materials <span class="muted">· add notes or links that appear inside chapters for every student</span></h3>
        <div class="mat-form">
          <div class="tb-row">
            <label>Chapter <select id="mat-ch">${HANDBOOK.map(c => `<option value="${c.ch}">Chapter ${c.ch} — ${esc(c.title)}</option>`).join("")}</select></label>
            <label>Type <select id="mat-kind"><option value="note">Note</option><option value="link">Link</option><option value="pdf">PDF file</option></select></label>
          </div>
          <label>Title <input id="mat-title" type="text" placeholder="e.g. Extra examples on loops"></label>
          <label>Content <textarea id="mat-content" rows="3" placeholder="The note text, or a URL for links (ignored for PDF uploads)"></textarea></label>
          <label>PDF file <span class="muted" style="font-weight:400">— used when Type is “PDF file”, up to 2.5 MB</span>
            <input id="mat-file" type="file" accept="application/pdf">
          </label>
          <div class="tb-actions"><span class="muted" id="matWarn"></span><span class="tb-spacer"></span><button class="btn" data-mat-add>Add material</button></div>
        </div>
        ${mine.length ? `
        <div class="test-list">
          ${mine.map(m => `
            <div class="test-row">
              <div class="test-info"><b>${esc(m.title)}</b><span class="muted">Chapter ${m.ch} · ${m.kind} · ${new Date(m.at).toLocaleDateString()}</span></div>
              <div class="row-actions"><button class="mini-btn mini-danger" data-mat-del="${m.id}">Delete</button></div>
            </div>`).join("")}
        </div>` : ""}
      </div>`;
}

/* ---------- Router ---------- */

const views = {
  home: viewHome,
  exam: viewExam,
  result: viewResult,
  curriculum: viewCourse,
  course: viewCourse,
  section: () => viewSection(currentSection),
  chapter: () => viewChapter(currentChapter),
  test: () => viewTestTake(currentTestId),
  faculty: viewFaculty,
  admin: viewAdmin
};

function animateCounters() {
  document.querySelectorAll("[data-count-to]").forEach(el => {
    const target = parseFloat(el.dataset.countTo);
    const suffix = el.dataset.suffix || "";
    const isFloat = target % 1 !== 0;
    const dur = 1200;
    let startTs = null;
    const step = (ts) => {
      if (startTs === null) startTs = ts;
      const p = Math.min(1, (ts - startTs) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

const SUPPORTS_VT = typeof document !== "undefined" &&
  typeof document.startViewTransition === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (SUPPORTS_VT) document.documentElement.classList.add("vt");

let currentRoute = null;

function render(route) {
  const fn = views[route] || viewHome;
  const sameRoute = route === currentRoute;
  const paint = () => {
    app.innerHTML = fn();
    document.querySelectorAll(".nav-links a").forEach(a =>
      a.classList.toggle("active", a.dataset.nav === route));
    if (route === "home") requestAnimationFrame(animateCounters);
    if (route === "section") requestAnimationFrame(paintTutor);
  };
  // Real navigation jumps to the top; an in-place update (accordion, checklist
  // tick, quiz reset, admin role change, student drill-down) keeps your spot.
  if (!sameRoute) window.scrollTo(0, 0);
  currentRoute = route;
  // Cross-fade only on real navigation. In-place re-renders and the exam (which
  // re-renders on every answer tap) repaint instantly — no distracting motion.
  if (SUPPORTS_VT && route !== "exam" && !sameRoute) document.startViewTransition(paint);
  else paint();
}

/* ---------- Events (delegated) ---------- */

document.addEventListener("click", (e) => {
  // auth: switch between Student / Faculty
  const roleBtn = e.target.closest("[data-auth-role]");
  if (roleBtn) { authRole = roleBtn.dataset.authRole; renderAuth(); return; }

  // auth: switch between Log in / New account
  const authTab = e.target.closest("[data-auth-tab]");
  if (authTab) { authMode = authTab.dataset.authTab; renderAuth(); return; }

  // auth: log out
  const logoutBtn = e.target.closest('[data-auth="logout"]');
  if (logoutBtn) { Auth.logout(); authMode = "login"; authRole = "student"; document.body.classList.remove("admin-mode", "faculty-mode"); renderAuth(); return; }

  // admin: reset a user's progress
  const aReset = e.target.closest("[data-admin-reset]");
  if (aReset) {
    const email = aReset.dataset.adminReset;
    if (confirm(`Reset ALL progress (exam score + completed lessons) for ${email}?`)) {
      if (Cloud.enabled) { (async () => { const r = await Cloud.resetProgress(email); if (r.error) alert(r.error); render("admin"); })(); return; }
      resetProgressFor(email); render("admin");
    }
    return;
  }
  // admin: delete a user
  const aDelete = e.target.closest("[data-admin-delete]");
  if (aDelete) {
    const email = aDelete.dataset.adminDelete;
    if (confirm(`Delete the account ${email} and all of its progress? This cannot be undone.`)) {
      if (Cloud.enabled) { (async () => { const r = await Cloud.deleteUser(email); if (r.error) alert(r.error); render("admin"); })(); return; }
      Auth.deleteAccount(email); render("admin");
    }
    return;
  }
  // admin: export / raw DB
  const aExport = e.target.closest("[data-admin-export]");
  if (aExport) { adminExport(); return; }
  const aRaw = e.target.closest("[data-admin-raw]");
  if (aRaw) { document.getElementById("admin-raw")?.classList.toggle("out-hidden"); return; }

  // dashboards: expand/collapse a student's per-chapter breakdown
  const stuRow = e.target.closest("[data-student]");
  if (stuRow && !e.target.closest("select, button")) {
    const email = stuRow.dataset.student;
    expandedStudent = expandedStudent === email ? null : email;
    render(Auth.isAdmin() ? "admin" : "faculty");
    document.querySelector(".stu-row.stu-open")?.scrollIntoView({ block: "center" });
    return;
  }

  const nav = e.target.closest("[data-nav]");
  if (nav) {
    if (nav.tagName === "A") e.preventDefault(); // don't let the logo anchor jump to "#"
    let route = nav.dataset.nav;
    const role = Auth.currentUser() ? Auth.currentUser().role : "student";
    if (route === "home" && role === "admin") route = "admin";     // admins land on the console
    if (route === "home" && role === "faculty") route = "faculty"; // faculty land on their dashboard
    if (route === "exam") exam = null; // fresh attempt
    render(route);
    return;
  }

  // exam option pick
  const opt = e.target.closest("[data-opt]");
  if (opt && exam) {
    exam.answers[exam.i] = Number(opt.dataset.opt);
    render("exam");
    return;
  }

  // exam navigation
  const ex = e.target.closest("[data-exam]");
  if (ex && exam) {
    const act = ex.dataset.exam;
    if (act === "next" && exam.i < EXAM.length - 1) exam.i++;
    if (act === "prev" && exam.i > 0) exam.i--;
    if (act === "finish") {
      const score = exam.answers.reduce((s, a, i) => s + (a === EXAM[i].answer ? 1 : 0), 0);
      store.set({ score, answers: exam.answers });
      exam = null;
      render("result");
      return;
    }
    render("exam");
    return;
  }

  // expand / collapse a chapter on the course page (but let the PDF button through)
  const chapHead = e.target.closest("[data-opench]");
  if (chapHead && !e.target.closest("[data-pdf]")) {
    const ch = Number(chapHead.dataset.opench);
    openChapter = openChapter === ch ? -1 : ch;
    render("course");
    return;
  }

  // answer a chapter quiz question (instant feedback, no re-render)
  const quizOpt = e.target.closest("[data-quizopt]");
  if (quizOpt) { answerQuiz(Number(quizOpt.dataset.ch), Number(quizOpt.dataset.qi), Number(quizOpt.dataset.oi)); return; }

  // tick the manual "tried a practice challenge" checklist item
  const practiceBtn = e.target.closest("[data-checkpractice]");
  if (practiceBtn) {
    const ch = Number(practiceBtn.dataset.checkpractice);
    const practice = { ...(store.get().practice || {}) };
    practice[ch] = !practice[ch];
    store.set({ practice });
    render("chapter");
    return;
  }

  // retake a chapter quiz
  const quizReset = e.target.closest("[data-quizreset]");
  if (quizReset) {
    const ch = Number(quizReset.dataset.quizreset);
    const quiz = { ...(store.get().quiz || {}) };
    delete quiz[ch];
    store.set({ quiz });
    render("chapter");
    return;
  }

  // open a chapter overview (CS50-style module page)
  const chapBtn = e.target.closest("[data-chapter]");
  if (chapBtn) { currentChapter = Number(chapBtn.dataset.chapter); render("chapter"); return; }

  // open a handbook section
  const secBtn = e.target.closest("[data-section]");
  if (secBtn) { currentSection = secBtn.dataset.section; render("section"); return; }

  // mark a section complete / undone
  const secDoneBtn = e.target.closest("[data-section-done]");
  if (secDoneBtn) {
    const id = secDoneBtn.dataset.sectionDone;
    const sections = { ...(store.get().sections || {}) };
    sections[id] = !sections[id];
    store.set({ sections });
    render("section");
    return;
  }

  // Send a code block down to the scratchpad — the single place code runs
  const editBlockBtn = e.target.closest("[data-editblock]");
  if (editBlockBtn) {
    const code = currentSectionCode[Number(editBlockBtn.dataset.editblock)];
    const ta = document.getElementById("code-hb-sandbox");
    if (ta && code != null) {
      ta.value = code;
      ta.rows = Math.max(3, code.split("\n").length);
      const out = document.getElementById("out-hb-sandbox");
      if (out) out.classList.add("out-hidden");
      const pad = document.querySelector(".hb-sandbox");
      pad.scrollIntoView({ behavior: "smooth", block: "center" });
      ta.focus();
      pad.classList.add("pad-flash");
      setTimeout(() => pad.classList.remove("pad-flash"), 900);
      const orig = editBlockBtn.textContent;
      editBlockBtn.textContent = "Copied ✓";
      setTimeout(() => { editBlockBtn.textContent = orig; }, 1200);
    }
    return;
  }

  // download a chapter's handbook PDF
  const pdfBtn = e.target.closest("[data-pdf]");
  if (pdfBtn) {
    const chapter = HANDBOOK.find(c => String(c.ch) === pdfBtn.dataset.pdf);
    const original = pdfBtn.innerHTML;
    pdfBtn.disabled = true;
    pdfBtn.textContent = "Preparing…";
    generateChapterPDF(chapter, { ...CH_META[chapter.ch], docs: CH_DOCS[chapter.ch] })
      .catch(err => alert(String(err && err.message || err)))
      .finally(() => { pdfBtn.disabled = false; pdfBtn.innerHTML = original; });
    return;
  }

  // download the completion certificate (only rendered enabled when earned)
  const certBtn = e.target.closest("[data-cert]");
  if (certBtn) {
    if (!certificateEligible(store.get())) return;
    const original = certBtn.innerHTML;
    certBtn.disabled = true;
    certBtn.textContent = "Preparing…";
    generateCertificatePDF(Auth.currentUser(), xpForProgress(store.get()))
      .catch(err => alert(String(err && err.message || err)))
      .finally(() => { certBtn.disabled = false; certBtn.innerHTML = original; });
    return;
  }

  /* ---------- faculty tests: student side ---------- */
  const takeBtn = e.target.closest("[data-taketest]");
  if (takeBtn) { currentTestId = takeBtn.dataset.taketest; render("test"); return; }

  const finishBtn = e.target.closest("[data-test-finish]");
  if (finishBtn) {
    const t = allTests().find(x => x.id === finishBtn.dataset.testFinish);
    if (!t) return;
    const answers = {};
    let unanswered = 0;
    t.questions.forEach((q, i) => {
      const pick = document.querySelector(`input[name="tq-${i}"]:checked`);
      if (pick) answers[i] = Number(pick.value); else unanswered++;
    });
    if (unanswered && !confirm(`${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered and will score 0. Submit anyway?`)) return;
    const score = t.questions.reduce((s, q, i) => s + (answers[i] === q.ans ? 1 : 0), 0);
    if (Cloud.enabled) {
      (async () => {
        const r = await Cloud.submitResult(t.id, score, t.questions.length, answers);
        if (r.error) alert(r.error);
        render("test");
      })();
      return;
    }
    const tests = { ...(store.get().tests || {}) };
    tests[t.id] = { score, total: t.questions.length, at: Date.now(), answers };
    store.set({ tests });
    render("test");
    return;
  }

  /* ---------- faculty tests: authoring ---------- */
  const readBuilder = () => {
    if (!testBuilder) return;
    testBuilder.title = (document.getElementById("tb-title") || {}).value || "";
    testBuilder.ch = Number((document.getElementById("tb-ch") || {}).value || 0);
    testBuilder.questions = [...document.querySelectorAll(".tb-q")].map(el => ({
      q: el.querySelector(".tb-qtext").value,
      opts: [...el.querySelectorAll(".tb-opt")].map(i => i.value),
      ans: Number(el.querySelector(".tb-ans").value)
    }));
  };
  const builderValid = () => {
    if (!testBuilder.title.trim()) return "Give the test a title.";
    for (let i = 0; i < testBuilder.questions.length; i++) {
      const q = testBuilder.questions[i];
      if (!q.q.trim()) return `Question ${i + 1} is empty.`;
      if (q.opts.filter(o => o.trim()).length < 2) return `Question ${i + 1} needs at least two options.`;
      if (!q.opts[q.ans] || !q.opts[q.ans].trim()) return `Question ${i + 1}: the correct answer points at an empty option.`;
    }
    return null;
  };
  const saveBuilder = (status) => {
    readBuilder();
    const err = builderValid();
    if (err) { const w = document.getElementById("tbWarn"); if (w) w.textContent = err; return false; }
    if (Cloud.enabled) {
      (async () => {
        const r = await Cloud.saveTest({ id: testBuilder.id, title: testBuilder.title.trim(), ch: testBuilder.ch, questions: testBuilder.questions }, status);
        if (r.error) { const w = document.getElementById("tbWarn"); if (w) w.textContent = r.error; return; }
        testBuilder = null;
        render("faculty");
      })();
      return true;
    }
    const u = Auth.currentUser();
    const tests = allTests();
    const existing = testBuilder.id && tests.find(x => x.id === testBuilder.id);
    const t = existing || { id: uid(), author: u.email, authorName: u.name, at: Date.now(), approvals: [], rejections: [] };
    Object.assign(t, { title: testBuilder.title.trim(), ch: testBuilder.ch, questions: testBuilder.questions, status });
    if (status === "pending") { t.approvals = []; t.rejections = []; refreshTestStatus(t); }
    if (!existing) tests.push(t);
    saveTests(tests);
    testBuilder = null;
    render("faculty");
    return true;
  };

  if (e.target.closest("[data-tb-new]")) { testBuilder = { title: "", ch: 0, questions: [{ q: "", opts: ["", "", "", ""], ans: 0 }] }; render("faculty"); return; }
  if (e.target.closest("[data-tb-addq]")) { readBuilder(); testBuilder.questions.push({ q: "", opts: ["", "", "", ""], ans: 0 }); render("faculty"); return; }
  const delQ = e.target.closest("[data-tb-delq]");
  if (delQ) { readBuilder(); testBuilder.questions.splice(Number(delQ.dataset.tbDelq), 1); render("faculty"); return; }
  if (e.target.closest("[data-tb-cancel]")) { testBuilder = null; render("faculty"); return; }
  if (e.target.closest("[data-tb-save]")) { saveBuilder("draft"); return; }
  if (e.target.closest("[data-tb-submit]")) { saveBuilder("pending"); return; }

  const submitT = e.target.closest("[data-test-submit]");
  if (submitT) {
    if (Cloud.enabled) { (async () => { const r = await Cloud.setTestStatus(submitT.dataset.testSubmit, "pending", true); if (r.error) alert(r.error); render("faculty"); })(); return; }
    updateTest(submitT.dataset.testSubmit, t => { t.status = "pending"; t.approvals = []; t.rejections = []; });
    render("faculty");
    return;
  }

  const delT = e.target.closest("[data-test-del]");
  if (delT) {
    const t = allTests().find(x => x.id === delT.dataset.testDel);
    if (t && confirm(`Delete the test "${t.title}"? Student marks for it are kept but the test disappears.`)) {
      if (Cloud.enabled) { (async () => { const r = await Cloud.deleteTest(t.id); if (r.error) alert(r.error); render(Auth.isAdmin() ? "admin" : "faculty"); })(); return; }
      saveTests(allTests().filter(x => x.id !== t.id));
      render(Auth.isAdmin() ? "admin" : "faculty");
    }
    return;
  }

  /* ---------- faculty tests: review panel ---------- */
  const approveT = e.target.closest("[data-test-approve]");
  if (approveT) {
    if (Cloud.enabled) { (async () => { const r = await Cloud.vote(approveT.dataset.testApprove, true); if (r.error) alert(r.error); render("faculty"); })(); return; }
    const me = Auth.currentUser().email;
    updateTest(approveT.dataset.testApprove, t => { if (!t.approvals.includes(me) && t.author !== me) t.approvals.push(me); });
    render("faculty");
    return;
  }
  const rejectT = e.target.closest("[data-test-reject]");
  if (rejectT) {
    const reason = prompt("Why should this test not go live? (shared with the author)");
    if (reason === null) return;
    if (Cloud.enabled) { (async () => { const r = await Cloud.vote(rejectT.dataset.testReject, false, reason); if (r.error) alert(r.error); render("faculty"); })(); return; }
    const me = Auth.currentUser().email;
    updateTest(rejectT.dataset.testReject, t => { if (!t.rejections.some(r => r.email === me) && t.author !== me) t.rejections.push({ email: me, reason }); });
    render("faculty");
    return;
  }
  const publishT = e.target.closest("[data-test-publish]");
  if (publishT && Auth.isAdmin()) {
    if (Cloud.enabled) { (async () => { const r = await Cloud.setTestStatus(publishT.dataset.testPublish, "approved"); if (r.error) alert(r.error); render("admin"); })(); return; }
    updateTest(publishT.dataset.testPublish, t => { t.status = "approved"; });
    render("admin");
    return;
  }

  /* ---------- faculty materials ---------- */
  if (e.target.closest("[data-mat-add]")) {
    const title = (document.getElementById("mat-title") || {}).value || "";
    const kind = document.getElementById("mat-kind").value;
    const warn = document.getElementById("matWarn");
    const finish = (content) => {
      const m = { ch: Number(document.getElementById("mat-ch").value), kind, title: title.trim(), content };
      if (Cloud.enabled) { (async () => { const r = await Cloud.addMaterial(m); if (r.error) alert(r.error); render("faculty"); })(); return; }
      const u = Auth.currentUser();
      const mats = allMaterials();
      mats.push({ id: uid(), ...m, author: u.email, authorName: u.name, at: Date.now() });
      saveMaterials(mats);
      render("faculty");
    };
    if (!title.trim()) { if (warn) warn.textContent = "Give the material a title."; return; }
    if (kind === "pdf") {
      const file = ((document.getElementById("mat-file") || {}).files || [])[0];
      if (!file) { if (warn) warn.textContent = "Choose a PDF file to upload."; return; }
      if (file.type !== "application/pdf") { if (warn) warn.textContent = "Only PDF files are supported here."; return; }
      if (file.size > 2.5 * 1024 * 1024) { if (warn) warn.textContent = "That PDF is over 2.5 MB — compress it or share it as a link instead."; return; }
      const reader = new FileReader();
      reader.onload = () => finish(reader.result);
      reader.onerror = () => { if (warn) warn.textContent = "Could not read that file — try again."; };
      reader.readAsDataURL(file);
      return;
    }
    const content = (document.getElementById("mat-content") || {}).value || "";
    if (!content.trim()) { if (warn) warn.textContent = "Both a title and content are needed."; return; }
    finish(content.trim());
    return;
  }
  const delM = e.target.closest("[data-mat-del]");
  if (delM) {
    if (Cloud.enabled) { (async () => { const r = await Cloud.deleteMaterial(delM.dataset.matDel); if (r.error) alert(r.error); render(Auth.isAdmin() ? "admin" : "faculty"); })(); return; }
    saveMaterials(allMaterials().filter(m => m.id !== delM.dataset.matDel));
    render(Auth.isAdmin() ? "admin" : "faculty");
    return;
  }

  /* ---------- campus mode: manual data refresh ---------- */
  if (e.target.closest("[data-cloud-refresh]")) {
    const btn = e.target.closest("[data-cloud-refresh]");
    btn.disabled = true;
    (async () => { await Cloud.refreshAll(true); render(currentRoute || "home"); })();
    return;
  }

  /* ---------- AI tutor ---------- */
  if (e.target.closest("[data-tutor-toggle]")) {
    tutorOpen = !tutorOpen;
    document.getElementById("tutorDock")?.classList.toggle("open", tutorOpen);
    if (tutorOpen) { paintTutor(); document.getElementById("tutorInput")?.focus(); }
    return;
  }
  if (e.target.closest("[data-tutor-gear]")) {
    tutorSetup = !tutorSetup;
    document.getElementById("tutorSetup")?.classList.toggle("out-hidden", !tutorSetup && !!Tutor.key());
    return;
  }
  if (e.target.closest("[data-tutor-savekey]")) {
    Tutor.save((document.getElementById("tutorKey") || {}).value || "", (document.getElementById("tutorModel") || {}).value);
    tutorSetup = false;
    document.getElementById("tutorSetup")?.classList.toggle("out-hidden", !!Tutor.key());
    document.querySelector(".tutor-dot")?.classList.toggle("on", !!Tutor.key());
    paintTutor();
    return;
  }
  if (e.target.closest("[data-tutor-send]")) { tutorSend(); return; }

  // run a code editor
  const runBtn = e.target.closest("[data-run]");
  if (runBtn) { runEditor(runBtn.dataset.run, runBtn); return; }

  // check a chapter coding challenge
  const checkBtn = e.target.closest("[data-check]");
  if (checkBtn) {
    const id = checkBtn.dataset.check;
    checkChallenge(Number(id.slice(5)), id, checkBtn);
    return;
  }

  // reveal hint / solution
  const hintBtn = e.target.closest("[data-hint]");
  if (hintBtn) {
    document.getElementById("hint-" + hintBtn.dataset.hint)?.classList.remove("out-hidden");
    const m = String(hintBtn.dataset.hint).match(/^chal-(\d+)$/);
    if (m && typeof Adaptive !== "undefined") Adaptive.observe(Number(m[1]), { hints: 1 });
    return;
  }
  const solBtn = e.target.closest("[data-solution]");
  if (solBtn) { document.getElementById("solution-" + solBtn.dataset.solution)?.classList.remove("out-hidden"); return; }

});

/* auth forms — handles both button click and Enter key */
document.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-auth-form]");
  if (!form) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  data.role = authRole;
  const btn = form.querySelector(".auth-submit");
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Please wait…";
  const res = form.dataset.authForm === "login" ? await Auth.login(data) : await Auth.signup(data);
  if (res && res.ok) { enterApp(); return; }
  showAuthError(res ? res.error : "Something went wrong. Please try again.");
  btn.disabled = false;
  btn.textContent = label;
});

/* admin: change a user's role via the table dropdown */
document.addEventListener("change", (e) => {
  const sel = e.target.closest("[data-admin-role]");
  if (!sel) return;
  if (Cloud.enabled) {
    (async () => { const r = await Cloud.setRole(sel.dataset.adminRole, sel.value); if (r.error) alert(r.error); render("admin"); })();
    return;
  }
  Auth.setRole(sel.dataset.adminRole, sel.value); render("admin");
});

/* Tab inserts spaces inside a code editor instead of leaving it */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "tutorInput") { e.preventDefault(); tutorSend(); return; }
  if (e.key === "Tab" && e.target.classList && e.target.classList.contains("code-input")) {
    e.preventDefault();
    const ta = e.target, s = ta.selectionStart, en = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + "    " + ta.value.slice(en);
    ta.selectionStart = ta.selectionEnd = s + 4;
  }
});

/* keyboard: A–D to answer, arrows to move */
document.addEventListener("keydown", (e) => {
  if (!exam || !views.exam) return;
  const onExam = document.querySelector(".exam");
  if (!onExam) return;
  const q = EXAM[exam.i];
  const k = e.key.toLowerCase();
  const map = { a: 0, b: 1, c: 2, d: 3 };
  if (k in map && map[k] < q.options.length) {
    exam.answers[exam.i] = map[k];
    render("exam");
  } else if (e.key === "ArrowRight" && exam.answers[exam.i] !== null && exam.i < EXAM.length - 1) {
    exam.i++; render("exam");
  } else if (e.key === "ArrowLeft" && exam.i > 0) {
    exam.i--; render("exam");
  }
});

/* ---------- Demo data: seed a faculty member + sample students so the
   faculty & admin dashboards are populated the first time ANY browser opens
   the site. Runs once per browser (flag-gated) and never overwrites an
   account that already exists, so admin edits/deletes/resets stick. ---------- */
const DEMO_SEED = [
  { email: "rao@vit.ac.in", name: "Dr. Meera Rao", role: "faculty", pw: "teach123" },
  { email: "iyer@vit.ac.in", name: "Dr. Arun Iyer", role: "faculty", pw: "teach123" },
  { email: "swagata@vitstudent.ac.in", name: "Swagata Banerjee", role: "student", pw: "python123",
    prog: { score: 9, sec: { 1: "all", 2: "all", 3: "all", 4: 3 }, quiz: [1, 2, 3], chal: [1, 2, 3], practice: [1, 2, 3] } },
  { email: "aisha@vitstudent.ac.in", name: "Aisha Khan", role: "student", pw: "python123",
    prog: { score: 6, sec: { 1: "all", 2: "all", 3: 4 }, quiz: [1, 2], chal: [1, 2], practice: [1, 2] } },
  { email: "ben@vitstudent.ac.in", name: "Ben Thomas", role: "student", pw: "python123",
    prog: { score: 3, sec: { 1: "all", 2: 2 }, quiz: [1], chal: [1], practice: [1] } },
  { email: "cara@vitstudent.ac.in", name: "Cara Menezes", role: "student", pw: "python123",
    prog: { score: 7, sec: { 1: 3 }, quiz: [], chal: [], practice: [] } }
];

async function seedDemo() {
  if (Cloud.enabled) return;   // campus mode: real accounts only, no demo cohort
  const SEED_V = "2";   // bump to reseed newly-added demo accounts (never clobbers existing ones)
  if (localStorage.getItem("bridgeup_demo_seeded") === SEED_V) return;
  const accounts = JSON.parse(localStorage.getItem(Auth.accountsKey) || "{}");
  for (const d of DEMO_SEED) {
    const email = d.email.toLowerCase();
    if (accounts[email]) continue;                            // never clobber a real account
    accounts[email] = { name: d.name, role: d.role, hash: await Auth._hash(d.pw) };
    if (!d.prog) continue;
    const sections = {};
    Object.entries(d.prog.sec).forEach(([ch, k]) => {
      const c = HANDBOOK.find(x => x.ch === Number(ch));
      if (c) (k === "all" ? c.sections : c.sections.slice(0, k)).forEach(s => { sections[s.id] = true; });
    });
    const quiz = {};
    d.prog.quiz.forEach(ch => { quiz[ch] = {}; (QUIZ[ch] || []).forEach((q, qi) => { quiz[ch][qi] = q.answer; }); });
    const challenges = {}; d.prog.chal.forEach(ch => { challenges[ch] = true; });
    const practice = {}; d.prog.practice.forEach(ch => { practice[ch] = true; });
    localStorage.setItem(Auth.progressPrefix + email,
      JSON.stringify({ score: d.prog.score, sections, quiz, challenges, practice }));
  }
  localStorage.setItem(Auth.accountsKey, JSON.stringify(accounts));
  localStorage.setItem("bridgeup_demo_seeded", SEED_V);
  if (typeof Adaptive !== "undefined") Adaptive.seedGlobalModel();
}

/* ---------- Theme: dark (default) ⇄ light, persisted per browser ---------- */
const THEME_KEY = "bridgeup_theme";
const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;

function paintThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (btn) btn.innerHTML = document.documentElement.classList.contains("light") ? MOON : SUN;
}
document.getElementById("themeToggle")?.addEventListener("click", () => {
  const light = document.documentElement.classList.toggle("light");
  try { localStorage.setItem(THEME_KEY, light ? "light" : "dark"); } catch (e) {}
  paintThemeToggle();
});
paintThemeToggle();

/* ---------- Boot: campus mode if configured, else local demo ---------- */
(async () => {
  if (Cloud.configured()) {
    try { await Cloud.init(); }
    catch (e) { console.warn("BridgeUp: cloud unavailable, using local mode —", e); }
  }
  if (!Cloud.enabled) { await Auth.init(); await seedDemo(); }
  if (Auth.currentUser()) enterApp();
  else renderAuth();
})();

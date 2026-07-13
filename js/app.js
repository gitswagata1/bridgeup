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
    try { return JSON.parse(localStorage.getItem(this._key()) || "{}"); }
    catch { return {}; }
  },
  set(patch) {
    const next = { ...this.get(), ...patch };
    // every save marks today as an active day — this is what streaks count
    next.activity = { ...(next.activity || {}), [todayKey()]: true };
    localStorage.setItem(this._key(), JSON.stringify(next));
    return next;
  },
  clear() { localStorage.removeItem(this._key()); }
};

/* Admin helpers — read/reset any account's progress and export the DB. */
function progressForEmail(email) {
  try { return JSON.parse(localStorage.getItem(Auth.progressPrefix + email) || "{}"); }
  catch { return {}; }
}
function resetProgressFor(email) { localStorage.removeItem(Auth.progressPrefix + email); }

function adminExport() {
  const dump = {
    exportedAt: new Date().toISOString(),
    accounts: JSON.parse(localStorage.getItem(Auth.accountsKey) || "{}"),
    progress: {}
  };
  Auth.allAccounts().forEach(a => { dump.progress[a.email] = progressForEmail(a.email); });
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
/* which student row is expanded in a dashboard */
let expandedStudent = null;
let openChapter = null;
/* auth screen state */
let authMode = "login";
let authRole = "student";

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
      <th>Student</th>${admin ? "<th>Role</th>" : ""}<th>Placement</th><th>Course progress</th>
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
          <figure class="showcase-quote">
            <blockquote>"Zero to writing my own functions in two weeks. Nothing else came close."</blockquote>
            <figcaption><span class="tav" style="background:#14b8a6">AK</span> Aisha K. · CSE, First Year</figcaption>
          </figure>
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
          <button class="role-opt role-opt-admin ${isAdmin ? "on" : ""}" data-auth-role="admin">${icon("shield")} Admin</button>
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
        <p class="auth-note">${isAdmin
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
  const firstName = user ? esc(user.name.split(" ")[0]) : "there";

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
        <div class="trust-line">
          <div class="avatars"><span style="background:#3b82f6">SB</span><span style="background:#14b8a6">AM</span><span style="background:#8b5cf6">RK</span><span style="background:#f59e0b">+</span></div>
          <div>
            <div class="stars">★★★★★ <b>4.9</b></div>
            <span class="muted">Loved by 12,000+ VIT learners</span>
          </div>
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
    // reflect it on the checklist without wiping the editor / success message
    const el = document.getElementById("checklist-card");
    if (el) el.outerHTML = checklistCardHTML(ch);
  } else if (res.error) {
    statusEl.className = "check-status check-fail";
    statusEl.innerHTML = `${icon("alert")} Your code hit an error — read the message in the output above, then try again.`;
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

function viewCourse() {
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
          <a class="hero-docs" href="${DOCS_INDEX}" target="_blank" rel="noopener">${icon("book")} Learn alongside the official Python Tutorial ${icon("external")}</a>
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
                  <div class="chap-sub"><span class="chap-level">${meta.level}</span><span class="muted">${c.sections.length} lessons</span><span class="muted">${cDone}/${c.sections.length} done</span>${chapterComplete(c.ch) ? `<span class="chap-master done">${icon("checkCircle")} Complete</span>` : quizPassed(c.ch) ? `<span class="chap-master">${icon("check")} Quiz passed</span>` : ""}</div>
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
}

function viewChapter(ch) {
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
          ${CH_DOCS[ch] ? `
          <a class="side-card docs-card" href="${CH_DOCS[ch].url}" target="_blank" rel="noopener">
            <h3>${icon("book")} Official docs</h3>
            <p class="muted">Go deeper with the authoritative Python Tutorial:</p>
            <span class="docs-link">${esc(CH_DOCS[ch].title)} ${icon("external")}</span>
          </a>` : ""}
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
          <p class="lead">Track every student through the Python course — who's flying, who's stuck, and where. Welcome, ${esc(u.name.split(" ")[0])}.</p>
        </div>
        <button class="btn btn-ghost" data-nav="course">Preview the course →</button>
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
    </section>`;
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
    if (confirm(`Reset ALL progress (exam score + completed lessons) for ${email}?`)) { resetProgressFor(email); render("admin"); }
    return;
  }
  // admin: delete a user
  const aDelete = e.target.closest("[data-admin-delete]");
  if (aDelete) {
    const email = aDelete.dataset.adminDelete;
    if (confirm(`Delete the account ${email} and all of its progress? This cannot be undone.`)) { Auth.deleteAccount(email); render("admin"); }
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
  if (hintBtn) { document.getElementById("hint-" + hintBtn.dataset.hint)?.classList.remove("out-hidden"); return; }
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
  if (sel) { Auth.setRole(sel.dataset.adminRole, sel.value); render("admin"); }
});

/* Tab inserts spaces inside a code editor instead of leaving it */
document.addEventListener("keydown", (e) => {
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
  if (localStorage.getItem("bridgeup_demo_seeded")) return;   // once per browser
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
  localStorage.setItem("bridgeup_demo_seeded", "1");
}

/* ---------- Boot: seed admin + demo data, then gate on auth ---------- */
Auth.init().then(seedDemo).then(() => {
  if (Auth.currentUser()) enterApp();
  else renderAuth();
});

/* ============================================================
   BridgeUp data layer
   - EXAM: diagnostic placement questions (mixed difficulty)
   - CURRICULUM: units + lessons, unlocked by placement level
   ============================================================ */

const EXAM = [
  {
    id: 1,
    level: "basics",
    prompt: "What does this print?",
    code: "print(3 + 4 * 2)",
    options: ["14", "11", "24", "Error"],
    answer: 1,
    why: "Python follows math order of operations: 4*2 = 8, then 3+8 = 11."
  },
  {
    id: 2,
    level: "basics",
    prompt: "Which of these is a valid variable name?",
    options: ["2nd_place", "my-score", "first_name", "class"],
    answer: 2,
    why: "Names can't start with a digit, can't contain '-', and 'class' is a reserved keyword. 'first_name' is fine."
  },
  {
    id: 3,
    level: "basics",
    prompt: "What is the data type of the value  x = \"12\" ?",
    options: ["int", "float", "str", "bool"],
    answer: 2,
    why: "Quotes make it a string (str), even though it looks like a number."
  },
  {
    id: 4,
    level: "control",
    prompt: "What does this print?",
    code: "x = 7\nif x % 2 == 0:\n    print(\"even\")\nelse:\n    print(\"odd\")",
    options: ["even", "odd", "7", "Error"],
    answer: 1,
    why: "7 % 2 is 1 (not 0), so the else branch runs and prints 'odd'."
  },
  {
    id: 5,
    level: "control",
    prompt: "How many times does 'Hi' get printed?",
    code: "for i in range(3):\n    print(\"Hi\")",
    options: ["2", "3", "4", "Infinite"],
    answer: 1,
    why: "range(3) yields 0, 1, 2 — three values — so the loop runs 3 times."
  },
  {
    id: 6,
    level: "control",
    prompt: "What is the final value of total?",
    code: "total = 0\nfor n in [1, 2, 3, 4]:\n    total += n",
    options: ["4", "10", "24", "0"],
    answer: 1,
    why: "It adds each number: 1+2+3+4 = 10."
  },
  {
    id: 7,
    level: "data",
    prompt: "What does this print?",
    code: "nums = [10, 20, 30, 40]\nprint(nums[1])",
    options: ["10", "20", "30", "Error"],
    answer: 1,
    why: "Lists are zero-indexed, so index 1 is the second element: 20."
  },
  {
    id: 8,
    level: "data",
    prompt: "What does this print?",
    code: "word = \"python\"\nprint(word[-1])",
    options: ["p", "n", "python", "Error"],
    answer: 1,
    why: "Negative indices count from the end; -1 is the last character: 'n'."
  },
  {
    id: 9,
    level: "functions",
    prompt: "What does this print?",
    code: "def double(x):\n    return x * 2\n\nprint(double(5) + 1)",
    options: ["10", "11", "12", "Error"],
    answer: 1,
    why: "double(5) returns 10, then + 1 makes 11."
  },
  {
    id: 10,
    level: "functions",
    prompt: "What will this program do?",
    code: "def greet(name):\n    print(\"Hi \" + name)\n\ngreet()",
    options: [
      "Prints 'Hi '",
      "Prints nothing",
      "Raises a TypeError (missing argument)",
      "Prints 'Hi None'"
    ],
    answer: 2,
    why: "greet() requires a 'name' argument but none was given, so Python raises a TypeError."
  }
];

/* Which skill area each question belongs to — used for the results breakdown. */
const SKILL_AREAS = ["basics", "control", "data", "functions"];

const CURRICULUM = [
  {
    id: "u1",
    title: "Unit 1 · First Steps",
    tag: "basics",
    blurb: "Run your first program, store values, and do math in Python.",
    lessons: [
      { id: "l1", title: "Hello, Python", mins: 8, summary: "print(), running code, and comments." },
      { id: "l2", title: "Variables & Types", mins: 12, summary: "int, float, str, bool and how to name things." },
      { id: "l3", title: "Doing Math", mins: 10, summary: "Operators, // vs /, and the % remainder." },
      { id: "l4", title: "Talking to the User", mins: 9, summary: "input(), and converting strings to numbers." }
    ]
  },
  {
    id: "u2",
    title: "Unit 2 · Making Decisions",
    tag: "control",
    blurb: "Teach your program to choose and to repeat.",
    lessons: [
      { id: "l5", title: "if / elif / else", mins: 12, summary: "Booleans, comparisons, and branching." },
      { id: "l6", title: "The for Loop", mins: 13, summary: "range(), looping over sequences." },
      { id: "l7", title: "The while Loop", mins: 11, summary: "Conditions, break, and avoiding infinite loops." }
    ]
  },
  {
    id: "u3",
    title: "Unit 3 · Collections",
    tag: "data",
    blurb: "Hold many values at once with lists, strings, and dicts.",
    lessons: [
      { id: "l8", title: "Lists", mins: 14, summary: "Indexing, slicing, append, and looping." },
      { id: "l9", title: "Strings in Depth", mins: 12, summary: "Slicing, methods, f-strings." },
      { id: "l10", title: "Dictionaries", mins: 13, summary: "Key–value pairs and lookups." }
    ]
  },
  {
    id: "u4",
    title: "Unit 4 · Functions & Beyond",
    tag: "functions",
    blurb: "Package logic into reusable functions and organize a program.",
    lessons: [
      { id: "l11", title: "Defining Functions", mins: 13, summary: "def, parameters, return." },
      { id: "l12", title: "Scope & Arguments", mins: 12, summary: "Local vs global, default & keyword args." },
      { id: "l13", title: "Errors & Debugging", mins: 14, summary: "Reading tracebacks, try/except." }
    ]
  }
];

/* ============================================================
   Three skill levels — inspired by CS50's tiered tracks.
   Your exam score (out of 10) places you into one level, and
   you enter at that level's first unit. Earlier levels stay
   open for review; later ones are where you're headed next.
   ============================================================ */
const LEVELS = [
  {
    key: "beginner",
    name: "Beginner",
    icon: "sprout",
    color: "#3b82f6",
    range: [0, 4],
    units: ["u1", "u2"],
    tagline: "The building blocks — printing, variables, math, decisions, and loops.",
    message: "Everyone starts here, and it's the best place to be. We build every concept from the ground up and assume zero prior experience."
  },
  {
    key: "intermediate",
    name: "Intermediate",
    icon: "bolt",
    color: "#14b8a6",
    range: [5, 7],
    units: ["u3"],
    tagline: "Working with real data — lists, strings, and dictionaries.",
    message: "You've got the fundamentals down. Now we level up to handling real data and writing programs that actually do something useful."
  },
  {
    key: "advanced",
    name: "Advanced",
    icon: "rocket",
    color: "#8b5cf6",
    range: [8, 10],
    units: ["u4"],
    tagline: "Engineering skills — reusable functions, program structure, and debugging.",
    message: "You already think like a programmer. Let's sharpen what separates coders from engineers: functions, structure, and debugging."
  }
];

/* Map an exam score to a level. Returns the level plus a couple of
   convenience fields the views rely on. */
function placementFor(score) {
  const lvl = LEVELS.find(l => score >= l.range[0] && score <= l.range[1]) || LEVELS[0];
  return {
    ...lvl,
    level: lvl.name,          // display name (kept for existing callers)
    startUnit: lvl.units[0]   // the unit the student enters at
  };
}

<p align="center">
  <a href="https://gitswagata1.github.io/bridgeup/?demo=1">
    <img src="https://capsule-render.vercel.app/api?type=waving&color=0:141e30,50:e44d26,100:f7b733&height=200&section=header&text=BridgeUp&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=30&desc=Learn%20Python%2C%20the%20right%20way&descAlignY=52&descSize=20&descColor=f0e6d3" alt="BridgeUp" width="100%">
  </a>
</p>

<p align="center">
  <strong>An adaptive Python learning platform with in-browser code execution, an AI tutor, and privacy-preserving federated learning — no installs, no setup, no server.</strong>
</p>

<p align="center">
  <a href="https://github.com/gitswagata1/bridgeup/actions/workflows/ci.yml"><img src="https://github.com/gitswagata1/bridgeup/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/gitswagata1/bridgeup/stargazers"><img src="https://img.shields.io/github/stars/gitswagata1/bridgeup?style=flat&color=f7b733" alt="Stars"></a>
  <a href="https://github.com/gitswagata1/bridgeup/network/members"><img src="https://img.shields.io/github/forks/gitswagata1/bridgeup?style=flat&color=70a5fd" alt="Forks"></a>
  <a href="https://github.com/gitswagata1/bridgeup/issues"><img src="https://img.shields.io/github/issues/gitswagata1/bridgeup?style=flat&color=e44d26" alt="Issues"></a>
  <a href="https://github.com/gitswagata1/bridgeup/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=black" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Python-Pyodide%2FWASM-3776ab?logo=python&logoColor=white" alt="Python via Pyodide">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Zero dependencies">
  <img src="https://img.shields.io/badge/build-none-2ea44f" alt="No build step">
  <img src="https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white" alt="PWA">
</p>

<h3 align="center"><a href="https://gitswagata1.github.io/bridgeup/?demo=1">Try the live demo — one tap, no signup</a></h3>

---

## Why BridgeUp?

Every classroom has a hundred different starting lines. BridgeUp begins with a **coding proficiency test**, places each learner into **Beginner, Intermediate, or Advanced**, then teaches through an interactive course where **real Python runs in the browser** — no installs, no setup, no lab configuration.

It's a single-page app in plain HTML, CSS, and JavaScript — **no framework, no build step, no server**. Serve the folder statically and it runs.

---

## Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Demo Accounts](#-demo-accounts)
- [Quick Start](#-quick-start)
- [The Course](#-the-course)
- [Gamification](#-gamification)
- [How It Works](#-how-it-works)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Credits](#-credits)
- [License](#-license)

---

## ✨ Features

| Category | What you get |
|----------|-------------|
| **Adaptive Placement** | 10-question diagnostic (~2 min) → personalised Beginner/Intermediate/Advanced track with per-topic breakdown |
| **Real Python in the Browser** | In-page scratchpad via [Pyodide](https://pyodide.org) (WASM): 165 runnable examples, `input()` support, REPL echo, infinite-loop watchdog |
| **Full Course** | *The Python Handbook* — **8 chapters, 99 lessons** adapted from the [official Python Tutorial](https://docs.python.org/3/tutorial/) |
| **Meaningful Completion** | Chapters close only after lessons read + quiz passed (≥70%) + graded coding challenge solved |
| **Gamification** | XP, 5 levels (*Newcomer* → *Pythonista*), streaks, downloadable certificate with verification code |
| **AI Tutor** | Lesson-aware chat powered by the learner's own Gemini API key — key stays in-browser, calls Google directly |
| **Federated Learning** | Privacy-preserving adaptive engine: on-device struggle signals, differential-privacy noise, FedAvg aggregation — no raw data leaves the browser |
| **Three Roles** | Student (course + tests), Faculty (analytics + authoring), Admin (full console) |
| **Faculty Tools** | Peer-reviewed MCQ test editor, per-chapter materials/PDFs, class marks with CSV export |
| **Offline PWA** | Installable on any device, service worker caches shell + Python runtime |
| **Accessible** | Skip-to-content, `aria-live` announcements, WCAG-AA contrast, `prefers-reduced-motion` support |

---

## 🏗 Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────────┐ │
│  │ index.html│  │ app.js   │  │ runner.js │  │  adaptive.js    │ │
│  │ (shell)   │  │ (router, │  │ (Pyodide/ │  │ (federated      │ │
│  │           │  │  views)  │  │  WASM)    │  │  learning, DP)  │ │
│  └──────────┘  └──────────┘  └───────────┘  └────────┬────────┘ │
│                      │                                │          │
│            ┌─────────┴──────────┐            ┌────────┴───────┐  │
│            │   localStorage     │            │  On-device      │  │
│            │  (demo mode)       │            │  model updates  │  │
│            └────────────────────┘            └────────┬───────┘  │
└───────────────────────────────────────────────────────┼──────────┘
                                                        │
                         ┌──────────────────────────────┴──────┐
                         │        Supabase (Campus Mode)       │
                         │  ┌────────┐  ┌─────┐  ┌──────────┐ │
                         │  │  Auth  │  │ RLS │  │ FedAvg   │ │
                         │  │        │  │     │  │ RPC      │ │
                         │  └────────┘  └─────┘  └──────────┘ │
                         └─────────────────────────────────────┘
```

**Two modes, one codebase:** leave `js/config.js` empty for a per-browser demo, or add a Supabase URL + anon key for campus mode with real auth, cross-device sync, and row-level security.

---

## 🔑 Demo Accounts

Open **[`…/bridgeup/?demo=1`](https://gitswagata1.github.io/bridgeup/?demo=1)** for instant access with a populated demo cohort (no signup needed).

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@bridgeup.app` | `admin123` |
| **Faculty** | `rao@vit.ac.in` | `teach123` |
| **Faculty** | `iyer@vit.ac.in` | `teach123` |
| **Student** | `swagata@vitstudent.ac.in` | `python123` |

More demo students with varied progress (all `python123`): `aisha@`, `ben@`, `cara@` — `vitstudent.ac.in`.

---

## 🚀 Quick Start

BridgeUp must be served over HTTP (not `file://`) — the Python runtime and Web Crypto API require a secure context.

```bash
# 1. Clone
git clone https://github.com/gitswagata1/bridgeup.git
cd bridgeup

# 2. Serve (pick one)
python3 -m http.server 8750     # zero dependencies
npm start                       # same command via package.json
npx serve .                     # Node alternative

# 3. Open
open http://localhost:8750
```

> **First run:** Pyodide downloads the Python runtime (~7 s on broadband). It's cached after that.

### Campus Mode (real multi-device deployment)

For a real cohort (~1,000 students + 15 faculty fit in Supabase's free tier):

1. Create a free [Supabase](https://supabase.com) project
2. Run [`supabase/schema.sql`](supabase/schema.sql)
3. Paste URL + anon key into [`js/config.js`](js/config.js)

Full walkthrough: **[SETUP-CLOUD.md](SETUP-CLOUD.md)** (~5 minutes).

---

## 📚 The Course

Adapted from the official Python Tutorial, restructured into an interactive path. Each chapter ends with a quiz and a graded coding challenge.

| # | Chapter | Level | Lessons | Time |
|---|---------|-------|---------|------|
| 1 | Introduction to Python | Beginner | 6 | ~45 min |
| 2 | More Control Flow Tools | Beginner | 19 | ~1 hr |
| 3 | Data Structures | Core | 13 | ~1.5 hrs |
| 4 | Modules | Core | 11 | ~45 min |
| 5 | Input and Output | Core | 9 | ~1 hr |
| 6 | Errors and Exceptions | Core | 11 | ~45 min |
| 7 | Classes | Advanced | 18 | ~1.5 hrs |
| 8 | A Tour of the Standard Library | Advanced | 12 | ~1 hr |

**99 lessons · 269 code examples (165 runnable) · 8 quizzes · 8 graded challenges.**

---

## ⚡ Gamification

XP is computed from real progress — never stored, so it can't drift or be edited.

| Action | XP |
|--------|----|
| Complete a lesson | +10 |
| Pass a chapter quiz (≥70%) | +25 |
| Solve a coding challenge | +50 |
| Finish the proficiency test | +20 |

**Levels:** 1,610 XP total — *Newcomer* → *Learner* (150) → *Coder* (450) → *Builder* (900) → *Pythonista* (1,400).

**Streaks:** Consecutive learning days with a one-day grace period and best-streak memory.

**Certificate:** Unlocks when every lesson, quiz, and challenge is done. A4 PDF with name, date, XP, and a deterministic verification code.

---

## 🏗 How It Works

**Routing.** A tiny hash-free router in `app.js` swaps `#app` per view. Navigation cross-fades via the [View Transitions API](https://developer.mozilla.org/docs/Web/API/View_Transition_API) where available.

**In-browser Python.** `runner.js` lazy-loads Pyodide, executes each run in a fresh namespace, captures stdout/stderr, feeds student input, echoes trailing expressions, and aborts runaway loops.

**Placement & progress.** The diagnostic maps a score to a level in `data.js`; the course lives in `handbook.js`. Completion rolls up into student, faculty, and admin views.

**Federated adaptive learning.** `adaptive.js` records struggle signals on-device, derives per-module difficulty estimates, perturbs with DP noise, and contributes only those estimates via weighted averaging — no raw events or identity ever leave the browser. See [`docs/PATENT-DISCLOSURE.md`](docs/PATENT-DISCLOSURE.md).

---

## 🗂 Project Structure

```
bridgeup/
├── index.html                 # App shell: nav, mount point, asset includes
├── css/styles.css             # Design system, responsive rules, themes, motion
├── js/
│   ├── config.js              # Deployment config (empty = demo, filled = campus)
│   ├── cloud.js               # Supabase adapter (auth, sync, tests, marks)
│   ├── auth.js                # Accounts & roles
│   ├── data.js                # Proficiency test, scoring, levels
│   ├── handbook.js            # Course content: 8 chapters / 99 lessons
│   ├── runner.js              # In-browser Python via Pyodide
│   ├── pdf.js                 # Chapter study guides + completion certificate
│   ├── adaptive.js            # Federated Adaptive Learning engine
│   └── app.js                 # Views, routing, progress, gamification
├── manifest.webmanifest       # PWA manifest
├── sw.js                      # Service worker (offline + runtime caching)
├── icons/                     # App icons (192, 512, apple-touch)
├── supabase/schema.sql        # Campus DB: tables, RLS, RPCs
├── tests/                     # node:test suite
├── .github/workflows/         # CI, CodeQL, release, stale
└── docs/
    ├── banner.svg
    └── PATENT-DISCLOSURE.md   # Federated Adaptive Learning disclosure
```

---

## 🌐 Deployment

No build step — "host the files" is the entire deploy.

| Platform | Steps |
|----------|-------|
| **GitHub Pages** | Push to `main` → Settings → Pages → Deploy from `main` / root |
| **Netlify / Vercel** | Import repo, no build command, publish dir = root |
| **University intranet** | Copy folder to any static web server |

Live at [gitswagata1.github.io/bridgeup](https://gitswagata1.github.io/bridgeup/).

---

## 🔒 Security

**Demo mode:** Accounts in `localStorage` with salted SHA-256 hashes — great for trying the product.

**Campus mode:** Supabase auth with real sessions, server-assigned roles, and Postgres row-level security on every table. See [SETUP-CLOUD.md](SETUP-CLOUD.md).

---

## 🗺 Roadmap

| Priority | Feature | Status |
|----------|---------|--------|
| 🔴 High | VIT SSO sign-in & section management | Planned |
| 🟡 Medium | C and Java tracks for first-year curricula | Design phase |
| 🟡 Medium | Proctored test modes & LMS integration | Planned |
| 🟢 Active | Formal (ε, δ)-DP guarantees for federated engine | In progress |
| ✅ Done | Campus mode with Supabase | Shipped |
| ✅ Done | Federated Adaptive Learning PoC + patent disclosure | Shipped |

---

## 🤝 Contributing

We welcome contributions of all kinds! See **[CONTRIBUTING.md](CONTRIBUTING.md)** for detailed setup instructions, coding standards, and the PR process.

**Quick links:**
- [Good first issues](https://github.com/gitswagata1/bridgeup/labels/good%20first%20issue) — beginner-friendly tasks
- [Feature requests](https://github.com/gitswagata1/bridgeup/labels/enhancement) — ideas we'd love help with
- [Bug reports](https://github.com/gitswagata1/bridgeup/issues/new?template=bug_report.yml) — found something? Let us know

---

## 🙌 Credits

- Course content adapted from the **[official Python Tutorial](https://docs.python.org/3/tutorial/)** (PSF License)
- **[Pyodide](https://pyodide.org)** — CPython compiled to WebAssembly
- **[jsPDF](https://github.com/parallax/jsPDF)** — client-side PDF generation
- Type: **Inter** and **Space Grotesk** via Google Fonts

Built for first-year students at **VIT Vellore** by **[Swagata Banerjee](https://github.com/gitswagata1)**.

---

## 📄 License

Released under the [MIT License](LICENSE). See [LICENSE](LICENSE) for details.

<p align="center">
  <a href="https://capsule-render.vercel.app/api?type=waving&color=0:f7b733,50:e44d26,100:141e30&height=100&section=footer">
    <img src="https://capsule-render.vercel.app/api?type=waving&color=0:f7b733,50:e44d26,100:141e30&height=100&section=footer" width="100%">
  </a>
</p>

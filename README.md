<p align="center">
  <img src="docs/banner.svg" alt="BridgeUp — Learn Python, the right way" width="100%">
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/build-none-2ea44f" alt="No build step"></a>
  <img src="https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=black" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Python-Pyodide-3776ab?logo=python&logoColor=white" alt="Python via Pyodide">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Zero dependencies">
  <a href="https://gitswagata1.github.io/bridgeup/"><img src="https://img.shields.io/badge/demo-live-14b8a6" alt="Live demo"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT License"></a>
</p>

<h3 align="center">🔗 <a href="https://gitswagata1.github.io/bridgeup/">Live demo — gitswagata1.github.io/bridgeup</a></h3>

**BridgeUp** is a Python learning platform for first-year students, built around one observation: every classroom has a hundred different starting lines. It begins with a short **coding proficiency test**, places each learner into **Beginner, Intermediate, or Advanced**, and then teaches through an interactive course where **real Python runs in the browser** — no installs, no setup, no lab configuration.

It's a single-page app in plain HTML, CSS, and JavaScript — **no framework, no build step, no server**. Serve the folder statically and it runs.

---

## Contents

- [Features](#-features)
- [Demo accounts](#-demo-accounts)
- [Quick start](#-quick-start)
- [The course](#-the-course)
- [Gamification](#-gamification)
- [How it works](#-how-it-works)
- [Project structure](#-project-structure)
- [Deployment](#-deployment)
- [Security note](#-security-note)
- [Roadmap](#-roadmap)
- [Credits](#-credits)

---

## ✨ Features

- **Proficiency test → personalised track.** A 10-question diagnostic (~2 minutes) scores the learner, places them into one of three levels, and shows a per-topic breakdown of strengths and gaps. **The test gates the course** — students unlock chapters by taking it first (faculty and admin can always preview).
- **A real course, not a slideshow.** *The Python Handbook* — **8 chapters, 99 lessons** adapted from the [official Python Tutorial](https://docs.python.org/3/tutorial/), with source attribution throughout. Topics that step beyond the basics carry an **Advanced** tag; optional extras carry a **Bonus** tag.
- **Python that actually runs.** An in-page scratchpad executes real CPython via [Pyodide](https://pyodide.org) (WebAssembly): 165 runnable examples, `input()` support, REPL-style expression echo, and an infinite-loop watchdog so the tab never freezes.
- **Completion that means something.** A chapter closes only when its lessons are read, its quiz is passed at ≥70%, and its **graded coding challenge** produces the right output.
- **Gamification built in.** XP for every action, five levels from *Newcomer* to *Pythonista*, daily learning **streaks**, and a downloadable **certificate of completion** with a verification code — see [Gamification](#-gamification).
- **Faculty-authored tests with peer approval.** Faculty build MCQ tests in a visual editor; a review panel of up to **5 faculty** decides — majority approval publishes the test to students. One attempt per student, auto-graded, with a full answer review.
- **Marks for faculty.** Every test's results roll into the faculty dashboard — per-student marks, attempt counts, and class averages.
- **Faculty materials.** Faculty add notes, links, or **uploaded PDFs** (up to 2.5 MB) to any chapter; they appear inside the chapter for every student. Admin has oversight of both tests and materials.
- **Personal AI tutor.** A lesson-aware chat tutor on every lesson page, powered by **each user's own free Gemini API key** — the key lives only in their browser and calls Google directly; BridgeUp never sees it.
- **Federated Adaptive Learning** *(research / patent PoC).* A privacy-preserving adaptive engine: struggle signals are captured **on-device**, and only anonymised, differentially-private difficulty estimates are aggregated (FedAvg-style) into a shared model — so personalisation improves across all learners while **no raw student data ever leaves the browser**. Powers the "recommended next module" card, a "commonly challenging" signal, and the tutor's memory. See [docs/PATENT-DISCLOSURE.md](docs/PATENT-DISCLOSURE.md).
- **Three roles, one login.**
  - **Student** — takes the course and faculty tests, tracks progress, downloads chapter PDFs.
  - **Faculty** — class analytics and marks, plus authoring: tests (peer-reviewed) and chapter materials.
  - **Admin** — a full console: every account, live progress, role management, test/material oversight, database export, resets.
- **Offline study guides.** Every chapter exports a formatted **PDF** (objectives, takeaways, practice, full lesson content) via [jsPDF](https://github.com/parallax/jsPDF).
- **Installable app (PWA).** Add BridgeUp to any phone or desktop home screen — it launches full-screen like a native app, and a service worker caches the shell (and the Python runtime after first use) so it opens and runs **offline**. No app store, no install fees.
- **Polished UX.** **Light and dark themes** with a one-click toggle (persisted per browser; code surfaces stay dark in both), cross-fade view transitions, keyboard-accessible focus states, custom scrollbars, and zero horizontal overflow down to phone widths.

---

## 🔑 Demo accounts

A demo cohort is seeded in code on first load, so every dashboard is populated the moment you open the site. The login screen also shows the right credentials for whichever role you select.

| Role        | Email                          | Password     |
| ----------- | ------------------------------ | ------------ |
| **Admin**   | `admin@bridgeup.app`           | `admin123`   |
| **Faculty** | `rao@vit.ac.in`                | `teach123`   |
| **Faculty** | `iyer@vit.ac.in`               | `teach123`   |
| **Student** | `swagata@vitstudent.ac.in`     | `python123`  |

More demo students, with varied progress for realistic dashboards (all `python123`): `aisha@`, `ben@`, `cara@` — `vitstudent.ac.in`.

Registration is domain-gated: students sign up with `@vitstudent.ac.in`, faculty with `@vit.ac.in`.

---

## 🚀 Quick start

BridgeUp must be **served over HTTP** (not opened as a `file://` URL) — the in-browser Python runtime and the Web Crypto password hashing both require a secure context, which `localhost` provides.

```bash
# clone
git clone https://github.com/gitswagata1/bridgeup.git
cd bridgeup

# serve (pick one)
python3 -m http.server 8750     # no dependencies
npm start                       # same command, via package.json
npx serve .                     # if you prefer Node
```

Then open **http://localhost:8750**.

> The first time you run code, Pyodide downloads the Python runtime (~7 s). It's cached afterwards.

---

## 📚 The course

Faithful to the official Python Tutorial, restructured into an interactive path. Each chapter ends with a quiz and a graded coding challenge.

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

**99 lessons · 269 code examples (165 runnable in-page) · 8 quizzes · 8 graded challenges.**
Topics that stretch beyond a chapter's baseline (e.g. `match` statements, `*args/**kwargs`, comprehensions, exception groups) are tagged **Advanced**; nice-to-know extras (coding style, legacy formatting, performance measurement) are tagged **Bonus**.

---

## ⚡ Gamification

Everything is derived from real progress — XP is computed, never stored, so it can't drift or be edited.

| Action | XP |
|--------|----|
| Complete a lesson | +10 |
| Pass a chapter quiz (≥70%) | +25 |
| Solve a coding challenge | +50 |
| Finish the proficiency test | +20 |

- **Levels** — 1,610 XP total across five levels: *Newcomer* → *Learner* (150) → *Coder* (450) → *Builder* (900) → *Pythonista* (1,400).
- **Streaks** — any learning activity marks the day; consecutive days build a streak (with best-streak memory and a one-day grace period).
- **Certificate of completion** — unlocks only when every lesson, quiz, and challenge is done. Downloads as an A4 PDF with the student's name, completion date, XP earned, and a deterministic verification code.

---

## 🏗 How it works

**Routing.** A tiny hash-free router in `app.js` swaps the contents of `#app` per view (`home`, `exam`, `result`, `course`, `chapter`, `section`, `faculty`, `admin`, plus the auth screen). Navigation cross-fades via the [View Transitions API](https://developer.mozilla.org/docs/Web/API/View_Transition_API) where available; in-place updates repaint instantly and preserve scroll.

**The "database".** There is no backend. `localStorage` holds:

| Key                         | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `bridgeup_accounts`         | All accounts (name, role, salted SHA-256 password hash)        |
| `bridgeup_session`          | The currently signed-in email                                  |
| `bridgeup:progress:<email>` | Per-account progress: score, lessons, quizzes, challenges, and daily activity for streaks |

Passwords are hashed with the Web Crypto API before storage — never kept in plaintext.

**In-browser Python.** `runner.js` lazy-loads Pyodide on first run, then reuses it. Each run executes in a fresh namespace, captures `stdout`/`stderr`, feeds student-supplied input, echoes a trailing bare expression like the REPL, and a step-count watchdog aborts runaway loops.

**Placement & progress.** The test maps a score to a level in `data.js`; the course lives in `handbook.js`. Chapter completion (lessons + quiz + challenge) rolls up automatically into the student's own view, the faculty dashboard, and the admin console.

---

## 🗂 Project structure

```
bridgeup/
├── index.html          # App shell: nav, mount point, asset includes
├── css/
│   └── styles.css      # Design system, views, responsive rules, motion
├── js/
│   ├── config.js       # Deployment config: empty = local demo, filled = campus mode
│   ├── cloud.js        # Supabase adapter: auth, sync, tests, marks (campus mode)
│   ├── auth.js         # Accounts & roles — local demo store, or delegates to cloud
│   ├── data.js         # Proficiency test, three levels, scoring
│   ├── handbook.js     # Course content: 8 chapters / 99 lessons (official Python Tutorial)
│   ├── runner.js       # In-browser Python via Pyodide (stdin, loop guard, REPL echo)
│   ├── pdf.js          # Chapter study guides + completion certificate (jsPDF)
│   ├── adaptive.js     # Federated Adaptive Learning engine (on-device signals, FedAvg, DP, memory)
│   └── app.js          # Views, routing, progress, quizzes, challenges, gamification, dashboards, demo seed
├── docs/
│   └── banner.svg
├── supabase/
│   └── schema.sql      # Campus-mode database: tables, RLS, approval RPCs
├── SETUP-CLOUD.md      # 5-minute campus deployment guide
├── manifest.webmanifest       # PWA manifest (installable app)
├── sw.js                       # Service worker (offline shell + runtime caching)
├── icons/                      # App icons (192, 512, apple-touch)
├── docs/PATENT-DISCLOSURE.md  # Technical disclosure: Federated Adaptive Learning
├── package.json
├── LICENSE
└── README.md
```

---

## 🌐 Deployment

No build step — deployment is "host the files".

- **GitHub Pages** (this demo) — push to `main`, then Settings → Pages → *Deploy from branch* → `main` / root.
- **Netlify / Vercel** — import the repo with **no build command**, publish directory = project root.
- **University intranet** — copy the folder to any static web server.

### 🏫 Campus mode — real multi-device deployment

Out of the box the site runs as a per-browser demo. To deploy for a real cohort
(**~1,000 students + 15 faculty fit comfortably in Supabase's free tier**),
create a free Supabase project, run [`supabase/schema.sql`](supabase/schema.sql),
and paste two values into [`js/config.js`](js/config.js) — accounts, progress,
tests, marks and materials become real and shared across every device, with
roles assigned server-side and all rules enforced by Postgres row-level
security. Full walkthrough: **[SETUP-CLOUD.md](SETUP-CLOUD.md)** (≈5 minutes).

---

## 🔒 Security note

In **local demo mode**, accounts and progress live in each visitor's own browser (passwords stored only as salted hashes) — ideal for trying the product. In **campus mode**, authentication and data move to Supabase: real sessions, server-assigned roles, and Postgres row-level security on every table — see [SETUP-CLOUD.md](SETUP-CLOUD.md).

---

## 🗺 Roadmap

- **Scale** — ✅ shipped: campus mode with a real cohort database (Supabase). Next: VIT SSO sign-in and section management.
- **Beyond Python** — C and Java tracks to match first-year curricula.
- **Assessment** — proctored test modes and LMS integration so progress flows into existing systems.
- **Federated Adaptive Learning** — ✅ working PoC + patent disclosure; next: formal (ε, δ)-DP guarantees, secure aggregation, prior-art search with the VIT IP cell.

---

## 🙌 Credits

- Course content adapted from the **[official Python Tutorial](https://docs.python.org/3/tutorial/)** (© Python Software Foundation, PSF License).
- **[Pyodide](https://pyodide.org)** — CPython compiled to WebAssembly.
- **[jsPDF](https://github.com/parallax/jsPDF)** — client-side PDF generation.
- Type: **Inter** and **Space Grotesk** via Google Fonts.

Built for first-year students at **VIT Vellore** by **Swagata Banerjee** (`the.swagata`).

---

## 📄 License

Released under the [MIT License](LICENSE).

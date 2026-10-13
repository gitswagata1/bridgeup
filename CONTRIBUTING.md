# Contributing to BridgeUp

Thanks for your interest in contributing! BridgeUp is an adaptive Python learning platform with in-browser code execution via Pyodide/WASM. Whether you're fixing a bug, adding a feature, or improving docs — every contribution matters.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Good First Issues](#good-first-issues)
- [Code of Conduct](#code-of-conduct)

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/bridgeup.git
   cd bridgeup
   ```
3. **Add upstream** remote:
   ```bash
   git remote add upstream https://github.com/gitswagata1/bridgeup.git
   ```

## Development Setup

BridgeUp has **zero build dependencies** — it's plain HTML, CSS, and JavaScript.

```bash
# Install dev dependencies (testing only)
npm install

# Start a local server
npm start
# → opens http://localhost:8750

# Run tests
npm test
```

The app runs in **demo mode** by default (data in localStorage). For campus mode with Supabase, see [SETUP-CLOUD.md](SETUP-CLOUD.md).

### Key files for development

| File | Purpose |
|------|---------|
| `js/app.js` | Router, views, progress tracking, gamification |
| `js/runner.js` | Pyodide/WASM Python execution engine |
| `js/handbook.js` | Course content (8 chapters, 99 lessons) |
| `js/data.js` | Proficiency test questions and scoring |
| `js/adaptive.js` | Federated learning engine |
| `css/styles.css` | All styles, themes, responsive rules |
| `tests/` | `node:test` suite |

## Coding Standards

### JavaScript
- **No frameworks** — vanilla JS only. This is by design, not by accident.
- **2 spaces** for indentation
- Use `const` by default, `let` when reassignment is needed, never `var`
- Prefer template literals over string concatenation
- Use descriptive function and variable names

### CSS
- Follow existing naming conventions in `styles.css`
- Use CSS custom properties for theme values
- Ensure both light and dark themes work
- Test at mobile widths (360px minimum)

### Accessibility
- All interactive elements must be keyboard-navigable
- Use semantic HTML elements
- Include `aria-` attributes where visual meaning isn't conveyed by semantics
- Maintain WCAG-AA contrast ratios

### Commits
- Write clear, descriptive commit messages
- Use conventional commit prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `style:`
- Keep commits focused — one logical change per commit

## Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Make your changes** and test locally
3. **Run tests** to ensure nothing breaks:
   ```bash
   npm test
   ```
4. **Commit** with a descriptive message:
   ```bash
   git commit -m "feat: add progress tracking dashboard"
   ```
5. **Push** to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```

## Pull Request Process

1. **Open a PR** against `main` with a clear title and description
2. Fill in the **PR template** — describe what changed and why
3. Ensure **CI passes** (tests + lint)
4. Request review from a maintainer
5. Address any feedback
6. Once approved, a maintainer will merge your PR

### PR Tips
- Keep PRs focused — one feature or fix per PR
- Include screenshots for UI changes
- Link related issues with `Closes #123`
- Update documentation if your change affects usage

## Good First Issues

Look for issues labeled [`good first issue`](https://github.com/gitswagata1/bridgeup/labels/good%20first%20issue) — these are beginner-friendly tasks with clear scope and guidance.

### Areas where help is especially welcome

- **UI/UX improvements** — better mobile responsiveness, animations, accessibility
- **New Python exercises** — practice problems or additional course content
- **Testing** — expand coverage in `tests/`
- **Documentation** — setup guides, inline docs, tutorials
- **Internationalization** — translate the UI or course content
- **Performance** — Pyodide load time, PWA caching strategies

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold a welcoming, inclusive community.

---

Questions? Open a [discussion](https://github.com/gitswagata1/bridgeup/discussions) or reach out to [@gitswagata1](https://github.com/gitswagata1).

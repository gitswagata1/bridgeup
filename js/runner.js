/* ============================================================
   BridgeUp Python runner — real Python via Pyodide (lazy-loaded)
   - Loads once on first Run, then reused (instant after warm-up).
   - Captures stdout + stderr, feeds student input, isolates each
     run in a fresh namespace so variables don't leak between runs.
   ============================================================ */

const Runner = {
  py: null,
  _loading: null,
  PYODIDE_URL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",

  isReady() { return !!this.py; },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not download the Python runtime. Check your connection."));
      document.head.appendChild(s);
    });
  },

  /* Load + initialize Pyodide exactly once. onStatus(msg) reports progress. */
  ensure(onStatus) {
    if (this.py) return Promise.resolve(this.py);
    if (this._loading) return this._loading;

    this._loading = (async () => {
      onStatus && onStatus("Downloading Python… (first time only, ~7s)");
      await this._loadScript(this.PYODIDE_URL + "pyodide.js");
      onStatus && onStatus("Starting Python…");
      const py = await loadPyodide({ indexURL: this.PYODIDE_URL });

      // Define an input() that reads from a list we set before each run,
      // plus a watchdog that stops runaway (infinite) loops so the tab
      // can't freeze — Pyodide runs on the main thread.
      py.runPython(`
import builtins, sys as _sys
_bridgeup_queue = []
def _bridgeup_set_inputs(vals):
    global _bridgeup_queue
    _bridgeup_queue = list(vals)
def _bridgeup_input(prompt=''):
    if _bridgeup_queue:
        return _bridgeup_queue.pop(0)
    return ''
builtins.input = _bridgeup_input

def _bridgeup_guard():
    n = 0
    def g(frame, event, arg):
        nonlocal n
        n += 1
        if n > 1200000:
            raise RuntimeError("Your program ran too long — this usually means a loop that never ends. Make sure something inside the loop eventually stops it (a changing condition, or a break).")
        return g
    return g

import ast as _ast
def _bridgeup_run(src, g):
    # Run like the REPL: if the last statement is a bare expression, echo its value.
    try:
        tree = _ast.parse(src, mode='exec')
    except SyntaxError:
        exec(compile(src, '<scratch>', 'exec'), g)
        return
    body = tree.body
    if body and isinstance(body[-1], _ast.Expr):
        last = body.pop()
        if body:
            exec(compile(_ast.Module(body, []), '<scratch>', 'exec'), g)
        val = eval(compile(_ast.Expression(last.value), '<scratch>', 'eval'), g)
        if val is not None:
            print(repr(val))
    else:
        exec(compile(tree, '<scratch>', 'exec'), g)
`);
      this.py = py;
      onStatus && onStatus("ready");
      return py;
    })();

    return this._loading;
  },

  /* Run `code` with optional multiline `stdin`. Returns {ok, output, error}. */
  async run(code, stdin, onStatus) {
    const py = await this.ensure(onStatus);

    let output = "";
    py.setStdout({ batched: (s) => { output += s + "\n"; } });
    py.setStderr({ batched: (s) => { output += s + "\n"; } });

    const lines = (stdin && stdin.length) ? stdin.replace(/\n$/, "").split("\n") : [];
    const setInputs = py.globals.get("_bridgeup_set_inputs");
    setInputs(lines);
    setInputs.destroy();

    const ns = py.toPy({});
    const runIt = py.globals.get("_bridgeup_run");
    try {
      py.runPython("import sys as _s; _s.settrace(_bridgeup_guard())");
      runIt(code, ns);
      return { ok: true, output };
    } catch (e) {
      return { ok: false, output, error: this._friendlyError(String(e.message || e)) };
    } finally {
      py.runPython("import sys as _s; _s.settrace(None)");
      runIt.destroy();
      ns.destroy();
    }
  },

  /* Pyodide errors carry a long traceback; keep the meaningful tail. */
  _friendlyError(raw) {
    const lines = raw.trim().split("\n").filter(Boolean);
    // The final line is usually "ErrorType: message".
    const last = lines[lines.length - 1] || raw;
    // Try to also surface the line the user's code failed on.
    const fileLine = lines.find(l => l.includes('File "<scratch>"') || l.includes('File "<exec>"'));
    const where = fileLine ? fileLine.replace(/.*File "<(scratch|exec)>", /, "").trim() : "";
    return where ? `${last}\n  (at ${where})` : last;
  }
};

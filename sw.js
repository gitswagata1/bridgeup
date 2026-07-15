/* ============================================================
   BridgeUp service worker — makes the app installable and fast,
   and lets it launch (and run Python) offline after first use.

   Strategy:
   - Navigations: network-first, fall back to the cached shell so
     the app opens with no connection.
   - Same-origin assets (css/js/icons): stale-while-revalidate —
     instant from cache, refreshed in the background.
   - Known CDNs (Pyodide, jsPDF, Google Fonts): cache-first, so the
     Python runtime is available offline after the first run.
   - Everything else (Supabase, the Gemini API, etc.): untouched,
     straight to the network — never cached.
   ============================================================ */

const CACHE = "bridgeup-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const CDN_HOSTS = [
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  const sameOrigin = url.origin === self.location.origin;

  // App launches: network-first so online users always get the latest,
  // with the cached shell as an offline fallback.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { cachePut(req, res.clone()); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  if (sameOrigin) {
    // Stale-while-revalidate for our own assets.
    e.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => { cachePut(req, res.clone()); return res; }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  if (CDN_HOSTS.includes(url.hostname)) {
    // Cache-first for heavy third-party runtimes (Pyodide, jsPDF, fonts).
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => { cachePut(req, res.clone()); return res; }))
    );
  }
  // else: leave it to the network (Supabase, Gemini, anything dynamic).
});

function cachePut(req, res) {
  if (!res || !res.ok) return;
  caches.open(CACHE).then((c) => c.put(req, res)).catch(() => {});
}

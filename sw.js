// FATHOM — service worker.
//
// The job is narrow: make the game open with no signal, and make it feel like
// something you own rather than a page you visit. It caches the shell, serves
// it offline, and lets everything else in gracefully.
//
// THE LAW THIS FILE OBEYS: EVERY ASSET IS OPTIONAL. Install must never fail
// because a file is missing — a half-cached game that still runs beats a
// perfect one that refuses to install. Shell files are added individually and
// a rejection is swallowed; the music is never an install blocker and arrives
// only if the player actually plays a track.
//
// UPDATE POLICY: the HTML is NETWORK-FIRST, because Sean deploys by pushing to
// GitHub Pages and a stale cache would silently pin players to an old build.
// Fonts, the icon and the music are CACHE-FIRST — they are immutable, they are
// the slow bytes, and re-fetching them on a phone is the thing worth avoiding.

const VERSION = 'fathom-v5';   // bumped: the briefing cards and the HUD's depth stat
const SHELL = [
  './',
  'fathom-chart.html',
  'manifest.json',
  'assets/fonts.css',
  'assets/icon-512.png',
  'assets/fonts/CormorantGaramond-400-normal-latin.woff2',
  'assets/fonts/CormorantGaramond-500-normal-latin.woff2',
  'assets/fonts/CormorantGaramond-400-italic-latin.woff2',
  'assets/fonts/JetBrainsMono-300-normal-latin.woff2',
  'assets/fonts/JetBrainsMono-400-normal-latin.woff2',
  'assets/fonts/JetBrainsMono-500-normal-latin.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // One at a time, each failure swallowed. cache.addAll() is all-or-nothing:
    // a single 404 would abort the whole install and leave the game with no
    // offline copy at all, which is exactly the fragility we are avoiding.
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // never touch anything off-site

  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('.html');

  if (isDoc) {
    // Network first: a pushed build must reach the player. Cache is the
    // fallback for no signal, and the cache is refreshed on every success.
    e.respondWith((async () => {
      try {
        // `cache: 'reload'` BYPASSES THE HTTP CACHE and refills it.
        //
        // Without it "network-first" was a lie: GitHub Pages serves the HTML
        // with Cache-Control max-age=600, so this fetch was answered from the
        // browser's own ten-minute cache and a pushed build could take ten
        // minutes to reach a player who was actively reloading to get it. The
        // whole point of network-first is that a deploy lands immediately.
        const fresh = await fetch(req, { cache: 'reload' });
        // The put gets its own guard: if caching fails (quota, private mode) we
        // still hand back the FRESH build. Letting a cache error fall through to
        // the catch below would serve a stale game over a working network,
        // which is the exact failure this whole file exists to prevent.
        // ONLY CACHE A REAL BUILD. `fetch` RESOLVES for 404 and 500, and
        // cache.put accepts them — so one transient GitHub Pages 404, or one
        // captive-portal wifi login page, used to overwrite the cached game
        // with the error page and destroy the offline copy entirely. The asset
        // branch below has always had this guard; the document branch, which
        // is the one that matters, did not.
        if (fresh && fresh.ok && fresh.type === 'basic') {
          try {
            const cache = await caches.open(VERSION);
            await cache.put(req, fresh.clone());
          } catch (cacheErr) { /* not fatal — the player still gets the new build */ }
        }
        return fresh;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || caches.match('fathom-chart.html');
      }
    })());
    return;
  }

  // Everything else — fonts, icon, music — cache first, then network, and
  // store what comes back. A miss returns the network error untouched, so a
  // missing track behaves exactly as it does with no service worker at all:
  // the audio element errors, the track is marked dead, the game plays on.
  // RANGE REQUESTS ARE LEFT ALONE ENTIRELY. An <audio> element asks for byte
  // ranges, the server answers 206, and cache.put() THROWS on a 206 — which,
  // unguarded, rejects the whole respondWith and takes the music down with it.
  // Passing these straight through costs nothing: the tracks are 200 KB, they
  // are not the offline-critical bytes, and the shell is what has to survive.
  if (req.headers.has('range')) return;

  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const fresh = await fetch(req);
    // Only complete, basic 200s are cacheable. Anything else is returned
    // untouched, and a put that fails anyway must never break the response —
    // a missing track has to behave exactly as it does with no worker at all:
    // the audio element errors, the track is marked dead, the game plays on.
    if (fresh && fresh.status === 200 && fresh.type === 'basic') {
      try {
        const cache = await caches.open(VERSION);
        await cache.put(req, fresh.clone());
      } catch (err) { /* quota, opaque, partial — none of it is fatal */ }
    }
    return fresh;
  })());
});

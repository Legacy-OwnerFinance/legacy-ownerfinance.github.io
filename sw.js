/* Legacy - Owner Finance service worker.
   Network-first for everything on this origin so users always get the newest app after a deploy;
   the cache is only a fallback when offline. Supabase/API/other origins are never touched. */
const CACHE = 'legacy-of-shell-v1';
const PRECACHE = ['/', '/app.html', '/privacy.html', '/styles.css', '/favicon.ico', '/android-chrome-192x192.png', '/legacy-logo.png', '/splash-logo.webp', '/listing-placeholder.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // never cache the tunnel pointer or service worker itself
  if (url.pathname === '/sw.js' || url.pathname === '/tunnel-url.json') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => {
          if (hit) return hit;
          if (req.mode === 'navigate') return caches.match('/app.html').then((r) => r || caches.match('/'));
          return Response.error();
        })
      )
  );
});

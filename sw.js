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

/* ---- Web Push: status-change alerts for approved agents ---- */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Legacy - Owner Finance';
  const opts = {
    body: d.body || '',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    lang: d.lang || undefined,
    data: { url: d.url || '/' },
  };
  if (d.tag) { opts.tag = d.tag; opts.renotify = false; }
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const raw = (e.notification.data && e.notification.data.url) || '/';
  let url;
  try { url = new URL(raw, self.location.origin); if (url.origin !== self.location.origin) url = new URL('/', self.location.origin); } catch (_) { url = new URL('/', self.location.origin); }
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          return (c.navigate ? c.navigate(url.href).catch(() => c) : Promise.resolve(c)).then((cc) => (cc || c).focus());
        }
      }
      return self.clients.openWindow(url.href);
    })
  );
});

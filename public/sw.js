/* FlyTale Service Worker — ilovani o'rnatish (PWA) va tezroq yuklanish uchun.
 * Strategiya:
 *  - sahifa (navigatsiya): avval internet, bo'lmasa keshdagi nusxa;
 *  - /assets/, /textures/, ikonkalar: avval kesh (fayl nomlari build'da o'zgaradi);
 *  - boshqa so'rovlar (Wikimedia, shriftlar, dev server): o'zgarishsiz internetdan.
 * Yangi versiya chiqarganda CACHE nomini o'zgartiring.
 */
const CACHE = 'flytale-v1';
const PRECACHE = ['/', '/manifest.webmanifest', '/favicon.svg', '/logo.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/textures/') || /\.(png|svg|webmanifest)$/.test(url.pathname));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
  // Qolganlari — brauzerning odatiy so'rovi
});

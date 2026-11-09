// Service worker: permet obrir l'app sense connexió i instal·lar-la.
// Quan canviïs fitxers de l'app, puja el número de VERSIO perquè els dispositius s'actualitzin.
const VERSIO = 'podcasts-v2';
const FITXERS = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'img/icona.svg', 'img/icona-180.png', 'img/icona-192.png', 'img/icona-512.png', 'img/favicon-32.png',
  'img/la-cara-oculta-de-la-lluna.jpg', 'img/blanc-i-negre.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIO).then((c) => c.addAll(FITXERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Xarxa primer (per tenir sempre l'última versió); si no hi ha connexió, la còpia guardada.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g'))) {
          const copia = resp.clone();
          caches.open(VERSIO).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});

// Service worker: permet obrir l'app sense connexió i instal·lar-la.
// Quan canviïs fitxers de l'app, puja el número de VERSIO perquè els dispositius s'actualitzin.
const VERSIO = 'podcasts-v16';
const FITXERS = [
  './', 'index.html', 'styles.css', 'app.js', 'sync.js', 'config.js', 'manifest.webmanifest',
  'img/icona.svg', 'img/icona-180.png', 'img/icona-192.png', 'img/icona-512.png', 'img/favicon-32.png',
  'img/la-cara-oculta-de-la-lluna.jpg', 'img/blanc-i-negre.jpg',
];
// Fitxers externs que també es guarden per funcionar sense connexió
const EXTERNS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  // «reload»: baixa els fitxers nous del servidor, no els que el navegador tingui guardats
  e.waitUntil(caches.open(VERSIO).then((c) => c.addAll(FITXERS.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Xarxa primer (per tenir sempre l'última versió); si no hi ha connexió, la còpia guardada.
// Les peticions a la base de dades (Supabase) no es toquen mai.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const propi = url.origin === self.location.origin;
  if (e.request.method !== 'GET' || !(propi || EXTERNS.includes(url.hostname))) return;
  e.respondWith(
    // Fitxers de l'app: sempre es comprova amb el servidor si n'hi ha una versió nova
    fetch(e.request, propi ? { cache: 'no-cache' } : undefined)
      .then((resp) => {
        if (resp.ok || resp.type === 'opaque') {
          const copia = resp.clone();
          caches.open(VERSIO).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || (propi && e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});

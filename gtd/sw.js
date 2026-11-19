// Lets the app open without a connection. Scoped to /gtd/ only.
const CACHE = 'gtd-v1';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon-180.png', './icon-512.png'];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('gtd-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith(networkFirst(event));
});

// Prefer fresh files so updates show up right away; fall back to the cache when offline or slow.
async function networkFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const network = fetch(request);
  event.waitUntil(
    network
      .then((response) => (response.ok ? cache.put(request, response.clone()) : undefined))
      .catch(() => {}),
  );
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS));
  try {
    return await Promise.race([network, timeout]);
  } catch {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (request.mode === 'navigate' ? await cache.match('./') : undefined);
    return cached || network;
  }
}

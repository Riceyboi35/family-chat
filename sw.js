const CACHE = 'fc-v2';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

// Network first for the app itself, fall back to cache when offline
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});

self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch { d = { title: 'Family Chat', body: e.data?.text() || 'New message' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Family Chat', {
    body: d.body || 'New message', icon: 'icon-192.png', badge: 'icon-192.png',
    tag: d.chat || 'family', renotify: true, data: { chat: d.chat || 'family' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const chat = e.notification.data?.chat || 'family';
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { c.postMessage({ chat }); return c.focus(); }
    return clients.openWindow('./?chat=' + encodeURIComponent(chat));
  })());
});

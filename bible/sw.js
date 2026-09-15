/* Daily Bread service worker: app shell cached on install, Bible data cached on first use. */
var CACHE = 'daily-bread-v1';
var SHELL = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  var isData = url.origin === location.origin && url.pathname.indexOf('/data/') !== -1;
  var isFont = url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com';
  if (isData || isFont) {
    // cache first: the Bible text and fonts never change between versions
    e.respondWith(caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
        return res;
      });
    }));
    return;
  }
  if (url.origin === location.origin) {
    // network first for the app shell so updates arrive, cache as fallback for offline
    e.respondWith(fetch(e.request).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return caches.match(e.request).then(function (hit) { return hit || caches.match('index.html'); }); }));
  }
});

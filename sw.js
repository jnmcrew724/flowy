/* Flowy service worker — offline-first cache for the app shell.
   Bump CACHE when shipping changes so clients pick them up. */
var CACHE = 'flowy-v2';
var ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './assets/badge-green.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon-128.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Network-first for same-origin navigations/app files so updates land;
  // fall back to cache when offline. Cross-origin (fonts) → cache-first.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('./index.html'); }); })
    );
  } else {
    e.respondWith(
      caches.match(req).then(function (m) {
        return m || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () { return m; });
      })
    );
  }
});

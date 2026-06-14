const CACHE_NAME = 'doramemo-v1';
const ASSETS = [
  '/doramemo/',
  '/doramemo/index.html',
  '/doramemo/home.html',
  '/doramemo/tenko.html',
  '/doramemo/gyomu.html',
  '/doramemo/memo.html',
  '/doramemo/admin.html',
  '/doramemo/reset.html',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// インストール時にキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// キャッシュ優先・ネットワーク補完
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(!response || response.status !== 200) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => cached);
    })
  );
});

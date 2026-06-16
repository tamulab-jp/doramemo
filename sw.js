// ドラメモ Service Worker  v2
// HTML=ネットワーク優先 / 静的アセット=キャッシュ優先
const CACHE_NAME = 'doramemo-v2';

// プリキャッシュ対象（tenko.html は gyomu.html へ統合済みのため削除）
const ASSETS = [
  '/doramemo/',
  '/doramemo/index.html',
  '/doramemo/home.html',
  '/doramemo/gyomu.html',
  '/doramemo/memo.html',
  '/doramemo/admin.html',
  '/doramemo/reset.html',
  '/doramemo/manifest.json',
  '/doramemo/icon-192.png',
  '/doramemo/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// インストール：1つ失敗しても全体を止めない（allSettled）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ASSETS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// 有効化：古いキャッシュを削除して即座に制御を引き継ぐ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // GET以外（Supabaseのauth/data POST等）はそのままネットワークへ
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('.html');
  const sameOrigin = url.origin === self.location.origin;
  const isCDN = url.origin === 'https://cdn.jsdelivr.net';

  // HTML（画面遷移）：ネットワーク優先＋取得成功でキャッシュ更新／失敗時はキャッシュ
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('/doramemo/home.html')))
    );
    return;
  }

  // 静的アセット（同一オリジン or CDN）：キャッシュ優先
  if (sameOrigin || isCDN) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // それ以外（SupabaseのGET API等）：キャッシュせずネットワーク既定動作
});

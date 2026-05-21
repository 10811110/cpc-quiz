const CACHE_NAME = 'cpc-quiz-v2';
const STATIC_ASSETS = [
  '/web/',
  '/web/index.html',
  '/web/style.css',
  '/web/config.js',
  '/web/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.warn('Cache install failed:', err);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 只處理同源請求和題庫數據
  if (url.origin !== self.location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // 在背景更新緩存
        fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(() => {});
        return cached;
      }
      
      return fetch(event.request).then(response => {
        if (!response.ok) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // 如果請求失敗且是題庫數據，返回一個友好的錯誤
        if (url.pathname.includes('data/raw/')) {
          return new Response(JSON.stringify({error: 'offline'}), {
            status: 503,
            headers: {'Content-Type': 'application/json'}
          });
        }
        throw new Error('Network error');
      });
    })
  );
});
// ?곕━吏?而ㅻ꽖??PWA ?쒕퉬???뚯빱 (?ㅽ봽?쇱씤 罹먯떆 諛??ㅽ듃?뚰겕 ?곗꽑 ?꾨왂)
const CACHE_NAME = 'family-app-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // ?ㅽ듃?뚰겕 ?곗꽑, ?ㅽ뙣 ??罹먯떆 ?대갚 (HTML/?뺤쟻 ?뚯씪)
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
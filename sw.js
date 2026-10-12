// 우리집 커넥트 PWA 서비스워커
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 기본 네트워크 동작 유지 (PWA 설치 표준 충족 및 네트워크 간섭 방지)
});
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

// 스마트폰 & PC 시스템 알림 클릭 시 앱 창 활성화/열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const isSchedule = event.notification.tag && event.notification.tag.startsWith('sch-d1-');
  const targetUrl = isSchedule ? './?tab=schedule' : './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (isSchedule && 'navigate' in client) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 클라이언트 알림 요청 수신
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
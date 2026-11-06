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
  const isSchedule = event.notification.tag && (event.notification.tag.startsWith('sch-') || event.notification.tag.startsWith('family-'));
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

// 백그라운드 웹 푸시(Web Push) 이벤트 수신 (사이트에 접속하지 않아도 자동 알림 수신)
self.addEventListener('push', (event) => {
  let data = {
    title: '📅 [내일 일정 알림] 우리집 커넥트',
    body: '내일 예정된 가족 일정이 있습니다! 🔔'
  };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://placehold.co/192x192/059669/ffffff.png?text=%F0%9F%8F%A1',
    badge: 'https://placehold.co/96x96/059669/ffffff.png?text=%F0%9F%8F%A1',
    vibrate: [500, 250, 500, 250, 500, 250, 500],
    requireInteraction: true,
    tag: data.tag || 'sch-daily-push',
    data: data.data || { url: './?tab=schedule' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 클라이언트 알림 요청 수신
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
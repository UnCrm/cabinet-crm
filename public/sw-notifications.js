// Service Worker helper for Chrome and Installed PWA (Standalone) Notifications
// Handles notification click, window focusing, deep-linking, and push notifications

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action || 'default';
  const targetUrl = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there is an existing client window open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // Inform the open client about the click and action
          client.postMessage({
            type: 'CRM_NOTIFICATION_CLICK',
            action,
            data
          });
          return client;
        }
      }

      // If no open client exists, launch a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Optional telemetry or cleanup when a user closes a notification
  const data = event.notification.data || {};
  console.log('CRM Notification dismissed:', data.tag || event.notification.tag);
});

// Allow the client to ask the service worker to display high-priority system notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification(title, options);
    }
  }
});

/* global clients */

self.addEventListener('message', function (event) {
  const data = event.data;
  const title = data.title || 'Transactions';
  const options = {
    body: data.body || 'You have transactions to categorize.',
    icon: '/android-chrome-512x512.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  event.waitUntil(clients.openWindow('/accounts/uncategorized'));
});

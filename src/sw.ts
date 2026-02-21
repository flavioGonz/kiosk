import { precacheAndRoute } from 'workbox-precaching';

declare let self: any;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: any) => {
    const data = event.data?.json() ?? { title: 'Notificación del Sistema', body: 'Nuevo mensaje del sistema.' };

    const options = {
        body: data.body,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '2'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event: any) => {
    event.notification.close();
    event.waitUntil(
        // @ts-ignore
        self.clients.openWindow('/')
    );
});

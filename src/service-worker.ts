/// <reference lib="webworker" />

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);

registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html')),
);

registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
        cacheName: 'images-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
            }),
        ],
    }),
);

registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script',
    new StaleWhileRevalidate({ cacheName: 'static-resources-cache' }),
);

registerRoute(
    ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
    new NetworkOnly(),
);

self.addEventListener('sync', (event: any) => {
    if (event.tag === 'flush-messages') {
        event.waitUntil(notifyClientsToFlush());
    }
});

async function notifyClientsToFlush(): Promise<void> {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach((client) => client.postMessage({ type: 'flush-messages' }));
}

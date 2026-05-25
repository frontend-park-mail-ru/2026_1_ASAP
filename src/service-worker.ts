/// <reference lib="webworker" />

import {
    cleanupOutdatedCaches,
    precacheAndRoute,
    createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const legacyRuntimeCaches = ['static-resources-cache', 'app-shell-cache'];

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);


registerRoute(
    new NavigationRoute(
        createHandlerBoundToURL('/index.html'),
        {
            denylist: [/^\/support\.html(?:$|\?)/],
        },
    ),
);

registerRoute(
    ({ request }) => request.destination === 'image',
    new StaleWhileRevalidate({
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
    ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
    new NetworkOnly(),
);

type ActivateEvent = Event & {
    waitUntil: (promise: Promise<unknown>) => void;
};

type BackgroundSyncEvent = Event & {
    tag: string;
    waitUntil: (promise: Promise<void>) => void;
};

self.addEventListener('activate', (event: Event) => {
    const activateEvent = event as ActivateEvent;
    activateEvent.waitUntil(
        Promise.all(legacyRuntimeCaches.map((cacheName) => caches.delete(cacheName))),
    );
});

self.addEventListener('sync', (event: Event) => {
    const syncEvent = event as BackgroundSyncEvent;
    if (syncEvent.tag === 'flush-messages') {
        syncEvent.waitUntil(notifyClientsToFlush());
    }
});

async function notifyClientsToFlush(): Promise<void> {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach((client) => client.postMessage({ type: 'flush-messages' }));
}

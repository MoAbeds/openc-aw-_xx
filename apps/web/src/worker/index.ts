/// <reference lib="webworker" />

import { skipWaiting, clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any[] };

skipWaiting();
clientsClaim();

// Precache and route all assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache static assets (images, fonts)
registerRoute(
    ({ request }: { request: Request }) => request.destination === "image" || request.destination === "font",
    new CacheFirst({
        cacheName: "static-assets",
    })
);

// Cache common agents states or API calls?
// User wants network-first for API
registerRoute(
    ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
    new NetworkFirst({
        cacheName: "api-cache",
    })
);

// Fallback for offline navigation
registerRoute(new NavigationRoute(new NetworkFirst({ cacheName: "nav-cache" })));

// Push Notification Handler
self.addEventListener("push", (event: PushEvent) => {
    if (event.data) {
        const data = JSON.parse(event.data.text());
        const options: NotificationOptions = {
            body: data.body,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            data: {
                agentId: data.agentId,
                action: data.action,
                url: data.agentId ? `/dashboard/agents/${data.agentId}` : "/dashboard"
            }
        };

        event.waitUntil(self.registration.showNotification(data.title, options));
    }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();
    const url = event.notification.data.url;
    event.waitUntil(
        self.clients.matchAll({ type: "window" }).then((clientList: readonly any[]) => {
            for (const client of clientList) {
                if (client.url === url && "focus" in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(url);
        })
    );
});

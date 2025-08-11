importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js");

if (workbox) {
  const cacheVersion = "1.0.0";
  const { precacheAndRoute, matchPrecache } = workbox.precaching;
  const { registerRoute, setCatchHandler } = workbox.routing;
  const { NetworkFirst, StaleWhileRevalidate, CacheFirst } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;

  precacheAndRoute([{ url: "/offline.html", revision: cacheVersion }]);

  registerRoute(
    ({ request }) => ["style", "script", "worker"].includes(request.destination),
    new StaleWhileRevalidate({ cacheName: "asset-cache" })
  );

  registerRoute(
    ({ request }) => request.destination === "image",
    new CacheFirst({
      cacheName: "image-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  registerRoute(
    ({ request }) => request.mode === "navigate",
    new NetworkFirst({
      cacheName: "pages-cache",
      plugins: [
        {
          async warmStrategyCache({ strategy }) {
            const cache = await strategy.getCache();
            return cache.addAll(
              ["/offline.html"].map((url) => new Request(url, { destination: "document" }))
            );
          },
        },
      ],
    })
  );

  setCatchHandler(async ({ event }) => {
    if (event.request.destination === "document") {
      return matchPrecache("/offline.html");
    }
    return Response.error();
  });
}

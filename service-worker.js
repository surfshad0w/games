const CACHE = "ara-games-shell-v2";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js?v=20260815-runtime-2",
  "./src/core/assets.js",
  "./src/core/storage.js",
  "./manifest.webmanifest",
  "./assets/generated/hub-backdrop.jpg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/thumbs/gem-pop.jpg",
  "./assets/thumbs/pet-rescue.jpg",
  "./assets/thumbs/space-miner.jpg",
  "./assets/thumbs/fireline-rescue.jpg",
  "./assets/thumbs/mini-golf.jpg",
  "./assets/thumbs/rainbow-art.jpg",
  "./assets/puppy.svg",
  "./assets/star-treat.svg",
  "./assets/puddle.svg",
  "./assets/tree.svg",
  "./assets/cloud.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match("./index.html"))));
});

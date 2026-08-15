import { stat } from "node:fs/promises";

const required = [
  "index.html",
  "styles.css",
  "app.js",
  "src/core/assets.js",
  "src/core/storage.js",
  "manifest.webmanifest",
  "service-worker.js",
  "assets/generated/hub-backdrop.jpg",
  "assets/thumbs/gem-pop.jpg",
  "assets/thumbs/pet-rescue.jpg",
  "assets/thumbs/space-miner.jpg",
  "assets/thumbs/fireline-rescue.jpg",
  "assets/thumbs/mini-golf.jpg",
  "assets/thumbs/rainbow-art.jpg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
];

let total = 0;
for (const file of required) {
  const bytes = (await stat(file)).size;
  total += bytes;
  console.log(`${file}: ${bytes} bytes`);
}

if (total > 2_000_000) {
  throw new Error(`Initial shell budget exceeded: ${total} bytes`);
}

console.log(`Initial shell budget: ${total} bytes (under 2 MB)`);

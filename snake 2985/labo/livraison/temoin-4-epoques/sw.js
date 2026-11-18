"use strict";

// Bump the version for each release with changed precached content.
const scope = new URL(self.registration.scope);
const prefix = "snake2985:" + scope.pathname + ":";
const version = prefix + "20261117-6";
const audioFiles = [
  "audio/neonvelocity-2.mp3",
  "audio/electro-tension-t106.mp3",
  "audio/electro-titan-t112.mp3",
  "audio/voix-machine-t106.mp3",
  "audio/voix-plus-vite-t108.mp3",
];
const gameFiles = [
  "index.html", "arcade.css", "moteur.js", "rendu.js", "bande-son.js",
  "palmares.js", "console.js", "fantome.js", "attracteur.js", "app.webmanifest",
  "apple-touch-icon.png", "icone.svg", "icone-192.png", "icone-512.png",
  ...audioFiles,
];
const index = new URL("index.html", scope).href;
const urls = new Set(gameFiles.map((name) => new URL(name, scope).href));
const audioUrls = new Set(audioFiles.map((name) => new URL(name, scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(version);
    // addAll validates every full response before committing the batch.
    await cache.addAll(Array.from(urls, (url) => new Request(url, { cache: "reload" })));
    // Each game loads its scripts at startup and the music paths are stable.
    // Existing runs can finish while new navigations pick up this release.
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(prefix) && name !== version)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function partialAudio(request, full) {
  const header = request.headers.get("Range");
  if (!header) return full;
  const validator = request.headers.get("If-Range");
  if (validator && validator !== full.headers.get("ETag") && validator !== full.headers.get("Last-Modified")) return full;
  // Unsupported units and multipart requests may receive the entire resource.
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return full;
  const blob = await full.blob();
  const size = blob.size;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": full.headers.get("Content-Type") || "audio/mpeg",
    "Content-Range": "bytes */" + size,
  });
  if (start >= size || start > end) return new Response(null, { status: 416, headers });
  headers.set("Content-Range", "bytes " + start + "-" + end + "/" + size);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(blob.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  url.search = "";
  const key = url.href === scope.href ? index : url.href;
  if (!urls.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(version);
    const stored = await cache.match(key);
    if (!stored) return fetch(event.request);
    return audioUrls.has(key) ? partialAudio(event.request, stored) : stored;
  })());
});

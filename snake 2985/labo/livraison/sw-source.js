"use strict";

// L’assembleur signe le code du worker et le contenu de tous les actifs.
const scope = new URL(self.registration.scope);
const prefix = "snake2985:" + scope.pathname + ":";
const version = prefix + "__EDITION__";
const gameFiles = __GAME_FILES__;
const index = new URL("index.html", scope).href;
const urls = new Set(gameFiles.map((name) => new URL(name, scope).href));
const coreUrls = new Set(["index.html","arcade.js","arcade.css","app.webmanifest"].map(name => new URL(name, scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(version);
    // addAll validates every full response before committing the batch.

    const prior = (await caches.keys()).some(name => name.startsWith(prefix) && name !== version);
    const request = url => new Request(url, {cache:"reload"});
    try {
      await cache.addAll(Array.from(prior ? urls : coreUrls, request));
    } catch (error) {
      await caches.delete(version);
      throw error;
    }
    if (!prior) {
      for (const url of urls) if (!coreUrls.has(url)) {
        try { await cache.addAll([request(url)]); } catch { /* Retenter à la prochaine demande. */ }
      }
    }
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

async function partialResource(request, full) {
  const header = request.headers.get("Range");
  if (!header) return full;
  const validator = request.headers.get("If-Range");

  const tag = full.headers.get("ETag");
  const validTag = tag && !tag.startsWith("W/") && validator === tag;
  if (validator && !validTag && validator !== full.headers.get("Last-Modified")) return full;
  // Unsupported units and multipart requests may receive the entire resource.
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return full;
  const blob = await full.blob();
  const size = blob.size;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": full.headers.get("Content-Type") || "application/octet-stream",
    "Content-Range": "bytes */" + size,
  });

  for (const name of ["ETag","Last-Modified","Cache-Control","Content-Disposition","Content-Location","Vary"]) {
    if (full.headers.has(name)) headers.set(name, full.headers.get(name));
  }
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

    let full = stored;
    if (!full) {
      try {
        // Un téléchargement complet répare aussi le cache lors d'une demande Range.
        full = await fetch(new Request(key, {cache:"reload"}));
        if (full.status !== 200) throw new Error("Ressource indisponible");
        try { await cache.put(key, full.clone()); } catch { /* Continuer en réseau si le stockage est plein. */ }
      } catch {
        if (new URL(key).pathname.endsWith(".webp")) {
          const svg='<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240"><rect width="480" height="240" fill="#111529"/><path fill="#292540" d="M0 186l97-79 58 44 69-98 75 80 53-28 128 79v56H0z"/><path fill="none" stroke="#77b9bf" d="M0 186h480M0 205h480M80 240l120-54m200 54l-120-54"/></svg>';
          return new Response(svg, {headers:{"Content-Type":"image/svg+xml","Cache-Control":"no-store"}});
        }
        return new Response("Ressource indisponible hors ligne", {status:503, headers:{"Cache-Control":"no-store"}});
      }
    }
    return event.request.headers.has("Range") ? partialResource(event.request, full) : full;
  })());
});

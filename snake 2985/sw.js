"use strict";

// L’assembleur signe le code du worker et le contenu de tous les actifs.
const scope = new URL(self.registration.scope);
const prefix = "snake2985:" + scope.pathname + ":";
const version = prefix + "17e8f3871350afe6";
const gameHashes = {
  "decors/chantier-orbital.webp": "4f2bc5854c5a2506761b92ef1a72b83e871c1f5e6c929fac0ff858b50ab91967",
  "decors/circuit-antenne.webp": "8500e5bafec5a74f89c7d989f6da980efd4249fc8f72aa0450563b3faf2fb7b1",
  "decors/etoile-effondree.webp": "d4468ef26b80a28e474e792b6d03f9a00d056a8263c4e250da88933dda64febc",
  "decors/quai-verriere.webp": "cd0e6b37c5ab53818aafeab0b695df1de53d75f7ce8be2503edd04645f3ff81a",
  "paysage-1976.webp": "3f0c020fa0e3052f6e2cc085d71e5712244aa59e3d9fbadf968e051db4d256b7",
  "paysage-1985.webp": "164787d50f2823d465463c112218e7dcbb2983ba5d584e038ed5d5b7cb1f6eb8",
  "paysage-1995.webp": "ef1d914c81421ef61702446786121c1364ad049594d904e69ecf83c4e1f64142",
  "paysage-2185.webp": "2a919dce17f585c3ac1fec49daa130f82c3ee9d45b8030512b2928e84ff2e796",
  "paysage-2985.webp": "f04b6a8af4f20d0eead3b526f1407265b5ce51c79030291e59cb127d0d804322",
  "apercu-1976.webp": "d4a54db6cc7bbfb02f742ff8078a4d73d69082fa5a311523ab05d2f517db1182",
  "apercu-1985.webp": "4deeaa04e58f352cce8d4f6e43c30ec63b5e3b333cf34e9206d9c02c00b8cc34",
  "apercu-1995.webp": "c4958f0bf8ce966827171c76e536a4ff29975c00ba84a06715095c96b39bf788",
  "apercu-2185.webp": "67adb00dda7f2e107b4f5b6b699957a85e66f998321b897a0a3940efbfbddcbc",
  "apercu-2985.webp": "fda1433ae1b686b35eb065eb1732c6941d512d88bc4ee26735ce530e42d91c10",
  "index.html": "2fe3f397aca4d51d11a63f676976b60fac0fd8295fec215e4a1329c7581c80cc",
  "arcade.js": "6cbfc56bf2136b5664e83ee2861ceb63167b1a33bc26de32e9ceae415d6072d2",
  "arcade.css": "648045abaef69ccae069db928e9ecce493586b9ff77491671fb7f3c264441f27",
  "jaquette.webp": "c8ad5c06de5ed52e165d839a11b49eb01dcd653826467de463d8051f5f41dd58",
  "app.webmanifest": "55d36d85664b0982fc6b61c1b364f9daf7f3afbd151ced4fa5239871f89d9746",
  "apple-touch-icon.png": "5fc9110f711a94571684df58785e387f2d2433f5dcb148e579318181beb82b62",
  "icone-192.png": "b68037722b973c5ad2e12dae266d2f6f9dfacf5cd055608891b6b1a0554fd730",
  "icone-512.png": "1cbb26aca3e2371dca9df941f985cfeabcdd2c86e6ed02b16f4aff5899242290",
  "audio/electro-tension-t106.mp3": "2afdb292071ef0bf632d9fb43818936730449bd84f903bcbbd6e06378bd1f122",
  "audio/electro-titan-t112.mp3": "47afaca3079552b91f5b6436aa000e8247aae82d5883a6a3bc123e8bf547b3a9",
  "audio/neonvelocity-2.mp3": "66c4943111a16a0bcf9924a5cf0acafb7ffecbb1517409abc352cff52fb003b6",
  "audio/voix-machine-t106.mp3": "b4003c74dbdde451d68fff16b1927cff2ce69b1817d68550b898a953cd9aeb9b",
  "audio/voix-plus-vite-t108.mp3": "45d59303f7cecba5205cf7c1514861e0d61976764d145cc46038d4ef84fa7d49"
};
const index = new URL("index.html", scope).href;
const checksums = new Map(Object.entries(gameHashes).map(([name, hash]) => [new URL(name, scope).href, hash]));
const coreUrls = new Set(["index.html","arcade.js","arcade.css","app.webmanifest"].map(name => new URL(name, scope).href));

async function valid(response, url) {
  if (!response || response.status !== 200 || response.headers.has("Content-Range")) return false;
  const digest = await crypto.subtle.digest("SHA-256", await response.clone().arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return checksums.get(url) === hex;
}

async function download(url) {
  const response = await fetch(new Request(url, { cache: "reload", redirect: "error" }));
  if (!await valid(response, url)) throw Error("Ressource absente ou contenu différent : " + url);
  return response;
}

async function copyOrFetch(cache, url, oldCaches) {
  for (const oldCache of oldCaches) {
    let candidate;
    try {
      candidate = await oldCache.match(url);
      if (!await valid(candidate, url)) continue;
    } catch {
      continue;
    }
    await cache.put(url, candidate);
    return;
  }
  await cache.put(url, await download(url));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const previous = (await caches.keys()).filter(name => name.startsWith(prefix) && name !== version);
    const oldCaches = await Promise.all(previous.map(name => caches.open(name)));
    const cache = await caches.open(version);
    try {
      for (const url of coreUrls) await copyOrFetch(cache, url, oldCaches);
      for (const url of checksums.keys()) {
        if (coreUrls.has(url)) continue;
        try { await copyOrFetch(cache, url, oldCaches); }
        catch (error) { if (previous.length) throw error; }
      }
    } catch (error) {
      await caches.delete(version);
      throw error;
    }
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
  if (!checksums.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(version);
    const stored = await cache.match(key);

    let full = stored;
    if (!full) {
      try {
        // Un téléchargement complet répare aussi le cache lors d'une demande Range.
        full = await download(key);
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

/* Illustrations générées (GPT Image 2.5 Sunburst), converties en pixel art hors ligne : réduites à la
   résolution du jeu puis forcées dans la palette fermée de seize couleurs avec le même tramage de Bayer
   4x4 que le jeu emploie. Les PNG sources vivent dans proto-neon/art/ ; build.mjs les injecte ici sous
   forme d'URI de données dans ART_SRC, pour que le bundle reste un seul fichier.

   Format rendu, identique à N.spr.make : {w, h, data: Uint8Array} d'index de palette, 0 = transparent.
   Comme l'index 0 (« vide ») est aussi une vraie couleur, très présente dans les fonds, il est remplacé
   ici par l'index 15 (« nuit profonde »), visuellement presque identique. Rien n'est perdu et la règle
   « 0 = transparent » tient partout.

   Le décodage est asynchrone (le navigateur décode le PNG) mais prend quelques millisecondes : get()
   rend null tant qu'une image n'est pas prête, et l'appelant dessine son repli procédural en attendant. */

N.art = (function () {
  var cache = {}, ready = false, pending = null;
  var SRC = (typeof ART_SRC !== 'undefined') ? ART_SRC : {};

  function table() {
    var C = (N.pal && N.pal.C) || ['#0d0221', '#190b28', '#241734', '#541388', '#2d1b69', '#ff2a6d', '#ff8fab', '#05d9e8',
      '#d1f7ff', '#ff9e00', '#ffd319', '#ff5714', '#fffce8', '#8a8fa3', '#8b0f3a', '#01012b'];
    return C.map(function (h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; });
  }

  /* index de palette le plus proche ; robuste à une éventuelle gestion de couleur du navigateur */
  function nearest(T, r, g, b) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < T.length; i++) {
      var dr = r - T[i][0], dg = g - T[i][1], db = b - T[i][2], d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; best = i; if (d === 0) break; }
    }
    return best;
  }

  function decode(name, uri) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var x = c.getContext('2d', { willReadFrequently: true });
          x.imageSmoothingEnabled = false;
          x.drawImage(img, 0, 0);
          var px = x.getImageData(0, 0, w, h).data, T = table();
          var data = new Uint8Array(w * h), memo = {};
          for (var i = 0, j = 0; i < data.length; i++, j += 4) {
            if (px[j + 3] < 128) { data[i] = 0; continue; }
            var k = (px[j] << 16) | (px[j + 1] << 8) | px[j + 2];
            var ci = memo[k];
            if (ci === undefined) ci = memo[k] = nearest(T, px[j], px[j + 1], px[j + 2]);
            data[i] = ci === 0 ? 15 : ci;                 // 0 réservé à la transparence
          }
          cache[name] = { w: w, h: h, data: data };
        } catch (e) { cache[name] = null; }
        resolve();
      };
      img.onerror = function () { cache[name] = null; resolve(); };
      img.src = uri;
    });
  }

  return {
    /* noms disponibles : affiche, horizon, briefing, logo */
    names: function () { return Object.keys(SRC); },
    /* lance le décodage de toutes les illustrations ; rend une promesse */
    load: function () {
      if (pending) return pending;
      var jobs = Object.keys(SRC).map(function (n) { return decode(n, SRC[n]); });
      pending = Promise.all(jobs).then(function () { ready = true; });
      return pending;
    },
    ready: function () { return ready; },
    /* {w, h, data} ou null tant que ce n'est pas décodé */
    get: function (name) { return cache[name] || null; },
  };
})();

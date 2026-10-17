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

/* Neuf panneaux existent aussi en vidéo (cine/<nom>.mp4, 384 x 216, douze images par seconde, sans son).
   Chaque image de la vidéo est tramée par Bayer 4x4 et forcée dans la palette des seize À LA VOLÉE, avec
   la même distance de couleur que le convertisseur hors ligne des panneaux fixes : la palette reste
   fermée pendant les cinématiques. Pendant la lecture, get(nom) rend l'image courante du clip au même
   format que le panneau ; sans vidéo (fichier absent, lecture refusée, mode économie d'énergie de
   l'iPhone, page ouverte en file://), il rend le panneau fixe et ended(nom) rend true. Rien ne casse. */

N.art = (function () {
  var cache = {}, ready = false, pending = null;
  /* [boucle, cyan permis] : le cyan n'apparaît que là où le serpent, c'est-à-dire la joueuse, est à l'image */
  var CLIPS = { affiche: [1, 1], briefing: [1, 0], victoire: [1, 1], defaite: [1, 1],
    exterieur: [0, 0], connexion: [0, 1], eveil: [0, 1], alerte: [0, 0], boss: [0, 0],
    /* les intermèdes (refonte/INTERMEDES.md) : de courts films entre les moments de jeu */
    chasse: [0, 1], retournement: [0, 1], rival: [0, 1], plongee: [0, 1], reveil: [0, 0], apotheose: [0, 1],
    /* les deux pilotes (refonte/VISION-PROGRESSION.md § 6) : chaque film existe en deux versions, « -elle » et « -lui » */
    'pilote-elle': [1, 1], 'pilote-lui': [1, 1], 'connexion-elle': [0, 1], 'connexion-lui': [0, 1],
    'fissure-elle': [0, 1], 'fissure-lui': [0, 1], 'profondeur-elle': [0, 1], 'profondeur-lui': [0, 1],
    'warp-elle': [0, 1], 'warp-lui': [0, 1], 'espace-elle': [0, 1], 'espace-lui': [0, 1],
    'fin-elle': [0, 1], 'fin-lui': [0, 1], retrouvailles: [0, 1], 'teaser-3019': [0, 1],
    'chasse-elle': [0, 1], 'chasse-lui': [0, 1], 'retournement-elle': [0, 1], 'retournement-lui': [0, 1],
    'rival-elle': [0, 1], 'rival-lui': [0, 1], 'plongee-elle': [0, 1], 'plongee-lui': [0, 1],
    'reveil-elle': [0, 1], 'reveil-lui': [0, 1], 'apotheose-elle': [0, 1], 'apotheose-lui': [0, 1] };
  var OUVERTURE = ['exterieur', 'connexion', 'eveil'];        // préchargés : ils jouent dans les premières secondes
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var vids = {}, cur = {}, LUT = {}, blessed = {}, Q = null;
  /* build.mjs injecte la liste des clips présents dans cine/ : un clip absent n'est jamais demandé,
     ce qui évite des erreurs 404 dans la console tant que les vidéos ne sont pas installées */
  var DISPO = (typeof CINE_DISPO !== 'undefined') ? CINE_DISPO : [];
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

  /* table 32 x 32 x 32 -> index de palette, distance pondérée « redmean » du convertisseur hors ligne */
  function lut(cy) {
    if (LUT[cy]) return LUT[cy];
    var T = table(), cand = [], t = new Uint8Array(32768);
    for (var i = 0; i < 16; i++) if (cy || (i !== 7 && i !== 8)) cand.push(i);
    for (var r = 0; r < 32; r++) for (var g = 0; g < 32; g++) for (var b = 0; b < 32; b++) {
      var R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4, best = cand[0], bd = 1e18;
      for (var k = 0; k < cand.length; k++) {
        var P = T[cand[k]], rm = (R + P[0]) / 2, dr = R - P[0], dg = G - P[1], db = B - P[2];
        var d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
        if (d < bd) { bd = d; best = cand[k]; }
      }
      t[(r << 10) | (g << 5) | b] = best === 0 ? 15 : best;     // 0 réservé à la transparence
    }
    return (LUT[cy] = t);
  }

  /* 16 x 256 : canal 8 bits + décalage de Bayer du pixel -> canal 5 bits, bornes comprises */
  function qtab() {
    if (Q) return Q;
    Q = new Uint8Array(16 * 256);
    for (var k = 0; k < 16; k++) {
      var o = ((k + 0.5) / 16 - 0.5) * 40;
      for (var v = 0; v < 256; v++) { var x = v + o; Q[(k << 8) | v] = (x < 0 ? 0 : x > 255 ? 255 : x) >> 3; }
    }
    return Q;
  }

  function vid(name) {
    if (vids[name] !== undefined) return vids[name];
    if (DISPO.indexOf(name) < 0) return (vids[name] = null);
    var v = null;
    try {
      v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      v.preload = 'auto'; v.loop = !!CLIPS[name][0];
      v.addEventListener('error', function () { vids[name] = null; if (cur[name]) cur[name].failed = true; });
      v.addEventListener('ended', function () { if (cur[name]) cur[name].ended = true; });
      /* WebKit ne lance pas seule une vidéo invisible : elle vit dans la page, derrière le canvas opaque */
      v.style.cssText = 'position:fixed;left:0;top:0;width:16px;height:9px;z-index:-1;pointer-events:none';
      if (document.body) document.body.appendChild(v);
      v.src = 'cine/' + name + '.mp4';
    } catch (e) { v = null; }
    return (vids[name] = v);
  }

  /* convertit l'image courante de la vidéo si elle a avancé ; garde la précédente sinon */
  function frameOf(name, c) {
    var v = c.v;
    if (!v || v.readyState < 2) return c.frame;
    var k = Math.floor(v.currentTime * 12 + 1e-3);       // les clips sont à douze images par seconde
    if (k === c.last && c.frame) return c.frame;
    c.last = k;
    var w = 384, h = 216;
    if (!c.ctx) {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      c.ctx = cv.getContext('2d', { willReadFrequently: true });
      c.frame = null; c.buf = { w: w, h: h, data: new Uint8Array(w * h) };
    }
    try {
      c.ctx.drawImage(v, 0, 0, w, h);
      var px = c.ctx.getImageData(0, 0, w, h).data, out = c.buf.data, L = c.lut, q = Q;
      for (var y = 0, i = 0, j = 0; y < h; y++) {
        var row = (y & 3) << 2;
        for (var x = 0; x < w; x++, i++, j += 4) {
          var ob = BAYER[row | (x & 3)] << 8;
          out[i] = L[(q[ob | px[j]] << 10) | (q[ob | px[j + 1]] << 5) | q[ob | px[j + 2]]];
        }
      }
      c.frame = c.buf;
    } catch (e) { c.failed = true; return null; }     // canvas souillé (file://) ou vidéo illisible
    return c.frame;
  }

  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', function () {
    for (var n in cur) { var v = cur[n].v; if (!v) continue; try { if (document.hidden) v.pause(); else if (!cur[n].ended) v.play().catch(function () {}); } catch (e) {} }
  });

  /* le nom du film propre au personnage choisi (N.choix.personnage() : 'elle' | 'lui') : « fin » donne « fin-elle »
     ou « fin-lui » s'il existe en illustration ou en clip, sinon le nom tel quel */
  function pour(base) {
    var qui = null;
    try { qui = N.choix && N.choix.personnage ? N.choix.personnage() : null; } catch (e) { qui = null; }
    if (!qui) return base;
    var n = base + '-' + qui;
    return (SRC[n] || DISPO.indexOf(n) >= 0) ? n : base;
  }

  return {
    pour: pour,
    /* noms disponibles : affiche, horizon, briefing, logo, et les sept panneaux de cinématique */
    names: function () { return Object.keys(SRC); },
    /* lance le décodage de toutes les illustrations ; rend une promesse */
    load: function () {
      if (pending) return pending;
      var jobs = Object.keys(SRC).map(function (n) { return decode(n, SRC[n]); });
      pending = Promise.all(jobs).then(function () { ready = true; setTimeout(function () { lut(0); lut(1); qtab(); }, 0); });
      OUVERTURE.forEach(vid);
      return pending;
    },
    ready: function () { return ready; },
    /* {w, h, data} ou null tant que ce n'est pas décodé ; pendant la lecture d'un clip, son image courante */
    get: function (name) {
      var c = cur[name];
      if (c && !c.failed) { var f = frameOf(name, c); if (f) return f; }
      return cache[name] || null;
    },
    /* lance le clip depuis le début ; true si la lecture est tentée, false s'il n'y a pas de vidéo */
    play: function (name) {
      if (!CLIPS[name]) return false;
      var v = vid(name); if (!v) return false;
      var c = cur[name] = { v: v, last: -1, frame: null, failed: false, ended: false, lut: lut(CLIPS[name][1]) };
      qtab();
      try { v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () { c.failed = true; }); }
      catch (e) { c.failed = true; return false; }
      return true;
    },
    stop: function (name) { var c = cur[name]; if (c && c.v) { try { c.v.pause(); } catch (e) {} } delete cur[name]; },
    /* true quand un clip joué une fois est fini, ou n'a pas pu jouer */
    ended: function (name) { var c = cur[name]; return !c || c.failed || c.ended || !c.v; },
    /* prépare un clip à l'avance (chargement), pour qu'il démarre sans attente le moment venu */
    prepare: function (name) { if (CLIPS[name]) vid(name); },
    /* appelé par 90-boot.js à chaque geste : sur iPhone, une vidéo lancée une fois pendant un geste
       peut ensuite se relancer seule, même en mode économie d'énergie */
    unlock: function () {
      Object.keys(vids).forEach(function (n) {
        var v = vids[n]; if (!v || blessed[n]) return; blessed[n] = true;
        if (cur[n]) return;
        try {
          var p = v.play();
          if (p && p.then) p.then(function () { if (!cur[n]) { v.pause(); try { v.currentTime = 0; } catch (e) {} } }).catch(function () {});
        } catch (e) {}
      });
    },
  };
})();

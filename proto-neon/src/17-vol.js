/* ===== 17-vol.js — N.vol : LE VOL, la plongée entre deux vagues (REFONTE.md § 3.9) =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaire : lot 2. Interface complète, repli jouable :
     start(depuis, vers)  lance un VOL de N.R.vol.duree secondes vers le quartier `vers` ; émet vol/debut ;
     update(dt)           la tête suit le manche dans le cadre (N.R.vol.cadre), les objets (portes, cellules,
                          mines) arrivent du fond en z décroissant ; une porte traversée émet vol/porte, une
                          mine touchée vol/mine ; à la fin, vol/fin avec le bilan ;
     draw()               en espace ÉCRAN, remplace le décor et le monde : horizon, sol qui file, objets en
                          anneaux de rayon entier ⌊r0 × Z0 / z⌋, tête en cyan ;
     actif(), resultat() -> {portes, mines, parfait}.
   Miroir S.vol (px ÉCRAN, null hors du VOL). Les tirages passent par le flux 'vol'. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  function RV() { return (N.R && N.R.vol) || { duree: 4, Z0: 64, vitesse: 140, horizon: 0.38, cadre: { x: [0.15, 0.85], y: [0.55, 0.9] },
    portes: { nombre: 6, rayonMax: 24 }, cellules: { nombre: 24 }, mines: { nombre: 4 } }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function I(n) { return N.pal.i(n); }

  var V = { on: false, t: 0, depuis: null, vers: null, portes: 0, mines: 0, cellules: 0, nbPortes: 0, finEmise: false };
  var OBJ = [];                                            // {type, u, v, z, r0, pris, _passe}
  var TETE = { x: 0, y: 0 };
  var RES = { portes: 0, mines: 0, parfait: false };

  function rng() { return N.rng ? N.rng('vol') : null; }
  function emettre(evt) {
    if (!N.ev) return;
    N.ev.emit('vol', { evt: evt, parfait: V.portes === V.nbPortes && V.mines === 0, vers: V.vers || 'artere', portes: V.portes, mines: V.mines });
  }
  /* projection : (u, v) est la place de l'objet dans le cadre à z = Z0 (k = 1) ; plus loin, il glisse vers
     le point de fuite au centre de l'horizon, et son rayon vaut ⌊r0 × Z0 / z⌋ (entier, REFONTE.md § 3.9) */
  var PJ = { x: 0, y: 0, r: 0 };
  function proj(b) {
    var g = N.gfx, W = (g && g.W) || 360, H = (g && g.H) || 180, R = RV(), hy = H * R.horizon, z0 = R.Z0 || 64;
    var k = z0 / Math.max(1, b.z), x1 = W * (0.5 + b.u * 0.5), y1 = H * (R.cadre.y[0] + (R.cadre.y[1] - R.cadre.y[0]) * b.v);
    PJ.x = W / 2 + (x1 - W / 2) * Math.min(1, k); PJ.y = hy + (y1 - hy) * Math.min(1, k); PJ.r = Math.max(1, Math.floor(b.r0 * k));
    return PJ;
  }
  function miroir() {
    var s = N.S; if (!s) return;
    if (!V.on) { s.vol = null; return; }
    var o = s.vol;
    if (!o || typeof o !== 'object') o = s.vol = { tete: { x: 0, y: 0 }, objets: [], reste: 0 };
    o.tete.x = TETE.x; o.tete.y = TETE.y; o.reste = Math.max(0, RV().duree - V.t);
    var L = o.objets, n = 0, v = RV().vitesse || 140, z0 = RV().Z0 || 64;
    for (var i = 0; i < OBJ.length; i++) {
      var b = OBJ[i]; if (b.pris || b.z < z0 * 0.5) continue;
      var p = proj(b), it = L[n] || (L[n] = { type: 'cellule', x: 0, y: 0, z: 0, r: 0, avant: 0 });
      it.type = b.type; it.z = b.z; it.r = p.r; it.x = p.x; it.y = p.y; it.avant = (b.z - z0) / v;
      n++;
    }
    L.length = n;
  }

  var vol = {
    start: function (depuis, vers) {
      var R = RV(), r = rng();
      V.on = true; V.t = 0; V.depuis = depuis || null; V.vers = vers || 'artere'; V.portes = 0; V.mines = 0; V.cellules = 0; V.finEmise = false;
      OBJ.length = 0;
      var np = (R.portes && R.portes.nombre) || 6, nc = (R.cellules && R.cellules.nombre) || 24, nm = (R.mines && R.mines.nombre) || 4;
      var span = (R.vitesse || 140) * (R.duree || 4) * 0.9, i;
      function obj(type, z, r0) { OBJ.push({ type: type, u: r ? r.r(-0.7, 0.7) : 0, v: r ? r.r(0, 1) : 0.5, z: z, r0: r0, pris: false, _passe: false }); }
      for (i = 0; i < np; i++) obj('porte', 80 + span * (i + 0.5) / np, Math.min(24, (R.portes && R.portes.rayonMax) || 24) * 0.5);
      for (i = 0; i < nc; i++) obj('cellule', 60 + span * (i + 0.3) / nc, 3);
      for (i = 0; i < nm; i++) obj('mine', 120 + span * (i + 0.7) / nm, 4);
      V.nbPortes = np;
      var g = N.gfx; TETE.x = ((g && g.W) || 360) / 2; TETE.y = ((g && g.H) || 180) * 0.72;
      emettre('debut');
      miroir();
    },
    update: function (dt) {
      if (!V.on) return;
      if (!(dt > 0)) { miroir(); return; }
      var R = RV(), g = N.gfx, W = (g && g.W) || 360, H = (g && g.H) || 180, inp = N.S && N.S.input;
      V.t += dt;
      /* la tête suit le manche, dans le cadre */
      if (inp && inp.mag > 0) { TETE.x += inp.x * inp.mag * 120 * dt; TETE.y += inp.y * inp.mag * 90 * dt; }
      TETE.x = clamp(TETE.x, W * R.cadre.x[0], W * R.cadre.x[1]); TETE.y = clamp(TETE.y, H * R.cadre.y[0], H * R.cadre.y[1]);
      var v = R.vitesse || 140, z0 = R.Z0 || 64;
      for (var i = 0; i < OBJ.length; i++) {
        var b = OBJ[i]; if (b.pris) continue;
        var oz = b.z; b.z -= v * dt;
        if (oz > z0 && b.z <= z0 && !b._passe) {
          b._passe = true;
          var p = proj(b), rr = p.r + 6;
          if (Math.abs(p.x - TETE.x) < rr && Math.abs(p.y - TETE.y) < rr) {
            b.pris = true;
            if (b.type === 'porte') { V.portes++; emettre('porte'); }
            else if (b.type === 'mine') { V.mines++; emettre('mine'); }
            else V.cellules++;
          }
        }
      }
      if (V.t >= (R.duree || 4)) {
        V.on = false; RES.portes = V.portes; RES.mines = V.mines; RES.parfait = V.portes === V.nbPortes && V.mines === 0;
        if (!V.finEmise) { V.finEmise = true; emettre('fin'); }
      }
      miroir();
    },
    draw: function () {
      var g = N.gfx; if (!g || !g.buf || !N.pal) return;
      var W = g.W, H = g.H, R = RV(), hy = Math.round(H * R.horizon), ph = V.t * 3;
      if (g.owner) g.owner(8);
      g.rect(0, 0, W, hy, I('nuit')); g.ditherRect(0, 0, W, hy, I('violet'), 0.35);
      g.circ(Math.round(W / 2), hy - 6, Math.round(H * 0.18), I('brasier'));
      g.circ(Math.round(W / 2), hy - 10, Math.round(H * 0.13), I('ambre'));
      g.circ(Math.round(W / 2), hy - 14, Math.round(H * 0.08), I('jaune'));
      g.rect(0, hy, W, H - hy, I('vide')); g.rect(0, hy, W, 1, I('brasier'));
      for (var k = 0; k < 8; k++) { var z = (k + 1 - (ph % 1)) / 8, ry = hy + Math.round((H - hy) * z * z); if (ry > hy && ry < H) g.rect(0, ry, W, 1, I('violet')); }
      for (k = -8; k <= 8; k++) g.line(W / 2 + k * 4, hy + 1, W / 2 + k * W / 5, H, I('indigo'));
      var L = N.S && N.S.vol ? N.S.vol.objets : [];
      if (g.owner) g.owner(5);
      for (var i = L.length - 1; i >= 0; i--) {
        var o = L[i], r = Math.max(1, o.r | 0), c = o.type === 'porte' ? I('jaune') : o.type === 'mine' ? I('magenta') : I('ambre');
        if (o.type === 'porte') { g.ring(o.x, o.y, r + 1, I('nuitProfonde')); g.ring(o.x, o.y, r, c); }
        else { g.circ(o.x, o.y, r + 1, I('nuitProfonde')); g.circ(o.x, o.y, r, c); }
      }
      if (g.owner) g.owner(1);
      var s = (N.spr && N.spr.get) ? N.spr.get('tete:dos', 0, 0) : null;
      if (s && s.data && s.w > 0) g.blit(s, Math.round(TETE.x) - (s.w >> 1), Math.round(TETE.y) - (s.h >> 1));
      else { g.circ(TETE.x, TETE.y, 5, I('cyan')); g.circ(TETE.x, TETE.y - 1, 2, I('cyanPale')); }
      if (g.owner) g.owner(0);
    },
    actif: function () { return V.on; },
    resultat: function () { return RES; }
  };
  N.vol = vol;
})();

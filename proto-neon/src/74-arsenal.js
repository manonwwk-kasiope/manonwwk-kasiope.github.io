/* ===== 74-arsenal.js — N.arsenal : les armes de la joueuse (repli : le CANON, quatre paliers) =====

   Tiré de 70-game.js (lot 0b) : updFire, shot, la collision tir contre ennemi, drawShots. Le tir part seul vers
   l'avant (J-10). Les chiffres du CANON viennent de N.R.armes.canon.paliers ; la démo choisissait son
   motif d'après la longueur du serpent, le repli garde cette règle (palier = longueur < 10, < 20, < 32, plus)
   tant que N.cartes ne donne pas les paliers : niveau('canon') = palier de longueur + montées − pertes.

   N'applique JAMAIS les effets d'un kill : il DEMANDE à N.ennemis (hit(e, dmg, src)) et s'arrête là (§ 7.4).
   CONSOMME `mort` (rang 50) : la joueuse qui meurt perd un palier de son arme au plus haut palier
   (descendre()), `carte` (rang 50) : monter(arme). Interface : reset(), update(dt), draw(), monter(arme),
   descendre() -> {arme, de, a}, niveau(arme), armes(), tirs. Ajout : surcharger(b) (récompense du défi). */
N.arsenal = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                    // → N.R
    plafondTirs: 160, paliersLongueur: [10, 20, 32], surchargeCadence: 1.35, surchargeDegats: 2, cadenceTenue: 1.4, vie: 1.4
  };
  var S = null;
  var tirs = [];
  var st = { cd: 0.5, volley: 0, monte: 0, perte: 0, surcharge: false, cad: 1, chute: null };
  var SRC = { genre: 'arme', type: 'canon', id: -1 };

  function reset() { S = N.S; tirs.length = 0; st.cd = 0.5; st.volley = 0; st.monte = 0; st.perte = 0; st.surcharge = false; st.cad = 1; st.chute = null; }

  function palierLongueur() {
    var n = N.joueuse ? N.joueuse.len() : 8, p = CFG.paliersLongueur;
    return n < p[0] ? 1 : n < p[1] ? 2 : n < p[2] ? 3 : 4;
  }
  function niveau(arme) {
    if (arme && arme !== 'canon') return 0;
    return O.clamp(palierLongueur() + st.monte - st.perte, 1, 4);
  }
  function monter(arme) { if (!arme || arme === 'canon') { st.monte++; return niveau('canon'); } return 0; }
  function descendre() {
    var de = niveau('canon');
    if (de <= 1) return { arme: 'canon', de: de, a: de };
    st.perte++;
    return { arme: 'canon', de: de, a: niveau('canon') };
  }
  function armes() { return [{ id: 'canon', niveau: niveau('canon') }]; }
  function surcharger(b) { st.surcharge = !!b; }

  function palier() {
    var p = (R && R.armes && R.armes.canon && R.armes.canon.paliers) || [];
    return p[niveau('canon') - 1] || { tirs: 1, cadence: 6.5, degats: 10, portee: 130, vitesse: 210 };
  }

  function tirer(x, y, a, pal, dmg, perce) {
    if (tirs.length >= CFG.plafondTirs) return;
    var v = pal.vitesse || 210;
    tirs.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: a, dmg: dmg, life: (pal.portee || 130) / v, _perce: perce | 0, _gros: dmg >= 20 });
  }

  function update(dt) {
    if (!S) S = N.S;
    var J = N.joueuse, P = J && J.tete, vivant = J && (J.etat === 'vivant' || J.etat === 'reapparition');
    var i, j, b;
    /* le tir part seul vers l'avant ; au clavier, Espace le nourrit */
    if (vivant && P) {
      st.cd -= dt;
      if (st.cd <= 0) {
        var pal = palier(), mods = (N.cartes && N.cartes.mods) || null;
        var rate = (pal.cadence || 6.5) * (mods ? mods.cadence : st.cad) * (st.surcharge ? CFG.surchargeCadence : 1) * (S && S.input && S.input.fire ? CFG.cadenceTenue : 1);
        st.cd += 1 / rate; if (st.cd < 0) st.cd = 0;
        var dmg = (pal.degats || 10) * (mods ? mods.degats : 1) * (st.surcharge ? CFG.surchargeDegats : 1);
        var a = P.ang, c = Math.cos(a), s = Math.sin(a), hx = P.x + c * 6, hy = P.y + s * 6, n = pal.tirs || 1;
        if (pal.bouches === 2) {                                            // palier II : deux bouches côte à côte
          var e = pal.ecartBouches || 2;
          tirer(hx - s * e, hy + c * e, a, pal, dmg, 0); tirer(hx + s * e, hy - c * e, a, pal, dmg, 0);
        } else if (n <= 1) tirer(hx, hy, a, pal, dmg, 0);
        else {                                                              // palier III et RAYON de repli : éventail
          var ea = pal.ecartAngle || 0.1, perce = pal.perce || 0;
          if (!pal.perce) { tirer(hx, hy, a - ea, pal, dmg, 0); tirer(hx, hy, a + ea, pal, dmg, 0); }
          else { tirer(hx - s * 2.5, hy + c * 2.5, a - ea, pal, dmg, perce); tirer(hx + s * 2.5, hy - c * 2.5, a + ea, pal, dmg, perce); }
          if (niveau('canon') >= 4) tirer(hx, hy, a, pal, dmg, perce);
        }
        st.volley++;
        O.sfx('tir', { pitch: st.volley % 5 });
      }
    }
    /* les tirs avancent et touchent */
    var V = O.VUE, L = N.ennemis ? N.ennemis.list : [];
    for (i = tirs.length - 1; i >= 0; i--) {
      b = tirs[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < V.x - 4 || b.x > V.x + V.w + 4 || b.y < V.y - 4 || b.y > V.y + V.h + 4) { tirs.splice(i, 1); continue; }
      for (j = 0; j < L.length; j++) {
        var en = L[j];
        if (en._dead || en.etat === 'portail' || en._st === 'naissance') continue;
        var rr2 = en.r + 1.5;
        if (O.d2(b.x, b.y, en.x, en.y) < rr2 * rr2) {
          if (N.fx && N.fx.spark) O.safe('fx.spark', function () { N.fx.spark(b.x, b.y, -b.vx, -b.vy, 2, en.boss ? O.OS : O.ROSE); });
          N.ennemis.hit(en, b.dmg, SRC);
          if (b._perce > 0) b._perce--; else { tirs.splice(i, 1); }
          break;
        }
      }
    }
  }

  function draw() {
    var f = Math.floor(O.T.ak * 12), g = N.gfx;
    for (var i = 0; i < tirs.length; i++) {
      var b = tirs[i];
      if (b._gros) { g.line(b.x - b.vx * 0.016, b.y - b.vy * 0.016, b.x, b.y, O.AMBRE); g.rect(b.x - 1, b.y - 1, 2, 2, O.JAUNE); }
      else O.put(O.sp('tir:' + O.dir16(b.a), f), b.x, b.y);
    }
  }

  /* ---- les consommateurs (rang 50) ---- */
  if (N.ev) {
    N.ev.on('mort', 50, function () { st.chute = descendre(); }, '74-arsenal');
    N.ev.on('carte', 50, function (c) {
      if (!c) return;
      if (c.id === 'canon') monter('canon');
      else if (c.id === 'cadence' && !(N.cartes && N.cartes.mods)) st.cad *= 1.15;       // repli : sans N.cartes.mods
    }, '74-arsenal');
  }

  return { chute: function () { return st.chute; }, reset: reset, update: update, draw: draw, monter: monter, descendre: descendre, niveau: niveau, armes: armes, tirs: tirs, surcharger: surcharger };
})();

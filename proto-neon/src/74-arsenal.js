/* ===== 74-arsenal.js — N.arsenal : les six armes de la joueuse, quatre paliers chacune (§ 2.8) =====

   Tiré de 70-game.js (lot 0b) pour le CANON ; lot E : TOURELLES, ARC, MISSILES, DRONES et MINES DE QUEUE, leurs montures sur le
   corps et le palier ultime du CANON (le RAYON continu). Les chiffres viennent de N.R.armes ; ce qui manque est dans CFG (→ N.R).

   Le CANON garde la règle de la démo tant que N.cartes ne donne pas les paliers : niveau('canon') = palier de longueur
   (< 10, < 20, < 32, plus) + montées − pertes. Les cinq autres armes n'existent qu'une fois montées (monter(arme) ; carte).
   N'applique JAMAIS les effets d'un kill : il DEMANDE à N.ennemis (hit, zone) et s'arrête là (§ 7.4).
   CONSOMME `mort` (rang 50) : descendre() retire un palier à la meilleure arme ; `carte` (rang 50) : monter(arme).
   Lisibilité (§ 2.8) : tirs fins, rien à moins de 3 px du contour de la tête, tirs nés à 7 px devant, 160 tirs au plus, 12 mines au plus.
   Interface : reset(), update(dt), draw(), monter(arme), descendre() -> {arme, de, a}, niveau(arme), armes(), tirs,
   ajouts : surcharger(b), chute(), etat() (lecture pour les essais). N.joueuse.degatsMul (REPLI) multiplie les dégâts. */
N.arsenal = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                    // → N.R
    plafondTirs: 160, paliersLongueur: [10, 20, 32], surchargeCadence: 1.35, surchargeDegats: 2, cadenceTenue: 1.4, vie: 1.4,
    flancDecalage: 3, salveMax: 8, arcVie: 0.14, vitesseDrone: 200, orbiteVitesse: 2.2, missileVie: 3.5
  };
  var S = null;
  var tirs = [];
  var st = { cd: 0.5, volley: 0, monte: 0, perte: 0, surcharge: false, cad: 1, chute: null, niv: { tourelles: 0, arc: 0, missiles: 0, drones: 0, minesQ: 0 },
    tcd: [], arcT: 0.5, misT: 1.0, minT: 1.5, dcd: [], dpen: [], rayonT: 0, rayonOn: false, salveSon: 0, ang: 0, nT: 0 };
  var SRC = { genre: 'arme', type: 'canon', id: -1 };
  var arcs = [], missiles = [], mines = [];
  var BX0 = 0, BY0 = 0, BX1 = 0, BY1 = 0;       // le rayon (extrémités), pour le dessin

  function reset() {
    S = N.S; tirs.length = 0; arcs.length = 0; missiles.length = 0; mines.length = 0;
    st.cd = 0.5; st.volley = 0; st.monte = 0; st.perte = 0; st.surcharge = false; st.cad = 1; st.chute = null;
    st.niv.tourelles = 0; st.niv.arc = 0; st.niv.missiles = 0; st.niv.drones = 0; st.niv.minesQ = 0;
    st.tcd.length = 0; st.dcd.length = 0; st.dpen.length = 0; st.arcT = 0.5; st.misT = 1.0; st.minT = 1.5; st.rayonT = 0; st.rayonOn = false; st.salveSon = 0; st.nT = 0;
    DR.length = 0;
  }
  function conf(a) { return (R && R.armes && R.armes[a]) || {}; }
  function pal(a) { var p = conf(a).paliers || []; return p[Math.min(4, Math.max(1, st.niv[a] || 1)) - 1] || {}; }
  function mul() {
    var m = (N.cartes && N.cartes.mods) ? N.cartes.mods.degats : 1;
    return m * ((N.joueuse && N.joueuse.degatsMul) || 1) * (st.surcharge ? CFG.surchargeDegats : 1);
  }
  function cad() { return (N.cartes && N.cartes.mods) ? N.cartes.mods.cadence : st.cad; }

  function palierLongueur() {
    var n = N.joueuse ? N.joueuse.len() : 8, p = CFG.paliersLongueur;
    return n < p[0] ? 1 : n < p[1] ? 2 : n < p[2] ? 3 : 4;
  }
  function niveau(arme) {
    if (!arme || arme === 'canon') return O.clamp(palierLongueur() + st.monte - st.perte, 1, 4);
    return st.niv[arme] | 0;
  }
  function monter(arme) {
    if (!arme || arme === 'canon') { st.monte++; return niveau('canon'); }
    if (st.niv[arme] === undefined) return 0;
    st.niv[arme] = Math.min(4, st.niv[arme] + 1);
    return st.niv[arme];
  }
  /* le prix de la mort : la meilleure arme perd un palier (à égalité, le CANON passe en dernier) */
  function descendre() {
    var best = 'canon', bn = niveau('canon');
    for (var a in st.niv) if (st.niv[a] > bn) { best = a; bn = st.niv[a]; }
    if (best === 'canon') {
      if (bn <= 1) return { arme: 'canon', de: bn, a: bn };
      st.perte++;
      return { arme: 'canon', de: bn, a: niveau('canon') };
    }
    st.niv[best]--;
    return { arme: best, de: bn, a: st.niv[best] };
  }
  function armes() {
    var o = [{ id: 'canon', niveau: niveau('canon') }];
    for (var a in st.niv) if (st.niv[a] > 0) o.push({ id: a, niveau: st.niv[a] });
    return o;
  }
  function surcharger(b) { st.surcharge = !!b; }

  /* ============================ ce que les armes visent ============================ */
  function cible(x, y, r, pris) {                       // l'ennemi le plus proche à moins de r, hors proies (la tête les dévore) et hors `pris`
    var L = N.ennemis ? N.ennemis.list : [], best = null, bd = r * r, i;
    for (i = 0; i < L.length; i++) {
      var e = L[i];
      if (e._dead || e.etat === 'portail' || e._st === 'naissance' || e._proie || (pris && pris.indexOf(e) >= 0)) continue;
      var d = O.d2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function tirer(x, y, a, v, life, dmg, kind, perce) {
    if (tirs.length >= CFG.plafondTirs) return null;
    var b = { x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: a, dmg: dmg, life: life, kind: kind || 'c', _perce: perce | 0, _gros: dmg >= 20 && kind === 'c', _eclats: 0 };
    tirs.push(b);
    return b;
  }
  function salveSon() { if (st.salveSon <= 0) { st.salveSon = 1 / CFG.salveMax; O.sfx('salve'); } }
  var FL = { x: 0, y: 0, nx: 0, ny: 0 };
  function flanc(k, cote, out) {                        // le point du flanc du segment k, côté +1 / −1
    var p = N.joueuse.segPos(k), x = p.x, y = p.y, q = N.joueuse.segPos(k + 1), dx = q.x - x, dy = q.y - y, m = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / m, ny = dx / m;
    out.x = x + nx * CFG.flancDecalage * cote; out.y = y + ny * CFG.flancDecalage * cote; out.nx = nx * cote; out.ny = ny * cote;
    return out;
  }

  /* ============================ le CANON ============================ */
  function palierCanon() {
    var p = conf('canon').paliers || [];
    return p[niveau('canon') - 1] || { tirs: 1, cadence: 6.5, degats: 10, portee: 130, vitesse: 210 };
  }
  function updCanon(dt, P) {
    var p = palierCanon(), mods = (N.cartes && N.cartes.mods) || null, a = P.ang, c = Math.cos(a), s = Math.sin(a);
    if (p.continu) { updRayon(dt, P, p); return; }
    st.rayonOn = false;
    st.cd -= dt;
    if (st.cd > 0) return;
    var rate = (p.cadence || 6.5) * (mods ? mods.cadence : st.cad) * (st.surcharge ? CFG.surchargeCadence : 1) * (S && S.input && S.input.fire ? CFG.cadenceTenue : 1);
    st.cd += 1 / rate; if (st.cd < 0) st.cd = 0;
    var dmg = (p.degats || 10) * mul(), nais = (R.armes.lisibilite && R.armes.lisibilite.naissance) || 7;
    var hx = P.x + c * nais, hy = P.y + s * nais, v = p.vitesse || 210, vie = (p.portee || 130) / v, n = p.tirs || 1;
    if (p.bouches === 2) {                                            // palier II : deux bouches côte à côte
      var e = p.ecartBouches || 2;
      tirer(hx - s * e, hy + c * e, a, v, vie, dmg, 'c', 0); tirer(hx + s * e, hy - c * e, a, v, vie, dmg, 'c', 0);
    } else if (n <= 1) tirer(hx, hy, a, v, vie, dmg, 'c', 0);
    else {                                                            // palier III : deux lances perforantes
      var ea = p.ecartAngle || 0.06, perce = p.perce || 0;
      tirer(hx - s * 2.5, hy + c * 2.5, a - ea, v, vie, dmg, 'l', perce); tirer(hx + s * 2.5, hy - c * 2.5, a + ea, v, vie, dmg, 'l', perce);
    }
    st.volley++;
    O.sfx('tir', { pitch: st.volley % 5 });
  }
  /* ULTIME RAYON : une ligne de 3 px, 15 tics par seconde, 14 par ennemi traversé, efface les tirs ennemis qu'il croise */
  function updRayon(dt, P, p) {
    var a = P.ang, c = Math.cos(a), s = Math.sin(a), d0 = p.depart || 7, L = p.portee || 140, E = N.ennemis;
    BX0 = P.x + c * d0; BY0 = P.y + s * d0; BX1 = P.x + c * (d0 + L); BY1 = P.y + s * (d0 + L); st.rayonOn = true;
    st.rayonT -= dt;
    if (st.rayonT > 0 || !E) return;
    st.rayonT += 1 / (p.tics || 15);
    var dmg = (p.degats || 14) * mul(), i;
    for (i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (e._dead || e.etat === 'portail' || e._st === 'naissance') continue;
      var w = (p.largeur || 3) / 2 + e.r;
      if (O.segDist2(e.x, e.y, BX0, BY0, BX1, BY1) < w * w) E.hit(e, dmg, SRC);
    }
    if (p.efface) for (i = 0; i < E.tirs.length; i++) {
      var b = E.tirs[i];
      if (!b._dead && O.segDist2(b.x, b.y, BX0, BY0, BX1, BY1) < 4) { b._dead = true; O.spark(b.x, b.y, O.CYANP, 1); }
    }
    if ((st.volley++ & 3) === 0) O.sfx('tir', { pitch: 5 });
  }

  /* ============================ les TOURELLES : sur les flancs, suivant la longueur ============================ */
  function updTourelles(dt) {
    var p = pal('tourelles'), J = N.joueuse, len = J.len(), n = Math.min(p.max || 4, Math.floor(len / (p.parSegments || 8))), i;
    if (n <= 0) { st.nT = 0; return; }
    for (i = st.nT; i < n; i++) st.tcd[i] = i * 0.03 + 0.2;          // une tourelle neuve s'allume après sa voisine : la salve court de la tête à la queue
    st.nT = n;
    var vit = conf('tourelles').vitesseTir || 180, por = p.portee || 100;
    for (i = 0; i < n; i++) {
      st.tcd[i] -= dt;
      if (st.tcd[i] > 0) continue;
      var k = Math.max(2, Math.round((i + 0.5) * len / n)), cote = (i & 1) ? 1 : -1;
      flanc(k, cote, FL);
      var e = cible(FL.x, FL.y, por), a0 = Math.atan2(FL.ny, FL.nx), a;
      if (!e) { st.tcd[i] = 0.1; continue; }
      a = Math.atan2(e.y - FL.y, e.x - FL.x);
      if (Math.abs(O.wrapA(a - a0)) > Math.PI / 2) { st.tcd[i] = 0.1; continue; }      // les flancs ne tirent pas dans le dos
      var dmg = (p.degats || 10) * mul(), life = por / vit;
      if (p.rafale) { tirer(FL.x, FL.y, a - (p.ecartRafale || 0.08), vit, life, dmg, 't', 0); tirer(FL.x, FL.y, a + (p.ecartRafale || 0.08), vit, life, dmg, 't', 0); }
      else tirer(FL.x, FL.y, a, vit, life, dmg, 't', 0);
      if (p.eclats && tirs.length) tirs[tirs.length - 1]._eclats = p.eclats;
      st.tcd[i] += 1 / ((p.cadence || 2) * cad());
      salveSon();
    }
  }

  /* ============================ l'ARC : une ligne brisée qui saute d'ennemi en ennemi ============================ */
  function arcDe(ox, oy, pris, p) {
    var E = N.ennemis, pts = [ox, oy], x = ox, y = oy, j, por = p.portee || 60, dmg = (p.degats || 14) * mul();
    for (j = 0; j < (p.sauts || 3); j++) {
      var e = cible(x, y, por, pris);
      if (!e) break;
      pris.push(e);
      pts.push(e.x, e.y);
      E.hit(e, dmg, SRC);
      if (p.paralyse) e._stun = Math.max(e._stun || 0, p.paralyse);
      x = e.x; y = e.y;
    }
    if (pts.length > 2 && arcs.length < 24) arcs.push({ pts: pts, t: CFG.arcVie });
    return pts.length > 2;
  }
  function updArc(dt, P) {
    var p = pal('arc'), J = N.joueuse, E = N.ennemis, i;
    for (i = arcs.length - 1; i >= 0; i--) { arcs[i].t -= dt; if (arcs[i].t <= 0) arcs.splice(i, 1); }
    st.arcT -= dt;
    if (st.arcT > 0 || !E) return;
    st.arcT += p.periode || 1;
    var pris = [], depart = [{ x: P.x, y: P.y }], q = J.segPos(J.len());
    if (p.departs && p.departs.length > 1) depart.push({ x: q.x, y: q.y });
    var n = p.arcs || 1, tire = false;
    for (i = 0; i < n; i++) { var o = depart[i % depart.length]; if (arcDe(o.x, o.y, pris, p)) tire = true; }
    if (tire) O.sfx('tir', { pitch: 3 + (st.volley++ % 4) });
  }

  /* ============================ les MISSILES : autoguidés, priorité aux élites ============================ */
  function priorite(pris) {
    var E = N.ennemis, L = E.list, pr = conf('missiles').priorite || [], i, j, e;
    for (j = 0; j < pr.length; j++) for (i = 0; i < L.length; i++) {
      e = L[i];
      if (e._dead || e.etat === 'portail' || e._st === 'naissance' || e._proie || pris.indexOf(e) >= 0) continue;
      if ((pr[j] === 'elite' && e.elite) || (pr[j] === 'oeil' && e.boss) || e.type === pr[j]) return e;
    }
    return null;
  }
  function updMissiles(dt, P) {
    var p = pal('missiles'), cf = conf('missiles'), E = N.ennemis, i;
    st.misT -= dt;
    if (st.misT <= 0 && E) {
      st.misT += p.periode || 2.4;
      var pris = [], n = p.missiles || 2, tir = false;
      for (i = 0; i < n && missiles.length < 24; i++) {
        var e = priorite(pris) || cible(P.x, P.y, 220, p.verrouillage ? pris : null) || cible(P.x, P.y, 220, null);
        if (!e) break;
        if (p.verrouillage) pris.push(e);
        flanc(3, (i & 1) ? 1 : -1, FL);
        missiles.push({ x: FL.x, y: FL.y, a: P.ang + Math.atan2(FL.ny, FL.nx) * 0 + ((i & 1) ? 0.7 : -0.7), e: e, vie: CFG.missileVie });   // partent vers l'avant, en éventail, puis se guident
        tir = true;
      }
      if (tir) O.sfx('salve');
    }
    var v = cf.vitesse || 140, vir = cf.virage || 4, dmg = (p.degats || 30) * mul();
    for (i = missiles.length - 1; i >= 0; i--) {
      var m = missiles[i];
      m.vie -= dt;
      if (!m.e || m.e._dead) m.e = cible(m.x, m.y, 200, null);
      if (m.e) m.a = O.turnTo(m.a, Math.atan2(m.e.y - m.y, m.e.x - m.x), vir * dt);
      m.x += Math.cos(m.a) * v * dt; m.y += Math.sin(m.a) * v * dt;
      var boum = m.vie <= 0 || (m.e && O.d2(m.x, m.y, m.e.x, m.e.y) < (m.e.r + 2) * (m.e.r + 2));
      if (boum) {
        if (m.vie > 0 && E) {
          if (m.e) E.hit(m.e, dmg, SRC);
          E.zone(m.x, m.y, p.souffle || 14, dmg * (p.souffleDegats || 0.6), SRC);
          if (p.sousMunitions) for (var k = 0; k < p.sousMunitions; k++) {
            var ak = k / p.sousMunitions * O.TAU + m.a;
            E.zone(m.x + Math.cos(ak) * 9, m.y + Math.sin(ak) * 9, 6, p.degatsSous || 8, SRC);
          }
          O.boom(m.x, m.y, 0.28, O.CYAN);
        }
        missiles.splice(i, 1);
      }
    }
  }

  /* ============================ les DRONES : en orbite, ils tirent et interceptent ============================ */
  var DR = [];                                           // positions courantes des drones [x, y, ...]
  function updDrones(dt, P) {
    var p = pal('drones'), cf = conf('drones'), E = N.ennemis, n = p.drones || 1, i, anneau = !!p.anneau, r = anneau ? p.anneau : (cf.orbite || 16);
    st.ang += CFG.orbiteVitesse * dt;
    DR.length = 0;
    for (i = 0; i < n; i++) {
      var a = st.ang + i / n * O.TAU, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      DR.push(x, y);
      st.dcd[i] = (st.dcd[i] === undefined ? i * 0.2 : st.dcd[i]) - dt;
      st.dpen[i] = Math.max(0, (st.dpen[i] || 0) - dt);
      if (E && st.dcd[i] <= 0) {
        var e = cible(x, y, cf.portee || 90);
        if (e) {
          tirer(x, y, Math.atan2(e.y - y, e.x - x), CFG.vitesseDrone, (cf.portee || 90) / CFG.vitesseDrone, (cf.degats || 10) * mul(), 'd', 0);
          st.dcd[i] += 1 / ((cf.cadence || 1.6) * cad()); salveSon();
        } else st.dcd[i] = 0.1;
      }
      if (E && p.interception && st.dpen[i] <= 0) {        // il avale le tir ennemi qui passe à 4 px
        for (var j = 0; j < E.tirs.length; j++) {
          var b = E.tirs[j];
          if (!b._dead && O.d2(x, y, b.x, b.y) < 16) { b._dead = true; O.spark(b.x, b.y, O.CYANP, 2); st.dpen[i] = p.penalite || 0; break; }
        }
      }
    }
    if (E && (p.filin || anneau)) {                      // le filin (30 par seconde) ou l'anneau fermé (60 par seconde) coupe ce qu'il touche
      var dps = (anneau ? p.contact : p.filin) * mul() * dt, m = anneau ? n : n - 1;
      for (i = 0; i < m; i++) {
        var x0 = DR[i * 2], y0 = DR[i * 2 + 1], x1 = DR[((i + 1) % n) * 2], y1 = DR[((i + 1) % n) * 2 + 1];
        for (var q = 0; q < E.list.length; q++) {
          var en = E.list[q];
          if (en._dead || en.etat === 'portail' || en._st === 'naissance' || en._proie) continue;
          if (O.segDist2(en.x, en.y, x0, y0, x1, y1) < (en.r + 1) * (en.r + 1)) E.hit(en, dps, SRC);
        }
      }
    }
  }

  /* ============================ les MINES DE QUEUE : posées derrière, armées en 0,4 s ============================ */
  function updMines(dt) {
    var p = pal('minesQ'), cf = conf('minesQ'), E = N.ennemis, J = N.joueuse, i;
    st.minT -= dt;
    if (st.minT <= 0 && mines.length < (cf.max || 12)) {
      st.minT += p.periode || 2.2;
      var q = J.segPos(J.len());
      mines.push({ x: q.x, y: q.y, t: 0, vie: cf.vie || 8, asp: -1 });
    }
    var arme = cf.armement || 0.4, dec = cf.declenche || 8;
    for (i = mines.length - 1; i >= 0; i--) {
      var m = mines[i];
      m.t += dt; m.vie -= dt;
      if (m.vie <= 0) { mines.splice(i, 1); continue; }
      if (!E) continue;
      if (m.asp >= 0) {                                   // SINGULARITÉ : l'aspiration, puis le souffle
        m.asp += dt;
        for (var j = 0; j < E.list.length; j++) {
          var e = E.list[j];
          if (e._dead || e._proie || e.boss) continue;
          var dd = Math.sqrt(O.d2(e.x, e.y, m.x, m.y));
          if (dd < (p.rayonAspiration || 30) && dd > 1) { e.x += (m.x - e.x) / dd * 70 * dt; e.y += (m.y - e.y) / dd * 70 * dt; }
        }
        if (m.asp >= (p.aspiration || 0.45)) { sauter(m, p, E); mines.splice(i, 1); }
        continue;
      }
      if (m.t < arme) continue;
      var tr = false;
      for (var k = 0; k < E.list.length; k++) {
        var en = E.list[k];
        if (!en._dead && !en._proie && en.etat !== 'portail' && en._st !== 'naissance' && O.d2(m.x, m.y, en.x, en.y) < (dec + en.r * 0.5) * (dec + en.r * 0.5)) { tr = true; break; }
      }
      if (!tr) continue;
      if (p.aspiration) m.asp = 0; else { sauter(m, p, E); mines.splice(i, 1); }
    }
  }
  function sauter(m, p, E) {
    var dmg = (p.degats || 40) * mul();
    E.zone(m.x, m.y, p.souffle || 18, dmg, SRC);
    if (p.sousCharges) for (var k = 0; k < p.sousCharges; k++) {
      var a = k / p.sousCharges * O.TAU + m.t;
      E.zone(m.x + Math.cos(a) * 14, m.y + Math.sin(a) * 14, p.souffleSous || 12, (p.degatsSous || 16) * mul(), SRC);
    }
    O.boom(m.x, m.y, 0.3, O.CYAN);
  }

  /* ============================ la mise à jour ============================ */
  function update(dt) {
    if (!S) S = N.S;
    var J = N.joueuse, P = J && J.tete, vivant = J && (J.etat === 'vivant' || J.etat === 'reapparition');
    var i, j, b, V = O.VUE, L = N.ennemis ? N.ennemis.list : [];
    if (st.salveSon > 0) st.salveSon -= dt;
    for (i = arcs.length - 1; i >= 0; i--) { arcs[i].t -= dt; if (arcs[i].t <= 0) arcs.splice(i, 1); }
    if (vivant && P) {
      updCanon(dt, P);
      if (st.niv.tourelles > 0) updTourelles(dt);
      if (st.niv.arc > 0) updArc(dt, P);
      if (st.niv.missiles > 0) updMissiles(dt, P);
      if (st.niv.drones > 0) updDrones(dt, P); else DR.length = 0;
      if (st.niv.minesQ > 0) updMines(dt);
    } else { st.rayonOn = false; DR.length = 0; }
    /* les tirs avancent et touchent */
    for (i = tirs.length - 1; i >= 0; i--) {
      b = tirs[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < V.x - 4 || b.x > V.x + V.w + 4 || b.y < V.y - 4 || b.y > V.y + V.h + 4) { tirs.splice(i, 1); continue; }
      for (j = 0; j < L.length; j++) {
        var en = L[j];
        if (en._dead || en.etat === 'portail' || en._st === 'naissance' || en._proie) continue;
        var rr2 = en.r + 1.5;
        if (O.d2(b.x, b.y, en.x, en.y) < rr2 * rr2) {
          if (N.fx && N.fx.spark) O.safe('fx.spark', function () { N.fx.spark(b.x, b.y, -b.vx, -b.vy, 2, en.boss ? O.OS : O.ROSE); });
          N.ennemis.hit(en, b.dmg, SRC);
          if (b._eclats) N.ennemis.zone(b.x, b.y, 8, 4 * b._eclats * mul(), SRC);
          if (b._perce > 0) b._perce--; else { tirs.splice(i, 1); }
          break;
        }
      }
    }
  }

  /* ============================ le dessin : montures sur le corps (sous le serpent), tirs, arcs, mines, drones ============================ */
  function px(x, y, c) { N.gfx.px(Math.round(x), Math.round(y), c); }
  function drawMontures() {
    var J = N.joueuse, len = J.len(), i, g = N.gfx, f = FL;
    if (st.niv.tourelles > 0) {
      var p = pal('tourelles'), n = Math.min(p.max || 4, Math.floor(len / (p.parSegments || 8)));
      for (i = 0; i < n; i++) {
        var k = Math.max(2, Math.round((i + 0.5) * len / n)), cote = (i & 1) ? 1 : -1;
        flanc(k, cote, f);
        g.rect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3, O.CYANP);                       // module 3 × 3 sur la perle
        px(f.x + f.nx * 2, f.y + f.ny * 2, O.CYAN); px(f.x + f.nx * 3, f.y + f.ny * 3, O.CYAN);  // canon de 2 px
      }
    }
    if (st.niv.arc > 0) {
      var q = J.segPos(len);
      g.rect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3, O.CYAN); px(q.x, q.y, O.CYANP);    // électrode de queue
    }
    if (st.niv.missiles > 0) {
      flanc(3, 1, f); g.rect(Math.round(f.x), Math.round(f.y), 1, 2, O.CYANP); px(f.x + f.nx, f.y + f.ny, O.CYAN);
      flanc(3, -1, f); g.rect(Math.round(f.x), Math.round(f.y), 1, 2, O.CYANP); px(f.x + f.nx, f.y + f.ny, O.CYAN);
    }
    if (st.niv.minesQ > 0) { var t = J.segPos(len); px(t.x, t.y, O.CYANP); px(t.x, t.y + 1, O.CYAN); px(t.x + 1, t.y, O.CYAN); }
  }
  function drawArc(a) {
    var g = N.gfx, p = a.pts, i;
    for (i = 0; i + 3 < p.length; i += 2) {
      var x0 = p[i], y0 = p[i + 1], x1 = p[i + 2], y1 = p[i + 3], mx = (x0 + x1) / 2 + (((i * 7) & 3) - 1.5), my = (y0 + y1) / 2 + (((i * 5) & 3) - 1.5);
      g.line(x0, y0, mx, my, O.CYAN); g.line(mx, my, x1, y1, O.CYAN);
      px(mx, my, O.CYANP);
    }
    for (i = 2; i + 1 < p.length; i += 2) g.rect(Math.round(p[i]) - 1, Math.round(p[i + 1]) - 1, 3, 3, O.OS);        // nœud d'os de 3 × 3 à chaque impact
  }
  function draw() {
    var f = Math.floor(O.T.ak * 12), g = N.gfx, i;
    if (!S) S = N.S;
    var J = N.joueuse;
    if (J && (J.etat === 'vivant' || J.etat === 'reapparition')) drawMontures();
    for (i = 0; i < mines.length; i++) {
      var m = mines[i], arme = m.t >= 0.4, bat = (Math.floor(O.T.ak * 4) & 1) === 1, x = Math.round(m.x), y = Math.round(m.y), cm = arme ? O.CYAN : O.INDIGO;
      if (m.vie < 2 && (f & 1)) continue;
      g.line(x - 2, y, x, y - 2, cm); g.line(x, y - 2, x + 2, y, cm); g.line(x + 2, y, x, y + 2, cm); g.line(x, y + 2, x - 2, y, cm);
      px(x, y, arme && bat ? O.CYANP : O.INDIGO);
      if (m.asp >= 0) g.ring(x, y, 30 * (1 - m.asp / 0.45), O.CYANP, 0.6);
    }
    for (i = 0; i < tirs.length; i++) {
      var b = tirs[i];
      if (b.kind === 'd' || b.kind === 't') { px(b.x, b.y, O.CYANP); px(b.x - b.vx * 0.01, b.y - b.vy * 0.01, O.CYAN); continue; }
      if (b.kind === 'l') { g.line(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.x, b.y, O.CYAN); px(b.x, b.y, O.CYANP); continue; }
      if (b._gros) { g.line(b.x - b.vx * 0.016, b.y - b.vy * 0.016, b.x, b.y, O.AMBRE); g.rect(b.x - 1, b.y - 1, 2, 2, O.JAUNE); }
      else O.put(O.sp('tir:' + O.dir16(b.a), f), b.x, b.y);
    }
    for (i = 0; i < missiles.length; i++) {
      var q = missiles[i], c = Math.cos(q.a), s = Math.sin(q.a);
      px(q.x, q.y, O.CYANP); px(q.x - c, q.y - s, O.CYAN); px(q.x - c * 2, q.y - s * 2, O.CYAN);
      px(q.x - c * 4, q.y - s * 4, (f & 1) ? O.INDIGO : O.CYAN);
      if (q.e && !q.e._dead && st.niv.missiles >= 4) { var w = O.T.ak * 6; for (var k = 0; k < 4; k++) px(q.e.x + Math.cos(w + k * 1.5708) * 6, q.e.y + Math.sin(w + k * 1.5708) * 6, O.CYANP); }
    }
    for (i = 0; i < arcs.length; i++) drawArc(arcs[i]);
    if (st.rayonOn) {                                      // le rayon : centre cyan pâle, bords cyan, paquets d'os qui filent
      g.line(BX0, BY0, BX1, BY1, O.CYANP);
      var dx = BX1 - BX0, dy = BY1 - BY0, ln = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / ln, ny = dx / ln;
      g.line(BX0 + nx, BY0 + ny, BX1 + nx, BY1 + ny, O.CYAN); g.line(BX0 - nx, BY0 - ny, BX1 - nx, BY1 - ny, O.CYAN);
      for (i = 0; i < 4; i++) { var u = ((O.T.ak * 3 + i / 4) % 1); px(BX0 + dx * u, BY0 + dy * u, O.OS); }
    }
    for (i = 0; i + 1 < DR.length; i += 2) {                // le drone : satellite de 5 × 5 à œil cyan pâle
      var xx = Math.round(DR[i]), yy = Math.round(DR[i + 1]);
      g.rect(xx - 2, yy - 2, 5, 5, O.CYAN); g.rect(xx - 1, yy - 1, 3, 3, O.NUIT); px(xx, yy, O.CYANP);
    }
    var pd = pal('drones');
    if (DR.length >= 4 && (pd.filin || pd.anneau)) {
      var nd = DR.length / 2, ann = !!pd.anneau;
      for (i = 0; i < (ann ? nd : nd - 1); i++) {
        var a0 = i * 2, a1 = ((i + 1) % nd) * 2, ddx = DR[a1] - DR[a0], ddy = DR[a1 + 1] - DR[a0 + 1], ll = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy));
        for (var z = 0; z < ll; z += ann ? 2 : 3) px(DR[a0] + ddx * z / ll, DR[a0 + 1] + ddy * z / ll, O.CYANP);
      }
    }
  }

  /* ---- les consommateurs (rang 50) ---- */
  if (N.ev) {
    N.ev.on('mort', 50, function () { st.chute = descendre(); }, '74-arsenal');
    N.ev.on('carte', 50, function (c) {
      if (!c) return;
      if (c.id === 'canon') monter('canon');
      else if (N.ids.armes.indexOf(c.id) >= 0) monter(c.id);
      else if (c.id === 'cadence' && !(N.cartes && N.cartes.mods)) st.cad *= 1.15;       // repli : sans N.cartes.mods
    }, '74-arsenal');
  }

  return {
    chute: function () { return st.chute; }, reset: reset, update: update, draw: draw, monter: monter, descendre: descendre, niveau: niveau, armes: armes,
    tirs: tirs, surcharger: surcharger,
    etat: function () { return { arcs: arcs.length, missiles: missiles.length, mines: mines.length, drones: DR.length / 2, tourelles: st.nT, rayon: st.rayonOn }; }
  };
})();

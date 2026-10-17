/* ===== 85-pilote.js — huit politiques gelées, refonte/lots/pilotes.md =====
   Lecture : vues publiques de S, N.R, N.ids, N.game.etat(), N.horloge.H/pas().
   Écriture du jeu : S.input seulement ; hasard : flux pilote ; journal : N.journal('pilote', …).
   Le raccord window.__PILOT ignore son snapshot (il contient des objets hors contrat).
   Constantes de la spécification gelée non exposées par N.R : tables locales (→ N.R),
   sans modifier les règles ni les cibles du jeu.
   Les producteurs manquants sont demandés dans refonte/lots/demandes.md : aucun accès privé de repli. */
(function () {
  'use strict';
  var N = window.__N || (window.__N = {});
  var NOMS = ['inerte', 'tourneur', 'maladroit', 'kamikaze', 'humain', 'bon', 'expert', 'dieu'];
  var REACTION = { inerte: 0, tourneur: 0, maladroit: 0, kamikaze: 0.08, humain: 0.12, bon: 0.08, expert: 0.05, dieu: 0.08 };
  var ORDRE = ['tourelles', 'canon', 'missiles', 'bouclier', 'croissance', 'arc', 'puissance', 'cadence', 'drones', 'traversee', 'reparation', 'aimant', 'minesQ', 'grappe', 'sangFroid', 'braise', 'eperon', 'ralenti', 'repli'];
  var EXPERT = ['canon', 'tourelles', 'missiles', 'grappe', 'puissance', 'cadence', 'bouclier', 'arc', 'croissance', 'traversee', 'reparation', 'sangFroid', 'aimant', 'drones', 'braise', 'minesQ', 'eperon', 'ralenti', 'repli'];
  var COMBAT = { jeu: 1, nettoyage: 1, defile: 1, alerte: 1, boss: 1, reapparition: 1, attraction: 1, plongee: 1 };
  var PI = Math.PI, TAU = 2 * PI, CERT = 1000;
  var P = { nom: 'inerte', actif: false, opts: {}, t: 0, pas: -1, etat: '', cap: 0, cout: 0, precedent: null,
    decision: 0, bruit: 0, prochainBruit: 0, prochainLog: 0, prochaineCarte: 0, dernierLasso: -Infinity,
    lasso: null, pouvoirEnFile: false, apogeeEnFile: false, boost: false, file: [], curseur: 0 };
  var pred = new Float64Array(8), poids = [1, 0.8, 0.6, 0.4];
  var ancienHook = null;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function angle(a) { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function vivant(e) { return e.etat !== 'portail' && e.etat !== 'mort'; }
  function danger(e) { return vivant(e) && e.etat !== 'proie'; }
  function note(evt, data) {
    if (!N.journal) return;
    var d = { nom: P.nom, evt: evt }; if (data) for (var k in data) d[k] = data[k];
    N.journal('pilote', d);
  }
  function vide() { return { cap: 0, bruit: 0, mag: 0, boost: false, pouvoir: false, apogee: false, chiffre: 0 }; }
  function razFile() {
    var h = N.horloge && N.horloge.H || 1 / 120, n = Math.round(REACTION[P.nom] / h) + 1;
    P.file = new Array(n); for (var i = 0; i < n; i++) P.file[i] = vide(); P.curseur = 0;
  }
  function raz() {
    P.t = 0; P.pas = -1; P.etat = ''; P.cap = 0; P.cout = 0; P.precedent = null;
    P.decision = 0; P.bruit = 0; P.prochainBruit = 0; P.prochainLog = 0; P.prochaineCarte = 0;
    P.dernierLasso = -Infinity; P.lasso = null; P.pouvoirEnFile = P.apogeeEnFile = P.boost = false; razFile();
  }
  function ecrire(out, input) {
    var a = out.cap + out.bruit;
    input.x = out.mag ? Math.cos(a) : 0; input.y = out.mag ? Math.sin(a) : 0;
    input.mag = out.mag; input.boost = out.boost; input.pouvoir = out.pouvoir;
    input.apogee = out.apogee; input.chiffre = out.chiffre; input.valider = false;
  }
  function retarder(out, input) {
    var cell = P.file[P.curseur];
    for (var k in out) cell[k] = out[k];
    P.curseur = (P.curseur + 1) % P.file.length;
    ecrire(P.file[P.curseur], input);
  }
  function dansVue(o, S) { var v = S.vue; return !!v && o.x >= v.x && o.x <= v.x + v.w && o.y >= v.y && o.y <= v.y + v.h; }
  function zone(x, y, z) {
    var m = 4, dx, dy;
    if (z.forme === 'rect' || z.forme === 'voie') return x >= Math.min(z.x0, z.x1) - m && x <= Math.max(z.x0, z.x1) + m && y >= Math.min(z.y0, z.y1) - m && y <= Math.max(z.y0, z.y1) + m;
    if (z.forme === 'ligne') {
      dx = z.x1 - z.x0; dy = z.y1 - z.y0;
      var d2 = dx * dx + dy * dy, k = d2 ? clamp(((x - z.x0) * dx + (y - z.y0) * dy) / d2, 0, 1) : 0;
      return Math.hypot(x - z.x0 - dx * k, y - z.y0 - dy * k) <= z.r + m;
    }
    dx = x - z.x0; dy = y - z.y0;
    if (Math.hypot(dx, dy) > z.r + m) return false;
    if (z.forme === 'disque' || z.forme === 'losange') return true;
    if (z.forme === 'secteur') {
      var span = ((z.a1 - z.a0) % TAU + TAU) % TAU;
      if (Math.abs(z.a1 - z.a0) >= TAU) return true;
      return ((Math.atan2(dy, dx) - z.a0) % TAU + TAU) % TAU <= span;
    }
    return false;
  }
  function potentiel(x, y, t, S) {
    var u = 0, M = S.monde, i, d, e;
    if (M) {
      var shift = M.mobile ? (M.vx || 0) * t : 0;
      d = Math.min(x - M.x0 - shift, M.x1 + shift - x, y - M.y0, M.y1 - y);
      u += d < 4 ? CERT : 40 * Math.pow(Math.max(0, 1 - d / 24), 2);
      var annonces = M.annonce || [];
      for (i = 0; i < annonces.length; i++) { var a = annonces[i]; if (x < a[0] || x > a[2] || y < a[1] || y > a[3]) u += 30; }
    }
    var p = S.player, segs = p.segs || [];
    for (i = 6; i <= p.len - 4 && 2 * i + 1 < segs.length; i++) {
      d = Math.hypot(x - segs[2 * i], y - segs[2 * i + 1]);
      u += d < 6.5 ? CERT : 20 * Math.pow(Math.max(0, 1 - d / 12), 2);
    }
    var tele = S.tele || [];
    for (i = 0; i < tele.length; i++) { var z = tele[i]; if ((z.cible === 'tete' || z.cible === 'tout') && zone(x, y, z)) u += t >= z.reste - 0.1 ? 300 : 80; }
    var shots = S.shots || [];
    for (i = 0; i < shots.length; i++) {
      e = shots[i]; d = Math.hypot(x - e.x - e.vx * t, y - e.y - e.vy * t);
      u += d < 5 + e.r ? CERT : 50 * Math.pow(Math.max(0, 1 - d / 14), 2);
    }
    var enemies = S.enemies || [];
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (!vivant(e)) continue;
      d = Math.hypot(x - e.x - e.vx * t, y - e.y - e.vy * t);
      if (e.etat === 'proie') { u -= 30 * Math.max(0, 1 - d / 150); continue; }
      if (e.type === 'planeur') { u -= 4 * Math.exp(-Math.pow((d - 40) / 25, 2)); continue; }
      var r = 6 + 0.8 * e.r;
      u += d < r ? CERT : 30 * Math.pow(Math.max(0, 1 - (d - r) / 24), 2);
      if (e.type === 'traqueur') u += 60 * Math.pow(Math.max(0, 1 - d / 40), 2);
      else u -= 4 * Math.exp(-Math.pow((d - 60) / 25, 2));
      if (e.type === 'mine' && d < 37) u += 150;
    }
    var voies = S.voies || [];
    for (i = 0; i < voies.length; i++) { var v = voies[i]; if (y >= v.y0 - 6 && y <= v.y1 + 6) u += v.etat === 'passage' || v.reste - t < 0.3 ? 200 : 120; }
    var butin = S.butin || [];
    for (i = 0; i < butin.length; i++) {
      e = butin[i]; d = Math.hypot(x - e.x, y - e.y);
      if (e.type === 'pastille') u -= 40 * Math.max(0, 1 - d / 300);
      else if (e.type === 'cellule' || e.type === 'noyau') u -= (e.type === 'noyau' ? 12 : 6) * Math.max(0, 1 - d / 120);
    }
    return u;
  }
  function trajectoire(cap, S) {
    var p = S.player, x = p.x, y = p.y, a = p.ang, v = p.vit;
    var omega = N.R.f.virage(v), k = 0;
    for (var j = 1; j <= 14; j++) {
      a += clamp(angle(cap - a), -omega * 0.05, omega * 0.05);
      x += Math.cos(a) * v * 0.05; y += Math.sin(a) * v * 0.05;
      if (j === 2 || j === 5 || j === 9 || j === 14) { pred[k++] = x; pred[k++] = y; }
    }
  }
  var instants = [0.10, 0.25, 0.45, 0.70];
  function cout(cap, S, fatal) {
    trajectoire(cap, S);
    var c = 6 * Math.abs(angle(cap - S.player.ang)) / PI;
    for (var k = 0; k < 4; k++) { var u = potentiel(pred[2 * k], pred[2 * k + 1], instants[k], S); if (fatal && u >= CERT) return CERT; c += poids[k] * u; }
    return fatal ? 0 : c;
  }
  function champ(S) {
    var best = S.player.ang, min = Infinity;
    for (var i = 0; i < 25; i++) { var a = i === 24 ? S.player.ang : i * PI / 12, c = cout(a, S, false); if (c < min) { min = c; best = a; } }
    if (P.precedent !== null) { var prev = cout(P.precedent, S, false); if (prev - min < 2) { best = P.precedent; min = prev; } }
    P.precedent = best; P.cout = min; return best;
  }
  function groupe(S) {
    var enemies = S.enemies || [], best = [], near = Infinity;
    for (var i = 0; i < enemies.length; i++) {
      var seed = enemies[i]; if (!danger(seed)) continue;
      var group = [];
      for (var j = 0; j < enemies.length; j++) if (danger(enemies[j]) && distance(seed, enemies[j]) <= 60) group.push(enemies[j]);
      var d = distance(seed, S.player);
      if (group.length > best.length || (group.length === best.length && d < near)) { best = group; near = d; }
    }
    return best;
  }
  function centre(group) {
    var c = { x: 0, y: 0 }; for (var i = 0; i < group.length; i++) { c.x += group[i].x; c.y += group[i].y; }
    c.x /= group.length; c.y /= group.length; return c;
  }
  function planSur(c, radius, S) {
    var M = S.monde, tele = S.tele || [], segs = S.player.segs || [];
    if (!M) return false;
    for (var i = 0; i < 24; i++) {
      var a = i * PI / 12, x = c.x + radius * Math.cos(a), y = c.y + radius * Math.sin(a);
      if (Math.min(x - M.x0, M.x1 - x, y - M.y0, M.y1 - y) < 24) return false;
      for (var j = 0; j < tele.length; j++) if (zone(x, y, tele[j])) return false;
    }
    for (i = 6; i <= S.player.len - 4 && 2 * i + 1 < segs.length; i++) if (Math.hypot(c.x - segs[2 * i], c.y - segs[2 * i + 1]) < radius + 8) return false;
    return true;
  }
  function guide(c, radius, sens, p) {
    var phi = Math.atan2(c.y - p.y, c.x - p.x), k = clamp(1.2 * (distance(c, p) - radius) / radius, -0.7, 0.7);
    return phi - sens * (PI / 2 - k);
  }
  function finirLasso(raison) { note('lassoFin', { raison: raison }); P.lasso = null; }
  function lasso(S) {
    var p = S.player, L = P.lasso, i;
    if (!L && p.len >= 8 && P.t - P.dernierLasso > 1.5) {
      var group = groupe(S);
      if (group.length >= 4) {
        var c = centre(group), radius = 26;
        for (i = 0; i < group.length; i++) radius = Math.max(radius, distance(group[i], c) + 16);
        var possible = distance(p, c) <= 140;
        if (P.nom === 'expert') {
          var feasible = 0.9 * (p.vit * N.R.f.traine(p.len) + 5 * (p.len - 3)) / TAU;
          radius = Math.min(radius, feasible); possible = possible && radius >= 20 && planSur(c, radius, S);
        }
        if (possible) {
          var plus = guide(c, radius, 1, p), minus = guide(c, radius, -1, p);
          var sens = Math.abs(angle(plus - p.ang)) <= Math.abs(angle(minus - p.ang)) ? 1 : -1;
          L = P.lasso = { ids: group.map(function (e) { return e.id; }), c: c, r: radius, s: sens, t: P.t, tourne: 0, ang: p.ang };
          P.dernierLasso = P.t;
          note('lassoTente', { n: group.length, rayon: radius, longueur: p.len, sens: sens });
        }
      }
    }
    if (!L) return null;
    var members = (S.enemies || []).filter(function (e) { return vivant(e) && L.ids.indexOf(e.id) >= 0; });
    L.tourne += Math.abs(angle(p.ang - L.ang)); L.ang = p.ang;
    if (!members.length) { finirLasso('vide'); return null; }
    L.c = centre(members);
    if (L.tourne >= TAU + 0.6) { finirLasso('boucle'); return null; }
    if (P.t - L.t >= TAU * L.r / p.vit + 1) { finirLasso('temps'); return null; }
    var cap = guide(L.c, L.r, L.s, p);
    if (cout(cap, S, true) >= CERT) { finirLasso('danger'); return null; }
    P.cout = cout(cap, S, false); return cap;
  }
  function proche(S, butin, ennemis) {
    var best = null, min = Infinity, lists = [];
    if (butin) lists.push(S.butin || []); if (ennemis) lists.push(S.enemies || []);
    for (var l = 0; l < lists.length; l++) for (var i = 0; i < lists[l].length; i++) {
      var e = lists[l][i]; if (l === 0 && butin && e.type === 'pastille') continue;
      if (e.etat && !vivant(e)) continue;
      var d = distance(e, S.player); if (d < min) { best = e; min = d; }
    }
    return { objet: best, distance: min };
  }
  function approche(e, p, duree) {
    var dx = e.x - p.x, dy = e.y - p.y, vx = e.vx - Math.cos(p.ang) * p.vit, vy = e.vy - Math.sin(p.ang) * p.vit;
    var v2 = vx * vx + vy * vy, t = v2 ? clamp(-(dx * vx + dy * vy) / v2, 0, duree) : 0;
    return Math.hypot(dx + vx * t, dy + vy * t);
  }
  function actions(S, out) {
    var p = S.player, enemies = S.enemies || [], tele = S.tele || [], shots = S.shots || [], i;
    if (!p.pouvoirPret) P.pouvoirEnFile = false;
    if (p.apogee < 100) P.apogeeEnFile = false;
    if (P.nom === 'expert' && (P.opts.variante === 'auto' || P.opts.variante === 'diriger')) return;
    if (P.nom !== 'bon' && P.nom !== 'expert' && P.nom !== 'dieu' && P.nom !== 'kamikaze') return;
    var pouvoir = false, apogee = false, nVue = 0, nPres = 0, nTele = 0, oeil = false;
    for (i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (!danger(e)) continue;
      if (dansVue(e, S)) { nVue++; if (e.boss && e.partie === 'oeil') oeil = true; }
      if (distance(e, p) < 60) nPres++;
      if (e.etat === 'attaque' && approche(e, p, 0.2) < 6 + 0.8 * e.r && p.pouvoir === 'traversee') pouvoir = true;
    }
    for (i = 0; i < tele.length; i++) {
      var z = tele[i]; if (dansVue({ x: z.x0, y: z.y0 }, S)) nTele++;
      if (p.pouvoir === 'traversee' && z.reste < 0.2 && (z.cible === 'tete' || z.cible === 'tout') && zone(p.x + Math.cos(p.ang) * p.vit * z.reste, p.y + Math.sin(p.ang) * p.vit * z.reste, z)) pouvoir = true;
    }
    if (p.pouvoir === 'traversee') for (i = 0; i < shots.length; i++) if (approche(shots[i], p, 0.2) < 4 + shots[i].r) pouvoir = true;
    if (p.pouvoir === 'ralenti' && nTele >= 3) pouvoir = true;
    if (p.pouvoir === 'repli' && nPres >= 5) pouvoir = true;
    apogee = nVue >= 8 || (P.nom === 'expert' && oeil);
    if (P.nom === 'kamikaze') pouvoir = apogee = true;
    if (p.pouvoirPret && pouvoir && !P.pouvoirEnFile) { out.pouvoir = true; P.pouvoirEnFile = true; note('pouvoir', { id: p.pouvoir || null }); }
    if (p.apogee >= 100 && apogee && !P.apogeeEnFile) { out.apogee = true; P.apogeeEnFile = true; note('apogee'); }
  }
  function carte(S, out) {
    var E = S.ecran;
    if (!E || E.nom !== 'cartes' || !E.pret || E.depuis < 0.45 || P.t < P.prochaineCarte) return;
    var cards = E.cartes || [], rang = 0, best = Infinity;
    if (!cards.length) return;
    if (P.nom === 'maladroit') rang = N.rng('pilote').i(1, cards.length) - 1;
    else if (P.nom !== 'inerte' && P.nom !== 'tourneur') {
      var order = P.nom === 'expert' ? EXPERT : ORDRE;
      for (var i = 0; i < cards.length; i++) {
        var score = order.indexOf(cards[i]); if (score < 0) score = order.length;
        if (P.nom === 'expert' && E.niveaux && E.niveaux[cards[i]] === 4 && N.R.armes && N.R.armes[cards[i]]) score -= order.length + 1;
        if (score < best) { best = score; rang = i; }
      }
    }
    out.chiffre = rang + 1; P.prochaineCarte = P.t + 0.2 + (N.horloge.H || 1 / 120);
    note('carte', { id: cards[rang], rang: rang + 1 });
  }
  function vol(S, out) {
    var V = S.vol; if (!V || !V.tete || P.nom === 'inerte') return;
    var list = V.objets || [], cible = null, best = Infinity, evite = null;
    var simple = P.nom === 'maladroit' || P.nom === 'kamikaze';
    for (var i = 0; i < list.length; i++) {
      var o = list[i], d = distance(o, V.tete);
      if (o.type === 'mine' && o.avant < 1.2 && d < 24 && !simple) evite = o;
      if (simple || ((o.type === 'porte' || o.type === 'cellule') && o.avant >= 0.3)) {
        var c = simple ? d : o.avant; if (c < best) { best = c; cible = o; }
      }
    }
    if (evite) { out.cap = evite.x >= V.tete.x ? PI : 0; out.mag = 0.8; }
    else if (cible) { out.cap = Math.atan2(cible.y - V.tete.y, cible.x - V.tete.x); out.mag = 0.8; }
  }
  function agir(dt) {
    if (!P.actif) return;
    var S = N.S; if (!S || !S.input) return;
    var pas = N.horloge && N.horloge.pas ? N.horloge.pas() : 0;
    if (pas < P.pas) raz(); P.pas = pas;
    var e = N.game.etat(), out = vide(), p = S.player;
    dt = dt >= 0 ? dt : (N.horloge.H || 1 / 120); P.t += dt;
    if (e !== P.etat) {
      var autreContexte = !COMBAT[e] || !COMBAT[P.etat]; P.etat = e;
      if (autreContexte) { razFile(); P.decision = 0; P.precedent = null; }
      if (!COMBAT[e] && P.lasso) finirLasso('vide');
    }
    if (e === 'cartes') { carte(S, out); retarder(out, S.input); return; }
    if (e === 'vol') { vol(S, out); retarder(out, S.input); return; }
    if (!COMBAT[e] || !p || p.etat === 'mort' || p.etat === 'absent') { razFile(); ecrire(out, S.input); return; }
    if (P.nom === 'inerte') { retarder(out, S.input); return; }
    var decide = P.t + 1e-9 >= P.decision;
    if (decide) {
      P.cout = 0; P.cap = p.ang;
      if (P.nom === 'tourneur') P.cap = p.ang + PI / 2;
      else if (P.nom === 'maladroit' || P.nom === 'kamikaze') {
        var target = proche(S, P.nom === 'maladroit', true);
        if (target.objet) P.cap = Math.atan2(target.objet.y - p.y, target.objet.x - p.x);
        if (P.nom === 'kamikaze') out.boost = target.distance > 40 && !!target.objet;
      } else { var cap = lasso(S); P.cap = cap === null ? champ(S) : cap; }
      P.decision = P.t + (P.nom === 'maladroit' ? 0.7 : 0);
    }
    var erreur = P.nom === 'humain' ? 10 : P.nom === 'maladroit' ? 35 : 0;
    if (erreur && (P.t + 1e-9 >= P.prochainBruit || (P.nom === 'maladroit' && decide))) {
      P.bruit = N.rng('pilote').r(-erreur, erreur) * PI / 180; P.prochainBruit = P.t + 0.25;
    }
    out.cap = P.cap; out.bruit = P.bruit; out.mag = 0.8;
    if (P.nom === 'expert' && P.opts.variante !== 'diriger') {
      var semer = (S.enemies || []).some(function (e2) { return danger(e2) && e2.type === 'traqueur' && distance(e2, p) < 80; });
      var boost = (P.cout > 150 && Math.abs(angle(P.cap - p.ang)) < PI / 12 && p.reserve > 30) || semer;
      if (P.opts.variante === 'auto') out.mag = boost ? 1 : 0.8; else out.boost = boost;
    }
    actions(S, out);
    var acceleration = out.boost || out.mag === 1;
    if (acceleration !== P.boost) { P.boost = acceleration; note('boost', { on: acceleration }); }
    if (P.t + 1e-9 >= P.prochainLog) { note('cap', { vise: P.cap, bruit: P.bruit, retard: REACTION[P.nom], cout: P.cout }); P.prochainLog = P.t + 0.25; }
    retarder(out, S.input);
  }
  function hook() { agir(N.horloge && N.horloge.H || 1 / 120); }
  function niveau(nom, opts) {
    var noms = N.ids && N.ids.pilotes || NOMS;
    if (noms.indexOf(nom) < 0) throw new Error('Pilote inconnu : ' + nom);
    P.nom = nom; P.opts = opts || {}; raz(); note('niveau'); return P.nom;
  }
  function activer(b) {
    b = !!b;
    if (b && !P.actif) { ancienHook = window.__PILOT; window.__PILOT = hook; raz(); }
    if (!b && P.actif) { if (window.__PILOT === hook) window.__PILOT = ancienHook; if (N.S && N.S.input) ecrire(vide(), N.S.input); }
    P.actif = b; return b;
  }
  N.pilote = { niveau: niveau, activer: activer, agir: agir, actif: function () { return P.actif; }, nom: function () { return P.nom; },
    lancer: function (nom, opts) { niveau(nom, opts); activer(true); return P.nom; }, arreter: function () { return activer(false); } };
  if (typeof location !== 'undefined') {
    var match = /[?&]pilote=([^&]+)/.exec(location.search || '');
    if (match) { var nom = decodeURIComponent(match[1]); if (NOMS.indexOf(nom) >= 0) N.pilote.lancer(nom); }
  }
})();

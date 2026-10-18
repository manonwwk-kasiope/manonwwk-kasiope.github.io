/* ===== 72-serpents.js — N.serpents : l'entrée des serpents de 2030 (TIQUE, VOLEUR, MIROIR, BROUILLEUR) dans les vagues =====

   Chantier n° 8 de COORDINATION.md ; refonte/couverture-snake2030.md (« les grands absents ») et
   refonte/inventaire-ennemis-niveaux.md (I-16 PARASITE → TIQUE, I-17 BROUILLEUR, I-18 VOLEUR, I-19 MIROIR). Leur comportement
   vit dans 72-ennemis.js (types `tique`, `voleur`, `miroir`, `brouilleur`) ; ce module ne décide que QUAND et OÙ ils naissent.

   EN AVENTURE SEULEMENT. Hors aventure (départs directs, pilotes, bancs de Codex, attraction), pas() rend la main à sa
   première ligne : aucun tirage, aucun ennemi, rien de changé dans l'ordre des mises à jour. N.aventure.enCours() est vrai
   de JOUER (commencerAventure, 79-jeu.js) à la fin du voyage, y compris pendant que le néon joue.

   POURQUOI PAS N.ev : le contrat (03-socle.js, EVT) ne prévoit pas ce module parmi les consommateurs de `vague` ; s'y
   inscrire serait signalé en mode vérification. Le module LIT donc l'état publié du directeur (N.dir.vague(), entrees(),
   phase(), tempsVague(), respiration()) à chaque pas de N.ennemis.update, qui l'appelle (72-ennemis, fin de update). Il
   n'émet rien, ne touche ni à 76-directeur ni au registre. Il crée par l'interface publique N.ennemis.spawn(type, x, y,
   { portail, alea }) : la naissance passe par le même raccord hors de la vue et le même portail que les autres.

   SON HASARD : un mulberry32 à lui, regraine à chaque entrée de vague par (vague, entrées) : jamais N.rng / O.rr de la
   partie, jamais Math.random, aucune horloge. 72-ennemis le lit (alea) pour ce qui se tire chez ces quatre types.

   LE DOSAGE (lisibilité d'abord) : rien en vague 1 ; deux à la fois au plus ; chacun annoncé par son portail de 0,9 s et
   son nom en étiquette ; à sa première rencontre de la partie, la façon de le battre en une ligne (toast, I-58). Pas de naissance pendant la respiration, l'INVERSION, le nettoyage, ni quand la tête n'est pas vivante.
     V2 : TIQUE (9 s), TIQUE (15 s)       V3 : VOLEUR (8 s), TIQUE (26 s)
     V4 : BROUILLEUR (8 s), MIROIR (24 s)  V5 : MIROIR (7 s), puis l'un des trois autres (22 s)

   Interface : reset(), pas(dt), alea(), noter(evt, e, plus) (journal de 72-ennemis), etat(), stats, forcer(type) (bancs :
   naissance immédiate, en aventure seulement). */
N.serpents = (function () {
  'use strict';
  var O = N.outils;
  var PLAN = {                                       // → N.R
    2: [{ t: 9, type: 'tique' }, { t: 15, type: 'tique' }],
    3: [{ t: 8, type: 'voleur' }, { t: 26, type: 'tique' }],
    4: [{ t: 8, type: 'brouilleur' }, { t: 24, type: 'miroir' }],
    5: [{ t: 7, type: 'miroir' }, { t: 22, parmi: ['voleur', 'brouilleur', 'tique'] }]
  };
  var MAX = 2, PORTAIL = 0.9, MARGE = 30, DIST_TETE = 90;
  var NOMS = { tique: 'TIQUE', voleur: 'VOLEUR', miroir: 'MIROIR', brouilleur: 'BROUILLEUR' };
  /* la règle en une ligne (24 signes au plus : elle tient en portrait) */
  var REGLES = { tique: 'TIQUE : ÉCRASE-LA', voleur: 'VOLEUR : ABATS-LE VITE', miroir: 'MIROIR : BOUCLE SUR LUI',
    brouilleur: 'BROUILLEUR : FONCE DEDANS' };
  var st = { vague: -1, entrees: -1, file: [], vus: {} };
  var stats = { naissances: {}, morts: {}, evts: {}, journal: [] };

  /* ---- le générateur propre ---- */
  var etatAlea = 0x2975;
  function alea() {
    etatAlea = (etatAlea + 0x6D2B79F5) | 0;
    var t = Math.imul(etatAlea ^ (etatAlea >>> 15), 1 | etatAlea);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function graine(n, k) { etatAlea = (Math.imul(0x2975, 0x9E3779B1) ^ Math.imul(n + 1, 0x85EBCA6B) ^ Math.imul(k + 7, 0xC2B2AE35)) | 0; }

  function enAventure() { return !!(N.aventure && N.aventure.enCours && N.aventure.enCours()); }
  function reset() { st.vague = -1; st.entrees = -1; st.file.length = 0; graine(0, 0); }

  /* une vague commence (ou recommence) : sa file de serpents, tirée une fois pour toutes */
  function planifier(n, ent) {
    st.vague = n; st.entrees = ent; st.file.length = 0;
    graine(n, ent);
    var p = PLAN[n] || [];
    for (var i = 0; i < p.length; i++) {
      var type = p[i].type || p[i].parmi[(alea() * p[i].parmi.length) | 0];
      st.file.push({ t: p[i].t, type: type });
    }
  }
  function vivants() {
    var L = N.ennemis.list, n = 0;
    for (var i = 0; i < L.length; i++) if (L[i]._serpent && !L[i]._dead) n++;
    return n;
  }
  /* un point au-delà d'un bord de la vue, dans l'arène, loin de la tête (72-ennemis le recule encore s'il le faut) */
  function point() {
    var V = O.VUE, A = O.A, P = N.joueuse.tete, k, x, y;
    for (k = 0; k < 32; k++) {
      var cote = (alea() * 4) | 0, u = alea(), m = MARGE + alea() * 40;
      if (cote === 0) { x = V.x - m; y = V.y + u * V.h; }
      else if (cote === 1) { x = V.x + V.w + m; y = V.y + u * V.h; }
      else if (cote === 2) { x = V.x + u * V.w; y = V.y - m; }
      else { x = V.x + u * V.w; y = V.y + V.h + m; }
      x = O.clamp(x, A.x0 + 20, A.x1 - 20); y = O.clamp(y, A.y0 + 20, A.y1 - 20);
      if (x > V.x - 24 && x < V.x + V.w + 24 && y > V.y - 24 && y < V.y + V.h + 24) continue;
      if (O.d2(x, y, P.x, P.y) < DIST_TETE * DIST_TETE) continue;
      return { x: x, y: y };
    }
    return null;
  }
  /* l'annonce : son nom en étiquette à chaque naissance ; à la première rencontre, la règle en toast (les bannières sont
     rationnées par le HUD, une toutes les 10 s, et celles qui attendent trop sont jetées : on ne compte pas sur elles) */
  function annoncer(type) {
    if (!N.hud) return;
    if (N.hud.tag) O.safe('hud.tag', function () { N.hud.tag(NOMS[type]); });
    if (!st.vus[type]) {
      st.vus[type] = true;
      if (N.hud.toast) O.safe('hud.toast', function () { N.hud.toast(REGLES[type]); });
    }
    O.sfx('portail');
  }
  function naitre(type) {
    var p = point();
    if (!p) return null;
    var e = N.ennemis.spawn(type, p.x, p.y, { portail: PORTAIL, alea: alea });
    if (e) annoncer(type);
    return e;
  }

  function pas(dt) {
    if (!enAventure()) return;                                    // hors aventure : rien, pas même un tirage
    if (!N.dir || !N.dir.vague || !N.game || !N.ennemis || !N.joueuse) return;
    var n = N.dir.vague(), ent = N.dir.entrees ? N.dir.entrees() : 0;
    if (ent < st.entrees) st.vus = {};                            // une nouvelle partie : les premières rencontres reviennent
    if (n !== st.vague || ent !== st.entrees) planifier(n, ent);
    if (!st.file.length) return;
    if (N.game.etat() !== 'jeu' || N.dir.phase() !== 'vague') return;
    var rp = N.dir.respiration ? N.dir.respiration() : null;
    if (rp && rp.active) return;
    if (N.ennemis.inversion && N.ennemis.inversion() > 0) return;
    if (N.joueuse.etat !== 'vivant') return;
    var q = st.file[0];
    if (N.dir.tempsVague() < q.t || vivants() >= MAX) return;
    if (naitre(q.type)) st.file.shift();
  }

  /* le journal des serpents, tenu par 72-ennemis (naissance, accroche, morsure, vol, alerte, evade, brouille, mort…) */
  function noter(evt, e, plus) {
    var t = e.type, k = t + ':' + evt;
    stats.evts[k] = (stats.evts[k] || 0) + 1;
    if (evt === 'naissance') stats.naissances[t] = (stats.naissances[t] || 0) + 1;
    if (evt === 'mort') {
      var m = stats.morts[t] || (stats.morts[t] = {}), c = plus ? (plus.genre + ':' + plus.type) : '?';
      m[c] = (m[c] || 0) + 1;
    }
    if (evt !== 'avale' && stats.journal.length < 400) {
      var j = { t: +(O.T.t || 0).toFixed(2), type: t, id: e.id, evt: evt, vague: st.vague }, V = O.VUE;
      if (evt === 'naissance') { j.x = Math.round(e.x); j.y = Math.round(e.y); j.dansVue = e.x > V.x && e.x < V.x + V.w && e.y > V.y && e.y < V.y + V.h; }
      stats.journal.push(j);
    }
  }

  return {
    reset: reset, pas: pas, alea: alea, noter: noter, stats: stats,
    etat: function () { return { aventure: enAventure(), vague: st.vague, entrees: st.entrees, file: st.file.slice(), vus: Object.keys(st.vus), vivants: N.ennemis ? vivants() : 0 }; },
    forcer: function (type) { return enAventure() && NOMS[type] ? naitre(type) : null; },
    remiseStats: function () { stats.naissances = {}; stats.morts = {}; stats.evts = {}; stats.journal.length = 0; }
  };
})();

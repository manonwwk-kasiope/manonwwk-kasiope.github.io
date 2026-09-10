// Outils communs des tests d'acceptation G7 (première minute et courbe).
//
// HARNAIS. Les tests statistiques passent par le harnais VERSIONNÉ de l'audit,
// snake2030/tools/test/audit/sim-lib.mjs (avec audit/sim.mjs), comme la spec l'exige : c'est lui qui
// porte les trois pilotes ('passive', 'sloppy', 'dodge', 'dodge8') et les stratégies de cartes
// ('first', 'random', 'rarest', 'build:<axe>', 'greedy'). « dodge-greedy » se lit
// { pilot: 'dodge', cards: 'greedy' } : 'greedy' est une stratégie de CARTES, pas un pilote.
// tools/test/simlib.mjs est un autre fichier (pilote unique) : il ne sait pas jouer 'sloppy' ni
// 'passive', il n'est donc pas utilisable ici.
//
// CONVENTION DE TEMPS (spec G7, test 1, valable pour TOUS les tests). S.t est l'horloge de la PAGE :
// il n'existe aucune écriture « S.t = » dans src/*.js, seulement « S.t += raw × 1000 », et resetRun ne
// le remet pas à zéro. Le harnais enchaîne les parties dans la MÊME page. Tout temps de partie se lit
// donc S.t − S.t relevé au démarrage de la partie, c'est-à-dire L.t0 du harnais (sim-lib.mjs:137).
// Lire S.t brut compterait le menu et les parties précédentes.
//
// CE QUE MESURE L'INSTRUMENTATION (window.__G7, posée UNE fois par page, après le pilote du harnais) :
//  - ouvertures d'écran de cartes : temps, S.lvlUps, cartes offertes (id, axe, rareté), état S.up des
//    huit armes AU MOMENT DU TIRAGE (c'est la définition d'« arme neuve »), S.cardsTaken, carte prise ;
//  - une mesure PAR IMAGE, posée en enveloppant __M.ui.hud, c'est-à-dire à la FIN de l'image, après
//    toute la mise à jour du jeu (frame() appelle ui.hud() en dernier, src/90-boot.js) : images de jeu,
//    images avec S.mult > 1,01 (le seuil de l'interface, src/26-ui.js:1382), maximum de S.mult,
//    franchissements ASCENDANTS des paliers 2/4/8/12/16, part de temps en boost, part de temps jauge
//    d'ultime pleine, et l'ATTRIBUTION des points d'ultime (kill / boost / autre) demandée par QO-1 ;
//  - les appels de son : __M.audio.sfx est enveloppé DEPUIS LA PAGE, seule façon de voir 'multUp'
//    (audio.stats() rapporte 0 dans le harnais : AudioContext supprimé, S.opt.sfx = false, et sfx sort
//    avant _audAllow, src/21-audio.js:1107 et 105) ; __M.audio.ultimate est enveloppé pour compter les
//    ultimes réellement partis (useUlt l'appelle après ses deux gardes, src/90-boot.js:320-324).
//
// L'aléa du PILOTE (Math.random, sim-lib.mjs) est rendu déterministe par graine : le jeu, lui,
// n'appelle jamais Math.random (contrat des modules), donc cette substitution ne touche pas le jeu.
import { launchSim as _launchSim, runOne as _runOne, reinject } from '../audit/sim-lib.mjs';

export const URL = process.env.S2030_URL || 'http://127.0.0.1:8112/snake2030/index.html';

/** Liste de survie (spec G7, correction G7-5) : ids explicites. capDamage en est exclue de fait
 *  (req() exige growth ≥ 3 ou f_shield ≥ 2, src/24-upgrades.js:508 : impossible au premier écran). */
export const SURVIE = ['growth', 'shield', 'regen', 'iframes', 'pickHeal'];
/** Les huit armes (_WPN_IDS, src/23-weapons.js:141). « neuve » = (S.up[id] | 0) === 0 au tirage,
 *  ce qui exclut par construction frontCannon (resetRun le pose à 1 ou 2, src/90-boot.js:903).
 *  drones et shockwave portent axis 'fort' mais sont des ARMES : jamais des cartes de survie. */
export const ARMES = ['frontCannon', 'sideTurrets', 'tailLaser', 'arcLightning', 'missiles', 'drones', 'shockwave', 'tailMines'];
/** Paliers du multiplicateur (spec : ×2 / ×4 / ×8 / ×12, plus ×16 là où le plafond est 16). */
export const PALIERS = [2, 4, 8, 12, 16];

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------ statistiques */
export function median(a) {
  const b = a.filter(v => v != null).slice().sort((x, y) => x - y);
  if (!b.length) return null;
  return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
}
/** Médiane d'un échantillon CENSURÉ : les valeurs manquantes (partie sans carte, sans ultime) sont
 *  poussées à l'infini au lieu d'être jetées. Jeter les manquantes flatterait la mesure — une
 *  campagne où la moitié des parties ne voit aucune carte aurait une « médiane de première carte »
 *  calculée sur la moitié qui en voit. */
export function medianCensuree(a) {
  const b = a.map(v => (v == null || !isFinite(v)) ? Infinity : v).sort((x, y) => x - y);
  if (!b.length) return null;
  const m = b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
  return isFinite(m) ? m : Infinity;
}
export function pct(n, d) { return d ? +(100 * n / d).toFixed(2) : 0; }
/** Affichage JSON d'une valeur censurée : JSON.stringify(Infinity) donne null, ce qui se confond avec
 *  « non mesuré ». On écrit la chaîne 'infini' à la place — les comparaisons, elles, se font sur le nombre. */
export function aff(v) { return v == null ? null : (isFinite(v) ? v : 'infini'); }
export function r1(v) { return v == null || !isFinite(v) ? v : +v.toFixed(1); }
export function r2(v) { return v == null || !isFinite(v) ? v : +v.toFixed(2); }

/* --------------------------------------------------- instrumentation page */
export const INSTR_SRC = `
(function(){
  if (window.__G7) return;
  var S = window.__S, M = window.__M;
  var WPN = ${JSON.stringify(ARMES)};
  var PAL = ${JSON.stringify(PALIERS)};
  var G = window.__G7 = {};

  /* aléa du PILOTE rendu déterministe (le jeu n'appelle jamais Math.random : contrat des modules) */
  var rs = 1;
  Math.random = function(){
    rs |= 0; rs = (rs + 0x6D2B79F5) | 0;
    var t = Math.imul(rs ^ (rs >>> 15), 1 | rs);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  G.reset = function(seed){
    rs = (seed | 0) || 1;
    G.t0 = null; G.frames = 0; G.playFrames = 0; G.multFrames = 0; G.multMax = 1;
    G.prevMult = null; G.prevUlt = null; G.prevKills = null;
    G.cross = {}; for (var i = 0; i < PAL.length; i++) G.cross[PAL[i]] = 0;
    G.sfx = {}; G.multUp = []; G.ultFires = []; G.opens = [];
    G.tr = {}; G.boostFrames = 0; G.fullFrames = 0;
    G.uKill = 0; G.uBoost = 0; G.uAutre = 0;
    /* ATTRIBUTION BRUTE DE LA JAUGE D'ULTIME (protocole QO-1 de la spec). Les trois compteurs
       ci-dessus lisent la VARIATION de S.ult, qui est écrêtée par Math.min(S.ultMax, …) : jauge
       pleine, une élite n'ajoute rien et n'apparaît nulle part. Les quatre compteurs ci-dessous
       lisent la SOURCE, sans écrêtage, par le son que le jeu joue lui-même — 'kill' pour un kill
       ordinaire, 'bigkill' pour une élite (src/10-core.js:568), 'core' pour un cœur
       (src/10-core.js:912) — et par le pas de boost pour le reste. C'est la seule lecture qui
       répond à « si boost et élites dépassent à eux seuls 200 pt/min ». */
    G.sOrd = 0; G.sElite = 0; G.sCore = 0; G.sBoost = 0; G.nOrd = 0; G.nElite = 0; G.nCore = 0;
    G.srcSinceTick = 0; G._scoreSeen = null;
    G.firstFull = null;
    G.hud = []; G.hudLog = false; G.tickErr = null;
    G.multUpSinceTick = 0; G.crossSinceTick = 0; G.crossTotal = 0; G.desaccords = 0; G.desaccordsEx = [];
  };

  /* Échantillonnage du multiplicateur SOUS L'IMAGE. Compter les franchissements entre deux fins
     d'image ne suffit pas : avec la règle « un coup divise le combo par deux et recalcule mult dans
     la même image », mult peut monter au-dessus d'un palier PUIS retomber avant la fin de l'image —
     le son est légitimement parti, et un compteur posé aux frontières d'image ne voit rien. Mesuré :
     3 images sur 20 parties dans ce cas, soit 3 faux écarts. On échantillonne donc aussi à CHAQUE
     appel de son : killEnemy écrit combo et mult en premier (src/10-core.js:503-508) puis joue
     'kill'/'bigkill' (src/10-core.js:568), et hurtSnake joue 'hurt' après avoir touché au combo
     (src/10-core.js:394) — les deux seuls endroits qui font bouger mult sont donc encadrés. */
  function sample(){
    var pm = G.prevMult == null ? S.mult : G.prevMult, n = 0;
    for (var i = 0; i < PAL.length; i++) { var p = PAL[i]; if (pm < p && S.mult >= p) { G.cross[p]++; n++; } }
    G.crossTotal += n; G.crossSinceTick += n;
    G.prevMult = S.mult;
    return n;
  }

  function bucket(){
    var k = G.t0 == null ? 0 : Math.floor((S.t - G.t0) / 60000);
    var b = G.tr[k];
    if (!b) b = G.tr[k] = { frames: 0, mult: 0, boost: 0, full: 0, uKill: 0, uBoost: 0, uAutre: 0, kills: 0,
      sOrd: 0, sElite: 0, sCore: 0, sBoost: 0, nOrd: 0, nElite: 0, nCore: 0 };
    return b;
  }

  /* posée en fin d'image : frame() appelle ui.hud() en dernier, après toute la mise à jour */
  function tick(){
    var s = S.snake; if (!s) return;
    G.frames++;
    var play = S.phase === 'play' && !S.paused;
    if (play && G.t0 == null) G.t0 = S.t;
    if (G.t0 == null) return;
    var b = bucket();
    if (play) {
      G.playFrames++; b.frames++;
      if (S.mult > 1.01) { G.multFrames++; b.mult++; }
      if (S.mult > G.multMax) G.multMax = S.mult;
      if (s.boosting) { G.boostFrames++; b.boost++; }
      if (S.ult >= S.ultMax) { G.fullFrames++; b.full++; if (G.firstFull == null) G.firstFull = S.t; }
    }
    /* franchissements ASCENDANTS de palier de cette image (échantillons de sous-image compris),
       comparés aux sons 'multUp' émis PENDANT cette image */
    var pmImg = G.prevMult;
    sample();
    var emis = G.multUpSinceTick, nc = G.crossSinceTick;
    G.multUpSinceTick = 0; G.crossSinceTick = 0;
    if (emis !== nc) {
      G.desaccords++;
      if (G.desaccordsEx.length < 20) G.desaccordsEx.push({ f: G.frames, t: Math.round(S.t), emis: emis,
        franchis: nc, multAvant: pmImg, mult: S.mult, combo: S.combo, phase: S.phase });
    }
    var u = S.ult, pu = G.prevUlt == null ? u : G.prevUlt;
    var kk = S.kills, pk = G.prevKills == null ? kk : G.prevKills;
    var du = u - pu, dk = kk - pk;
    if (du > 0) {
      if (dk > 0) { G.uKill += du; b.uKill += du; }
      else if (s.boosting) { G.uBoost += du; b.uBoost += du; }
      else { G.uAutre += du; b.uAutre += du; }
    }
    /* source « boost » : la hausse de jauge d'une image où AUCUN son de kill, d'élite ni de cœur n'a
       été joué ne peut venir que du pas de boost (src/10-core.js:288) — seule autre source de S.ult. */
    if (du > 0 && (G.srcSinceTick | 0) === 0) { G.sBoost += du; b.sBoost += du; }
    G.srcSinceTick = 0; G._scoreSeen = S.score;
    if (dk > 0) b.kills += dk;
    G.prevUlt = u; G.prevKills = kk;
    if (G.hudLog) G.hud.push({ f: G.frames, t: Math.round(S.t), ph: S.phase, combo: S.combo,
      mult: S.mult, multT: Math.round(S.multT), len: s.len, inv: Math.round(s.invuln), kills: S.kills });
  }

  var prevHud = M.ui.hud;
  M.ui.hud = function(){ try { tick(); } catch(e) { G.tickErr = String(e && e.message || e); } return prevHud.apply(this, arguments); };

  /* enveloppe posée APRÈS celle du harnais : elle journalise puis délègue */
  var prevShow = M.ui.showCards;
  M.ui.showCards = function(cards, cb){
    var up = {}; for (var i = 0; i < WPN.length; i++) up[WPN[i]] = (S.up[WPN[i]] | 0);
    var rec = { t: S.t, lvlUps: S.lvlUps, n: cards.length, up: up, picked: null,
      offered: cards.map(function(c){ return { id: c.id, axis: c.axis, rarity: c.rarity }; }),
      cardsTaken: (S.cardsTaken === undefined ? null : (S.cardsTaken | 0)),
      xp: S.xp, xpNext: S.xpNext, kills: S.kills, len: S.snake ? S.snake.len : null, level: S.level };
    G.opens.push(rec);
    return prevShow.call(this, cards, function(id){
      rec.picked = id;
      var r = cb.apply(this, arguments);
      rec.lvlUpsApres = S.lvlUps;
      rec.cardsTakenApres = (S.cardsTaken === undefined ? null : (S.cardsTaken | 0));
      return r;
    });
  };

  var A = M.audio;
  if (A && typeof A.sfx === 'function') {
    var prevSfx = A.sfx;
    A.sfx = function(name, opts){
      G.sfx[name] = (G.sfx[name] | 0) + 1;
      sample();                         // échantillon de sous-image, avant de compter le son
      /* attribution BRUTE, par le chemin du jeu : le son est joué dans killEnemy juste après
         l'écriture de S.ult, avec le même e.elite (src/10-core.js:546 et 568). */
      if (name === 'kill' || name === 'bigkill' || name === 'core') {
        /* 'core' est joué DEUX fois dans grabPickup : par le cœur, qui donne 20 points de jauge
           (src/10-core.js:908-912), et par la trousse 'heal', qui n'en donne aucun
           (src/10-core.js:914-917). Le cœur est le seul des deux à faire addScore(60) : on ne
           compte donc un cœur que si le score a monté depuis le son précédent. */
        var bb = bucket(), sc = S.score, monte = G._scoreSeen == null || sc > G._scoreSeen;
        if (name === 'bigkill') { G.sElite += 22; bb.sElite += 22; G.nElite++; bb.nElite++; G.srcSinceTick = (G.srcSinceTick | 0) + 1; }
        else if (name === 'core') { if (monte) { G.sCore += 20; bb.sCore += 20; G.nCore++; bb.nCore++; G.srcSinceTick = (G.srcSinceTick | 0) + 1; } }
        else { var v = 6 * Math.sqrt(12 / Math.max(12, S.xpNext)); G.sOrd += v; bb.sOrd += v; G.nOrd++; bb.nOrd++; G.srcSinceTick = (G.srcSinceTick | 0) + 1; }
      }
      G._scoreSeen = S.score;
      if (name === 'multUp') {
        G.multUpSinceTick++;
        if (G.multUp.length < 400) G.multUp.push({ t: Math.round(S.t), f: G.frames, mult: S.mult, combo: S.combo });
      }
      return prevSfx.apply(this, arguments);
    };
  }
  if (A && typeof A.ultimate === 'function') {
    var prevUlt = A.ultimate;
    A.ultimate = function(){ G.ultFires.push({ t: Math.round(S.t), f: G.frames }); return prevUlt.apply(this, arguments); };
  }

  G.dump = function(){
    return { t0: G.t0, frames: G.frames, playFrames: G.playFrames, multFrames: G.multFrames,
      multMax: G.multMax, cross: G.cross, sfx: G.sfx, multUp: G.multUp, ultFires: G.ultFires,
      opens: G.opens, tr: G.tr, boostFrames: G.boostFrames, fullFrames: G.fullFrames,
      uKill: G.uKill, uBoost: G.uBoost, uAutre: G.uAutre, tickErr: G.tickErr,
      sOrd: G.sOrd, sElite: G.sElite, sCore: G.sCore, sBoost: G.sBoost,
      nOrd: G.nOrd, nElite: G.nElite, nCore: G.nCore, firstFull: G.firstFull,
      crossTotal: G.crossTotal, desaccords: G.desaccords, desaccordsEx: G.desaccordsEx,
      cardsTaken: (S.cardsTaken === undefined ? null : (S.cardsTaken | 0)) };
  };

  G.reset(1);
})();
`;

/** Ouvre une page de simulation instrumentée. profil : 'phone' (iPhone 13 paysage, profil de référence
 *  de la campagne d'audit) ou 'desk' (1440×900). */
export async function ouvrir(profil = 'phone') {
  const sim = await _launchSim(profil);
  const errors = [];
  sim.errors = errors;
  sim.page.on('pageerror', e => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 200)));
  sim.page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  if (URL !== 'http://127.0.0.1:8112/snake2030/index.html') {
    await sim.page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await sim.page.waitForFunction(() => window.__S && window.__M && window.__M.ui, null, { timeout: 30000 });
    await reinject(sim.page);
  }
  await sim.page.evaluate(INSTR_SRC);
  sim.errCount = () => sim.page.evaluate(() => (window.__ERR && typeof window.__ERR.count === 'number') ? window.__ERR.count : null);
  sim.close = async () => { try { await sim.browser.close(); } catch (e) {} };
  return sim;
}

/** Joue UNE partie instrumentée et rend { L, G, r }.
 *  L = journal du harnais (cards, hits, ults, levels, samples…), G = relevé de window.__G7,
 *  r = état final. Les temps de L et de G.opens sont ABSOLUS (S.t) : ils se lisent relativement à L.t0. */
export async function partie(page, cfg = {}) {
  const { seed = 1, ...rest } = cfg;
  await page.evaluate(sd => {
    window.__SEED = sd;          // graine de partie imposée (lue par resetRun, G1)
    window.__DT = 1 / 60;        // pas de temps imposé : une image = 16,7 ms de jeu
    window.__G7.reset(sd);
  }, seed);
  const r = await _runOne(page, rest);
  const G = await page.evaluate(() => window.__G7.dump());
  const L = r.L;
  const t0 = L.t0 != null ? L.t0 : (G.t0 != null ? G.t0 : 0);
  const dur = (L.tEnd != null ? L.tEnd : t0) - t0;
  return { r, L, G, t0, dur, aborted: !!L.aborted };
}

/** Comme partie(), avec UNE reprise : si la page se bloque (le harnais de l'audit connaît ce cas et le
 *  traite lui aussi par un rechargement), on recharge, on réinjecte pilote et instrumentation, et on
 *  rejoue la même graine. Un incident est journalisé dans sim.incidents ; un second échec remonte. */
export async function partieSure(sim, cfg = {}) {
  try { return await partie(sim.page, cfg); }
  catch (e) {
    sim.incidents = sim.incidents || [];
    sim.incidents.push(String(e && e.message || e).slice(0, 200));
    await sim.page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await sim.page.waitForFunction(() => window.__S && window.__M && window.__M.ui, null, { timeout: 30000 });
    await reinject(sim.page);
    await sim.page.evaluate(INSTR_SRC);
    return await partie(sim.page, cfg);
  }
}

export { _launchSim as launchSimBrut, _runOne as runOneBrut };

/** Démarre une partie SANS attendre la mort (pour les mesures qui doivent intervenir en cours de jeu).
 *  Même chemin que le harnais : réglages, journal, puis appui sur le bouton JOUER/REJOUER de l'interface. */
export async function demarrer(page, cfg = {}) {
  const { diff = 1, pilot = 'passive', cards = 'first', maxT = 600000, seed = 1 } = cfg;
  await page.evaluate(({ diff, pilot, cards, maxT, seed }) => {
    const S = window.__S, M = window.__M;
    S.opt.diff = [1.25, 1.55, 1.9, 2.3, 2.75][diff];
    S.opt.music = false; S.opt.sfx = false; S.opt.haptics = false;
    S.stats.unlocks = {};
    window.__SEED = seed; window.__DT = 1 / 60;
    window.__P = { pilot, cards, maxT, joy: false, keys: null };
    window.__L = { cards: [], hits: [], levels: [], boss: [], ults: [], powers: [], phases: [], specials: [], samples: [], lastSample: -1e9, aborted: false };
    if (window.__G7) window.__G7.reset(seed);
    const btns = Array.from(document.querySelectorAll('#ui button'))
      .filter(b => /^(JOUER|REJOUER)$/.test(b.textContent.trim()) && b.offsetParent !== null);
    if (!btns.length) throw new Error('bouton JOUER introuvable, écran=' + M.ui.screen() + ' phase=' + S.phase);
    btns[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  }, { diff, pilot, cards, maxT, seed });
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 15000 });
}

/** Temps relatifs (ms de temps de partie) des ouvertures d'écran de cartes. */
export function tempsCartes(p) { return p.G.opens.map(o => o.t - p.t0); }
/** Temps relatifs des ultimes réellement partis. */
export function tempsUltimes(p) { return p.G.ultFires.map(u => u.t - p.t0); }
/** Coups reçus (chutes de longueur hors pliage, journal du harnais), en temps relatif. */
export function tempsCoups(p) { return p.L.hits.map(h => h.t - p.t0); }

/** Premier écran : contient-il ≥ 1 carte de survie et ≤ 1 arme neuve ? */
export function analyseEcran(open) {
  const ids = open.offered.map(o => o.id);
  const survie = ids.filter(id => SURVIE.indexOf(id) >= 0);
  const armesNeuves = ids.filter(id => ARMES.indexOf(id) >= 0 && (open.up[id] | 0) === 0);
  return {
    offert: ids, survie, armesNeuves,
    conforme: survie.length >= 1 && armesNeuves.length <= 1,
    lvlUps: open.lvlUps, nCartes: open.n, picked: open.picked
  };
}

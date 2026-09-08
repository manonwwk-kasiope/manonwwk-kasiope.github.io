/* Banc d'essai : coût d'image à CONTENU CONSTANT, build courant CONTRE build de référence, dans la même
 * fenêtre de temps.
 *
 * Pourquoi ce script existe. La batterie comparait la « part d'images > 33 ms » d'une partie jouée par
 * un pilote automatique. Dès qu'un objectif change la façon dont le jeu se joue, ce pilote ne joue plus
 * la même partie : il tue moins, laisse plus d'ennemis en vie, et la mesure bouge sans qu'aucun pixel ne
 * coûte plus cher. Mesuré sur G5 (treillis au pas 165 au lieu de 330) : 67 virages en 60 s au lieu de 26,
 * 58 ennemis vivants au lieu de 31, part d'images longues 5 % → 14 %, alors qu'à scène identique le même
 * build rend aussi vite. Le banc supprime cette confusion : il fige la scène (population d'ennemis,
 * longueur du serpent, position, résolution, zoom, phase) et ne mesure plus que le coût de l'image.
 *
 * Pourquoi la référence est mesurée EN MÊME TEMPS et non lue dans un fichier. Le coût d'une image dépend
 * de la machine et de son état : le même build a donné 28,4 ms puis 21,2 ms à plat sur deux démarrages du
 * conteneur, et 6,7 puis 5,1 ms sur iPhone à deux minutes et à dix minutes du démarrage. Une référence
 * figée dans un fichier ne vaut que pour la machine et l'instant qui l'ont produite. Le banc tire donc le
 * build de référence de l'historique git (le dernier commit), le sert à côté du build courant, et mesure
 * les deux en alternance — référence, courant, courant, référence — pour que la dérive de la machine
 * s'annule. Ce qui est jugé est le RAPPORT courant / référence, pas une valeur absolue.
 *
 * Pourquoi sans limiteur de cadence, sur les deux profils. À 60 Hz le delta rAF vaut 16,7 ou 33,3 ms et
 * rien d'autre : sur iPhone, où une image coûte moins de 16,7 ms, la mesure se fige sur la cadence et ne
 * voit plus rien (un ralentissement de 30 % y passait inaperçu). Sans limiteur, le delta EST le coût de
 * l'image ; la question « tient-on 60 images par seconde ? » se lit alors directement : coût < 16,7 ms.
 *
 * Pourquoi chaque statistique est agrégée par son propre minimum. Une version antérieure choisissait UNE
 * série — celle dont la médiane était la plus basse — et publiait aussi le p95 de cette série. La médiane
 * était donc stabilisée par la sélection, le p95 ne l’était pas : il valait la queue d’une seule série de
 * 300 images, tirée au hasard parmi huit. La preuve est une expérience nulle, le MÊME build servi des deux
 * côtés : sur iphone/bascule-charge, le côté « référence » a publié un p95 de 10,6 ms et le côté
 * « courant » 12,9 ms, soit × 1,217 — au-delà du seuil de 1,15 alors qu’aucune ligne de code ne
 * différait. La dispersion nulle du p95 (au moins 22 %) dépassait la tolérance de la porte (15 %) : la
 * porte ne mesurait plus le build, elle tirait à pile ou face. Correction : médiane, p95 et p99 sont
 * chacun agrégés par leur propre minimum sur toutes les séries et toutes les passes, comme la médiane
 * l’était déjà. Les seuils (1,10 et 1,15) et la borne iPhone (16,7 ms) ne changent pas ; les séries de
 * p95 et leur étendue sont publiées dans le rapport pour que le bruit reste vérifiable.
 *
 * Ce que la correction ne règle pas, et qu’il faut savoir en lisant un rapport. Après correction, deux
 * expériences nulles de plus (même build des deux côtés, profil iPhone, quatre régimes) ne déclenchent
 * plus aucun échec, mais iphone/bascule-charge publie encore 1,127 puis 1,114 alors que rien ne diffère.
 * La dispersion nulle du p95 y reste donc de l’ordre de treize pour cent, contre quinze de tolérance :
 * sur CE régime la porte n’a presque plus de marge, une régression réelle de cinq pour cent ne s’y
 * distingue pas du bruit, et un rapport qui l’approche doit être relu plutôt que cru. Les trois autres
 * régimes tiennent entre 0,91 et 1,04. La cause est structurelle : le p95 d’une série de trois cents
 * images est sa quinzième pire image, une statistique intrinsèquement instable ; allonger les séries ne
 * la stabilise qu’en racine carrée. Le vrai remède est de calculer le p95 sur la RÉUNION des images de
 * toutes les séries d’un côté, soit deux mille quatre cents images, ce qui divise la dispersion par
 * environ deux et demi. Ce changement appartient à G13, l’objectif qui porte le coût d’image ; il n’est
 * pas fait ici pour ne pas déplacer l’instrument au milieu d’une médiation. En attendant, le critère qui
 * décide vraiment pour la joueuse est la borne absolue : sur iPhone, p95 ≤ 16,7 ms, tenue avec marge
 * (12,7 à 13,3 ms mesurés sur le régime le plus chargé).
 *
 * La scène est construite avec les seules API présentes dans tous les builds (window.__S, __M.phases
 * forcePhase / forceGrid / forceZoom / state, window.__SEED, window.__DT) pour qu'un build ancien et un
 * build neuf soient mesurés par le MÊME code. Chaque régime rapporte ses champs de contrôle (vue, zoom,
 * bascule, treillis, ennemis, résolution) : si les deux builds n'ont pas la même scène, ils ne sont pas
 * comparables et le banc le dit au lieu de comparer des chiffres sans rapport.
 *
 *   NODE_PATH=… node tools/test/banc.mjs
 * Variables : S2030_URL (build courant), S2030_BANC_REF (URL du build de référence ; par défaut le banc
 * écrit « git show HEAD:snake2030/index.html » dans snake2030/index-ref.html, le sert depuis le même
 * dossier que les mp3, et l'efface à la fin), S2030_BANC_FRAMES (1200, réparties sur S2030_BANC_REPETS
 * séries ; chaque statistique — médiane, p95, p99 — est agrégée par son propre minimum sur toutes les
 * séries et toutes les passes, le minimum étant la mesure la moins polluée par l'hôte), S2030_BANC_REPETS (4), S2030_BANC_PROFILES (« desk,iphone »),
 * S2030_BANC_PASSES (2 : ordre référence-courant puis courant-référence).
 * Seuils : par régime et par profil, p50 courant ≤ 1,10 × p50 référence et p95 courant ≤ 1,15 × p95
 * référence ; scène identique ; sur iPhone, p95 courant ≤ 16,7 ms (60 images par seconde tenues).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launchDesktop, launchPhone, startGame, frameStats, OUT, URL as CUR_URL, HERE } from './lib.mjs';

const FRAMES = +(process.env.S2030_BANC_FRAMES || 1200);
const REPETS = +(process.env.S2030_BANC_REPETS || 4);
const PASSES = +(process.env.S2030_BANC_PASSES || 2);
const PROFILS = (process.env.S2030_BANC_PROFILES || 'desk,iphone').split(',').map(s => s.trim()).filter(Boolean);
const SEUIL_P50 = 1.10, SEUIL_P95 = 1.15, IPHONE_60FPS_MS = 16.7;

const REGIMES = [
  { id: 'plat', kind: 'flat', n: 24 },
  { id: 'plat-treillis', kind: 'grid', n: 24 },
  { id: 'bascule', kind: 'dive', n: 24 },
  { id: 'bascule-charge', kind: 'dive', n: 48 },
];

/* ---------------------------------------------------------- référence --- */
const REPO = path.resolve(HERE, '..', '..', '..');
const REF_FILE = path.join(REPO, 'snake2030', 'index-ref.html');
let refUrl = process.env.S2030_BANC_REF || '';
let refTemp = false;
if (!refUrl) {
  const html = execFileSync('git', ['-C', REPO, 'show', 'HEAD:snake2030/index.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(REF_FILE, html);
  refTemp = true;
  refUrl = CUR_URL.replace(/index\.html(\?.*)?$/, 'index-ref.html');
}
const REF_COMMIT = (() => { try { return execFileSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (e) { return '?'; } })();

/* ------------------------------------------------------------- scène ---- */
/* Construit la scène et la maintient image par image. Tout est posé depuis le test : le jeu n'a aucun
   crochet dédié au banc. */
function poser({ kind, n }) {
  const S = window.__S, M = window.__M;
  /* Modèle d'ennemi CONSTRUIT depuis defs.chaser, pas prélevé dans la partie en cours : le calendrier des
     vagues change d'un objectif à l'autre, et cloner « le premier ennemi trouvé » comparait 24 mines d'un
     côté à 24 traqueurs de l'autre (mesuré : ×1,4 de faux écart). Le type retenu entre dans la clé de scène.
     Repli sur le clone si un build n'expose pas enemies.defs. */
  const D = M.enemies && M.enemies.defs, d = D && D.chaser;
  let tmpl, mtype;
  if (d) {
    const e = { id: 700000, type: 'chaser', x: 0, y: 0, vx: 0, vy: 0, ang: 0, t: 0, r: d.r || 14,
      hp: 1e9, maxHp: 1e9, dmg: d.dmg || 1, speed: d.speed || 60, score: d.score || 10, xp: d.xp || 1,
      color: d.color || '#ff2e63', elite: false, mod: null, dead: false, hitT: 0 };
    for (const k in d) if (!(k in e)) e[k] = d[k];
    if (d.init) d.init(e);
    tmpl = JSON.parse(JSON.stringify(e));
    mtype = 'defs:chaser';
  } else {
    const src = S.enemies.find(e => e.type === 'chaser') || S.enemies[0];
    if (!src) return { ok: false, why: 'aucun ennemi à cloner' };
    tmpl = JSON.parse(JSON.stringify(src));
    mtype = 'clone:' + (src.type || '?');
  }
  window.__BANCTYPE = mtype;
  const X = Math.round(window.__K.ARENA_W / 2), Y = Math.round(window.__K.ARENA_H / 2);
  const R0 = S.view.w * 0.13, DR = S.view.w * 0.058;      // rayons proportionnels à la vue : même image sur téléphone et sur bureau
  const models = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = R0 + (i % 6) * DR;
    const e = JSON.parse(JSON.stringify(tmpl));
    e.id = 700000 + i;
    e.x = X + Math.cos(a) * r; e.y = Y + Math.sin(a) * r;
    e.hp = 1e9; e.maxHp = 1e9; e.ang = a; e.t = i * 0.13; e.hitT = 0;
    models.push(e);
  }
  const path = [];
  for (let i = 0; i < 400; i++) path.push({ x: X - i * 4, y: Y });
  window.__BANC = { X, Y, models, path, kind };
  // résolution de rendu figée au cran 1 : sinon la qualité adaptative la fait descendre pendant la mesure
  // et deux mesures ne portent plus sur la même image. Le banc compare des builds, pas des réglages.
  S.opt.px = 1; S.pxEff = 1;
  if (kind === 'flat') M.phases.forcePhase(1);             // « espace » : ni treillis ni bascule
  else if (kind === 'grid') M.phases.forceGrid('ortho');   // treillis orthogonal permanent, à plat
  else M.phases.forcePhase(3);                             // « plongée » : treillis diagonal + bascule 30°
  M.phases.forceZoom(0);
  const tenir = () => {
    const S = window.__S, M = window.__M, P = window.__BANC;
    // la vitesse n'est PAS figée : elle pilote le recul de caméra, et la figer changerait le cadrage
    // d'un build à l'autre (la montée en vitesse n'est pas la même partout)
    S.snake.x = P.X; S.snake.y = P.Y; S.snake.ang = 0; S.snake.boosting = false;
    S.snake.boostE = S.snake.boostMax; S.snake.invuln = 1e9; S.snake.ghost = 1e9;
    S.snake.len = 30; S.snake.hp = S.snake.maxHp;
    S.snake.path = P.path.map(o => ({ x: o.x, y: o.y }));
    S.cam.x = P.X; S.cam.y = P.Y;
    S.enemies.length = 0;
    for (const m of P.models) S.enemies.push(JSON.parse(JSON.stringify(m)));
    S.bullets.length = 0; S.ebullets.length = 0; S.pickups.length = 0;
    if (S.drones) S.drones.length = 0;
    S.pxEff = 1; S.partEff = 1; S.paused = false;
    if (P.kind === 'dive' && M.phases.state().diagT < 3) M.phases.forcePhase(3);   // le treillis de plongée expire au bout de 22 s
    window.__BANCF = (window.__BANCF || 0) + 1;
    requestAnimationFrame(tenir);
  };
  requestAnimationFrame(tenir);
  return { ok: true };
}

async function uneSerie(p, frames) {
  await p.evaluate(() => {
    window.__BL = []; let l = performance.now();
    if (window.__BLSTOP) window.__BLSTOP();
    let vivant = true; window.__BLSTOP = () => { vivant = false; };
    const t = () => { if (!vivant) return; const n = performance.now(); window.__BL.push(n - l); l = n; requestAnimationFrame(t); };
    requestAnimationFrame(t);
  });
  await p.waitForFunction(f => window.__BL.length >= f, frames, { timeout: 300000 });
  return p.evaluate(() => {
    const S = window.__S, s = window.__M.phases.state();
    window.__BLSTOP && window.__BLSTOP();
    return {
      dts: window.__BL.slice(30),
      scene: { vw: Math.round(S.view.w), vh: Math.round(S.view.h), zoom: +s.zoom.toFixed(2), persp: Math.round(s.perspDeg),
               grille: s.diagT > 0, enn: S.enemies.length, segs: S.snake.segs.length, px: S.pxEff, part: S.partEff,
               mtype: window.__BANCTYPE || '?',
               cw: document.getElementById('game').width, ch: document.getElementById('game').height },
      err: window.__ERR ? window.__ERR.count : -1,
    };
  });
}

async function unRegime(ctx, reg) {
  const p = ctx.page;
  const pose = await p.evaluate(poser, { kind: reg.kind, n: reg.n });
  if (!pose.ok) throw new Error('banc : ' + pose.why);
  await p.waitForTimeout(4000);                            // le zoom et la bascule s'installent
  /* Plusieurs séries : le minimum est la mesure la moins polluée par l’hôte, c’est la pratique en banc
     d’essai. Les étendues sont rapportées pour rester honnête sur le bruit. */
  const series = [];
  let o = null;
  for (let k = 0; k < REPETS; k++) {
    o = await uneSerie(p, Math.max(120, Math.round(FRAMES / REPETS)));
    series.push(frameStats(o.dts));
  }
  /* Chaque statistique est agrégée par SON PROPRE minimum. Prendre « le p95 de la série dont la médiane
     était la plus basse » revenait à comparer deux queues tirées au hasard : la médiane était stabilisée
     par la sélection, le p95 ne l'était pas et héritait de toute la dispersion d'une seule série de 300
     images. Mesuré à build identique des deux côtés (expérience nulle), ce choix faisait échouer la porte
     p95 sur iphone/bascule-charge (× 1,217) alors que rien n'avait changé. Le seuil, lui, ne bouge pas. */
  const st = series.reduce((a, b) => (b.p50 < a.p50 ? b : a));
  const min = f => +Math.min(...series.map(f)).toFixed(2);
  const r25 = v => Math.round(v / 25) * 25;
  const s = o.scene;
  return { p50: st.p50, p95: min(x => x.p95), p99: min(x => x.p99), pct33: min(x => x.pct33),
    series: series.map(x => x.p50), series95: series.map(x => x.p95),
    etendue: +(Math.max(...series.map(x => x.p50)) - Math.min(...series.map(x => x.p50))).toFixed(2),
    etendue95: +(Math.max(...series.map(x => x.p95)) - Math.min(...series.map(x => x.p95))).toFixed(2),
    scene: s, cle: `${r25(s.vw)}x${r25(s.vh)}/z${s.zoom.toFixed(2)}/p${s.persp}/g${s.grille ? 1 : 0}/e${s.enn}:${s.mtype || '?'}/c${s.cw}x${s.ch}/px${s.px}`, err: o.err };
}

/* Une session = un navigateur sur un build, les quatre régimes. */
async function uneSession(nom, url) {
  const args = ['--disable-frame-rate-limit', '--disable-gpu-vsync'];
  const ctx = nom === 'iphone' ? await launchPhone({ args, url }) : await launchDesktop(1440, 900, { unthrottled: true, url });
  const out = { regimes: {}, pageErrors: 0, consoleErrors: 0, errCount: 0 };
  try {
    await ctx.page.evaluate(() => { window.__SEED = 2030; window.__DT = 1 / 60; });
    await startGame(ctx, { seed: 2030 });
    await ctx.page.waitForFunction(() => window.__S.enemies.length > 0, null, { timeout: 25000 });
    for (const reg of REGIMES) out.regimes[reg.id] = await unRegime(ctx, reg);
    out.pageErrors = ctx.pageErrors.length; out.consoleErrors = ctx.consoleErrors.length;
    out.firstPageError = ctx.pageErrors[0] || null; out.firstConsoleError = ctx.consoleErrors[0] || null;
    out.errCount = Math.max(...REGIMES.map(r => out.regimes[r.id].err));
  } finally { await ctx.close(); }
  return out;
}

/* Fusion entre passes : même règle qu'entre séries, chaque statistique garde son propre minimum. */
const mieux = (a, b) => {
  if (!a) return b; if (!b) return a;
  const base = b.p50 < a.p50 ? b : a;
  return Object.assign({}, base, {
    p50: Math.min(a.p50, b.p50), p95: Math.min(a.p95, b.p95), p99: Math.min(a.p99, b.p99),
    pct33: Math.min(a.pct33, b.pct33),
    series: a.series.concat(b.series), series95: (a.series95 || []).concat(b.series95 || []),
    etendue: +Math.max(a.etendue, b.etendue).toFixed(2),
    etendue95: +Math.max(a.etendue95 || 0, b.etendue95 || 0).toFixed(2),
  });
};

async function unProfil(nom) {
  const best = { ref: {}, cur: {} };
  const erreurs = { ref: null, cur: null };
  for (let pass = 1; pass <= PASSES; pass++) {
    const ordre = pass % 2 ? ['ref', 'cur'] : ['cur', 'ref'];        // référence-courant puis courant-référence
    for (const b of ordre) {
      const s = await uneSession(nom, b === 'ref' ? refUrl : CUR_URL);
      erreurs[b] = { pageErrors: s.pageErrors, consoleErrors: s.consoleErrors, errCount: s.errCount, firstPageError: s.firstPageError, firstConsoleError: s.firstConsoleError };
      for (const reg of REGIMES) best[b][reg.id] = mieux(best[b][reg.id], s.regimes[reg.id]);
      console.log(`[banc] ${nom} passe ${pass} ${b === 'ref' ? 'référence' : 'courant  '} ` + REGIMES.map(r => `${r.id} ${String(s.regimes[r.id].p50).padStart(5)}`).join(' | '));
    }
  }
  const regimes = {}, fails = [];
  for (const reg of REGIMES) {
    const R = best.ref[reg.id], C = best.cur[reg.id];
    const meme = R.cle === C.cle;
    const r50 = +(C.p50 / R.p50).toFixed(3), r95 = +(C.p95 / R.p95).toFixed(3);
    regimes[reg.id] = { ref: R, cur: C, ratio50: r50, ratio95: r95, sceneIdentique: meme };
    if (!meme) fails.push(`${nom}/${reg.id} : scène différente (${C.cle} ≠ ${R.cle}) — mesures non comparables`);
    else {
      if (!(r50 <= SEUIL_P50)) fails.push(`${nom}/${reg.id} : p50 ${C.p50} ms contre ${R.p50} en référence (× ${r50} > ${SEUIL_P50})`);
      if (!(r95 <= SEUIL_P95)) fails.push(`${nom}/${reg.id} : p95 ${C.p95} ms contre ${R.p95} en référence (× ${r95} > ${SEUIL_P95})`);
    }
    if (nom === 'iphone' && !(C.p95 <= IPHONE_60FPS_MS)) fails.push(`iphone/${reg.id} : p95 ${C.p95} ms > ${IPHONE_60FPS_MS} — les 60 images par seconde ne sont pas tenues`);
    console.log(`[banc] ${nom} ${reg.id.padEnd(15)} référence p50 ${String(R.p50).padStart(5)} p95 ${String(R.p95).padStart(5)} | courant p50 ${String(C.p50).padStart(5)} p95 ${String(C.p95).padStart(5)} | × ${r50} / × ${r95} | ${meme ? 'même scène' : 'SCÈNE DIFFÉRENTE'} ${C.cle}`);
  }
  for (const b of ['ref', 'cur']) {
    const e = erreurs[b]; if (!e) continue;
    if (e.pageErrors) fails.push(`${nom}/${b} : ${e.pageErrors} pageerror (${e.firstPageError})`);
    if (e.consoleErrors) fails.push(`${nom}/${b} : ${e.consoleErrors} console.error (${e.firstConsoleError})`);
    if (e.errCount > 0) fails.push(`${nom}/${b} : __ERR.count = ${e.errCount}`);
  }
  return { regimes, erreurs, fails };
}

const measured = { cur: CUR_URL, ref: refUrl, refCommit: REF_COMMIT, frames: FRAMES, repets: REPETS, passes: PASSES, profils: {} };
let fails = [], code = 0;
try {
  for (const nom of PROFILS) {
    const r = await unProfil(nom);
    measured.profils[nom === 'iphone' ? 'iphone' : 'desk1440'] = r;
    fails.push(...r.fails);
  }
} catch (e) {
  measured.erreur = String(e && e.message || e);
  code = 2;
} finally {
  if (refTemp) { try { fs.unlinkSync(REF_FILE); } catch (e) {} }
}
measured.fails = fails;
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
fs.writeFileSync(path.join(OUT, 'banc.json'), JSON.stringify(measured, null, 1));
for (const f of fails) console.log('[banc] ÉCHEC :', f);
const pass = code === 0 && fails.length === 0;
console.log(JSON.stringify({ test: 'banc', pass, measured, threshold: `par régime et par profil, courant ≤ ${SEUIL_P50} × référence (p50) et ≤ ${SEUIL_P95} × référence (p95), scène identique ; iPhone p95 ≤ ${IPHONE_60FPS_MS} ms ; 0 pageerror, 0 console.error, __ERR.count 0 ; référence = commit ${REF_COMMIT}` }));
process.exit(code === 2 ? 2 : (pass ? 0 : 1));

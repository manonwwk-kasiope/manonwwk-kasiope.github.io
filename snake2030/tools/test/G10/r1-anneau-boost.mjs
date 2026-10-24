// G10 — réserve CONTESTÉE de G5 : « l'anneau du bouton boost ne rougit pas à la panne ».
//
// PROTOCOLE (celui versionné avec la réserve, complété par G10-18 de la spec) : la panne est produite
// PAR LE JEU — le doigt tient le bouton boost jusqu'à ce que la réserve tombe à zéro, et c'est le cœur
// (src/10-core.js) qui pose s.boostDry, s.boostDryT et joue le son. On capture ensuite le bouton
// pendant l'ÉCLAT (les 120 premières ms après boostDryT, où _uiDryOn rend vrai), puis le même bouton
// hors panne, et on compare canal par canal :
//   - couronne : anneau de 0,80 à 1,00 du rayon du bouton (l'arc de jauge y passe, r = 44/50)
//   - disque   : moins de 0,60 du rayon (le fond .trk, r = 36/50)
// L'éclat clignote (120 ms allumé, 120 éteint, deux fois). Pour capturer l'état ALLUMÉ sans tirer au
// hasard, boostDryT est ré-armé image par image depuis un crochet rAF : l'état affiché reste
// exactement celui des 120 premières ms de la panne, pas un état inventé.
//
// Ce script MESURE, il ne juge pas d'un seuil de la spec : aucun test de G10 ne le porte. Il sort 0
// dès que la mesure a pu être faite, et rapporte ce qu'il a vu.
//
// RELEVÉ AVANT CORRECTION (build de e67f3c1 + G10 sans la règle .s2b-boost.dry .arc) : couronne
// rouge − vert = 2,83, et son canal rouge PERDAIT 77,4 points par rapport au bouton hors panne —
// l'anneau ne rougissait pas, il s'éteignait, l'arc de jauge ayant une longueur nulle à réserve nulle
// (strokeDashoffset 259,2 sur une circonférence de 276,5). La réserve de G5 était donc FONDÉE pour
// l'anneau, et le correctif est un TRACÉ (arc complet le temps de l'éclat), pas une couleur : une
// couleur posée sur .arc n'aurait changé aucun pixel. Disque : rouge − vert = +91,5 dans les deux
// cas — lui rougissait déjà.
import { launchPhone, startGame, sleep, save, finish, deadline, touch } from '../lib.mjs';
import { shotClip, meanAnnulus, meanDisc } from '../px.mjs';

deadline(150, 'G10-r1');
const THRESH = 'mesure : écart rouge − vert de la couronne (0,80–1,00 R) et du disque (< 0,60 R) du bouton boost, en panne et hors panne';

const m = {};
const ctx = await launchPhone();
const { page, cdp } = ctx;
try {
  await startGame(ctx, { seed: 2030 });
  await sleep(1200);

  const rect = await page.evaluate(() => {
    const b = document.querySelector('.s2b-boost'), r = b.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  m.bouton = rect;

  /* --- référence : jauge pleine, pas de panne --- */
  await page.evaluate(() => { const s = window.__S.snake; s.boostE = s.boostMax; s.boostDryT = undefined; });
  await sleep(300);
  const clip = { x: rect.x - 6, y: rect.y - 6, width: rect.w + 12, height: rect.h + 12 };
  const imgRef = await shotClip(ctx, clip);
  const pr = imgRef.pr;
  const cx = (rect.x + rect.w / 2 - clip.x) * pr, cy = (rect.y + rect.h / 2 - clip.y) * pr;
  const R = (rect.w / 2) * pr;
  const lire = img => ({
    couronne: meanAnnulus(img, cx, cy, 0.80 * R, 1.00 * R),
    disque: meanDisc(img, cx, cy, 0.60 * R)
  });
  m.horsPanne = lire(imgRef);
  m.classesHorsPanne = await page.evaluate(() => document.querySelector('.s2b-boost').className);

  /* --- panne produite par le jeu : le doigt tient le bouton jusqu'à la réserve vide --- */
  const T = touch(cdp);
  const bx = rect.x + rect.w / 2, by = rect.y + rect.h / 2;
  await page.evaluate(() => { const s = window.__S.snake; s.boostE = 6; });   // on abrège l'attente, la panne reste celle du cœur
  await T.start([{ x: bx, y: by, id: 3 }]);
  let dry = false;
  for (let i = 0; i < 60 && !dry; i++) {
    await sleep(60);
    dry = await page.evaluate(() => !!(window.__S.snake && window.__S.snake.boostDry));
  }
  m.panneAtteinte = dry;
  m.etatPanne = await page.evaluate(() => {
    const s = window.__S.snake;
    return { boostE: s.boostE, boostDry: !!s.boostDry, boostDryT: s.boostDryT, t: window.__S.t };
  });
  // maintien de l'ÉCLAT : boostDryT ré-armé à chaque image (état des 120 premières ms)
  await page.evaluate(() => {
    window.__DRYHOLD = 1;
    (function loop() {
      if (!window.__DRYHOLD) return;
      const s = window.__S.snake;
      if (s) s.boostDryT = window.__S.t;
      requestAnimationFrame(loop);
    })();
  });
  await sleep(260);
  m.classesPanne = await page.evaluate(() => document.querySelector('.s2b-boost').className);
  m.arcPanne = await page.evaluate(() => {
    const a = document.querySelector('.s2b-boost .arc'), cs = getComputedStyle(a);
    return { dashoffset: a.style.strokeDashoffset, dasharray: a.getAttribute('stroke-dasharray'),
      stroke: cs.stroke, couleur: getComputedStyle(document.querySelector('.s2b-boost')).color };
  });
  const imgDry = await shotClip(ctx, clip);
  m.panne = lire(imgDry);
  await T.end([]);
  await page.evaluate(() => { window.__DRYHOLD = 0; });

  m.ecarts = {
    couronneRmoinsV_panne: +(m.panne.couronne.r - m.panne.couronne.g).toFixed(2),
    couronneRmoinsV_horsPanne: +(m.horsPanne.couronne.r - m.horsPanne.couronne.g).toFixed(2),
    disqueRmoinsV_panne: +(m.panne.disque.r - m.panne.disque.g).toFixed(2),
    disqueRmoinsV_horsPanne: +(m.horsPanne.disque.r - m.horsPanne.disque.g).toFixed(2),
    couronneDeltaRouge: +(m.panne.couronne.r - m.horsPanne.couronne.r).toFixed(2),
    disqueDeltaRouge: +(m.panne.disque.r - m.horsPanne.disque.r).toFixed(2)
  };
  m.conclusion = m.ecarts.couronneRmoinsV_panne > 12 && m.ecarts.couronneDeltaRouge > 6
    ? "la couronne du bouton boost rougit à la panne"
    : "la couronne du bouton boost ne rougit pas à la panne (seul le disque rougit)";
  m.erreurs = ctx.pageErrors.length;
} finally { await ctx.close(); }

save('G10-r1-anneau-boost.json', { pass: !!m.panneAtteinte, measured: m, threshold: THRESH });
console.log('[G10-r1]', m.conclusion, JSON.stringify(m.ecarts));
finish('G10-r1-anneau-boost', { pass: !!m.panneAtteinte, measured: m, threshold: THRESH });

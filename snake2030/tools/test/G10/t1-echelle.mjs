// G10 test 1 — l'interface suit la taille de l'écran.
//
// Trois fenêtres, styles relus au moins 300 ms après le redimensionnement.
//   2560×1440 : .s2score ≥ 56 px ; largeur RENDUE d'une .s2card ≥ 480 px ; JOUER height ≥ 120 px ;
//               .s2pause width ≥ 48 px ; largeur de .s2opt ≤ 820 px ; menu en colonne —
//               JOUER.top − logo.bottom ≤ 400 px ET |centre x JOUER − centre x logo| ≤ 8 px,
//               les deux rects relevés DANS LA MÊME IMAGE (une seule évaluation).
//   1280×720  : .s2score 30 ± 0,5 px, JOUER 320 ± 1 px × 78 ± 1 px.
//   iPhone 13 paysage : .s2score 17,16 ± 0,3 px (4,4 vh sur 390 px de haut ; jamais 17,00).
//
// Les gabarits sont lus par offsetWidth/offsetHeight, pas par getBoundingClientRect() : le curseur
// clavier de G4 applique scale(1,04) au bouton focalisé du menu et gonflerait JOUER à 332,8×81,1.
// Les positions relatives (logo / JOUER) restent des rects, le facteur commun s'y annule.
import { launchDesktop, launchPhone, sleep, save, finish, deadline } from '../lib.mjs';
import { LONGEST, profileScript, resize } from './g10lib.mjs';

deadline(150, 'G10-t1');
const THRESH = "2560×1440 : score ≥ 56 px, carte ≥ 480 px, JOUER ≥ 120 px, pause ≥ 48 px, .s2opt ≤ 820 px, "
  + "JOUER.top − logo.bottom ≤ 400 px, |Δcentre x| ≤ 8 px ; 1280×720 : score 30 ± 0,5, JOUER 320 ± 1 × 78 ± 1 ; "
  + "iPhone : score 17,16 ± 0,3";

const PROBE = (cards) => {
  const ui = document.getElementById('ui');
  const R = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right, cx: (r.left + r.right) / 2 }; };
  const fs = s => { const e = document.querySelector(s); return e ? +parseFloat(getComputedStyle(e).fontSize).toFixed(2) : null; };
  const big = document.querySelector('#ui .s2big'), logo = document.querySelector('.s2logo');
  const pause = document.querySelector('#ui .s2pause');
  // même image pour les deux rects : une seule évaluation, aucun await entre les deux lectures
  const rb = R(big), rl = R(logo);
  const cardEls = Array.from(document.querySelectorAll('.s2card')).filter(e => e.offsetParent !== null);
  const optEls = Array.from(document.querySelectorAll('.s2opt')).filter(e => e.offsetParent !== null);
  return {
    uis: +getComputedStyle(ui).getPropertyValue('--uis').trim(),
    innerH: window.innerHeight, innerW: window.innerWidth,
    scoreFs: fs('.s2score'),
    bigW: big.offsetWidth, bigH: big.offsetHeight,
    pauseW: pause.offsetWidth, pauseH: pause.offsetHeight,
    dyLogoBig: +(rb.top - rl.bottom).toFixed(2),
    dxCentre: +Math.abs(rb.cx - rl.cx).toFixed(2),
    menuDir: getComputedStyle(document.querySelector('.s2menu')).flexDirection,
    cardW: cardEls.length ? +Math.min(...cardEls.map(e => e.offsetWidth)).toFixed(2) : null,
    cardN: cardEls.length,
    optWmax: optEls.length ? +Math.max(...optEls.map(e => e.offsetWidth)).toFixed(2) : null,
    optN: optEls.length
  };
};

async function look(page) {
  // écran des cartes (trois descriptions les plus longues du jeu) puis réglages, puis retour au menu
  await page.evaluate(c => { window.__M.ui.showCards(c, () => {}); }, LONGEST);
  await sleep(500);
  const cards = await page.evaluate(PROBE, LONGEST);
  await page.evaluate(() => { window.__M.ui.showScreen('settings'); });
  await sleep(400);
  const set = await page.evaluate(PROBE, LONGEST);
  await page.evaluate(() => { window.__M.ui.showScreen('menu'); });
  await sleep(400);
  const menu = await page.evaluate(PROBE, LONGEST);
  return { menu, cards: cards, settings: set };
}

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

{
  const ctx = await launchDesktop(2560, 1440, { ctx: {}, init: [profileScript()] });
  try {
    await sleep(600);
    await resize(ctx.page, 2560, 1440);
    m.d2560 = await look(ctx.page);
    const M = m.d2560.menu, C = m.d2560.cards, S = m.d2560.settings;
    dit(M.scoreFs >= 56, `2560×1440 : .s2score ${M.scoreFs} px < 56`);
    dit(C.cardW >= 480, `2560×1440 : .s2card ${C.cardW} px < 480 (n=${C.cardN})`);
    dit(M.bigH >= 120, `2560×1440 : JOUER height ${M.bigH} px < 120`);
    dit(M.pauseW >= 48, `2560×1440 : .s2pause width ${M.pauseW} px < 48`);
    dit(S.optWmax !== null && S.optWmax <= 820, `2560×1440 : .s2opt ${S.optWmax} px > 820 (n=${S.optN})`);
    dit(M.menuDir === 'column', `2560×1440 : .s2menu flex-direction ${M.menuDir} au lieu de column`);
    dit(M.dyLogoBig <= 400, `2560×1440 : JOUER.top − logo.bottom = ${M.dyLogoBig} px > 400`);
    dit(M.dxCentre <= 8, `2560×1440 : |Δcentre x logo/JOUER| = ${M.dxCentre} px > 8`);
    m.d2560.erreurs = ctx.pageErrors.length;
    dit(ctx.pageErrors.length === 0, `2560×1440 : ${ctx.pageErrors.length} erreur(s) de page`);
  } finally { await ctx.close(); }
}
{
  const ctx = await launchDesktop(1280, 720, { init: [profileScript()] });
  try {
    await sleep(600);
    m.d1280 = await look(ctx.page);
    const M = m.d1280.menu;
    dit(Math.abs(M.scoreFs - 30) <= 0.5, `1280×720 : .s2score ${M.scoreFs} px hors de 30 ± 0,5`);
    dit(Math.abs(M.bigW - 320) <= 1, `1280×720 : JOUER width ${M.bigW} px hors de 320 ± 1`);
    dit(Math.abs(M.bigH - 78) <= 1, `1280×720 : JOUER height ${M.bigH} px hors de 78 ± 1`);
    m.d1280.erreurs = ctx.pageErrors.length;
    dit(ctx.pageErrors.length === 0, `1280×720 : ${ctx.pageErrors.length} erreur(s) de page`);
  } finally { await ctx.close(); }
}
{
  const ctx = await launchPhone({ init: [profileScript()] });
  try {
    await sleep(600);
    m.iphone = await look(ctx.page);
    const M = m.iphone.menu, C = m.iphone.cards;
    dit(Math.abs(M.scoreFs - 17.16) <= 0.3, `iPhone : .s2score ${M.scoreFs} px hors de 17,16 ± 0,3`);
    // invariant de la joueuse : trois cartes tiennent dans la fenêtre de 844 px
    dit(C.cardN === 0 || C.cardW * C.cardN <= 844, `iPhone : ${C.cardN} cartes de ${C.cardW} px débordent des 844 px`);
    m.iphone.erreurs = ctx.pageErrors.length;
    dit(ctx.pageErrors.length === 0, `iPhone : ${ctx.pageErrors.length} erreur(s) de page`);
  } finally { await ctx.close(); }
}

m.fails = fails;
save('G10-t1-echelle.json', { pass: fails.length === 0, measured: m, threshold: THRESH });
for (const f of fails) console.log('[G10-t1] ÉCHEC :', f);
finish('G10-t1-echelle', { pass: fails.length === 0, measured: m, threshold: THRESH });

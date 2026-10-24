// G4 test 4 — bureau 1440×900 : huit Tab consécutifs en jeu → document.activeElement n'est jamais dans un .s2scr sans
// classe .on ; hors jeu (menu, écran de pause, écran de fin) huit Tab → jamais dans un .s2scr sans .on ni sur .s2pause ;
// document.querySelectorAll('#ui [aria-label]').length ≥ 4 ; chaque .s2card est un <button>.
// Un Tab qui sort du document (fin de la boucle de focus) provoque un blur, donc la pause de G2 : en jeu on ne juge que
// l'écran caché, l'état de pause est relevé tel quel à chaque pas.
import { launchDesktop, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { SEED, waitFor, shot, activeInfo, forceDeath } from './g4lib.mjs';
deadline(90, 4);
const THRESH = "8 Tab en jeu : activeElement ∉ .s2scr:not(.on) ; hors jeu (menu, pause, fin) : ∉ .s2scr:not(.on) et ∉ .s2pause ; #ui [aria-label] ≥ 4 ; .s2card = BUTTON";
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
async function tabs(label) {
  const seq = [];
  for (let k = 0; k < 8; k++) { await page.keyboard.press('Tab'); await sleep(60); seq.push(await activeInfo(page)); }
  m[label === 'over' ? 'over_' : label] = { seq, offScreen: seq.filter(a => a.inOffScreen).length, onPause: seq.filter(a => a.isPause).length };
  return m[label === 'over' ? 'over_' : label];
}
try {
  await sleep(400);
  m.start = await shot(page);
  await tabs('menu');
  await page.evaluate(() => { window.__DT = 1 / 60; });
  await startGame(ctx, { seed: SEED });
  await sleep(400);
  await tabs('play');
  // écran de pause : si un Tab sorti du document a déjà mis la partie en pause (blur), on n'appuie pas sur Échap
  if (!(await shot(page)).paused) await page.keyboard.press('Escape');
  m.paused = await waitFor(page, "window.__S.paused === true && window.__M.ui.screen() === 'pause'", 1500);
  await tabs('pause');
  // écran de fin : reprise, mort forcée par collision réelle, attente de l'écran 'over'
  if ((await shot(page)).paused) { await page.keyboard.press('Escape'); await waitFor(page, 'window.__S.paused === false', 1500); }
  m.death = await forceDeath(page);
  m.over = await waitFor(page, "window.__M.ui.screen() === 'over'", 4000);
  await sleep(700);
  await tabs('over');
  m.dom = await page.evaluate(() => ({
    ariaN: document.querySelectorAll('#ui [aria-label]').length,
    aria: Array.from(document.querySelectorAll('#ui [aria-label]')).slice(0, 12).map(e => ({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 12), label: e.getAttribute('aria-label').slice(0, 40) })),
    cardsN: document.querySelectorAll('.s2card').length,
    cardTags: Array.from(document.querySelectorAll('.s2card')).map(e => e.tagName),
    pauseTabindex: (document.querySelector('.s2pause') || {}).getAttribute ? document.querySelector('.s2pause').getAttribute('tabindex') : null,
    inertScreens: Array.from(document.querySelectorAll('.s2scr')).map(e => ({ on: e.classList.contains('on'), inert: e.hasAttribute('inert') })),
  }));
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = {
    playNoOffScreen: m.play.offScreen === 0,
    menuNoOffScreenNoPause: m.menu.offScreen === 0 && m.menu.onPause === 0,
    pauseNoOffScreenNoPause: m.pause.offScreen === 0 && m.pause.onPause === 0,
    overNoOffScreenNoPause: m.over.ok === true && m.over_.offScreen === 0 && m.over_.onPause === 0,
    aria4: m.dom.ariaN >= 4,
    cardsButtons: m.dom.cardsN > 0 && m.dom.cardTags.every(t => t === 'BUTTON'),
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g4-t4.json', m);
  finish(4, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g4-t4.json', m);
  finish(4, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}

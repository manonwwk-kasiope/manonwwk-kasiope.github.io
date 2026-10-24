// G4 test 2 — bureau 1440×900, graine 2030, pas fixe 1/60, serpent invulnérable, montée de niveau naturelle neutralisée
// (S.xpNext = 1e9) : S.lvlUps = 1 → phase 'cards' ; press '2' → phase 'play' et S.up[id de la 2e carte affichée] + 1 ;
// nouveau cycle : press 'ArrowRight' → la 2e .s2card porte .kf avec getComputedStyle(el).borderWidth === '2px' ;
// press 'Enter' → carte sélectionnée (phase 'play', S.up[id 2e carte] + 1). Les identifiants viennent d'un espion sur
// ui.showCards(cards, cb) (API du contrat), dans l'ordre d'affichage. Sans G4 les cartes ont déjà une bordure de 2 px (cyan
// pour une carte rare) : le curseur est donc aussi reconnu à son rendu propre décrit par l'objectif — scale 1,04 (matrice de
// transformation calculée), couleur var(--cy) résolue sous #ui — et à son unicité (une seule .kf). Souris garée en (5,5)
// pour qu'aucun survol ne déplace une carte.
import { launchDesktop, startGame, installInvuln, waitFrames, sleep, save, finish, deadline } from '../lib.mjs';
import { SEED, waitFor, shot, spyCards, lastCards, cardsInfo, cyColor } from './g4lib.mjs';
deadline(120, 2);
const THRESH = "lvlUps=1 → 'cards' ; '2' → 'play' et S.up[id2] +1 ; ArrowRight → 2e .s2card seule .kf, borderWidth '2px', borderColor var(--cy), scale 1,04 ; Enter → sélection (+1)";
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = { cycles: [] };
let code = 1;
const upOf = id => page.evaluate(id => (window.__S.up[id] | 0), id);
async function openCards(label) {
  const c = { label };
  await page.evaluate(() => { window.__S.xpNext = 1e9; window.__S.lvlUps = 1; });
  c.toCards = await waitFor(page, "window.__S.phase === 'cards'", 2000);
  c.shown = await waitFor(page, "Array.from(document.querySelectorAll('.s2card')).filter(e => getComputedStyle(e).display !== 'none').length >= 2", 2000);
  await sleep(450);                                   // entrée animée des cartes (0,34 s)
  c.ids = await lastCards(page);
  c.cards = await cardsInfo(page);
  c.id2 = c.ids && c.ids[1] || null;
  c.upBefore = c.id2 ? await upOf(c.id2) : null;
  m.cycles.push(c);
  return c;
}
async function fallbackPick(c) {
  // le clavier n'a pas choisi : on prend la 2e carte à la souris pour poursuivre la mesure
  const ph = (await shot(page)).phase;
  if (ph !== 'cards') return;
  c.fallback = 'clic souris sur la 2e carte';
  const el = page.locator('.s2card:visible').nth(1);
  const box = await el.boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await waitFor(page, "window.__S.phase === 'play'", 2000);
}
try {
  if (!(await spyCards(page))) { code = 2; throw new Error('ui.showCards absent'); }
  await installInvuln(page);
  await page.evaluate(() => { window.__DT = 1 / 60; });
  await startGame(ctx, { seed: SEED });
  await waitFrames(page, 30);
  // cycle 1 : touche 2
  const c1 = await openCards('touche 2');
  if (!c1.id2) { code = 2; throw new Error('espion showCards sans 2e carte'); }
  await page.keyboard.press('2');
  c1.toPlay = await waitFor(page, "window.__S.phase === 'play'", 1500);
  c1.phaseAfter = (await shot(page)).phase;
  c1.upAfter = await upOf(c1.id2);
  c1.ok = c1.toPlay.ok && c1.upAfter === c1.upBefore + 1;
  await fallbackPick(c1);
  await waitFrames(page, 40);
  // cycle 2 : flèche droite puis Entrée
  const c2 = await openCards('ArrowRight + Enter');
  if (!c2.id2) { code = 2; throw new Error('espion showCards sans 2e carte (cycle 2)'); }
  await page.mouse.move(5, 5);
  c2.beforeArrow = await cardsInfo(page);
  await page.keyboard.press('ArrowRight');
  c2.kfSeen = await waitFor(page, "document.querySelectorAll('.s2card')[1] && document.querySelectorAll('.s2card')[1].classList.contains('kf')", 1000, 10);
  await sleep(200);                                   // transition du curseur 80 ms
  c2.afterArrow = await cardsInfo(page);
  const second = c2.afterArrow[1] || {};
  c2.cy = await cyColor(page);
  c2.kfOn = c2.afterArrow.filter(x => x.kf).map(x => x.i);
  c2.kf2parts = { cls: !!second.kf, width2: second.borderWidth === '2px', colorCy: second.borderColor === c2.cy, scale104: Math.abs((second.scale || 0) - 1.04) < 0.006, single: c2.kfOn.length === 1 };
  c2.kf2 = Object.values(c2.kf2parts).every(Boolean);
  await page.keyboard.press('Enter');
  c2.toPlay = await waitFor(page, "window.__S.phase === 'play'", 1500);
  c2.phaseAfter = (await shot(page)).phase;
  c2.upAfter = await upOf(c2.id2);
  c2.ok = c2.toPlay.ok && c2.upAfter === c2.upBefore + 1;
  await fallbackPick(c2);
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length, err: await page.evaluate(() => window.__ERR ? window.__ERR.count : null) };
  const checks = { cardsPhase: c1.toCards.ok, key2Picks: c1.ok === true, arrowKf: c2.kf2 === true, enterPicks: c2.ok === true };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g4-t2.json', m);
  finish(2, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g4-t2.json', m);
  finish(2, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}

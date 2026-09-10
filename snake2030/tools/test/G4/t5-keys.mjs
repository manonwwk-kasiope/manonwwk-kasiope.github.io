// G4 test 5 — légende et capuchons. Bureau 1440×900, profil vierge (contexte neuf, localStorage vide, S.stats.runs = 0) :
// .s2keys rendue visible au menu et en pause, textContent contient 'ESPACE' et 'ÉCHAP' ; en jeu (graine 2030, pas fixe 1/60,
// t = temps de jeu depuis le départ) les .s2kcap ont opacity calculée > 0,9 à t = 2 s et 0 à t = 8 s (ou plus aucun capuchon
// rendu) ; avec S.stats.runs = 3 aucun capuchon visible sur 0–8 s (échantillon toutes les 30 images).
// iPhone 13 paysage : .s2keys du menu contient 'Pouce'.
import { launchDesktop, launchPhone, startGame, installInvuln, waitFrames, sleep, save, finish, deadline } from '../lib.mjs';
import { SEED, waitFor, shot, visInfo, quitToMenu } from './g4lib.mjs';
deadline(180, 5);
const THRESH = "bureau : .s2keys visible menu+pause avec 'ESPACE' et 'ÉCHAP' ; .s2kcap opacity > 0,9 à 2 s, 0 à 8 s (runs 0) ; runs 3 → jamais visibles ; iPhone : .s2keys ∋ 'Pouce'";
const m = { desk: {}, phone: {} };
let code = 1;
// opacité RENDUE d'un capuchon = produit des opacités de sa chaîne d'ancêtres (un fondu posé sur le conteneur compte) ;
// shown = affiché (aucun display:none dans la chaîne) avec une boîte non vide
const capOp = async page => (await visInfo(page, '.s2kcap')).map(k => ({ text: k.text.slice(0, 12), opacity: k.opacity, shown: k.disp && k.rect.w > 0 && k.rect.h > 0, visible: k.visible, rect: k.rect }));
const legend = async page => (await visInfo(page, '.s2keys')).map(k => ({ ...k, espace: /ESPACE/.test(k.text), echap: /ÉCHAP/.test(k.text), pouce: /Pouce/.test(k.text) }));
async function playFrom(ctx) {
  await startGame(ctx, { seed: SEED });
  return ctx.page.evaluate(() => window.__S.t);
}
async function waitGame(page, t0, secs) { await waitFor(page, 'window.__S.t - ' + t0 + ' >= ' + (secs * 1000), secs * 1000 * 3 + 5000, 10); }
let ctx = null;
try {
  /* ---------------------------------------------------------------- bureau */
  ctx = await launchDesktop(1440, 900);
  let page = ctx.page;
  await sleep(400);
  const D = m.desk;
  D.stats = await page.evaluate(() => ({ runs: window.__S.stats.runs | 0, ls: !!localStorage.getItem('snake2030.v1') }));
  D.menuKeys = await legend(page);
  await installInvuln(page);
  await page.evaluate(() => { window.__DT = 1 / 60; });
  let t0 = await playFrom(ctx);
  await waitGame(page, t0, 2);
  D.capsAt2 = { t: +(((await shot(page)).t - t0) / 1000).toFixed(2), caps: await capOp(page) };
  await waitGame(page, t0, 8);
  await sleep(500);                                    // fondu CSS 400 ms achevé
  D.capsAt8 = { t: +(((await shot(page)).t - t0) / 1000).toFixed(2), caps: await capOp(page) };
  await page.keyboard.press('Escape');
  D.paused = await waitFor(page, "window.__S.paused === true && window.__M.ui.screen() === 'pause'", 1500);
  await sleep(150);
  D.pauseKeys = await legend(page);
  // troisième partie et plus : jamais de capuchon
  await quitToMenu(ctx);
  await page.evaluate(() => { window.__S.stats.runs = 3; });
  t0 = await playFrom(ctx);
  D.runs3 = { runs: await page.evaluate(() => window.__S.stats.runs), samples: [] };
  for (let k = 0; k < 16; k++) {
    await waitFrames(page, 30);
    const caps = await capOp(page);
    D.runs3.samples.push({ t: +(((await shot(page)).t - t0) / 1000).toFixed(2), maxOp: caps.length ? Math.max(...caps.map(c => c.shown ? c.opacity : 0)) : 0, n: caps.length });
  }
  D.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  await ctx.close(); ctx = null;
  /* ---------------------------------------------------------------- iPhone */
  ctx = await launchPhone();
  page = ctx.page;
  await sleep(500);
  m.phone.menuKeys = await legend(page);
  m.phone.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  await ctx.close(); ctx = null;
  /* ---------------------------------------------------------------- bilan */
  const okLine = l => l.some(k => k.visible && k.espace && k.echap);
  const checks = {
    freshProfile: D.stats.runs === 0,
    menuLegend: okLine(D.menuKeys),
    pauseLegend: okLine(D.pauseKeys),
    capsAt2: D.capsAt2.caps.length >= 1 && D.capsAt2.caps.every(c => c.visible && c.opacity > 0.9),
    capsAt8: D.capsAt8.caps.every(c => !c.shown || c.opacity === 0),
    runs3Never: D.runs3.samples.length === 16 && D.runs3.samples.every(s => s.maxOp === 0),
    phoneLegend: m.phone.menuKeys.some(k => k.visible && k.pouce),
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g4-t5.json', m);
  finish(5, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g4-t5.json', m);
  finish(5, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  if (ctx) await ctx.close();
}

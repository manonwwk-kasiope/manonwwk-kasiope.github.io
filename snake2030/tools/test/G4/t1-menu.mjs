// G4 test 1 — bureau 1440×900, menu : le premier Tab au menu ne cible pas .s2pause ; press 's' → __M.ui.screen() === 'settings' ;
// press 'Escape' → 'menu' ; press 'Enter' → S.phase === 'play' en ≤ 300 ms (délai mesuré dans la page : keydown → première
// image où S.phase === 'play'). Touches réelles (CDP) : la touche S d'un joueur envoie e.key 's', code 'KeyS'.
import { launchDesktop, sleep, save, finish, deadline } from '../lib.mjs';
import { waitFor, shot, pressTimed, activeInfo } from './g4lib.mjs';
deadline(90, 1);
const THRESH = "1er Tab au menu ∉ .s2pause ; 's' → screen 'settings' ; 'Escape' → 'menu' ; 'Enter' → S.phase 'play' ≤ 300 ms";
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
try {
  await sleep(400);
  m.start = await shot(page);
  if (m.start.screen !== 'menu') { code = 2; throw new Error('écran de départ ≠ menu : ' + m.start.screen); }
  // premier Tab au menu
  await page.keyboard.press('Tab');
  await sleep(120);
  m.tab = await activeInfo(page);
  // S → réglages
  await page.keyboard.press('s');
  m.s = await waitFor(page, "window.__M.ui.screen() === 'settings'", 1500);
  m.s.screen = (await shot(page)).screen;
  // Échap → menu
  await page.keyboard.press('Escape');
  m.esc = await waitFor(page, "window.__M.ui.screen() === 'menu'", 1500);
  m.esc.screen = (await shot(page)).screen;
  if (m.esc.screen !== 'menu') { m.note = 'retour au menu forcé (showScreen) pour mesurer Entrée'; await page.evaluate(() => window.__M.ui.showScreen('menu')); await sleep(300); }
  // Entrée → JOUER
  await page.evaluate(() => { window.__SEED = 2030; });
  m.enter = await pressTimed(page, 'Enter', "window.__S.phase === 'play'", 1500);
  m.enter.after = await shot(page);
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length, err: await page.evaluate(() => window.__ERR ? window.__ERR.count : null) };
  const checks = {
    tabNotPause: m.tab.isPause === false,
    sSettings: m.s.screen === 'settings',
    escMenu: m.esc.screen === 'menu',
    enterPlay: m.enter.ok === true && m.enter.ms != null && m.enter.ms <= 300,
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g4-t1.json', m);
  finish(1, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g4-t1.json', m);
  finish(1, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}

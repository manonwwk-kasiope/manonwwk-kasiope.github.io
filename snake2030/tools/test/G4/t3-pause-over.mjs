// G4 test 3 — bureau 1440×900, graine 2030, temps réel (les verrous sont en millisecondes) : en pause, press 'Enter' →
// S.paused === false. Mort forcée (collision réelle) → écran 'over' ; press 'Enter' 200 ms après l'affichage → phase reste
// 'dead' (verrou 600 ms) ; press 'Enter' 700 ms après l'affichage → phase 'play' en ≤ 700 ms (keydown → image, mesuré
// dans la page) ; nouvelle mort → écran 'over' + 700 ms → press 'm' → screen 'menu'.
import { launchDesktop, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { SEED, waitFor, shot, forceDeath, pressTimed } from './g4lib.mjs';
deadline(120, 3);
const THRESH = "pause + Enter → !paused ; over + Enter à 200 ms → 'dead' ; Enter à 700 ms → 'play' ≤ 700 ms ; over + 'm' → screen 'menu'";
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
/** Attend l'affichage de l'écran de fin ; rend l'instant Node (ms) de sa détection (scrutation 5 ms). */
async function waitOver() {
  const w = await waitFor(page, "window.__M.ui.screen() === 'over'", 4000, 5);
  return { ...w, at: Date.now() };
}
async function dieAndShow(label) {
  const d = await forceDeath(page);
  const o = await waitOver();
  m[label] = { death: d, over: o.ok, overMs: o.ms, shot: await shot(page) };
  return o;
}
try {
  await startGame(ctx, { seed: SEED });
  await sleep(400);
  // pause → Entrée
  await page.keyboard.press('Escape');
  m.pause = await waitFor(page, 'window.__S.paused === true', 1500);
  m.pause.screen = (await shot(page)).screen;
  await page.keyboard.press('Enter');
  m.resume = await waitFor(page, 'window.__S.paused === false', 1500);
  m.resume.shot = await shot(page);
  if (m.resume.shot.paused) { m.note = 'reprise forcée par Escape pour poursuivre'; await page.keyboard.press('Escape'); await waitFor(page, 'window.__S.paused === false', 1500); }
  // mort n° 1 : verrou puis REJOUER
  const o1 = await dieAndShow('death1');
  if (!o1.ok) { code = 2; throw new Error("écran 'over' jamais affiché après la mort forcée"); }
  const wait1 = 200 - (Date.now() - o1.at); if (wait1 > 0) await sleep(wait1);
  m.enter200 = { atMs: Date.now() - o1.at };
  await page.keyboard.press('Enter');
  await sleep(250);
  m.enter200.after = await shot(page);
  m.enter200.stillDead = m.enter200.after.phase === 'dead';
  const wait2 = 700 - (Date.now() - o1.at); if (wait2 > 0) await sleep(wait2);
  m.enter700 = { atMs: Date.now() - o1.at };
  Object.assign(m.enter700, await pressTimed(page, 'Enter', "window.__S.phase === 'play'", 2000));
  m.enter700.after = await shot(page);
  if (m.enter700.after.phase !== 'play') {
    m.enter700.note = 'REJOUER cliqué à la souris pour poursuivre';
    const b = page.locator('#ui button:visible', { hasText: /^REJOUER$/ }).first();
    const box = await b.boundingBox().catch(() => null);
    if (box) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await waitFor(page, "window.__S.phase === 'play'", 3000); }
  }
  await sleep(400);
  // mort n° 2 : M → menu
  const o2 = await dieAndShow('death2');
  if (o2.ok) {
    const wait3 = 700 - (Date.now() - o2.at); if (wait3 > 0) await sleep(wait3);
    await page.keyboard.press('m');
    m.keyM = await waitFor(page, "window.__M.ui.screen() === 'menu'", 1500);
    m.keyM.after = await shot(page);
  } else m.keyM = { ok: false, note: "écran 'over' non affiché à la 2e mort" };
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length, err: await page.evaluate(() => window.__ERR ? window.__ERR.count : null) };
  const checks = {
    enterResumes: m.resume.ok === true,
    lock200: m.enter200.stillDead === true,
    enter700Replays: m.enter700.ok === true && m.enter700.ms != null && m.enter700.ms <= 700,
    mMenu: !!(m.keyM && m.keyM.after && m.keyM.after.screen === 'menu'),
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g4-t3.json', m);
  finish(3, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g4-t3.json', m);
  finish(3, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}

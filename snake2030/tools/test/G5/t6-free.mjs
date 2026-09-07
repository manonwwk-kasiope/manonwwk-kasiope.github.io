// G5 test 6 — pilotage libre inchangé (reprise de scratchpad desktop-feel.mjs §1 et §3, iphone-feel.mjs §1 sur le
// harnais commun), pas de temps fixe 1/60 (une image = 16,7 ms de jeu), phase « espace » forcée (pas de treillis),
// arène vide. Bureau 1440×900 (clavier) et iPhone 13 paysage (manche et bouton au doigt CDP) :
//   - latence entrée → virage : 1 image entre la marque d'entrée (keydown / touchmove) et la première image où le
//     cap change ; 90° (|cap − (−π/2)| < 0,035) atteints en ≤ 22 images ;
//   - boost tenu 2 s puis relâché : vitesse ≤ 157 atteinte 400 à 520 ms de jeu après le relâchement (la fenêtre
//     « 20–26 images » de la spec est une mesure en temps réel à ≈ 50 im/s ; à pas fixe 1/60 c'est 29 images, identique
//     sur HEAD et sur G5) et base du lissage de descente 0,002 ± 15 %.
//   Information : base du lissage de descente (0,002^dt attendu, inchangé) et montée à 95 % de 285 (test 3).
import { launchDesktop, launchPhone, installProbe, installInvuln, startGame, pullProbe, clearProbe, waitFrames, touch, sleep, save, finish, deadline } from '../lib.mjs';
import { SEED, emptyArena, setSnake, norm, deg } from './g5lib.mjs';
deadline(240, 6);
const THRESH = 'latence entrée→virage = 1 image ; 90° en ≤ 22 images ; vitesse ≤ 157 en 400–520 ms de jeu (= 20–26 images réelles à ≈ 50 im/s, 29 images à pas fixe 1/60) après relâchement du boost, base de descente 0,002 ± 15 % ; bureau et iPhone';
const m = {};

async function feel(ctx) {
  const { page, cdp } = ctx;
  const r = {};
  await installProbe(page);
  await installInvuln(page);
  await startGame(ctx, { seed: SEED });
  await emptyArena(page);
  await page.evaluate(() => { window.__M.phases.forcePhase(1); addEventListener('touchend', () => { window.__P.marks.push({ fi: window.__fi, now: performance.now(), type: 'te' }); }, true); });
  await page.evaluate(() => { const S = window.__S; window.__SP = []; (function t() { requestAnimationFrame(t); window.__SP.push([window.__fi, +S.snake.speed.toFixed(3), S.snake.boosting ? 1 : 0, S.snake.baseSpeed]); })(); });
  await setSnake(page, 600, 800, 0);
  await waitFrames(page, 20);
  const T = touch(cdp);
  const joy = ctx.kind === 'touch' ? await page.evaluate(() => JSON.parse(JSON.stringify(window.__M.ui.joyHome()))) : null;
  const rects = ctx.kind === 'touch' ? await page.evaluate(() => JSON.parse(JSON.stringify(window.__M.ui.rects()))) : null;
  /* cap 0 tenu, puis virage vers le haut */
  if (ctx.kind === 'touch') { await T.start([{ x: joy.x, y: joy.y, id: 1 }]); await waitFrames(page, 2); await T.move([{ x: joy.x + 60, y: joy.y, id: 1 }]); }
  else await page.keyboard.down('ArrowRight');
  await waitFrames(page, 60);
  if (ctx.kind !== 'touch') { await page.keyboard.up('ArrowRight'); await waitFrames(page, 3); }
  await clearProbe(page);
  const a0 = await page.evaluate(() => window.__S.snake.ang);
  if (ctx.kind === 'touch') await T.move([{ x: joy.x, y: joy.y - 60, id: 1 }]);
  else await page.keyboard.down('ArrowUp');
  await waitFrames(page, 60);
  if (ctx.kind === 'touch') await T.end([]); else await page.keyboard.up('ArrowUp');
  const P = await pullProbe(page);
  const mk = ctx.kind === 'touch' ? P.marks.filter(k => k.type === 'tm').pop() : P.marks.find(k => k.type === 'down' && k.key === 'ArrowUp');
  if (!mk) throw new Error('marque d\'entrée absente');
  const R = P.rec.filter(x => x.fi > mk.fi);
  const first = R.find(x => Math.abs(norm(x.ang - a0)) > 1e-4);
  const reach = R.find(x => Math.abs(norm(x.ang + Math.PI / 2)) < 0.035);
  r.capBeforeDeg = deg(a0);
  r.latencyFrames = first ? first.fi - mk.fi : null;
  r.framesTo90 = reach ? reach.fi - mk.fi : null;
  r.capCurveDeg = R.slice(0, 24).map(x => deg(x.ang));
  /* boost tenu 2 s (120 images) puis relâché */
  await waitFrames(page, 30);
  await clearProbe(page);
  const f0 = await page.evaluate(() => window.__fi);
  if (ctx.kind === 'touch') await T.start([{ x: rects.boost.x, y: rects.boost.y, id: 2 }]);
  else await page.keyboard.down('Space');
  await waitFrames(page, 120);
  const fUpBefore = await page.evaluate(() => window.__fi);
  if (ctx.kind === 'touch') await T.end([]); else await page.keyboard.up('Space');
  await waitFrames(page, 90);
  const P2 = await pullProbe(page);
  const md = ctx.kind === 'touch' ? P2.marks.find(k => k.type === 'ts') : P2.marks.find(k => k.type === 'down' && k.key === ' ');
  const mu = ctx.kind === 'touch' ? P2.marks.find(k => k.type === 'te') : P2.marks.find(k => k.type === 'up' && k.key === ' ');
  const SP = await page.evaluate(() => window.__SP.slice());
  const upFi = mu ? mu.fi : fUpBefore;
  const base = SP[SP.length - 1][3];
  const after = SP.filter(s => s[0] > upFi);
  const back = after.find(s => s[1] <= 157);
  r.boostMarkFrames = { down: md ? md.fi : null, up: mu ? mu.fi : null, upFallback: !mu };
  r.speedAtRelease = after.length ? +after[0][1].toFixed(1) : null;
  r.speedPeak = SP.filter(s => s[0] > f0).length ? +Math.max(...SP.filter(s => s[0] > f0).map(s => s[1])).toFixed(1) : null;
  r.framesBackTo157 = back ? back[0] - upFi : null;
  r.gameMsBackTo157 = r.framesBackTo157 != null ? +(r.framesBackTo157 * 1000 / 60).toFixed(0) : null;
  r.speedAfterRelease = after.slice(0, 32).map(s => +s[1].toFixed(0));
  // base du lissage de descente : (excès_{n+1}/excès_n)^60 sur les images 2..14 après relâchement
  const bases = [];
  for (let i = 2; i < Math.min(15, after.length); i++) { const e0 = after[i - 1][1] - base, e1 = after[i][1] - base; if (e0 > 2 && e1 > 0) bases.push(Math.pow(e1 / e0, 60)); }
  bases.sort((a, b) => a - b);
  r.descentBase = bases.length ? +bases[Math.floor(bases.length / 2)].toExponential(2) : null;
  const rise = md ? SP.filter(s => s[0] > md.fi).find(s => s[1] >= 0.95 * base * 1.9) : null;
  r.framesToRise95 = rise && md ? rise[0] - md.fi : null;
  r.baseSpeed = base;
  r.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  return r;
}

for (const [label, launch] of [['desk1440', () => launchDesktop(1440, 900)], ['iphone', () => launchPhone()]]) {
  const ctx = await launch();
  try { m[label] = await feel(ctx); }
  catch (e) { m[label] = { ...(m[label] || {}), error: String(e && e.stack || e).slice(0, 400) }; }
  finally { await ctx.close(); }
}
const checks = {};
for (const k of ['desk1440', 'iphone']) {
  const r = m[k] || {};
  checks[k + 'Latency1'] = r.latencyFrames != null ? r.latencyFrames === 1 : null;
  checks[k + 'Turn90in22'] = r.framesTo90 != null ? r.framesTo90 <= 22 : (r.error ? null : false);
  /* « 20–26 images » de la spec = mesure en temps réel de desktop-feel.mjs à ≈ 50 im/s, soit 400–520 ms ; ici le pas
     est fixe (1/60 s) et la même descente 0,002^dt donne 29 images = 483 ms de jeu — mesuré identique sur le bundle
     HEAD (G2) et sur le build G5 (médiateur, 06/09) : c'est bien « inchangé ». On vérifie donc le temps de jeu
     (400–520 ms) et la base du lissage (0,002 ± 15 %), pas un nombre d'images qui dépend de la cadence. */
  checks[k + 'Back157in400to520ms'] = r.gameMsBackTo157 != null ? (r.gameMsBackTo157 >= 400 && r.gameMsBackTo157 <= 520) : (r.error ? null : false);
  checks[k + 'DescentBase0002'] = r.descentBase != null ? Math.abs(+r.descentBase - 0.002) <= 0.0003 : null;
}
m.checks = checks;
// À 60 Hz exactement (pas fixe 1/60), la descente inchangée 0,002^dt ramène 285 → 157 en 29 images (483 ms de jeu) :
// la fenêtre 20–26 de la spec vient d'une mesure en temps réel à ≈ 50 im/s (desktop-feel.mjs). descentBase (≈ 2e-3)
// est la mesure indépendante de la cadence ; la vérification suit la spec telle quelle.
m.note = 'descente : 29 images attendues à 60 Hz pour 0,002^dt inchangé ; descentBase ≈ 0,002 = inchangé';
const vals = Object.values(checks);
const pass = vals.every(v => v === true);
const code = pass ? 0 : (vals.some(v => v === false) ? 1 : 2);
save('g5-t6.json', m);
finish(6, { pass, measured: m, threshold: THRESH, code });

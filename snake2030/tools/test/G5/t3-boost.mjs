// G5 test 3 — boost à vide sans bégaiement (reprise de scratchpad med-feel.mjs sur le harnais commun).
// (A) Bureau 1440×900, pas de temps fixe 1/60 : Espace tenue 7 s (420 images) depuis boostE = 100 :
//   - vitesse ≥ 95 % de 285 (270,75) en ≤ 11 images après le keydown ;
//   - ≥ 10 appels fx.trail dans les 3 images suivant boosting = true ;
//   - après la première image où boostE < 1,5 : 0 bascule de s.boosting jusqu'au relâchement ;
//     vitesse ≤ 152 sur toutes les images à partir de la 30e après la panne ;
//   - sfx demandés (audio.sfx) boost + boostEnd + boostDry pendant l'appui ≤ 2 dont exactement 1 boostDry ;
//   - boostE 0 → 100 en ≤ 4,7 s de jeu depuis la panne (sans poussée demandée).
// (B) iPhone 13 paysage, horloge factice : bouton boost tenu (doigt CDP) depuis boostE = 30 jusqu'à la panne, puis
//   40 images capturées une à une : canal R moyen du disque du bouton (cercle inscrit dans .s2b-boost, jusqu'au bord
//   externe de l'anneau, r = 0,475 × côté) ≥ 2 × canal G pendant ≥ 6 images.
import { launchDesktop, launchPhone, installProbe, installInvuln, startGame, pullProbe, clearProbe, waitFrames, touch, clockPause, clockStep, clockResume, sleep, save, finish, deadline } from '../lib.mjs';
import { shotClip, meanDisc, meanAnnulus } from '../px.mjs';
import { SEED, emptyArena, setSnake, waitUntil } from './g5lib.mjs';
deadline(300, 3);
const THRESH = 'rise ≥ 270,75 en ≤ 11 images ; fx.trail ≥ 10 sur 3 images ; 0 bascule après boostE < 1,5 ; vitesse ≤ 152 dès panne+30 ; sfx boost+boostEnd+boostDry ≤ 2 dont 1 boostDry ; recharge 0→100 ≤ 4 700 ms ; bouton boost R ≥ 2G sur ≥ 6 images';
const m = {};

/* ---------------------------------------------------------- A : bureau ---- */
{
  const ctx = await launchDesktop(1440, 900);
  const { page } = ctx;
  try {
    const A = {};
    await installProbe(page);
    await installInvuln(page);
    await startGame(ctx, { seed: SEED });
    await emptyArena(page);
    await page.evaluate(() => window.__M.phases.forcePhase(1));           // « espace » : pilotage libre, pas de treillis
    await setSnake(page, 300, 800, 0);
    await waitFrames(page, 30);
    A.api = await page.evaluate(() => ({ fill: window.__K.BOOST_FILL, drain: window.__K.BOOST_DRAIN, mul: window.__K.BOOST_MUL, base: window.__K.BASE_SPEED, boostDryField: 'boostDry' in window.__S.snake }));
    // enregistreur par image (après l'image du jeu) + espions sfx / fx.trail étiquetés par l'image courante
    await page.evaluate(() => {
      const S = window.__S, M = window.__M, s = S.snake;
      const R = window.__R = { rows: [], sfx: [], trail: [] };
      const o = M.audio.sfx; M.audio.sfx = function (name) { R.sfx.push([window.__fi, name]); return o.apply(this, arguments); };
      const t = M.fx.trail; M.fx.trail = function () { R.trail.push(window.__fi); return t.apply(this, arguments); };
      (function tick() { requestAnimationFrame(tick); R.rows.push([window.__fi, s.boosting ? 1 : 0, +s.boostE.toFixed(2), +s.speed.toFixed(2), +S.t.toFixed(1), s.boostDry ? 1 : 0]); })();
      s.boostE = 100; s.boosting = false;
    });
    await waitFrames(page, 3);
    await clearProbe(page);
    await page.keyboard.down('Space');
    await waitFrames(page, 420);
    await page.keyboard.up('Space');
    await waitFrames(page, 3);
    const P = await pullProbe(page);
    const down = P.marks.find(k => k.type === 'down' && k.key === ' '), up = P.marks.find(k => k.type === 'up' && k.key === ' ');
    if (!down || !up) throw new Error('marques Espace absentes');
    // recharge : on attend boostE ≥ 99,9 (temps de jeu) — au plus 9 s de jeu
    await waitUntil(page, () => window.__S.snake.boostE >= 99.9, 12000);
    const R = await page.evaluate(() => window.__R);
    const rows = R.rows.filter(r => r[0] > down.fi);
    const rowsHold = rows.filter(r => r[0] <= up.fi);
    const target = 0.95 * A.api.base * A.api.mul;
    const rise = rowsHold.find(r => r[3] >= target);
    A.framesToRise95 = rise ? rise[0] - down.fi : null;
    A.speedCurve = rowsHold.slice(0, 16).map(r => +r[3].toFixed(0));
    const firstOn = rowsHold.find(r => r[1] === 1);
    A.firstBoostFrame = firstOn ? firstOn[0] - down.fi : null;
    // appels fx.trail pendant les 3 premières images du boost : un appel fait pendant l'image du jeu porte l'indice
    // d'image d'AVANT l'incrément de la sonde (F − 1)
    A.trailCallsFirst3 = firstOn ? R.trail.filter(f => f >= firstOn[0] - 1 && f <= firstOn[0] + 1).length : 0;
    A.trailCallsTotalHold = R.trail.filter(f => f >= down.fi && f <= up.fi).length;
    const dryIdx = rowsHold.findIndex(r => r[2] < 1.5);
    A.firstDryFrame = dryIdx >= 0 ? rowsHold[dryIdx][0] - down.fi : null;
    let toggles = 0;
    if (dryIdx >= 0) for (let i = dryIdx + 1; i < rowsHold.length; i++) if (rowsHold[i][1] !== rowsHold[i - 1][1]) toggles++;
    A.togglesAfterDry = dryIdx >= 0 ? toggles : null;
    const after30 = dryIdx >= 0 ? rowsHold.slice(dryIdx + 30) : [];
    A.speedMaxAfterDry30 = after30.length ? Math.max(...after30.map(r => r[3])) : null;
    A.speedMinAfterDry30 = after30.length ? Math.min(...after30.map(r => r[3])) : null;
    A.boostDryFlagAfterDry = dryIdx >= 0 ? rowsHold.slice(dryIdx + 5, dryIdx + 40).every(r => r[5] === 1) : null;
    const sfxHold = R.sfx.filter(([f]) => f >= down.fi - 1 && f <= up.fi - 1).map(([, n]) => n);
    const cnt = n => sfxHold.filter(x => x === n).length;
    A.sfx = { boost: cnt('boost'), boostEnd: cnt('boostEnd'), boostDry: cnt('boostDry'), othersDuringHold: sfxHold.filter(n => !/^boost/.test(n)).length };
    A.sfxSum = A.sfx.boost + A.sfx.boostEnd + A.sfx.boostDry;
    A.sfxDryFrame = (R.sfx.find(([f, n]) => n === 'boostDry') || [null])[0];
    // recharge après relâchement
    const rel = rows.find(r => r[0] === up.fi + 1) || rows.find(r => r[0] > up.fi);
    const full = rows.find(r => r[0] > up.fi && r[2] >= 99.9);
    A.boostEAtRelease = rel ? rel[2] : null;
    A.refillMs = (rel && full) ? +(full[4] - rel[4]).toFixed(0) : null;
    A.refillFrames = (rel && full) ? full[0] - rel[0] : null;
    // recharge 0 → 100 telle que la spec la formule : depuis la panne (première image à boostE = 0 après la première
    // image < 1,5), en temps de jeu ; la réserve remonte aussi pendant que le bouton reste tenu à vide (aucune
    // poussée n'est demandée), donc le relâchement n'est pas le point de départ — la mesure depuis le relâchement
    // (refillMs, à titre indicatif) ne couvrait que 90 → 100
    const dryRow = dryIdx >= 0 ? rowsHold.slice(dryIdx).find(r => r[2] <= 0) : null;
    const fullFromDry = dryRow ? rows.find(r => r[0] > dryRow[0] && r[2] >= 99.9) : null;
    A.refillFromDryMs = (dryRow && fullFromDry) ? +(fullFromDry[4] - dryRow[4]).toFixed(0) : null;
    A.refillFromDryFrames = (dryRow && fullFromDry) ? fullFromDry[0] - dryRow[0] : null;
    A.audioPlayed = await page.evaluate(() => { const a = window.__M.audio; return a.stats ? { boost: a.stats().boost || 0, boostEnd: a.stats().boostEnd || 0, boostDry: a.stats().boostDry || 0 } : null; });
    A.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    m.desktop = A;
  } catch (e) { m.desktop = { ...(m.desktop || {}), error: String(e && e.stack || e).slice(0, 400) }; }
  finally { await ctx.close(); }
}

/* ------------------------------------------------- B : iPhone, bouton ---- */
{
  const ctx = await launchPhone({ clock: true });
  const { page, cdp } = ctx;
  try {
    const B = {};
    await installInvuln(page);
    await startGame(ctx, { seed: SEED });
    await emptyArena(page, { noFire: true });
    await page.evaluate(() => window.__M.phases.forcePhase(1));
    await setSnake(page, 300, 800, 0);
    await sleep(600);
    B.btn = await page.evaluate(() => { const el = document.querySelector('.s2b-boost'); if (!el) return null; const b = el.getBoundingClientRect(); const ctl = document.querySelector('.s2ctl'); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height, ctlOn: !!(ctl && ctl.classList.contains('on')), rect: window.__M.ui.rects().boost }; });
    if (!B.btn) throw new Error('bouton .s2b-boost absent');
    await page.evaluate(() => { const s = window.__S.snake; s.boostE = 30; s.boosting = false; });
    const T = touch(cdp);
    await T.start([{ x: B.btn.rect.x, y: B.btn.rect.y, id: 2 }]);
    const engaged = await waitUntil(page, () => window.__S.snake.boosting === true, 3000);
    B.engaged = engaged;
    await waitUntil(page, () => window.__S.snake.boostE < 8, 4000);
    await clockPause(ctx);
    const disc = { cx: B.btn.x, cy: B.btn.y, r: 0.475 * B.btn.w };
    const frames = [];
    let dry = -1;
    for (let k = 0; k < 90 && frames.length < 40; k++) {
      await clockStep(ctx, 1);
      const st = await page.evaluate(() => { const s = window.__S.snake; return { fi: window.__fi || 0, boostE: +s.boostE.toFixed(2), boosting: s.boosting, inp: window.__S.input.boost }; });
      if (dry < 0 && st.boostE < 1.5) dry = k;
      if (dry < 0) continue;
      const clip = { x: disc.cx - disc.r - 4, y: disc.cy - disc.r - 4, width: 2 * disc.r + 8, height: 2 * disc.r + 8 };
      const img = await shotClip(ctx, clip);
      const pr = img.pr, cx = (disc.cx - img.clip.x) * pr, cy = (disc.cy - img.clip.y) * pr;
      const d = meanDisc(img, cx, cy, disc.r * pr);
      const ring = meanAnnulus(img, cx, cy, disc.r * pr * 0.80, disc.r * pr);
      const inner = meanDisc(img, cx, cy, disc.r * pr * 0.75);
      frames.push({ k: k - dry, boostE: st.boostE, boosting: st.boosting, disc: [d.r, d.g, d.b], ratio: +(d.r / Math.max(1, d.g)).toFixed(2), ring: [ring.r, ring.g, ring.b], inner: [inner.r, inner.g, inner.b] });
      if (frames.length === 3) await page.screenshot({ path: new URL('../out/g5-t3-button.png', import.meta.url).pathname });
    }
    await T.end([]);
    await clockResume(ctx);
    B.disc = disc; B.frames = frames;
    B.redFrames = frames.filter(f => f.disc[0] >= 2 * f.disc[1]).length;
    B.ringRedFrames = frames.filter(f => f.ring[0] >= 2 * f.ring[1]).length;
    B.maxRatio = frames.length ? Math.max(...frames.map(f => f.ratio)) : null;
    B.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    m.iphone = B;
  } catch (e) { m.iphone = { ...(m.iphone || {}), error: String(e && e.stack || e).slice(0, 400) }; }
  finally { await ctx.close(); }
}

const A = m.desktop || {}, B = m.iphone || {};
const checks = {
  rise95in11: A.framesToRise95 != null ? A.framesToRise95 <= 11 : (A.error ? null : false),
  trail10in3: A.trailCallsFirst3 != null ? A.trailCallsFirst3 >= 10 : null,
  noToggleAfterDry: A.togglesAfterDry != null ? A.togglesAfterDry === 0 : null,
  speedLe152AfterDry30: A.speedMaxAfterDry30 != null ? A.speedMaxAfterDry30 <= 152 : null,
  sfxSumLe2: A.sfxSum != null ? A.sfxSum <= 2 : null,
  sfxDryExactly1: A.sfx ? A.sfx.boostDry === 1 : null,
  refillLe4700ms: A.refillFromDryMs != null ? A.refillFromDryMs <= 4700 : false,
  buttonRed6Frames: B.redFrames != null ? B.redFrames >= 6 : null,
};
m.checks = checks;
const vals = Object.values(checks);
const pass = vals.every(v => v === true);
const code = pass ? 0 : (vals.some(v => v === false) ? 1 : 2);
save('g5-t3.json', m);
finish(3, { pass, measured: { desktop: A, iphone: { ...B, frames: (B.frames || []).slice(0, 20).map(f => [f.k, f.boostE, f.ratio]) }, checks }, threshold: THRESH, code });

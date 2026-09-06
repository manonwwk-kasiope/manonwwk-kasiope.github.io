// NR — son-ios : iPhone 13 paysage, entrées par CDP. Après JOUER : audio.playing() non nul en ≤ 2 s,
// RMS de la prise 'tout' ≥ −40 dBFS entre 3 et 6 s ; puis visibilitychange hidden → visible + REPRENDRE :
// AudioContext.state === 'running' et RMS ≥ −40 dBFS en ≤ 2 s. Pendant la phase cachée le contexte audio est
// suspendu par le test (c'est ce qu'iOS fait quand la page passe en arrière-plan).
import { launchPhone, startGame, installAudioTap, clickButton, hasButton, sleep, save, isMain, finish, deadline } from './lib.mjs';

const THRESH = "playing() non nul ≤ 2000 ms après JOUER ; RMS('tout') médian ≥ −40 dBFS entre 3 et 6 s ; après hidden→visible + REPRENDRE : state 'running' et RMS ≥ −40 dBFS en ≤ 2000 ms";
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

export async function run() {
  const ctx = await launchPhone();
  const { page } = ctx;
  const m = {};
  try {
    const api = await page.evaluate(() => { const M = window.__M; return { tap: !!(M.audio && typeof M.audio.tap === 'function'), playing: !!(M.audio && typeof M.audio.playing === 'function') }; });
    if (!api.tap || !api.playing) return { pass: false, measured: { api }, threshold: THRESH, code: 2 };
    const t0 = Date.now();
    await startGame(ctx);                                   // JOUER par doigt CDP : geste utilisateur → armement audio
    let tap = await installAudioTap(page, 'tout');
    for (let k = 0; k < 5 && !tap.ok; k++) { await sleep(200); tap = await installAudioTap(page, 'tout'); }
    m.tap = tap;
    if (!tap.ok) return { pass: false, measured: m, threshold: THRESH, code: 2 };
    let playingAt = null, playing = null;
    while (Date.now() - t0 < 2600) {
      playing = await page.evaluate(() => window.__M.audio.playing());
      if (playing) { playingAt = Date.now() - t0; break; }
      await sleep(100);
    }
    m.playingAtMs = playingAt; m.playing = playing && { i: playing.i, src: String(playing.src || '').split('/').pop(), t: +(+playing.t || 0).toFixed(2) };
    const wait = 3000 - (Date.now() - t0); if (wait > 0) await sleep(wait);
    const rms1 = await page.evaluate(async () => {
      const a = []; const tEnd = performance.now() + 3000;
      while (performance.now() < tEnd) { a.push(+window.__rmsDb().toFixed(1)); await new Promise(r => setTimeout(r, 100)); }
      return { a, state: window.__audState() };
    });
    m.rms3to6 = { median: median(rms1.a), max: Math.max(...rms1.a), min: Math.min(...rms1.a), n: rms1.a.length, state: rms1.state };
    m.playingAt6s = await page.evaluate(() => { const p = window.__M.audio.playing(); return p ? { i: p.i, t: +(+p.t || 0).toFixed(2) } : null; });

    // page cachée : pause du jeu, contexte audio interrompu comme sur iOS
    await page.evaluate(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      try { await window.__M.audio.ctx.suspend(); } catch (e) {}
    });
    await sleep(800);
    m.hidden = await page.evaluate(() => ({ paused: window.__S.paused, screen: window.__M.ui.screen(), state: window.__audState(), rms: +window.__rmsDb().toFixed(1) }));
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await sleep(300);
    m.visible = await page.evaluate(() => ({ paused: window.__S.paused, screen: window.__M.ui.screen(), state: window.__audState() }));
    if (!(await hasButton(page, 'REPRENDRE'))) { m.reprendre = false; return { pass: false, measured: m, threshold: THRESH, code: 2 }; }
    const tR = Date.now();
    await clickButton(ctx, 'REPRENDRE');
    let runningAt = null, okAt = null, last = null; const samples = [];
    while (Date.now() - tR < 2600) {
      last = await page.evaluate(() => ({ state: window.__audState(), rms: +window.__rmsDb().toFixed(1), paused: window.__S.paused, phase: window.__S.phase }));
      samples.push({ ms: Date.now() - tR, ...last });
      if (runningAt == null && last.state === 'running') runningAt = Date.now() - tR;
      if (last.state === 'running' && last.rms >= -40) { okAt = Date.now() - tR; break; }
      await sleep(100);
    }
    m.resume = { runningAtMs: runningAt, okAtMs: okAt, last, samples: samples.slice(-6) };
    m.pageErrors = ctx.pageErrors.length; m.consoleErrors = ctx.consoleErrors.length;
    save('son-ios.json', m);
    const checks = { playing: playingAt != null && playingAt <= 2000, rms: m.rms3to6.median != null && m.rms3to6.median >= -40, resume: okAt != null && okAt <= 2000 };
    m.checks = checks;
    const pass = checks.playing && checks.rms && checks.resume;
    return { pass, measured: m, threshold: THRESH, code: pass ? 0 : 1 };
  } finally { await ctx.close(); }
}

if (isMain(import.meta.url)) {
  deadline(90, 'son-ios');
  finish('son-ios', await run());
}

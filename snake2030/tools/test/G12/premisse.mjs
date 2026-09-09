/* Vérification des PRÉMISSES de la spec G12 avant implémentation.
   1. crête réelle + part d'énergie < 400 Hz des sons actuels (sortie maître)
   2. RMS du bus musique juste après JOUER, puis à 18 s de piste */
import { launchDesktop, startGame, sleep, save, isMain, finish, deadline } from '../lib.mjs';
import { installCapture, measureSfx, SFX_VOL } from './g12lib.mjs';

const NAMES = ['shoot','kill','bigkill','explode','hurt','dead','bossIn','hit','pickup','core','click','card','levelup','boost','boostEnd','boostDry','warp','laser','missile','shock','zap','spawnTick','absorb','multUp','ultReady','ultFire'];

export async function run() {
  const ctx = await launchDesktop();
  const { page } = ctx;
  const m = { sfx: {}, musique: {} };
  try {
    await startGame(ctx);
    await sleep(600);
    // musique coupée : on mesure les effets seuls
    await page.evaluate(() => { window.__M.audio.setMusic(false); window.__S.paused = true; });
    await sleep(400);
    const cap = await installCapture(page, 'tout');
    m.cap = cap;
    if (!cap.ok) return { pass: false, measured: m, code: 2 };
    for (const n of NAMES) {
      const r = await measureSfx(page, n, SFX_VOL[n] === undefined ? 1 : SFX_VOL[n], 1.5);
      m.sfx[n] = r && { peakDb: r.peakDb, lowFrac: r.lowFrac, midFrac: r.midFrac, centroid: r.centroid };
      await sleep(120);
    }
    m.bass70 = Object.entries(m.sfx).filter(([k, v]) => v && v.lowFrac > 0.70).map(([k]) => k);
  } finally { await ctx.close(); }

  // 2e page : bus musique
  const c2 = await launchDesktop();
  try {
    const t0 = Date.now();
    await startGame(c2);
    const cap2 = await installCapture(c2.page, 'musique');
    m.musique.cap = cap2;
    if (cap2.ok) {
      const mesure = async (secs) => c2.page.evaluate(async (s) => {
        window.__capStart(s);
        const t = performance.now();
        while (window.__capBusy() && performance.now() - t < s * 1000 + 900) await new Promise(r => setTimeout(r, 30));
        return window.__capAnalyse();
      }, secs);
      await sleep(Math.max(0, 2000 - (Date.now() - t0)));
      m.musique.a2s = await mesure(1.0);
      m.musique.playing2s = await c2.page.evaluate(() => { const p = window.__M.audio.playing(); return p ? { i: p.i, t: +p.t.toFixed(2) } : null; });
      await c2.page.evaluate(() => window.__M.audio.seek(18));
      await sleep(500);
      m.musique.a18s = await mesure(1.0);
      m.musique.intensity = await c2.page.evaluate(() => window.__S.intensity);
      // intensité forcée à 1
      await c2.page.evaluate(() => window.__M.audio.setIntensity(1));
      await sleep(1600);
      m.musique.v1 = await mesure(1.0);
      await c2.page.evaluate(() => window.__M.audio.setIntensity(0));
      await sleep(1600);
      m.musique.v0 = await mesure(1.0);
    }
  } finally { await c2.close(); }
  save('G12-premisse.json', m);
  return { pass: true, measured: m, threshold: 'relevé de prémisses (aucun seuil)', code: 0 };
}
if (isMain(import.meta.url)) { deadline(180, 'G12-premisse'); finish('G12-premisse', await run()); }

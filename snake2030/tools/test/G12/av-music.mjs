/* G12 T2/T3/T5 — la musique : équilibre avec les effets, réponse à l'intensité,
   accent de phase, démarrage sans intro, reprise sur une mesure.
   Tout est mesuré sur les ÉCHANTILLONS du bus musique ou du maître. */
import { launchDesktop, startGame, sleep, save, isMain, finish, deadline } from '../lib.mjs';
import { installCapture } from './g12lib.mjs';
const THRESH = "shootOverMusicDb ≥ +9 dB ; killOverMusicDb ≥ +10 dB ; hitOverMusicDb ≥ +3 dB ; RMS musique v=1 − v=0 ≥ +6 dB ; couches seules v=1 ≥ −24 dBFS ; pic maître ≥ +4 dB en ≤ 300 ms au changement de levelPhase ; RMS bus musique ≥ −24 dBFS en ≤ 2 s après JOUER ; reprise après mort = multiple de 1,66 s ± 30 ms";

const capt = (page, secs) => page.evaluate(async s => {
  window.__capStart(s);
  const t = performance.now();
  while (window.__capBusy() && performance.now() - t < s * 1000 + 900) await new Promise(r => setTimeout(r, 30));
  return window.__capAnalyse();
}, secs);

export async function run() {
  const m = {};
  /* ---- 1. bus musique : démarrage, intensité, couches seules ---- */
  const c1 = await launchDesktop();
  try {
    const t0 = Date.now();
    await startGame(c1);
    const cap = await installCapture(c1.page, 'musique');
    m.cap = cap;
    if (!cap.ok) return { pass: false, measured: m, threshold: THRESH, code: 2 };
    /* « RMS bus musique >= -24 dBFS en <= 2 s apres JOUER » : le niveau doit
       etre atteint DANS ces deux secondes. On capture donc a partir de la pose
       du capteur (environ 0,45 s apres le clic) et pendant 1,5 s — soit une
       fenetre entierement contenue dans les 2 s — et on retient le MAXIMUM du
       RMS par tranches de 0,5 s. L'ancienne lecture ouvrait sa fenetre A 2 s
       (donc 2,0-2,8 s) : elle mesurait le niveau APRES le delai, pas dedans.
       Les deux chiffres sont rapportes ; le seuil de -24 dBFS n'est pas touche. */
    m.poseCapteurMs = Date.now() - t0;
    m.demarrage2s = await c1.page.evaluate(async () => {
      window.__capStart(1.5);
      const t = performance.now();
      while (window.__capBusy() && performance.now() - t < 2400) await new Promise(r => setTimeout(r, 25));
      const env = window.__capEnv(500) || [], a = window.__capAnalyse();
      let mx = 0; for (const x of env) if (x > mx) mx = x;
      const db = x => +(20 * Math.log10(Math.max(x, 1e-7))).toFixed(2);
      return { tranches: env.map(db), maxRmsDb: db(mx), moyenneRmsDb: a.rmsDb };
    });
    const w = 2000 - (Date.now() - t0); if (w > 0) await sleep(w);
    m.demarrageApres2s = await capt(c1.page, 0.8);
    m.demarrage = m.demarrageApres2s;
    m.playing2s = await c1.page.evaluate(() => { const p = window.__M.audio.playing(); return p ? { i: p.i, t: +p.t.toFixed(2) } : null; });
    // intensité imposée, niveau figé
    await c1.page.evaluate(() => { window.__S.paused = true; window.__M.audio.setIntensity(0); });
    await sleep(1800);
    m.v0 = await capt(c1.page, 1.0);
    await c1.page.evaluate(() => window.__M.audio.setIntensity(1));
    await sleep(1800);
    m.v1 = await capt(c1.page, 1.0);
    // couches seules (piste coupée) à v = 1
    await c1.page.evaluate(() => window.__M.audio.layersOnly(true));
    await sleep(900);
    m.couches = await capt(c1.page, 1.0);
    await c1.page.evaluate(() => window.__M.audio.layersOnly(false));
  } finally { await c1.close(); }

  /* ---- 2. maître : équilibre effets / musique, accent de phase ---- */
  const c2 = await launchDesktop();
  try {
    await startGame(c2);
    await sleep(1200);
    const cap = await installCapture(c2.page, 'tout');
    if (!cap.ok) return { pass: false, measured: m, threshold: THRESH, code: 2 };
    await c2.page.evaluate(() => { window.__S.paused = true; window.__M.audio.setIntensity(0.5); });
    await sleep(1400);
    const musSeule = await capt(c2.page, 1.0);
    m.musiqueSeule = musSeule;
    const avec = async (name, vol) => {
      const r = await c2.page.evaluate(async ([n, v]) => {
        window.__capStart(0.6);
        await new Promise(r => setTimeout(r, 30));
        window.__M.audio.sfx(n, { vol: v });
        const t = performance.now();
        while (window.__capBusy() && performance.now() - t < 1400) await new Promise(r => setTimeout(r, 20));
        return window.__capAnalyse();
      }, [name, vol]);
      await sleep(400);
      return r;
    };
    m.shootAvec = await avec('shoot', 0.7);
    m.killAvec = await avec('kill', 1);
    m.hitAvec = await avec('hit', 1);
    m.shootOverMusicDb = +(m.shootAvec.peakDb - musSeule.rmsDb).toFixed(2);
    m.killOverMusicDb = +(m.killAvec.peakDb - musSeule.rmsDb).toFixed(2);
    m.hitOverMusicDb = +(m.hitAvec.peakDb - musSeule.rmsDb).toFixed(2);
    // accent de phase : on mesure la seconde qui précède puis les 300 ms qui suivent
    m.stinger = await c2.page.evaluate(async () => {
      window.__capStart(1.0);
      let t = performance.now();
      while (window.__capBusy() && performance.now() - t < 1900) await new Promise(r => setTimeout(r, 20));
      const avant = window.__capAnalyse().rmsDb;
      window.__capStart(0.30);
      window.__M.audio.stinger();
      t = performance.now();
      while (window.__capBusy() && performance.now() - t < 1200) await new Promise(r => setTimeout(r, 20));
      const ap = window.__capAnalyse();
      /* La spec dit « pic RMS master », pas « crête d'échantillon » : comparer
         un maximum d'échantillon à un RMS mesure un facteur de crête, pas un
         accent (+18,65 dB ainsi obtenus pour un accent qui n'en faisait pas
         4). On prend donc le MAXIMUM du RMS par fenêtres de 93 ms — la même
         grandeur et la même fenêtre que av-desk.mjs. Le seuil de +4 dB de la
         spec n'est pas touché. */
      const env = window.__capEnv(93) || [];
      let picRms = 0; for (const x of env) if (x > picRms) picRms = x;
      const picRmsDb = +(20 * Math.log10(Math.max(picRms, 1e-7))).toFixed(2);
      return { avantRmsDb: avant, picDb: ap.peakDb, picRmsDb: picRmsDb, apresRmsDb: ap.rmsDb,
               creteSurRmsDb: +(ap.peakDb - avant).toFixed(2), gainDb: +(picRmsDb - avant).toFixed(2) };
    });
  } finally { await c2.close(); }

  /* ---- 3. reprise après une mort : début de mesure ---- */
  const c3 = await launchDesktop();
  try {
    await startGame(c3);
    await sleep(2500);
    m.bar = await c3.page.evaluate(() => window.__M.audio.bar());
    m.avantMort = await c3.page.evaluate(() => { const p = window.__M.audio.playing(); return p ? +p.t.toFixed(3) : null; });
    await c3.page.evaluate(() => { window.__M.audio.stop(); });
    await sleep(700);
    /* La lecture avance pendant qu'on l'interroge : on relève la position ET
       le temps écoulé depuis la reprise DANS LA MÊME évaluation, et on retire
       l'un de l'autre. Sans cela on mesure sa propre latence (764 ms). */
    const rr = await c3.page.evaluate(async () => {
      const t0 = performance.now();
      window.__M.audio.start();
      await new Promise(r => setTimeout(r, 60));   /* au plus court : chaque ms d'attente est une ms de lecture à retrancher, donc une ms d'incertitude */
      const p = window.__M.audio.playing();
      return p ? { t: p.t, ecoule: (performance.now() - t0) / 1000 } : null;
    });
    await sleep(200);
    m.repriseBrut = rr;
    const t = rr ? +(rr.t - rr.ecoule).toFixed(3) : null;
    m.reprise = t;
    if (t != null && m.bar) {
      const r = t - Math.round(t / m.bar) * m.bar;
      m.repriseEcartMs = Math.round(Math.abs(r) * 1000);
    }
  } finally { await c3.close(); }

  save('G12-av-music.json', m);
  const checks = {
    shootOverMusic: m.shootOverMusicDb >= 9,
    killOverMusic: m.killOverMusicDb >= 10,
    hitOverMusic: m.hitOverMusicDb >= 3,
    intensite: m.v1 && m.v0 ? (m.v1.rmsDb - m.v0.rmsDb) >= 6 : false,
    couches: m.couches ? m.couches.rmsDb >= -24 : false,
    stinger: m.stinger ? m.stinger.gainDb >= 4 : false,
    demarrage: m.demarrage2s ? m.demarrage2s.maxRmsDb >= -24 : false,
    reprise: m.repriseEcartMs != null && m.repriseEcartMs <= 30
  };
  m.checks = checks;
  m.deltaIntensiteDb = m.v1 && m.v0 ? +(m.v1.rmsDb - m.v0.rmsDb).toFixed(2) : null;
  save('G12-av-music.json', m);
  const pass = Object.values(checks).every(Boolean);
  return { pass, measured: m, threshold: THRESH, code: pass ? 0 : 1 };
}
if (isMain(import.meta.url)) { deadline(300, 'G12-av-music'); finish('G12-av-music', await run()); }

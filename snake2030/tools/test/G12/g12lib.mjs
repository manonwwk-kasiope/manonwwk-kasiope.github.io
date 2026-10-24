/* Outils communs G12 — mesure du SON RÉELLEMENT SORTI.
   Le capteur est un ScriptProcessorNode branché sur audio.tap(node,'tout')
   (sortie maître, après compresseur et gain maître) ou 'musique' (bus musique).
   On capture les ÉCHANTILLONS, pas un compteur d'appels : crête, RMS, spectre. */
export const SFX_VOL = {
  /* volume tel que le jeu l'appelle réellement (site d'appel), pas 1 par défaut */
  shoot: 0.7, eshoot: 1, laser: 1, missile: 1, shock: 1, zap: 1, hit: 1, wallBump: 1,
  kill: 1, bigkill: 1, explode: 1, pickup: 1, core: 1, hurt: 1, dead: 1,
  boost: 1, boostEnd: 1, boostDry: 1, warp: 1, spawnTick: 1, absorb: 0.8,
  click: 1, levelup: 1, multUp: 1, card: 1, ultReady: 1, ultFire: 1,
  bossIn: 1, bossHit: 1, lowHp: 1, teleport: 1, steal: 1
};
/* Cibles de crête dBFS. Les 17 valeurs de la spec sont reprises telles quelles.
   La spec parle de « chacun des 30 sons » mais n'en chiffre que 17 : les 15 autres
   reçoivent ici une cible dérivée de leur classe, déclarée et mesurée de la même
   façon (voir deviations du rapport). */
export const TARGET = {
  /* --- chiffrées par la spec --- */
  shoot: -12, hit: -14, pickup: -14, core: -12, kill: -8, bigkill: -4, explode: -4,
  hurt: -4, bossIn: -3, dead: -3, click: -16, card: -14, levelup: -10, boost: -12,
  boostEnd: -16, boostDry: -16, warp: -10,
  /* --- dérivées (classe) --- */
  eshoot: -16, laser: -13, missile: -10, shock: -13, zap: -14, wallBump: -13,
  spawnTick: -18, absorb: -18, multUp: -13, ultReady: -8, ultFire: -3,
  bossHit: -10, lowHp: -14, teleport: -12, steal: -10
};
export const CLASSES = {
  tirs: ['shoot', 'eshoot', 'laser', 'missile'],
  impacts: ['hit', 'wallBump', 'absorb', 'kill', 'bigkill'],
  ressources: ['pickup', 'core', 'multUp'],
  danger: ['hurt', 'dead', 'lowHp', 'bossIn'],
  interface: ['click', 'card', 'levelup', 'spawnTick']
};

/** Capteur d'échantillons : window.__capStart(secs) / __capGet() -> Float32 en tableau. */
export async function installCapture(page, quoi = 'tout') {
  return page.evaluate((quoi) => {
    const M = window.__M;
    try { M.audio.init && M.audio.init(); } catch (e) {}
    const c = M.audio.ctx;
    if (!c) return { ok: false, why: 'ctx absent' };
    const sp = c.createScriptProcessor(1024, 1, 1);
    const mute = c.createGain(); mute.gain.value = 0;
    sp.connect(mute); mute.connect(c.destination);
    let buf = null, n = 0, on = false;
    sp.onaudioprocess = e => {
      const d = e.inputBuffer.getChannelData(0);
      if (!on || !buf) return;
      for (let i = 0; i < d.length && n < buf.length; i++) buf[n++] = d[i];
      if (n >= buf.length) on = false;
    };
    if (!M.audio.tap(sp, quoi)) return { ok: false, why: 'tap refusé' };
    window.__capStart = secs => { buf = new Float32Array(Math.ceil(c.sampleRate * secs)); n = 0; on = true; };
    window.__capBusy = () => on;
    window.__capGet = () => ({ n, sr: c.sampleRate });
    /* analyse en page : on ne transporte pas les échantillons, on transporte les nombres */
    window.__capAnalyse = () => {
      if (!buf || !n) return null;
      let peak = 0, s2 = 0;
      for (let i = 0; i < n; i++) { const a = buf[i] < 0 ? -buf[i] : buf[i]; if (a > peak) peak = a; s2 += buf[i] * buf[i]; }
      const N = 1 << Math.ceil(Math.log2(Math.min(n, 65536)));
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < N && i < n; i++) re[i] = buf[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
      // FFT radix-2 sur place
      for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
      for (let len = 2; len <= N; len <<= 1) {
        const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
        for (let i = 0; i < N; i += len) {
          let cr = 1, ci = 0;
          for (let k = 0; k < len / 2; k++) {
            const ur = re[i + k], ui = im[i + k];
            const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
            const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
            re[i + k] = ur + vr; im[i + k] = ui + vi;
            re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
            const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
          }
        }
      }
      const sr = c.sampleRate, df = sr / N;
      let tot = 0, low = 0, mid = 0, cen = 0;
      for (let k = 1; k < N / 2; k++) {
        const p = re[k] * re[k] + im[k] * im[k], f = k * df;
        if (f > 16000) break;
        tot += p; cen += p * f;
        if (f < 400) low += p;
        if (f >= 600 && f <= 2000) mid += p;
      }
      const db = x => x > 0 ? 20 * Math.log10(x) : -120;
      return {
        peakDb: +db(peak).toFixed(2), rmsDb: +db(Math.sqrt(s2 / n)).toFixed(2),
        lowFrac: tot > 0 ? +(low / tot).toFixed(4) : 1,
        midFrac: tot > 0 ? +(mid / tot).toFixed(4) : 0,
        centroid: tot > 0 ? Math.round(cen / tot) : 0, n, sr
      };
    };
    /* enveloppe RMS par fenêtres de ms, pour compter des attaques distinctes */
    window.__capEnv = (winMs) => {
      if (!buf || !n) return null;
      const w = Math.max(1, Math.round(c.sampleRate * winMs / 1000)), out = [];
      for (let i = 0; i + w <= n; i += w) { let s = 0; for (let k = 0; k < w; k++) s += buf[i + k] * buf[i + k]; out.push(Math.sqrt(s / w)); }
      return out;
    };
    /* 100 premières ms brutes, sous-échantillonnées, pour la corrélation croisée */
    window.__capHead = (ms) => {
      if (!buf || !n) return null;
      const m = Math.min(n, Math.round(c.sampleRate * ms / 1000)), out = new Array(m);
      for (let i = 0; i < m; i++) out[i] = buf[i];
      return out;
    };
    return { ok: true, sr: c.sampleRate };
  }, quoi);
}

/** Joue un son isolé et rend son analyse (crête réelle en sortie maître). */
export async function measureSfx(page, name, vol, secs = 1.4) {
  return page.evaluate(async ([name, vol, secs]) => {
    window.__capStart(secs);
    await new Promise(r => setTimeout(r, 40));
    window.__M.audio.sfx(name, { vol });
    const t0 = performance.now();
    while (window.__capBusy() && performance.now() - t0 < secs * 1000 + 800) await new Promise(r => setTimeout(r, 30));
    return window.__capAnalyse();
  }, [name, vol, secs]);
}

export function ncc(a, b) {
  const n = Math.min(a.length, b.length);
  let best = 0;
  const na = Math.sqrt(a.reduce((s, x) => s + x * x, 0)), nb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  if (!na || !nb) return 0;
  const maxLag = Math.round(n * 0.5);
  for (let lag = -maxLag; lag <= maxLag; lag += 4) {
    let s = 0;
    for (let i = 0; i < n; i++) { const j = i + lag; if (j >= 0 && j < n) s += a[i] * b[j]; }
    const v = Math.abs(s / (na * nb));
    if (v > best) best = v;
  }
  return best;
}

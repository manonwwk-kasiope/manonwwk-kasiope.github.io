/* G12 T3 (part manquante) — la musique SUIT L'ACTION sur une vraie partie.
   Écrit par le VÉRIFICATEUR : le constructeur ne l'avait pas écrit.
   Partie pilotée de 3 min, bureau, musique en flux, joueuse increvable.
   Deux capteurs d'échantillons (bus musique et sortie maître) relèvent le RMS
   par fenêtres d'environ 93 ms (≈ 10,7 Hz) ET, DANS LA MÊME callback, la valeur
   de S.intensity et de S.levelPhase : aucune lecture désynchronisée.
   Seuils (spec) : corr(S.intensity, RMS bus musique) ≥ 0,5 ;
   à chaque changement de S.levelPhase, pic RMS maître ≥ +4 dB au-dessus de la
   seconde précédente, en ≤ 300 ms — par le CHEMIN DU JEU, sans appeler
   audio.stinger() depuis le test. */
import { launchDesktop, startGame, sleep, save, isMain, finish, deadline,
         installProbe, installInvuln, installAutoPilot, playFor } from '../lib.mjs';
const THRESH = "corr(S.intensity, RMS bus musique ~10 Hz, 3 min) ≥ 0,5 ; à chaque changement de S.levelPhase : max(RMS maître, 300 ms après) − RMS(1 s avant) ≥ +4 dB";

const DUREE = 180;

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 8) return null;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; sa += da * da; sb += db * db; }
  if (sa <= 0 || sb <= 0) return 0;
  return sab / Math.sqrt(sa * sb);
}

export async function run() {
  const ctx = await launchDesktop();
  const m = {};
  try {
    await startGame(ctx);
    await sleep(800);
    /* capteurs : un par bus, chacun note le RMS de sa fenêtre + l'état DU MÊME
       instant (ScriptProcessor tourne sur le fil principal, donc __S est celui
       de l'image courante). */
    const pose = await ctx.page.evaluate(() => {
      const M = window.__M, S = window.__S, c = M.audio.ctx;
      if (!c) return { ok: false, why: 'ctx absent' };
      window.__SER = { mus: [], mas: [] };
      const mk = (quoi, dest) => {
        const sp = c.createScriptProcessor(4096, 1, 1);
        const mute = c.createGain(); mute.gain.value = 0;
        sp.connect(mute); mute.connect(c.destination);
        sp.onaudioprocess = e => {
          const d = e.inputBuffer.getChannelData(0);
          let s2 = 0;
          for (let i = 0; i < d.length; i++) s2 += d[i] * d[i];
          dest.push({ t: +c.currentTime.toFixed(3), r: Math.sqrt(s2 / d.length),
                      v: +(S.intensity || 0).toFixed(4), ph: S.levelPhase || '', lv: S.level || 0 });
        };
        return M.audio.tap(sp, quoi);
      };
      const a = mk('musique', window.__SER.mus), b = mk('tout', window.__SER.mas);
      return { ok: a && b, sr: c.sampleRate, buf: 4096 };
    });
    m.capteurs = pose;
    if (!pose.ok) return { pass: false, measured: m, threshold: THRESH, code: 2 };

    await installProbe(ctx.page);
    await installInvuln(ctx.page);
    await installAutoPilot(ctx.page);
    await ctx.page.evaluate(() => { window.__M.audio.resetStats(); window.__SER.mus.length = 0; window.__SER.mas.length = 0; });
    await playFor(ctx, DUREE, { cards: true, god: true });

    const brut = await ctx.page.evaluate(() => ({
      mus: window.__SER.mus, mas: window.__SER.mas,
      stats: window.__M.audio.stats(), S: { level: window.__S.level, phase: window.__S.levelPhase, kills: window.__S.kills },
      err: window.__ERR ? window.__ERR.count : null
    }));
    m.n = { mus: brut.mus.length, mas: brut.mas.length };
    m.stingerJoues = brut.stats.stinger || 0;
    m.fin = brut.S;
    m.err = brut.err;

    /* --- corrélation intensité / RMS du bus musique --- */
    const mus = brut.mus.filter(s => s.r > 0);
    m.hz = mus.length > 2 ? +(mus.length / (mus[mus.length - 1].t - mus[0].t)).toFixed(2) : 0;
    const vs = mus.map(s => s.v);
    const db = mus.map(s => 20 * Math.log10(Math.max(s.r, 1e-7)));
    m.corrDb = +(pearson(vs, db) || 0).toFixed(3);
    m.corrLin = +(pearson(vs, mus.map(s => s.r)) || 0).toFixed(3);
    m.vMin = +Math.min(...vs).toFixed(3); m.vMax = +Math.max(...vs).toFixed(3);
    m.rmsMinDb = +Math.min(...db).toFixed(2); m.rmsMaxDb = +Math.max(...db).toFixed(2);

    /* --- accent de phase, par le chemin du jeu --- */
    const mas = brut.mas;
    const chg = [];
    for (let i = 1; i < mas.length; i++) if (mas[i].ph !== mas[i - 1].ph) chg.push(i);
    m.changements = chg.map(i => ({ t: mas[i].t, de: mas[i - 1].ph, vers: mas[i].ph, lv: mas[i].lv }));
    m.accents = [];
    for (const i of chg) {
      const t = mas[i].t;
      let e = 0, k = 0;
      for (let j = i - 1; j >= 0 && mas[j].t >= t - 1.0; j--) { e += mas[j].r * mas[j].r; k++; }
      if (!k) continue;
      const avant = Math.sqrt(e / k);
      let pic = 0;
      for (let j = i; j < mas.length && mas[j].t <= t + 0.35; j++) if (mas[j].r > pic) pic = mas[j].r;
      m.accents.push({ t: +t.toFixed(2), vers: mas[i].ph,
        avantDb: +(20 * Math.log10(Math.max(avant, 1e-7))).toFixed(2),
        picDb: +(20 * Math.log10(Math.max(pic, 1e-7))).toFixed(2),
        gainDb: +(20 * Math.log10(Math.max(pic, 1e-7) / Math.max(avant, 1e-7))).toFixed(2) });
    }
    m.accentsFaibles = m.accents.filter(a => a.gainDb < 4);
  } finally { await ctx.close(); }

  const checks = {
    correlation: m.corrDb >= 0.5,
    accentsMesures: m.accents.length > 0,
    accents: m.accents.length > 0 && m.accentsFaibles.length === 0
  };
  m.checks = checks;
  save('G12-av-desk.json', m);
  const pass = Object.values(checks).every(Boolean);
  return { pass, measured: m, threshold: THRESH, code: pass ? 0 : 1 };
}
if (isMain(import.meta.url)) { deadline(330, 'G12-av-desk'); finish('G12-av-desk', await run()); }

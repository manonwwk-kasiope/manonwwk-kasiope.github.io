// NR — diag : partie réelle de 90 s de jeu en bureau 1440×900 (pilote clavier) puis iPhone 13 paysage (doigt).
// Journal des temps d'image (p50/p95/p99/part > 33 ms), pageerror, console.error, __ERR.count, S.pxEff,
// captures à 2/15/40/80 s dans out/. Le serpent est régénéré quand il est court (mode « dieu » par
// régénération) pour que la partie couvre les 90 s ; dégâts, effets et sons restent naturels.
// Partie DÉTERMINISTE (G1, voir installAutoPilot dans lib.mjs) : graine de jeu imposée (window.__SEED),
// pas de temps imposé (window.__DT = 1/60), pilote dans la page (entrées synthétiques indexées sur l'image,
// clavier en bureau, toucher sur iPhone), cartes choisies après un nombre fixe d'images : la suite d'états
// du jeu — donc le coût de rendu de chaque image — est la même d'une exécution à l'autre ; les temps
// d'image mesurés sont les deltas rAF réels. Les 90 s sont comptées en temps de jeu (S.t) : même contenu
// de partie quel que soit le taux d'images de la machine.
// Bureau : sans limiteur de cadence (launchDesktop unthrottled, voir lib.mjs) — le delta rAF est le coût réel
// de l'image, continu, au lieu d'une valeur bimodale 16,7/33,3 ms dont la part > 33 ms oscillait de ±4 points
// sous charge avec une partie identique ; S2030_DESK_VSYNC=1 rétablit la cadence 60 Hz. iPhone : cadence 60 Hz.
import { launchDesktop, launchPhone, startGame, installGod, installProbe, installAutoPilot, playDet, pullProbe, playStats, state, errCount, errSigs, save, OUT, isMain, finish, deadline } from './lib.mjs';

const SECS = +(process.env.S2030_DIAG_SECS || 90);
// graine de partie imposée (window.__SEED → resetRun) sur les deux profils : mêmes vagues d'une exécution à
// l'autre, part > 33 ms et p99 comparables ; S2030_SEED pour en changer
const SEED = +(process.env.S2030_SEED || 2030);
const SHOTS = [2, 15, 40, 80].filter(s => s < SECS);
const THRESH = 'par profil : pageErrors == 0, consoleErrors == 0, __ERR.count === 0 ; iPhone p99 ≤ 33 ms ; bureau 1440×900 p99 ≤ 33 ms (seuil ABSOLU depuis G13 : il était comparé à baseline.json, donc à une machine et un instant, et une régression pouvait passer si la référence était mauvaise)';

export async function runProfile(kind, secs = SECS) {
  const ctx = kind === 'iphone' ? await launchPhone() : await launchDesktop(1440, 900, { unthrottled: !process.env.S2030_DESK_VSYNC });
  const { page } = ctx;
  try {
    await installProbe(page);
    await installGod(page);
    await installAutoPilot(page, { mode: kind === 'iphone' ? 'touch' : 'key', seed: SEED });
    await startGame(ctx, { seed: SEED });
    const shotsAt = []; let nextShot = 0; const ticks = [];
    const res = await playDet(ctx, secs, { onTick: async (el) => {
      if (nextShot < SHOTS.length && el >= SHOTS[nextShot]) {
        const st = await page.evaluate(() => window.__S.t);
        await page.screenshot({ path: `${OUT}/diag-${kind}-t${SHOTS[nextShot]}.png` });
        shotsAt.push(st); nextShot++;
      }
      if (Math.round(el) % 15 === 0) { const s = await state(page); ticks.push({ el: Math.round(el), level: s.level, kills: s.kills, ne: s.ne, pxEff: s.pxEff, persp: s.persp, err: s.err && s.err.count }); }
    } });
    const P = await pullProbe(page);
    const st = await state(page);
    const sp = playStats(P.f, shotsAt);
    const px = {}; for (const o of P.f) px[o.pxEff] = (px[o.pxEff] || 0) + 1;
    const seed = await page.evaluate(() => window.__S.seed);
    const pl = res.pilot || {};
    const m = { profile: kind, secs: +res.played.toFixed(0), wallSecs: res.wall, pacing: kind === 'iphone' ? 'vsync60' : (process.env.S2030_DESK_VSYNC ? 'vsync60' : 'unthrottled'), seed, loadMs: ctx.loadMs, frames: P.f.length, ...(sp.play || {}), flat: sp.flat, tilt: sp.tilt, all: sp.all,
      pageErrors: ctx.pageErrors.length, consoleErrors: ctx.consoleErrors.length, errCount: await errCount(page), errSigs: await errSigs(page),
      pxEff: st.pxEff, pxHist: px, level: st.level, kills: st.kills, score: st.score, len: st.len, deadAt: res.deadAt, shots: SHOTS,
      det: { mode: pl.mode, f0: pl.f0, frames: res.frames, t0: pl.t0, tSnapFrom: pl.tSnapFrom, decisions: pl.decisions, cards: pl.cards, ult: pl.ultN, special: pl.specialN, events: pl.events, pilotErr: pl.err },
      firstPageError: ctx.pageErrors[0] || null, firstConsoleError: ctx.consoleErrors[0] || null, ticks };
    save(`diag-${kind}.json`, { measured: m, frames: P.f.map(o => [o.raw, o.t, o.phase === 'play' ? 1 : 0, o.paused, o.pxEff, o.ne, o.persp]), pageErrors: ctx.pageErrors.slice(0, 30), consoleErrors: ctx.consoleErrors.slice(0, 30) });
    return m;
  } finally { await ctx.close(); }
}

export async function run(secs = SECS) {
  const measured = {};
  for (const kind of ['desk1440', 'iphone']) {
    const m = await runProfile(kind, secs);
    measured[kind] = m;
    console.log(`[diag ${kind}] seed=${m.seed} n=${m.n} p50=${m.p50} p95=${m.p95} p99=${m.p99} >33ms=${m.pct33}% pageErrors=${m.pageErrors} consoleErrors=${m.consoleErrors} __ERR=${m.errCount} pxEff=${m.pxEff} level=${m.level} kills=${m.kills} score=${m.score} frames=${m.det.frames} wall=${m.wallSecs}s${m.det.pilotErr ? ' PILOTE:' + m.det.pilotErr : ''}`);
  }
  const d = measured.desk1440, i = measured.iphone;
  const errOk = [d, i].every(m => m.pageErrors === 0 && m.consoleErrors === 0 && m.errCount === 0);
  const errNull = [d, i].some(m => m.errCount == null);
  const iphoneOk = i.p99 != null && i.p99 <= 33;
  /* SEUIL BUREAU ABSOLU (G13). Il était « comparé à baseline.json par run.mjs », c'est-à-dire à une
     mesure prise sur une autre machine à un autre instant ; une partie qui saccade passait dès que la
     référence saccadait autant. Le p99 est maintenant jugé sur lui-même, comme sur iPhone. */
  const deskOk = d.p99 != null && d.p99 <= 33;
  const pass = errOk && iphoneOk && deskOk;
  const code = pass ? 0 : (errNull && [d, i].every(m => m.pageErrors === 0 && m.consoleErrors === 0) && iphoneOk && deskOk ? 2 : 1);
  return { pass, measured, threshold: THRESH, code, gates: { errOk, iphoneOk, deskOk, deskP99: d.p99, iphoneP99: i.p99 } };
}

if (isMain(import.meta.url)) {
  deadline(SECS * 5 + 180, 'diag');
  finish('diag', await run());
}

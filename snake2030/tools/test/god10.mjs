// G1 test 3 — partie « dieu » de 10 min sur bureau 1440×900 (S.snake.ghost/invuln = 1e9),
// pilote clavier, niveaux 1→6 : compte pageerror, console.error et window.__ERR.count.
import { launchDesktop, startGame, installInvuln, playFor, state, errCount, errSigs, save, isMain, finish, deadline } from './lib.mjs';

const THRESH = 'pageErrors == 0 et __ERR.count === 0 sur 10 min (niveaux 1→6)';
const SECS = +(process.env.S2030_GOD_SECS || 600);

export async function run(secs = SECS) {
  const ctx = await launchDesktop(1440, 900);
  const { page } = ctx;
  const ticks = [];
  let levelMax = 1, killsMax = 0;
  let res;
  try {
    await installInvuln(page);
    await startGame(ctx);
    res = await playFor(ctx, secs, { restart: true, tickEvery: 30, onTick: async (el) => {
      const st = await state(page);
      levelMax = Math.max(levelMax, st.level || 1); killsMax = Math.max(killsMax, st.kills || 0);
      const row = { el: +el.toFixed(0), t: +(st.t / 1000).toFixed(0), phase: st.phase, level: st.level, kills: st.kills, ne: st.ne, len: st.len, pxEff: st.pxEff,
        pageErrors: ctx.pageErrors.length, consoleErrors: ctx.consoleErrors.length, err: st.err ? st.err.count : null };
      ticks.push(row);
      console.log('[god10]', JSON.stringify(row));
    } });
    const st = await state(page);
    levelMax = Math.max(levelMax, st.level || 1); killsMax = Math.max(killsMax, st.kills || 0);
    const measured = { secs: +res.played.toFixed(0), pageErrors: ctx.pageErrors.length, consoleErrors: ctx.consoleErrors.length,
      errCount: await errCount(page), errSigs: await errSigs(page), levelMax, levelEnd: st.level, kills: killsMax, restarts: res.restarts, deadAt: res.deadAt,
      firstPageError: ctx.pageErrors[0] || null, firstConsoleError: ctx.consoleErrors[0] || null, gameTimeS: +(st.t / 1000).toFixed(0) };
    save('god10.json', { measured, ticks, pageErrors: ctx.pageErrors.slice(0, 30), consoleErrors: ctx.consoleErrors.slice(0, 30) });
    const errOk = measured.pageErrors === 0 && measured.errCount === 0;
    const pass = errOk;
    let code = pass ? 0 : 1;
    if (!pass && measured.pageErrors === 0 && measured.errCount == null) code = 2;      // __ERR absent : non mesurable
    if (pass && levelMax < 3) code = 2;                                                  // niveau 3 jamais atteint : pas de brouilleur, scénario non reproduit
    return { pass: pass && code === 0, measured, threshold: THRESH, code };
  } finally { await ctx.close(); }
}

if (isMain(import.meta.url)) {
  deadline(SECS + 120, 'god10');
  finish('god10', await run());
}

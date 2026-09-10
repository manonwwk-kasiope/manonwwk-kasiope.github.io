// G2 test 6 — profil tablette 1194×834 tactile (entrées CDP).
// A) hidden → visible → tap REPRENDRE : compteur navigator.wakeLock.request === 2 (aujourd'hui 1) ; AudioContext.prototype.resume
//    appelé ≥ 1 fois après un visibilitychange visible avec state simulé 'interrupted' (compté de l'événement visible à la reprise incluse).
//    À la mise en arrière-plan les sentinelles de verrou d'écran sont libérées, comme le fait le navigateur.
// B) partie de 60 s au doigt : 0 message console de type error (aujourd'hui 1050 par 150 s).
import { launchTablet, startGame, hasButton, clickButton, playFor, sleep, save, finish, deadline } from '../lib.mjs';
import { INIT_WAKE_SPY, INIT_AUDIO_SPY, setVisibility } from '../lifecycle.mjs';
deadline(300, 6);
const THRESH = "wakeLock.request === 2 après hidden→visible→REPRENDRE ; AudioContext.resume ≥ 1 après visible (state 'interrupted') ; tablette 60 s au doigt : 0 console error";
const m = {};

/* ---- A : verrou d'écran + audio interrompu ---- */
{
  const ctx = await launchTablet({ init: [INIT_WAKE_SPY, INIT_AUDIO_SPY] });
  const { page } = ctx;
  try {
    const r = {};
    r.spies = await page.evaluate(() => ({ wakeApi: window.__WL && window.__WL.api, wakeStub: window.__WL && window.__WL.stub, audioSpy: window.__AR && window.__AR.ok }));
    await startGame(ctx);
    await sleep(1500);
    r.afterPlay = await page.evaluate(() => ({ wake: window.__WL.calls, resolved: window.__WL.resolved, rejected: window.__WL.rejected, resume: window.__AR.calls, audState: window.__M.audio && window.__M.audio.ctx ? window.__M.audio.ctx.state : null }));
    const hid = await setVisibility(page, true, { releaseWake: true });
    await sleep(400);
    r.hidden = { ...hid, paused: await page.evaluate(() => window.__S.paused), wake: await page.evaluate(() => window.__WL.calls) };
    await page.evaluate(() => { window.__AUD_FAKE_STATE = 'interrupted'; window.__AR.calls = 0; window.__AR.states = []; });
    r.fakeState = await page.evaluate(() => window.__M.audio && window.__M.audio.ctx ? window.__M.audio.ctx.state : null);
    await setVisibility(page, false);
    await sleep(400);
    r.afterVisible = await page.evaluate(() => ({ wake: window.__WL.calls, resume: window.__AR.calls, paused: window.__S.paused, screen: window.__M.ui.screen() }));
    if (!(await hasButton(page, 'REPRENDRE'))) { r.reprendre = false; m.A = r; throw new Error('REPRENDRE absent'); }
    await clickButton(ctx, 'REPRENDRE');
    await sleep(500);
    r.afterResume = await page.evaluate(() => ({ wake: window.__WL.calls, resolved: window.__WL.resolved, rejected: window.__WL.rejected, resume: window.__AR.calls, resumeStates: window.__AR.states.slice(0, 6), paused: window.__S.paused, phase: window.__S.phase }));
    await page.evaluate(() => { window.__AUD_FAKE_STATE = null; });
    r.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    m.A = r;
  } catch (e) { m.A = { ...(m.A || {}), error: String(e && e.message || e).slice(0, 200) }; }
  finally { await ctx.close(); }
}

/* ---- B : 60 s de partie au doigt, messages console de type error ---- */
{
  const ctx = await launchTablet();
  const { page } = ctx;
  try {
    const r = {};
    await page.evaluate(() => { window.__TC = { cancelable: 0, notCancelable: 0 }; for (const t of ['touchstart', 'touchmove', 'touchend']) addEventListener(t, e => { window.__TC[e.cancelable ? 'cancelable' : 'notCancelable']++; }, { capture: true, passive: true }); });
    await startGame(ctx);
    const played = await playFor(ctx, 60, { restart: true, period: 60 });
    r.played = { secs: +played.played.toFixed(1), deadAt: played.deadAt, restarts: played.restarts };
    r.touch = await page.evaluate(() => window.__TC);
    r.jmagSeen = await page.evaluate(() => window.__S.input.jmag);
    r.consoleErrors = ctx.consoleErrors.length;
    r.firstConsoleErrors = ctx.consoleErrors.slice(0, 3);
    r.pageErrors = ctx.pageErrors.length;
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);
    m.B = r;
  } catch (e) { m.B = { ...(m.B || {}), error: String(e && e.message || e).slice(0, 200), consoleErrors: ctx.consoleErrors.length }; }
  finally { await ctx.close(); }
}

const A = m.A || {}, B = m.B || {};
// null = non mesurable (espion non posé, REPRENDRE absent, partie trop courte) ; false = mesuré et faux
const checks = {
  wakeTwo: A.afterResume ? A.afterResume.wake === 2 : null,
  resumeAfterVisible: (A.afterResume && A.spies && A.spies.audioSpy) ? A.afterResume.resume >= 1 : null,
  zeroConsoleErrors: (B.played && B.played.secs >= 55) ? B.consoleErrors === 0 : null,
};
m.checks = checks;
const vals = Object.values(checks);
const pass = vals.every(v => v === true);
const measuredFalse = vals.some(v => v === false);
save('g2-t6.json', m);
finish(6, { pass, measured: m, threshold: THRESH, code: pass ? 0 : (measuredFalse ? 1 : 2) });

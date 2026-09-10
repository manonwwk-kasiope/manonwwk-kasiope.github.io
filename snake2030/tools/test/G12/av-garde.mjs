/* G12 T4 — la garde ne mange plus de voix.
   8 kills demandés en 80 ms : audio.stats().kill === 8 et 8 attaques distinctes
   sur l'enveloppe RMS 5 ms (pics séparés ≥ 8 ms) ou centroïde croissant.
   6 ramassages : audio.lastSfx().f0 strictement croissant, 6e/1er ≥ 1,3.
   3 min de partie increvable : kills demandés − joués = 0.
   multUp = paliers de S.mult franchis. lowHp > 0 si len ≤ 3 a été atteint. */
import { launchDesktop, startGame, sleep, save, isMain, finish, deadline, installInvuln, installAutoPilot, installProbe, playFor } from '../lib.mjs';
import { installCapture } from './g12lib.mjs';
const THRESH = "stats().kill === 8 pour 8 demandes en 80 ms ; ≥ 8 attaques séparées de ≥ 8 ms OU f0 strictement croissant ; 6 pickups : f0 croissant et 6e/1er ≥ 1,3 ; 3 min : kills demandés − joués = 0 ; multUp = paliers franchis ; lowHp > 0 si len ≤ 3";

export async function run() {
  const ctx = await launchDesktop();
  const m = {};
  try {
    await startGame(ctx);
    await sleep(700);
    await ctx.page.evaluate(() => { window.__M.audio.setMusic(false); window.__S.paused = true; });
    await sleep(300);
    const cap = await installCapture(ctx.page, 'tout');
    m.cap = cap;
    if (!cap.ok) return { pass: false, measured: m, threshold: THRESH, code: 2 };

    /* --- 8 kills en 80 ms --- */
    m.kills = await ctx.page.evaluate(async () => {
      const A = window.__M.audio;
      A.resetStats();
      window.__capStart(1.2);
      await new Promise(r => setTimeout(r, 40));
      const f0 = [];
      /* Huit kills DANS LA MÊME IMAGE, sans attente : c'est ce que fait une
         ultime ou une explosion en chaîne. Les espacer de 10 ms en JS les
         ferait sortir de la fenêtre de 40 ms et mesurerait autre chose. */
      for (let i = 0; i < 8; i++) { A.sfx('kill'); f0.push(+A.lastSfx().f0.toFixed(1)); }
      const t = performance.now();
      while (window.__capBusy() && performance.now() - t < 2000) await new Promise(r => setTimeout(r, 20));
      const env = window.__capEnv(5);
      return { n: A.stats().kill || 0, f0, env };
    });
    // attaques : montées franches de l'enveloppe, séparées d'au moins 8 ms (≥ 2 fenêtres de 5 ms)
    const env = m.kills.env || [];
    const mx = Math.max(...env, 1e-9);
    const att = []; let last = -99;
    for (let i = 1; i < env.length; i++) {
      if (env[i] > mx * 0.05 && env[i] > env[i - 1] * 1.6 && i - last >= 2) { att.push(i * 5); last = i; }
    }
    m.kills.attaques = att;
    m.kills.f0Croissant = m.kills.f0.every((v, i) => i === 0 || v > m.kills.f0[i - 1]);
    delete m.kills.env;

    /* --- 6 ramassages consécutifs --- */
    m.pickups = await ctx.page.evaluate(async () => {
      const A = window.__M.audio; const f = [];
      for (let i = 0; i < 6; i++) { A.sfx('pickup'); f.push(+A.lastSfx().f0.toFixed(1)); await new Promise(r => setTimeout(r, 130)); }
      return f;
    });
    m.pickupCroissant = m.pickups.every((v, i) => i === 0 || v > m.pickups[i - 1]);
    m.pickupRatio = +(m.pickups[5] / m.pickups[0]).toFixed(3);

    /* --- 3 min de partie increvable : aucun kill perdu --- */
    await ctx.page.evaluate(() => { window.__S.paused = false; });
    await installProbe(ctx.page);
    await installInvuln(ctx.page);
    await installAutoPilot(ctx.page);
    await ctx.page.evaluate(() => {
      const A = window.__M.audio; A.resetStats();
      window.__dem = { kill: 0, bigkill: 0, multUp: 0, lowHp: 0 };
      window.__lowSeen = 0;
      const orig = A.sfx.bind(A);
      A.sfx = function (n, o) { if (window.__dem[n] !== undefined) window.__dem[n]++; return orig(n, o); };
      window.__multTiers = 0; window.__multMax = 1;
    });
    await playFor(ctx, 180, { cards: true });
    m.partie = await ctx.page.evaluate(() => {
      const st = window.__M.audio.stats();
      return { demandes: window.__dem, joues: { kill: st.kill || 0, bigkill: st.bigkill || 0, multUp: st.multUp || 0, lowHp: st.lowHp || 0 },
               mult: window.__S.mult, kills: window.__S.kills, len: window.__S.snake.len };
    });
    m.perdus = { kill: m.partie.demandes.kill - m.partie.joues.kill, bigkill: m.partie.demandes.bigkill - m.partie.joues.bigkill,
                 multUp: m.partie.demandes.multUp - m.partie.joues.multUp };
  } finally { await ctx.close(); }

  save('G12-av-garde.json', m);
  const checks = {
    kill8: m.kills.n === 8,
    attaques: m.kills.attaques.length >= 8 || m.kills.f0Croissant,
    pickupF0: m.pickupCroissant && m.pickupRatio >= 1.3,
    aucunKillPerdu: m.perdus.kill === 0 && m.perdus.bigkill === 0,
    multUp: m.perdus.multUp === 0
  };
  m.checks = checks;
  save('G12-av-garde.json', m);
  const pass = Object.values(checks).every(Boolean);
  return { pass, measured: m, threshold: THRESH, code: pass ? 0 : 1 };
}
if (isMain(import.meta.url)) { deadline(330, 'G12-av-garde'); finish('G12-av-garde', await run()); }

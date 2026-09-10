/* Mesure du pilote : un gel d'image produit-il vraiment des images ralenties ?
   La spécification de G8 affirme « fx.hitstop(12) → 0 image gelée ». On mesure la BONNE grandeur,
   S.dt, et non l'écart entre images de la boucle d'affichage, qui reste à 16,7 ms quoi qu'il arrive.
   Deux protocoles : appel direct de fx.hitstop, puis kill réel d'un traqueur. */
import { launchDesktop, startGame, sleep } from './lib.mjs';

const ctx = await launchDesktop(1440, 900, {});
try {
  await ctx.page.evaluate(() => { window.__SEED = 2030; });
  await startGame(ctx, { seed: 2030 });
  await ctx.page.waitForFunction(() => window.__S && window.__S.phase === 'play', null, { timeout: 20000 });
  await sleep(1500);

  // sonde : journalise S.dt et le gel restant à chaque image
  await ctx.page.evaluate(() => {
    window.__HS = { rows: [], on: false, kills: 0 };
    const M0 = window.__M.enemies, d0 = M0.onDeath;
    M0.onDeath = function(e){ window.__HS.kills++; return d0.call(M0, e); };
    const tick = () => {
      requestAnimationFrame(tick);
      if (!window.__HS.on) return;
      const S = window.__S, M = window.__M;
      window.__HS.rows.push({ dt: S.dt, left: M.fx.hitstopLeft ? M.fx.hitstopLeft() : -1, ts: S.t, kills: window.__HS.kills });
    };
    requestAnimationFrame(tick);
  });

  const mesure = async (nom, decl) => {
    await ctx.page.evaluate(() => { window.__HS.rows.length = 0; window.__HS.on = true; });
    await sleep(120);
    await ctx.page.evaluate(decl);
    await sleep(600);
    const rows = await ctx.page.evaluate(() => { window.__HS.on = false; return window.__HS.rows; });
    // plus longue suite d'images consécutives sous 6 ms de temps de jeu
    let best = 0, cur = 0;
    for (const r of rows) { if (r.dt < 0.006) { cur++; if (cur > best) best = cur; } else cur = 0; }
    const gel = rows.filter(r => r.left > 0).length;
    const kills = rows.length ? (rows[rows.length-1].kills - rows[0].kills) : 0;
    console.log(`${nom.padEnd(28)} images à S.dt < 6 ms : ${String(best).padStart(2)} | images avec gel restant > 0 : ${String(gel).padStart(2)} | dt médian hors gel : ${(rows.filter(r=>r.dt>=0.006).map(r=>r.dt).sort((a,b)=>a-b)[Math.floor(rows.length/2)]*1000||0).toFixed(1)} ms | kills pendant la fenêtre : ${kills} | images relevées : ${rows.length}`);
    return best;
  };

  const a = await mesure('fx.hitstop(12) direct', () => { window.__M.fx.hitstop(12); });
  const b = await mesure('fx.hitstop(55) direct', () => { window.__M.fx.hitstop(55); });
  // kill réel : on ramène un traqueur à 1 point de vie et on le laisse mourir sous les canons
  const c = await mesure('kill réel de traqueur', () => {
    const S = window.__S;
    const e = S.enemies.find(x => x.type === 'chaser' && !x.dead) || S.enemies.find(x => !x.dead);
    if (!e) return;
    e.x = S.snake.x + 30; e.y = S.snake.y; e.hp = 1;
  });
  console.log(JSON.stringify({ test: 'pilote-hitstop', mesure: { direct12: a, direct55: b, killReel: c },
    lecture: 'nombre d’images consécutives où S.dt < 0,006 s ; la spec de G8 affirme 0 aujourd’hui et demande 2 pour un kill ordinaire' }));
} finally { await ctx.close(); }

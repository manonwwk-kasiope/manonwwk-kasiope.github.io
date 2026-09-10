/* Vérification de prémisse G13 : « moins de pixels rendus coûte moins cher ».
   Même scène (0 ennemi, position tenue), 1920×1080 CSS, quatre crans forcés, 5 s chacun. */
import { launchDesktop, startGame, save, sleep, frameStats } from '../lib.mjs';
const ctx = await launchDesktop(1920, 1080, { unthrottled: true });
const r = {};
await startGame(ctx, { seed: 2030 });
await ctx.page.evaluate(() => {
  (function t() { requestAnimationFrame(t); const S = window.__S; S.enemies.length = 0; S.ebullets.length = 0;
    S.snake.invuln = 1e9; S.snake.ghost = 1e9; S.snake.hp = S.snake.maxHp; })();
  window.__FR = []; let l = performance.now();
  (function t() { requestAnimationFrame(t); const n = performance.now(); window.__FR.push(n - l); l = n; })();
});
for (const v of [1.5, 1, 0.75, 0.6]) {
  await ctx.page.evaluate(v => { window.__S.opt.px = v; }, v);
  await sleep(2500);
  await ctx.page.evaluate(() => { window.__FR.length = 0; });
  await sleep(5000);
  const o = await ctx.page.evaluate(() => ({ fr: window.__FR.slice(), cw: document.getElementById('game').width, px: window.__S.pxEff }));
  r['px' + v] = { ...frameStats(o.fr), cw: o.cw, pxEff: o.px };
}
await ctx.close();
save('G13-premisse-px.json', r);
console.log(JSON.stringify(r));

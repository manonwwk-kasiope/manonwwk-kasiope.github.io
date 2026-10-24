// G14 test 5 — PARE-CHOCS dit ce qu'il fait, et le fait.
//
//  - le texte de la carte contient « absorbe » ;
//  - u_shield acquis : S.snake.shield === 1 au départ de la partie, et le premier coup
//    encaissé ne retire aucun segment (la charge le prend). Le coup vient du jeu : on
//    attend qu'un TRAQUEUR soit au contact et on laisse tomber l'invulnérabilité.
import { launchDesktop, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { fresh } from './g14lib.mjs';

deadline(240, 'G14-t5');
const THRESH = 'texte de PARE-CHOCS ∋ « absorbe » ; avec u_shield acquis, S.snake.shield === 1 au départ '
  + 'et un coup ne réduit pas S.snake.len';

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

const c = await launchDesktop(1440, 900);
await fresh(c);

m.texte = await c.page.evaluate(() => {
  window.__M.ui.showScreen('unlocks');
  const el = Array.from(document.querySelectorAll('.s2u')).find(e => /PARE-CHOCS/.test(e.textContent));
  return el ? el.textContent : null;
});
dit(/absorbe/i.test(m.texte || ''), 'texte de PARE-CHOCS : ' + m.texte);

await c.page.evaluate(() => {
  window.__S.stats.unlocks = { u_shield: 1 };
  if (window.__M.ui.showScreen) window.__M.ui.showScreen('menu');
});
await startGame(c, { seed: 3131 });
await sleep(600);
m.depart = await c.page.evaluate(() => ({ shield: window.__S.snake.shield, len: window.__S.snake.len }));
dit(m.depart.shield === 1, 'bouclier au départ : ' + m.depart.shield);

/* On attend le contact d'un traqueur, puis on lève l'invulnérabilité et on regarde
   ce que le coup coûte réellement. */
const t0 = Date.now();
let avant = null, apres = null;
while (Date.now() - t0 < 45000) {
  const v = await c.page.evaluate(() => {
    const S = window.__S, s = S.snake;
    if (S.phase !== 'play') return { phase: S.phase };
    let bd = 1e9;
    for (const e of S.enemies) { if (e.dead || e.type !== 'chaser') continue;
      const d = Math.hypot(e.x - s.x, e.y - s.y); if (d < bd) bd = d; }
    if (bd < 55 && s.shield > 0) { s.invuln = 0; return { pret: true, len: s.len, shield: s.shield, d: bd }; }
    return { pret: false, len: s.len, shield: s.shield };
  });
  if (v.phase === 'dead') break;
  if (v.pret && !avant) avant = v;
  if (avant) {
    const w = await c.page.evaluate(() => ({ len: window.__S.snake.len, shield: window.__S.snake.shield, phase: window.__S.phase }));
    if (w.shield === 0) { apres = w; break; }
  }
  await sleep(40);
}
m.avant = avant; m.apres = apres;
dit(!!avant && !!apres, 'coup encaissé non observé : ' + JSON.stringify({ avant, apres }));
if (avant && apres) dit(apres.len === avant.len, 'segments perdus malgré le bouclier : ' + avant.len + ' → ' + apres.len);

m.fails = fails;
const res = { pass: fails.length === 0, measured: m, threshold: THRESH };
save('G14-t5-parechocs.json', res);
await c.close();
finish('G14-t5-parechocs', res);

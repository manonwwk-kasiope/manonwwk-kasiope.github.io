// G14 test 6 — garde-fou des deux conséquences du nouvel écran de fin.
//
//  A. La barre PROCHAIN DÉBLOCAGE mène aux DÉBLOCAGES, et RETOUR ramène à l'écran de fin
//     SANS recompter la partie : stats.runs et stats.coins doivent être identiques avant
//     et après l'aller-retour (_uiFillOver est repeint, la partie n'est close qu'une fois).
//  B. Entrée à l'écran de fin, après le verrou de 600 ms, relance toujours la partie —
//     le premier élément du curseur clavier reste REJOUER malgré la barre ajoutée devant.
import { launchDesktop, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { fresh, mortPar } from './g14lib.mjs';

deadline(300, 'G14-t6');
const THRESH = 'aller-retour écran de fin → DÉBLOCAGES → RETOUR : stats.runs et stats.coins inchangés ; '
  + "Entrée à l'écran de fin (après 700 ms) → S.phase === 'play'";

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

const c = await launchDesktop(1440, 900);
await fresh(c);
await startGame(c, { seed: 2030 });
await sleep(2200);
await mortPar(c, 'chaser', { tmax: 45000 });

m.avant = await c.page.evaluate(() => ({ runs: window.__S.stats.runs, coins: window.__S.stats.coins,
  ecran: window.__M.ui.screen(), best: window.__S.stats.best }));
dit(m.avant.ecran === 'over', "écran de fin non affiché : " + m.avant.ecran);

// clic réel sur la barre (pointerdown, comme _uiTap l'écoute)
await c.page.evaluate(() => {
  document.querySelector('.s2next').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
});
await sleep(300);
m.apresClic = await c.page.evaluate(() => window.__M.ui.screen());
dit(m.apresClic === 'unlocks', 'la barre ne mène pas aux DÉBLOCAGES : ' + m.apresClic);

await c.page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('.s2scr.on button')).find(x => /^RETOUR$/.test(x.textContent.trim()));
  b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
});
await sleep(350);
m.apres = await c.page.evaluate(() => ({ runs: window.__S.stats.runs, coins: window.__S.stats.coins,
  ecran: window.__M.ui.screen(), best: window.__S.stats.best }));
dit(m.apres.ecran === 'over', "RETOUR ne ramène pas à l'écran de fin : " + m.apres.ecran);
dit(m.apres.runs === m.avant.runs, 'parties recomptées : ' + m.avant.runs + ' → ' + m.apres.runs);
dit(m.apres.coins === m.avant.coins, 'crédits recrédités : ' + m.avant.coins + ' → ' + m.apres.coins);

// B — Entrée relance
await sleep(500);
m.focus = await c.page.evaluate(() => {
  const kf = document.querySelector('.s2scr.on .kf');
  return kf ? kf.textContent.trim() : null;
});
await c.page.keyboard.press('Enter');
await sleep(600);
m.apresEntree = await c.page.evaluate(() => ({ phase: window.__S.phase, ecran: window.__M.ui.screen() }));
dit(m.apresEntree.phase === 'play', 'Entrée ne relance pas : ' + JSON.stringify(m.apresEntree) + ' (curseur sur « ' + m.focus + ' »)');

m.fails = fails;
const res = { pass: fails.length === 0, measured: m, threshold: THRESH };
save('G14-t6-allerretour.json', res);
await c.close();
finish('G14-t6-allerretour', res);

// G14 test 4 — iPhone : les trois boutons se nomment, se voient, et disent leur recharge ;
// la vie se lit en pastilles.
//
//  - btnEls.special porte le nom du pouvoir courant (phases.buttonState().nom) en ≥ 11 px ;
//  - opacité CALCULÉE du bouton ★ ≥ 0,45 au repos et ≥ 0,85 quand S.ult ≥ ultMax ;
//  - pendant specialCd > 0 (déclenché par un VRAI appui sur le bouton ◈, pas par un appel
//    direct), le bouton affiche Math.ceil(specialCd / 1000) — relevé DANS LA MÊME
//    évaluation que S.specialCd, sinon les deux valeurs seraient désynchronisées ;
//  - .s2seg contient exactement S.snake.len pastilles, et prend la classe low sous 4.
import { launchPhone, startGame, tapAt, sleep, save, finish, deadline } from '../lib.mjs';

deadline(240, 'G14-t4');
const THRESH = "btnEls.special.textContent ∋ POWERS[courant].nom, font-size de l'étiquette ≥ 11 px ; "
  + 'opacité ★ ≥ 0,45 au repos et ≥ 0,85 quand S.ult ≥ ultMax ; '
  + 'pendant specialCd > 0 le bouton ◈ affiche Math.ceil(specialCd/1000) ; '
  + '.s2seg contient exactement S.snake.len pastilles et la classe low quand len ≤ 3';

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

const c = await launchPhone();
await startGame(c, { seed: 2030 });
await sleep(900);

/* --- nom du pouvoir et taille de l'étiquette --- */
m.special = await c.page.evaluate(() => {
  const b = window.__M.ui.btnEls.special;
  const st = window.__M.phases.buttonState();
  return { txt: b.textContent, nom: st.nom, id: st.id,
           labFs: +parseFloat(getComputedStyle(b._lab).fontSize).toFixed(2),
           lab: b._lab.textContent, aria: b.getAttribute('aria-label') };
});
dit(m.special.txt.indexOf(m.special.nom) >= 0, 'nom du pouvoir absent du bouton : ' + JSON.stringify(m.special));
dit(m.special.labFs >= 11, "taille de l'étiquette : " + m.special.labFs + ' px');

/* --- opacité du bouton ★ --- */
m.ultRepos = await c.page.evaluate(() => {
  const b = window.__M.ui.btnEls.ult;
  return { op: +getComputedStyle(b).opacity, cls: b.className, ult: window.__S.ult, ultMax: window.__S.ultMax };
});
dit(m.ultRepos.ult < m.ultRepos.ultMax, "l'apogée n'est pas au repos : " + m.ultRepos.ult);
dit(m.ultRepos.op >= 0.45, 'opacité ★ au repos : ' + m.ultRepos.op);
await c.page.evaluate(() => { window.__S.ult = window.__S.ultMax; });
await sleep(250);
m.ultPret = await c.page.evaluate(() => {
  const b = window.__M.ui.btnEls.ult;
  return { op: +getComputedStyle(b).opacity, cls: b.className };
});
dit(m.ultPret.op >= 0.85, 'opacité ★ quand prêt : ' + m.ultPret.op);
await c.page.evaluate(() => { window.__S.ult = 0; });

/* --- compte à rebours du pouvoir, déclenché par un vrai appui --- */
const box = await c.page.evaluate(() => {
  const r = window.__M.ui.btnEls.special.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await tapAt(c.cdp, box.x, box.y, 90);
await sleep(500);
m.cd = await c.page.evaluate(() => {
  const b = window.__M.ui.btnEls.special, S = window.__S;
  return { specialCd: S.specialCd, specialCdMax: S.specialCdMax,
           affiche: b._cd.textContent, attendu: '' + Math.ceil(S.specialCd / 1000),
           glyphe: getComputedStyle(b._gl).visibility,
           usedSpecial: S.run ? S.run.usedSpecial : null };
});
dit(m.cd.specialCd > 0, 'le pouvoir ne s’est pas déclenché : specialCd = ' + m.cd.specialCd);
dit(m.cd.affiche === m.cd.attendu, 'compte à rebours affiché ' + m.cd.affiche + ' au lieu de ' + m.cd.attendu);
dit(m.cd.usedSpecial === 1, 'usedSpecial non journalisé : ' + m.cd.usedSpecial);

/* --- pastilles de vie --- */
m.pastilles = [];
for (const len of [null, 7, 3]) {
  if (len !== null) await c.page.evaluate(n => { window.__S.snake.len = n; window.__S.snake.hp = n; }, len);
  await sleep(220);
  const v = await c.page.evaluate(() => {
    const seg = document.querySelector('.s2seg');
    return { len: window.__S.snake.len | 0, n: seg.querySelectorAll('.s2pels>i').length,
             low: seg.classList.contains('low'),
             largeur: +seg.querySelector('.s2pels').getBoundingClientRect().width.toFixed(1) };
  });
  m.pastilles.push(v);
  dit(v.n === v.len, 'pastilles ' + v.n + ' pour len ' + v.len);
  dit(v.low === (v.len <= 3), 'classe low = ' + v.low + ' pour len ' + v.len);
}

m.err = await c.page.evaluate(() => window.__ERR);
dit(!m.err || m.err.count === 0, 'erreurs en jeu : ' + JSON.stringify(m.err));

m.fails = fails;
const res = { pass: fails.length === 0, measured: m, threshold: THRESH };
save('G14-t4-boutons.json', res);
await c.close();
finish('G14-t4-boutons', res);

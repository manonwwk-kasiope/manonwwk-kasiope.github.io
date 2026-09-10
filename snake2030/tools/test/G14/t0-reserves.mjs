// G14 — les deux réserves de portée héritées de G10, contrôlées par la mesure.
//
//  R1. Onglet CONTRÔLES sur BUREAU : les lignes visibles ne vivent plus sous le titre
//      « MANCHE ET BOUTONS » (faux sur bureau, où manche et boutons tactiles sont
//      masqués) mais sous « CLAVIER & SOURIS ». Sur tactile, c'est l'inverse.
//  R2. Le toast de l'apogée dit « APOGÉE PRÊT » — apogée est un nom masculin.
import { launchDesktop, launchPhone, startGame, sleep, save, finish, deadline } from '../lib.mjs';

deadline(200, 'G14-t0');
const THRESH = 'bureau : onglet CONTRÔLES sans titre MANCHE ET BOUTONS visible, avec CLAVIER & SOURIS '
  + 'au-dessus de Sensibilité et Mode souris ; tactile : MANCHE ET BOUTONS visible et CLAVIER & SOURIS masqué ; '
  + 'toast de l\'apogée = « APOGÉE PRÊT »';

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

const LIRE = `(() => {
  const bx = Array.from(document.querySelectorAll('.s2set>.s2scroll')).find(b => !b.hidden);
  const out = [];
  for (const el of bx.querySelectorAll('.s2grp,.s2opt')) {
    if (el.offsetParent === null) continue;
    const s = el.querySelector('s');
    out.push(el.classList.contains('s2grp') ? 'GRP:' + el.textContent.trim() : (s ? s.textContent.trim() : '?'));
  }
  return out;
})()`;
const OUVRE = `(() => {
  window.__M.ui.showScreen('settings');
  const t = document.querySelectorAll('.s2tabs>button')[1];
  t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  return true;
})()`;

{
  const c = await launchDesktop(1440, 900);
  await c.page.evaluate(OUVRE);
  await sleep(400);
  m.bureau = await c.page.evaluate(LIRE);
  const iKb = m.bureau.indexOf('GRP:CLAVIER & SOURIS');
  dit(m.bureau.indexOf('GRP:MANCHE ET BOUTONS') < 0, 'titre MANCHE ET BOUTONS visible sur bureau : ' + JSON.stringify(m.bureau));
  dit(iKb >= 0 && m.bureau[iKb + 1] === 'Sensibilité' && m.bureau[iKb + 2] === 'Mode souris',
      'groupe CLAVIER & SOURIS mal placé : ' + JSON.stringify(m.bureau));
  await c.close();
}
{
  const c = await launchPhone();
  await c.page.evaluate(OUVRE);
  await sleep(400);
  m.tactile = await c.page.evaluate(LIRE);
  dit(m.tactile.indexOf('GRP:MANCHE ET BOUTONS') === 0, 'MANCHE ET BOUTONS absent en tête sur tactile : ' + JSON.stringify(m.tactile));
  dit(m.tactile.indexOf('GRP:CLAVIER & SOURIS') < 0, 'CLAVIER & SOURIS visible sur tactile : ' + JSON.stringify(m.tactile));
  await c.close();
}
{
  // Le toast est émis par readyTick quand l'apogée se remplit : on remplit, on lit la bannière.
  const c = await launchDesktop(1440, 900);
  await startGame(c, { seed: 606 });
  await sleep(700);
  /* Le toast passe par une file d'attente : une bannière de niveau en cours le
     retarde. On relève donc TOUS les titres affichés pendant six secondes au lieu
     d'en lire un seul, à un instant choisi au hasard. */
  await c.page.evaluate(() => {
    window.__TOASTS = [];
    const b = document.querySelector('.s2ann>b');
    setInterval(() => { const v = b.textContent; if (v && window.__TOASTS[window.__TOASTS.length - 1] !== v) window.__TOASTS.push(v); }, 60);
    window.__S.ult = window.__S.ultMax;
  });
  await sleep(6000);
  m.toast = await c.page.evaluate(() => {
    const l = window.__TOASTS || [];
    return { vus: l, apogeePret: l.indexOf('APOGÉE PRÊT') >= 0, apogeePrete: l.indexOf('APOGÉE PRÊTE') >= 0 };
  });
  dit(m.toast.apogeePret && !m.toast.apogeePrete, 'toast apogée : ' + JSON.stringify(m.toast));
  await c.close();
}

m.fails = fails;
const res = { pass: fails.length === 0, measured: m, threshold: THRESH };
save('G14-t0-reserves.json', res);
finish('G14-t0-reserves', res);

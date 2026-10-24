// G14 test 3 — le cran compte : il multiplie le score, il a son propre record, et le menu le dit.
//
//  A. Même graine, même durée de jeu, même pilote, mode invincible des deux côtés (sinon
//     la partie SUICIDE finit avant d'avoir marqué) : le score PAR KILL à SUICIDE vaut au
//     moins 2,0 fois celui de FACILE. « À kills égaux » se mesure ainsi — les deux parties
//     ne tuent pas le même nombre d'ennemis, on ramène donc le score au kill.
//     Le facteur de table est 2,0 / 0,8 = 2,5 ; le seuil de la spec est 2,0.
//  B. Cinq parties, une par cran : localStorage snake2030.v1 contient stats.bestByDiff de
//     longueur 5 avec cinq valeurs > 0.
//  C. Le menu affiche le nom du cran courant et le record de CE cran.
import { sleep, save, finish, deadline } from '../lib.mjs';
import { launchSim, runOne } from '../simlib.mjs';
import { uiNum } from './g14lib.mjs';

deadline(900, 'G14-t3');
const THRESH = 'même graine et même durée : score/kill SUICIDE ÷ score/kill FACILE ≥ 2,0 ; '
  + 'à kills strictement égaux (10 traqueurs ordinaires détruits par le souffle du jeu) : score SUICIDE ÷ score FACILE ≥ 2,0 ; '
  + 'après 5 parties (une par cran) snake2030.v1 contient stats.bestByDiff de longueur 5 avec 5 valeurs > 0 ; '
  + 'le texte du menu contient le nom du cran courant et son record';

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

/* Contexte neuf = localStorage vide = profil vierge. Jamais de reload : launchSim
   injecte son pilote après le chargement, un reload l'effacerait. */
let sim = await launchSim('desk1440');
let page = sim.page;

/* ---- A : facteur de score par cran ---- */
const GRAINE = 8140, DUREE = 60000;
const paires = [];
for (const di of [0, 4]) {
  await page.evaluate(() => { window.__M.ui.showScreen('menu'); });
  await sleep(60);
  const r = await runOne(page, { diff: di, seed: GRAINE, maxT: DUREE, god: true });
  paires.push({ cran: di, score: r.score, kills: r.kills, t: Math.round(r.t), parKill: +(r.score / Math.max(1, r.kills)).toFixed(2) });
}
m.crans = paires;
const ratio = +(paires[1].parKill / paires[0].parKill).toFixed(3);
m.ratioParKill = ratio;
dit(ratio >= 2.0, 'score par kill SUICIDE / FACILE = ' + ratio + ' (< 2,0) — ' + JSON.stringify(paires));

/* ---- A' : le même nombre de kills, EXACTEMENT, sur les mêmes ennemis ----
   Deux parties dont le pilote esquive ne tuent jamais le même nombre d'ennemis : le
   rapport par kill ci-dessus reste sensible au combo et à la part d'élites (mesuré
   5,7 puis 17,7 d'une exécution à l'autre — toujours au-dessus du seuil, jamais
   égal au facteur de table). Ici, dix TRAQUEURS ORDINAIRES sont détruits l'un après
   l'autre par le souffle du jeu (M.enemies.blast → damageEnemy → killEnemy →
   addScore) : même base de score, même montée de combo, seul le cran change. Le
   rapport attendu est celui de la table, 2,0 / 0,8 = 2,5. */
const TUE10 = async () => {
  const S = window.__S, M = window.__M;
  let n = 0, garde = 0;
  while (n < 10 && garde++ < 6000) {
    const s = S.snake;
    let e = null, bd = 1e9;
    for (const o of S.enemies) {
      if (o.dead || o.elite || o.type !== 'chaser') continue;
      const d = Math.hypot(o.x - s.x, o.y - s.y);
      if (d < bd) { bd = d; e = o; }
    }
    if (e) { const k0 = S.kills; M.enemies.blast(e.x, e.y, 30, 999); if (S.kills > k0) n += S.kills - k0; }
    await new Promise(r => setTimeout(r, 0));
  }
  return { kills: S.kills, score: S.score, n: n, combo: S.combo };
};
m.exact = [];
for (const di of [0, 4]) {
  await page.evaluate(() => { window.__M.ui.showScreen('menu'); });
  await sleep(60);
  await page.evaluate(d => {
    window.__S.opt.diff = [1.25, 1.55, 1.90, 2.30, 2.75][d];
    window.__SEED = 4321; window.__DT = 1 / 60;
    window.__PSIM = { maxT: 600000, joy: false, god: true };
    window.__LSIM = { aborted: false };
    const b = Array.from(document.querySelectorAll('#ui button')).find(x => /^(JOUER|REJOUER)$/.test(x.textContent.trim()) && x.offsetParent !== null);
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  }, di);
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 10000 });
  await page.waitForFunction(() => window.__S.enemies.some(e => !e.dead && e.type === 'chaser' && !e.elite), null, { timeout: 25000, polling: 50 });
  const v = await page.evaluate(TUE10);
  m.exact.push(Object.assign({ cran: di }, v));
  await page.evaluate(() => { window.__S.phase = 'dead'; window.__M.ui.showScreen('over'); });
  await sleep(150);
}
const ef = m.exact[0], es = m.exact[1];
m.ratioExact = +(es.score / Math.max(1, ef.score)).toFixed(3);
dit(ef.n === es.n && ef.n === 10, 'kills non égaux : ' + ef.n + ' vs ' + es.n);
dit(m.ratioExact >= 2.0, 'à kills égaux, score SUICIDE / FACILE = ' + m.ratioExact + ' — ' + JSON.stringify(m.exact));

/* ---- B : un record par cran, persisté. Profil neuf : on repart d'un contexte neuf
   plutôt que de réécrire les statistiques à la main. ---- */
await sim.browser.close();
sim = await launchSim('desk1440');
page = sim.page;
m.parCran = [];
for (let di = 0; di < 5; di++) {
  await page.evaluate(() => { window.__M.ui.showScreen('menu'); });
  await sleep(60);
  const r = await runOne(page, { diff: di, seed: 6200 + di, maxT: 45000, god: true });
  m.parCran.push({ cran: di, score: r.score });
}
m.stocke = await page.evaluate(() => {
  const raw = localStorage.getItem('snake2030.v1');
  const o = raw ? JSON.parse(raw) : null;
  return { bestByDiff: o && o.stats ? o.stats.bestByDiff : null, runs: o && o.stats ? o.stats.runs : null,
           bestLevel: o && o.stats ? o.stats.bestLevel : null, bestTime: o && o.stats ? o.stats.bestTime : null };
});
const bd = m.stocke.bestByDiff;
dit(Array.isArray(bd) && bd.length === 5, 'bestByDiff = ' + JSON.stringify(bd));
dit(Array.isArray(bd) && bd.filter(v => v > 0).length === 5, 'valeurs > 0 : ' + JSON.stringify(bd));

/* ---- C : le menu nomme le cran et son record ---- */
m.menus = [];
for (const di of [0, 2, 4]) {
  await page.evaluate(d => { window.__S.opt.diff = [1.25, 1.55, 1.90, 2.30, 2.75][d]; window.__M.ui.showScreen(null); }, di);
  await sleep(60);
  await page.evaluate(() => { window.__M.ui.showScreen('menu'); });
  await sleep(120);
  const v = await page.evaluate(() => ({ txt: document.querySelector('.s2menu').textContent,
    nom: ['FACILE','NORMAL','DIFFICILE','BRUTAL','SUICIDE'][(function(){const dif=[1.25,1.55,1.90,2.30,2.75];let i=1,b=1e9;for(let k=0;k<5;k++){const d=Math.abs(dif[k]-window.__S.opt.diff);if(d<b){b=d;i=k;}}return i;})()],
    rec: window.__S.stats.bestByDiff[(function(){const dif=[1.25,1.55,1.90,2.30,2.75];let i=1,b=1e9;for(let k=0;k<5;k++){const d=Math.abs(dif[k]-window.__S.opt.diff);if(d<b){b=d;i=k;}}return i;})()] }));
  const recTxt = uiNum(v.rec);
  const ok = v.txt.indexOf(v.nom) >= 0 && v.txt.indexOf(recTxt) >= 0;
  m.menus.push({ cran: di, nom: v.nom, record: v.rec, recordAffiché: recTxt, trouvé: ok });
  dit(ok, 'menu au cran ' + v.nom + ' : nom ou record (' + recTxt + ') absent du texte');
}

m.fails = fails;
const res = { pass: fails.length === 0, measured: m, threshold: THRESH };
save('G14-t3-crans.json', res);
await sim.browser.close();
finish('G14-t3-crans', res);

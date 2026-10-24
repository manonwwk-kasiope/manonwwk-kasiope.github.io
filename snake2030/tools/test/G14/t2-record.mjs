// G14 test 2 — « NOUVEAU RECORD » ne récompense plus la première partie venue,
// et le bloc de statistiques ne montre plus trois zéros à qui n'a jamais joué.
//
//  A. Profil vierge : .s2stat2 a display:none tant que S.stats.runs === 0, et redevient
//     visible après la première partie.
//  B. Trois parties du même profil, au même cran : la 1re n'allume pas .s2rec, une 2e
//     MEILLEURE l'allume, une 3e MOINS BONNE ne l'allume pas.
//
// Le score de chaque partie est obtenu par le chemin du jeu : la sonde choisit QUAND
// le serpent devient mortel, jamais ce que vaut le score — il vient des kills du pilote.
import { sleep, save, finish, deadline } from '../lib.mjs';
import { launchSim, runOne } from '../simlib.mjs';

deadline(600, 'G14-t2');
const THRESH = 'profil vierge : .s2stat2 display none avant la 1re partie, visible ensuite ; '
  + '.s2rec.on absent après la 1re partie, présent après une 2e meilleure, absent après une 3e moins bonne';

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

/* Un contexte de navigateur neuf a un localStorage VIDE : c'est déjà le profil vierge.
   Surtout ne pas recharger la page — launchSim injecte son pilote APRÈS le chargement
   (page.evaluate, pas addInitScript), et un reload l'efface : la partie reste alors
   bloquée à l'écran des cartes, que plus personne ne choisit. */
const sim = await launchSim('desk1440');
const page = sim.page;

const lireMenu = () => page.evaluate(() => {
  const st = document.querySelector('.s2stat2');
  return { display: getComputedStyle(st).display, runs: window.__S.stats.runs | 0,
           txt: document.querySelector('.s2menu').textContent };
});
const lireRec = () => page.evaluate(() => ({
  recOn: document.querySelector('.s2rec').classList.contains('on'),
  score: window.__S.score, ecran: window.__M.ui.screen(),
  bestByDiff: (window.__S.stats.bestByDiff || []).slice(), runs: window.__S.stats.runs | 0
}));

m.menuVierge = await lireMenu();
dit(m.menuVierge.display === 'none', 'display .s2stat2 sur profil vierge : ' + m.menuVierge.display);
dit(/Première partie/.test(m.menuVierge.txt), 'phrase de première partie absente du menu');

/* Trois parties au même cran. maxT règle la durée, donc le score : une partie courte
   vaut moins qu'une longue. On vise court / long / court. */
const durees = [26000, 150000, 22000];
m.parties = [];
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => { window.__M.ui.showScreen('menu'); });
  await sleep(60);
  const r = await runOne(page, { diff: 1, seed: 9100 + i, maxT: durees[i] });
  await page.waitForFunction(() => window.__M.ui.screen() === 'over', null, { timeout: 8000 }).catch(() => {});
  await sleep(150);
  const v = await lireRec();
  m.parties.push({ i: i + 1, maxT: durees[i], score: r.score, recOn: v.recOn, best: v.bestByDiff[1], runs: v.runs });
}
const [p1, p2, p3] = m.parties;
dit(p1.recOn === false, 'record allumé dès la 1re partie (score ' + p1.score + ')');
dit(p2.score > p1.score, 'la 2e partie doit être MEILLEURE : ' + p2.score + ' vs ' + p1.score);
dit(p2.recOn === true, 'record éteint sur une 2e partie meilleure (' + p2.score + ' > ' + p1.score + ')');
dit(p3.score < p2.score, 'la 3e partie doit être MOINS BONNE : ' + p3.score + ' vs ' + p2.score);
dit(p3.recOn === false, 'record allumé sur une 3e partie moins bonne (' + p3.score + ' < ' + p2.score + ')');

await page.evaluate(() => { window.__M.ui.showScreen('menu'); });
await sleep(120);
m.menuApres = await lireMenu();
dit(m.menuApres.display !== 'none', 'display .s2stat2 après trois parties : ' + m.menuApres.display);

m.fails = fails;
const res = { pass: fails.length === 0, measured: m, threshold: THRESH };
save('G14-t2-record.json', res);
await sim.browser.close();
finish('G14-t2-record', res);

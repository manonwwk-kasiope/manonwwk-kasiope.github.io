/* tools/L7a/fumee.mjs — premier essai : la page d'essai démarre, la piste prend la relève, zéro erreur.
     node tools/L7a/fumee.mjs [url] [secondes] */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] || 'http://127.0.0.1:8131/proto-neon/tools/L7a/index.html';
const SEC = +(process.argv[3] || 12);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const erreurs = [];
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
page.on('pageerror', e => erreurs.push(String(e)));
await page.goto(URL);
await page.waitForTimeout(600);
await page.mouse.click(400, 200);
const t0 = Date.now();
for (let i = 0; i < SEC * 2; i++) {
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const m = window.__N.music, i = m.info();
    return { t: i && +i.state.length && m.context().currentTime.toFixed(2), etat: window.__N.game.etat(), info: i && { piste: i.piste, preuve: i.preuve, role: i.role, bloc: i.bloc, suiv: i.suivant, style: i.style, pisteMesure: i.piste && m.piste().mesure, decodes: i.decodes.join(','), mem: (i.memoire / 1048576).toFixed(1), dec: i.decalage, ctrl: i.controle, sr: i.sampleRate, rms: m.rms().toFixed(4), rp: m.rmsPiste().toFixed(4) } };
  });
  console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(r));
}
console.log('erreurs', erreurs.length, erreurs.slice(0, 5), 'ERR', await page.evaluate(() => window.__ERR && window.__ERR.count));
await browser.close();

/* tools/L7a/mixage.mjs — le niveau de la musique au calme et au chaos, avec la piste (REFONTE.md § 5.7) :
   RMS du canal musique, pleine bande et en simulation de téléphone (passe-haut à 350 Hz), à la tension 0,15
   (vague 1) puis 1,0 (chaos), sur la section jeu. Cibles (critère [I] du lot 7b, relevées ici pour repère) :
   calme ≥ −20 dBFS au téléphone, chaos vers −14 dBFS, écart ≥ +6 dB.
     node tools/L7a/mixage.mjs [url]  → tools/L7a/mixage.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] || 'http://127.0.0.1:8131/proto-neon/tools/L7a/index.html';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto(URL);
await page.waitForTimeout(500);
await page.mouse.click(300, 200);
await page.waitForFunction(() => { const i = window.__N.music.info(); return i && i.preuve; }, null, { timeout: 15000 });
await page.evaluate(() => {
  const m = window.__N.music, ctx = m.context(), src = m.noeud('musique');
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350; hp.Q.value = 0.707;
  const a1 = ctx.createAnalyser(), a2 = ctx.createAnalyser(); a1.fftSize = a2.fftSize = 4096;
  src.connect(a1); src.connect(hp); hp.connect(a2);
  window.__MIX = { a1, a2, b: new Float32Array(4096) };
  window.__N.game.dbg.god(true); window.__N.game.dbg.vague(2);
  /* la tension imposée par le banc (90-boot la relit à chaque image dans N.game.tension) */
  window.__T = 0.15; window.__N.game.tension = function () { return window.__T; };
});
async function mesurer(t, sec) {
  await page.evaluate(t => { window.__T = t; }, t);
  await page.waitForTimeout(4200);                          /* le filtre de tension se pose */
  const acc = { p: 0, q: 0, n: 0 };
  for (let i = 0; i < sec * 10; i++) {
    await page.waitForTimeout(100);
    const r = await page.evaluate(t => {
      const M = window.__MIX;
      const rms = a => { a.getFloatTimeDomainData(M.b); let s = 0; for (const v of M.b) s += v * v; return s / M.b.length; };
      return [rms(M.a1), rms(M.a2)];
    }, t);
    acc.p += r[0]; acc.q += r[1]; acc.n++;
  }
  return { tension: t, pleineBandeDbfs: +(10 * Math.log10(acc.p / acc.n)).toFixed(2), telephoneDbfs: +(10 * Math.log10(acc.q / acc.n)).toFixed(2) };
}
const calme = await mesurer(0.15, 12), chaos = await mesurer(1.0, 12);
const R = { calme, chaos, ecartDb: +(chaos.pleineBandeDbfs - calme.pleineBandeDbfs).toFixed(2), ecartTelDb: +(chaos.telephoneDbfs - calme.telephoneDbfs).toFixed(2), info: await page.evaluate(() => window.__N.music.info()) };
fs.writeFileSync(path.join(ICI, 'mixage.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ calme, chaos, ecartDb: R.ecartDb, ecartTelDb: R.ecartTelDb, couches: R.info.couches }));
await browser.close();

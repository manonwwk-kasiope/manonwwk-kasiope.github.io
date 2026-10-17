/* tools/contrat/contrat.mjs — les tests de contrat sur un bundle réel, dans Chromium (Playwright).
   Ils tournent sur N'IMPORTE QUEL bundle : la démo, les squelettes du lot 0b, la page d'essai d'un lot,
   l'intégration. Les tests d'un module qui ne publie pas encore l'interface 1.0 sortent « absents ».
     node tools/contrat/contrat.mjs [--url URL] [--profil paysage|portrait|bureau|tous] [--tout]
   URL par défaut : http://127.0.0.1:8112/proto-neon/index.html
   Échoue (code 1) si un test échoue, si __ERR.count > 0 ou si la console a reçu une erreur. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8112/proto-neon/index.html');
const PROFIL = arg('--profil', 'tous');
const TOUT = process.argv.includes('--tout');
const PROFILS = {
  paysage: { ...devices['iPhone 13 landscape'] },
  portrait: { ...devices['iPhone 13'] },
  bureau: { viewport: { width: 1440, height: 900 } }
};
const choisis = PROFIL === 'tous' ? Object.keys(PROFILS) : [PROFIL];
const TESTS = fs.readFileSync(path.join(ICI, 'tests.js'), 'utf8');

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let ok = true;
for (const nom of choisis) {
  const ctx = await browser.newContext(PROFILS[nom]);
  const page = await ctx.newPage();
  const cons = [];
  page.on('pageerror', e => cons.push('pageerror : ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cons.push(m.text()); });
  await page.addInitScript(() => { window.__SEED = 2975; });
  await page.goto(URL_JEU);
  await page.waitForFunction(() => window.__N && window.__N.ids && window.__N.R && window.__S, null, { timeout: 15000 });
  const pasAvant = await page.evaluate(() => window.__N.horloge.pas());
  await page.waitForTimeout(1200);
  const pasApres = await page.evaluate(() => window.__N.horloge.pas());
  await page.addScriptTag({ content: TESTS });
  const r = await page.evaluate(o => {
    const r = window.__testsContrat(window.__N, { S: window.__S, pasAvant: o.pasAvant, pasApres: o.pasApres });
    return { ok: r.ok, groupes: r.groupes, resultats: r.resultats, err: window.__ERR ? window.__ERR.count : -1, sigs: window.__ERR ? Object.keys(window.__ERR.sigs) : [] };
  }, { pasAvant, pasApres });
  await page.waitForTimeout(300);
  const errFin = await page.evaluate(() => window.__ERR ? window.__ERR.count : -1);
  console.log(`== ${nom} (${URL_JEU})`);
  for (const t of r.resultats) if (TOUT || !t.ok) console.log((t.absent ? '  ·  ' : t.ok ? '  ok ' : '  ÉCHEC ') + '[' + t.groupe + '] ' + t.nom + (t.detail ? ' — ' + t.detail : ''));
  for (const [g, v] of Object.entries(r.groupes)) console.log(`  ${g.padEnd(8)} ${v.ok ? 'ok' : 'ÉCHEC'}  ${v.reussis} réussis, ${v.echecs} échecs, ${v.absents} absents`);
  console.log(`  __ERR.count = ${errFin}${r.sigs.length ? ' : ' + r.sigs.slice(0, 5).join(' | ') : ''} ; erreurs de console : ${cons.length}`);
  for (const c of cons.slice(0, 8)) console.log('    ' + c);
  if (!r.ok || errFin !== 0 || cons.length) ok = false;
  await ctx.close();
}
await browser.close();
console.log(ok ? 'CONTRAT : OK' : 'CONTRAT : ÉCHEC');
process.exit(ok ? 0 : 1);

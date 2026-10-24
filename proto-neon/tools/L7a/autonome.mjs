/* tools/L7a/autonome.mjs — `node build.mjs --embed` produit un fichier autonome qui joue la piste sans
   réseau : on le construit hors du dépôt, on l'ouvre en file:// avec toute requête réseau refusée, et on
   vérifie que la piste prend la relève, sans erreur, sans une seule requête.
     node tools/L7a/autonome.mjs [dossier de sortie]  → tools/L7a/autonome.json */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url)), PN = path.resolve(ICI, '..', '..');
const DOS = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'l7a-'));
const OUT = path.join(DOS, 'snake2975.html');
execFileSync(process.execPath, [path.join(PN, 'build.mjs'), '--embed', OUT], { cwd: PN, stdio: 'pipe' });
const octets = fs.statSync(OUT).size;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const erreurs = [], requetes = [];
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
page.on('pageerror', e => erreurs.push(String(e)));
await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:')) r.continue(); else { requetes.push(u); r.abort(); } });
page.on('request', q => { const u = q.url(); if (!u.startsWith('data:') && u !== 'file://' + OUT) requetes.push(u); });
await page.goto('file://' + OUT);
await page.waitForTimeout(600);
await page.mouse.click(420, 200);
let info = null, t = 0;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(150); t += 0.15;
  info = await page.evaluate(() => window.__N.music.info());
  if (info && info.preuve && info.bloc) break;
}
const err = await page.evaluate(() => (window.__ERR && window.__ERR.count) || 0);
const R = { fichier: OUT, octets, piste: info && info.piste, preuve: info && info.preuve, bloc: info && info.bloc, secondes: +t.toFixed(2), requetes: [...new Set(requetes)], erreurs, err };
fs.writeFileSync(path.join(ICI, 'autonome.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
await browser.close();
const ok = R.preuve && R.bloc && R.requetes.length === 0 && erreurs.length === 0 && err === 0;
console.log(ok ? 'AUTONOME : tenu' : 'AUTONOME : ÉCHEC');
process.exit(ok ? 0 : 1);

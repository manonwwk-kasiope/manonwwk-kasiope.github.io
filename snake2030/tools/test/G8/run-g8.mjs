/* Lance les sept tests d'acceptation de G8, l'un après l'autre (jamais deux mesures en même temps),
 * et rend un JSON récapitulatif sur la dernière ligne.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node snake2030/tools/test/G8/run-g8.mjs
 *
 * Chaque test écrit son propre rapport dans tools/test/out/G8-<nom>.json et son journal dans
 * tools/test/out/G8-<nom>.log. Code de sortie : 0 si les sept passent, 1 si l'un échoue avec une
 * mesure, 2 si l'un n'a pas pu mesurer. Durée totale attendue : environ 25 minutes, dont 10 pour le
 * test 4 (partie de 5 minutes). Variable S2030_G8_ONLY : liste de numéros, par exemple « 1,3,7 ».
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'out');
const TESTS = [
  { n: 1, file: 't1-hitstop.mjs' },
  { n: 2, file: 't2-kill.mjs' },
  { n: 3, file: 't3-blessure.mjs' },
  { n: 4, file: 't4-budget.mjs' },
  { n: 5, file: 't5-niveau.mjs' },
  { n: 6, file: 't6-impact.mjs' },
  { n: 7, file: 't7-ultready.mjs' }
];
const only = (process.env.S2030_G8_ONLY || '').split(',').map(s => +s.trim()).filter(Boolean);
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const res = [];
for (const t of TESTS) {
  if (only.length && only.indexOf(t.n) < 0) continue;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(HERE, t.file)], { encoding: 'utf8', env: process.env,
    maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = (r.stdout || '') + (r.stderr ? '\n[stderr]\n' + r.stderr : '');
  fs.writeFileSync(path.join(OUT, 'G8-' + t.file.replace(/\.mjs$/, '') + '.log'), out);
  let json = null;
  const lines = (r.stdout || '').trim().split('\n');
  for (let i = lines.length - 1; i >= 0 && !json; i--) {
    const l = lines[i].trim();
    if (l.startsWith('{')) { try { json = JSON.parse(l); } catch (e) {} }
  }
  const secs = +((Date.now() - t0) / 1000).toFixed(0);
  console.log(`[G8] ${t.file} → code ${r.status} en ${secs} s` + (json ? (json.pass ? ' — PASS' : ' — ÉCHEC') : ' — pas de JSON final'));
  if (json && !json.pass) console.log('     mesuré :', JSON.stringify(json.measured));
  res.push({ n: t.n, file: t.file, code: r.status, secs, pass: json ? !!json.pass : false, measured: json ? json.measured : null });
}

const fails = res.filter(o => !o.pass);
const unmeasurable = res.some(o => o.code === 2);
const summary = { test: 'G8', pass: fails.length === 0,
  measured: { tests: res.map(o => ({ n: o.n, pass: o.pass, code: o.code, secs: o.secs })), echecs: fails.map(o => o.file) },
  threshold: 'les sept tests d\'acceptation de G8 passent' };
fs.writeFileSync(path.join(OUT, 'G8-run.json'), JSON.stringify({ summary, res }, null, 1));
console.log(JSON.stringify(summary));
process.exit(fails.length === 0 ? 0 : (unmeasurable ? 2 : 1));

/* Rejoue les deux bancs existants, seuils inchangés, dans un répertoire isolé.
   Le pilote n'offrant pas --bundle/--outdir, son code est copié temporairement avec SEULEMENT
   les chemins ROOT, HERE et bundle remplacés. Empreinte du protocole original conservée. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const phase = arg('--phase', 'avant'), bundle = path.resolve(arg('--bundle', path.join(ROOT, 'index.html')));
const OUT = path.resolve(arg('--outdir', path.join(HERE, 'regressions', phase)));
fs.mkdirSync(OUT, { recursive: true });
async function run(name, args) {
  const log = fs.openSync(path.join(OUT, name + '.log'), 'w');
  const code = await new Promise((r, reject) => { const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', log, log] }); p.on('error', reject); p.on('exit', r); });
  fs.closeSync(log); console.log(name, 'code', code); return code;
}
const lis = path.join(OUT, 'lisibilite'); fs.mkdirSync(lis, { recursive: true });
if (phase === 'apres' && !process.argv.includes('--pilotes-seuls')) {
  const ref = path.resolve(OUT, '../avant/lisibilite/avant.json');
  if (!fs.existsSync(ref)) throw Error('Référence avant absente : ' + ref);
  fs.copyFileSync(ref, path.join(lis, 'avant.json'));
}
const a = process.argv.includes('--pilotes-seuls') ? null : await run('lisibilite', [path.join(ROOT, 'tools/lisibilite/banc.mjs'), '--phase', phase, '--bundle', bundle, '--outdir', lis]);
const pilots = path.join(OUT, 'pilotes'); fs.mkdirSync(pilots, { recursive: true });
const original = path.join(ROOT, 'tools/pilotes/parties.mjs');
let s = fs.readFileSync(original, 'utf8');
s = s.replace("from 'playwright'", `from ${JSON.stringify(path.resolve(ROOT, '../.outils/node_modules/playwright/index.mjs'))}`);
s = s.replace("const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');", `const HERE = ${JSON.stringify(pilots)}, ROOT = ${JSON.stringify(ROOT)};`);
s = s.replace('fs.readFileSync(fileURLToPath(import.meta.url))', `fs.readFileSync(${JSON.stringify(original)})`);
s = s.replace("fs.readFileSync(path.join(ROOT, 'index.html'))", `fs.readFileSync(${JSON.stringify(bundle)})`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snake-regression-')), runner = path.join(tmp, 'parties.mjs'); fs.writeFileSync(runner, s);
let b; try { b = await run('pilotes', [runner]); } finally { fs.rmSync(tmp, { recursive: true }); }
fs.writeFileSync(path.join(OUT, 'execution.json'), JSON.stringify({ phase, bundle, lisibilite: a, pilotes: b, substitutions: ['chemins ROOT/HERE/bundle/import', 'empreinte du banc original'], dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) }, null, 2));
if (a || b) process.exitCode = 1;

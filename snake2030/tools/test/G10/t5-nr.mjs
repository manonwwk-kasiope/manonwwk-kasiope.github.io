// G10 test 5 — la batterie de non-régression passe.
// Ce script n'invente rien : il lance « tools/test/run.mjs nr » (banc, diag, son-ios, rail2,
// invariants) et recopie son verdict. Compter dix-huit minutes.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { HERE, OUT, save, finish } from '../lib.mjs';

const t0 = Date.now();
let code = 0, out = '';
try {
  out = execFileSync('/opt/node22/bin/node', [path.join(HERE, 'run.mjs'), 'nr'],
    { encoding: 'utf8', env: { ...process.env, NODE_PATH: '/opt/node22/lib/node_modules' }, maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  code = e.status == null ? 2 : e.status;
  out = (e.stdout || '') + (e.stderr || '');
}
fs.writeFileSync(path.join(OUT, 'G10-t5-nr.log'), out);
let json = null;
const lines = out.trim().split('\n');
for (let i = lines.length - 1; i >= 0 && !json; i--) {
  const l = lines[i].trim();
  if (l.startsWith('{')) { try { json = JSON.parse(l); } catch (e) {} }
}
const r = { pass: !!(json && json.pass) && code === 0, code, secs: +((Date.now() - t0) / 1000).toFixed(0),
  fails: json && json.measured ? json.measured.fails : null, notes: json && json.measured ? json.measured.notes : null };
save('G10-t5-nr.json', { pass: r.pass, measured: r, threshold: 'run.mjs nr sort 0 et rapporte pass:true' });
finish('G10-t5-nr', { pass: r.pass, measured: r, threshold: 'run.mjs nr sort 0 et rapporte pass:true' });

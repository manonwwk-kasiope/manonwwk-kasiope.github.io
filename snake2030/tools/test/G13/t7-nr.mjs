/* G13 t7 — batterie complète et seuils absolus de la partie pilotée.
   Spec test 6 : « run.mjs nr passe, et le seuil bureau devient absolu : diag.mjs 1440×900 p99 ≤ 33 ms,
   iPhone p99 ≤ 33 ms. »
   Ce script lance la batterie UNE fois (c'est la mesure la plus chère de la chaîne, ~18 min) et juge
   les trois choses ensemble : le verdict de nr, le p99 bureau et le p99 iPhone de diag.mjs, relus dans
   out/diag-*.json produits par cette même exécution — pas dans un fichier plus ancien. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { save, finish, OUT, HERE } from '../lib.mjs';

const NODE = process.execPath;
const RUN = path.join(HERE, 'run.mjs');

let nr = null, brut = '', code = -1;
try {
  brut = execFileSync(NODE, [RUN, 'nr'], {
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 45 * 60 * 1000,
    env: { ...process.env, NODE_PATH: process.env.NODE_PATH || '/opt/node22/lib/node_modules' },
  });
  code = 0;
} catch (e) {
  brut = (e.stdout || '') + (e.stderr || '');
  code = e.status == null ? -1 : e.status;
}
fs.writeFileSync(path.join(OUT, 'G13-t7-nr.log'), brut);
// la dernière ligne JSON de run.mjs porte le verdict
for (const l of brut.split('\n')) {
  const t = l.trim();
  if (t.startsWith('{') && t.includes('"test"')) { try { nr = JSON.parse(t); } catch (e) {} }
}

const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')).measured; } catch (e) { return null; } };
const d = lire('diag-desk1440.json'), i = lire('diag-iphone.json');

const r = {
  nrCode: code,
  nrPass: !!(nr && nr.pass),
  nrFails: (nr && nr.measured && nr.measured.fails) || null,
  deskP99: d ? d.p99 : null, deskPct33: d ? d.pct33 : null, deskP50: d ? d.p50 : null,
  iphoneP99: i ? i.p99 : null, iphonePct33: i ? i.pct33 : null, iphoneP50: i ? i.p50 : null,
  banc: nr && nr.measured && nr.measured.current && nr.measured.current.banc,
};
r.deskOk = r.deskP99 != null && r.deskP99 <= 33;
r.iphoneOk = r.iphoneP99 != null && r.iphoneP99 <= 33;

const pass = r.nrPass && r.deskOk && r.iphoneOk;
save('G13-t7-nr.json', { test: 'G13-t7', pass, measured: r });
finish('G13-t7', { pass, measured: r, threshold: 'run.mjs nr passe ; diag bureau 1440×900 p99 ≤ 33 ms ; diag iPhone p99 ≤ 33 ms' });

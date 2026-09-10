// G7 test 5 — non-régression : « run.mjs nr » passe.
// La batterie lance banc.mjs (performance à scène figée contre le build du dernier commit),
// diag.mjs (erreurs et relevé d'une vraie partie), son-ios.mjs, rail2.mjs (latence de virage sur
// treillis, G5) et invariants.mjs (les promesses faites à la joueuse : plein écran iOS, manche
// tactile, zoom de base, musique en flux, réglages persistés, message de rotation).
//
// SEUIL (spec G7, test 5) : run.mjs nr sort 0. Un échec est rapporté avec la LISTE des contrôles
// tombés (champ « fails » de la batterie), pour qu'on sache si c'est la performance, une erreur de
// page ou un invariant de la joueuse — et non un simple « code 1 ».
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { save, finish, deadline } from '../lib.mjs';

deadline(+(process.env.S2030_G7T5_DEADLINE || 4800), 5);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEST = path.resolve(HERE, '..');
const BASELINE = process.env.S2030_BASELINE || path.join(TEST, 'baseline.json');

const m = { commande: 'run.mjs nr', baselinePresente: fs.existsSync(BASELINE) };
const t0 = Date.now();
const r = spawnSync(process.execPath, [path.join(TEST, 'run.mjs'), 'nr'],
  { encoding: 'utf8', env: process.env, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
process.stdout.write(r.stdout || '');

const lines = (r.stdout || '').trim().split('\n');
let j = null;
for (let i = lines.length - 1; i >= 0 && !j; i--) { const l = lines[i].trim(); if (l.startsWith('{')) { try { j = JSON.parse(l); } catch (e) {} } }

m.exit = r.status;
m.dureeS = Math.round((Date.now() - t0) / 1000);
m.jsonFinal = !!j;
if (j && j.measured) {
  m.fails = j.measured.fails || [];
  m.notes = j.measured.notes || [];
  m.current = j.measured.current || null;
  m.sonIos = j.measured.sonIos || null;
}
save('G7-t5-nr.json', m);

if (!j) finish(5, { pass: false, code: 2, measured: { exit: r.status, jsonFinal: false }, threshold: 'run.mjs nr sort 0' });
const pass = r.status === 0;
// run.mjs sort 2 quand un de ses scripts n'a pas pu mesurer : on le propage tel quel plutôt que de
// le confondre avec un seuil tombé
finish(5, { pass, code: pass ? 0 : (r.status === 2 ? 2 : 1), threshold: 'run.mjs nr sort 0',
  measured: { exit: r.status, dureeS: m.dureeS, fails: m.fails, nFails: (m.fails || []).length } });

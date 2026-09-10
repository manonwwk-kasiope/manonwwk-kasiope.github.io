// G1 test 4 — enveloppe de « run.mjs nr » : sort 0, écrit baseline.json (première exécution), iPhone p99 ≤ 33 ms,
// son-ios passe, rail2 ortho médiane ∈ [50 ; 70] images ; relancé après une première exécution : part > 33 ms
// identique à ±1 point par profil (comparaison à baseline.json). L'exécuteur lance ce script deux fois.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { finish, deadline } from '../lib.mjs';
deadline(1500, 4);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEST = path.resolve(HERE, '..');
const BASELINE = process.env.S2030_BASELINE || path.join(TEST, 'baseline.json');
const hadBaseline = fs.existsSync(BASELINE);
const before = hadBaseline ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;
const r = spawnSync(process.execPath, [path.join(TEST, 'run.mjs'), 'nr'], { encoding: 'utf8', env: process.env, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
process.stdout.write(r.stdout || '');
const lines = (r.stdout || '').trim().split('\n');
let j = null; for (let i = lines.length - 1; i >= 0 && !j; i--) { const l = lines[i].trim(); if (l.startsWith('{')) { try { j = JSON.parse(l); } catch (e) {} } }
if (!j || !j.measured) finish(4, { pass: false, measured: { exit: r.status }, threshold: 'run.mjs nr renvoie un JSON final', code: 2 });
const cur = j.measured.current || {};
const m = { exit: r.status, firstRun: !hadBaseline, baselineWritten: fs.existsSync(BASELINE), fails: j.measured.fails,
  iphoneP99: cur.iphone && cur.iphone.p99, deskPct33: cur.desk1440 && cur.desk1440.pct33, iphonePct33: cur.iphone && cur.iphone.pct33,
  rail2OrthoMed: cur.rail2 && cur.rail2.orthoMed, sonIos: j.measured.sonIos && j.measured.sonIos.checks };
const checks = { exit0: r.status === 0, baseline: m.baselineWritten, iphoneP99: m.iphoneP99 != null && m.iphoneP99 <= 33,
  sonIos: !!(m.sonIos && m.sonIos.playing && m.sonIos.rms && m.sonIos.resume), rail2: m.rail2OrthoMed != null && m.rail2OrthoMed >= 50 && m.rail2OrthoMed <= 70 };
if (before) {
  m.deltaPct33 = { desk1440: +(m.deskPct33 - before.desk1440.pct33).toFixed(2), iphone: +(m.iphonePct33 - before.iphone.pct33).toFixed(2) };
  checks.repeatable = Math.abs(m.deltaPct33.desk1440) <= 1 && Math.abs(m.deltaPct33.iphone) <= 1;
}
m.checks = checks;
const pass = Object.values(checks).every(Boolean);
finish(4, { pass, measured: m, threshold: 'exit 0 ; baseline.json écrite ; iPhone p99 ≤ 33 ms ; son-ios OK ; rail2 ortho médiane ∈ [50;70] ; relance : part>33ms ±1 point par profil', code: pass ? 0 : 1 });

// Batterie de non-régression SNAKE 2030.
//   NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node tools/test/run.mjs nr
// « nr » lance diag.mjs, son-ios.mjs et rail2.mjs (serveur http-server -p 8112 lancé si absent), écrit
// tools/test/baseline.json à la première exécution (part > 33 ms et p99 par profil, médiane rail2 ortho) et sort
// avec un code non nul si un seuil échoue :
//   0 pageerror, 0 console.error, __ERR.count === 0 ; iPhone p99 ≤ 33 ms ;
//   bureau : part > 33 ms ≤ base + 3 points et p99 ≤ 1,1 × base ; rail2 ortho : médiane ≤ base ; son-ios OK.
// Variables : S2030_URL (URL de base), S2030_BASELINE (chemin de la référence, défaut tools/test/baseline.json).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const ROOT = path.resolve(HERE, '..', '..', '..');                       // racine du dépôt (le serveur sert /snake2030/index.html)
const BASE_URL = process.env.S2030_URL || 'http://127.0.0.1:8112/snake2030/index.html';
const BASELINE = process.env.S2030_BASELINE || path.join(HERE, 'baseline.json');
const HTTP_SERVER = '/opt/node22/lib/node_modules/http-server/bin/http-server';
const sleep = ms => new Promise(r => setTimeout(r, ms));
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

async function up(url) { try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); return r.ok; } catch (e) { return false; } }
async function ensureServer() {
  if (await up(BASE_URL)) return 'déjà actif';
  const u = new globalThis.URL(BASE_URL);
  if (!/^(127\.0\.0\.1|localhost)$/.test(u.hostname)) throw new Error('serveur injoignable : ' + BASE_URL);
  const port = u.port || '80';
  const child = spawn(process.execPath, [HTTP_SERVER, '-p', port, '-s'], { cwd: ROOT, detached: true, stdio: 'ignore', env: process.env });
  child.unref();
  for (let k = 0; k < 20; k++) { await sleep(400); if (await up(BASE_URL)) return 'lancé sur le port ' + port; }
  throw new Error('http-server ne répond pas sur ' + BASE_URL);
}

function runScript(name) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(HERE, name)], { encoding: 'utf8', env: { ...process.env, S2030_URL: BASE_URL }, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = (r.stdout || '') + (r.stderr ? '\n[stderr]\n' + r.stderr : '');
  fs.writeFileSync(path.join(OUT, name.replace(/\.mjs$/, '') + '.log'), out);
  const lines = (r.stdout || '').trim().split('\n');
  let json = null;
  for (let i = lines.length - 1; i >= 0 && !json; i--) { const l = lines[i].trim(); if (l.startsWith('{')) { try { json = JSON.parse(l); } catch (e) {} } }
  console.log(`[run] ${name} → code ${r.status} en ${((Date.now() - t0) / 1000).toFixed(0)} s${json ? '' : ' (pas de JSON final)'}`);
  if (!json && r.stderr) console.log(r.stderr.slice(-800));
  return { code: r.status, json, secs: (Date.now() - t0) / 1000 };
}

function nr() {
  const R = { diag: runScript('diag.mjs'), sonIos: runScript('son-ios.mjs'), rail2: runScript('rail2.mjs') };
  const d = R.diag.json && R.diag.json.measured, s = R.sonIos.json, r2 = R.rail2.json && R.rail2.json.measured;
  const fails = [], notes = [];
  if (!d) fails.push('diag sans résultat'); if (!s) fails.push('son-ios sans résultat'); if (!r2) fails.push('rail2 sans résultat');
  const cur = {
    desk1440: d ? { pct33: d.desk1440.pct33, p99: d.desk1440.p99, p50: d.desk1440.p50, p95: d.desk1440.p95, n: d.desk1440.n } : null,
    iphone: d ? { pct33: d.iphone.pct33, p99: d.iphone.p99, p50: d.iphone.p50, p95: d.iphone.p95, n: d.iphone.n } : null,
    rail2: r2 ? { orthoMed: r2.ortho && r2.ortho.med, orthoN: r2.ortho && r2.ortho.n, diagMed: r2.diag && r2.diag.med, diagN: r2.diag && r2.diag.n } : null,
  };
  // seuils absolus
  if (d) for (const k of ['desk1440', 'iphone']) {
    const m = d[k];
    if (m.pageErrors !== 0) fails.push(`${k} pageErrors=${m.pageErrors} (${m.firstPageError})`);
    if (m.consoleErrors !== 0) fails.push(`${k} consoleErrors=${m.consoleErrors} (${m.firstConsoleError})`);
    if (m.errCount !== 0) fails.push(`${k} __ERR.count=${m.errCount}`);
  }
  if (d && !(d.iphone.p99 <= 33)) fails.push(`iPhone p99=${d.iphone.p99} ms > 33`);
  if (s && !s.pass) fails.push('son-ios : ' + JSON.stringify(s.measured && s.measured.checks));
  if (r2 && !(r2.ortho && r2.ortho.n >= 10)) fails.push('rail2 ortho non mesurable');
  // référence
  let base = null, wroteBaseline = false;
  if (fs.existsSync(BASELINE)) {
    try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) { fails.push('baseline.json illisible'); }
  }
  if (base && cur.desk1440 && base.desk1440) {
    if (!(cur.desk1440.pct33 <= base.desk1440.pct33 + 3)) fails.push(`bureau part>33ms=${cur.desk1440.pct33} > base ${base.desk1440.pct33} + 3`);
    if (!(cur.desk1440.p99 <= 1.1 * base.desk1440.p99)) fails.push(`bureau p99=${cur.desk1440.p99} > 1,1 × base ${base.desk1440.p99}`);
  }
  if (base && cur.rail2 && base.rail2 && base.rail2.orthoMed != null) {
    if (!(cur.rail2.orthoMed <= base.rail2.orthoMed)) fails.push(`rail2 ortho médiane=${cur.rail2.orthoMed} > base ${base.rail2.orthoMed}`);
  }
  if (!base && d && r2 && s) {
    const bl = { createdAt: new Date().toISOString(), url: BASE_URL, desk1440: cur.desk1440, iphone: cur.iphone, rail2: cur.rail2 };
    fs.writeFileSync(BASELINE, JSON.stringify(bl, null, 1));
    wroteBaseline = true; notes.push('baseline écrite : ' + BASELINE);
  }
  const unmeasurable = [R.diag, R.sonIos, R.rail2].some(x => x.code === 2);
  const pass = fails.length === 0;
  const result = { pass, measured: { current: cur, baseline: base && { desk1440: base.desk1440, iphone: base.iphone, rail2: base.rail2 }, wroteBaseline, fails, notes,
    sonIos: s && s.measured && { playingAtMs: s.measured.playingAtMs, rms3to6: s.measured.rms3to6, resume: s.measured.resume && { runningAtMs: s.measured.resume.runningAtMs, okAtMs: s.measured.resume.okAtMs }, checks: s.measured.checks },
    codes: { diag: R.diag.code, sonIos: R.sonIos.code, rail2: R.rail2.code }, secs: +(R.diag.secs + R.sonIos.secs + R.rail2.secs).toFixed(0) },
    threshold: '0 pageerror, 0 console.error, __ERR.count === 0 ; iPhone p99 ≤ 33 ms ; bureau part>33ms ≤ base+3 et p99 ≤ 1,1×base ; rail2 ortho médiane ≤ base ; son-ios OK' };
  fs.writeFileSync(path.join(OUT, 'nr-last.json'), JSON.stringify({ result, raw: R }, null, 1));
  for (const f of fails) console.log('[run] ÉCHEC :', f);
  for (const n of notes) console.log('[run]', n);
  console.log(JSON.stringify({ test: 'nr', ...result }));
  process.exit(pass ? 0 : (unmeasurable ? 2 : 1));
}

const mode = process.argv[2] || 'nr';
if (mode !== 'nr') { console.log('usage : run.mjs nr'); process.exit(2); }
console.log('[run] serveur :', await ensureServer(), BASE_URL);
nr();

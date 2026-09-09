/* Calibration par la MESURE de la table _audFxGain de src/21-audio.js.
   Chaque son est joué seul, sa crête est relevée en sortie maître (après
   compresseur et gain maître), et le facteur est corrigé pour viser la cible
   dBFS de la spec. Deux passes suffisent (le compresseur est non linéaire).
   Usage : node tools/test/G12/calibre.mjs [passes] */
import fs from 'node:fs';
import path from 'node:path';
import { launchDesktop, startGame, sleep, isMain, deadline, HERE } from '../lib.mjs';
import { installCapture, measureSfx, SFX_VOL, TARGET } from './g12lib.mjs';
const SRC = path.resolve(HERE, '..', '..', 'src', '21-audio.js');
const ROOT = path.resolve(HERE, '..', '..');
const NAMES = Object.keys(TARGET);

function readTable() {
  const s = fs.readFileSync(SRC, 'utf8');
  const m = s.match(/var _audFxGain = (\{[^;]*\});/);
  if (!m) throw new Error('table _audFxGain introuvable');
  return JSON.parse(m[1].replace(/([a-zA-Z_]+):/g, '"$1":').replace(/'/g, '"')) || {};
}
function writeTable(t) {
  const s = fs.readFileSync(SRC, 'utf8');
  const body = '{ ' + NAMES.map(n => `${n}: ${(+t[n] || 1).toFixed(3)}`).join(', ') + ' }';
  fs.writeFileSync(SRC, s.replace(/var _audFxGain = \{[^;]*\};/, 'var _audFxGain = ' + body + ';'));
}
const { spawnSync } = await import('node:child_process');

export async function passe() {
  const ctx = await launchDesktop();
  const out = {};
  try {
    await startGame(ctx);
    await sleep(500);
    await ctx.page.evaluate(() => { window.__M.audio.setMusic(false); window.__S.paused = true; });
    await sleep(400);
    const cap = await installCapture(ctx.page, 'tout');
    if (!cap.ok) throw new Error('capture impossible : ' + cap.why);
    for (const n of NAMES) {
      const r = await measureSfx(ctx.page, n, SFX_VOL[n] === undefined ? 1 : SFX_VOL[n], 1.5);
      out[n] = r; await sleep(110);
    }
  } finally { await ctx.close(); }
  return out;
}

if (isMain(import.meta.url)) {
  deadline(600, 'G12-calibre');
  const passes = +(process.argv[2] || 2);
  let t = readTable();
  for (const n of NAMES) if (!t[n]) t[n] = 1;
  for (let k = 0; k < passes; k++) {
    const m = await passe();
    let worst = 0;
    for (const n of NAMES) {
      if (!m[n]) continue;
      const err = TARGET[n] - m[n].peakDb;
      if (Math.abs(err) > Math.abs(worst)) worst = err;
      // le compresseur mange une partie de la correction : on sur-corrige un peu
      t[n] = Math.max(0.02, Math.min(40, t[n] * Math.pow(10, err / 20 * (err > 0 ? 1.25 : 1.0))));
    }
    console.log('passe ' + (k + 1) + ' : écart max ' + worst.toFixed(2) + ' dB');
    writeTable(t);
    const r = spawnSync(process.execPath, ['build.mjs'], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) { console.log(r.stderr); process.exit(2); }
  }
  console.log(JSON.stringify(t));
}

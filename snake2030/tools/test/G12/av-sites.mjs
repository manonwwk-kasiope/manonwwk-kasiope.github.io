/* G12 T6 — chaque nom de bruitage a au plus 3 sites d'appel dans src/.
   Un son appelé partout ne veut plus rien dire : 'warp' en comptait 8. */
import fs from 'node:fs'; import path from 'node:path';
import { HERE, save, isMain, finish } from '../lib.mjs';
const SRC = path.resolve(HERE, '..', '..', 'src');
export async function run() {
  const files = fs.readdirSync(SRC).filter(f => /\.js$/.test(f) && f !== '21-audio.js');
  const sites = {};
  for (const f of files) {
    const txt = fs.readFileSync(path.join(SRC, f), 'utf8').split('\n');
    txt.forEach((l, i) => {
      if (!/\.sfx\s*\(/.test(l)) return;
      for (const mm of l.matchAll(/'([a-zA-Z][a-zA-Z0-9]*)'/g)) {
        const n = mm[1];
        if (!/\.sfx\s*\([^)]*'\s*$/.test('') && l.indexOf(mm[0]) > l.indexOf('.sfx')) {
          (sites[n] = sites[n] || []).push(f + ':' + (i + 1));
        }
      }
    });
  }
  const trop = Object.entries(sites).filter(([n, l]) => l.length > 3);
  const m = { sites: Object.fromEntries(Object.entries(sites).map(([n, l]) => [n, l.length])), detail: sites, trop: trop.map(([n, l]) => n + ' ' + l.length) };
  save('G12-av-sites.json', m);
  const pass = trop.length === 0;
  return { pass, measured: m, threshold: 'aucun nom de bruitage au-delà de 3 sites d\'appel dans src/*.js', code: pass ? 0 : 1 };
}
if (isMain(import.meta.url)) finish('G12-av-sites', await run());

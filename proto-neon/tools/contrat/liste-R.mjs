/* tools/contrat/liste-R.mjs — la liste de contrôle de N.R, ligne par ligne : chaque valeur chiffrée (ou
   textuelle) de src/02-regles.js, avec son chemin et la section du plan qui la donne. Sortie en Markdown,
   jointe au rapport du lot 0a (refonte/lots/L0a.md).
     node tools/contrat/liste-R.mjs > liste.md */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const ICI = path.dirname(fileURLToPath(import.meta.url));
const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ICI, '..', '..', 'src', '02-regles.js'), 'utf8'), ctx);
const R = ctx.__N.R;
const SECTION = {
  temps: '§ 7.2', monde: '§ 3.1, 3.2', joueuse: '§ 2.1, 2.2', boost: '§ 2.2', mort: '§ 2.3', vies: '§ 2.4', longueur: '§ 2.5',
  butin: '§ 2.6', xp: '§ 2.6', cartes: '§ 2.7, 2.9', armes: '§ 2.8', passifs: '§ 2.9, 7.5', pouvoirs: '§ 2.10', apogee: '§ 2.11',
  lasso: '§ 2.12', score: '§ 2.13', defis: '§ 2.14', controles: '§ 2.15', gestes: '§ 2.16', inversion: '§ 2.17', camera: '§ 3.3',
  decor: '§ 3.4 à 3.6, 5.2', radar: '§ 3.7', apparitions: '§ 3.8', vol: '§ 3.9', secteurs: '§ 4.1, 4.2', formations: '§ 4.3',
  ennemis: '§ 4.4', elites: '§ 4.5', modificateurs: '§ 4.5', arene: '§ 4.6', defile: '§ 4.7', colosse: '§ 4.8', pilotes: '§ 4.10',
  scene: '§ 5.3', mortScene: '§ 5.4', hud: '§ 5.5', ecrans: '§ 5.6, 5.6.1', deblocages: '§ 5.6', deblocagesCible: '§ 5.6',
  surcharge: '§ 9', musique: '§ 5.7', son: '§ 5.7, 5.8', reglages: '§ 7.10', reglagesValeurs: '§ 7.10', persistance: '§ 7.10',
  socle: '§ 7.4, 7.9', perf: '§ 7.11', criteres: '§ 8.5, 8.3', version: 'contrat'
};
const lignes = [];
(function parc(o, p) {
  if (typeof o === 'function') return;
  if (o === null || typeof o !== 'object') { lignes.push([p, o]); return; }
  if (Array.isArray(o) && o.every(x => x === null || typeof x !== 'object')) { lignes.push([p, o]); return; }
  for (const k of Object.keys(o)) { if (k === 'f') continue; parc(o[k], p ? p + '.' + k : k); }
})(R, '');
const fmt = v => typeof v === 'number' ? String(+v.toFixed(6)).replace('.', ',') : JSON.stringify(v);
let cur = '';
const out = [];
out.push(`${lignes.length} valeurs dans N.R (version ${R.version}), plus ${Object.keys(R.f).length} formules dans N.R.f.`, '');
for (const [p, v] of lignes) {
  const top = p.split('.')[0];
  if (top !== cur) { cur = top; out.push('', `**N.R.${top}** (${SECTION[top] || '?'})`, '', '| Chemin | Valeur |', '|---|---|'); }
  out.push(`| \`${p}\` | ${fmt(v).replace(/\|/g, '\\|')} |`);
}
out.push('', '**N.R.f** : ' + Object.keys(R.f).map(k => '`' + k + '`').join(', '));
console.log(out.join('\n'));

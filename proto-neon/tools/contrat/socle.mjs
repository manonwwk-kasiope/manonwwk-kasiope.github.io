/* tools/contrat/socle.mjs — les tests de contrat dans Node, sans navigateur, sur le socle seul :
   src/00-pal.js, src/02-regles.js, src/03-socle.js (les modules suivants n'existent pas ici, leurs tests
   sortent « absents »). Rapide : à lancer après chaque modification du contrat.
     node tools/contrat/socle.mjs            résumé ; code de sortie 0 si et seulement si tout passe
     node tools/contrat/socle.mjs --tout     chaque test, un par ligne */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ICI, '..', '..', 'src');
const erreurs = [];
const ctx = { console: { log: console.log, error: (...a) => erreurs.push(a.join(' ')), warn: console.warn } };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['00-pal.js', '02-regles.js', '03-socle.js']) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
vm.runInContext(fs.readFileSync(path.join(ICI, 'tests.js'), 'utf8'), ctx, { filename: 'tests.js' });
const r = ctx.__testsContrat(ctx.__N, {});
const tout = process.argv.includes('--tout');
for (const t of r.resultats) if (tout || (!t.ok)) console.log((t.absent ? '  ·  ' : t.ok ? '  ok ' : '  ÉCHEC ') + '[' + t.groupe + '] ' + t.nom + (t.detail ? ' — ' + t.detail : ''));
for (const [g, v] of Object.entries(r.groupes)) console.log(`${g.padEnd(8)} ${v.ok ? 'ok' : 'ÉCHEC'}  ${v.reussis} réussis, ${v.echecs} échecs, ${v.absents} absents`);
if (erreurs.length) console.log('console.error pendant les tests :\n  ' + erreurs.join('\n  '));
process.exit(r.ok && !erreurs.length ? 0 : 1);

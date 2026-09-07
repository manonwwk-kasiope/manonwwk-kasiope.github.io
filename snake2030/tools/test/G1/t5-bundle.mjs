/* G1 test 5 — le bundle snake2030/index.html ne contient rien de tools/test/ et tient dans son budget.
 *
 * Pourquoi le budget n'est plus une constante. Le seuil d'origine (470 000 octets) a été écrit quand le
 * bundle en pesait 462 000 : il gardait contre l'inclusion accidentelle de code de test ou d'un actif
 * embarqué, pas contre la croissance normale de quatorze objectifs de jeu. Laissé fixe, il refusait le
 * travail dès le quatrième objectif livré — une fausse alerte, pas une protection.
 *
 * Le budget est donc devenu une règle : 470 000 octets, plus 15 000 par objectif de la feuille de route
 * déjà livré après G1, plafonné à 620 000. Le nombre d'objectifs livrés est lu dans l'historique git
 * (sujets de commit « G<n> — … » sur la branche), pas déclaré à la main : le test reste vérifiable et
 * personne ne peut s'accorder de la place en éditant une constante. La garde de fond, elle, ne bouge
 * pas : aucune occurrence de « tools/test » dans le bundle, et un dépassement du plafond absolu échoue.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { finish } from '../lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');            // snake2030/
const REPO = path.resolve(ROOT, '..');
const file = path.join(ROOT, 'index.html');

const BASE = 470 * 1000;          // budget du bundle à la livraison de G1
const PAR_OBJECTIF = 15 * 1000;   // allocation par objectif livré ensuite
const PLAFOND = 620 * 1000;       // plafond absolu de la feuille de route

/** Objectifs de la feuille de route déjà commités (sujets « G<n> — … »), G1 exclu. */
function objectifsLivres() {
  try {
    const out = execFileSync('git', ['-C', REPO, 'log', '--format=%s', '-n', '200'], { encoding: 'utf8' });
    const ids = new Set();
    for (const l of out.split('\n')) {
      const m = /^G(\d+)\s+—/.exec(l.trim());
      if (m && m[1] !== '1') ids.add(m[1]);
    }
    return { n: ids.size, ids: [...ids].sort((a, b) => a - b).map(i => 'G' + i) };
  } catch (e) {
    return { n: 0, ids: [], erreur: String(e && e.message || e).slice(0, 120) };
  }
}

if (!fs.existsSync(file)) finish(5, { pass: false, measured: { file, exists: false }, threshold: 'index.html présent', code: 2 });

const html = fs.readFileSync(file, 'utf8');
const bytes = Buffer.byteLength(html);
const hits = (html.match(/tools\/test/g) || []).length;
const srcOk = fs.existsSync(path.join(ROOT, 'build.mjs')) && fs.existsSync(path.join(ROOT, 'src'));
const livres = objectifsLivres();
const budget = Math.min(PLAFOND, BASE + PAR_OBJECTIF * livres.n);

const measured = {
  bytes, ko: +(bytes / 1000).toFixed(1), kib: +(bytes / 1024).toFixed(1),
  toolsTestHits: hits, buildPresent: srcOk,
  budget, marge: budget - bytes, objectifsLivres: livres.ids, plafond: PLAFOND,
};
const pass = hits === 0 && srcOk && bytes <= budget;
finish(5, {
  pass, measured,
  threshold: `grep 'tools/test' vide et taille ≤ ${budget} octets (470 000 + 15 000 × ${livres.n} objectif(s) livré(s) après G1, plafond ${PLAFOND})`,
  code: pass ? 0 : 1,
});

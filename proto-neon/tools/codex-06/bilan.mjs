import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
const lire = nom => fs.readFile(path.join(here, nom), 'utf8').then(JSON.parse);
const [avant, apres, raccord] = await Promise.all(['avant-etat.json', 'apres-etat.json', 'raccord-propose-etat.json'].map(lire));
const tous = f => apres.profils.every(f);
const checks = {
  grappeDeuxGenerations: tous(p => p.grappe.morts === 3 && p.grappe.pv[3] === 20 && p.grappe.pv[4] === 20 && p.grappe.journal.filter(e => e.d.src.type === 'grappe').length === 2),
  braiseReelleEtProlongation: tous(p => p.braise[0].degats === 0 && p.braise[1].degats > 0 && Math.abs(p.braise[2].degats - p.braise[1].degats - 8) < 1e-8 && p.braise[1].pixelsAmbreArsenal > 0),
  stressBorneEtBusSansPerte: tous(p => p.stress.morts === 128 && p.stress.maxKillsPas <= 24 && p.stress.maxFile <= 64 && p.stress.arsenal.grappes === 0 && p.stress.perdusBus === 0 && p.stress.erreurs === 0),
  invariants: tous(p => p.invariants.sansPropagationPurge && p.invariants.murTue && p.invariants.morsure === 'coupe'),
  zeroErreurVM: tous(p => p.erreurs.count === 0 && !p.erreursConsole.length),
  enduranceSupervisee12Cas: tous(p => p.soak.length === 4 && p.soak.every(s => Math.abs(s.secondesCombat - 60) < 1e-6 && s.erreurs === 0 && s.pixelsHorsPalette === 0)),
  piloteAvantApresIdentique: tous(p => JSON.stringify(p.pilotes) === JSON.stringify(avant.profils.find(q => q.nom === p.nom).pilotes)),
  eperonDansJeuLivre: tous(p => p.eperon.ennemi === 'mort' && p.eperon.joueuse === 'vivant'),
  repitDansJeuLivre: tous(p => p.repit.premiere > 0 && p.repit.seconde === 0),
  raccordProposeSeulementEnMemoire: raccord.profils.every(p => p.eperon.ennemi === 'mort' && p.eperon.joueuse === 'vivant' && p.repit.premiere > 0 && p.repit.seconde === 0 && p.repit.expire && !p.repit.murProtege && p.erreurs.count === 0),
  piloteAutonomeSansBlocageCartes: tous(p => p.pilotes.every(x => x.etat !== 'cartes')),
  playwrightExecute: false
};
const sha256 = {};
for (const file of ['src/02-regles.js', 'src/74-arsenal.js', 'src/75-cartes.js', 'index.html', 'tools/codex-06/raccord-joueuse.patch']) {
  sha256[file] = createHash('sha256').update(await fs.readFile(path.resolve(here, '../..', file))).digest('hex');
}
const bilan = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), checks, sha256,
  statut: 'lot arrêté : raccord propriétaire et validation navigateur indispensables',
  limite: 'Node VM sans DOM ; endurance avec god(true) et reprise manuelle des écrans. Aucune validation Safari ni FPS iPhone.' };
await fs.writeFile(path.join(here, 'bilan.json'), JSON.stringify(bilan, null, 2));
console.log(JSON.stringify(bilan, null, 2));
// Le lot ne passe pas silencieusement au vert si une exigence obligatoire reste fausse.
if (Object.values(checks).some(x => !x)) process.exitCode = 2;

/* Validation du chargement sans DOM contre dix parties historiques, pas un verdict de jeu.
   Aucun serveur, aucun navigateur, aucune connexion ; git show lit l'objet local. */
import fs from 'node:fs';
import path from 'node:path';
import { chargerVM } from '../jury2/vm-temoins.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const ref = 'e1bdc6f';
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16000000 });
const fichiers = git(['ls-tree', '-r', '--name-only', ref, '--', 'src/']).trim().split('\n').filter(f => f.endsWith('.js')).sort();
assert(fichiers.length > 0);
const sources = fichiers.map(f => [f, git(['show', ref + ':proto-neon/' + f])]);
const reference = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/pilotes/sortie.json')));
const cas = [], debut = performance.now();
for (const attendu of reference.cas.slice(0, 10)) {
  const { c, N, erreurs } = chargerVM(ROOT, { sources, graine: attendu.graine });
  const S = N.S;
  c.localStorage.clear(); S.jour = 20261017;
  if (S.reglages) S.reglages.actions = attendu.pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(attendu.graine, { depart: 'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(attendu.pilote); N.journal.actif(true); N.horloge.avancer();
  let simule = 0;
  while (N.game.etat() !== 'fin' && N.horloge.t() < 540 && simule < 2160 && !c.__ERR.count) {
    N.game.dbg.simuler(.25); simule += .25;
  }
  const d = N.game.dbg(), mesure = { tempsJeu: N.horloge.t(), vague: d.vague, score: d.score };
  const cible = { tempsJeu: attendu.tempsJeu, vague: attendu.vague, score: attendu.score };
  cas.push({ pilote: attendu.pilote, graine: attendu.graine, attendu: cible, mesure, identique: JSON.stringify(cible) === JSON.stringify(mesure), erreurs: c.__ERR.count, erreursConsole: erreurs });
  console.log(JSON.stringify(cas.at(-1)));
}
const preuve = { harnaisSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(HERE,'../jury2/vm-temoins.mjs'))).digest('hex'), dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), reference: ref,
  protocole: 'parties.mjs : profil vierge, jour fixe, actions, reset plongée, pilote, avancer une fois, simuler .25 jusqu’à fin',
  dureeSecondes: (performance.now() - debut) / 1000, cas, valide: cas.length >= 10 && cas.every(c => c.identique && !c.erreurs && !c.erreursConsole.length) };
fs.writeFileSync(path.join(HERE, 'validation-vm.json'), JSON.stringify(preuve, null, 2) + '\n');
assert(preuve.valide, 'VM divergente : ne pas conclure depuis cette VM');

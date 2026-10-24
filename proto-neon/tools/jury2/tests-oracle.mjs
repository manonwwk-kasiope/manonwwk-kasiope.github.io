/* Contrôle local de l'étalon avant de payer/solliciter un juré. Reconstructions en série
   dans un dossier temporaire propre, sources externes en lecture seule ; aucun navigateur. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { P, REGARDS, FAMILLES, paris } from './protocole.mjs';
import { construirePaquet, doublon } from './jure.mjs';
import { dossierSynthetique } from './tests-jury.mjs';
import { oracle, observer } from './oracle.mjs';
import { contextePaquet, validerVerdict, retrouverCanaris, consolider, analyserEtalonnage, controleJure } from './etalonnage.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COURANT=path.join(HERE,'../../../../jury-etal/proto-neon/tools/jury2');
// Les paquets du tour précédent ont été archivés par l’orchestratrice.
const REELS = path.resolve(process.env.JURY2_ORACLE_REELS ||
  (fs.existsSync(path.join(COURANT,'cles/J-4ed1eb86.json'))?COURANT:path.join(HERE,'../../../../jury-etal/archives-v2')));
const CODES = ['J-4ed1eb86', 'J-69cf5913', 'J-c053a476'];
const lire = f => JSON.parse(fs.readFileSync(f));
const ecrire = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n');

function mesurer(montages, cles, observations) {
  const resultats = {};
  for (const mode of ['oracle', 'nul', 'tricheur']) {
    const verdicts = [];
    for (const racine of montages) {
      const code = path.basename(racine), cle = lire(path.join(cles, code + '.json'));
      // Valeurs de test fixées : écart V0-témoin = 3, ancrage = 0, doublon identique.
      const note = cle.role === 'etalonnage-temoin' ? 3 : cle.role === 'etalonnage-v0' ? 6 : 7;
      for (const famille of FAMILLES) for (const regard of REGARDS) {
        const pair = oracle({ racine, cle, regard, famille, jure: `${mode}-${famille}-${regard}`, note, mode });
        pair.forEach((v, i) => verdicts.push({ fichier: `${code}.p${i + 1}.json`, v }));
      }
    }
    const { lignes, rejets } = consolider({ verdicts, paquets: path.dirname(montages[0]), cles });
    const analyse = analyserEtalonnage(lignes);
    resultats[mode] = { valide: analyse.valide, rejets, jures: analyse.jures.map(j => ({ jure: j.jure, ecarte: j.ecarte, raisons: j.raisons, tests: j.tests })),
      paquets: lignes.map(l => ({ code: l.code, regard: l.regard, famille: l.famille, canaris: l.canaris, preuves: l.preuves, erreurs: l.erreurs, controle: controleJure(l) })) };
  }
  observations.push(resultats);
  const bon = resultats.oracle;
  assert.equal(bon.rejets.length, 0);
  assert(bon.paquets.every(l => l.canaris.part === 1), JSON.stringify(bon.paquets.filter(l => l.canaris.part !== 1)));
  assert(bon.paquets.every(l => l.preuves.introuvables === 0 && !l.erreurs.length && l.controle.ok), JSON.stringify(bon.paquets.filter(l => l.erreurs.length || l.preuves.introuvables || !l.controle.ok)));
  assert.equal(bon.valide, true, JSON.stringify(bon.jures.filter(j => j.ecarte)));
  assert(resultats.nul.jures.every(j => j.ecarte && j.tests.canaris.ok === false));
  assert(resultats.nul.paquets.every(l => l.canaris.retrouves === 0));
  assert(resultats.tricheur.jures.every(j => j.ecarte));
  assert(resultats.tricheur.paquets.every(l => l.erreurs.some(e => /annexe/.test(e))));
  return { paquets: montages.length, cellules: FAMILLES.length * REGARDS.length, canaris: '100 % par paquet et regard', preuvesIntrouvables: 0, nul: 'écarté', tricheur: 'rejeté' };
}

export async function testsOracle({ test, preuve }) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'snake-codex-di6-')));
  const observations = preuve.oracle = { dateParis: paris(), sourceReelle: REELS, temporaire: tmp, fixture: [], reels: [] };
  try {
    await test('Oracle : fixture, deux passes, cinq regards, deux familles ; nul et tricheur rejetés', async () => {
      const dossier = dossierSynthetique(tmp), sortie = path.join(tmp, 'fixture-paquets'), cles = path.join(tmp, 'fixture-cles'), montages = [];
      for (const [n, role] of ['v0', 'pointe', 'temoin'].entries()) {
        const r = await construirePaquet({ dossier, sortie, cles, role: 'etalonnage-' + role, code: 'J-fixture' + n, graineTirage: n === 0 ? 'abcd' : String(n) });
        montages.push(r.racine);
      }
      const d = doublon({ code: 'J-fixture1', sortie, cles, nouveauCode: 'J-fixture-doublon', graineTirage: 'd0' }); montages.push(path.join(sortie, d.code));
      return mesurer(montages, cles, observations.fixture);
    });
    await test('Oracle : reconstruction des trois paquets réels et doublon ; 100 % partout sans seuil modifié', async () => {
      const sortie = path.join(tmp, 'reels-paquets'), cles = path.join(tmp, 'reels-cles'), montages = [];
      for (const code of CODES) {
        const k = lire(path.join(REELS, 'cles', code + '.json'));
        const dossier = k.dossierBrutChemin || path.join(REELS, 'dossiers', k.dossierBrut);
        const r = await construirePaquet({ dossier, sortie, cles, code, role: k.role, graineTirage: k.graineTirage });
        const kc = lire(r.cleFichier); assert.equal(kc.canarisManques.length, 0, JSON.stringify(kc.canarisManques));
        assert.equal(kc.canaris.length, P.canaris.parPaquet.etalonnage);
        assert.deepEqual(kc.ordre, k.ordre);
        for (const c of kc.canaris.filter(c => c.passe === 2)) assert(observer(contextePaquet(r.racine), c).length, 'Canari non qualifiable : ' + c.champ);
        montages.push(r.racine);
      }
      const d = doublon({ code: 'J-69cf5913', sortie, cles, nouveauCode: 'J-reel-doublon', graineTirage: 'd0' }); montages.push(path.join(sortie, d.code));
      return mesurer(montages, cles, observations.reels);
    });
    await test('Oracle : X-gd a réellement retrouvé le temps incohérent, aucun autre défaut ne lui est attribué', () => {
      const code = CODES[0], k = lire(path.join(REELS, 'cles', code + '.json'));
      const vs = [1, 2].map(p => lire(path.join(REELS, 'verdicts/X-gd', `${code}.p${p}.json`)));
      const r = retrouverCanaris(vs, k, contextePaquet(path.join(REELS, 'paquets', code)));
      observations.xgd = r;
      assert.equal(r.retrouves, 1); assert.equal(r.detail.find(c => c.type === 'temps-incoherent').retrouve, true);
      return r;
    });
    await test('Oracle : preuve honnête par champ/case acceptée, mauvais champ/case/temps et fuite annexe refusés', () => {
      const racine = path.join(tmp, 'fixture-paquets/J-fixture0'), ctx = contextePaquet(racine), k = lire(path.join(tmp, 'fixture-cles/J-fixture0.json'));
      const c = k.canaris.find(c => c.passe === 1 && c.indices?.length);
      assert(c, 'fixture sans cases ciblées');
      const v = p => ({ passe: 1, preuves: [{ id: 'p', observation: 'Pièce incohérente dans cette case.', ...p }], anomaliesDossier: [{ constat: 'Anomalie de dossier.', preuves: ['p'] }] });
      const compte = p => retrouverCanaris([v(p)], { canaris: [c] }, ctx).retrouves;
      assert.equal(compte({ fichier: c.fichier, case: c.indices[0] }), 1);
      assert.equal(compte({ fichier: c.fichierJson, champ: `/images/${c.indices[0]}/w` }), 1);
      assert.equal(compte({ fichier: c.fichierJson, champ: '/ordre' }), 0);
      assert.equal(compte({ fichier: c.fichierJson, champ: '/inexistant' }), 0);
      assert.equal(compte({ fichier: c.fichier, case: -1 }), 0);
      assert.equal(compte({ fichier: c.fichier, temps: { valeur: 99999, unite: 's_reel' } }), 0);
      const [p1] = oracle({ racine, cle: k, regard: REGARDS[0], mode: 'tricheur' });
      p1.fichiersInspectes = p1.fichiersInspectes.filter(f => !f.startsWith('annexe/'));
      assert.equal(validerVerdict(p1, ctx, { passe: 1 }).valide, false, 'Une citation interdite suffit, même sans déclarer l’inspection');
      const remplace = { ...k, canaris: k.canaris.map(c => ({ ...c, description: 'MOT SECRET', fenetre: [-999, -998], indices: [999] })) };
      assert.deepEqual(oracle({ racine, cle: remplace, regard: REGARDS[0] }), oracle({ racine, cle: k, regard: REGARDS[0] }), 'Observations dérivées de la clé plutôt que du paquet');
      return { preuveHonnête: true, fauxPositifsRefuses: true, citationAnnexeSeuleRejetee: true, motsEtCoordonneesSecretsIgnores: true };
    });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preuve = { dateParis: paris(), controles: [] };
  await testsOracle({ preuve, test: async (nom, f) => {
    try { const valeur = await f(); preuve.controles.push({ nom, ok: true, valeur }); }
    catch (e) { preuve.controles.push({ nom, ok: false, erreur: String(e.stack || e) }); }
    console.log(JSON.stringify({ nom, ok: preuve.controles.at(-1).ok }));
  } });
  preuve.reussi = preuve.controles.every(c => c.ok);
  ecrire(path.join(HERE, process.argv.includes('--avant') ? 'oracle-avant.json' : 'oracle-apres.json'), preuve);
  if (!preuve.reussi) process.exitCode = 1;
}

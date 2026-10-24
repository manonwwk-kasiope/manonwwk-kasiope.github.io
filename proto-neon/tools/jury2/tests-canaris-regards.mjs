/* Régression codex-di3 : montage réel, sans serveur, navigateur ni réseau.
   Les sources externes restent en lecture seule ; toutes les reconstructions sont temporaires.
   JURY2_REELS permet de déplacer la source sans modifier le test. Son absence est un échec, jamais un skip. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { P, REGARDS, paris } from './protocole.mjs';
import { construirePaquet, doublon } from './jure.mjs';
import { dossierSynthetique } from './tests-jury.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const lire = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const REELS = path.resolve(process.env.JURY2_REELS || path.join(HERE, '../../../../jury-f1/proto-neon/tools/jury2'));
const CODES = ['J-625ea38c', 'J-b632cd0a', 'J-611ad6f4'];

export function accessibilite(racine, cle) {
  const paquet = lire(path.join(racine, 'paquet.json'));
  const p1 = cle.canaris.filter(c => c.passe === 1);
  assert(p1.length, 'Aucun défaut de passe 1 : contrôle vide interdit');
  const regards = Object.fromEntries(REGARDS.map(regard => {
    const liste = new Set(paquet.parRegard[regard]);
    const manques = p1.filter(c => ![c.fichier, c.fichierJson].every(f => f && liste.has(f)));
    return [regard, { visibles: p1.length - manques.length, total: p1.length,
      part: (p1.length - manques.length) / p1.length, absents: manques.map(c => ({ id: c.id, fichier: c.fichier, fichierJson: c.fichierJson })),
      fichiers: liste.size }];
  }));
  return { code: paquet.code, regards };
}

function verifierAcces(racine, cle, mesure) {
  const paquet = lire(path.join(racine, 'paquet.json'));
  assert.equal(cle.canarisManques.length, 0, 'Un défaut demandé n’a pas été planté');
  assert.equal(cle.canaris.length, P.canaris.parPaquet.etalonnage);
  for (const [regard, r] of Object.entries(mesure.regards)) {
    assert.equal(r.part, 1, `${paquet.code} / ${regard} : ${r.visibles}/${r.total}, absents ${JSON.stringify(r.absents)}`);
    const liste = paquet.parRegard[regard];
    assert.equal(new Set(liste).size, liste.length, 'Doublon dans une liste');
    assert(!liste.some(f => f.startsWith('annexe/')), 'Fuite de passe 2 dans la liste de passe 1');
    for (const f of liste) assert(fs.existsSync(path.join(racine, f)), 'Pièce listée absente : ' + f);
  }
  for (const c of cle.canaris.filter(c => c.passe === 2)) {
    assert.equal(c.fichier, 'annexe/annexe.json');
    let valeur = lire(path.join(racine, c.fichier));
    for (const k of c.champ.split('/').slice(1)) valeur = valeur?.[k];
    assert.notEqual(valeur, undefined, 'Champ du défaut de passe 2 absent');
    assert.equal(paquet.fichiers.some(f => f.chemin === c.fichier), false);
  }
}

export async function testsCanarisRegards({ test, preuve }) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'snake-codex-di3-')));
  const sortie = path.join(tmp, 'montages'), cles = path.join(tmp, 'cles');
  const observations = { dateParis: paris(), sourceReelle: REELS, temporaire: tmp, fixture: null, originaux: [], reconstructions: [] };
  try {
    await test('Accessibilité : fixture montée, chaque regard reçoit tous les défauts de passe 1', async () => {
      const dossier = dossierSynthetique(tmp);
      const r = await construirePaquet({ dossier, role: 'etalonnage-temoin', sortie, cles, code: 'J-3f9a1c7e', graineTirage: 'abcd' });
      const cle = lire(r.cleFichier), m = accessibilite(r.racine, cle); observations.fixture = m;
      verifierAcces(r.racine, cle, m); return m;
    });
    for (const code of CODES) await test('Accessibilité : reconstruction brute ' + code + ', tous les regards à 100 %', async () => {
      const cleSource = lire(path.join(REELS, 'cles', code + '.json'));
      observations.originaux.push(accessibilite(path.join(REELS, 'paquets', code), cleSource));
      const dossier = path.join(REELS, 'dossiers', cleSource.dossierBrut);
      const r = await construirePaquet({ dossier, role: cleSource.role, sortie, cles, code, graineTirage: cleSource.graineTirage });
      const cle = lire(r.cleFichier), m = accessibilite(r.racine, cle); observations.reconstructions.push(m);
      // Même tirage et mêmes défauts de passe 1 ; la passe 2 peut migrer vers une mesure qualifiée.
      assert.deepEqual(cle.ordre, cleSource.ordre);
      assert.deepEqual(cle.canaris.filter(c => c.passe === 1), cleSource.canaris.filter(c => c.passe === 1));
      verifierAcces(r.racine, cle, m); return m;
    });
    await test('Accessibilité : noms neutres, tirage crypto, listes indépendantes des défauts et doublon préservé', async () => {
      const dossier = path.join(tmp, 'etalonnage-fixture');
      const r = await construirePaquet({ dossier, role: 'etalonnage-temoin', sortie, cles });
      assert.match(r.code, /^J-[0-9a-f]+$/);
      const cle = lire(r.cleFichier); assert.match(cle.graineTirage, /^[0-9a-f]+$/);
      const pq = lire(path.join(r.racine, 'paquet.json'));
      // Rejouer exactement le tirage sans altérations : aucun ajout ne doit révéler une pièce plantée.
      const sans = await construirePaquet({ dossier, role: cle.role, sortie, cles, graineTirage: cle.graineTirage, sansCanaris: true });
      assert.notEqual(r.code, sans.code);
      assert.deepEqual(pq.parRegard, lire(path.join(sans.racine, 'paquet.json')).parRegard);
      for (const regard of REGARDS) for (const f of pq.fichiers.filter(f => ['planche', 'planche-meta', 'tapis', 'tapis-meta'].includes(f.categorie))) {
        assert(pq.parRegard[regard].includes(f.chemin), 'Pièce candidate absente : ' + regard + ' / ' + f.chemin);
      }
      const d = doublon({ code: r.code, sortie, cles });
      const kc = lire(path.join(cles, d.code + '.json')), m = accessibilite(path.join(sortie, d.code), kc);
      verifierAcces(path.join(sortie, d.code), kc, m);
      return { code: r.code, doublon: d.code, listesIndependantes: true };
    });
  } finally {
    preuve.accessibilite = observations;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preuve = { dateParis: paris(), controles: [] };
  await testsCanarisRegards({ preuve, test: async (nom, f) => {
    try { const valeur = await f(); preuve.controles.push({ nom, ok: true, valeur }); }
    catch (e) { preuve.controles.push({ nom, ok: false, erreur: String(e.stack || e) }); }
    console.log(JSON.stringify({ nom, ok: preuve.controles.at(-1).ok }));
  } });
  preuve.reussi = preuve.controles.every(c => c.ok);
  const phase = process.argv.includes('--avant') ? 'avant' : 'apres';
  fs.writeFileSync(path.join(HERE, 'accessibilite-' + phase + '.json'), JSON.stringify(preuve, null, 2) + '\n');
  if (!preuve.reussi) process.exitCode = 1;
}

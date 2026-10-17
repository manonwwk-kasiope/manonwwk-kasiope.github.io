import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { HERE, ROOT } from './vm.mjs';
const lire = f => JSON.parse(fs.readFileSync(path.join(HERE, f)));
const validation = lire('validation-vm.json'), scenes = lire('scenes-vm.json'), parties = lire('parties-vm.json');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const finalHash = sha(path.join(ROOT, 'index.html'));
// Le manifeste initial a été ouvert avant le déplacement de la constante 9 vers N.R.
// Les enfants « après » ont tous démarré APRÈS le dernier build (et après avant-bon-3).
const ancienHash = parties.apresSha256Initial || parties.apresSha256;
assert.ok(parties.apresSha256 === finalHash || fs.statSync(path.join(HERE, 'avant-bon-3.json.gz')).mtimeMs > fs.statSync(path.join(ROOT, 'index.html')).mtimeMs,
  'Si le bundle est reconstruit après les mesures, ne pas réattribuer leur empreinte : rejouer ou vérifier son identité');
parties.apresSha256Initial = ancienHash; parties.apresSha256 = finalHash;
parties.integrite = 'Enfants après lancés séquentiellement après avant-bon-3, lui-même terminé après le dernier build ; chacun charge le fichier index.html au démarrage.';
fs.writeFileSync(path.join(HERE, 'parties-vm.json'), JSON.stringify(parties, null, 2));
assert.equal(validation.controles.length, 10);
assert.ok(validation.controles.every(c => c.identique && c.err === 0 && !c.erreursConsole.length));
assert.equal(parties.cas.length, 12);
assert.ok(parties.cas.every(c => c.raison === 'fin' && c.err === 0 && !c.erreursConsole.length));
const apres = scenes.filter(s => s.ref === 'courant');
assert.equal(apres.length, 10);
assert.ok(apres.every(c => !c.borne && c.err.count === 0 && c.couverture.rates === 0 && !c.erreursSchema.length && !c.erreursConsole.length));
const physique = [];
for (const s of apres) {
  const b = scenes.find(c => c.ref !== 'courant' && c.type === s.type && c.phase === s.phase);
  const lireTrace = r => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE, r.fichier))));
  const a = lireTrace(s), z = lireTrace(b);
  const projection = c => c.creations.map(x => ({ t: x.t, genre: x.genre, objet: x.objet }));
  assert.deepEqual(projection(a), projection(z), s.type + ' : créations physiques identiques');
  assert.equal(s.premierDegatPossible, b.premierDegatPossible, s.type + ' : même échéance physique');
  if (s.type.startsWith('mines-')) {
    assert.deepEqual(a.trace[0].mine, z.trace[0].mine, s.type + ' : mine réelle identique');
    assert.deepEqual(a.collisions, z.collisions, s.type + ' : même collision effective');
  }
  physique.push({ phase: s.phase, type: s.type, creationsIdentiques: true, premierDegatIdentique: true });
}
const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
const controles = { dateParis: date, avantSha256: sha(path.join(HERE, 'avant.html')), apresSha256: finalHash,
  VM: validation.controles.length, parties: parties.cas.length, pointsGeometrie: apres.reduce((n, r) => n + r.couverture.points, 0),
  erreurs: 0, physique, R07: { conforme: false, ecarts: apres.filter(r => r.type.startsWith('mines-')).map(r => ({ type: r.type, avance: r.avance })) },
  navigateur: 'non exécuté : interdit dans ce bac' };
fs.writeFileSync(path.join(HERE, 'controles.json'), JSON.stringify(controles, null, 2));
const ms = x => x === null ? 'absente' : (x * 1000).toFixed(2).replace('.', ',');
const sec = x => x === null ? '—' : x.toFixed(6).replace('.', ',');
const noms = { rayon: 'Rayon balayé', salve: 'Salves radiales', ciseaux: 'Ciseaux', bond: 'Bond / impact', salve2: 'Double spirale', ruche: 'RUCHE / contact des larves', sentinelle: 'SENTINELLE / laser', 'mines-contact': 'Mines du bond / contact', 'mines-souffle': 'Mines du bond / souffle' };
const rows = apres.map(r => `| ${r.phase === 1 && ['ruche','sentinelle'].includes(r.type) ? '—' : r.phase} | ${noms[r.type]} | ${sec(r.premiereZone)} | ${sec(r.premierDegatPossible)} | ${ms(r.avance)} | ${r.couverture.points - r.couverture.rates}/${r.couverture.points} | ${r.type.startsWith('mines-') ? '**écart préexistant**' : '≥ seuil'} |`);
const partyRows = [];
for (const pilote of ['dieu', 'bon']) for (const graine of [1,2,3]) {
  const a = parties.cas.find(c => c.version === 'avant' && c.pilote === pilote && c.graine === graine);
  const b = parties.cas.find(c => c.version === 'apres' && c.pilote === pilote && c.graine === graine);
  partyRows.push(`| ${pilote} | ${graine} | ${a.tempsJeu.toFixed(3)} → ${b.tempsJeu.toFixed(3)} | ${a.score} → ${b.score} | ${a.mortsCyclope} → ${b.mortsCyclope} | ${b.bossVu ? 'oui' : 'non'} | fin / 0 |`);
}
const publication = '18/10/2026 · 00 h 52';
const maj = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(':', ' h ');
const rapport = `# codex-p4 — les télégraphes manquants

${publication} (Paris) — mis à jour à ${maj}. **Commande hors bac :** \`cd proto-neon && node tools/codex-p4/verifier.mjs\`.

**Livré pour revue ; palier R-07 non validé.** Les publications demandées sont vérifiées en VM. La vérification navigateur est bloquée dans ce bac ; le script est prêt. Aucun serveur ni Chromium n'a été lancé. Aucun commit.

## Modifications

- CYCLOPE : secteur balayé avec ses capsules de bord ; chaque trajectoire des deux salves et de la double spirale ; deux bandes des ciseaux pendant leur charge ; disque d'impact du bond. Les vrais lasers et tirs continuent d'être publiés jusqu'à leur suppression, avec \`reste = 0\` lorsqu'ils sont actifs. Le laser ne blesse que la tête ; les projectiles et les ciseaux peuvent couper le corps.
- RUCHE : contacts aux positions prévues des larves de la couvée, puis positions réelles tant que leurs portails sont actifs. La couvée ne produit aucun souffle et ne blesse pas directement. Les morsures ultérieures des larves gardent leur publication existante dans 72.
- SENTINELLE : le laser réel, ses deux extrémités et sa demi-largeur restent dans S.tele pendant toute sa vie. Avant, seul l'avertissement était présent.
- Agrégation publique : \`N.colosse.publierTele(ajouter)\` et \`N.ennemis.publierTele()\`. Rafraîchissement après 73 pour respecter l'ordre 72 → 73 de la boucle. Pool réutilisé extensible, sans plafond silencieux à 48 zones. Plusieurs formes peuvent décrire une seule attaque avec le même id.
- Six constantes existantes déplacées/copartagées dans \`N.R.publicationTele\`, raisons et valeurs dans la section codex-p4 de \`refonte/lots/demandes.md\`. Les délais, dégâts, dessins, palette, flashs, mur et morsure n'ont pas été changés.

## Mesures avant/après : scènes

Sources : [scenes-vm.json](scenes-vm.json) ; journaux, créations physiques et états de chaque pas dans les fichiers \`courant-*.json.gz\` / \`85b389d-*.json.gz\`. Temps en secondes de jeu depuis le début de chaque scène. Graine 7, pas de 1/120 s (plus fin qu'une image de référence), vraies sources triées comme build.mjs, aucune IA de jeu remplacée. Les phases 2/3 sont atteintes par \`N.ennemis.hit\` sur l'œil vulnérable ; les placements passent par \`N.joueuse.force\`.

| Phase | Attaque | Première zone s | Premier dégât possible s | Avance ms | Points couverts | R-07 |
|---|---|---:|---:|---:|---:|---|
${rows.join('\n')}

**Avant** : aucune zone CYCLOPE ni RUCHE dans ces scènes ; l'avertissement SENTINELLE apparaissait au même instant mais disparaissait au tir (115/126 points de contrôle manquants). Les deux défauts des mines étaient déjà présents. **Après** : ${controles.pointsGeometrie} points de contrôle couverts, aucune erreur de schéma ni erreur VM/console. Ces points échantillonnent les centres et bords des trajectoires réelles, les lasers pendant leur vie, les mains, les larves et les collisions effectives ; ils ne constituent pas une preuve exhaustive sur toutes les graines.

Le premier dégât possible des tirs/lasers/contact des mains est déduit des vrais objets créés et de l'ordre de boucle : 70 teste les collisions avant 72/73, donc au pas suivant. Le bond et les mines sont confirmés par une mort effective (retour du module ou événement mort avec coordonnées) ; les ciseaux produisent aussi de vraies coupes. La géométrie est contrôlée au dernier avertissement et sur les dangers créés, avec leur largeur ; aucun compteur d'appels seul ne donne le verdict. Les dates de première création et les objets physiques émis sont **identiques avant/après dans les dix scènes** ([controles.json](controles.json)).

**Écarts laissés tels quels, inscrits dans demandes.md :** le contact d'une mine du bond peut tuer ${ms(apres.find(r=>r.type==='mines-contact').avance)} ms après la première zone S.tele, sous les deux seuils. Son portail visuel est déjà présent avant, mais il n'est pas publié dans S.tele. Le souffle arrive après 600 ms : conforme au seuil général de 500 ms, insuffisant au seuil CYCLOPE de 800 ms si ces mines lui sont rattachées. Les journaux de ces coups peuvent porter \`teleDuree = 0\` malgré une zone existante ; ce champ n'est pas utilisé comme preuve de délai. Aucun seuil abaissé, aucun temps corrigé.

## Parties des pilotes

[parties-vm.json](parties-vm.json), reçus complets \`avant/apres-{dieu,bon}-{1,2,3}.json.gz\`. Protocole de tools/pilotes/parties.mjs : stockage vide, S.jour=20261017, réglage actions, intro.skip, reset départ plongée et crochet seulement si demarrage, pilote, dieu invulnérable, journal actif, horloge.avancer initial puis simuler(0.25) jusqu'à fin. Aucun écran intermédiaire sauté. Borne de 540 s de jeu et garde de blocage inchangées.

| Pilote | Graine | Temps jeu avant → après s | Score avant → après | Morts CYCLOPE avant → après | Boss atteint après | Arrêt / erreurs après |
|---|---:|---|---|---:|---|---|
${partyRows.join('\n')}

Les douze parties vont à fin, zéro erreur et zéro erreur console. Sur ce petit lot, bon passe de **3 à 2 morts attribuées au CYCLOPE**, toutes sur la graine 2 ; les graines 1/3 n'atteignent pas le boss. Dieu est invulnérable par protocole : ses zéros ne qualifient pas la difficulté. Aucune conclusion statistique sur les pilotes.

## Instrument, construction et reste

[validation-vm.json](validation-vm.json) : dix parties inerte, graines 1 à 10, sources de e1bdc6f, redonnent exactement les temps de jeu, vagues et scores de tools/pilotes/sortie.json ; zéro erreur. Le chargeur vérifie aussi que chaque source exacte appartient au bundle de son état. Initialement, plusieurs contextes dans un même processus ont arrêté Node avec le code 139 après quatre concordances ; chaque partie tourne désormais dans un processus isolé. Une adaptation initiale du chemin git ls-tree a donné un TypeError (gfx absent), corrigé avant la nouvelle série complète de dix concordances.

La première sonde produisait jusqu'à deux faux négatifs après modification (collisions d'une attaque antérieure et laser déjà retiré) et ne voyait pas l'appel lexical du laser SENTINELLE : [scenes-vm-initial.json](scenes-vm-initial.json). Elle a été corrigée pour observer les vrais objets publics et l'événement mort, puis les scènes ont été remesurées, sans affaiblir les seuils. Le contact des mines reste un vrai échec de délai, pas une réussite masquée.

Build : \`cd proto-neon && node build.mjs\`, sortie 0, [build.log](build.log). Avant : \`${controles.avantSha256}\`. Après : \`${finalHash}\`. Le manifeste des parties conserve aussi l'empreinte initiale prise avant la migration de la constante du rayon ; les enfants après ont tous été lancés après le dernier build (ordre séquentiel du banc, reçu avant-bon-3 postérieur à ce build).

**Reste indispensable hors bac :** lancer verifier.mjs. Il sert les deux bundles, ouvre un seul Chromium muet, teste les profils tactiles iPhone 844×390 / 390×844 et bureau 1440×900 en série, conserve les pixels de N.gfx.buf(), leurs histogrammes/empreintes, captures, journaux et les parties. Il doit rapporter les défauts connus des mines comme échecs, pas adapter les seuils. Aucune mesure de pixels, capture, performance navigateur ou compatibilité Safari réelle n'est revendiquée ici. La cheffe d'orchestre relit/intègre le diff ; le palier R-07 demeure non validé.
`;
fs.writeFileSync(path.join(HERE, 'rapport.md'), rapport);
console.log(JSON.stringify(controles));

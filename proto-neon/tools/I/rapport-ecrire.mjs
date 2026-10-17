/* tools/I/rapport-ecrire.mjs — écrit tools/I/rapport.md à partir de tools/I/sortie.json (appelé par verifier.mjs).
   Tout chiffre du rapport vient de la sortie du banc ; le « reste à faire » est écrit à la main plus bas, avec ses raisons. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const f1 = x => (+x).toFixed(1).replace('.', ',');

export function ecrireRapport(sortie, opts) {
  const S = sortie.sections, L = [];
  const date = sortie.dateParis.replace(', ', ' · ').replace(/(\d+):(\d+):\d+/, '$1 h $2');
  L.push('# Lot I — dépendances de codex-02 (rapport du banc)', '');
  L.push(`${date} (Paris). Copie propre du commit \`${sortie.copie.commit}\`${sortie.ref === sortie.copie.commit ? '' : ' (\`' + sortie.ref + '\`)'}${sortie.overlay ? ' avec les fichiers du lot I du dossier de travail par-dessus (essai avant commit)' : ''}, construite par \`node build.mjs\` dans un dossier temporaire ; SHA-256 du bundle \`${sortie.copie.sha256}\`. ${sortie.navigateur ? 'Chromium ' + sortie.navigateur + '.' : ''}`, '');
  L.push(`Statut du banc : **${sortie.conforme ? 'toutes les mesures ci-dessous passent' : sortie.echecs.length + ' mesure(s) en échec : ' + sortie.echecs.join(' ; ')}**. Ce rapport mesure le lot I, il ne valide ni le palier ni le chantier des pilotes.`, '');
  L.push('Profil iPhone 13 paysage 844 × 390, `window.__SEED` fixé, `N.intro.skip()`, départ en plongée, simulation par `N.game.dbg.simuler` (aucun saut de séquence, aucun `valider`). Commande : `node tools/I/verifier.mjs --ref ' + sortie.copie.commit + (sortie.base ? ' --base ' + sortie.base.commit : '') + ' --pilotes ' + (sortie.pilotes || 'bon') + ' --graines ' + (opts.NB_GRAINES) + '`.', '');

  if (S.etats) {
    L.push('## 1. Le crochet du pilote et les vues, état par état', '');
    for (const [mode, titre] of [['a', 'Partie au doigt, invulnérable (de la plongée à la victoire)'], ['b', 'Partie au doigt, sans rien faire (jusqu\'à la mort et à la fin)']]) {
      const r = S.etats[mode];
      L.push(`**${titre}** — arrêt \`${r.raison}\`, ${f1(r.tempsJeu)} s de jeu (${f1(r.tempsSimule)} s simulées), vague ${r.vague}, erreurs ${r.err}, console ${r.erreursConsole.length}.`, '');
      L.push('| État | Pas de `update` | Appels de `__PILOT` | Tranches relevées | Vues au schéma (butin · vue · voies · tele · pouvoir · player) | Plus grands relevés |', '|---|---:|---:|---:|---|---|');
      for (const e of Object.keys(r.maj)) {
        const v = r.vues[e] || {};
        L.push(`| ${e} | ${r.maj[e]} | ${r.pilote[e] || 0} | ${v.tranches || 0} | ${[v.butin, v.vue, v.voies, v.tele, v.pouvoir, v.player].join(' · ')} | ${v.nButin} cellules, ${v.nVoies} voie, ${v.nTele} télégraphes${e === 'vol' ? ', S.vol au schéma sur ' + v.vol + ' tranches (' + v.nObjVol + ' objets au plus)' : ''} |`);
      }
      L.push('');
    }
    const ec = S.etats.a.ecranCartes, nv = S.etats.a.niveauxVus || {}, maxN = Math.max(0, ...Object.values(nv));
    if (ec) L.push(`Écran des cartes relevé en jeu (\`depuis\` ${f1(ec.depuis)} s) : cartes ${JSON.stringify(ec.cartes)}, \`niveaux\` ${JSON.stringify(ec.niveaux)}. Plus grands paliers proposés pendant toute la partie : ${JSON.stringify(nv)} ; ${maxN >= 4 ? 'le palier IV (ULTIME) a été proposé.' : 'le palier IV (ULTIME) n\'a pas été proposé pendant ce parcours (voir la sonde du § 1 ter).'}`, '');
  }

  if (S.horsCombat) {
    const r = S.horsCombat;
    L.push('## 1 bis. Le crochet dans les états hors combat', '');
    L.push('États forcés par `N.game.dbg.etat(nom)` puis 0,3 s simulées (à vérifier ainsi parce que les parcours ci-dessus ne les traversent pas tous) : ' + Object.keys(r.essais).map(e => `${e} (${r.maj[e]} pas, ${r.pilote[e] || 0} appels)`).join(', ') + `. Erreurs : ${r.err}.`, '');
  }

  if (S.niveaux) {
    const r = S.niveaux;
    L.push('## 1 ter. `S.ecran.niveaux` et l\'ULTIME (sonde)', '');
    L.push(`Après deux prises du CANON, l'écran des cartes rouvert ${r.ouvertures} fois jusqu'à ce que le CANON y figure : cartes ${JSON.stringify(r.cartes)}, \`niveaux\` ${JSON.stringify(r.niveaux)}. Palier du CANON : **${r.ultimeVu}** (4 = ULTIME) ; chaque valeur égale \`N.cartes.texte(id).palier\` : ${r.coherent ? 'oui' : 'NON'} ; schéma \`ecran\` respecté sur l'écran des cartes et après sa fermeture (\`niveaux\` vaut alors ${JSON.stringify(r.horsCartes.niveaux)}) : ${(r.schema.length || r.schemaHors.length) ? 'NON' : 'oui'}.`, '');
  }

  if (S.identique) {
    L.push('## 2. Une partie normale au doigt reste identique', '');
    if (S.identique.ignoree) L.push('Non mesuré : ' + S.identique.ignoree, '');
    else {
      L.push(`Même script de doigt (vise la cellule la plus proche), même graine, trace relevée toutes les 0,1 s (état, temps, score, kills, longueur, position, ennemis et leurs PV, tirs, cellules, vague, pas) sur la version de base \`${sortie.base.commit}\` et sur la version du lot I. Les parties s'arrêtent à la première fin ou au seuil d'un écran à horloge arrêtée (la version de base ne le franchit pas en simulation).`, '');
      L.push('| Parcours | Lignes base | Lignes lot I | Première divergence | Dernier état | Empreinte base | Empreinte lot I |', '|---|---:|---:|---|---|---|---|');
      for (const [nom, r] of Object.entries(S.identique)) L.push(`| ${nom} | ${r.lignesBase} | ${r.lignesNouveau} | ${r.premiereDivergence < 0 ? 'aucune' : r.premiereDivergence} | ${r.dernierEtat} | \`${r.empreinteBase}\` | \`${r.empreinteNouveau}\` |`);
      L.push('');
    }
  }

  if (S.pilote) {
    const noms = [...new Set(S.pilote.map(r => r.pilote))];
    L.push(`## 3. Les pilotes de Codex (${noms.join(', ')}) : ${S.pilote.length} parties`, '');
    L.push(`\`N.pilote.lancer(nom)\` puis \`N.game.dbg.simuler(0.25)\` par tranches, jusqu'à l'état \`fin\` ou ${opts.MAXT} s de jeu. Blocage = ni l'état, ni le temps de jeu, ni la garde de l'état (\`finT\`), ni \`S.vol.reste\` ne changent pendant 10 s simulées.`, '');
    L.push('| Pilote | Graine | Arrêt | Jeu s | Vague | Score | Morts | Cartes prises | Erreurs | Appels de `__PILOT` = pas de `update` |', '|---|---:|---|---:|---:|---:|---|---|---:|---|');
    for (const r of S.pilote) {
      const egal = Object.keys(r.maj).every(e => (r.appels[e] || 0) === r.maj[e]);
      L.push(`| ${r.pilote} | ${r.graine} | ${r.raison} | ${f1(r.tempsJeu)} | ${r.vague} | ${r.score} | ${r.morts.join(', ') || '—'} | ${r.cartesPrises.join(', ') || '—'} | ${r.err} | ${egal ? 'oui, dans ' + Object.keys(r.maj).length + ' états' : 'NON'} |`);
    }
    L.push('');
    const vus = new Set(); for (const r of S.pilote) Object.keys(r.maj).forEach(e => vus.add(e));
    L.push(`États traversés par ces parties : ${[...vus].join(', ')}.`, '');
  }

  if (S.console) {
    const r = S.console;
    L.push('## 4. La vraie boucle d\'images, au doigt, sans pilote', '');
    L.push(`20 s en temps réel (\`requestAnimationFrame\` actif, souris qui tourne dans l'arène) : états vus ${r.etatsVus.join(', ')} ; \`__ERR.count\` = ${r.err} ; messages d'erreur de la console : ${r.erreursConsole.length} ; appels de \`__PILOT\` = pas de \`update\` dans ${Object.keys(r.maj).length} états.`, '');
  }

  L.push(...fs.readFileSync(path.join(HERE, 'reste.md'), 'utf8').trimEnd().split('\n'), '');
  fs.writeFileSync(path.join(HERE, 'rapport.md'), L.join('\n'));
}

/* relance seule : node tools/I/rapport-ecrire.mjs (réécrit le rapport depuis sortie.json, sans rejouer le banc) */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sortie = JSON.parse(fs.readFileSync(path.join(HERE, 'sortie.json'), 'utf8'));
  const n = sortie.sections.pilote ? new Set(sortie.sections.pilote.map(r => r.graine)).size : 0;
  ecrireRapport(sortie, { NB_GRAINES: n, MAXT: 540 });
}

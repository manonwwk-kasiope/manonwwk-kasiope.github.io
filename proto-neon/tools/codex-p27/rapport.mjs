import fs from 'node:fs';import {ICI}from './vm.mjs';
const read=f=>JSON.parse(fs.readFileSync(ICI+'/'+f+'.json')),v=read('validation'),a=read('vagues-avant').cas,b=read('vagues-apres').cas;
const date=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(' ', ' · ').replace(':',' h ');
const lignes=['tique','voleur','miroir','brouilleur'].map(type=>'| '+type+' | '+['paysage','portrait','bureau'].map(p=>a.find(c=>c.profil===p&&c.type===type).R13.maxParSeconde+' → '+b.find(c=>c.profil===p&&c.type===type).R13.maxParSeconde).join(' | ')+' |');
const texte=`${date} (Paris), mis à jour à ${date.split(' · ').at(-1)}.

# codex-p27b — un seul système de serpents

Commande exacte à exécuter **hors bac**, depuis cette copie, avant intégration des raccords :
\`\`\`sh
cd /Users/manonwojciechowski/Projets/wt-snake/codex-p27b/proto-neon
node build.mjs
node tools/codex-p27/verifier.mjs --raccords
\`\`\`
Après intégration réelle des deux raccords, omettre \`--raccords\`. Le script utilise un port libre, un seul Chromium muet, les trois profils successifs, les vrais tampons, captures PNG, journaux et bancs existants. Aucune connexion extérieure n'est permise par ses contextes. Il est vérifié syntaxiquement et **n'a pas été exécuté dans ce bac** : serveur local et Chromium interdits. Chromium émulant un iPhone ne remplace pas la qualification Safari réelle.

**Lot arrêté avant validation globale : R-13 échoue sur le rendu complet.** Les raccords 03/76 et le reçu navigateur restent aussi indispensables. Le chantier SNAKE n'est pas annoncé achevé.

## Réalisation

La seule implémentation de jeu conservée est celle du cloud : TIQUE, VOLEUR, MIROIR et BROUILLEUR dans \`72-ennemis.js\`, naissances et calendrier dans \`72-serpents.js\`. Aucun des quatre comportements concurrents de p27 n'est recopié. De p27 sont repris l'instrument VM calibré, la méthode des cas construits et la protection du préavis.

Les noms intégrés, le frein de TIQUE ×0,75, sa morsure d'un segment, le VOLEUR qui empoche et rend une grosse cellule, sa pénalité BUTIN VOLÉ de 40 points par objet, le MIROIR retardé et sa face blindée, le BROUILLEUR qui coupe les armes et se détruit à la tête sont conservés. Les parcours, films, époques et fins de l'aventure sont inchangés dans les deux bancs VM avant/après. Les trajectoires de combat ne sont pas prétendues identiques après ajout des protections demandées.

- Chiffres cloud et calendrier transférés dans **N.R.serpents**, avant le gel profond ; pas de second calendrier directeur.
- Portail minimal de 0,9 s, placement hors vue réutilisant le raccord intégré. Une création manuelle sans option de portail passe également par celui-ci.
- Nouvelle annonce visible continue de 0,8 s avant toute interaction ; approche inoffensive, ring dans le vrai rendu et publication dans S.tele. Perte de visibilité ou INVERSION : reprise du préavis entier.
- Morsure TIQUE : préavis 0,9 s conservé. Arrachement VOLEUR : 0,6 → 0,8 s. Une queue sortie du cadre annule l'annonce ; elle doit être revue entièrement avant la coupe.
- Suppression du glitch d'écran répété du BROUILLEUR ; champ local, absorption des tirs, icône et sons conservés. TIQUE sonnée limitée à deux cycles de clignotement/s ; ligne de fuite du VOLEUR toujours visible.
- \`raccord-76-directeur.patch\` : un seul appel à \`N.serpents.pasPartie(dt, cap)\`, sous les gardes du directeur. En aventure, cet appel rend la main immédiatement. En partie, même plan, deux serpents simultanés au plus, comptés dans le plafond ordinaire ; plafond dur réutilisé. Hors raccord, aucun serpent ajouté aux pilotes.

## Mesures exécutées sans DOM

Instrument : \`vm.createContext(vm.constants.DONT_CONTEXTIFY)\`, une fermeture commune dans l'ordre de build.mjs, \`NATIVE=1\`. Calibration sur les vraies sources récupérées par \`git show e1bdc6f:…\` : **10/10 parties historiques exactes** (temps jeu/combat/simulé, vague, score), zéro erreur. Source : calibrer.json. Ce contrôle ne qualifie pas le navigateur.

**80/80 parties témoins et 80/80 candidates finies ; 80/80 paires strictement identiques** : temps de jeu, temps de combat, temps simulé, vague, score et SHA-256 du journal réel complet ; zéro erreur. État reçu propre à cette copie, pas comparaison à l'ancienne difficulté e1bdc6f. Protocole demandé : stockage vierge, jour 20261017, actions du pilote, ouverture sautée, départ plongée, horloge initialisée une fois, simulation par tranches de 0,25 s, arrêt à fin ou borne 540 s. Aucune borne atteinte dans ce lot. Sources : avant.json, apres.json, parite.json.

La retouche finale ajoute seulement le contrôle du plafond dur dans la branche pasPartie non appelée sans raccord, plus un commentaire. **Réutilisation explicite**, sans prétendre une nouvelle exécution des 80 parties : comparaison textuelle exacte et absence de l'appel dans 76 non raccordé vérifiées dans reutilisation-parties.json. La borne ajoutée a son cas réel dans bornes.json ; les 12 vagues raccordées sont rejouées sur la source finale.

| Contrôle | État reçu / avant | Candidat / après | Preuve |
|---|---|---|---|
| Annonce initiale des quatre types, trois formats | pas de garde commune | 12/12 à 0,808333 s ; interruption puis reprise à 0,808333 s | scenes-apres.json |
| TIQUE, longueur réellement coupée | 1 segment après 0,908333 s | idem, trois formats | morsures-avant/apres.json |
| VOLEUR, longueur réellement coupée | 2 segments après 0,600000 s | 2 segments après 0,808333 s, trois formats | morsures-avant/apres.json |
| R-06, vagues forcées (12 × 60 s par état) | 0 apparition en vue, 0 armement hors vue | idem ; journaux non vides | vagues-avant/apres.json |
| Palette isolée | non revendiquée sur le témoin | 12/12 : zéro hors palette et zéro cyan, rendu non vide | scenes-apres.json |
| R-13 isolé, 720 images par type/format à 60 Hz | non revendiqué | 12/12 : 0 flash dépassant 6,6 % de l'écran | scenes-apres.json |
| Banc cloud de comportements | premiers essais instables / schémas manquants | **114/114 assertions VM**, 0 erreur, deux raccords en mémoire | cloud-apres-raccords.json |
| Module aventure et voyage dans le jeu | six parcours ELLE/LUI par banc | sorties, films, étapes, profil et erreurs strictement identiques | aventure-avant/apres.json ; voyages-avant/apres.json |
| Gardes du planificateur | — | 6/6 : plafond, plafond dur, inversion, respiration, pause, reprise et comptage | bornes.json |

Les cas de palette isolés exécutent les sources et les animations réelles. Directeur, tirs et pose de la joueuse sont contrôlés ; la pose de l'ennemi est ramenée dans le cadre après chaque pas pour ne pas compter du vide. Ils ne remplacent pas une partie. Les coupes réelles sont mesurées séparément, et les vagues complètes conservent tous les modules actifs.

Le banc cloud est rendu reproductible pour le VOLEUR : tirs suspendus pendant vol/fuite, rétablis avant le test de mort au canon ; tête et caméra maintenues pendant les cas de collecte/arrachement, minuteurs de joueuse conservés. Les cellules sont déposées une par une pour éviter la fusion de trois cellules en un objet. L'attente de mise en place attend maintenant la fin de l'annonce initiale (borne 14 s, comme les autres approches du banc) ; les assertions de vol, pénalité, coupe, canon et LASSO ne sont pas abaissées. Les essais successifs ont réellement échoué sur 7, puis 5, puis 3 et 1 assertions de cette mise en place ; logs cloud-* conservés. Le dernier banc conserve les assertions et passe. Commande VM : \`NATIVE=1 node tools/serpents/banc.mjs --statique --raccords\`. Ce verdict concerne les assertions en VM, **pas l'exécution Playwright du banc**.

## R-13 global : échec publié, seuil inchangé

Même critère conservateur que tools/mesure/criteres/R-13 : paires de transitions opposées de luminance/rouge, aire > 6,6 %, fenêtre glissante d'une seconde, limite ≤3. Transitions brutes conservées. Le recouvrement spatial des variations n'est pas établi par ce compteur agrégé.

Chaque scène force une vague et crée le type indiqué par l'interface publique ; après, le planificateur raccordé peut aussi produire les autres types prévus. Graine 7, pilote tourneur, invulnérable, 3 600 images réelles du tampon par scène. Les états avant/après divergent avec les ennemis supplémentaires : ces chiffres **ne prouvent pas une cause ou un gain imputable à un type**.

| Scène construite | Paysage avant → après | Portrait avant → après | Bureau avant → après |
|---|---:|---:|---:|
${lignes.join('\n')}

Ablation sur la candidate finale, vague 4 paysage : **8 flashs/s complet, 7 sans dessiner les serpents**, SHA-256 du journal identique ; preuve ablation.json. Le rendu restant dépasse donc à lui seul la limite. Le composant exact n'est pas isolé ; cette ablation n'exonère pas toute contribution des serpents (8 contre 7). Aucun seuil modifié ni décor retiré en production. Au plus deux serpents vivants observés dans chaque scène raccordée ; le maximum total observé est 37, sous le plafond dur existant de 40.

## Intégration et reste indispensable

1. **raccord-03-socle.patch** : noms NOMS/DE déjà intégrés, mais la liste figée L.ennemis omet encore les quatre types ; en validation stricte, apparition/arme/kill/coup/coupe sont rejetés. Le premier essai candidat sans raccord a effectivement compté 230 erreurs de schéma. Le patch étend uniquement la liste, d'où dérivent aussi les auteurs et sources ; aucun validateur désactivé. À appliquer par la propriétaire du socle.
2. **raccord-76-directeur.patch** : à appliquer après codex-11. Les deux patchs passent \`git apply --check\` sur l'état reçu/final ; aucun fichier réservé modifié directement.
3. Rendre R-13 global conforme avec les propriétaires du rendu, puis relancer le banc de pixels complet. Dépendance écrite dans demandes.md.
4. Exécuter verifier.mjs hors bac, relire PNG, tampons et journaux, garder verts les bancs Playwright serpents/aventure/voyage qu'il enchaîne. Vérifier Safari iPhone paysage/portrait et bureau. Les adaptateurs de chemins restent dans tools/codex-p27/hors-bac ; les sources aventure/voyage ne sont pas modifiées.

Build final : **sortie 0**, 39 modules ; node --check des scripts et git diff --check sans erreur. Aucun commit, aucune connexion sortante, aucun serveur ni navigateur lancé ici. Fichiers source touchés : 02-regles.js (ajouts seulement), 72-ennemis.js (serpents seulement), 72-serpents.js ; index.html reconstruit. Le banc serpents, cette section demandes et tools/codex-p27 sont dans la réservation.

Bundle non raccordé SHA-256 : \`${v.bundleSha256}\`.
Sources finales SHA-256 : \`${v.sourcesFinalesSha256}\`.
Synthèse machine : validation.json ; point de reprise : reprise.json.
`;
fs.writeFileSync(ICI+'/rapport.md',texte);
fs.writeFileSync(ICI+'/reprise.json',JSON.stringify({dateParis:date,objectif:'Un seul système cloud de serpents, aventure et partie',statut:'Lot arrêté avant validation globale',preuves:{calibration:10,parite:80,cloudVM:114,scenes:12,voyages:'identiques',R13:'échec global 13/s au maximum, isolé 0/s'},tachesEngagees:[],budget:'Aucun achat ; calcul local uniquement',reste:['Intégrer patch 03','Intégrer patch 76 après codex-11','Corriger R-13 global avec les propriétaires','Exécuter verifier.mjs --raccords hors bac et relire les captures','Valider Safari réel'],prochaineAction:'Résoudre R-13 avec les transitions brutes et l’ablation ; ne pas rejouer les 80 parties non raccordées sans changement de leur logique.'},null,2));

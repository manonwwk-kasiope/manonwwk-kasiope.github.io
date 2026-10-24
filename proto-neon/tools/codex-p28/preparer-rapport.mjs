import fs from 'node:fs';import assert from 'node:assert/strict';import {dateParis} from '../mesure/commun.mjs';
const lire=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url)));const comp=lire('composition.json').cas,r18=lire('r18.json').cas,fin=lire('fin.json').cas,cal=lire('calibration.json').cas,parties=lire('comparaison.json'),integrite=lire('integrite.json'),reuse=lire('reutilisation-parties.json');
assert.equal(cal.filter(c=>c.identique).length,10);assert.equal(comp.filter(c=>c.phase==='apres'&&c.ok).length,36);assert.equal(fin.length,39);assert.ok(fin.every(c=>c.p.ok));assert.equal(parties.identiques,80);assert.ok(reuse.candidatExact&&reuse.horsDessinIdentique);assert.ok(r18.filter(c=>c.phase==='apres').every(c=>c.ok&&c.pixels.ok));
const maintenant=dateParis();
const texte=`${maintenant} (Paris)

Commande hors bac : \`cd /Users/manonwojciechowski/Projets/wt-snake/codex-p24/proto-neon && node tools/codex-p28/verifier.mjs\`

# codex-p28 — contenu de fin R-18 restauré

**Livraison locale vérifiée en VM. Validation navigateur à vérifier hors bac.** Le script Playwright est complet et syntaxiquement valide ; il n'a pas été exécuté. Aucun serveur, Chromium, réseau sortant ni commit dans ce lot. Les images \`tampon-vm/\` sont les pixels du vrai tampon agrandis sans DOM ; ce ne sont pas des captures navigateur. Les trois rendus R-18 finaux ont été inspectés visuellement. Aucun verdict Safari physique.

La fin principale affiche de nouveau CONTINUER ?, le quartier (LES DOCKS), la progression, le build (TIREUSE), le record, le conseil, l'écart lorsqu'une partie précédente existe, ainsi que score, note, défis, énergie et prochain palier. Les défis gardent marque/nom/compteur alignés. En portrait, les blocs restent regroupés et les actions sont empilées ; aucune police réduite sous l'échelle entière 2. La note rejoint le titre. Les causes trop larges pour une colonne utilisent la largeur du panneau. Le conseil utilise la largeur disponible en bas ; sa phrase source complète fournit effectivement les glyphes des lignes repliées, sans appel de texte factice pour satisfaire R-18.

La garde et les règles de continuation restent celles reçues. Décompte 9 → 0, expiration, aucune continuation après victoire, REJOUER par défaut à Entrée, rejet d'un doigt commencé pendant la garde, et CONTINUER depuis le bilan détaillé ont été vérifiés. La pagination du bilan détaillé reste dans sa zone et s'arrête avant le premier bouton empilé. Les cibles mesurées sont toutes au moins 44 pt. Le calcul de composition tient compte des pixels d'accent situés au-dessus des capitales.

## R-18 : seuils inchangés, sources historiques complètes

La vraie fonction \`mesurer\` de \`tools/mesure/criteres/R-18-ecran-de-fin.mjs\` est importée sans modification. L'adaptateur VM remplace uniquement la session navigateur : la scène de debug, les mises à jour, le dessin, le tampon et le journal viennent des vraies sources, assemblées dans l'ordre de build.mjs. Les images sont avancées par pas de 1/60 s. Les hooks d'appels du critère sont complétés par une vérification indépendante des pixels finaux de chaque glyphe (présent en entier, pas seulement un compteur), des collisions et de la zone sûre. Les trois profils sont 844 × 390 tactile, 390 × 844 tactile et 1440 × 900.

| État des sources | Paysage | Portrait | Bureau |
|---|---:|---:|---:|
| 8f55a91, avant p17 | 12/12 | 12/12 | 12/12 |
| 318ce61, p17 | 6/12 | 6/12 | 5/12 |
| État p24 reçu, non commité | 6/12 | 6/12 | 5/12 |
| Après p28 | **12/12** | **12/12** | **12/12** |

Source : \`r18.json\`, \`r18.log\`, script \`r18.mjs\`. Le cas bureau p17 perd aussi la correspondance de cause parce qu'elle est coupée en plusieurs appels ; cette valeur réelle est conservée. Le 12/12 historique reproduit le critère de contenu, pas une nouvelle qualification de sa géométrie : notre contrôle supplémentaire des pixels/géométrie est faux sur les anciens états. Après p28, le critère ET le contrôle supplémentaire sont vrais sur chaque profil, zéro erreur. Les reçus externes initiaux restent dans batterie-8f55a91 et batterie-318ce61, non modifiés.

## Non-régressions et preuves

| Contrôle | Résultat final | Reçu |
|---|---|---|
| Calibration VM sur e1bdc6f, inerte, dix graines | 10/10 exactes sur temps jeu/combat, vague, score | calibration.json |
| Matrice p17 : trois profils × briefing/pause/fin × quatre stades | 36/36 avant ; 36/36 après ; compteurs alignés, textes dans la zone, barres sûres, palette fermée, aucun cyan du composant | composition.json |
| Glyphes des douze compositions de fin après | Tous intacts, y compris accents, sans collision | composition.json, glyphes |
| Briefing et pause p24 | 24/24 compositions strictement identiques avant/après (lignes et barres) | integrite.json |
| Décompte, expiration, victoire et écart non nul | 39/39 fins vérifiées sur leurs pixels et leur état ; bilan détaillé et entrées vérifiés en plus | fin.json, fin.log, fin.mjs |
| Causes/auteurs/défis/score et temps extrêmes de p17 | Aucun cas hors zone | variantes.json |
| Huit pilotes × dix graines, état reçu contre candidat | **80/80 identiques** : temps jeu/combat, vague, score, erreurs et SHA-256 du journal réel | comparaison.json, avant.json, apres.json |
| Construction | node build.mjs, sortie 0 ; toutes les sources finales présentes dans index.html | build.log, integrite.json |
| Playwright | Script trois profils prêt, contrôle de syntaxe sorti 0 ; non exécuté | verifier.mjs |

Les parties utilisent le protocole officiel : stockage vierge, jour 20261017, réglage actions par pilote, intro.skip(), reset avec départ plongée, correction du seul démarrage si nécessaire, pilote public, journal actif, horloge initialisée puis simuler(0.25) jusqu'à fin. Les écarts à l'ancien e1bdc6f hors calibration ne servent pas au verdict ; la comparaison porte bien sur l'état reçu.

Les dernières corrections ont modifié seulement finResumeModele (dessin) et la borne tactile de pagination du bilan final. Le candidat réellement chargé au départ des 80 parties est reconstitué exactement : SHA-256 ${reuse.attendu}. Son hash correspond au reçu apres.json. Le reste des sources est strictement identique, et les deux zones exclues de la comparaison textuelle ne sont pas exécutées par ce protocole, qui ne dessine pas et s'arrête à l'arrivée en fin, avant les entrées du bilan. Les reçus sont réutilisés sans rejouer les parties déjà identiques ; les contrôles de rendu et des entrées finales ont été rejoués. Voir reutilisation-parties.json et reutilisation.mjs.

## Périmètre et nombres

Seuls 80-ecrans.js, cette section de demandes.md et tools/codex-p28/ sont modifiés par p28, plus index.html reconstruit comme demandé. Parmi les modules, seul 80-ecrans.js diffère de la réception (integrite.json). Les changements p24 déjà présents, son critère R-19 et son raccord 79 encore non intégré sont conservés ; aucun de ces travaux n'est attribué à p28.

Aucune nouvelle constante numérique de jeu. Échelle, hauteurs, marges, espaces, cibles et décompte réemploient les valeurs existantes de N.R ; les largeurs et hauteurs restantes sont calculées depuis la zone sûre et les pixels des vrais glyphes. 02-regles.js est inchangé par p28. La raison figure dans la section codex-p28 de demandes.md. Empreinte du bundle final : ${integrite.bundleSha256}.

## Essais intermédiaires et limites conservés

- Première composition enrichie : 720 variantes paysage hors zone ; après répartition des blocs, zéro. variantes.log et variantes.json portent le résultat final.
- Composition intermédiaire avec note déplacée : 32/36 ; collision STYLES +170 / conseil. Après calcul des hauteurs et des accents : 36/36. Une passe plus stricte a ensuite trouvé 35/36 (quatre pixels de ÉNERGIE 849 écrasés au palier terminal) ; corrigé en mesurant l'étendue des glyphes. Reçus intermédiaires composition-intermediaire-*.json conservés.
- R-18 intermédiaire : 12/12 paysage, 11/12 portrait (conseil replié) et 11/12 bureau (cause repliée). Après dessin depuis la phrase complète et mesure des vrais pixels : 12/12 sur les trois profils. r18-intermediaire-mots-coupes.json conservé.
- Décompte échantillonné exactement à une frontière flottante : valeur 2 au lieu de 1 ; le test vérifie désormais le milieu de chaque seconde (9 → 0), sans modifier la formule ni les durées du jeu. fin-erreur-frontiere-flottante.log conservé.
- Adaptateur initial sans ui.draw explicite : 1/12 sur les anciens états, corrigé pour suivre la boucle publique de dessin du boot. Deux erreurs de sonde (noms de quartiers à plat ; absence de cible bilan dans l'ancien état), une sonde de pages lisant le modèle entre deux dessins et une erreur de syntaxe du script de réutilisation sont conservées dans les logs nommés erreur. Aucun de ces essais ne vaut un résultat du navigateur.

**Reste :** lancer la commande en tête hors du bac, relire les captures de défaite/victoire/décompte/portrait et les compositions p17/p24, puis vérifier Safari réel. Le script utilise un seul Chromium muet ; il enregistre les tampons, journaux, erreurs, captures et le vrai R-18 pour chaque format. Livraison du lot terminée ; le palier navigateur n'est pas déclaré validé.
`;
fs.writeFileSync(new URL('rapport.md',import.meta.url),texte);console.log(maintenant);

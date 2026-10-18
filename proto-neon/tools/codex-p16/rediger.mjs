import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const lire=n=>fs.existsSync(path.join(here,n))?JSON.parse(fs.readFileSync(path.join(here,n))):null;
const date=new Date(),tz={timeZone:'Europe/Paris'};
const now=date.toLocaleDateString('fr-FR',tz)+' · '+date.toLocaleTimeString('fr-FR',{...tz,hour:'2-digit',minute:'2-digit'}).replace(':',' h ');
const profil=lire('profil-vm-avant.json'),apparie=lire('appariement-vm.json'),raccord=lire('raccord-vm.json');
const avant=lire('parties-avant.json'),apres=lire('parties-apres.json'),comparaison=lire('comparaison80.json')||lire('comparaison-partielle.json');
const r30=lire('rejouabilite-vm.json'),r30r=lire('rejouabilite-raccord-vm.json');
const volSoutenu=lire('vol-soutenu-vm.json');
const fmt=x=>typeof x==='number'?x.toFixed(3).replace('.',','):'à vérifier';
const tableau=(apparie?.cas||[]).map(r=>`| ${r.profil} | ${r.scene} | ${r.images} | ${r.octetsDifferents} | ${r.logiqueIdentique} | ${fmt(r.coutsVM.avant.p95)} | ${fmt(r.coutsVM.apres.p95)} |`).join('\n');
const classement=profil?.profils.map(r=>`- **${r.scene}** : ${r.classement.filter(c=>!c.module.startsWith('step/')).slice(0,4).map(c=>c.module+' '+fmt(c.total/600)+' ms/image (p95 '+fmt(c.p95)+' ms/appel)').join(' ; ')}.`).join('\n');
const fichiers=['02-regles.js','10-gfx.js','20-crt.js','78-hud.js'].map(n=>{const p=path.join(here,'../../src',n);return n+' `'+crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')+'`';}).join('\n\n');
fs.writeFileSync(path.join(here,'rapport.md'),`# codex-p16 — R-20 / R-30

${now} (Paris), mis à jour à ${now}.

Commande hors bac, depuis la racine du dépôt :


\`node proto-neon/tools/codex-p16/verifier.mjs\`

Pour tester aussi les raccords réservés, en mémoire et sans modifier les sources : \`node proto-neon/tools/codex-p16/verifier.mjs --raccords\`.

**Lot non validé.** Aucun serveur ni Chromium essayé dans ce bac. R-20 strictement meilleur que 2030, CRT, sortie Canvas et Safari restent à vérifier hors bac. Aucun commit.

## Livré et portée

- \`10-gfx.js\` : une décision Bayer par sous-colonne puis écritures espacées ; couronne décomposée en intervalles entiers plutôt que parcours du trou. Phase écran, arrondis, découpage et masque conservés.
- \`78-hud.js\` : réserve réutilisée et copie opaque des rangées de bannière ; dissolution existante conservée. L'index zéro reste opaque. Aucun rythme, aucune collision, aucune palette changés.
- \`20-crt.js\` reste intact : son coût réel n'est pas mesurable sans Canvas dans ce bac. Le profiler navigateur mesure explicitement son step ; aucune cause CRT supposée n'est présentée comme prouvée.
- R-20 : numérateur \`horloge.reel()\`, somme des pas fixes réellement exécutés, au lieu de \`t()\`, somme des dtMonde ralentis. L'ancien ratio reste publié en métadonnée ; seuil **0,99 inchangé**. Un vrai retard CPU reste une perte.
- R-30 : \`hudBanniere\` et les décisions du limiteur \`flash\` sont exclus seulement de la comparaison entre modes. Deux parties dessinées doivent encore reproduire ces traces. Aucun événement de jeu supprimé du comparateur.

Les chiffres ajoutés vivent dans \`N.R.perf.imageP16\` : Bayer 4 (géométrie existante), 600 images de preuve par scène/profil, 120 images d'échauffement du banc. Aucune valeur de gameplay ajoutée.

## Référence et logique

\`calibration.json\` : dix références e1bdc6f exactement reproduites (inerte, tourneur, maladroit, kamikaze, humain ; graines 1–2), temps de jeu, vague, score, fin, erreurs. La calibration porte sur ces sorties, pas sur une promesse d'égalité bit à bit de tous les journaux historiques.

Point de reprise : avant **${avant?.cas.length||0}/80** parties enregistrées ; après **${apres?.cas.length||0}/80** ; comparaison stricte **${comparaison?.identiques??'à vérifier'}/${comparaison?.total??80}**, journal SHA-256 complet compris. Protocole officiel, localStorage vide, jour 20261017, actions, plongee, pilote, amorçage avancer(), tranches de 0,25 s jusqu'à fin ou borne officielle (540 s de jeu, garde à 2160 s de pas, stagnation 10 s). Les résultats antérieurs e1bdc6f ne servent pas de référence avant/après de ce lot. \`parties80.mjs\` reprend uniquement les reçus finis déjà calculés, sans rejouer les parties validées. Les 71 premiers reçus après sont réutilisés par \`terminer-parties.mjs\` ; les neuf derniers sont exécutés dans deux workers Node isolés, même VM et même protocole. Hash de sources obligatoire avant réemploi, écritures atomiques des reçus. Le second Mac n'a pas pu être joint : résolution de MacBook-Air-de-Manon.local impossible, SSH sortie 255 (\`seconde-machine.txt\`). Aucun calcul distant effectué.

\`primitives.json\` : ${lire('primitives.json')?.cas||0} cas exacts, zéro octet ni masque différent ; trames aux frontières, NaN, origines, bornes, rayons inversés. Contrôle algorithmique sans DOM.

## Classement avant, vraie frame en VM

Enveloppes de chaque step de 90-boot et des méthodes publiques ; pas de réécriture du jeu. Classements inclusifs par coût total ; on ne somme pas parent et enfant. Les p95 des sous-modules sont par appel. Les coûts ci-dessous **ne sont pas des mesures navigateur** ; present/CRT n'ont pas de Canvas. Fichier : \`profil-vm-avant.json\`.

${classement||'À vérifier.'}

La fenêtre du scénario initialisé en VOL évolue naturellement : **257 images sur la branche vol.draw, puis 343 sur game.draw** dans le profil avant. Le coût p95 du seul step vol.draw vaut **3,505 ms VM**, pour ses appels effectivement observés ; la fenêtre complète ne vaut pas une mesure de 600 images toutes en VOL. Les états et les nombres d'appels sont conservés, sans neutraliser la transition du jeu. Le banc navigateur enregistre aussi l'état réel après chaque image.

Complément strict \`vol-soutenu-vm.json\` : **${volSoutenu?.cas.map(r=>r.imagesVol).join('/')??'à vérifier'} images dans l'état VOL** sur paysage/portrait/bureau, ${volSoutenu?.cas.reduce((n,r)=>n+r.octetsDifferents,0)??'à vérifier'} octet différent ; deux réarmements publics de la fixture par profil, et 242 images d'entrée/transition également contrôlées par profil. État et journal finaux identiques, zéro erreur. Le banc navigateur contient le même complément pour les index et les RGBA.

Essai conservé en échec : \`vol-soutenu-echec-vm.json\`, **0/600** images VOL sur chaque format (code de sortie 1). Le premier banc réarmait dès l'interlude d'entrée, empêchant le VOL de commencer. Le banc corrigé attend désormais le premier état VOL, puis le retour naturel avant de réarmer ; aucun seuil réduit ni changement au jeu.

## Images et coût appariés sans DOM

Les vraies sorties du tampon d'index sont comparées octet par octet à chaque image. État, horloge et journal complet comparés en fin de scène. Ce complément VM ne qualifie ni les couleurs du CRT ni le coût iPhone. Les premières séries séquentielles ont régressé : p95 charge **10,767 → 12,307 ms VM** (\`profil-vm-avant.json\`, \`profil-vm-apres.json\`, candidat intermédiaire). Aucun gain global ni seuil R-20 validé n'en est déduit.

| Profil | Scène | Images | Octets différents | Logique identique | p95 VM avant ms | p95 VM après ms |
|---|---|---:|---:|---|---:|---:|
${tableau}

## R-20 et R-30 : preuves et raccords

Reçus de départ : \`~/Projets/wt-snake/recus/batterie-8f55a91/R-20.json\` : charge **4,5 ms contre 0,8 ms**, ratio ×4 **0,98479**. Ces échecs restent les derniers résultats navigateur connus.

Scène calme réelle sans ralenti en VM : ${r30?.temoinSansRalenti?.ralentis??'à vérifier'} pas ralentis ; ancien ratio **${r30?.temoinSansRalenti?.ratios?.ancien??'à vérifier'}**, nouveau **${r30?.temoinSansRalenti?.ratios?.machine??'à vérifier'}**, ${r30?.temoinSansRalenti?.ratios?.pasTraites??'à vérifier'} pas. Le temps mural est ici le temps injecté par le banc, donc ce témoin vérifie la formule, pas la vitesse du Mac. Contrôles négatifs dans \`instrument-statique.json\` : un ralenti laisse machine=1, une perte de pas donne 0,9 et échoue toujours à 0,99 ; un kill changé ou manquant reste refusé.

R-30 sur les sources reçues : le diagnostic VM à 15 s conserve une divergence de jeu après retrait des seules traces visuelles. La caméra avance avant le pas de jeu en dessiné, après le pas en simulé (\`79-jeu.js:530,843\`). Le premier désaccord de pilotage est publié dans \`rejouabilite-vm.json\`, avec le kill absent et les morts différentes ; ne pas l'effacer par filtrage.

\`raccord-79-jeu.js.patch\` fait avancer la caméra une fois au même endroit, via update(), et supprime son second site dans simuler(). Testé seulement en copie VM : égalité de jeu **${r30r?.apresFiltrage?.egaux??'à vérifier'}**, longueurs **${r30r?.apresFiltrage?.longueurs?.join('/')??'à vérifier'}** ; dessiné répété **${r30r?.dessineRepete?.egaux??'à vérifier'}**, traces visuelles comprises. Ce raccord n'est PAS appliqué au jeu livré ; il modifie la simulation et nécessite sa revue/integration séparée, puis R-30 navigateur complet (60 s).

\`raccord-15-decor.js.patch\` déroule les quatre sous-colonnes de taireFondJeu et résout leurs tables une fois par rangée. Test en copie : ${raccord?.cas.length??0}/12 scènes/profils, ${raccord?.cas.reduce((n,r)=>n+r.octetsDifferents,0)??'à vérifier'} octet différent ; coûts détaillés dans \`raccord-vm.json\`. Il reste réservé à codex-p13, non appliqué.

## Hors bac et reste

\`verifier.mjs\` sert les bundles avant/après sur port libre, lance **un Chromium muet**, puis les trois profils en série. Il compare **chaque octet d'index ET de RGBA après CRT** sur 600 images × quatre scènes × trois profils, conserve erreurs, état, journal, captures et classement de chaque step/module. Les deux versions vivent dans deux iframes du même Chromium ; les panneaux fixes sont utilisés pour isoler le rendu déterministe des horloges murales vidéo. Les coûts diagnostiques sont séparés du vrai critère non enveloppé. R-20 (dont 2030 et ×4) et R-30 sont relancés en série sur les deux versions, sans cache. L'option --raccords ne change que la version après en mémoire.

Les reçus des deux commandes sont séparés : \`navigateur/\` et \`navigateur-raccords/\`. Le code de sortie du banc reste 1 si un critère échoue, y compris sur la version **avant**, dont les échecs sont attendus et conservés : lire les fichiers avant-R-20 / apres-R-20 et avant-R-30 / apres-R-30 séparément. Le build reste un contrôle distinct, sortie 0 obligatoire et obtenue.

${comparaison?.identiques===80?'La comparaison des 80 parties est terminée, les workers ont fini sans erreur.':'La comparaison des 80 parties reste en cours.'} À faire : recevoir le reçu navigateur ; mesurer le classement Canvas/CRT ; choisir les optimisations supplémentaires sur ce profil ; vérifier zéro pixel changé sur la sortie finale ; intégrer/revoir les raccords ; obtenir les seuils R-20/R-30 inchangés. Un gain VM local n'établit pas snake2975 < snake2030. Safari iPhone réel reste distinct de Chromium émulé. **Chantier bloqué pour cette validation hors bac ; aucun gain R-20 global annoncé.**

Build : \`cd proto-neon && node build.mjs\`, sortie 0 (\`build.log\`). Retour arrière : changements non committés, sources initiales intégrales dans \`sources-avant.json\`, bundle initial dans \`avant.html\`. Aucun fichier réservé modifié.

Empreintes de la candidate au moment de cette publication :

${fichiers}
`);

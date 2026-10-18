import fs from 'node:fs';
const ici=new URL('./',import.meta.url),lire=n=>JSON.parse(fs.readFileSync(new URL(n,ici))),ecrire=(n,x)=>fs.writeFileSync(new URL(n,ici),x);
const maintenant=new Date(),heure=maintenant.toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).replace(':',' h '),date=maintenant.toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'})+' · '+heure,j=lire('cas.json'),instrument=lire('instrument.json');
const comp=j.compositions.filter(c=>c.phase==='apres'),cal=lire('calibration.json');
const comparaison=fs.existsSync(new URL('comparaison.json',ici))?lire('comparaison.json'):null;
const lignes=instrument.map(r=>`| ${r.mode} | ${r.mesures[0].valeur??'null'} | ${r.mesures.filter(m=>m.ok).length}/${r.mesures.length} |`).join('\n');
ecrire('rapport.md',`Commande hors bac : \`cd proto-neon && node tools/codex-p24/verifier.mjs\`

# codex-p24 — attraction R-19 et briefing portrait

${date} (Paris) · mis à jour à ${heure}.

Code et contrôles VM livrés. **Chantier bloqué pour la validation finale** : le raccord du fichier partagé 79 doit être intégré par sa propriétaire, puis les contrôles Playwright lancés hors bac et les captures relues. Le script peut déjà prévisualiser ce raccord en mémoire, sans modifier le jeu. Aucune qualification Safari annoncée. Aucun commit ; aucun réseau sortant, serveur local ni Chromium lancé.

L'attraction jouée existait déjà dans l'état reçu. Le reçu externe batterie-8f55a91/R-19.json disait null après 25 s ; ce défaut précis n'est pas reproduit dans cette copie : arrivée à **15,008333 s** avant comme après (cas.json). Le nouveau critère utilise un départ titre explicite, puis vérifie l'état et les pixels peints, au lieu d'inférer un écran depuis ui.actif() (booléen) ou depuis des appels de texte. Le seuil **15 ± 1 s est inchangé**. Le titre conserve son chronomètre existant ; aucun faux départ d'attraction n'est injecté dans le critère.

Le modèle peint réutilise S.ecran.retour, champ déjà prévu par le contrat ; les quatre volets passent N.ids.valider('ecran', S.ecran), sans ajouter un champ au socle (modele.json).

Le raccord minimal 79 ouvre la présentation une seule fois ; son horloge survit aux reprises de la partie de démonstration. L'écran alterne DÉMO, galerie de quatre ennemis avec leurs sprites, records, invitation stable, sur les durées **20/6/5/4 s existantes**. La vraie partie reste pilotée par bon. Le premier geste rend le titre et désactive le pilote. La démo garde le silence global et les deux canaux ; leur état séparé est restauré au retour, y compris si musique et effets étaient réglés différemment. Les profils, acquisitions, records et stockage ne changent pas dans les cas mesurés. La VM n'initialise pas WebAudio : la preuve de silence porte sur les états publics global/canaux, sans mesure PCM.

Le briefing portrait groupe les blocs et centre l'ensemble ; chaque espace entre blocs réutilise les 8 pixels existants. Sur la fixture portrait « en cours » p17, les deux vides réels entre rectangles peints passent de **85/85 à 12/12 pixels du tampon**, soit 170/170 à 24/24 points CSS à PX=2. DÉPART AUTO reste visible, à l'échelle entière 2. Paysage et bureau conservent leurs colonnes ; la pause et la fin restent inchangées. Sources : espacement.json et cas.json. Les PNG avant/après sont des rendus du tampon VM sans DOM, pas des captures navigateur ; le portrait après a été inspecté visuellement.

| Contrôle VM | Résultat et preuve |
|---|---|
| Calibration historique e1bdc6f, 10 graines inerte | ${cal.cas.filter(c=>c.identique).length}/10 exactes : temps jeu/combat, vague, score ; calibration.json |
| Vraie fonction mesurer de R-19 sur horloge construite | ${instrument.find(r=>r.mode==='apres').mesures.filter(m=>m.ok).length}/7 mesures satisfaites après ; instrument.json |
| Contre-épreuves du chronomètre | absence : null refusé ; 13,05 s refusé ; 17,05 s refusé ; seuil conservé |
| Sortie démo | 7/7 entrées construites rendent le titre ; préférences asymétriques restaurées ; entrees.json |
| Présentation de la borne | quatre volets observés sur leurs pixels, vraie tête en déplacement, silence et profil conservé ; cas.json |
| Compositions p17 : 3 profils × briefing/pause/fin × 4 stades | ${comp.filter(c=>c.ok).length}/36 après, 36/36 avant ; textes peints, zone sûre, compteurs alignés, palette, cibles ≥44 pt, aucun cyan du composant ; cas.json |
| 8 pilotes × 10 graines, avant/après sur l'état reçu | ${comparaison?comparaison.identiques+'/80 strictement identiques, jusqu’au journal SHA-256 ; comparaison.json':'mesure en cours : ne pas conclure'} |
| Construction | node build.mjs, sortie 0 ; build.log |
| Navigateur | script complet et syntaxiquement valide ; **non exécuté** ; captures et Safari à vérifier |

La vraie fonction mesurer s'exécute inchangée dans un adaptateur VM : seules l'attente et l'horloge murale du banc sont simulées, par pas de 50 ms. Le jeu utilise ses vrais pas fixes et son vrai dessin. La mesure directe plus fine à 15,008333 s vient de pas de 1/120 s. Les contre-épreuves modifient le seuil dans une copie en mémoire, jamais dans les sources livrées.

| Cas construit de l'instrument | Arrivée mesurée s | Mesures satisfaites |
|---|---:|---:|
${lignes}

Fichiers réservés : seuls 80-ecrans.js, les ajouts de 02-regles.js, R-19-attraction.mjs, la section codex-p24 de demandes.md et ce dossier sont modifiés ; index.html est reconstruit conformément à la mission. 60-intro.js reste inchangé : le briefing concerné est celui de N.ui, pas la cinématique. 79-jeu.js et 90-boot.js restent intacts ; raccord-79-jeu.patch passe git apply --check. Le bundle reconstruit conserve donc encore le 79 reçu : la preuve VM après inclut le raccord candidat, pas une intégration déjà effectuée.

La comparaison des 80 parties porte sur le candidat avant le dernier déplacement du modèle de dessin, de S.ecran.attraction vers S.ecran.retour. reutilisation-parties.json exige que cette affectation soit l'unique différence dans 80-ecrans et que toutes les autres sources correspondent exactement aux empreintes des reçus. Ce chemin de dessin n'est pas appelé par le protocole de simulation. Les contrôles de l'instrument et du schéma final ont été rejoués, sans rejouer les parties déjà identiques.

Le vérifieur navigateur ouvre un seul Chromium muet et trois profils successifs. Il conserve 72 compositions avant/après de p17, les captures titre/briefing/fin/démo/galerie/records/invitation, les tampons et journaux, puis exécute la vraie batterie R-19 avant/après dans le même navigateur. Il vérifie aussi le premier toucher posé et son relâcher, la touche clavier, le stockage, les canaux muets et zéro erreur. Il ne prouve pas Safari physique.

Incidents du banc conservés : instrument-echec-initial.log, premier adaptateur VM sans sonde __MESURE ; le critère lit désormais directement N.game.etat et les contre-épreuves ont ensuite été rejouées. Un import de contrôle du vérifieur navigateur a été arrêté avant toute création de serveur par son garde-fou « reconstruire index.html » (la source 02 modifiée était absente du bundle alors ancien). Aucun message d'erreur n'avait été capturé par cet import ; une attribution à EPERM donnée dans la conversation était erronée et a été corrigée. modele-echec-realm.log conserve aussi une comparaison Node de tableaux vides entre deux VM : valeur reçue [], mais prototypes distincts ; le contrôle exprime maintenant exactement zéro erreur de schéma par schema.length === 0. Un garde-fou explicite interdit désormais l'import de ce script ; seule la vérification syntaxique est utilisée ici.

Reste indispensable : intégrer le petit raccord 79, reconstruire, lancer la commande en tête hors bac, relire les captures et tester Safari réel. Aucun seuil d'acceptation affaibli. Les nouvelles valeurs de présentation (sprite 32 pixels, trois records) figurent dans N.R et demandes.md ; aucune nouvelle valeur de combat ni de chronométrage.
`);
console.log('rapport actualisé',date,comparaison?.identiques??'parties en cours');

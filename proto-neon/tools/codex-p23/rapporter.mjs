import fs from 'node:fs';
import crypto from 'node:crypto';
import {sources} from './vm.mjs';
const H=new URL('./',import.meta.url),l=f=>JSON.parse(fs.readFileSync(new URL(f,H))),a=l('mesures-avant.json'),b=l('mesures-apres.json'),pa=l('parties-avant.json'),pb=l('parties-apres.json'),r=l('r28-cases.json'),g=l('lumiere-cases.json'),pr=l('parties-reduit.json');
if(pr.cas.length!==2||a.lisibilite.length!==21||b.lisibilite.length!==21||a.p13.length!==9||b.p13.length!==9||pa.cas.length!==80||pb.cas.length!==80)throw Error('Collecte incomplète : rapport final refusé');
const date=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace(' ', ' · ').replace(':',' h '),fmt=x=>(100*x).toFixed(3).replace('.',','),sourceHash=crypto.createHash('sha256').update(JSON.stringify(sources())).digest('hex');
const R28=r.cas.filter(x=>x.phase==='apres').map(x=>{const y=r.cas.find(y=>y.phase==='avant'&&y.profil===x.profil);return `| ${x.profil} | ${fmt(y.max)} | ${fmt(x.max)} | ${x.paires} | ${x.err.count} |`;}).join('\n');
const R11=b.r11.map(x=>{const y=a.r11.find(y=>y.profil===x.profil&&y.scene===x.scene);return `| ${x.profil} | ${x.scene} | ${fmt(y.analyse.decorLumineux)} | ${fmt(x.analyse.decorLumineux)} |`;}).join('\n');
const P13=b.p13.map(x=>{const y=a.p13.find(y=>y.profil===x.profil&&y.scene===x.scene);return `| ${x.profil} | ${x.scene} | ${y.max} | ${x.max} | ${fmt(x.solChaudMax)} | ${fmt(x.solLumMax)} |`;}).join('\n');
const samples=b.lisibilite.flatMap(x=>x.samples),lum=Math.max(...samples.map(x=>x.solLum)),hot=Math.max(...samples.map(x=>x.solChaud)),differences=pb.comparaison.filter(x=>x.differences.length);
const corps=`# codex-p23 — mouvement réduit et lumière du décor

${date} (Paris) — publication ; mis à jour à ${date.split(' · ')[1]}.

**Commande hors bac, depuis la racine du dépôt :**
\`node proto-neon/tools/codex-p23/verifier.mjs\`

**Livraison dans le périmètre autorisé ; chantier bloqué pour le verdict navigateur et la gaine du CYCLOPE hors fichiers possédés.** Aucun serveur local ni Chromium n'a été lancé ou essayé. Aucun commit. Les résultats ci-dessous sont les vrais états, journaux et pixels d'une VM sans DOM ; ils ne qualifient ni Safari réel, ni le CRT, ni les médias décodés, ni le coût d'image sur iPhone.

## Correction livrée

- \`50-fx.js\` : l'âge d'explosion tenait à dt=0 mais son allumage \`eIgn\` avançait à chaque mise à jour. Il tient désormais aussi pendant le gel en mouvement réduit. Le limiteur p10 et les effets en mouvement normal gardent leur comportement. La préférence système est relue et annule la secousse, même si son réglage manuel était à 1.
- \`12-cam.js\` : une poussée déjà engagée est annulée si mouvement réduit ou secousse zéro est activé. Le suivi nécessaire au jeu et les murs continuent à fonctionner.
- \`15-decor.js\` : un contre-jour froid acier éclaire les matières sombres du lointain par un Bayer fixe dans l'espace écran. Ni vide, ni nuit profonde ne sont comblés ; le sol ne reçoit pas cet éclairage. Ajout seul dans N.R : \`decorContrejour.rangs=4\`, \`rangsPortrait=8\`, \`encre='acier'\`. Justification dans la section codex-p23 de demandes.md.
- R-28 exige maintenant un kill réel au journal et frappe la cible au centre du tampon. R-11 conserve l'image ambiante pour la lumière et mesure une vraie flèche ajoutée si cette image n'a aucune menace. Seuls x/y publics sont repositionnés ; aucun champ privé n'est lu ni écrit. Tous les seuils sont conservés.

## Instrument et provenance

[calibration.json](calibration.json) : **10/10 parties e1bdc6f identiques**, temps de jeu/combat, vague, score, arrêt, erreurs et SHA-256 du journal complet, sans arrondi. La VM utilise \`vm.createContext(vm.constants.DONT_CONTEXTIFY)\`, les sources réelles dans l'ordre lexicographique du build et aucun DOM. Ce mode a été recalibré avant les résultats retenus. Les profils VM représentent les trois dimensions du tampon ; les entrées sans DOM gardent le repli tactile du banc p10. Le vrai profil bureau/clavier est réservé au script navigateur.

L'état reçu est conservé dans [avant/sources.json](avant/sources.json) et [avant/index.html](avant/index.html). Le bundle reçu contient exactement toutes ces sources (vérifié). La référence historique ne sert qu'à calibrer : la non-régression se juge sur l'état reçu.

Empreinte des sources finales ordonnées : \`${sourceHash}\`.
Empreinte du bundle final : \`${crypto.createHash('sha256').update(fs.readFileSync(new URL('../../index.html',H))).digest('hex')}\`.
Empreinte des sources du reçu après : \`${b.sourceSha256}\` ; parties après : \`${pb.sourceSha256}\`.

## R-28, images gelées réellement consécutives

[r28-cases.json](r28-cases.json), même fonction sonde VM/navigateur, mort de l'élite confirmée au journal. Préférence réduite active dès le chargement ; une cible est créée après la chauffe puis frappée au centre. Le gel doit offrir une paire consécutive, sinon l'essai échoue. Plafond inchangé **0,5 %**, secousse zéro, caméra ≤ 0,5 px entre deux images gelées.

| Profil | Avant, pixels changés % | Après % | Paires gelées après | Erreurs après |
|---|---:|---:|---:|---:|
${R28}

Le cas historique reçu (batterie 8f55a91) était à 23,974 %. Il n'est pas présenté comme notre avant : le bundle et la fixture ont évolué. Le cas conservant l'ancien placement hors champ est aussi publié dans mesures-avant/apres.json ; le cas dirigé ci-dessus a une cible et un kill identifiés.

[parties-reduit.json](parties-reduit.json) : ${pr.cas.filter(r=>r.raison==='fin'&&r.victoire&&!r.err).length}/2 parties dieu finies avec victoire réelle (N.score.resume().victoire, reçu complet conservé), mouvement réduit dès le chargement. Détails : ${pr.cas.map(r=>'graine '+r.graine+' : '+r.raison+', '+r.tempsJeu+' s, victoire '+r.victoire+', erreurs '+r.err).join(' ; ')}. Borne officielle 540 s inchangée. ${pr.ok?'Seuil satisfait en VM.':'ÉCHEC conservé : R-28 jeu complet non validé.'}

[cas-construits.json](cas-construits.json) : une poussée de 6 px engagée disparaît exactement lors de l'activation du mouvement réduit ; S.shake reste à zéro malgré le réglage FX manuel à 1. La position avant/après et les erreurs sont publiées, pas un compteur d'appels.

## R-11, décor seul lumineux code 8 / tampon complet

[mesures-avant.json](mesures-avant.json), [mesures-apres.json](mesures-apres.json) : même graine, même ordre de scènes, trois vraies images par scène. Luminance > 0,10, cible **18 à 28 %** inchangée.

| Profil | Scène | Avant % | Après % |
|---|---|---:|---:|
${R11}

[lumiere-cases.json](lumiere-cases.json) contient aussi les douze scènes indépendantes sur contexte neuf (même méthode que le vérifieur navigateur) : toutes dans la cible. Leurs valeurs ne sont pas mélangées avec le tableau séquentiel ci-dessus. Les tampons PNG tampon-vm-*.png sont issus du repli procédural de cette VM ; ce ne sont pas des captures navigateur.

**Pas de contradiction constatée entre lumière R-11 et sol 01b.** R-11 compte les pixels lumineux de tout le décor, alors que 01b borne à 8 % la part du sol de luminance > 0,25. Ici le contre-jour est au-dessus de l'horizon ; sur les 315 relevés après, sol lumineux max **${fmt(lum)} %**, sol chaud max **${fmt(hot)} %**, plafonds respectifs 8 % et 3 %. Aucun seuil n'a été déplacé.

**Gaine : R-11 non validé dans son ensemble.** Sur les scènes ambiantes séquentielles reçues, colosse : paysage 789/945 = 83,492 %, portrait 209/3066 = 6,817 %, bureau 335/603 = 55,556 %. Les valeurs après sont dans le reçu ; l'éclairage du fond ne répare pas les contours des acteurs. Dans les douze cas indépendants, la vraie flèche dirigée atteint 35/35 en calme/montée/chaos sur les trois profils ; le colosse reste en échec. Demande aux propriétaires de 72-ennemis/73-colosse/40-sprites écrite dans demandes.md, sans modifier leurs fichiers. Un bord de masque peut aussi être créé par une occultation : ces mesures ne prouvent pas seules que tous les défauts viennent du sprite.

## Conservation lisibilité et photosensibilité

Banc 01b repris : sept scènes × trois profils, quinze relevés dans drawFront à 2, 4…30 secondes de combat, soit **315 avant et 315 après**. Sol chaud ≤ 3 %, sol lumineux ≤ 8 %, ciel lumineux ≥ 12 % (8 % dans l'éclipse), ciel chaud ≤ 12 %, aucun cyan décoratif. **${b.lisibilite.filter(x=>x.ok).length}/21 cas après satisfaits** ; les résultats avant et chaque relevé restent publiés. Cette reprise VM vérifie les seuils chromatiques, pas les coûts navigateur ni l'identité du ciel : l'ambiance du ciel change volontairement.

Contrôle p13 inchangé : 600 images par cas, charge/boss3/mort-cyclope sur trois profils, compteur de transitions p10, fenêtre glissante d'une seconde, seuil d'aire > 6,6 %, plafond **3 flashs/s**. Le vrai kill du CYCLOPE est vérifié au journal par la sonde existante. **${b.p13.filter(x=>x.ok&&x.max<=3).length}/9 cas après satisfaits**.

| Profil | Scène | Avant, pire /s | Après, pire /s | Sol chaud max % | Sol L > 0,25 max % |
|---|---|---:|---:|---:|---:|
${P13}

Le vérifieur hors bac relance également les vrais outils navigateur 01b et p13, en série, avant/après. Pour 01b, \`--ambiance-a\` retire uniquement l'exigence d'empreinte de ciel identique ; les seuils chromatiques, les empreintes publiées et le contrôle de performance sont conservés. Une nouvelle lumière du ciel rendait cette égalité inapplicable ; aucune égalité n'est annoncée ici.

## 80 parties avant/après sur l'état reçu

[parties-avant.json](parties-avant.json), [parties-apres.json](parties-apres.json) : **${pb.identiques}/80 identiques** (${differences.length} divergences). Huit pilotes, graines 1 à 10. Temps jeu/combat, vague, score, arrêt, erreurs console et journal complet par SHA-256 strictement comparés, sans arrondi ni filtrage. Stockage vierge, S.jour=20261017, actions, intro.skip, reset départ plongée, seul démarrage initial contourné si nécessaire, pilote officiel, journal, amorçage horloge puis tranches officielles de 0,25 s jusqu'à fin ou borne. Les bornes et arrêts du protocole officiel sont conservés.

## Essais non retenus et limites

Premier contre-jour à quatre rangs partout : paysage dans la cible mais portrait **14,31 à 15,21 %**, échec conservé dans [essai-contrejour-4-mesures-apres.json](essai-contrejour-4-mesures-apres.json). La passe est arrêtée à cette insuffisance ; aucun 18 % n'a été inventé. La passe finale utilise huit rangs seulement en portrait.

L'indicateur initial de victoire cherchait un événement de fin/phase absent de ces reçus ; il rendait false malgré l'état fin. Il a été corrigé pour lire N.score.resume().victoire, sans changer ni le jeu ni la borne. Les deux parties corrigées publient le résumé officiel complet.

La première construction de gaine avec \`direct:true\` restait hors champ ; \`ext:true\` soustrait l'objet au dessin ordinaire et était inadapté. Ces essais n'ont pas fourni de réussite retenue. La construction finale utilise le spawn ordinaire puis seulement les coordonnées publiques. Les sources hors périmètre ne sont pas corrigées.

## Vérification, reprise et dépendances

\`cd proto-neon && node build.mjs\` : **sortie 0**, journal build.log. Syntaxe des scripts, résolution de Playwright sans lancement, git diff --check : sortie 0. Les règles du mur et de morsure n'ont pas changé. Chaque pixel mesuré reste dans la palette ; aucune couleur littérale ni source de hasard n'est ajoutée.

Commandes VM :
\`node proto-neon/tools/codex-p23/calibrer.mjs\`
\`node proto-neon/tools/codex-p23/mesurer-vm.mjs --avant\`
\`node proto-neon/tools/codex-p23/mesurer-vm.mjs\`
\`node proto-neon/tools/codex-p23/r28-cases-vm.mjs\`
\`node proto-neon/tools/codex-p23/lumiere-cases-vm.mjs\`
\`node proto-neon/tools/codex-p23/reduit-parties-vm.mjs\`
\`node proto-neon/tools/codex-p23/parties-vm.mjs --avant\`
\`node proto-neon/tools/codex-p23/parties-vm.mjs\`

Le script hors bac en tête sert le bon bundle avant/après sur un port libre ; un seul Chromium --mute-audio à la fois, iPhone 13 tactile 844×390, 390×844 et bureau 1440×900. Il conserve états, journaux, pixels et captures, puis relance 01b, p13 et les critères R-28/R-11 complets. **Prêt, non exécuté ici.** La comparaison SNAKE 2030 et les médianes de partie sont du ressort du critère navigateur complet, pas prétendues issues de cette VM.

Reste indispensable : reçus de la cheffe d'orchestre hors bac, résolution de la gaine par ses propriétaires, puis Safari réel et coût iPhone. Retour arrière : inverser uniquement les diffs codex-p23 des quatre sources et des deux critères, retirer sa section de demandes, puis reconstruire. avant/sources.json sert de référence ; ne pas rétablir ces fichiers en bloc après intégration d’autres lots.
`;
fs.writeFileSync(new URL('rapport.md',H),corps);
fs.writeFileSync(new URL('verification-sources.json',H),JSON.stringify({dateParis:date,sourceHash,bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('../../index.html',H))).digest('hex'),mesuresHash:b.sourceSha256,partiesHash:pb.sourceSha256,lisibilite:b.lisibilite.every(x=>x.ok),p13:b.p13.every(x=>x.ok&&x.max<=3),partiesIdentiques:pb.identiques,zeroErreurs:b.r11.every(x=>!x.err.count)&&b.p13.every(x=>!x.err.count)&&b.lisibilite.every(x=>!x.err.count)&&pb.cas.every(x=>!x.err),calibration:l('calibration.json').valide},null,2)+'\n');
console.log('rapport.md écrit');

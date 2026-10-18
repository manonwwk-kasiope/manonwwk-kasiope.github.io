import fs from 'node:fs';import {ICI} from './vm.mjs';import {verdictCas} from './cas.mjs';
const dateParis=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'}).replace(' ', ' · ').replace(':', ' h ');
const lu=f=>fs.existsSync(ICI+'/'+f)?JSON.parse(fs.readFileSync(ICI+'/'+f)):null;
const cas=lu('cas-vm.json'),validation=lu('validation-vm.json'),comparaison=lu('comparaison.json'),signaux=lu('signaux.json'),mutants=lu('mutants.json');
const pc=n=>(100*n).toFixed(4)+' %';
const choix=(phase,profil,nom)=>cas.phases[phase].find(c=>c.profil===profil&&c.nom===nom);
const lignes=[];for(const profil of ['paysage','portrait','bureau']){
 const a=nom=>choix('avant',profil,nom),b=nom=>choix('raccords',profil,nom);
 const traces=(r,evt)=>r.journal.filter(e=>e.type==='arene'&&e.d.evt===evt).length;
 lignes.push(`| ${profil} | ${a('convoi').pixelsVisuels} → ${b('convoi').pixelsVisuels} | ${a('travelling').pixelsVisuels} → ${b('travelling').pixelsVisuels} | ${traces(a('battement'),'battement')} → ${traces(b('battement'),'battement')} | ${b('battement').min}–${b('battement').max} | ${pc(a('vol').pire)} → ${pc(b('vol').pire)} |`);
}
const vmR27={},vmR03={};
for(const phase of ['avant','apres','raccords']){
 vmR27[phase]=cas.phases[phase].filter(x=>['convoi','travelling','battement'].includes(x.nom)).map(x=>({profil:x.profil,nom:x.nom,mesurable:x.nom!=='battement'||x.journal.some(e=>e.type==='arene'&&e.d.evt==='battement'),valeur:Number(verdictCas(x)),seuil:1,pixels:x.pixelsVisuels,min:x.min,max:x.max,erreurs:x.err.count}));
 vmR03[phase]=cas.phases[phase].filter(x=>['vol','calme','sillage'].includes(x.nom)).map(x=>({profil:x.profil,nom:x.nom,valeur:x.pire??x.image.part,seuil:0.005,images:x.images?.length??1,proprietaires:x.images?.map(i=>i.proprietaires)??x.image.proprietaires,erreurs:x.err.count}));
}
fs.writeFileSync(ICI+'/R-27-vm.json',JSON.stringify({dateParis,limite:'Cas construits VM, pas verdict de batterie navigateur',phases:vmR27},null,2)+'\n');
fs.writeFileSync(ICI+'/R-03-vm.json',JSON.stringify({dateParis,limite:'Cas construits VM, pas verdict de batterie navigateur',phases:vmR03},null,2)+'\n');
const parties=comparaison?`**${comparaison.etatsIdentiques}/80 paires identiques** pour temps de jeu, temps de combat, temps simulé, vague, score, état final et raison d'arrêt. Les 160 parties finissent sans erreur du jeu ni erreur console. ${comparaison.journauxIdentiques}/80 journaux sont strictement identiques ; les ${comparaison.annoncesAjoutees} seules entrées ajoutées sont arene battement/battementFin. Après retrait explicite de ces entrées nouvelles, ${comparaison.journauxHorsAjoutsIdentiques}/80 journaux complets sont identiques (événements, données, temps, pas et image). Aucun autre écart accepté. Sources : [comparaison.json](comparaison.json), journaux complets avant/raccords en JSON gzip.`:'**En cours : ne pas conclure à la parité des 80 parties.** Les reçus sont archivés après chaque partie ; la comparaison définitive manque encore.';
const rapport=`# codex-p22 — jouable sans le son, cyan réservé

${dateParis} (Paris), mis à jour à ${dateParis.split(' · ')[1]}.

Commande hors bac : **\`cd proto-neon && node tools/codex-p22/verifier.mjs --criteres\`**.

**État : sources et scripts livrés ; ${comparaison?.conforme?'palier de non-régression VM validé':'non-régression VM en cours'} ; chantier bloqué pour la qualification finale navigateur et l'intégration des deux raccords réservés.** Aucun commit. Aucun serveur HTTP ni Chromium lancé dans ce bac.

## Ce qui change

- Travelling : chevrons toujours présents pendant l'annonce, rabattus au bord de la vue lorsque le mur arrière est hors champ. L'accent avance lentement entre quatre colonnes ; le signe ne disparaît pas avec son accent. Le délai d'annonce de 2 s et la mise en place sont inchangés.
- Convoi : chevron d'annonce persistant ; voie hachurée et phares conservés. Le sillage est ambre/jaune, jamais cyan.
- VOL : le fond de poursuite et la vue de destination remappent cyan/cyan pâle vers indigo/ardoise **avant** le dessin du serpent. Le fond est attribué au décor. La joueuse, les effets et les balayages gardent leurs vrais propriétaires ; aucune déduction du masque d'après la couleur.
- Journal du battement : interface publique \`N.arene.battement(actif)\`, raccordée dans le patch de 79-scene au déclencheur et à la phase déjà utilisés par la vignette et \`music.danger\`. Une entrée à l'ouverture et par cycle ; \`battementFin\` à la sortie. La fréquence existante de 1,2 Hz reste celle de la scène.
- R-27 reconnaît l'annonce et le départ du travelling, ainsi que le souffle du VOL associé à \`vol.debut\`. Un convoi absent des parties aléatoires est exercé réellement. Les pixels du signe ET le journal sont requis ; R-03 arme le masque avant la première scène et couvre trois formats et les balayages du VOL.

Ajout seul dans N.R : \`arene.signaux = {hz:1,marge:7,pasY:20,pasX:6,colonnes:4}\`. Les dimensions reprennent celles du dessin ; l'accent passe à un pas par seconde. Raisons et raccords consignés dans la section codex-p22 de [demandes.md](../../refonte/lots/demandes.md). Aucun seuil R-27/R-03/R-13 modifié, aucune nouvelle couleur, aucun changement de collision ou de RNG de jeu.

## Mesures VM avant/après sur l'état reçu

Vraies sources chargées dans l'ordre de build.mjs, sans DOM. Les médias ne sont pas décodés en VM ; les replis procéduraux réels restent actifs. Instrument validé sur e1bdc6f : **${validation.cas.filter(x=>x.egal).length}/10** références exactement reproduites (temps de jeu/combat/simulé, vague et score), [validation-vm.json](validation-vm.json). Cette référence ancienne ne sert pas de cible pour les parties reçues.

Les colonnes après ci-dessous incluent les **deux raccords appliqués en mémoire**, jamais sur les fichiers réservés. Les chiffres comptent les pixels réellement écrits dans le tampon, pas les appels de dessin. Le convoi est annoncé dans une voie visible ; le travelling commence avec le mur arrière hors champ ; le battement vient de la vraie proximité du mur.

| Profil | Pixels voie convoi avant → après | Pixels roses chevrons avant → après | Traces battement avant → après | Pixels des bords min–max après | Cyan VOL hors masque avant → après |
|---|---:|---:|---:|---:|---:|
${lignes.join('\n')}

La batterie navigateur 8f55a91 rapportait un travelling associé dans 0,33333 des cas (seuil 1), aucun convoi rencontré et un battement sans trace. Source en lecture seule : reçus/batterie-8f55a91/R-27.json. Les cas ci-dessus sont construits ; ils ne remplacent pas un nouveau reçu navigateur.

Sources : [cas-vm.json](cas-vm.json), [R-27-vm.json](R-27-vm.json), [R-03-vm.json](R-03-vm.json). ${Object.values(cas.phases).flat().length} cas, zéro erreur jeu/console. Les fenêtres des sons et premières annonces coïncident à la précision de la VM ; contrôle à 0,1 s, seuil 1 inchangé. Le battement reste **non mesurable par journal sans les raccords**, même si les bords sont déjà visibles. Après raccords : 9/9 cas construits R-27 conformes.

Calme : masque non nul dès la première image construite, cyan hors masque 0 sur les trois profils. VOL : dix images par profil (entrée, milieu, sortie, seconde entrée), propriété non vide, palette fermée et cyan hors masque 0. Le sillage reçu produit ${pc(choix('avant','paysage','sillage').image.part)} de cyan hors joueuse en paysage et ${pc(choix('avant','bureau','sillage').image.part)} sur bureau ; après : 0. En portrait, le cas reçu donne déjà 0 ; cette valeur n'est pas inventée ni transformée en échec.

**Ne pas attribuer à ce lot une baisse navigateur de 3,72 % à 0.** La batterie 8f55a91 rapporte 0,03723 au VOL, mais cette fuite n'est pas reproduite sur l'état reçu dans ces cas VM. Environnements et états diffèrent. La protection ajoutée est démontrée séparément : une mutation volontaire du producteur remplit le fond de cyan ; hors masque avant ${pc(choix('avant','paysage','fondCyan').pire)}, après 0. Ce cas artificiel est un contrôle de la protection, pas une mesure d'une partie ordinaire.

Compléments : **${signaux.cas.filter(c=>c.ok).length}/${signaux.cas.length}** cas sur les deux sens et flashs activés/coupés, [signaux.json](signaux.json). **${mutants.cas.filter(c=>!c.accepte).length}/4 défauts volontairement injectés rejetés** : dessin de convoi absent, chevrons absents, vignette absente, remap de fond absent ; les journaux seuls ne suffisent pas, [mutants.json](mutants.json).

## Parties des huit pilotes

${parties}

Protocole identique à tools/pilotes/parties.mjs : profil vierge, jour 20261017, actions auto pour humain et doigts sinon, skip initial, reset plongée, repli demarrage → plongée seulement, pilote, journal complet, une avance d'horloge puis tranches de 0,25 s jusqu'à fin. Dix graines par chacun des huit pilotes. Chaque partie tourne dans son propre processus Node ; la graine ne dépend ni du dessin ni de ces journaux ajoutés.

## Vérifications et limites

Build : \`cd proto-neon && node build.mjs\`, sortie 0, [build.log](build.log). Imports Playwright/critères résolus, scripts syntaxiquement valides, \`git diff --check\` et \`git apply --check\` des deux raccords satisfaits. Aucun fichier réservé modifié : les copies avant et les fichiers raccordés ne vivent que dans tools/codex-p22.

Deux exécutions multi-contextes du banc Node ont quitté avec le code 139 : la première au cours des parties avant, la seconde en complétant les cas VM. Aucun résultat incomplet n'est une réussite. Reprise dans des processus séparés ; les reçus de parties déjà écrits sont conservés, les cas VM interrompus dans \`cas-vm-interrompu.*\`, puis le lot de cas complet est exécuté avec le banc isolé. La calibration historique a terminé sans ce défaut. Le code 139 du banc reste distinct de \`window.__ERR.count\` du jeu.

Le script navigateur sert les variantes avant/après/raccords sur un port libre, lance un seul Chromium avec \`--mute-audio\`, ferme chaque contexte avant le suivant, produit captures de tampons et d'écran, journaux, palette, propriétaires et erreurs pour iPhone 13 paysage 844 × 390, portrait 390 × 844 et bureau 1440 × 900. Avec \`--criteres\`, les deux vrais critères complets sont rejoués avant/après dans ce même Chromium. Un échec final fait sortir le script avec le code 1. Le champ candidatConforme décrit le candidat essayé ; conforme exige aussi que les deux raccords soient réellement intégrés dans le bundle servi comme jeu courant. Il n'a pas été exécuté ici : pixels navigateur, coût sur iPhone et Safari réel restent **à vérifier**. Le fond VOL ajoute une passe de remap ; aucun coût Safari n'est annoncé.

## Reste indispensable

1. Intégrer ensemble [raccord-03-socle.patch](raccord-03-socle.patch) et [raccord-79-scene.patch](raccord-79-scene.patch), puis reconstruire le bundle. Ces patches passent ensemble en VM et leur application est vérifiée sans écriture par git apply --check.
2. Lancer la commande en tête hors bac et relire \`tools/codex-p22/navigateur/resultats.json\`, les R-27/R-03 de navigateur et les captures. Le script distingue les sources réellement intégrées des raccords seulement simulés.
3. Vérifier la lisibilité et le coût sur Safari iPhone réel. La VM et Chromium ne constituent pas une qualification Safari.

Sources livrées et préparation terminées ; qualification finale du lot bloquée sur ces dépendances, pas annoncée achevée.
`;
fs.writeFileSync(ICI+'/rapport.md',rapport);
// Mettre à jour uniquement l'en-tête de notre propre section.
const d=ICI+'/../../refonte/lots/demandes.md';let txt=fs.readFileSync(d,'utf8');txt=txt.replace(/(## codex-p22[^\n]*\n\n)[^\n]*/,`$1${dateParis} (Paris), mis à jour à ${dateParis.split(' · ')[1]}. ${comparaison?.conforme?'80 paires vérifiées ; qualification navigateur à vérifier hors bac.':'Vérification VM en cours.'} Statut et chiffres dans tools/codex-p22/rapport.md. Aucun seuil modifié.`);fs.writeFileSync(d,txt);
console.log('Rapport mis à jour',dateParis);

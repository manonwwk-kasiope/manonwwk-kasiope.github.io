import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const lire=f=>JSON.parse(fs.readFileSync(new URL('./'+f,import.meta.url)));
const avant=lire('avant.json').cas,apres=lire('apres-v2.json').cas,reference=lire('../pilotes/sortie.json').cas;
const calibration=lire('calibration.json'),statique=lire('statique.json'),scenes=lire('scenes-vm.json');
const schemas=lire('schemas.json');assert.equal(schemas.erreurs.length,0);assert.equal(reference.length,80);
assert.equal(avant.length,60,'mesure avant incomplète');assert.equal(apres.length,60,'mesure après incomplète');
const autres=lire('reference60.json').cas;assert.equal(autres.length,60,'comparaison des autres pilotes incomplète');
const reprise=lire('reprise.json');
const bundle=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
assert.equal(crypto.createHash('sha256').update(bundle).digest('hex'),reprise.bundleSha256,'bundle modifié après gel');
for(const [f,hash] of Object.entries(reprise.sources)) {
  const source=fs.readFileSync(new URL('../../../'+f,import.meta.url),'utf8');
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'),hash,'source modifiée après gel : '+f);
  assert.ok(bundle.includes(source),'source exacte absente du bundle : '+f);
}
const fmt=x=>Number(x).toFixed(3).replace('.',','),somme=(a,k)=>a.reduce((n,c)=>n+c[k],0);
const mediane=a=>{const b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2;};
const resumes=[];
for(const profil of ['paysage','portrait','bureau']) for(const mode of ['avant','apres']) {
  const a=(mode==='avant'?avant:apres).filter(c=>c.profil===profil);
  resumes.push({profil,mode,parties:a.length,apparitions:somme(a,'apparitions'),dansVue:somme(a,'dansVue'),armementsHorsVue:somme(a,'armementsHorsVue'),mortsMurMobile:somme(a,'mortsMurMobile'),sansAnnonceHistorique:somme(a,'sansAnnonce'),erreurs:somme(a,'err'),fins:a.filter(c=>c.raison==='fin').length});
}
const comparaison80=reference.map(attendu=>{
  let obtenu;
  if(['bon','humain'].includes(attendu.pilote)) obtenu=apres.find(c=>c.profil==='paysage'&&c.pilote===attendu.pilote&&c.graine===attendu.graine);
  else obtenu=autres.find(c=>c.obtenu.pilote===attendu.pilote&&c.obtenu.graine===attendu.graine).obtenu;
  const champs=['pilote','graine','raison','tempsJeu','vague','score','err'];
  const a=Object.fromEntries(champs.map(k=>[k,attendu[k]])),o=Object.fromEntries(champs.map(k=>[k,obtenu[k]]));
  return {attendu:a,obtenu:o,identique:JSON.stringify(a)===JSON.stringify(o),delta:{tempsJeu:o.tempsJeu-a.tempsJeu,vague:o.vague-a.vague,score:o.score-a.score}};
});
const table80=[];
for(const pilote of [...new Set(reference.map(c=>c.pilote))]) {
  const a=comparaison80.filter(c=>c.obtenu.pilote===pilote);
  table80.push({pilote,identiques:a.filter(c=>c.identique).length,fins:a.filter(c=>c.obtenu.raison==='fin').length,medianeDeltaTemps:mediane(a.map(c=>c.delta.tempsJeu)),medianeDeltaScore:mediane(a.map(c=>c.delta.score)),medianeDeltaVague:mediane(a.map(c=>c.delta.vague)),erreurs:a.reduce((n,c)=>n+c.obtenu.err,0)});
}
const appTypes={avant:{},apres:{}};
for(const mode of ['avant','apres']) for(const c of mode==='avant'?avant:apres) {
  const j=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./'+c.log,import.meta.url)))).journal;
  for(const e of j) if(e.type==='apparition') {
    const d=e.d,v=d.vue;
    if(v&&d.x>=v.x&&d.x<=v.x+v.w&&d.y>=v.y&&d.y<=v.y+v.h) appTypes[mode][d.type]=(appTypes[mode][d.type]||0)+1;
  }
}
const ecartsPropres=apres.map(c=>{const b=avant.find(b=>b.profil===c.profil&&b.pilote===c.pilote&&b.graine===c.graine);return {profil:c.profil,pilote:c.pilote,graine:c.graine,tempsAvant:b.tempsJeu,tempsApres:c.tempsJeu,deltaTemps:c.tempsJeu-b.tempsJeu,vagueAvant:b.vague,vagueApres:c.vague,scoreAvant:b.score,scoreApres:c.score,deltaScore:c.score-b.score};});
const maintenant=new Date(),heure=maintenant.toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).replace(':',' h ');
const date=maintenant.toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'})+' · '+heure;
const maj=fs.existsSync(new URL('./rapport.md',import.meta.url))?' — mis à jour à '+heure:'';
const bilan={dateParis:date,revisionAvant:reprise.revisionAvant,bundleSha256:reprise.bundleSha256,calibration:calibration.valide,resumes,appTypes,ecartsPropres,table80,comparaison80,statique,schemas};
fs.writeFileSync(new URL('./bilan.json',import.meta.url),JSON.stringify(bilan,null,2));
const lignes=resumes.map(c=>`| ${c.profil} | ${c.mode} | ${c.apparitions} | ${c.dansVue} | ${c.armementsHorsVue} | ${c.mortsMurMobile} | ${c.sansAnnonceHistorique} | ${c.erreurs} | ${c.fins}/20 |`).join('\n');
const lignes80=table80.map(c=>`| ${c.pilote} | ${c.identiques}/10 | ${c.fins}/10 | ${fmt(c.medianeDeltaTemps)} | ${c.medianeDeltaVague} | ${c.medianeDeltaScore} | ${c.erreurs} |`).join('\n');
const sceneMurs=scenes.filter(s=>s.mode==='apres').map(s=>`| ${s.profil} | ${fmt(s.murs[0].premier.delai)} | ${s.murs[0].premier.tele.length} | ${s.collision.morts.filter(m=>m.d.auteur==='murMobile').length} | ${s.captures.find(c=>c.nom==='annonce-murs').nonVide} |`).join('\n');
const bornes=comparaison80.filter(c=>c.obtenu.raison!=='fin').map(c=>`${c.obtenu.pilote}/${c.obtenu.graine} : ${c.obtenu.raison}, ${fmt(c.obtenu.tempsJeu)} s, V${c.obtenu.vague}, score ${c.obtenu.score}`).join(' ; ');
const prelim=lire('apres.json');
const rapport=`# codex-p4c — ${date} (Paris)${maj}

**Commande hors bac :** \`cd proto-neon && node tools/codex-p4c/verifier.mjs\`.
Script prêt, non exécuté : aucune tentative HTTP/Chromium dans ce bac. Un Chromium muet, pages et profils en série ; 844×390 tactile, 390×844 tactile, 1440×900. Il collecte buffers, captures et journaux sur les deux versions, puis les 60 parties par version. \`--scenes-seules\` permet de reprendre uniquement les scènes après réception de parties déjà exécutées.

**Statut : correctifs du périmètre autorisé livrés ; chantier bloqué sur les raccords externes et la vérification navigateur. R-06 et R-31 ne sont pas annoncés validés globalement.** Aucun commit. Build exécuté, sortie 0 ([build.log](build.log)). Sources avant : \`${reprise.revisionAvant}\` ; empreintes du candidat dans [reprise.json](reprise.json). Le retour arrière consiste à retirer le diff de ce lot et reconstruire le bundle ; les trois sources antérieures sont aussi conservées dans ce dossier.

## Causes établies avant modification

- \`76-directeur.js:133\` crée via spawn. Les formations ordinaires utilisent \`pointHors()/validePt()\` (lignes 85–113 : vue réelle et anticipée). Les mines duo/champ (203–220) passent directement par \`devantTete\`, bornage aux murs et distance à la tête : aucune exclusion de la vue. Un portail de 1,5 s ne garantit pas le hors-champ à sa fin.
- \`72-ennemis.js:122–148\` AVANT accepte toutes les positions ; \`apparu\` émet à la fin du portail sans revérifier la vue. \`72:602\` AVANT fait éclore les larves autour d'une ruche visible ; \`73-colosse.js:592\` pose les mines autour de l'impact. Les reçus stockent coordonnées, vue et état réels, pas un simple nombre de requêtes spawn.
- \`73-arene.js:110–118,129–140\` AVANT lance la mise en place immédiatement (callAt=0), puis annonce après 1 s. \`12-cam.js:97–108\` fait déjà glisser les murs pendant ces trois secondes. Le premier déplacement est mesuré à 0,008333 s. L'ancien agrégateur de \`72\` ne publie aucune zone de ces murs dans S.tele ; S.monde.annonce ne remplace pas S.tele.
- Cas réel conservé : bon/2 paysage, mort murMobile à t=57,066667, travelling encore en mise (tvT=2,607083), S.tele vide. Source : [journal avant](journaux/avant-paysage-bon-2.json.gz), champ mortsEtat. La frontière basse est aussi classée mobile par \`12-cam.js:153–154\` pendant tout glissement, même si elle ne se déplace pas ; cette attribution n'a pas été modifiée.
- Hors réservation : \`73-colosse.js:255,282,304\` crée l'œil et les mains dans la vue avec ext:true ; \`279,320\` lance ses glissements directement. \`70-joueuse.js:156–158\` ne renseigne teleDuree que pour une source ennemi. Le prédicat de \`R-31-plateau.mjs\` ignore travellingAnnonce. Demandes précises dans [demandes.md](../../refonte/lots/demandes.md), section codex-p4c.

## Changements

72 place les ennemis ordinaires hors de la vue réelle, demi-sprite et marge existante de 24 px compris, dans l'espace légal disponible, sans tirage aléatoire supplémentaire. Les quatre bandes sont parcourues de façon déterministe ; aucune superposition forcée avec les voisins. Si aucune place n'existe, l'objet reste invisible et sans contact en attente. Une caméra rejoignant un portail suspend sa matérialisation tant qu'il reste visible : aucune téléportation du marqueur visible, aucun renommage ni déplacement de l'événement apparition. Les objets externes du boss restent pilotés par leur propriétaire et leur échec reste compté.

Les mines posées du boss naissent elles aussi hors champ. Elles restent ensuite sans contact et sans progression de mèche jusqu'à une annonce visible complète de 0,8 s et aux 0,6 s de visibilité existantes. L'armement hors champ n'est plus émis à la pose ; l'anneau reste publié immédiatement. Le placement et les échéances ne sont donc plus identiques au lot p4b : aucune parité de difficulté n'est revendiquée. Mine ordinaire et ruche exigent maintenant le même contrôle vu6 que les autres armements.

73 annonce le travelling immédiatement, le publie dans S.tele et attend les 2 s existantes avant d'appeler world.travelling. Les 3 s de mise en place viennent ensuite. Les frontières courantes restent publiées comme actives pendant le mouvement, avec les lignes finales datées ; le tampon reçoit des repères magenta stables. 72 réagrège l'arène après ses ennemis ; 73 rafraîchit avant les collisions joueuse. Les glissements externes sont publiés une fois observés, ce qui **ne prouve pas leur annonce préalable**.

Seuls chiffres ajoutés dans N.R : bord strict de 1 px ; quatre identités de murs -10001 à -10004. Raisons consignées dans demandes.md. Tous les autres délais, marges, sprites et seuils viennent des règles existantes. Mur mortel, morsure coupe, palette et plafonds de flash inchangés ; aucun nouveau flash ni cyan d'arène.

## Mesures VM : 10 graines × bon/humain × trois vues

La VM reproduit exactement dix parties du commit e1bdc6f : temps de jeu, vague, score, raison et erreurs ([calibration.json](calibration.json)). Protocole original : localStorage vide, jour 20261017, actions auto pour humain/doigts pour bon, intro sautée, reset plongée, éventuel seul état initial demarrage → plongee, pilote, journal, un avancer initial, puis simuler(0.25) jusqu'à fin ou la borne 540 s. Aucun saut de garde/cartes ni god dans ces 60 parties. Un monde neuf par partie. Vue réelle issue de gfx.resize et de la caméra : 422×195, 195×422, 360×225.

| Vue | Version | Apparitions totales | Dans vue (seuil 0) | Armements hors vue (seuil 0) | Morts mur mobile | Sans annonce, prédicat historique | __ERR | Fins |
|---|---|---:|---:|---:|---:|---:|---:|---:|
${lignes}

Types encore apparus dans la vue APRÈS : **${JSON.stringify(appTypes.apres)}**. Types AVANT : ${JSON.stringify(appTypes.avant)}. Les apparitions externes ne sont pas exclues du total. Les 127 apparitions et la mort sans annonce fournis sur 8f55a91 restent les mesures de cette batterie ; le tableau ci-dessus utilise un autre état initial, intégrant notamment p4b, et un autre échantillon. Il ne prétend pas reproduire 127 à l'identique.

Résultats complets : [avant.json](avant.json), [apres-v2.json](apres-v2.json), journaux gzip dans journaux/, [bilan.json](bilan.json). Ce dernier contient aussi les 60 écarts appariés temps/vague/score de ce lot. Une réduction d'apparitions sous les yeux ne prouve pas à elle seule un bon équilibre du jeu.

La répartition du calcul sur le second Mac n'a pas pu être amorcée : la connexion SSH en mode non interactif a échoué avec « Could not resolve hostname macbook-air-de-manon.local » (sortie 255). Aucun fichier ni clé transmis ; calcul poursuivi sur ce Mac, sans tentative de contournement. Les tests navigateur n'ont été lancés sur aucune machine.

## Scènes physiques ciblées

${statique.controles.filter(c=>c.ok).length}/${statique.controles.length} contrôles du périmètre propre satisfaits ([statique.json](statique.json), [scenes-vm.json](scenes-vm.json)). ${schemas.points} zones réelles conformes au schéma N.ids.tele, zéro erreur ([schemas.json](schemas.json)). Onze types testés dans chaque vue : insertion réelle et événement apparition hors champ. Caméra amenée sur un portail : marqueur immobile, état portail, aucune apparition active. Mines : véritables morts par contact et par souffle, protection depuis visibilité mesurée à 0,816667 s et 1,400000 s ; pas d'armement hors vue. La sonde de contact avant se place après 1,1 s de préparation : son contact à 1,116667 s n'est pas présenté comme le premier contact possible.

| Vue après | Annonce → premier déplacement (s) | Zones S.tele au départ | Mort forcée par mur (mur reste mortel) | Pixels de l'annonce isolée |
|---|---:|---:|---:|---:|
${sceneMurs}

Avant : premier déplacement à 0,008333 s, zéro zone de mur et zéro pixel d'annonce à cet instant. Après : annonce présente avant le premier mouvement ; mort forcée après plus de 2 s d'annonce. Les buffers analysés sont les vrais Uint8Array de N.gfx, avec empreinte et nombre de pixels ; zéro index hors palette, zéro cyan dans les annonces isolées, zéro erreur VM/console. Ces buffers sans DOM **ne qualifient pas le navigateur**.

**Limite du critère R-31 conservée :** sur ces trois collisions contrôlées, son prédicat historique donne **3 sans annonce avant et 3 après** : il omet travellingAnnonce et la mort indique teleDuree=0. Le contrôle physique indépendant voit bien l'annonce ≥2 s avant le déplacement et la mort. Aucun seuil abaissé et aucun faux événement travelling émis pour faire passer ce compteur. Le raccord de mesure/attribution est indispensable avant de valider R-31.

**R-06 externe encore en échec :** la scène boss produit une apparition de l'œil dans la vue sur chacun des trois formats, avant comme après. La phase 2 peut y ajouter les deux mains. Les laisser hors du verdict aurait caché un écart réel à la demande « tout ennemi ».

## Écart des 80 parties de référence

Les vingt bon/humain paysage ci-dessus sont réutilisées ; soixante autres parties ont été exécutées, sans doublonner les vingt. Comparaison exacte avec les 80 reçus e1bdc6f de tools/pilotes/sortie.json ; cet écart inclut les changements déjà présents entre e1bdc6f et le point de départ de ce lot. Les écarts propres à ce lot sont séparés dans bilan.json.

| Pilote | Identiques / 10 | Fins / 10 | Médiane Δ temps (s) | Médiane Δ vague | Médiane Δ score | __ERR |
|---|---:|---:|---:|---:|---:|---:|
${lignes80}

Arrêts autres que fin : **${bornes||'aucun'}**. Ils sont conservés comme échecs de terminaison, sans prolonger la borne ni annoncer une campagne intégralement réussie. Détail de chaque écart dans bilan.json / comparaison80 ; autres reçus dans reference60.json.

## Essais et reste à faire

Première passe exploratoire conservée dans [apres.json](apres.json), ${prelim.cas.length} parties : une annonce rectangulaire couvrait toute la bande qui serait traversée plus tard. Cette géométrie annonçait à tort une grande zone comme déjà mortelle ; elle a été rejetée et remplacée par les frontières courantes / lignes finales datées. Les seuils n'ont pas changé. Aucun résultat de cette passe n'est substitué à apres-v2. La première version de la sonde de scènes accumulait les événements de parties remises à zéro avec des ids réutilisés : la sonde vide désormais son propre journal entre cas ; aucun événement de jeu n'a été supprimé des journaux des parties.

1. Intégrer/revoir le diff de 72 et 73 et les ajouts N.R ; aucun commit réalisé ici.
2. Raccorder les vraies naissances du boss et l'annonce préalable de ses deux world.arena dans son module réservé. Ne pas déplacer ni filtrer les seuls événements pour masquer la création.
3. Raccorder la reconnaissance de travellingAnnonce ou l'attribution de l'annonce arène dans les morts. Le cinquième VOL reste une demande au directeur, sans modification dans ce lot.
4. Examiner les écarts de terminaison/équilibre publiés ci-dessus, puis lancer le script Playwright en tête hors bac et renvoyer playwright/resultats.json. Les pixels navigateur, flashs en situation et Safari réel restent à vérifier ; Chromium avec profil iPhone n'est pas Safari.

**Sous-tâche de correction et préparation des preuves terminée ; palier global non validé ; chantier bloqué sur ces raccords et la réception des preuves navigateur.**
`;
fs.writeFileSync(new URL('./rapport.md',import.meta.url),rapport);
console.log(JSON.stringify({resumes,appTypes,table80,arrets:bornes,rapport:'tools/codex-p4c/rapport.md'},null,2));

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { HERE, ROOT } from './vm.mjs';
const read = n => JSON.parse(fs.readFileSync(path.join(HERE,n)));
const scenes = read('scenes-p4b-vm.json'), p = read('parties-p4b-vm.json'), v = read('validation-vm.json'), hc = read('hors-champ-vm.json');
const fmt = n => n == null ? 'à vérifier' : n.toFixed(3).replace('.', ',');
const now = new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
const mesures = Object.fromEntries(['avant','apres'].map(ver=>[ver, p.cas.filter(c=>c.version===ver)]));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const lignesScenes = ['paysage','portrait','bureau'].map(profil=>{
 const a=t=>scenes.find(s=>s.ref==='098bd37'&&s.profil===profil&&s.type===t);
 const b=t=>scenes.find(s=>s.ref==='courant'&&s.profil===profil&&s.type===t);
 return `| ${profil} | ${fmt(a('mines-contact').avance)} → ${fmt(b('mines-contact').avance)} | ${fmt(a('mines-souffle').avance)} → ${fmt(b('mines-souffle').avance)} | ${fmt(b('mines-contact').contactVisible)} |`;
}).join('\n');
const annexe = [];
for(const version of ['avant','apres']) for(const c of mesures[version]){
 const journal = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,`p4b-${version}-${c.pilote}-${c.graine}.json.gz`)))).journal;
 const arrivee=journal.find(e=>e.type==='phase'&&e.d.evt==='arrivee');
 const mortsBoss=arrivee ? journal.filter(e=>e.type==='mort'&&e.t>=arrivee.t).map(e=>e.d) : [];
 annexe.push({version,pilote:c.pilote,graine:c.graine,phase3:journal.some(e=>e.type==='phase'&&e.d.n===3&&e.d.evt==='entree'),mortsPendantBoss:mortsBoss});
}
fs.writeFileSync(path.join(HERE,'morts-boss-p4b.json'),JSON.stringify(annexe,null,2));
const lignesParties = ['dieu','bon'].flatMap(pilote=>[1,2,3].map(graine=>{
 const a=mesures.avant.find(c=>c.pilote===pilote&&c.graine===graine), b=mesures.apres.find(c=>c.pilote===pilote&&c.graine===graine);
 const ab=annexe.find(c=>c.version==='avant'&&c.pilote===pilote&&c.graine===graine), bb=annexe.find(c=>c.version==='apres'&&c.pilote===pilote&&c.graine===graine);
 return `| ${pilote} | ${graine} | ${fmt(a?.tempsJeu)} → ${fmt(b?.tempsJeu)} | ${a?.score??'à vérifier'} → ${b?.score??'à vérifier'} | ${a?.mortsCyclope??'à vérifier'} → ${b?.mortsCyclope??'à vérifier'} | ${ab?.mortsPendantBoss.length??'à vérifier'} → ${bb?.mortsPendantBoss.length??'à vérifier'} | ${b ? b.raison+' / '+b.err : 'en cours'} |`;
})).join('\n');
const complet=p.cas.length===12&&p.cas.every(c=>c.raison==='fin'&&!c.err&&!c.erreursConsole.length);
const rapport=`# codex-p4b — mines annoncées du CYCLOPE

18/10/2026 · 01 h 22 (Paris) — mis à jour le ${now} (Paris).

**Commande hors bac :** \`cd proto-neon && node tools/codex-p4/verifier.mjs\`.
Commande VM complète sans navigateur : \`cd proto-neon && node tools/codex-p4/verifier.mjs --statique\`.

**${complet ? 'Lot livré pour revue ; contrôles logiques satisfaits.' : 'Mesures en cours : '+p.cas.length+'/12 parties reçues.'} Palier visuel R-07/R-08 à vérifier hors bac.** Aucun serveur ni Chromium lancé dans cette session. Aucun commit. Rapport du lot déjà accepté conservé dans [rapport-p4-archive.md](rapport-p4-archive.md).

## Ce qui change

- \`73-colosse.js\` pose ses mines par l'interface publique \`N.ennemis.spawn\`, avec \`annoncePose:true\` et un portail protégé d'au moins \`N.R.colosse.minesPosees.armement\` (0,8 s), borné aussi par \`colosse.teleMin\`.
- \`72-ennemis.js\` publie le disque dans S.tele et l'événement arme dans le même appel de pose. Le portail interdit le contact et empêche le départ de la mèche. Après armement, une zone de contact à reste=0 est distincte du disque de souffle encore à retardement.
- Le portail est prolongé si la source n'a pas été visible en continu pendant les 0,6 s déjà définies par R-08. Le compteur public vuDepuis fonctionne dès la pose ; une sortie du champ le remet à -1. Les mines ordinaires ne reçoivent pas cette nouvelle option.
- Pendant ce portail, un anneau magenta stable annonce le rayon de souffle existant ; gaine sombre de 1 px, densité 1, dans N.R. Aucun clignotement ni flash nouveau. La mèche préexistante de 0,6 s commence ensuite : souffle nominal au plus tôt 1,4 s après pose.
- Le nombre (6), le placement, les dégâts et le rayon préexistants sont conservés. Aucune compensation de difficulté appliquée sans preuve qu'elle soit nécessaire. Les constantes ajoutées et leurs raisons sont dans la section codex-p4b de demandes.md.

## Mesures réelles en VM

Sources : [scenes-p4b-vm.json](scenes-p4b-vm.json), traces et journaux complets \`p4b-{098bd37,courant}-{profil}-3-mines-*.json.gz\`. Base exacte : 098bd37 (les télégraphes précédents sont déjà intégrés). Graine 7, pas fixe de 1/120 s. Les phases sont atteintes par les dégâts publics sur l'œil ; le jeu et ses collisions ne sont pas remplacés. Les temps sont ceux de N.horloge.t(), capturés au pas où une mort effective est constatée. La différence d'un pas entre l'événement et sa réception reste dans les reçus.

Délais en **secondes depuis la première zone S.tele**, avant → après :

| Format VM | Contact | Souffle | Visibilité à l'activation après |
|---|---:|---:|---:|
${lignesScenes}

Les six scènes après satisfont ≥0,8 s. [controles-p4b.json](controles-p4b.json) vérifie aussi les rayons exacts publiés et les champs d'annonce/visibilité des morts réelles dans les reçus, contre N.R. Dans chacune, les six mines sont publiées dès leur création, avec au moins 0,8 s restantes, et restent protégées pendant cette durée ; zéro erreur VM/console, zéro erreur de schéma et couverture de chaque mort effective par la zone publiée au pas précédent. Avant : contact à 8,33 ms de la zone (pose antérieure non publiée) et souffle à 600 ms, écarts conservés comme échecs. Les journaux des coups après donnent teleDuree=0,8 ; les morts par contact donnent visibleDepuis≈0,808 s, celles par souffle ≥1,4 s.

**Échec conservé de l'instrument :** le premier essai du souffle en portrait n'atteignait aucune mort par la mine (avance=null, borne=true). Le journal montre une mort par contact avec l'œil du CYCLOPE avant le souffle. Reçus : [scenes-p4b-vm-initial.json](scenes-p4b-vm-initial.json), [p4b-portrait-souffle-initial.json.gz](p4b-portrait-souffle-initial.json.gz). La sonde a été déplacée à 15 px de la mine, dans la direction opposée à l'œil, et vérifie désormais aussi l'id de la mine meurtrière. Seule la sonde change ; seuils et jeu inchangés. Les trois formats ont ensuite été remesurés.

[hors-champ-vm.json](hors-champ-vm.json) : vrai spawn, vrais update et déplacements par N.cam.reset, sans remplacement de caméra. Source initialement hors champ, portail encore protégé après 1,4 s ; première visibilité interrompue après 0,3 s, compteur réinitialisé ; activation seulement après ${fmt(hc.activationVisible)} s continues. Zéro erreur. Aucun pixel mesuré en VM : anneauStable et zeroCyan valent null, pas une réussite visuelle.

[validation-vm.json](validation-vm.json), [validation-p4b.log](validation-p4b.log) : ${v.controles.length} parties inerte, graines 1–10, sources exactes du commit e1bdc6f ; temps, vague et score identiques aux références de tools/pilotes/sortie.json, zéro erreur. Validation effectuée avant de conclure sur la VM. Le chargeur contrôle que chaque source appartient exactement au bundle, dans l'ordre de build.mjs ; seul boot() n'est pas appelé.

## Parties dieu/bon

[parties-p4b-vm.json](parties-p4b-vm.json), [parties-p4b-vm.log](parties-p4b-vm.log), journaux \`p4b-{avant,apres}-{dieu,bon}-{1,2,3}.json.gz\` ; détail des morts pendant le boss : [morts-boss-p4b.json](morts-boss-p4b.json).

Protocole de tools/pilotes/parties.mjs : stockage vide, S.jour=20261017, actions=doigts, intro.skip, reset départ plongée, crochet uniquement si demarrage, pilote, dieu invulnérable, journal actif, horloge.avancer initial, tranches de simuler(0.25) jusqu'à fin. Borne 540 s de jeu ; aucun écran de partie sauté. Une partie par processus, en série.

| Pilote | Graine | Temps jeu s | Score | Morts auteur cyclope | Toutes morts après arrivée du boss | Après : arrêt / erreurs |
|---|---:|---|---|---|---|---|
${lignesParties}

La colonne auteur cyclope garde la définition du banc précédent ; elle exclut cyclope:main et mine. La colonne suivante couvre toutes les causes pendant le boss, dont ses mines ; les causes et coordonnées sont publiées séparément. Dieu est invulnérable : ses zéros ne prouvent pas la difficulté. Les graines bon qui n'atteignent pas le boss ne qualifient pas la phase 3. Sur ces six paires, bon garde deux morts directement attribuées au CYCLOPE ; aucune mort par mine n'est ajoutée pendant le boss. Aucune facilité excessive n'est démontrée par ce lot ; le nombre et le placement des mines sont donc conservés. Ce petit lot ne constitue pas une mesure statistique de difficulté.

## Construction et suite

\`cd proto-neon && node build.mjs\` : **sortie 0**, [build-p4b.log](build-p4b.log). Avant SHA-256 : \`${sha(path.join(HERE,'avant-p4b.html'))}\`. Après : \`${sha(path.join(ROOT,'index.html'))}\`. Copie avant identique au bundle Git de 098bd37 ; empreintes dans [provenance-p4b.json](provenance-p4b.json). Seuls les fichiers attribués, N.R en ajout, demandes.md dans cette section, les outils du lot et le bundle reconstruit changent.

**Reste hors bac :** exécuter la commande en tête et rendre \`tools/codex-p4/playwright-p4b/resultats.json\`. Le script sert les deux bundles sur port libre, un seul Chromium muet, contextes en série : iPhone 13 paysage tactile 844×390, portrait 390×844, bureau 1440×900 ; scènes contact/souffle, pose synchrone, pixels complets à pose/armement/collision et contrôle isolé d'un anneau stable sans cyan, captures, journaux et six parties par version. Les huit scènes précédemment acceptées restent optionnelles (\`--regressions\`), non relancées ici. Aucun seuil abaissé. Les échecs avant ne doivent pas rendre les scènes après conformes par défaut. Chromium avec profils iPhone ne qualifie pas Safari réel. Les pixels, flashs et la présentation sur appareil restent à vérifier ; le palier visuel n'est pas annoncé validé.
`;
fs.writeFileSync(path.join(HERE,'rapport.md'),rapport);
console.log(JSON.stringify({complet,parties:p.cas.length,dateParis:now}));

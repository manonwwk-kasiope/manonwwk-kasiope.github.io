'use strict';
const fs=require('node:fs'),path=require('node:path'),{from,sum,win}=require('./selection.cjs');
const rows=from('val'),geos=require('./geometrie.json'),ranking=require('./selection.json'),variant=ranking[0].variant;
const f=(a,key,v)=>a.filter(r=>r[key]===v),dead=a=>f(a,'status','dead').length;
const fmt=(n,k=1)=>Number.isFinite(n)?n.toLocaleString('fr-FR',{minimumFractionDigits:k,maximumFractionDigits:k}):'—';
const rat=(a,b)=>fmt(100*a/b)+' %',out=[];
const line=s=>out.push(s),table=(h,rs)=>{line('');line('| '+h.join(' | ')+' |');line('|'+h.map(()=>'---').join('|')+'|');for(const r of rs)line('| '+r.join(' | ')+' |');line('');};
const cohort=(v,read,shield)=>rows.filter(r=>r.variant===v&&r.read===read&&r.shield===shield);
const chosen=cohort(variant,true,true),blind=cohort(variant,false,true),stats=a=>a.flatMap(r=>r.stats);
const ecoDeath=a=>sum(stats(a),'ecoDeaths');
line('# Écologie ennemie du laboratoire');line('');
line(new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date())+' · Paris');line('');
line('**Maillage donne une conséquence mesurable à la lecture des signaux.** À protection et équipement identiques, le nombre de morts causées par les nouveaux ennemis passe de '+ecoDeath(blind)+'/'+blind.length+' parties sans lecture à '+ecoDeath(chosen)+'/'+chosen.length+' avec lecture. Les victoires passent de '+blind.filter(win).length+' à '+chosen.filter(win).length+'. Les mêmes graines alimentent les deux groupes.');
line('');
line('## Les décisions proposées');line('');
table(['Ennemi','Apparition','Signal et décision'],[
 ['Sentinelle','Cran 1','Le viseur annonce une bande dans la direction du déplacement. Sortir par le côté, plonger ou casser l’émetteur.'],
 ['Équarrisseur','Cran 3','Deux lames apparaissent au point d’interception calculé à partir du cap. Une ouverture latérale reste dans la coupe.'],
 ['Chasseur de sillage','Cran 5','Les chevrons reprennent la trace du serpent sur le plan voisin. Une plongée irréfléchie dans la marque devient dangereuse.'],
 ['Gardien de porte','Cran 7','Un portique entoure une cellule visible. La porte laisse une approche latérale, et son émetteur peut être détruit.']]);
line('Les crans intermédiaires augmentent la portée ou la durée active et rapprochent les propositions de rencontres. Le délai d’annonce s’allonge avec la complexité. Les silhouettes et les mots d’alerte se conservent entre les dates ; ambre pour la gare de 1995, vert en 1976, magenta en 1985, cyan en 2185, violet en 2985.');
line('');line('## Comparaison appariée sur validation');line('');
table(['Variante','Lecture','Protection','Victoires / 240','Morts écologie / toutes morts','Émetteurs détruits','Rencontres résolues/min','Victoires expertes / 80'],['temoin','balises','maillage'].flatMap(v=>(v==='temoin'?[false]:[false,true]).flatMap(read=>[false,true].map(shield=>{
 const a=cohort(v,read,shield),st=stats(a);return[v,read?'oui':'non',shield?'oui':'non',a.filter(win).length,ecoDeath(a)+' / '+dead(a),sum(st,'kills'),fmt(60*(sum(st,'kills')+sum(st,'evades'))/sum(st,'seconds'),2),a.filter(r=>r.pilot==='expert'&&win(r)).length];
}))));
const wall=r=>['Mur','Ta propre queue'].includes(r.cause);
line('Pour les pilotes découverte avec lecture, la protection a été utilisée lors de '+sum(f(chosen,'pilot','découverte'),'absorbed')+'/'+f(chosen,'pilot','découverte').length+' parties. Les morts par mur ou corps passent de '+f(cohort(variant,true,false),'pilot','découverte').filter(wall).length+' sans protection à '+f(chosen,'pilot','découverte').filter(wall).length+' avec protection. À partir de sept segments, un unique choc de mur ou de corps consomme deux segments. La reprise cherche un trajet cardinal libre ; pendant 1,5 s, une commande immédiatement mortelle contre le mur ou le corps est redressée si une sortie existe.');
line('');
const cases=new Map(chosen.map(r=>[[r.seed,r.year,r.pilot].join('/'),r]));
const xy=blind.map(b=>[b,cases.get([b.seed,b.year,b.pilot].join('/'))]);
line('Sur les paires avec protection, '+xy.filter(([b,c])=>!win(b)&&win(c)).length+' défaites deviennent des victoires à la lecture des annonces ; '+xy.filter(([b,c])=>win(b)&&!win(c)).length+' victoires deviennent des défaites. Sur les '+dead(blind)+' morts sans lecture, '+ecoDeath(blind)+' sont explicitement attribuées aux nouveaux ennemis ('+rat(ecoDeath(blind),dead(blind))+'). La cible exploratoire préenregistrée était 10 %.');
line('');line('## Les dix crans dans chacune des cinq époques');line('');
line('Population : Maillage, lecture active, protection active, les trois profils. Le temps d’exposition est cumulé pour que les crans courts ou peu atteints restent identifiables. La densité est la moyenne des cases annoncées sur une grille de 648. Le préavis et la longueur de passage sont mesurés sur le banc géométrique. Les apparitions, activations, destructions et morts sont les événements réellement observés en campagne, classés au cran du pas de simulation.');
line('Sur terrain contrôlé identique, la proportion du cycle passée en phase létale croît aux dix crans de chacune des cinq dates. Le calcul divise la durée active par la somme du repos, du préavis et de la durée active. La densité spatiale pondérée par ce temps est aussi mesurée pour repérer les diminutions à l’introduction de rôles. En 2985, elle passe de 20,6 à 20,3 cases entre les crans 6 et 7 à l’arrivée du gardien de porte ; la croissance de la surface dangereuse présente donc une exception.');
for(const year of [1976,1985,1995,2185,2985]){
 line('');line('### '+year);line('');
 table(['Cran','Exposition (min)','Apparitions/min','Cases annoncées / 648','Préavis (s)','Passage (pas min.)','Cycle létal contrôlé','Cases actives moy. contrôlées','Activations','Destructions','Morts écologie'],Array.from({length:10},(_,i)=>{
 const n=i+1,a=f(chosen,'year',year).map(r=>r.stats[i]),geo=geos.filter(g=>g.year===year&&g.variant===variant&&g.n===n);
 return[n,fmt(sum(a,'seconds')/60,1),fmt(60*sum(a,'warnings')/sum(a,'seconds')),fmt(sum(a,'tiles')/sum(a,'warnings')),fmt(geo[0].warning,2),Math.min(...geo.map(g=>g.opening)),rat(geo[0].active,geo[0].cycle+geo[0].seconds),fmt(geo.reduce((v,g)=>v+g.squares*g.active/(g.cycle+g.seconds),0)/geo.length),sum(a,'active'),sum(a,'kills'),sum(a,'ecoDeaths')];
 }));
}
line('## Preuves et limites');line('');
line('- La campagne utilise le vrai moteur, ses gardiens et le prisme avec Chaîne. La lecture enrichit les décisions des pilotes existants ; elle conserve la latence et les erreurs de direction de leur profil. Sans lecture, le pilote voit encore les émetteurs comme des drones et peut les détruire avec ses armes normales. Le slalom optionnel est exclu du banc.');
line('- Le protocole et les seuils de sélection ont été écrits avant calibration. Sur huit graines de calibration, Maillage obtient '+fmt(ranking[0].rate,2)+' rencontres résolues/min et '+rat(ranking[0].expert,1)+' de victoires expertes. Balises obtient '+fmt(ranking[1].rate,2)+' et '+rat(ranking[1].expert,1)+'. La validation emploie seize autres graines. Chaque groupe contient 16 graines × 5 dates × 3 profils.');
line('- Une résolution comptée est une destruction ou la fin d’une phase active survivante. Certaines esquives sont passives, notamment si le chasseur garde l’autre plan. Une source détruite avant activation constitue aussi une résolution. Les compteurs par cran peuvent changer de cran entre apparition et résolution. Les observations ne démontrent pas une mortalité croissante cran par cran.');
line('- Chaque annonce exige une suite de cases distinctes, cardinales et contiguës, de la durée du préavis et de la phase active. Le certificat évite le corps actuel, le drone et sa prochaine case, le boss et son déplacement annoncé, la salve de boss déjà affichée et toutes les cases de cette nouvelle menace. Si la recherche échoue, la proposition est reportée. Les '+geos.length+' certificats contrôlés ont été parcourus dans le moteur jusqu’à extinction de la salve, aux cinq dates et dix crans dans les deux variantes. Les déplacements futurs des autres ennemis, les salves non encore annoncées et les erreurs du joueur peuvent changer la situation après émission.');
line('- L’épreuve de contrôle confirme la mort en suivant droit la voie de la sentinelle, la survie en plongeant, la neutralisation par nova ou forge, l’ouverture protégée et la consommation unique de la protection. Les résultats mesurent des trajectoires simulées. La lisibilité visuelle et la compréhension des motifs par un joueur restent à vérifier.');
line('');
line('Reproduction : `node preuves.cjs`, `nice -n 10 node campagne.cjs cal`, `node selection.cjs`, `nice -n 10 node campagne.cjs val`, `node rapport.cjs`. Les fichiers cal.json.gz et val.json.gz conservent les résultats par partie et cran.');
fs.writeFileSync(path.join(__dirname,'rapport.md'),out.join('\n')+'\n');

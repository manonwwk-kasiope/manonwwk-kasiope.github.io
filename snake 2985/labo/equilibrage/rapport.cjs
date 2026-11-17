'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {rank,targets,years}=require('./selection.cjs');
const root=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(root,n+'.json'),'utf8'));
const calibration=read('calibration'),all=read('validation'),vr=all.filter(r=>!r.precise),ranked=rank(calibration),chosen=ranked[0].curve;
const chosenRows=vr.filter(r=>r.curve===chosen),pilots=Object.keys(targets);
const sum=(a,f)=>a.reduce((n,r)=>n+f(r),0);
const pct=(x,y)=>y?(100*x/y).toFixed(1)+' %':'—';
const won=r=>r.outcome==='victoire',win=a=>pct(sum(a,won),a.length);
const fraction=(a,f)=>sum(a,f)/a.length;
const median=a=>{a.sort((a,b)=>a-b);let n=a.length;return n?((a[(n-1)>>1]+a[n>>1])/2).toFixed(1):'—';};
const danger=a=>pct(sum(a,r=>r.escapes),sum(a,r=>r.threats));
const counter=a=>pct(sum(a,r=>r.ripostes),sum(a,r=>r.counters));
const groups=(a,...keys)=>{const m=new Map;for(const r of a){const k=keys.map(x=>r[x]).join('/');if(!m.has(k))m.set(k,[]);m.get(k).push(r);}return m;};
let report='';
const line=s=>{report+=s+'\n';};
const table=(headers,rows)=>{line('');line('| '+headers.join(' | ')+' |');line('|'+headers.map(()=> '---').join('|')+'|');for(const row of rows)line('| '+row.join(' | ')+' |');line('');};
function delta(input,split,left,right){
  const perSeed=[...groups(input,'seed').values()].map(a=>fraction(a.filter(r=>split(r)===right),won)-fraction(a.filter(r=>split(r)===left),won));
  const observed=perSeed.reduce((x,y)=>x+y,0)/perSeed.length;
  let state=123456;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const draws=Array.from({length:2000},()=>100*sum(perSeed,()=>perSeed[Math.floor(random()*perSeed.length)])/perSeed.length).sort((a,b)=>a-b);
  return (observed*100).toFixed(1)+' pts ['+draws[50].toFixed(1)+' ; '+draws[1949].toFixed(1)+']';
}
const published=new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date());
line('# Équilibrage des cinq époques');line('');line(published+' · Paris');line('');
line('Le banc joue des parties entières avec le moteur du laboratoire et les dix gardiens. À chaque pas le joueur peut tourner, changer de plan et tirer sa nova. Les ateliers sont traversés avec les améliorations arc, rail, puis nova.');line('');
const tab=pilots.map(p=>win(chosenRows.filter(r=>r.pilot===p)));
const deaths=chosenRows.filter(r=>r.outcome==='mort'),audit=deaths.filter(r=>r.noSafeAction!==null);
line('**La courbe '+chosen+' obtient '+tab.join(', ')+' de victoires pour les profils découverte, habitué et expert. La validation ne démontre pas une difficulté qui augmente à chacune des cinq dates.** Les remontées du taux de victoire en 2185 et les intervalles appariés imposent cette réserve.');
line('');
line('Les collisions avec le mur ou le corps représentent '+sum(deaths,r=>r.cause==='Mur'||r.cause==='Ta propre queue')+' des '+deaths.length+' morts. Sur '+audit.length+' morts rejouées, '+sum(audit,r=>r.noSafeAction)+' étaient inévitables au dernier pas parmi les commandes testées. Les résultats décrivent les limites du modèle de pilote autant que les paramètres du jeu.');
line('');
line('Branchement dans le laboratoire : charger `parametres.js` puis appeler `SnakeEquilibre.tick(s, dt, SnakeGardiens.tick)`. La courbe par défaut est '+chosen+'. Le module conserve le fonctionnement du terrain, des armes et des récompenses.');
line('');
line('## Sélection et validation');
line('Les cibles de conception ci-dessous sont des hypothèses préalables à la validation, en pourcentage de victoires par date. Elles servent à choisir une courbe, sans estimer les performances de personnes réelles.');
table(['Profil',...years],Object.entries(targets).map(([p,t])=>[p,...t.map(x=>pct(x,1))]));
line('La sélection minimise l’écart absolu moyen aux quinze cibles sur calibration. Une courbe doit conserver au moins 85 % de victoires expertes à chaque date et zéro collision de drone mortelle avant 3,2 s. La première calibration limitée aux drones, aux salves et à la nova a laissé les dates futures presque aussi faciles. Une passe de calibration complémentaire a espacé les tirs automatiques et rapproché les arrivées de drones ; les plus fortes valeurs ont envoyé le profil expert sous le seuil de 85 % en 2985. La variante tendue conserve cette expérience. La variante progressive préserve les cadences natives des salves automatiques et des arrivées. La validation finale utilise une nouvelle série réservée de 48 graines.');
table(['Courbe','Écart aux cibles, calibration','Admissible','Victoires, validation par profil (découverte / habitué / expert)'],ranked.map(row=>[row.curve,pct(row.mae,1),row.eligible?'oui':'non',pilots.map(p=>win(vr.filter(r=>r.curve===row.curve&&r.pilot===p))).join(' / ')]));
line('Courbe retenue sur calibration : **'+chosen+'**. Les deux configurations de forge ont le même poids. Chaque cellule par profil et année de la table suivante contient 96 parties (48 graines × 2 armes).');
table(['Pilote',...years,'Écart 2985 − 1976 et intervalle à 95 %'],pilots.map(p=>{const a=chosenRows.filter(r=>r.pilot===p);return [p,...years.map(y=>win(a.filter(r=>r.year===y))),delta(a,r=>r.year,1976,2985)];}));
line('Les intervalles utilisent 2 000 rééchantillonnages appariés des graines. Chaque tirage conserve les deux équipements de la même graine. Les cinq dates sont jouées séparément depuis le cran 1.');
line('');
line('## Paramètres testés');
line('');
line('Les multiplicateurs interpolent entre le début de 1976 et le cran 10 de 2985. L’intensité dépend à 62 % de la date et à 38 % du cran.');
table(['Courbe','Mouvement des drones','Durée des avertissements','Vitesse de recharge de nova','Délai entre tirs automatiques','Délai entre arrivées des drones'],[
 ['Témoin','1','1','1','1','1'],
 ['Progressive','1,14 → 0,74','1,16 → 0,76','1,18 → 0,70','1','1'],
 ['Tendue','1,07 → 0,58','1,03 → 0,60','1,06 → 0,50','0,9 → 3,4','1,2 → 0,32']]);
line('Dans les deux variantes, les drones télégraphient leur apparition et restent inoffensifs durant les 3,2 premières secondes. Une alerte de gardien laisse toujours au moins 0,64 s de réaction. La recharge modulée est passive, les cellules et les failles conservent leurs récompenses.');
line('');line('## Temps, crans et fenêtres de combat');line('');
line('Temps en secondes de jeu. La médiane avant mort porte sur les parties terminées par une mort. La médiane avant surprise porte sur les parties où une menace immédiate du drone ou de la salve était absente de la perception retardée. La part de parties concernées apparaît à côté ; une valeur manquante indique aucune observation. Une salve esquivée est une séquence annoncée résolue vivant ; une salve annulée par la défaite du boss ou la faille est exclue. La riposte exige un dégât sur le cœur pendant la fenêtre.');
table(['Date','Profil','Morts/total','Mort médiane (s)','Première surprise (s) · incidence','Crans finaux 1–2 / 3–4 / 5–6 / 7–9 / 10','Salves esquivées','Fenêtres avec riposte'],years.flatMap(y=>pilots.map(p=>{
 const a=chosenRows.filter(r=>r.year===y&&r.pilot===p),dead=a.filter(r=>r.outcome==='mort'),surp=a.filter(r=>r.surprise!==null);
 const bins=[[1,2],[3,4],[5,6],[7,9],[10,10]].map(([lo,hi])=>a.filter(r=>r.sector>=lo&&r.sector<=hi).length);
 return[y,p,dead.length+'/'+a.length,median(dead.map(r=>r.t)),median(surp.map(r=>r.surprise))+' · '+pct(surp.length,a.length),bins.join(' / '),danger(a),counter(a)];
})));
line('');line('## Forge et commandes');line('');
table(['Pilote','Sans forge','Prisme + Chaîne','Écart apparié et intervalle à 95 %'],pilots.map(p=>{const a=chosenRows.filter(r=>r.pilot===p);return[p,win(a.filter(r=>!r.forge)),win(a.filter(r=>r.forge)),delta(a,r=>r.forge,false,true)];}));
const twins=new Map(all.filter(r=>r.precise).map(r=>[[r.seed,r.year,r.pilot,r.forge].join('/'),r]));
table(['Pilote','Parties appariées','Mort devenue victoire avec commandes exactes','Victoire devenue mort','Dernière erreur réparable / morts auditées','Aucun sauvetage au dernier pas / morts auditées'],pilots.map(p=>{
 const a=chosenRows.filter(r=>r.pilot===p),pairs=a.map(r=>[r,twins.get([r.seed,r.year,r.pilot,r.forge].join('/'))]).filter(x=>x[1]);
 const audited=a.filter(r=>r.noSafeAction!==null);
 return[p,pairs.length,pairs.filter(([a,b])=>a.outcome==='mort'&&won(b)).length,pairs.filter(([a,b])=>won(a)&&b.outcome==='mort').length,
 sum(audited,r=>r.lastErrorRescue)+' / '+audited.length+' ('+pct(sum(audited,r=>r.lastErrorRescue),audited.length)+')',sum(audited,r=>r.noSafeAction)+' / '+audited.length+' ('+pct(sum(audited,r=>r.noSafeAction),audited.length)+')'];
}));
line('Le contrefactuel enlève uniquement les erreurs de direction injectées, avec la même graine, les mêmes délais et la même visibilité. Les trajectoires divergent ensuite. L’audit local rejoue le préfixe réel jusqu’à l’ultime entrée et essaie les quatre directions avec ou sans bascule et nova. Le résultat porte sur le prochain pas. Une impasse à cet instant peut provenir d’une erreur plusieurs cases auparavant. Les six premières graines de validation servent à cet audit.');
line('');line('## Protocole et limites');line('');
line('- Calibration : 24 graines 101 + 67i. Validation : 48 graines distinctes 14009 + 67i. Chacune est croisée avec cinq dates, trois courbes, trois profils et deux armes. Le générateur des entrées est indépendant de celui du jeu. Les mêmes tirages sont attribués au même numéro de décision dans chaque expérience. Le plafond est de 150 s de simulation par partie.');
line('- Découverte : observation retardée de 0,42 s, horizon de trois pas, drones visibles à cinq cases, plan opposé ignoré, 3,5 % de commandes perturbées. Habitué : 0,19 s, six pas, dix cases, perception des deux plans, 1,2 %. Expert : recherche en largeur distincte vers la nourriture puis autour des boss, carte entière et réaction immédiate. Les valeurs de perception et d’erreur sont des hypothèses de modélisation.');
line('- L’horloge du serpent continue entre deux décisions. Les profils perçoivent instantanément leur propre corps, les cellules et les limites. Les erreurs uniformes sur les autres directions autorisées ne modélisent ni fatigue ni apprentissage. Les simulations imposent un choix tactique toutes les cases, y compris pour le novice. Les esquives au changement de plan ne demandent aucun geste physique.');
line('- Le prisme avec Chaîne utilise le module de forge réel. Sans forge les armes natives et les ateliers restent actifs. Les comparaisons isolent le combat au sol : le slalom optionnel, les commandes tactiles, le visuel, le son et les préférences de construction sont hors modèle. La protection initiale concerne les drones, les murs et le corps restent actifs.');
line('- La victoire clôt l’observation, les médianes conditionnelles de mort et de surprise ne sont pas des espérances de durée. Atteindre le cran 10 inclut les morts au dernier boss. Une victoire experte démontre une solution pour sa partie. Un échec du pilote simulé ne démontre pas qu’une grille est insoluble.');
line('- Échecs au plafond sur validation : '+vr.filter(r=>r.outcome==='limite').length+'/'+vr.length+'. Causes des morts, courbe retenue : '+[...groups(chosenRows.filter(r=>r.outcome==='mort'),'cause')].map(([c,rs])=>c+' '+rs.length).join(', ')+'.');
line('');line('Reproduction depuis ce dossier : `node etude.cjs calibration`, `node selection.cjs`, `node etude.cjs validation`, `node rapport.cjs`. Les fichiers JSON contiennent les résultats par partie.');
fs.writeFileSync(path.join(root,'rapport.md'),report);

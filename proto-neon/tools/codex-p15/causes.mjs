// Scénarios dirigés : vraies collisions/IA, aucune émission artificielle de mort, aucun champ privé.
export function verifierCauses(){
 const N=window.__N,S=N.S,resultats=[];
 function neuf(){localStorage.clear();N.intro.skip();N.game.reset(7,{depart:'jeu'});N.pilote.arreter();N.joueuse.god(false);N.ennemis.reset();N.butin.reset();N.arsenal.reset();N.colosse.reset();N.arene.reset();N.joueuse.reset({x:512,y:256,ang:0});N.cam.reset();N.journal.actif(true);N.journal.dump({vider:true});N.horloge.avancer();}
 function pasJ(){const dt=N.horloge.avancer();N.joueuse.update(dt);}
 function fin(attendu,protocole){const j=N.journal.dump();resultats.push({attendu,protocole,etat:N.joueuse.etat,death:S.death,morts:j.filter(e=>e.type==='mort'),coupes:j.filter(e=>e.type==='coupe'),err:window.__ERR.count});}
 neuf();N.joueuse.force({x:N.world.x1-1,y:256,ang:0,trace:true});for(let i=0;i<30&&N.joueuse.etat==='vivant';i++)pasJ();fin('mur','tête dirigée vers le bord, vraie grâce et collision');
 neuf();N.ennemis.spawn('fleche',512,256);pasJ();fin('ennemi','contact de tête avec une flèche');
 neuf();N.ennemis.tir(512,256,0,0,{r:2,src:{genre:'ennemi',type:'tourelle',id:-1}});pasJ();fin('tir','projectile immobile créé par N.ennemis.tir');
 neuf();N.ennemis.rayon(490,256,534,256,1,5,{genre:'ennemi',type:'sentinelle',id:-1});pasJ();fin('laser','N.ennemis.rayon traverse la tête');
 neuf();const mine=N.ennemis.spawn('mine',532,256),placementMine={demandee:{x:532,y:256},apresSpawn:{x:mine.x,y:mine.y}};mine.x=532;mine.y=256;for(let i=0;i<300&&N.joueuse.etat==='vivant';i++){N.horloge.avancer();N.outils.T.t+=N.R.temps.h;N.ennemis.update(N.R.temps.h);}fin('souffle','mine replacée par sa position publique à 20 px après spawn, vraie mise à feu ; joueuse tenue fixe, fixture dirigée');resultats[resultats.length-1].placement=placementMine;
 neuf();N.arene.convois({voie:2,sens:1});for(let i=0;i<1000&&N.joueuse.etat==='vivant';i++){N.horloge.avancer();N.arene.update(N.R.temps.h);}fin('convoi','voie centrale annoncée, vrai passage sur la tête tenue fixe');
 neuf();N.joueuse.force({x:700,y:400,trace:true});N.cam.reset();N.ennemis.spawn('rival',512,256);let cible=null;
 for(let i=0;i<90;i++){N.horloge.avancer();N.outils.T.t+=N.R.temps.h;N.ennemis.update(N.R.temps.h);if(i===60){const e=N.ennemis.list.find(e=>e.type==='rival');cible={x:e.x,y:e.y};}}
 if(cible){N.joueuse.force({x:cible.x,y:cible.y,trace:true});for(let i=0;i<5&&N.joueuse.etat==='vivant';i++){N.horloge.avancer();N.outils.T.t+=N.R.temps.h;N.ennemis.update(N.R.temps.h);}}fin('traine','position mémorisée du rival, collision avec sa vraie trace âgée');
 return resultats;
}

// Scènes construites : vraies sources complètes, pilote exercé par son interface publique.
// Les vues S sont synthétiques pour isoler la politique, sans mise à jour physique.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sources,compiler,monde} from '../codex-p14/vm.mjs';
import {save,date,hash} from './mesurer.mjs';
const script=compiler(sources()),controles=[],mondes=[];
function test(nom,fn){try{const mesure=fn();controles.push({nom,ok:true,mesure});}catch(e){controles.push({nom,ok:false,erreur:e.stack});}}
function scene({x=500,y=250,ang=0,len=20,enemies=[],mondeMur={x0:0,y0:0,x1:1200,y1:800}}={}){
 const m=monde(script,7),{N,S}=m;mondes.push(m);N.socle.reset(7);N.journal.actif(true);N.journal.vider();
 S.player={x,y,ang,vit:68,len,segs:[],etat:'vivant',pouvoir:'traversee',pouvoirPret:true,apogee:100,reserve:100};
 S.enemies=enemies;S.shots=[];S.tele=[];S.butin=[];S.voies=[];S.monde=mondeMur;S.vue={x:0,y:0,w:1200,h:800};
 let etat='jeu';N.game.etat=()=>etat;N.pilote.lancer('humain');
 const step=()=>{N.horloge.avancer();N.pilote.agir(N.horloge.H);return {...S.input};};
 const notes=evt=>N.journal.dump().filter(e=>e.type==='pilote'&&e.d.evt===evt);
 return {...m,step,notes,etat:e=>{etat=e;}};
}
const enemy=(id,x,y,extra={})=>({id,x,y,vx:0,vy:0,r:4,type:'fleche',etat:'chasse',...extra});
const groupe=(cx=550,cy=250,n=4)=>Array.from({length:n},(_,i)=>enemy(i+1,cx+(i%2)*4,cy+Math.floor(i/2)*4));
const guide=(p,c,r,s)=>{const d=Math.hypot(p.x-c.x,p.y-c.y),k=Math.max(-.7,Math.min(.7,1.2*(d-r)/r));return Math.atan2(c.y-p.y,c.x-p.x)-s*(Math.PI/2-k);};
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
test('§2, §5 : 14 pas de retard, bruit ±10°, course 0,80, aucune compensation LASSO',()=>{
 const m=scene({enemies:groupe()}),{N,S}=m,R=Math.round(N.R.pilotes.humain.reaction/N.horloge.H),outputs=[];
 for(let i=0;i<=R;i++)outputs.push(m.step());
 assert(outputs.slice(0,R).every(i=>i.mag===0));assert.equal(outputs[R].mag,.8);
 const cap=m.notes('cap')[0].d,L=m.notes('lassoTente')[0].d,c={x:552,y:252};
 const attendu=guide(S.player,c,L.rayon,L.sens);assert(Math.abs(norm(cap.vise-attendu))<1e-12);
 assert(Math.abs(norm(Math.atan2(outputs[R].y,outputs[R].x)-(cap.vise+cap.bruit)))<1e-12);
 return {R,premierActif:R+1,capVise:cap.vise,capContractuel:attendu,sortieAngle:Math.atan2(outputs[R].y,outputs[R].x),bruit:cap.bruit,retard:cap.retard};
});
for(const [nom,opts]of [['3 cibles',{enemies:groupe(550,250,3)}],['longueur 7',{len:7,enemies:groupe()}],['groupe trop loin',{enemies:groupe(650)}]])test('§4.1 entrée refusée : '+nom,()=>{const m=scene(opts);m.step();assert.equal(m.notes('lassoTente').length,0);return {tentatives:0};});
test('§4.1 : groupe à quatre, rayon et sens du contrat, sans contrôle de faisabilité',()=>{
 const m=scene({len:8,enemies:groupe()}),{S}=m;m.step();const a=m.notes('lassoTente')[0].d;
 assert.equal(a.n,4);assert.equal(a.longueur,8);assert.equal(a.rayon,26);
 const plus=guide(S.player,{x:552,y:252},26,1),moins=guide(S.player,{x:552,y:252},26,-1);
 assert.equal(a.sens,Math.abs(norm(plus-S.player.ang))<=Math.abs(norm(moins-S.player.ang))?1:-1);
 return a;
});
test('§4.1 : plus grand groupe puis graine la plus proche ; exclusions portail/mort/proie',()=>{
 const e=[...groupe(560,250),...groupe(400,350).map(x=>({...x,id:x.id+10})),...Array.from({length:8},(_,i)=>enemy(30+i,500,250,{etat:['portail','mort','proie'][i%3]}))];
 const m=scene({enemies:e});m.step();const cap=m.notes('cap')[0].d,L=m.notes('lassoTente')[0].d;
 assert.equal(L.n,4);assert(Math.abs(norm(cap.vise-guide(m.S.player,{x:562,y:252},26,L.sens)))<1e-12);
 return {tentative:L,cap:cap.vise};
});
test('§4.1 : centre recalculé à chaque décision sur les membres vivants',()=>{
 const m=scene({enemies:groupe()});m.step();m.S.enemies[0].etat='mort';m.S.enemies[1].x+=20;
 for(let i=0;i<31;i++)m.step();const c=m.notes('cap').at(-1).d,L=m.notes('lassoTente')[0].d;
 const rest=m.S.enemies.filter(e=>e.etat!=='mort'),centre={x:rest.reduce((s,e)=>s+e.x,0)/rest.length,y:rest.reduce((s,e)=>s+e.y,0)/rest.length};
 assert(Math.abs(norm(c.vise-guide(m.S.player,centre,L.rayon,L.sens)))<1e-12);return {centre,cap:c.vise};
});
for(const raison of ['vide','boucle','temps','danger'])test('§4.1 sortie : '+raison,()=>{
 const m=scene({enemies:groupe()});m.step();
 if(raison==='vide')m.S.enemies=[];
 if(raison==='boucle')for(let i=0;i<8;i++){m.S.player.ang+=1;m.step();}
 if(raison==='danger')m.S.shots=[{x:m.S.player.x,y:m.S.player.y,vx:68,vy:0,r:100},{x:m.S.player.x,y:m.S.player.y,vx:68,vy:0,r:100}];
 if(raison==='temps')for(let i=0;i<500;i++)m.step();else m.step();
 const fins=m.notes('lassoFin');assert(fins.some(e=>e.d.raison===raison));return fins.map(e=>({t:e.t,...e.d}));
});
test('§4.1 : intervalle strict >1,5 s entre entrées',()=>{
 const m=scene({enemies:groupe()});m.step();m.S.enemies=[];m.step();m.S.enemies=groupe();
 for(let i=0;i<200;i++)m.step();const debuts=m.notes('lassoTente');assert(debuts.length>=2);
 const delta=debuts[1].t-debuts[0].t;assert(delta>1.5);return {delta};
});
test('§4.2–3 : aucun pouvoir/APOGÉE/boost manuel même si prêts et menace certaine',()=>{
 const m=scene({enemies:Array.from({length:12},(_,i)=>enemy(i+1,501+i,251,{etat:'attaque',boss:i===0,partie:i===0?'oeil':undefined}))});
 m.S.tele=Array.from({length:4},()=>({forme:'disque',x0:500,y0:250,r:100,cible:'tout',reste:.01}));
 const sorties=[];for(const pouvoir of ['traversee','ralenti','repli']){m.S.player.pouvoir=pouvoir;for(let i=0;i<60;i++)sorties.push(m.step());}
 assert(sorties.every(i=>!i.pouvoir&&!i.apogee&&!i.boost&&i.mag<1));
 return {pas:sorties.length,pouvoirs:sorties.filter(i=>i.pouvoir).length,apogees:sorties.filter(i=>i.apogee).length,boosts:sorties.filter(i=>i.boost).length};
});
test('§2, §5 : bruit uniforme conservé 0,25 s ; moyenne et écart type sur deux minutes',()=>{
 const m=scene(),{N}=m,bruits=[];
 // Deux minutes de combat ; sorties et journal réels, sans physique pour isoler le bruit.
 for(let i=0;i<120/N.horloge.H;i++)m.step();
 for(const e of m.notes('cap'))bruits.push(e.d.bruit*180/Math.PI);
 const mean=bruits.reduce((s,v)=>s+v,0)/bruits.length,sd=Math.sqrt(bruits.reduce((s,v)=>s+(v-mean)**2,0)/bruits.length),cible=10/Math.sqrt(3);
 assert(bruits.every(b=>b>=-10&&b<=10));assert(Math.abs(mean)<=1.5);assert(Math.abs(sd-cible)<=.15*cible);
 return {n:bruits.length,moyenneDeg:mean,ecartTypeDeg:sd,ecartTypeAttendu:cible,min:Math.min(...bruits),max:Math.max(...bruits)};
});
test('§8 : réponse à un télégraphe exactement 14 pas après la décision',()=>{
 const a=scene(),b=scene();for(let i=0;i<30;i++){a.step();b.step();}
 b.S.tele=[{forme:'ligne',x0:520,y0:150,x1:520,y1:350,r:10,cible:'tete',reste:.1}];
 const deltas=[];for(let i=0;i<35;i++){const x=a.step(),y=b.step();if(Math.abs(x.x-y.x)+Math.abs(x.y-y.y)>1e-12)deltas.push(i);}
 assert.equal(deltas[0],14);return {premiereDifference:deltas[0],deltas};
});
test('§4.4 : ordre fixe, délai 0,45 s et impulsion de choix',()=>{
 const m=scene();m.etat('cartes');m.S.ecran={nom:'cartes',pret:true,depuis:.44,cartes:['repli','canon','tourelles','croissance']};
 for(let i=0;i<30;i++)assert.equal(m.step().chiffre,0);
 assert.equal(m.notes('carte').length,0);m.S.ecran.depuis=.45;
 const out=[];for(let i=0;i<42;i++)out.push(m.step().chiffre);
 assert.equal(m.notes('carte')[0].d.id,'tourelles');assert.equal(m.notes('carte')[0].d.rang,3);
 assert(out.includes(3));assert(out.every((v,i)=>!v||i===0||!out[i-1]));
 return {decisions:m.notes('carte').map(e=>({pas:e.pas,t:e.t,...e.d})),sorties:out};
});
test('§4.5 : états sans action, jamais de validation',()=>{
 const m=scene();const etats=['mort','panneau','pause','fin','initiales','titre','ouverture','briefing','demarrage'];
 for(const e of etats){m.etat(e);for(let i=0;i<20;i++){const v=m.step();assert.equal(v.mag,0);assert(!v.pouvoir&&!v.apogee&&!v.boost&&!v.valider);}}
 return {etats};
});
test('§4.5 : VOL vers la première porte/cellule temporelle, esquive de mine',()=>{
 const m=scene();m.etat('vol');m.S.vol={tete:{x:100,y:100},objets:[{type:'cellule',x:100,y:150,avant:.5},{type:'porte',x:180,y:100,avant:1}]};
 let v;for(let i=0;i<16;i++)v=m.step();assert(Math.abs(Math.atan2(v.y,v.x)-Math.PI/2)<1e-12);
 m.S.vol.objets.push({type:'mine',x:110,y:100,avant:.1});for(let i=0;i<16;i++)v=m.step();assert(Math.abs(Math.abs(Math.atan2(v.y,v.x))-Math.PI)<1e-12);
 return {angleEsquive:Math.atan2(v.y,v.x)};
});
const src=fs.readFileSync(new URL('../../src/85-pilote.js',import.meta.url),'utf8');
test('§1 : aucune lecture de module de jeu privé, flux pilote seul et écritures S.input seules',()=>{
 assert(!/N\.(?:ennemis|joueuse|cam|dir|colosse|score|arsenal|butin)\b|\._\w+/.test(src.replace(/window\.__\w+/g,'')));
 const flux=[...src.matchAll(/N\.rng\(([^)]+)\)/g)].map(x=>x[1]);assert(flux.every(f=>f==="'pilote'"));
 assert(!/input\.(?:pause|retour|car|gestes|taps)\s*=/.test(src));
 return {flux,verification:'Recherche statique, complétée par revue du diff et scènes de sortie.'};
});
test('Zéro erreur des scènes construites',()=>{const erreurs=mondes.map(m=>({compteur:m.c.__ERR.count,console:m.erreurs}));assert(erreurs.every(e=>e.compteur===0&&!e.console.length));return {scenes:erreurs.length,erreurs};});
const resultat={dateParis:date(),sourceSha256:hash(sources()),conforme:controles.every(c=>c.ok),controles};save('conformite.json',resultat);console.log(JSON.stringify(resultat,null,2));if(!resultat.conforme)process.exitCode=1;

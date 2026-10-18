import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';
import {scenario} from '../codex-p17/scenarios.mjs';
import {observerAttraction} from '../mesure/criteres/R-19-attraction.mjs';
import {encodeIndex} from '../mesure/png.mjs';
const calibration=JSON.parse(fs.readFileSync(new URL('calibration.json',import.meta.url)));assert.equal(calibration.cas.filter(c=>c.identique).length,10);
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'VM sans DOM, pas une capture navigateur',r19:[],compositions:[]};
function src(phase){const s=sources();for(const [n]of s){const f=new URL((phase==='avant'?'avant/':'')+n,import.meta.url);if((phase==='avant'||n==='79-jeu.js')&&fs.existsSync(f))s.find(([x])=>x===n)[1]=fs.readFileSync(f,'utf8');}if(phase==='apres')s.find(([n])=>n==='79-jeu.js')[1]=fs.readFileSync(new URL('79-jeu-candidat.js',import.meta.url),'utf8');return s;}
function paint(w){w.N.gfx.origin(0,0);w.N.gfx.clear(0);w.N.game.draw();w.N.game.drawTop();w.N.ui.draw();}
function snap(w){return JSON.parse(JSON.stringify(vm.runInContext('('+observerAttraction.toString()+')(N,__S)',w.c)));}
for(const phase of ['avant','apres']){
 const w=monde(src(phase)),{N,S,c}=w;N.game.reset(17,{depart:'titre'});N.journal.actif(true);N.horloge.avancer();const stockage=JSON.stringify([...w.stockage]);const profile=JSON.stringify({energie:N.score.energie,deblo:N.score.deblocages,records:N.score.classement()});
 let arrivee=null;for(let t=1;t<=25*120;t++){N.game.dbg.simuler(N.R.temps.h);if(N.game.etat()==='attraction'){arrivee=t*N.R.temps.h;break;}}
 const obs=[];paint(w);obs.push(snap(w));for(let i=0;i<36*4;i++){N.game.dbg.simuler(.25);paint(w);if(i%4===0)obs.push(snap(w));}
 const teteAvant={...N.joueuse.tete};N.game.dbg.simuler(.25);const bouge=Math.hypot(N.joueuse.tete.x-teteAvant.x,N.joueuse.tete.y-teteAvant.y)>0;
 const muet={global:N.music.muted(),musique:N.music.muted('musique'),effets:N.music.muted('effets')};
 N.game.dbg.input({any:true});N.game.update(N.R.temps.h);const sorti=N.game.etat();
 const r={phase,arrivee,seuil:'15 ± 1 s',volets:[...new Set(obs.map(o=>o.volet))],observations:obs,bouge,muet,sorti,stockageIdentique:stockage===JSON.stringify([...w.stockage]),profilIdentique:profile===JSON.stringify({energie:N.score.energie,deblo:N.score.deblocages,records:N.score.classement()}),err:c.__ERR,journal:N.journal.dump()};out.r19.push(r);
 assert.ok(Math.abs(arrivee-15)<=1);assert.equal(c.__ERR.count,0);assert.equal(sorti,'titre');assert.ok(r.stockageIdentique&&r.profilIdentique&&r.bouge);if(phase==='apres'){assert.deepEqual(r.volets,['demo','galerie','records','invitation']);assert.ok(obs.every(o=>o.lignes.every(l=>l.pixels>0&&l.dansZone)));}
}
// Contre-épreuve : même écran synthétique, aucun update du jeu, l'état n'atteint jamais attraction.
{const w=monde(src('apres'));w.N.game.reset(17,{depart:'titre'});for(let i=0;i<25*120;i++)w.N.ui.update(w.N.R.temps.h);out.instrumentNegatif={etat:w.N.game.etat(),arrivee:null};assert.equal(w.N.game.etat(),'titre');}
// Chaque touche/toucher déjà publié est lu avant le pilote ; les canaux asymétriques reviennent à l'identique.
for(const entree of [{any:true},{valider:true},{retour:true},{pause:true},{taps:[{x:30,y:30}]},{stick:{active:true}},{pointer:{boutons:1}}]){
 const w=monde(src('apres'));w.N.game.reset(17,{depart:'titre'});w.N.music.mute('musique',true);w.N.music.mute('effets',false);w.N.game.dbg.simuler(15.25);w.N.game.dbg.input(entree);w.N.game.update(w.N.R.temps.h);assert.equal(w.N.game.etat(),'titre');assert.equal(w.N.music.muted('musique'),true);assert.equal(w.N.music.muted('effets'),false);assert.equal(w.c.__ERR.count,0);
}
out.sorties=7;
for(const phase of ['avant','apres'])for(const [profil,viewport]of [['paysage',[844,390]],['portrait',[390,844]],['bureau',[1440,900]]])for(const nom of ['briefing','pause','fin'])for(const stade of ['zero','encours','faits','tout']){
 const w=monde(src(phase),new Map(),viewport);w.c.opts={nom,stade,profil};const r=JSON.parse(JSON.stringify(vm.runInContext('('+scenario.toString()+')({N:N,S:__S,...opts})',w.c)));
 if(nom==='briefing'&&stade==='encours')fs.writeFileSync(new URL(phase+'-'+profil+'-briefing.png',import.meta.url),encodeIndex(w.N.gfx.W,w.N.gfx.H,w.N.gfx.buf(),w.N.pal.C.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16))),w.N.gfx.PX));
 delete r.tampon.data;const right=r.lignes.filter(l=>/^\d+\/\d+$/.test(l.texte)).map(l=>l.x+l.w);
 r.phase=phase;r.ok=right.length===4&&right.every(x=>x===right[0])&&r.lignes.every(l=>!['PROCHAIN','JOUR','SECTEUR','>'].includes(l.texte)&&!(/\b(DU|LE)$/.test(l.texte))&&!/(^| )NON( |$)/.test(l.texte)&&l.echelle>=2&&l.dansZone&&l.pixels>0)&&!r.err.count&&!r.collisions.length&&r.horsPalette===0&&r.cyan===0&&r.boutons.every(b=>b.wPt>=44&&b.hPt>=44);
 out.compositions.push(r);
}
fs.writeFileSync(new URL('cas.json',import.meta.url),JSON.stringify(out,null,2));
console.log(JSON.stringify({r19:out.r19.map(({phase,arrivee,volets,muet,sorti,profilIdentique,err})=>({phase,arrivee,volets,muet,sorti,profilIdentique,err})),composition:out.compositions.filter(c=>c.ok).length,total:out.compositions.length}));
console.log(out.compositions.filter(c=>!c.ok).map(c=>({phase:c.phase,profil:c.profil,nom:c.nom,stade:c.stade,collisions:c.collisions,lignes:c.lignes.filter(l=>!l.dansZone||!l.pixels)})));
assert.ok(out.compositions.every(c=>c.ok));

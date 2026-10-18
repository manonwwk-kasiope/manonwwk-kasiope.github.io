import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { sources, monde } from './vm.mjs';
import { installer, analyser } from '../codex-p10/sonde.mjs';
import { installerDecor } from '../codex-p13/sonde-decor.mjs';
const HERE=new URL('./',import.meta.url), avant=process.argv.includes('--avant');
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',HERE))).valide)throw Error('VM non calibrée');
const src=avant?JSON.parse(fs.readFileSync(new URL('avant/sources.json',HERE))):sources();
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourceSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),limite:'VM sans DOM : vrais pixels du tampon, pas navigateur ni Safari.',r28:[],r11:[],p13:[],lisibilite:[]};
const save=()=>fs.writeFileSync(new URL(avant?'mesures-avant.json':'mesures-apres.json',HERE),JSON.stringify(sortie,null,2)+'\n');
const profils=[['paysage',844,390],['portrait',390,844],['bureau',1440,900]];
function creer(w,h,reduit=false){const m=monde(src,7,{reduit});m.N.gfx.resize(w,h);m.S.view.w=m.N.gfx.W;m.S.view.h=m.N.gfx.H;return m;}
function pas(c,n=1){for(let i=0;i<n;i++)c.frame((c.__FRAME||0)*1000/60);}
for(const [profil,w,h]of profils){
 const {c,N,S}=creer(w,h,true);N.game.dbg.masque();N.game.dbg.scene('v5');N.game.dbg.god(true);N.journal.actif(true);
 const p=S.player;const e=N.ennemis.spawn('fleche',p.x+Math.cos(p.ang)*70,p.y+Math.sin(p.ang)*70,{elite:'flecheBlindee',direct:true});pas(c,30);
 const cible=N.ennemis.list.find(a=>a.id===e?.id&&a.etat!=='mort');if(cible)for(let i=0;i<50&&cible.etat!=='mort';i++)N.ennemis.hit(cible,(cible.pvMax||1)*4,{genre:'arme',type:'canon',id:0});
 let prev=null,images=0,paires=0,max=0,pire=null;
 for(let i=0;i<40;i++){pas(c);const b=N.gfx.buf().slice(),gele=N.horloge.gele();if(gele){images++;if(prev?.gele){paires++;let n=0;const codes={};for(let k=0;k<b.length;k++)if(b[k]!==prev.b[k]){n++;const code=N.gfx.mask()[k];codes[code]=(codes[code]||0)+1;}if(!pire||n/b.length>max){max=n/b.length;pire={image:i,codes,t:N.horloge.t(),cam:[N.cam.x,N.cam.y],dt:S.dt,shake:S.shake};}}}prev={b,gele};}
 sortie.r28.push({profil,cible:!!cible,morte:cible?.etat==='mort',images,paires,max,pire,err:c.__ERR,journal:N.journal.dump()});save();
 const m=creer(w,h);m.N.game.dbg.masque();vm.runInContext(fs.readFileSync(new URL('../mesure/sonde.js',HERE),'utf8'),m.c);
 for(const scene of ['calme','montee','chaos','colosse']){m.N.game.dbg.scene(scene);pas(m.c,3);sortie.r11.push({profil,scene,analyse:m.c.__MESURE.analyseCourante({gaine:true}),err:m.c.__ERR});}save();
 for(const scene of ['charge','boss3','mort-cyclope']){const {c,N,S}=creer(w,h);installer(c);installerDecor(c);const P=c.__P10;P.preparer(scene);const images=[];for(let f=0;f<600;f++){P.stimuler(f);pas(c);images.push({...P.lire(f),decor:c.__P13.lire()});}const r=analyser({profil,scene,images,...P.bilan()});const ds=images.map(x=>x.decor).filter(Boolean);sortie.p13.push({profil,scene,max:r.pixels.maxParSeconde,ok:r.ok,err:r.err,solChaudMax:Math.max(...ds.map(d=>d.solChaud)),solLumMax:Math.max(...ds.map(d=>d.solLumineux)),cyanMax:Math.max(...ds.map(d=>d.cyan))});save();}
 // Même corpus et prélèvement que tools/lisibilite/banc-01b.mjs : 21 cas, 15 relevés/cas.
 for(const scenario of ['v1','v2','v3','v4','v5','boss','defile']){
  const {c,N}=creer(w,h);N.intro.skip();N.game.reset(4242);if(scenario==='boss')N.game.dbg.boss();else{N.game.dbg.vague(scenario==='defile'?4:+scenario.slice(1));if(scenario==='defile')N.game.dbg.etat('defile');}N.game.dbg.god(true);
  const t0=N.game.dbg().t,samples=[];let want=false,snap=null,frames=0,next=2;const draw=N.decor.drawFront;
  N.decor.drawFront=function(){const r=draw.apply(this,arguments);if(want){const b=N.gfx.buf(),g=N.gfx,yh=N.decor.horizon();let n=0,hot=0,lum=0,cn=0,ch=0,cl=0,cy=0;for(let y=0;y<g.H;y++)for(let x=0;x<g.W;x++){const v=b[y*g.W+x],warm=[9,10,11,12].includes(v);if(v===7||v===8)cy++;if(y>yh){n++;if(warm)hot++;if(N.pal.L[v]>.25)lum++;}else if(y<yh){cn++;if(warm)ch++;if(N.pal.L[v]>.1)cl++;}}const min=N.decor.etat()==='colosse'&&N.decor.quartier()==='eclipse'?.08:.12;snap={t:N.game.dbg().t-t0,solChaud:hot/Math.max(1,n),solLum:lum/Math.max(1,n),cielChaud:ch/Math.max(1,cn),cielLum:cl/Math.max(1,cn),cyan:cy,minCiel:min};snap.ok=snap.solChaud<=.03&&snap.solLum<=.08&&snap.cielChaud<=.12&&snap.cielLum>=min&&!cy;want=false;}return r;};
  while(samples.length<15&&frames++<12000){if(N.game.dbg().t-t0+1e-9>=next)want=true;pas(c);if(snap){samples.push(snap);snap=null;next+=2;}}sortie.lisibilite.push({profil,scenario,samples,frames,err:c.__ERR,ok:samples.length===15&&samples.every(s=>s.ok)&&!c.__ERR.count});save();
 }
 console.log(profil,'terminé');
}
save();console.log(JSON.stringify({r28:sortie.r28.map(r=>[r.profil,r.max]),r11:sortie.r11.map(r=>[r.profil,r.scene,r.analyse.decorLumineux]),p13:sortie.p13.map(r=>[r.profil,r.scene,r.max]),lisibilite:sortie.lisibilite.filter(r=>!r.ok).map(r=>[r.profil,r.scenario])}));

if(sortie.p13.length!==9||sortie.p13.some(r=>!r.ok||r.max>3)||sortie.lisibilite.length!==21||sortie.lisibilite.some(r=>!r.ok))process.exitCode=1;

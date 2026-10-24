/* Hors bac exclusivement : cd proto-neon && node tools/codex-f1/verifier.mjs [--verrou-detenu]
   Un seul Chromium headless muet, trois profils en série. Le verrou Chef n'est jamais forcé.
   Mesures réelles d'état, tampon et journal ; aucun verdict Safari ni acoustique déduit de la simulation. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {transitions} from '../codex-di5/r13.mjs';
import {flashs} from '../mesure/criteres/R-13-photosensibilite.mjs';
import {compterAdmissions} from '../mesure/criteres/R-14-budgets-effets.mjs';
import {dessiner} from './rendu.mjs';
import {scenes} from './scenes.mjs';
import {casPreavis} from './preavis-cas.mjs';
import {interfaceG1} from './interface-g1.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),OUT=path.join(HERE,'navigateur'),LOCK='/tmp/snake-chromium-chef.lock';
const held=process.argv.includes('--verrou-detenu');let owner=false,browser,server;
fs.mkdirSync(OUT,{recursive:true});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const original=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
for(const f of fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')))if(!original.includes(fs.readFileSync(path.join(ROOT,'src',f),'utf8')))throw Error('Bundle périmé : '+f);
const avantLecture="(function(){var p=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return p.apply(this,arguments);};})();\n";
const bundle=original.replace('<script>','<script>'+avantLecture).replace('\nboot();','\nwindow.__f1Frame=frame;\nboot();');
if(bundle===original)throw Error('Point boot absent');
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:sha(original),limite:'Chrome émulé, aucun verdict Safari physique ou jury. Signal audio et qualité restent des portes distinctes.',profils:[],erreurs:[]};
const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(out,null,2)+'\n');
const profils={paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900}}};
const bilanFile=path.join(HERE,'bilan-final.json');const graineComplete=fs.existsSync(bilanFile)?JSON.parse(fs.readFileSync(bilanFile)).graineParcoursComplet:2;
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'musique/morceaux/morceaux.json')));
async function ouvrir(profil,origin){
 const ctx=await browser.newContext({...profils[profil],serviceWorkers:'block',reducedMotion:'no-preference'});
 await ctx.route('**/*',r=>{const u=r.request().url();return u.startsWith(origin+'/')||/^(data|blob):/.test(u)?r.continue():r.abort('blockedbyclient');});
 await ctx.addInitScript({content:'window.__f1Transitions='+transitions.toString()+';'});
 await ctx.addInitScript({content:'window.__f1Rendu='+dessiner.toString()+';'});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.__SEED=7;window.__DT=1/60;window.__f1RAF=requestAnimationFrame.bind(window);window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};
 const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return play.apply(this,arguments);};});
 await page.goto(origin+'/index.html?journal=1',{waitUntil:'load'});return{ctx,page,errors};
}
async function pixels(page,nom){const p=await page.evaluate(()=>({w:__N.gfx.W,h:__N.gfx.H,palette:__N.pal.C,pixels:Array.from(__N.gfx.buf()),etat:__N.game.etat(),err:__ERR}));const f=nom+'.pixels.json.gz';fs.writeFileSync(path.join(OUT,f),zlib.gzipSync(JSON.stringify(p)));return{f,sha256:sha(Buffer.from(p.pixels)),w:p.w,h:p.h,horsPalette:p.pixels.filter(v=>v<0||v>=p.palette.length).length,etat:p.etat,err:p.err};}
async function partie(page,pilote,graine){
 return page.evaluate(({pilote,graine})=>{
 const N=__N,S=__S;localStorage.clear();S.jour=20261017;S.reglages.actions=pilote==='humain'?'auto':'doigts';N.intro.skip();N.game.reset(graine,{depart:'plongee'});if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');N.pilote.lancer(pilote);if(pilote==='dieu')N.game.dbg.god(true);N.journal.actif(true);
 let pas=0,secoues=0,frames=0;const cam=N.cam.update;N.cam.update=function(...a){const r=cam.apply(this,a);pas++;if(S.shake>0)secoues++;return r;};
 const dump=N.journal.dump;N.journal.dump=()=>[];N.horloge.avancer();let reel=0,stagnant=0,last='',raison='borne';const etats={};
 try{while(N.horloge.t()<540&&reel<2160){if(N.game.etat()==='fin'){raison='fin';break;}N.game.dbg.simuler(1/60,{dessin:false});reel+=1/60;S.frame++;window.__f1Rendu(N);frames++;const e=N.game.etat();etats[e]=(etats[e]||0)+1;const key=[e,N.horloge.t(),S.ecran?.depuis,S.vol?.t].join('|');stagnant=key===last?stagnant+1/60:0;last=key;if(stagnant>10){raison='bloque:'+e;break;}if(__ERR.count){raison='erreur';break;}}}finally{N.cam.update=cam;N.journal.dump=dump;}
 const d=N.game.dbg(),journal=N.journal.dump();return{pilote,graine,raison,etat:N.game.etat(),tempsJeu:N.horloge.t(),tempsCombat:d.t,vague:d.vague,score:d.score,pas,secoues,partSecouee:secoues/pas,frames,etats,journal,err:__ERR,cyclope:journal.some(e=>e.type==='phase'&&e.d?.evt==='arrivee'),seuils:N.R.criteres};
 },{pilote,graine});
}
async function r13(page,nom){
 const r=await page.evaluate(()=>{
 const N=__N,S=__S,dt=N.R.temps.imageRef;N.intro.skip();N.game.reset(6,{depart:'jeu'});const ready=N.game.dbg.scene('charge');N.game.dbg.god(true);N.journal.vider();N.journal.actif(true);const images=[{f:-1,w:0,W:N.gfx.W,H:N.gfx.H,...window.__f1Transitions(null,N.gfx.buf(),N.pal.L,N.R.lisibiliteP10.mesure.luminanceDelta,N.R.lisibiliteP10.mesure.luminanceSombre)}];let old=new Uint8Array(N.gfx.buf()),kills=0;const dump=N.journal.dump;N.journal.dump=()=>[];
 try{for(let f=0;f<60/dt;f++){S.frame++;if(f<2/dt&&f%4===0&&kills++<30){const e=N.ennemis.list.find(e=>e.etat!=='mort'&&!e.boss);if(e)N.ennemis.hit(e,1e6,{genre:'arme',type:'canon',id:0});}N.game.dbg.simuler(dt,{dessin:false});window.__f1Rendu(N);const b=N.gfx.buf(),r=N.R.lisibiliteP10.mesure;images.push({f,w:(f+1)/(1/dt),W:N.gfx.W,H:N.gfx.H,...window.__f1Transitions(old,b,N.pal.L,r.luminanceDelta,r.luminanceSombre)});old.set(b);}}finally{N.journal.dump=dump;}
 return{ready,images,journal:N.journal.dump(),err:__ERR,dt,seuils:N.R.criteres.R13};});
 const file=nom+'-r13.json.gz';fs.writeFileSync(path.join(OUT,file),zlib.gzipSync(JSON.stringify(r)));const m=flashs(r.images,r.seuils.aire,r.dt,{hzFixe:1/r.dt});return{file,...m,ok:r.ready&&r.images.length===60/r.dt+1&&m.qualifiable&&m.maxParSeconde<=r.seuils.flashsParSeconde&&!r.err.count};
}
async function catalogue(page){
 // Six fichiers de base réellement servis ; dg.ids doit rester séparé des versions accélérées.
 await page.evaluate(()=>{__N.intro.skip();__N.game.reset(7,{depart:'jeu'});__N.music.init();__N.music.start();});
 await page.mouse.click(200,180);
 await page.waitForFunction(()=>__N.music.morceaux().ids?.length===6,null,{timeout:20000});
 const dg=await page.evaluate(()=>({dg:__N.music.morceaux(),err:__ERR}));
 const base=manifest.morceaux.filter(m=>!m.base&&!m.versionDe&&!/-t\d+$/.test(m.id));
 const fichiers=[];for(const m of base){const file=m.fichier||m.file;const p=path.join(ROOT,'musique/morceaux',file);if(!fs.existsSync(p))throw Error('Fichier H absent : '+file);fichiers.push({id:m.id,fichier:file,sha256:sha(fs.readFileSync(p))});}
 const ids=dg.dg.ids||[];return{...dg,fichiers,ok:ids.length===6&&base.length===6&&base.every(m=>ids.includes(m.id))&&!(dg.dg.versions||[]).some(id=>ids.includes(id))&&!dg.err.count};
}
async function warp(page,ctx,profil){
 if(!await page.evaluate(()=>!!(__N.warp&&__N.R.warp?.jauge)))return{inclus:false};
 await page.evaluate(()=>{const N=__N,S=__S;N.intro.skip();N.game.reset(7,{depart:'jeu'});N.game.dbg.god(true);N.pilote.arreter();N.ennemis.reset();window.__f1Cibles=[];for(let i=0;i<8;i++)__f1Cibles.push(N.ennemis.spawn('fleche',N.joueuse.tete.x+80+i*12,N.joueuse.tete.y));N.ennemis.update(2);N.fx.reset();N.hud.reset();N.warp.charger(N.R.warp.jauge.max);__N.journal.actif(true);window.__f1Touch=[];document.getElementById('app').addEventListener('touchend',e=>__f1Touch.push({trusted:e.isTrusted,touches:e.touches.length,changed:e.changedTouches.length}),{passive:true});window.__f1WarpTrace=[];window.__f1WarpStop=false;window.__f1ScoreAvant=N.score.score;function observer(){if(__f1WarpStop)return;const st=N.warp.state();if(N.warp.capte())for(const e of __f1Cibles)if(e&&e.pv>0){e.x=N.cam.x+N.gfx.W*.5;e.y=N.cam.y+N.gfx.H*.5;N.warp.verrouiller(e);}__f1WarpTrace.push({phase:st.phase,n:st.n,t:N.horloge.t(),pv:__f1Cibles.map(e=>e?.pv)});__f1RAF(observer);}window.requestAnimationFrame=__f1RAF;__f1Frame(performance.now());__f1RAF(observer);});
 const before=await page.evaluate(()=>__N.warp.state().n);
 if(profil==='bureau'){await page.keyboard.press('e');}else{const cdp=await ctx.newCDPSession(page);const stick={id:1,x:100,y:150,radiusX:1,radiusY:1},action={id:2,x:300,y:150,radiusX:1,radiusY:1};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick]});await page.evaluate(()=>new Promise(ok=>{const t=performance.now();function f(){if(performance.now()-t>=__N.R.gestes.delaiAction*1000)ok();else __f1RAF(f);}__f1RAF(f);}));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick,action]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 await page.waitForFunction(n=>__N.warp.state().n>n,before,{timeout:6000}).catch(()=>{});
 const debut=await page.evaluate(()=>({state:__N.warp.state(),touch:window.__f1Touch,input:{pouvoir:__S.input.pouvoir,apogee:__S.input.apogee}}));
 await page.waitForFunction(()=>__N.warp.state().phase==='repos',null,{timeout:20000}).catch(()=>{});
 const fin=await page.evaluate(()=>{window.__f1WarpStop=true;const st=__N.warp.state(),ev=st.journal.filter(e=>['salve','tir','impact','fin'].includes(e.evt)),maxEcart=ev.length?Math.max(...ev.map(e=>Math.abs(e.ecart))):null;return{state:st,journal:__N.journal.dump(),evenements:ev,maxEcart,tolerance:__N.R.warp.grilleTolerance,scoreAvant:__f1ScoreAvant,scoreApres:__N.score.score,morts:__f1Cibles.filter(e=>e&&(e.pv<=0||e.etat==='mort')).length,trace:__f1WarpTrace,err:__ERR};});
 return{inclus:true,portee:'Déclenchement par geste CDP réel ; cibles contrôlées et locks par API publique pour mesurer les sorties de salve. Pas un verdict sur la visée tactile.',before,debut,fin,ok:debut.state.n===before+1&&debut.state.raison==='jauge'&&fin.state.phase==='repos'&&fin.evenements.some(e=>e.evt==='impact')&&fin.evenements.some(e=>e.evt==='fin')&&fin.morts>0&&fin.scoreApres>fin.scoreAvant&&fin.maxEcart!==null&&fin.maxEcart<=fin.tolerance&&!fin.err.count&&(profil==='bureau'||debut.touch.some(t=>t.trusted&&t.changed>=1))};
}
try{
 if(held){if(!fs.existsSync(LOCK))throw Error('--verrou-detenu exige le verrou existant du Chef.');}else{fs.mkdirSync(LOCK);owner=true;fs.writeFileSync(path.join(LOCK,'codex-f1.pid'),String(process.pid),{flag:'wx'});}
 server=http.createServer((req,res)=>{res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; media-src 'self' data: blob:");const u=new URL(req.url,'http://local');if(u.pathname==='/'||u.pathname==='/index.html'){res.setHeader('Content-Type','text/html');return res.end(bundle);}const f=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.mp3':'audio/mpeg','.mp4':'video/mp4','.png':'image/png'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
 await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--disable-background-networking','--autoplay-policy=no-user-gesture-required']}); /* cheffe 24/10 06 h 20 : Chrome pour lire les films H.264 */out.chromium=browser.version();
 for(const profil of Object.keys(profils)){
 const result={profil,parties:[],scenes:null,r13:null,catalogueH:null,warp:null,preavis:null,interfaceG1:null,pixels:[]};out.profils.push(result);save();
 // Contextes vierges sans déverrouillage audio pour la simulation déterministe.
 for(const [pilote,graine]of [['dieu',graineComplete],...Array.from({length:10},(_,i)=>['bon',i+1])]){
 const {ctx,page,errors}=await ouvrir(profil,origin);try{const r=await partie(page,pilote,graine);const file=`${profil}-${pilote}-${graine}.json.gz`;fs.writeFileSync(path.join(OUT,file),zlib.gzipSync(JSON.stringify(r)));const admissions=compterAdmissions([r],r.seuils.R14.banniere);result.parties.push({pilote,graine,file,raison:r.raison,etat:r.etat,temps:r.tempsJeu,score:r.score,vague:r.vague,cyclope:r.cyclope,r14:{part:r.partSecouee,...admissions},errors,err:r.err,ok:r.etat==='fin'&&!r.err.count&&!errors.length&&(pilote==='dieu'?r.cyclope:r.partSecouee<=r.seuils.R14.secouees&&admissions.present&&!admissions.trop)});result.pixels.push(await pixels(page,`${profil}-${pilote}-${graine}`));}finally{await ctx.close();save();}}
 {const {ctx,page,errors}=await ouvrir(profil,origin);try{result.r13=await r13(page,profil);result.r13.errors=errors;}finally{await ctx.close();save();}}
 {const {ctx,page,errors}=await ouvrir(profil,origin);try{result.scenes=await page.evaluate(scenes);result.scenes.photosensibilite=result.scenes.cas.map(x=>result.scenes.visuel.length?({scene:x.id,...flashs(result.scenes.visuel.filter(v=>v.scene===x.id),result.scenes.seuils.aire,result.scenes.dt)}):({scene:x.id,mesure:null,raison:x.raison}));result.scenes.ok=result.scenes.ok&&result.scenes.photosensibilite.every(x=>x.qualifiable&&x.maxParSeconde<=result.scenes.seuils.flashsParSeconde);result.scenes.errors=errors;fs.writeFileSync(path.join(OUT,profil+'-scenes.json'),JSON.stringify(result.scenes,null,2));result.pixels.push(await pixels(page,profil+'-scenes'));}finally{await ctx.close();save();}}
 {const {ctx,page,errors}=await ouvrir(profil,origin);try{const inclus=await page.evaluate(()=>!!(__N.ennemis.observerTele&&__N.R.tests.codexP42));const r=inclus?await page.evaluate(casPreavis):await page.evaluate(()=>({inclus:false,raison:'p44b écarté après deux contrôles non concluants',err:window.__ERR,tests:[],pixels:[]}));const {pixels,...reste}=r;result.preavis={...reste,inclus,errors,pixelsSha256:sha(Buffer.from(pixels)),ok:inclus&&!r.err.count&&!errors.length&&r.tests.every(t=>t.ok)&&pixels.every(v=>v>=0&&v<16)};}finally{await ctx.close();save();}}
 {const {ctx,page,errors}=await ouvrir(profil,origin);try{const r=await page.evaluate(interfaceG1);const {pixels,...reste}=r;result.interfaceG1={...reste,errors,pixelsSha256:pixels?sha(Buffer.from(pixels)):null};}finally{await ctx.close();save();}}
 {const {ctx,page,errors}=await ouvrir(profil,origin);try{result.catalogueH=await catalogue(page);result.catalogueH.errors=errors;}finally{await ctx.close();save();}}
 {const {ctx,page,errors}=await ouvrir(profil,origin);try{result.warp=await warp(page,ctx,profil);result.warp.errors=errors;result.pixels.push(await pixels(page,profil+'-warp'));await page.screenshot({path:path.join(OUT,profil+'-warp.png')});}finally{await ctx.close();save();}}
 }
 // Fermer le navigateur F1 AVANT le banc H original : jamais deux Chromium.
 await browser.close();browser=null;
 const hLog=fs.openSync(path.join(OUT,'H-original.log'),'w');
 const hCode=await new Promise((ok,ko)=>{const c=spawn(process.execPath,[path.join(ROOT,'tools/H/morceaux.mjs'),'--url',origin+'/index.html','--profil','tous'],{stdio:['ignore',hLog,hLog]});c.on('error',ko);c.on('exit',ok);});fs.closeSync(hLog);out.HOriginal={code:hCode,log:'H-original.log',ok:hCode===0,portee:'Le banc original inclut des 404 intentionnels pour vérifier le repli ; distincts des erreurs des parties normales.'};save();
 out.ok=out.HOriginal.ok&&out.profils.length===3&&out.profils.every(p=>p.parties.length===11&&p.parties.every(x=>x.ok)&&p.r13?.ok&&p.scenes?.ok&&p.catalogueH?.ok&&(!p.preavis?.inclus||p.preavis.ok)&&(!p.interfaceG1?.inclus||p.interfaceG1.ok)&&(!p.warp?.inclus||p.warp.ok)&&p.pixels.every(x=>!x.horsPalette&&!x.err.count)&&[p.r13,p.scenes,p.catalogueH,p.warp,p.preavis,p.interfaceG1].every(x=>!x.errors?.length));if(!out.ok)process.exitCode=1;
}catch(e){out.erreurs.push(String(e.stack||e));out.ok=false;process.exitCode=1;}finally{save();if(browser)await browser.close();if(server?.listening)await new Promise(r=>server.close(r));if(owner){fs.unlinkSync(path.join(LOCK,'codex-f1.pid'));fs.rmdirSync(LOCK);}}
console.log(JSON.stringify({ok:out.ok,resultats:path.join(OUT,'resultats.json'),erreurs:out.erreurs}));

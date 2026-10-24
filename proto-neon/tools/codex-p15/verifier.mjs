// HORS BAC UNIQUEMENT : cd proto-neon && node tools/codex-p15/verifier.mjs
// Un seul Chromium, muet. Mesures réelles : tampon, état, journal ; critères officiels inchangés.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {Banc,options,mesurerCritere} from '../mesure/commun.mjs';
import * as R12 from '../mesure/criteres/R-12-explosion.mjs';
import * as R05 from '../mesure/criteres/R-05-mourir.mjs';
import * as R13 from '../mesure/criteres/R-13-photosensibilite.mjs';
import {verifierCauses} from './causes.mjs';
// Le processus parent n'ouvre aucun navigateur ; les deux phases sont strictement séquentielles.
if(!process.argv.includes('--phase')){
 const ici=path.dirname(fileURLToPath(import.meta.url)),resultats=[];
 for(const phase of ['avant','apres']){
  const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--phase',phase],{stdio:'inherit'});
  const f=path.join(ici,'navigateur-'+phase,'sortie.json');
  resultats.push({phase,code:r.status,resultat:fs.existsSync(f)?JSON.parse(fs.readFileSync(f)):null,erreur:r.error?.message});
 }
 fs.writeFileSync(path.join(ici,'navigateur-comparaison.json'),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),resultats},null,2));
 process.exit(resultats.some(x=>x.code!==0)?1:0);
}
const ICI=path.dirname(fileURLToPath(import.meta.url)),PROTO=path.resolve(ICI,'../..'),PHASE=process.argv[3];
if(!['avant','apres'].includes(PHASE))throw Error('phase avant ou apres requise');
const BUNDLE=path.join(ICI,PHASE==='avant'?'avant/index.html':'apres.html'),SORTIE=path.join(ICI,'navigateur-'+PHASE);fs.mkdirSync(SORTIE,{recursive:true});
const rapport={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(BUNDLE)).digest('hex'),limite:'Chromium avec émulation iPhone ; Safari réel reste à contrôler',profils:[],criteres:[]};
const save=()=>fs.writeFileSync(path.join(SORTIE,'sortie.json'),JSON.stringify(rapport,null,2));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.mp4':'video/mp4','.mp3':'audio/mpeg','.png':'image/png'};
const server=http.createServer((req,res)=>{
 try{const p=decodeURIComponent(new URL(req.url,'http://local').pathname),f=p==='/'||p==='/index.html'?BUNDLE:path.resolve(PROTO,'.'+p);
 if(!f.startsWith(PROTO+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
 const st=fs.statSync(f),range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||''),headers={'Content-Type':types[path.extname(f)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
 if(range){const start=+range[1],end=range[2]?+range[2]:st.size-1;res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${st.size}`,'Content-Length':end-start+1});return fs.createReadStream(f,{start,end}).pipe(res);}
 res.writeHead(200,{...headers,'Content-Length':st.size});fs.createReadStream(f).pipe(res);
 }catch(e){res.writeHead(400);res.end(String(e));}
});
let browser,banc;
try{
 await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});const url=`http://127.0.0.1:${server.address().port}/index.html`;
 browser=await chromium.launch({args:['--mute-audio']});rapport.chromium=browser.version();
 const profils={paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900},hasTouch:false}};
 for(const [nom,profil] of Object.entries(profils)){
  const ctx=await browser.newContext(profil),p=await ctx.newPage(),erreurs=[];p.on('pageerror',e=>erreurs.push(e.message));p.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await p.addInitScript(()=>{window.__SEED=7;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
  await p.goto(url+'?journal=1',{waitUntil:'load'});
  const rendu=await p.evaluate(()=>{const N=window.__N;localStorage.clear();N.intro.skip();N.game.reset(7,{depart:'jeu'});N.game.dbg.scene('calme');N.game.dbg.god(true);N.horloge.avancer();N.game.dbg.simuler(0.25);N.gfx.origin(0,0);N.gfx.clear(0);N.game.draw();N.fx.draw();N.game.drawTop();N.gfx.origin(0,0);N.fx.drawEcran();N.gfx.present();const b=N.gfx.buf(),histogramme=new Array(N.pal.C.length).fill(0);let horsPalette=0;for(const ci of b){if(ci<histogramme.length)histogramme[ci]++;else horsPalette++;}return {etat:N.game.etat(),tampon:{w:N.gfx.W,h:N.gfx.H,histogramme,horsPalette},journal:N.journal.dump(),err:window.__ERR};});
  const causes=await p.evaluate(verifierCauses);await p.screenshot({path:path.join(SORTIE,nom+'.png')});rapport.profils.push({nom,profil,rendu,causes,erreurs});save();await ctx.close();
 }
 // Contrôle réduit de la SEULE scène : même rayon d'onde au début et à la fin, zéro secousse,
 // pixels brasier présents, y compris quand setShake(1) précède l'événement.
 const ctx=await browser.newContext({...profils.paysage,reducedMotion:'reduce'}),p=await ctx.newPage();
 await p.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.__DT=1/60;});await p.goto(url+'?journal=1');
 rapport.reduit=await p.evaluate(()=>{const N=window.__N,S=N.S;localStorage.clear();N.intro.skip();N.game.reset(7,{depart:'jeu'});N.fx.reset();N.scene.reset();N.fx.setShake(1);const x=N.cam.x+N.gfx.W/2,y=N.cam.y+N.gfx.H/2,ondes=[],f=N.fx.onde;N.fx.onde=function(...a){ondes.push(a);return f.apply(this,a);};const e=N.ennemis.spawn('fleche',x,y,{elite:'flecheBlindee'});e.x=x;e.y=y;N.ennemis.hit(e,(e.pvMax||e.pv)*4,{genre:'arme',type:'canon',id:0});const trace=[];for(let i=0;i<30;i++){S.frame++;N.fx.update(N.R.temps.imageRef);N.gfx.clear(0);N.gfx.origin(N.cam.x,N.cam.y);N.fx.draw();N.gfx.origin(0,0);N.fx.drawEcran();const b=N.gfx.buf();let br=0;for(const c of b)if(c===N.pal.i('brasier'))br++;trace.push({brasier:br/b.length,shake:S.shake});}let suite=0,brasierImages=0;for(const q of trace){suite=q.brasier>N.R.criteres.R12.brasier?suite+1:0;brasierImages=Math.max(brasierImages,suite);}return {ondes,trace,brasierImages,imagesRequises:N.R.criteres.R12.images,placement:'isolé au centre de la vue, position publique après spawn ; ne remplace pas R-12',err:window.__ERR,journal:N.journal.dump()};});await ctx.close();
 await browser.close();browser=null;save();
 // Le banc ouvre à son tour UN Chromium, jamais en même temps que le contrôle des profils.
 banc=new Banc({...options(['--graines','1-10','--sans-cache']),url,sortie:path.join(SORTIE,'criteres')});await banc.demarrer();
 for(const profil of ['paysage','portrait','bureau']){const mod={meta:{...R12.meta,id:'R-12-'+profil},mesurer:(b,r)=>R12.mesurer(b,r,{profil})};rapport.criteres.push(await mesurerCritere(banc,mod));save();}
 for(const mod of [R05,R13]){rapport.criteres.push(await mesurerCritere(banc,mod));save();}
 const R13Reduit={meta:{...R13.meta,id:'R-13-reduit'},mesurer:async(b,res)=>{const ouvrir=b.ouvrir.bind(b);b.ouvrir=(profil,opts)=>ouvrir(profil,{...opts,reducedMotion:'reduce'});return R13.mesurer(b,res);}};
 rapport.r13Reduit=await mesurerCritere(banc,R13Reduit);save();
 rapport.r13Profils=[];
 for(const profil of ['portrait','bureau'])for(const reduit of [false,true]){
  const mod={meta:{...R13.meta,id:'R-13-'+profil+(reduit?'-reduit':'')},mesurer:async(b,res)=>{const ouvrir=b.ouvrir.bind(b);b.ouvrir=(_profil,opts)=>ouvrir(profil,{...opts,reducedMotion:reduit?'reduce':'no-preference'});return R13.mesurer(b,res);}};
  rapport.r13Profils.push(await mesurerCritere(banc,mod));save();
 }
 await banc.fermer();banc=null;
 const echecs=rapport.profils.some(p=>p.rendu.err.count||p.rendu.tampon.horsPalette||p.erreurs.length||p.causes.some(c=>c.death?.cause!==c.attendu||c.err))||rapport.reduit.err.count||!rapport.reduit.ondes.length||rapport.reduit.brasierImages<rapport.reduit.imagesRequises||rapport.reduit.ondes.some(a=>a[2]!==a[3])||rapport.reduit.trace.some(t=>t.shake!==0)||rapport.criteres.some(c=>c.statut!=='ok')||rapport.r13Reduit?.statut!=='ok'||rapport.r13Profils.some(c=>c.statut!=='ok');
 rapport.validation= !echecs;save();if(echecs)process.exitCode=1;
}catch(e){rapport.erreur=String(e.stack||e);process.exitCode=1;save();}
finally{if(browser)await browser.close();if(banc)await banc.fermer();if(server.listening)await new Promise(r=>server.close(r));save();}

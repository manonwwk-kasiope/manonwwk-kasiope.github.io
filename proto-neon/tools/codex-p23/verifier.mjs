/* HORS BAC UNIQUEMENT, depuis la racine : node proto-neon/tools/codex-p23/verifier.mjs
   Avant/après R-28/R-11 sur trois profils, puis bancs 01b/p13 inchangés, séquentiels.
   Aucun serveur ni navigateur n'est lancé lors des vérifications syntaxiques. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {installerLot} from './sonde.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),OUT=path.join(HERE,'navigateur');fs.mkdirSync(OUT,{recursive:true});
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const fichiers={avant:path.join(HERE,'avant/index.html'),apres:path.join(ROOT,'index.html')};
let bundle,nav;const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'Chromium émulé, pas Safari réel. Les échecs avant sont conservés.',phases:[],bancs:[]};
const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(sortie,null,2)+'\n');
const serveur=http.createServer((req,res)=>{let f;try{const u=new URL(req.url,'http://local').pathname;if(u==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(bundle);}f=path.resolve(ROOT,'.'+decodeURIComponent(u));}catch{res.writeHead(400);return res.end();}if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}const types={'.html':'text/html','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json'};res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
async function ouvrir(opts,reduit){const ctx=await nav.newContext({...opts,reducedMotion:reduit?'reduce':'no-preference'}),page=await ctx.newPage(),erreurs=[];page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});await page.addInitScript(()=>{window.__SEED=7;window.__DT=1/60;window.requestAnimationFrame=cb=>{window.__p23raf=cb;return 1;};window.cancelAnimationFrame=()=>{};window.__p23step=()=>{if(!window.__p23raf)throw Error('RAF absente');const f=window.__p23raf;window.__p23raf=null;f((window.__FRAME||0)*1000/60);};});await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html?journal=1`,{waitUntil:'load'});await page.addScriptTag({path:path.join(ROOT,'tools/mesure/sonde.js')});await page.evaluate('('+installerLot.toString()+')(window)');return {ctx,page,erreurs};}
async function capture(page,nom){const data=await page.evaluate(()=>{const N=window.__N,g=N.gfx,b=g.buf(),c=document.createElement('canvas');c.width=g.W;c.height=g.H;const x=c.getContext('2d'),im=x.createImageData(g.W,g.H);for(let i=0;i<b.length;i++){const v=parseInt(N.pal.C[b[i]].slice(1),16);im.data[i*4]=v>>16;im.data[i*4+1]=(v>>8)&255;im.data[i*4+2]=v&255;im.data[i*4+3]=255;}x.putImageData(im,0,0);return c.toDataURL().split(',')[1];});fs.writeFileSync(path.join(OUT,nom+'-tampon.png'),Buffer.from(data,'base64'));await page.screenshot({path:path.join(OUT,nom+'-ecran.png')});}
try{await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});nav=await chromium.launch({args:['--mute-audio']});sortie.chromium=nav.version();
 for(const [phase,file]of Object.entries(fichiers)){bundle=fs.readFileSync(file);const r={phase,sha256:crypto.createHash('sha256').update(bundle).digest('hex'),cas:[]};sortie.phases.push(r);
  for(const [profil,opts]of profils){
   const t=await ouvrir(opts,true);try{const mesure=await t.page.evaluate(()=>window.__P23.r28());r.cas.push({profil,critere:'R-28',mesure,erreurs:t.erreurs});await capture(t.page,phase+'-'+profil+'-r28');save();}finally{await t.ctx.close();}
   for(const scene of ['calme','montee','chaos','colosse']){const t=await ouvrir(opts,false);try{const mesure=await t.page.evaluate(scene=>window.__P23.r11(scene),scene);const a=mesure.analyse,gaine=mesure.dirigee?.gaine||a.gaine;mesure.ok=a.masque&&a.decorLumineux>=.18&&a.decorLumineux<=.28&&!a.decorCyan&&a.decorMagenta<.005&&a.vide<.3&&gaine?.bord>0&&gaine.part===1;r.cas.push({profil,critere:'R-11',mesure,erreurs:t.erreurs});await capture(t.page,phase+'-'+profil+'-'+scene);save();}finally{await t.ctx.close();}}
  }
 }
}catch(e){sortie.erreur=String(e.stack||e);process.exitCode=1;}finally{if(nav)await nav.close();await new Promise(r=>serveur.close(r));save();}
// Les outils existants possèdent leur serveur et leur Chromium : seulement APRÈS fermeture du précédent.
async function banc(nom,args){const code=await new Promise((ok,ko)=>{const p=spawn(process.execPath,args,{cwd:ROOT,stdio:'inherit'});p.on('error',ko);p.on('exit',ok);});sortie.bancs.push({nom,args,code});save();return code;}
if(!sortie.erreur)for(const phase of ['avant','apres']){
 await banc('lisibilite-'+phase,['tools/lisibilite/banc-01b.mjs','--phase',phase,'--bundle',fichiers[phase],'--outdir',path.join(OUT,'lisibilite'),'--ambiance-a']);
 await banc('p13-'+phase,['tools/codex-p23/p13-navigateur.mjs','--phase',phase,'--bundle',fichiers[phase]]);
}
// Les critères complets restent distincts du corpus dirigé ci-dessus : parties dieu réduites,
// lumière à 1/30 s, référence SNAKE 2030 si disponible, médianes d'une partie du pilote bon.
if(!sortie.erreur){
 await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
 try{for(const phase of ['avant','apres']){bundle=fs.readFileSync(fichiers[phase]);for(const critere of ['R-28-mouvement-reduit','R-11-lumiere'])await banc(critere+'-'+phase,['tools/mesure/criteres/'+critere+'.mjs','--url',`http://127.0.0.1:${serveur.address().port}/index.html`,'--sortie',path.join(OUT,'criteres-'+phase),'--sans-cache']);}}
 finally{await new Promise(r=>serveur.close(r));}
}
// La nouvelle ambiance modifie volontairement le ciel : --ambiance-a conserve tous les seuils couleurs/performance,
// seule l'égalité d'empreinte du ciel n'est plus exigée. Les deux empreintes sont toujours publiées par 01b.
const apres=sortie.phases.find(x=>x.phase==='apres');sortie.conforme=!!apres&&apres.cas.length===15&&apres.cas.every(x=>x.mesure.ok&&!x.mesure.err.count&&!x.erreurs.length)&&sortie.bancs.filter(x=>x.nom.endsWith('apres')).every(x=>x.code===0);save();if(!sortie.conforme)process.exitCode=1;

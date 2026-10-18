/* Hors bac : cd proto-neon && node tools/codex-p22/verifier.mjs
   Ajout --criteres : exécuter également R-27/R-03 complets avant/après, sans cache.
   Un seul Chromium muet. Aucun lancement de serveur/navigateur dans la session de développement. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {construire,verdictCas} from './cas.mjs';import {raccorder} from './raccords.mjs';
import {encodeIndex} from '../mesure/png.mjs';
import {Banc,options,mesurerCritere} from '../mesure/commun.mjs';
import * as R27 from '../mesure/criteres/R-27-sans-le-son.mjs';import * as R03 from '../mesure/criteres/R-03-cyan-reserve.mjs';
const ICI=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(ICI,'../..'),OUT=path.join(ICI,'navigateur');
fs.mkdirSync(OUT,{recursive:true});
const src=fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')).sort().map(f=>[f,fs.readFileSync(path.join(ROOT,'src',f),'utf8')]);
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
for(const [nom,texte]of src)if(!html.includes(texte))throw new Error('Reconstruire index.html : '+nom+' diffère');
const remplace=ss=>{let h=html;for(const [n,t] of ss){const ancien=src.find(([a])=>a===n)[1];if(ancien!==t)h=h.replace(ancien,()=>t);}return h;};
const avant=src.map(([n,t])=>[n,['02-regles.js','17-vol.js','73-arene.js','03-socle.js','79-scene.js'].includes(n)?fs.readFileSync(path.join(ICI,n.replace('.js','-avant.js')),'utf8'):t]);
const apres=src;
// Les raccords peuvent déjà avoir été intégrés par la cheffe : ne pas les doubler.
const integres=src.find(([n])=>n==='79-scene.js')[1].includes("journalDanger('battement')") && src.find(([n])=>n==='03-socle.js')[1].includes("'battementFin'");
const variantes={avant:remplace(avant),apres:html,raccords:integres?html:remplace(raccorder(src))};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://local'),m=u.pathname.match(/^\/(avant|apres|raccords)\/(.*)$/);
 if(!m){res.writeHead(404);return res.end();}
 if(m[2]==='index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(variantes[m[1]]);}
 const f=path.resolve(ROOT,m[2]);if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
 const types={'.js':'text/javascript','.json':'application/json','.mp3':'audio/mpeg','.mp4':'video/mp4','.png':'image/png'};
 res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
});
let browser;
const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),raccordsIntegres:integres,cas:[],criteres:[],hashes:Object.fromEntries(Object.entries(variantes).map(([k,h])=>[k,crypto.createHash('sha256').update(h).digest('hex')]))};
const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(bilan,null,2)+'\n');
const profils={paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900}}};
try{
 await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});
 browser=await chromium.launch({args:['--mute-audio']});bilan.chromium=browser.version();
 for(const phase of Object.keys(variantes))for(const [profil,config]of Object.entries(profils))for(const nom of ['calme','vol','convoi','travelling','battement','sillage','fondCyan']){
  const ctx=await browser.newContext(config),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
   await page.addInitScript(()=>{window.__SEED=7;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
   await page.goto(`http://127.0.0.1:${server.address().port}/${phase}/index.html?journal=1`,{waitUntil:'load'});
   const mediasPrets=await page.evaluate(async()=>{const a=window.__N.art;if(a&&a.load)await a.load();return !!(a&&a.ready&&a.ready());});
   const r=await page.evaluate(construire,{nom,pixels:true});
   const palette=await page.evaluate(()=>window.__N.pal.C.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]));
   const sauvegarde=(a,tag)=>{if(!a.buf)return;const f=`${phase}-${profil}-${nom}-${tag}.png`;fs.writeFileSync(path.join(OUT,f),encodeIndex(a.W,a.H,Buffer.from(a.buf),palette,3));a.capture=f;delete a.buf;delete a.masque;};
   if(r.images)r.images.forEach((a,i)=>sauvegarde(a,''+i));if(r.image)sauvegarde(r.image,'image');sauvegarde(r,'signe');
   // L'écran de la page contient le dernier tampon, agrandi sans réécrire le rendu.
   await page.evaluate(()=>window.__N.gfx.present());
   await page.screenshot({path:path.join(OUT,`${phase}-${profil}-${nom}-ecran.png`)});
   bilan.cas.push({phase,profil,mediasPrets,...r,erreursConsole:errors});
  }catch(e){bilan.cas.push({phase,profil,nom,exception:String(e),erreursConsole:errors});}finally{await ctx.close();save();}
 }
 if(process.argv.includes('--criteres'))for(const phase of ['avant','raccords']){
  const sortie=path.join(OUT,phase),banc=new Banc({...options(['--sans-cache']),url:`http://127.0.0.1:${server.address().port}/${phase}/index.html`,sortie});
  banc.nav=browser;banc.empreinte=bilan.hashes[phase];banc.instrument='codex-p22';
  // Les sessions des critères utilisent la boucle RAF normale, toujours le même navigateur.
  for(const mod of [R27,R03])bilan.criteres.push({phase,...await mesurerCritere(banc,mod)});
 }
 bilan.finParis=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
 const finaux=bilan.cas.filter(x=>x.phase==='raccords');
 const criteresFinaux=bilan.criteres.filter(x=>x.phase==='raccords');
 bilan.criteresConformes=process.argv.includes('--criteres')?criteresFinaux.length===2&&criteresFinaux.every(x=>x.statut==='ok'):null;
 bilan.candidatConforme=finaux.length===21&&finaux.every(verdictCas)&&bilan.criteresConformes!==false;
 bilan.conforme=bilan.candidatConforme&&integres;
 if(!bilan.conforme)process.exitCode=1;
}finally{save();if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));}
console.log(JSON.stringify({conforme:bilan.conforme,candidatConforme:bilan.candidatConforme,raccordsIntegres:integres,sortie:path.join(OUT,'resultats.json')}));

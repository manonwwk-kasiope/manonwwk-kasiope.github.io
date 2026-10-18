/* HORS BAC UNIQUEMENT, depuis la racine : node proto-neon/tools/codex-p32/verifier.mjs
   Trois profils en série, UN Chromium muet. Ne pas exécuter dans le bac restrictif.
   --criteres ajoute les critères officiels inchangés R-11, R-06 et R-13 (campagne complète).
   Les échecs avant et après restent enregistrés ; aucune baisse de seuil. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';import {chromium,devices} from 'playwright';
import {installer} from './sonde.mjs';import {installer as installerP10,analyser} from '../codex-p10/sonde.mjs';
const H=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(H,'../..'),OUT=path.join(H,'navigateur');
fs.mkdirSync(OUT,{recursive:true});
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const result={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'Chromium émulé, ne qualifie pas Safari réel.',versions:[],criteres:[]};
let bundle,nav;
const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(result,null,2)+'\n');
const serveur=http.createServer((req,res)=>{
 let file;try{const u=new URL(req.url,'http://local').pathname;
 if(u==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(bundle);}
 file=path.resolve(ROOT,'.'+decodeURIComponent(u));}catch{res.writeHead(400);return res.end();}
 if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':({'.html':'text/html','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json','.js':'text/javascript'})[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
async function ouvrir(opts){
 const ctx=await nav.newContext(opts),page=await ctx.newPage(),erreurs=[];
 page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
 await page.addInitScript(()=>{window.__SEED=7;window.__DT=1/60;window.requestAnimationFrame=cb=>{window.__p32raf=cb;return 1;};window.cancelAnimationFrame=()=>{};
 window.__p32step=()=>{if(!window.__p32raf)throw Error('RAF absente');const f=window.__p32raf;window.__p32raf=null;f((window.__FRAME||0)*1000/60);};});
 try{await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html?journal=1`,{waitUntil:'load'});
 await page.addScriptTag({path:path.join(ROOT,'tools/mesure/sonde.js')});await page.evaluate('('+installer.toString()+')(window)');return {ctx,page,erreurs};}
 catch(e){await ctx.close();throw e;}
}
async function capture(page,nom){
 const a=await page.evaluate(()=>{const N=window.__N,g=N.gfx;return {w:g.W,h:g.H,pal:N.pal.C,buf:Array.from(g.buf()),masque:Array.from(g.mask()||[])};});
 fs.writeFileSync(path.join(OUT,nom+'-tampon.json'),JSON.stringify(a));
 const png=await page.evaluate(a=>{const c=document.createElement('canvas');c.width=a.w;c.height=a.h;const x=c.getContext('2d'),im=x.createImageData(a.w,a.h);
 for(let i=0;i<a.buf.length;i++){const v=parseInt(a.pal[a.buf[i]].slice(1),16);im.data[i*4]=v>>16;im.data[i*4+1]=(v>>8)&255;im.data[i*4+2]=v&255;im.data[i*4+3]=255;}x.putImageData(im,0,0);return c.toDataURL().split(',')[1];},a);
 fs.writeFileSync(path.join(OUT,nom+'-tampon.png'),Buffer.from(png,'base64'));await page.screenshot({path:path.join(OUT,nom+'-ecran.png')});
}
try{
 await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
 nav=await chromium.launch({args:['--mute-audio']});result.chromium=nav.version();
 for(const [version,file]of [['avant',path.join(H,'avant/index.html')],['apres',path.join(ROOT,'index.html')]]){
  bundle=fs.readFileSync(file);const r={version,sha256:crypto.createHash('sha256').update(bundle).digest('hex'),r11:[],construits:[],r13:[]};result.versions.push(r);
  for(const [profil,opts]of profils){
   {const t=await ouvrir(opts);try{const mesure=await t.page.evaluate(()=>window.__P32.r11());r.r11.push({profil,...mesure,erreursConsole:t.erreurs});await capture(t.page,version+'-'+profil+'-r11');save();}finally{await t.ctx.close();}}
   for(const phase of [1,2,3]){const t=await ouvrir(opts);try{
    await t.page.evaluate(p=>window.__P32.preparer(p),phase);
    for(const quartier of await t.page.evaluate(()=>window.__N.decor.QUARTIERS)){
     const mesure=await t.page.evaluate(q=>window.__P32.construit(q),quartier);r.construits.push({profil,phase,...mesure,erreursConsole:[...t.erreurs]});
     if(quartier==='eclipse')await capture(t.page,version+'-'+profil+'-phase'+phase);save();
    }
   }finally{await t.ctx.close();}}
   for(const scene of ['charge','boss3','mort-cyclope']){const t=await ouvrir(opts);try{
    await t.page.evaluate('('+installerP10.toString()+')(window)');
    const mesure=await t.page.evaluate(scene=>{const P=window.__P10;P.preparer(scene);const images=[];
     for(let f=0;f<window.__N.R.lisibiliteP10.mesure.images;f++){P.stimuler(f);window.__p32step();images.push(P.lire(f));}return {scene,images,...P.bilan()};},scene);
    r.r13.push({...analyser({profil,...mesure}),erreursConsole:t.erreurs});save();
   }finally{await t.ctx.close();}}
  }
 }
 await nav.close();nav=null;
 // Banc officiel : son propre Chromium est ouvert seulement après la fermeture du précédent.
 if(process.argv.includes('--criteres')){
  const {Banc,options,mesurerCritere}=await import('../mesure/commun.mjs');
  for(const version of ['avant','apres']){
   bundle=fs.readFileSync(version==='avant'?path.join(H,'avant/index.html'):path.join(ROOT,'index.html'));
   for(const f of ['R-11-lumiere.mjs','R-06-apparitions.mjs','R-13-photosensibilite.mjs']){
    const mod=await import('../mesure/criteres/'+f),banc=new Banc({...options(['--sans-cache']),url:`http://127.0.0.1:${serveur.address().port}/index.html`,sortie:path.join(OUT,'criteres-'+version)});
    try{await banc.demarrer();result.criteres.push({version,id:mod.meta.id,resultat:await mesurerCritere(banc,mod)});save();}finally{await banc.fermer();}
   }
  }
 }
 const a=result.versions.find(r=>r.version==='apres');
 result.cibleValidee=a.r11.every(x=>x.analyse.gaine?.part===1&&!x.err.count&&!x.erreursConsole.length)&&a.construits.every(x=>x.isole.analyse.gaine?.part===1&&!x.cyan&&!x.isole.err.count&&!x.erreursConsole.length)&&a.r13.every(x=>x.ok&&!x.erreursConsole.length);
 result.reservesComposition=a.construits.filter(x=>x.compose.analyse.gaine?.bord&&x.compose.analyse.gaine.part!==1).map(x=>({profil:x.profil,phase:x.phase,quartier:x.quartier,gaine:x.compose.analyse.gaine}));
 if(!result.cibleValidee||result.reservesComposition.length||result.criteres.some(c=>c.version==='apres'&&c.resultat.statut==='echec'))process.exitCode=1;
}catch(e){result.erreur=String(e.stack||e);process.exitCode=1;}
finally{if(nav)await nav.close();if(serveur.listening)await new Promise(r=>serveur.close(r));save();}
console.log(JSON.stringify({cibleValidee:result.cibleValidee,reserves:result.reservesComposition?.length,erreur:result.erreur||null}));

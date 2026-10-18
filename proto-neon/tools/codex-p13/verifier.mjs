/* HORS BAC UNIQUEMENT : cd proto-neon && node tools/codex-p13/verifier.mjs
   Un serveur sur port libre, un Chromium muet, contextes strictement en série.
   600 vraies images par scène/profil ; aucun résultat attendu n'est fabriqué. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { installer, analyser } from '../codex-p10/sonde.mjs';
import { installerDecor } from './sonde-decor.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'../..'), OUT=path.join(HERE,'navigateur');
fs.mkdirSync(OUT,{recursive:true});
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const serveur=http.createServer((req,res)=>{
 let fichier;try{fichier=path.resolve(ROOT,'.'+new URL(req.url,'http://local').pathname);}catch{res.writeHead(400);return res.end();}
 if(!fichier.startsWith(ROOT+path.sep)||!fs.existsSync(fichier)||!fs.statSync(fichier).isFile()){res.writeHead(404);return res.end();}
 const types={'.html':'text/html','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json'};
 res.writeHead(200,{'Content-Type':types[path.extname(fichier)]||'application/octet-stream'});fs.createReadStream(fichier).pipe(res);
});
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'index.html'))).digest('hex'),limite:'Chromium émulé ; Safari réel reste à vérifier. Compteur agrégé des deux familles, sans certification WCAG.',scenes:[],tetes:[],erreurs:[]};
let navigateur;
const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(sortie,null,2)+'\n');
async function ouvrir(options){
 const ctx=await navigateur.newContext(options),page=await ctx.newPage(),erreurs=[];
 page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
 await page.addInitScript(()=>{
  window.__SEED=7;window.__DT=1/60;
  window.requestAnimationFrame=cb=>{window.__p10raf=cb;return 1;};window.cancelAnimationFrame=()=>{};
  window.__p10step=()=>{if(!window.__p10raf)throw Error('RAF absente');const cb=window.__p10raf;window.__p10raf=null;cb((window.__FRAME||0)*1000/60);};
 });
 await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html?journal=1`,{waitUntil:'load'});
 await page.evaluate('('+installer.toString()+')(window)');
 await page.evaluate('('+installerDecor.toString()+')(window)');
 return {ctx,page,erreurs};
}
async function capture(page,nom){
 const img=await page.evaluate(()=>{
  const N=window.__N,g=N.gfx,b=g.buf(),C=N.pal.C,c=document.createElement('canvas');c.width=g.W;c.height=g.H;
  const x=c.getContext('2d'),im=x.createImageData(g.W,g.H);
  for(let i=0;i<b.length;i++){const v=parseInt(C[b[i]].slice(1),16);im.data[i*4]=v>>16;im.data[i*4+1]=(v>>8)&255;im.data[i*4+2]=v&255;im.data[i*4+3]=255;}x.putImageData(im,0,0);return c.toDataURL('image/png').split(',')[1];
 });fs.writeFileSync(path.join(OUT,nom+'.png'),Buffer.from(img,'base64'));
 await page.screenshot({path:path.join(OUT,nom+'-ecran.png')});
}
try{
 await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
 navigateur=await chromium.launch({args:['--mute-audio']});sortie.chromium=navigateur.version();
 for(const [profil,options]of profils){
  for(const scene of ['charge','boss3','mort-cyclope']){
   const {ctx,page,erreurs}=await ouvrir(options);
   try{
    const donnees=await page.evaluate(scene=>{
     const P=window.__P10;P.preparer(scene);const images=[];
     for(let f=0;f<P.cfg.images;f++){P.stimuler(f);window.__p10step();images.push({...P.lire(f),decor:window.__P13.lire()});}
     return {scene,images,...P.bilan()};
    },scene);
    const r=analyser({profil,...donnees,erreursConsole:erreurs});
    const d=donnees.images.map(i=>i.decor).filter(Boolean);r.decor={solChaudMax:Math.max(...d.map(i=>i.solChaud)),solLumineuxMax:Math.max(...d.map(i=>i.solLumineux)),cyanMax:Math.max(...d.map(i=>i.cyan))};
    if(erreurs.length||r.decor.solChaudMax>.03||r.decor.solLumineuxMax>.08||r.decor.cyanMax>0)r.ok=false;
    // Rejouer la même scène dans cette page aux images de la pire seconde n'est pas déterministe
    // (le limiteur ne se vide pas au reset) : conserver le tampon final, jamais une fausse capture du pic.
    await capture(page,profil+'-'+scene+'-final');
    sortie.scenes.push(r);save();console.log(profil,scene,r.pixels.maxParSeconde,r.ok?'OK':'ECHEC');
   }finally{await ctx.close();}
  }
  const {ctx,page,erreurs}=await ouvrir(options);
  try{
   const tetes=await page.evaluate(()=>window.__P10.tetes());
   sortie.tetes.push({profil,...tetes,erreursConsole:erreurs});await capture(page,profil+'-tete-15-2');save();
  }finally{await ctx.close();}
 }
 sortie.conforme=sortie.scenes.length===9&&sortie.scenes.every(r=>r.ok&&r.tete.mesurables>0&&r.tete.identiques===r.tete.mesurables)&&sortie.tetes.length===3&&sortie.tetes.every(r=>r.completes===48&&!r.err.count&&!r.erreursConsole.length);
 if(!sortie.conforme)process.exitCode=1;
}catch(e){sortie.erreurs.push(String(e.stack||e));process.exitCode=1;}
finally{save();if(navigateur)await navigateur.close();await new Promise(r=>serveur.close(r));}

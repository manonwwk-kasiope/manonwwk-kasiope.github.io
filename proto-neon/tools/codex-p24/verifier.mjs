/* HORS BAC : cd proto-neon && node tools/codex-p24/verifier.mjs
   Un Chromium muet, profils en série. Le raccord réservé 79 est prévisualisé en mémoire
   tant qu'il n'est pas intégré ; aucun fichier du jeu n'est modifié par ce script. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium,devices} from 'playwright';
import {scenario} from '../codex-p17/scenarios.mjs';
import {observerAttraction,mesurer,meta} from '../mesure/criteres/R-19-attraction.mjs';
import {Session,Resultat} from '../mesure/commun.mjs';
assert.ok(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url, 'Ce vérifieur se lance comme script, pas par import.');
const ICI=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(ICI,'../..'),OUT=path.join(ICI,'playwright');
fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
let apres=html,avant=html;
for(const name of ['02-regles.js','60-intro.js','80-ecrans.js','79-jeu.js']){
 const courant=fs.readFileSync(path.join(ROOT,'src',name),'utf8'),ancien=fs.readFileSync(path.join(ICI,'avant',name),'utf8');
 assert.ok(html.includes(courant),'Reconstruire index.html : '+name);
 avant=avant.replace(courant,()=>ancien);
 if(name==='79-jeu.js')apres=apres.replace(courant,()=>fs.readFileSync(path.join(ICI,'79-jeu-candidat.js'),'utf8'));
}
const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:crypto.createHash('sha256').update(html).digest('hex'),raccordIntegre:apres===html,limite:'Chromium émulé ; Safari physique reste à vérifier.',compositions:[],captures:[],r19:[]};
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://local').pathname);
 if(rel==='/avant.html'||rel==='/apres.html'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(rel==='/avant.html'?avant:apres);}
 const file=path.resolve(ROOT,'.'+rel);
 if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
let navigateur,base;
const sauver=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(resultat,null,2));
async function capture(page,id,extra={}){
 const r=await page.evaluate(()=>{
  const N=window.__N,S=window.__S,g=N.gfx,b=Array.from(g.buf());
  return {etat:N.game.etat(),ecran:S.ecran,buf:b,w:g.W,h:g.H,px:g.PX,palette:N.pal.C,err:window.__ERR,journal:N.journal.dump(),son:{global:N.music.muted(),musique:N.music.muted('musique'),effets:N.music.muted('effets')},tete:{...N.joueuse.tete}};
 });
 const b=Uint8Array.from(r.buf);delete r.buf;r.sha256=crypto.createHash('sha256').update(b).digest('hex');r.horsPalette=[...b].filter(c=>c>=r.palette.length).length;
 fs.writeFileSync(path.join(OUT,id+'.buf'),b);fs.writeFileSync(path.join(OUT,id+'.json'),JSON.stringify({...r,...extra},null,2));await page.screenshot({path:path.join(OUT,id+'.png')});
 assert.equal(r.err.count,0);assert.equal(r.horsPalette,0);return {...r,journal:undefined,id,...extra};
}
try{
 await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});base=`http://127.0.0.1:${serveur.address().port}`;
 navigateur=await chromium.launch({args:['--mute-audio']});resultat.chromium=navigateur.version();
 for(const [profil,opts]of profils){
  // Géométrie p17 : tous les stades, briefing/pause/fin. Les variantes avant conservent l'état reçu.
  for(const phase of ['avant','apres'])for(const nom of ['briefing','pause','fin'])for(const stade of ['zero','encours','faits','tout']){
   const ctx=await navigateur.newContext(opts),page=await ctx.newPage(),erreurs=[];
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   try{
    await page.addInitScript(()=>{window.__SEED=1;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
    await page.goto(`${base}/${phase}.html?journal=1`,{waitUntil:'load'});await page.evaluate(()=>window.__N.art.load());
    const r=await page.evaluate('('+scenario.toString()+')({N:window.__N,S:window.__S,...'+JSON.stringify({nom,stade,profil})+'})');delete r.tampon.data;
    const right=r.lignes.filter(l=>/^\d+\/\d+$/.test(l.texte)).map(l=>l.x+l.w);
    r.phase=phase;r.erreursConsole=erreurs;r.ok=!r.err.count&&!erreurs.length&&!r.collisions.length&&r.horsPalette===0&&r.cyan===0&&right.length===4&&right.every(x=>x===right[0])&&r.lignes.every(l=>l.pixels>0&&l.dansZone&&l.echelle>=2&&!['PROCHAIN','JOUR','SECTEUR','>'].includes(l.texte)&&!(/\b(DU|LE)$/.test(l.texte)))&&r.boutons.every(b=>b.wPt>=44&&b.hPt>=44);
    await capture(page,`${phase}-${profil}-${nom}-${stade}`);resultat.compositions.push(r);sauver();
   }finally{await ctx.close();}
  }
  // Vraie boucle d'images : aucune entrée entre titre et attraction, sans __DT imposé.
  const ctx=await navigateur.newContext(opts),page=await ctx.newPage(),erreurs=[];
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  try{
   await page.goto(`${base}/apres.html?journal=1`,{waitUntil:'load'});
   await page.evaluate(()=>{const N=window.__N,S=window.__S;localStorage.clear();S.jour=20261017;N.pilote.arreter();N.game.reset(17,{depart:'titre'});N.entree.annuler();S.input.any=false;window.__P24_DISQUE=JSON.stringify({...localStorage});window.__P24_TITRE=performance.now();});
   resultat.captures.push(await capture(page,profil+'-titre'));
   await page.waitForFunction(()=>window.__N.game.etat()==='attraction',null,{timeout:25000});
   const secondes=await page.evaluate(()=>(performance.now()-window.__P24_TITRE)/1000);
   assert.ok(Math.abs(secondes-15)<=1,'R-19 15 ± 1 s : '+secondes);
   const debut=await page.evaluate('('+observerAttraction.toString()+')(window.__N,window.__S)');
   resultat.captures.push(await capture(page,profil+'-attraction-demo',{secondes,preuve:debut}));
   for(const volet of ['galerie','records','invitation']){
    await page.waitForFunction(v=>window.__S.ecran?.retour?.volet===v,volet,{timeout:40000});
    const preuve=await page.evaluate('('+observerAttraction.toString()+')(window.__N,window.__S)');assert.ok(preuve.lignes.length&&preuve.lignes.every(l=>l.pixels>0&&l.dansZone));
    const r=await capture(page,profil+'-attraction-'+volet,{preuve});assert.ok(r.son.global&&r.son.musique&&r.son.effets);resultat.captures.push(r);
   }
   // Le premier toucher posé (sans le relever) ou la première touche arrête la borne.
   if(opts.hasTouch)await page.dispatchEvent('#app','touchstart',{touches:[{identifier:41,clientX:120,clientY:120}],changedTouches:[{identifier:41,clientX:120,clientY:120}]});else await page.keyboard.down('a');
   await page.waitForFunction(()=>window.__N.game.etat()==='titre',null,{timeout:1000});
   if(opts.hasTouch)await page.dispatchEvent('#app','touchend',{touches:[],changedTouches:[{identifier:41,clientX:120,clientY:120}]});else await page.keyboard.up('a');
   const frame=await page.evaluate(()=>window.__FRAME);await page.waitForFunction(f=>window.__FRAME>=f+3,frame);
   const retour=await page.evaluate(()=>({etat:window.__N.game.etat(),profilConserve:window.__P24_DISQUE===JSON.stringify({...localStorage}),pilote:window.__N.pilote.actif(),err:window.__ERR.count}));
   assert.ok(retour.profilConserve&&!retour.pilote&&!retour.err);assert.equal(retour.etat,'titre');resultat.r19.push({profil,secondes,retour,erreurs});assert.equal(erreurs.length,0);sauver();
  }finally{await ctx.close();}
 }
 // Le vrai critère de batterie réutilise le Chromium déjà ouvert, en série.
 for(const phase of ['avant','apres']){
  fs.mkdirSync(path.join(OUT,'r19-'+phase,'captures'),{recursive:true});
  const banc={sessions:new Set(),sortie:path.join(OUT,'r19-'+phase),nav:navigateur,url:`${base}/${phase}.html`,opts:{},ouvrir:async function(profil,opts){const s=new Session(this,profil,opts);await s.ouvrir();this.session=s;return s;}};
  const res=new Resultat(meta);
  try{await mesurer(banc,res);resultat.r19.push({phase,batterie:res.bilan()});}finally{if(banc.session)await banc.session.fermer();}sauver();
 }
 resultat.ok=resultat.compositions.length===72&&resultat.compositions.every(r=>r.ok)&&resultat.r19.find(r=>r.phase==='apres')?.batterie.statut==='ok';if(!resultat.ok)process.exitCode=1;
}catch(e){resultat.exception=String(e.stack||e);process.exitCode=1;}
finally{if(navigateur)await navigateur.close();if(serveur.listening)await new Promise(r=>serveur.close(r));sauver();}
console.log(JSON.stringify({ok:resultat.ok,raccordIntegre:resultat.raccordIntegre,exception:resultat.exception}));

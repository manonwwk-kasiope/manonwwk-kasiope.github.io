/* HORS BAC UNIQUEMENT : cd proto-neon && node tools/codex-p11/verifier.mjs
   Trois profils en série, un Chromium muet. Horloge de gestes contrôlée ; vrais TouchEvents via CDP.
   Ce banc Chromium ne qualifie pas Safari matériel. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),OUT=path.join(HERE,'navigateur');
fs.mkdirSync(OUT,{recursive:true});
const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'index.html'))).digest('hex'),profils:[]};
const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(resultat,null,2));
const server=http.createServer((req,res)=>{
 try {const u=decodeURIComponent(new URL(req.url,'http://local').pathname),f=path.resolve(ROOT,'.'+(u==='/'?'/index.html':u));
 if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.mp4':'video/mp4'};
 res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
 }catch{res.writeHead(400);res.end();}
});
let browser;
try {
 await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});
 browser=await chromium.launch({args:['--mute-audio']});resultat.chromium=browser.version();
 for(const [nom,device,width,height]of [['paysage',devices['iPhone 13 landscape'],844,390],['portrait',devices['iPhone 13'],390,844],['bureau',{},1440,900]]) {
  const ctx=await browser.newContext({...device,viewport:{width,height}}),page=await ctx.newPage(),erreurs=[];
  const r={nom,viewport:{width,height},controles:[],captures:[],erreurs};resultat.profils.push(r);
  const check=(nom,ok,valeur)=>r.controles.push({nom,ok:!!ok,valeur});
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.addInitScript(()=>{
   window.__SEED=7;window.__DT=1/60;window.__tempsTest=0;
   Object.defineProperty(performance,'now',{value:()=>window.__tempsTest,configurable:true});
   window.requestAnimationFrame=f=>{window.__tick=f;return 1;};window.cancelAnimationFrame=()=>{};
  });
  try {
   await page.goto(`http://127.0.0.1:${server.address().port}/index.html?journal=1`,{waitUntil:'load'});
   if(nom==='bureau')await page.mouse.click(width/2,height/2);else await page.touchscreen.tap(width/2,height/2);
   await page.evaluate(()=>{window.__N.entree.annuler();window.__S.input.any=false;localStorage.clear();window.__S.jour=20261017;window.__N.intro.skip();window.__N.game.reset(7,{depart:'titre'});});
   const frames=n=>page.evaluate(n=>{for(let i=0;i<n;i++){window.__tempsTest+=1000*window.__DT;window.__tick(window.__tempsTest);}},n);
   const clock=ms=>page.evaluate(ms=>{window.__tempsTest+=ms;},ms);
   const state=()=>page.evaluate(()=>({etat:window.__N.game.etat(),err:window.__ERR}));
   async function capture(label){
    const v=await page.evaluate(()=>{const N=window.__N,b=Array.from(N.gfx.buf()),histogramme={};for(const x of b)histogramme[x]=(histogramme[x]||0)+1;return {etat:N.game.etat(),w:N.gfx.W,h:N.gfx.H,histogramme,pixels:b,journal:N.journal.dump(),musique:N.music.info(),rms:N.music.rmsOut(),mutes:{musique:N.music.muted('musique'),effets:N.music.muted('effets')},player:window.__S.player,err:window.__ERR};});
    fs.writeFileSync(path.join(OUT,`${nom}-${label}.json`),JSON.stringify(v));await page.screenshot({path:path.join(OUT,`${nom}-${label}.png`)});
    r.captures.push({label,etat:v.etat,w:v.w,h:v.h,histogramme:v.histogramme,sha256:crypto.createHash('sha256').update(Buffer.from(v.pixels)).digest('hex')});
    check(label+' palette',Object.keys(v.histogramme).length>1&&Object.keys(v.histogramme).every(x=>+x<16),v.histogramme);return v;
   }
   await frames(1);
   const titreAudio=[];for(let i=0;i<10;i++){await new Promise(ok=>setTimeout(ok,50));titreAudio.push(await page.evaluate(()=>window.__N.music.rmsOut()));}
   const titre=await capture('titre');r.titreAudio=titreAudio;
   check('contexte audio actif',titre.musique&&titre.musique.state==='running',titre.musique);
   let atteint=null;
   for(let i=1;i<=25*60;i++){await frames(1);if((await state()).etat==='attraction'){atteint=i/60;break;}}
   check('attraction 15 ± 1 s',atteint!==null&&atteint>=14&&atteint<=16,atteint);
   const a=await capture('attraction');await frames(120);const b=await capture('attraction-suite');
   check('partie effectivement jouée',a.etat==='attraction'&&b.etat==='attraction'&&Math.hypot(b.player.x-a.player.x,b.player.y-a.player.y)>0,{avant:a.player,apres:b.player});
   check('sortie audio démo ≤ titre',Number.isFinite(b.rms)&&b.rms<=Math.max(titre.rms,...titreAudio),{titre:Math.max(titre.rms,...titreAudio),demo:b.rms,info:b.musique});
   check('démo silencieuse',a.mutes.musique&&a.mutes.effets&&b.mutes.musique&&b.mutes.effets,{avant:a.mutes,apres:b.mutes});
   const cdp=await ctx.newCDPSession(page);
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
   const pt=(id,x,y)=>({id,x,y,radiusX:1,radiusY:1,force:1});
   const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
   await send('touchStart',[pt(1,width/2,height/2)]);await frames(1);
   check('premier toucher → titre',(await state()).etat==='titre',await state());
   await send('touchEnd',[]);await frames(2);
   check('relâcher ne lance pas JOUER',(await state()).etat==='titre',await state());await capture('retour-titre');
   // Bureau : vérifier aussi la sortie avec la vraie souris, sans émulation tactile.
   if(nom==='bureau'){
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await frames(16*60);
    check('seconde attraction bureau',(await state()).etat==='attraction',await state());
    await page.mouse.down();await frames(1);await page.mouse.up();await frames(1);
    check('souris quitte attraction',(await state()).etat==='titre',await state());
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
   }
   // Reconnaissance complète par événements tactiles ; aucun geste ni événement de journal injecté.
   await page.evaluate(()=>{window.__N.game.reset(7,{depart:'titre'});window.__N.journal.vider();window.__N.journal.actif(true);window.__N.entree.annuler();});
   const manche=pt(1,70,height/2),action=pt(2,Math.min(width-50,250),height/2);
   for(const genre of ['toucher','glisse','tenu'])for(let i=0;i<6;i++){
    await send('touchStart',[manche]);await clock(200);
    await send('touchStart',[manche,action]);
    if(genre==='glisse'){await clock(40);await send('touchMove',[manche,{...action,x:action.x+30}]);}
    else if(genre==='tenu'){await clock(190);await frames(1);}else await clock(50);
    await send('touchEnd',[]);await clock(250);
   }
   const gestes=await page.evaluate(()=>window.__N.journal.lire('geste'));r.gestes=gestes;
   for(const genre of ['toucher','glisse','tenu']){
    const g=gestes.filter(e=>e.d.genre===genre);
    check('six '+genre,g.length===6,g.length);
    check('dates et doigt '+genre,g.length===6&&g.every(e=>Number.isFinite(e.d.t0)&&e.d.t1>=e.d.t0&&e.d.doigt==='action'),g.map(e=>e.d));
   }
   r.schemasGestes=await page.evaluate(()=>window.__N.journal.lire('geste').map(e=>window.__N.ids.valider('journal:geste',e)));
   check('contrat journal geste',r.schemasGestes.every(e=>e.length===0),r.schemasGestes);
   await page.evaluate(()=>{window.__N.entree.annuler();window.__N.game.reset(7,{depart:'titre'});});await frames(30);
   if(nom==='bureau')await page.mouse.click(width/2,height/2);else await page.touchscreen.tap(width/2,height/2);
   await frames(1);const aventure=await page.evaluate(()=>({etat:window.__N.game.etat(),etape:window.__N.aventure.etape(),registre:window.__N.ids.tableEtats.aventure}));
   check('JOUER → aventure',aventure.etat==='aventure'&&aventure.etape==='choix',aventure);await capture('aventure');
   r.final=await state();check('zéro erreur',r.final.err.count===0&&!erreurs.length,{err:r.final.err,erreurs});
   r.conforme=r.controles.every(c=>c.ok);
  } catch(e){r.echec=String(e.stack||e);r.conforme=false;}
  finally{save();await ctx.close();}
 }
 resultat.conforme=resultat.profils.length===3&&resultat.profils.every(p=>p.conforme);if(!resultat.conforme)process.exitCode=1;
}finally{save();if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));}

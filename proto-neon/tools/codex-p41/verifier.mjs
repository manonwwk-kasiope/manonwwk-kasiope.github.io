/* HORS BAC UNIQUEMENT : cd proto-neon && node tools/codex-p41/verifier.mjs
   Un serveur HTTP local, port libre ; un seul Chromium muet ; trois profils en série.
   Raccords en mémoire : aucune écriture dans src/. Pas de requête extérieure autorisée.
   Les bundles et SHA, journaux entiers, pixels indexés et captures sont conservés. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import zlib from 'node:zlib';
import {chromium,devices} from 'playwright';
import {ICI,ROOT,hash,dateParis,partie} from './vm.mjs';
import {bundles} from './bundles.mjs';import {relance,main} from './relance.mjs';import {intermedes} from './controles.mjs';import {premiereVague} from './v1.mjs';
const out=path.join(ICI,'navigateur');fs.mkdirSync(out,{recursive:true});
const variants=bundles(),result={dateParis:dateParis(),statut:'en cours',limite:'Chromium émulé ; Safari iPhone réel reste à vérifier',bundles:Object.fromEntries(Object.entries(variants).map(([k,v])=>[k,hash(v)])),relances:[],parties:[],v1:[]};
const cacheKey=hash([result.bundles,partie.toString(),premiereVague.toString()]);
const cacheDir=path.join(out,'recus-'+cacheKey.slice(0,16));fs.mkdirSync(cacheDir,{recursive:true});result.cacheKey=cacheKey;
const cacheRead=f=>fs.existsSync(path.join(cacheDir,f))?JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(cacheDir,f)))):null;
const cacheSave=(f,r)=>fs.writeFileSync(path.join(cacheDir,f),zlib.gzipSync(JSON.stringify(r)));
const save=()=>fs.writeFileSync(path.join(out,'resultats.json'),JSON.stringify(result,null,2)+'\n');
const pack=(nom,r)=>fs.writeFileSync(path.join(out,nom),zlib.gzipSync(JSON.stringify(r)));
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),nom=u.pathname.slice(1).replace(/\.html$/,'');
 if(variants[nom]){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(variants[nom]);}
 let f;try{f=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));}catch{res.writeHead(400);return res.end();}
 if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
 const ext=path.extname(f);res.setHeader('Content-Type',({'.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json','.js':'text/javascript'})[ext]||'application/octet-stream');
 const size=fs.statSync(f).size,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(range){const a=Number(range[1]),b=range[2]?Math.min(Number(range[2]),size-1):size-1;
  if(a>b||a>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}
  res.writeHead(206,{'Content-Range':`bytes ${a}-${b}/${size}`,'Accept-Ranges':'bytes','Content-Length':b-a+1});fs.createReadStream(f,{start:a,end:b}).pipe(res);
 }else{res.setHeader('Content-Length',size);fs.createReadStream(f).pipe(res);}
});
let browser;
async function ouvrir(version,profil,graine=1){
 const ctx=await browser.newContext(profil),errors=[];
 await ctx.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(g=>{window.__SEED=g;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};},graine);
 await page.goto(`http://127.0.0.1:${server.address().port}/${version}.html?journal=1`,{waitUntil:'load'});
 await page.waitForFunction(()=>!!(window.__N?.game?.dbg&&window.__P41Image&&window.__N.art.ready()),null,{polling:100,timeout:30000});
 return {ctx,page,errors};
}
async function natif(page,tactile){
 const p=await page.evaluate(()=>{
  const N=window.__N,S=window.__S;N.intro.skip();N.game.reset(1,{depart:'jeu'});N.pilote.arreter();N.game.dbg.scene('fin');
  for(let f=0;f<40;f++)window.__P41Image(0);
  const a=N.ui.finActions().rejouer,r=document.querySelector('#out').getBoundingClientRect();
  return {x:r.left+(a.x+a.w/2)*N.gfx.PX,y:r.top+(a.y+a.h/2)*N.gfx.PX};
 });
 if(tactile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
 return page.evaluate(()=>{
  const N=window.__N,etats=[];let f=0;while(f<200){window.__P41Image(0);f++;etats.push(N.game.etat());if(N.game.etat()==='jeu'&&N.joueuse.etat==='vivant')break;}
  return {images:f,secondes:f*window.__DT,etat:N.game.etat(),joueuse:N.joueuse.etat,etats:[...new Set(etats)],err:window.__ERR.count,journal:N.journal.dump(),horsPalette:Array.from(N.gfx.buf()).filter(c=>c>=N.pal.C.length).length,pixels:Array.from(N.gfx.buf()),w:N.gfx.W,h:N.gfx.H};
 });
}
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 browser=await chromium.launch({args:['--mute-audio']});result.navigateur=browser.version();
 const profils={paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900}}};
 for(const [profil,config]of Object.entries(profils))for(const version of Object.keys(variants)){
  const {ctx,page,errors}=await ouvrir(version,config);
  try{
   for(const mode of ['clavier','toucher']){
    const r=await page.evaluate(relance,{mode});const fichier=`relance-${version}-${profil}-${mode}.json.gz`;pack(fichier,r);
    const {images,journal,...resume}=r;result.relances.push({version,profil,...resume,horsPalette:images.reduce((s,i)=>s+i.pixels.horsPalette,0),fichier,imagesSha256:hash(images),journalSha256:hash(journal)});
   }
   const priseMain=await page.evaluate(main),films=await page.evaluate(intermedes),r=await natif(page,!!config.hasTouch);
   pack(`natif-${version}-${profil}.json.gz`,r);fs.writeFileSync(path.join(out,`pixels-${version}-${profil}.bin`),Buffer.from(r.pixels));
   await page.screenshot({path:path.join(out,`${version}-${profil}.png`)});
   result.relances.push({version,profil,mode:config.hasTouch?'touchscreen réel Playwright':'clic souris',images:r.images,secondes:r.secondes,etat:r.etat,joueuse:r.joueuse,etats:r.etats,err:r.err,horsPalette:r.horsPalette,pixelsSha256:hash(Buffer.from(r.pixels)),priseMain,films,erreursConsole:errors});save();
  }finally{await ctx.close();}
 }
 // 80 paires officielles : pages vierges, protocole identique, aucun saut d'intermède.
 for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=10;graine++){
  const paire={pilote,graine};let a,b;
  for(const version of ['avant','apres']){
   const fichier=`partie-${version}-${pilote}-${graine}.json.gz`;let recu=cacheRead(fichier),reutilise=!!recu;
   if(!recu){const {ctx,page,errors}=await ouvrir(version,profils.paysage,graine);
    try{const r=await page.evaluate(partie,{pilote,graine});recu={resultat:r,erreursConsole:errors};cacheSave(fichier,recu);}finally{await ctx.close();}}
   const r=recu.resultat;paire[version]={sha256:hash(r),etat:r.etat,err:r.err,tempsJeu:r.tempsJeu,vague:r.vague,score:r.score,erreursConsole:recu.erreursConsole,fichier:path.relative(out,path.join(cacheDir,fichier)),reutilise};if(version==='avant')a=r;else b=r;
  }
  paire.identique=hash(a)===hash(b);paire.saine=[paire.avant,paire.apres].every(c=>c.etat==='fin'&&!c.err&&!c.erreursConsole.length);result.parties.push(paire);save();
 }
 // V1 : même critère de journal entrée → nettoyée, cinquante graines, toutes les valeurs publiées.
 for(const version of ['avant','apres'])for(let graine=1;graine<=50;graine++){
  const fichier=`v1-${version}-${graine}.json.gz`;let recu=cacheRead(fichier),reutilise=!!recu;
  if(!recu){const {ctx,page,errors}=await ouvrir(version,profils.paysage,graine);
   try{recu={resultat:await page.evaluate(premiereVague,{graine}),erreursConsole:errors};cacheSave(fichier,recu);}finally{await ctx.close();}}
  const {journal,...resume}=recu.resultat;result.v1.push({version,...resume,journalSha256:hash(journal),erreursConsole:recu.erreursConsole,reutilise});save();
 }
 const mediane=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null;};
 const seuil=await (async()=>{const {ctx,page}=await ouvrir('apres',profils.paysage);try{return await page.evaluate(()=>window.__N.R.criteres.R35);}finally{await ctx.close();}})();
 result.v1Medianes=Object.fromEntries(['avant','apres'].map(v=>[v,mediane(result.v1.filter(c=>c.version===v).map(c=>c.duree))]));
 result.R35conformeChromium=result.relances.filter(c=>['apres','p38-p41'].includes(c.version)).every(c=>c.secondes<seuil.relance&&!c.etats.some(e=>['briefing','ouverture'].includes(e))&&!c.err&&!c.horsPalette&&(!c.erreursConsole||!c.erreursConsole.length)&&(!c.priseMain||c.priseMain.deplacement>0&&Math.abs(c.priseMain.virage)>0)&&(!c.films||!c.films.err&&c.films.avantGarde.busy&&c.films.pret.armed&&!c.films.apresGeste.busy&&c.films.secondeDemande===null&&c.films.nouvellePartie==='rival'))&&result.v1Medianes.apres!==null&&result.v1Medianes.apres<=seuil.v1Max&&result.v1.every(c=>!c.err&&!c.erreursConsole.length);
 result.nonRegression={paires:result.parties.length,identiques:result.parties.filter(p=>p.identique).length,terminees:result.parties.filter(p=>p.saine).length,censurees:result.parties.filter(p=>!p.saine)};
 result.conforme=result.R35conformeChromium&&result.parties.length===80&&result.parties.every(p=>p.identique&&p.saine);
 result.statut=result.conforme?'contrôles Chromium satisfaits ; Safari réel à vérifier':(result.R35conformeChromium?'R-35 satisfait en Chromium ; lot non validé : non-fin ou divergence des pilotes, détails conservés':'échec R-35 : valeurs conservées');
 if(!result.conforme)process.exitCode=1;
}catch(e){result.statut='interrompu';result.erreur=e.stack;process.exitCode=1;}
finally{result.misAJourParis=dateParis();save();if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));}

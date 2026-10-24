/* À lancer HORS BAC : cd proto-neon && node tools/codex-v0d/verifier.mjs
   Par défaut, sert le candidat avec les deux raccords réservés appliqués EN MÉMOIRE.
   Après intégration et build, ajouter --integre pour tester le vrai index.html.
   Un Chrome H.264, muet, profils en série ; aucune ressource distante autorisée. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {chromium,devices} from 'playwright';
import {ROOT,ICI,sources,hash,dateParis} from './vm.mjs';
import {raccorder} from './raccords.mjs';
const sortie=path.join(ICI,'navigateur');fs.mkdirSync(sortie,{recursive:true});
const originaux=sources(),candidat=process.argv.includes('--integre')?originaux:raccorder(originaux);
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const hashDisque=crypto.createHash('sha256').update(html).digest('hex');
if(!process.argv.includes('--integre'))for(const [f,s] of candidat){
 const avant=originaux.find(x=>x[0]===f)[1];if(s===avant)continue;
 assert(html.includes(avant),'Reconstruire index.html avant le contrôle : '+f);html=html.replace(avant,s);
}
else assert(html.includes("return filmAmiral() ? 'panneau' : et;"),'Raccord 79 absent du bundle intégré.');
const preuves={dateParis:dateParis(),mode:process.argv.includes('--integre')?'bundle intégré':'candidat raccordé en mémoire',hashDisque,hashServi:hash(html),limite:'Chrome émulant les dimensions iPhone ; ce contrôle ne remplace pas Safari sur iPhone réel.',cas:[]};
const sauver=()=>fs.writeFileSync(path.join(sortie,'resultats.json'),JSON.stringify(preuves,null,2)+'\n');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1').pathname;
 if(u==='/'||u==='/index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);}
 const fichier=path.resolve(ROOT,'.'+decodeURIComponent(u));
 if(!fichier.startsWith(ROOT+path.sep)||!fs.existsSync(fichier)||!fs.statSync(fichier).isFile()){res.writeHead(404);return res.end();}
 const size=fs.statSync(fichier).size;
 const mime={'.mp4':'video/mp4','.mp3':'audio/mpeg','.png':'image/png','.json':'application/json'}[path.extname(fichier)]||'application/octet-stream';
 res.setHeader('Content-Type',mime);res.setHeader('Accept-Ranges','bytes');
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 if(range){const debut=+range[1],fin=range[2]?Math.min(+range[2],size-1):size-1;
  if(debut>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}
  res.writeHead(206,{'Content-Range':`bytes ${debut}-${fin}/${size}`,'Content-Length':fin-debut+1});fs.createReadStream(fichier,{start:debut,end:fin}).pipe(res);
 }else{res.setHeader('Content-Length',size);fs.createReadStream(fichier).pipe(res);}
});
let browser;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({channel:'chrome',args:['--mute-audio']});preuves.chrome=browser.version();
 for(const [profil,options] of [
  ['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],
  ['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],
  ['bureau',{viewport:{width:1440,height:900}}]
 ])for(const qui of ['elle','lui'])for(const repli of [false,true]){
  const ctx=await browser.newContext(options),page=await ctx.newPage(),erreurs=[];
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await ctx.route('**/*',route=>{const url=route.request().url();return url.startsWith(base+'/')||url.startsWith('data:')?route.continue():route.abort();});
  const cas={profil,qui,repli};preuves.cas.push(cas);
  try{
   await page.addInitScript(()=>{window.__SEED=2975;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
   await page.goto(base+'/index.html?journal=1',{waitUntil:'load'});
   await page.waitForFunction(qui=>!!window.__N.art.get('amiral-'+qui),qui);
   // Geste réel de déverrouillage ; Chrome reste muet, vidéos aussi.
   if(options.hasTouch)await page.touchscreen.tap(100,100);else await page.keyboard.press('Space');
   await page.waitForFunction(()=>window.__N.music.context()?.state==='running');
   cas.depart=await page.evaluate(({qui,repli})=>{
    const N=window.__N,S=window.__S;localStorage.clear();S.jour=20261017;N.pilote.arreter();N.intro.skip();N.intro.stop?.();N.game.reset(2975);
    N.game.dbg.etat('aventure');N.journal.actif(true);N.music.mute(true);
    // Parcours réel du voyage par ses interfaces : seuls les prologues sont sautés
    // pour construire le cas d'arrivée, puis l'époque cosmos reste propriétaire.
    N.aventure.demarrer({qui,rattraper:false,aJouer(){}});
    for(let i=0;i<N.aventure.ETAPES.length/N.R.temps.h&&N.aventure.etape()!=='neon';i++){N.aventure.sauter();N.aventure.update(N.R.temps.h);}
    if(N.aventure.etape()!=='neon')throw Error('Construction du voyage arrêtée à '+N.aventure.etape());
    N.aventure.reprendre('espace');N.aventure.sauter();N.aventure.update(N.R.temps.h);
    if(N.aventure.etape()!=='2975')throw Error('Cosmos non atteint');
    if(repli){const jouer=N.art.play;N.art.play=function(n){return n==='amiral-'+qui?false:jouer(n);};}
    N.music.mute(false);N.cosmos.update(N.R.temps.h);N.cosmos.draw();S.input.any=false;S.input.taps.length=0;N.cosmos.skip();
    window.__v0d={monde:JSON.stringify(N.cosmos.state()),journal:JSON.stringify(N.journal.dump()),t:N.horloge.t(),n:N.film.state().n};
    return {film:N.film.state(),cosmos:N.cosmos.state(),etat:N.game.etat()};
   },{qui,repli});
   assert.equal(cas.depart.film.nom,'amiral-'+qui);assert.equal(cas.depart.etat,'panneau');
   await page.evaluate(()=>{const N=window.__N;N.game.dbg.simuler(N.R.filmAmiral.garde-N.R.temps.imageRef);});
   if(options.hasTouch)await page.touchscreen.tap(100,100);else await page.keyboard.press('Space');
   cas.garde=await page.evaluate(()=>{const N=window.__N;N.game.dbg.simuler(N.R.temps.h);window.__S.input.any=false;window.__S.input.taps.length=0;return N.film.state();});
   assert(cas.garde.actif,'Le geste avant 300 ms a sauté le film.');
   const render=async()=>page.evaluate(()=>{
    const N=window.__N;N.game.draw();N.fx.draw();N.game.drawTop();N.fx.drawEcran();N.gfx.present();
    const somme=b=>{let h=2166136261;for(const v of b)h=Math.imul(h^v,16777619);return h>>>0;};
    const img=N.art.get(N.film.state().nom),buf=N.gfx.buf(),video=[...document.querySelectorAll('video')].find(v=>v.src.includes('/'+N.film.state().nom+'.mp4'));
    return {film:N.film.state(),pixels:{empreinte:somme(buf),couleurs:[...new Set(buf)],nonNoirs:[...buf].filter(v=>v!==0&&v!==15).length},image:{empreinte:somme(img.data),couleurs:[...new Set(img.data)]},video:video?{t:video.currentTime,ready:video.readyState,largeur:video.videoWidth,hauteur:video.videoHeight,frames:video.getVideoPlaybackQuality?.().totalVideoFrames??video.webkitDecodedFrameCount,muted:video.muted,error:video.error?.code??null}:null};
   });
   if(!repli)await page.waitForFunction(qui=>{const v=[...document.querySelectorAll('video')].find(v=>v.src.includes('/amiral-'+qui+'.mp4'));return v?.readyState>=2&&v.currentTime>window.__N.R.filmAmiral.garde;},qui);
   await page.evaluate(()=>window.__N.game.dbg.simuler(window.__N.R.filmAmiral.garde));
   cas.image1=await render();
   if(!repli){
    assert(cas.image1.video?.muted);assert(cas.image1.video.largeur>0);assert(cas.image1.video.frames>0);assert(!cas.image1.video.error);
    await page.waitForFunction(({qui,t})=>{const v=[...document.querySelectorAll('video')].find(v=>v.src.includes('/amiral-'+qui+'.mp4'));return v.currentTime>t+window.__N.R.filmAmiral.garde;},{qui,t:cas.image1.video.t});
   }
   cas.image2=await render();
   if(!repli){assert(cas.image2.video.t>cas.image1.video.t);assert(cas.image2.video.frames>cas.image1.video.frames);assert.notEqual(cas.image2.image.empreinte,cas.image1.image.empreinte,'Les vraies images vidéo restent identiques.');assert.notEqual(cas.image2.pixels.empreinte,cas.image1.pixels.empreinte);}
   else {assert(!cas.image1.film.clip);assert(cas.image1.film.panneau);assert.equal(cas.image2.image.empreinte,cas.image1.image.empreinte);}
   assert(cas.image2.pixels.nonNoirs>0);assert(cas.image2.pixels.couleurs.every(v=>v>=0&&v<16));
   cas.gel=await page.evaluate(()=>{const N=window.__N,r=window.__v0d;return {temps:N.horloge.t()-r.t,mondeIdentique:JSON.stringify(N.cosmos.state())===r.monde,journalIdentique:JSON.stringify(N.journal.dump())===r.journal};});
   assert.equal(cas.gel.temps,0);assert(cas.gel.mondeIdentique);assert(cas.gel.journalIdentique);
   await page.screenshot({path:path.join(sortie,`${profil}-${qui}-${repli?'panneau':'video'}.png`)});
   if(options.hasTouch)await page.touchscreen.tap(100,100);else await page.keyboard.press('Space');
   cas.saut=await page.evaluate(()=>{const N=window.__N;N.game.dbg.simuler(N.R.temps.h);const intact=JSON.stringify(N.cosmos.state())===window.__v0d.monde;window.__S.input.any=false;window.__S.input.taps.length=0;N.game.dbg.simuler(N.R.temps.imageRef);return {film:N.film.state(),intact,apres:N.cosmos.state(),avant:JSON.parse(window.__v0d.monde),err:window.__ERR,journal:N.journal.dump()};});
   assert(!cas.saut.film.actif);assert(cas.saut.film.saute);assert(cas.saut.intact);assert.equal(cas.saut.film.n,cas.depart.film.n);assert(cas.saut.apres.t>cas.saut.avant.t);assert.equal(cas.saut.err.count,0);assert.deepEqual(erreurs,[]);cas.conforme=true;
  }catch(e){cas.conforme=false;cas.erreur=String(e);process.exitCode=1;}
  finally{cas.erreursConsole=erreurs;sauver();await ctx.close();}
 }
 preuves.conforme=preuves.cas.length===12&&preuves.cas.every(c=>c.conforme);sauver();
}finally{if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));sauver();}

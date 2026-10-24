/* À lancer HORS du bac : cd proto-neon && node tools/codex-u1/verifier.mjs
   Après intégration des raccords et reconstruction : même commande avec --integre.
   Un seul Chromium, muet, trois profils successifs. Aucun appel réseau extérieur. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import zlib from 'node:zlib';
import assert from 'node:assert/strict';import { chromium, devices } from 'playwright';
import { ICI, ROOT, sources, hash, dateParis } from './vm.mjs';import { raccorder } from './raccords.mjs';
import { ecran } from './scenarios.mjs';import { png } from './png.mjs';
const base=sources(),avant=JSON.parse(zlib.gunzipSync(fs.readFileSync(ICI+'/sources-avant.json.gz')));
const candidat=process.argv.includes('--integre')?base:raccorder(base),html=fs.readFileSync(ROOT+'/index.html','utf8');
function bundle(src){
 let s=html;
 for(const[f,old]of base){const a='/* ===== '+f+' ===== */\n'+old,b='/* ===== '+f+' ===== */\n'+src.find(x=>x[0]===f)[1];assert(s.includes(a),'Reconstruire index.html avant le test : '+f);s=s.replace(a,()=>b);}
 return s.replace('\nboot();})();','\nwindow.__U1frame=frame;window.__U1appliquer=typeof appliquerReglages==="function"?appliquerReglages:function(){};boot();})();');
}
const pages={'/avant.html':bundle(avant),'/candidat.html':bundle(candidat)},OUT=ICI+'/navigateur';fs.mkdirSync(OUT,{recursive:true});
const server=http.createServer((req,res)=>{
 const u=decodeURIComponent(req.url.split('?')[0]);if(pages[u]){res.setHeader('Content-Type','text/html');return res.end(pages[u]);}
 const f=path.resolve(ROOT,'.'+u);if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.mp3':'audio/mpeg','.mp4':'video/mp4','.png':'image/png'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
});
await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
let browser;const bilan={dateParis:dateParis(),candidatSha256:hash(candidat),avantSha256:hash(avant),integre:process.argv.includes('--integre'),cas:[]};
const save=()=>fs.writeFileSync(OUT+'/resultats.json',JSON.stringify(bilan,null,2)+'\n');
try{
 browser=await chromium.launch({headless:true,args:['--mute-audio']});bilan.chromium=browser.version();
 for(const[profil,w,h,mobile]of [['paysage',844,390,true],['portrait',390,844,true],['bureau',1440,900,false]]){
  for(const version of ['avant','candidat']){
   const ctx=await browser.newContext({...mobile?devices['iPhone 13']:{},viewport:{width:w,height:h},hasTouch:mobile,isMobile:mobile});
   await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')||r.request().url().startsWith('data:')?r.continue():r.abort());
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.addInitScript(()=>{
    window.__SEED=2975;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};
    const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return play.call(this);};
   });
   await page.goto(`http://127.0.0.1:${server.address().port}/${version}.html?journal=1`,{waitUntil:'load'});
   const record={profil,version,captures:[],gestes:[],errors};
   const frames=n=>page.evaluate(n=>{for(let i=0;i<n;i++)window.__U1frame((window.__FRAME||0)*1000/60);},n);
   async function capture(nom){
    const r=await page.evaluate(ecran,nom),f=`${version}-${profil}-${nom}`;
    png(OUT+'/'+f+'-tampon.png',r.w,r.h,r.buf,r.palette,r.px);fs.writeFileSync(OUT+'/'+f+'.bin',Buffer.from(r.buf));
    // Présenter le tampon mesuré sans relancer les états de la fixture.
    await page.evaluate(()=>window.__N.gfx.present());await page.screenshot({path:OUT+'/'+f+'-ecran.png'});
    const{buf,palette,journal,...reste}=r;record.captures.push({...reste,pixelsSha256:hash(buf),journalSha256:hash(journal),fichier:f+'-ecran.png'});
   }
   async function tap(r){
    const p=await page.evaluate(r=>{const c=document.getElementById('out').getBoundingClientRect(),g=window.__N.gfx;return{x:c.left+(r.x+r.w/2)*g.PX,y:c.top+(r.y+r.h/2)*g.PX};},r);
    if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await frames(2);
   }
   await frames(40);await capture('titre');await capture('fin');
   if(version==='candidat'){
    await page.evaluate(()=>{window.__N.game.dbg.etat('titre');});await frames(40);
    const titre=await page.evaluate(()=>window.__N.ui.boutonReglages());await tap(titre);await frames(30);
    assert.equal(await page.evaluate(()=>window.__N.ui.ecran()),'reglages','Le geste doit ouvrir RÉGLAGES');
    await capture('reglages');
    const modifies=new Set();
    for(let garde=0;modifies.size<8&&garde<40;garde++){
     const m=await page.evaluate(()=>window.__N.ui.modeleReglages()),b=m.boutons.find(b=>!modifies.has(b.id));
     if(!b){await tap(m.suite);continue;}
     const before=await page.evaluate(()=>({g:{...window.__S.reglages},buf:Array.from(window.__N.gfx.buf())}));
     await tap(b);await frames(2);
     const after=await page.evaluate(()=>({g:{...window.__S.reglages},buf:Array.from(window.__N.gfx.buf()),manche:window.__S.input.stick.r,fx:window.__N.fx.options(),tube:window.__N.crt.niveau(),musique:window.__N.music.muted('musique'),effets:window.__N.music.muted('effets')}));
     record.gestes.push({id:b.id,avant:before.g[b.id],apres:after.g[b.id],change:before.g[b.id]!==after.g[b.id],pixelsChanges:before.buf.filter((p,i)=>p!==after.buf[i]).length,applique:{...after,buf:undefined}});modifies.add(b.id);
    }
    assert.equal(modifies.size,8);const g=await page.evaluate(()=>({...window.__S.reglages}));
    await page.reload({waitUntil:'load'});await frames(40);record.memorise=await page.evaluate(()=>({...window.__S.reglages}));assert.deepEqual(record.memorise,g);
    // Pause réelle, toucher du bouton réglages, retour puis reprise.
    await page.evaluate(()=>{const N=window.__N;N.intro.stop();N.game.dbg.scene('calme');N.game.dbg.god(true);});await frames(2);
    await page.keyboard.press('KeyP');await frames(40);record.pauseAvant=await page.evaluate(()=>window.__N.game.etat());
    await tap(await page.evaluate(()=>window.__N.ui.boutonReglages()));await frames(30);record.pauseReglages=await page.evaluate(()=>({etat:window.__N.game.etat(),ui:window.__N.ui.ecran(),t:window.__N.horloge.t()}));
    await frames(60);record.pauseApres=await page.evaluate(()=>window.__N.horloge.t());
    await tap(await page.evaluate(()=>window.__N.ui.modeleReglages().retour));await frames(30);await page.keyboard.press('KeyP');await frames(2);record.reprise=await page.evaluate(()=>window.__N.game.etat());
    // Retour de voyage : trois vrais gestes, du démarrage au combat, au temps de la boucle.
    await page.evaluate(()=>{const N=window.__N;N.score.profil.epoquesVues(true);N.game.reset(2975);});await frames(30);
    let temps=0;await tap({x:0,y:0,w:1,h:1});temps+=2/60;await frames(30);temps+=.5;
    await tap({x:0,y:0,w:1,h:1});temps+=2/60;await frames(60);temps+=1;
    const zone=await page.evaluate(()=>{window.__N.aventure.draw();return window.__N.choix.state().zones.elle;});await tap(zone);temps+=2/60;
    while(temps<12&&await page.evaluate(()=>window.__N.game.etat()!=='jeu')){await frames(15);temps+=.25;}
    record.retour={touchers:3,secondes:temps,etat:await page.evaluate(()=>window.__N.game.etat()),journal:await page.evaluate(()=>window.__N.aventure.state().journal)};
   }
   record.err=await page.evaluate(()=>window.__ERR);record.journal=await page.evaluate(()=>window.__N.journal.dump());
   record.conforme=!record.err.count&&!errors.length&&(version==='avant'||record.captures.every(c=>!c.chevauchements.length&&!c.debordements.length&&c.titreLargeur<c.largeurSure)&&record.gestes.every(c=>c.change&&c.pixelsChanges>0)&&record.pauseReglages.ui==='reglages'&&record.pauseAvant==='pause'&&record.pauseApres===record.pauseReglages.t&&record.reprise==='jeu'&&record.retour.etat==='jeu'&&record.retour.secondes<=12);
   bilan.cas.push(record);save();await ctx.close();
  }
 }
 bilan.conforme=bilan.cas.filter(c=>c.version==='candidat').every(c=>c.conforme);save();if(!bilan.conforme)process.exitCode=1;
}catch(e){bilan.exception=String(e.stack||e);save();process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(r=>server.close(r));save();}

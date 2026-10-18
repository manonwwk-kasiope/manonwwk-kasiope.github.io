// HORS BAC UNIQUEMENT : cd proto-neon && node tools/codex-p36/verifier.mjs
// Script complet, non lancé dans le bac : HTTP port libre, un Chromium muet, profils successifs.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {partie} from '../reglage/protocole.mjs';
import {resumer,PILOTES} from '../mesure/parties.mjs';
import {HERE,ROOT,sha,verifierStatique,relireCritere} from './preuves.mjs';
await verifierStatique();
await import('./cas-construits.mjs');
const OUT=path.join(HERE,'navigateur');fs.mkdirSync(OUT,{recursive:true});
const bundle=fs.readFileSync(path.join(ROOT,'index.html'));
for(const f of fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')).sort())assert.ok(bundle.toString().includes('/* ===== '+f+' ===== */\n'+fs.readFileSync(path.join(ROOT,'src',f),'utf8')),'Bundle périmé : '+f);
const types={'.html':'text/html; charset=utf-8','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.js':'text/javascript'};
const serveur=http.createServer((req,res)=>{
 try{
  const f=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
  const size=fs.statSync(f).size,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=+range[1],end=range[2]?Math.min(+range[2],size-1):size-1;if(start>=size||end<start){res.writeHead(416);return res.end();}res.writeHead(206,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});fs.createReadStream(f,{start,end}).pipe(res);}
  else {res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Content-Length':size,'Accept-Ranges':'bytes'});fs.createReadStream(f).pipe(res);}
 }catch(e){res.writeHead(400);res.end();}
});
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390},hasTouch:true}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844},hasTouch:true}],['bureau',{viewport:{width:1440,height:900},hasTouch:false}]];
const result={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:sha(bundle),limite:'Chromium émulé, pas Safari physique ; proportions exploratoires (5 graines paysage, 1 ailleurs).',cas:[],critere:{}};
const ecrire=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(result,null,2)+'\n');
const paysage=[];let browser;
try{
 await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
 browser=await chromium.launch({args:['--mute-audio']});result.chromium=browser.version();
 for(const [profil,opts] of profils)for(const pilote of PILOTES)for(let graine=1;graine<=(profil==='paysage'?5:1);graine++){
  const ctx=await browser.newContext(opts),page=await ctx.newPage(),errors=[];
  try{
   page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await ctx.route('**/*',route=>{const u=new URL(route.request().url());return (u.origin===`http://127.0.0.1:${serveur.address().port}`||['data:','blob:'].includes(u.protocol))?route.continue():route.abort();});
   await page.addInitScript(seed=>{window.__SEED=seed;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};},graine);
   await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html?journal=1`,{waitUntil:'load'});
   await page.evaluate(()=>{window.__S.view.safe={l:0,t:0,r:0,b:0};});
   // Ajouter les échantillons aux tranches publiques ; vraie simulation originale inchangée.
   await page.evaluate(()=>{
    const N=window.__N,S=window.__S,simuler=N.game.dbg.simuler;window.__P36ech=[];
    N.game.dbg.simuler=function(...args){const r=simuler.apply(this,args);window.__P36ech.push({t:N.horloge.t(),etat:N.game.etat(),vague:N.dir.vague(),len:S.player.len,vivants:N.ennemis.count(),vies:N.score.vies});return r;};
   });
   const r=await page.evaluate('('+partie.toString()+')('+JSON.stringify({pilote,graine,observer:true})+')');
   const pixels=await page.evaluate(()=>{
    const N=window.__N;N.game.draw();N.fx?.draw();N.game.drawTop?.();N.gfx.present();
    const indices=Array.from(N.gfx.buf()),histogramme={};for(const v of indices)histogramme[v]=(histogramme[v]||0)+1;
    return {w:N.gfx.W,h:N.gfx.H,indices,histogramme,horsPalette:indices.filter(v=>v<0||v>=N.pal.C.length).length,etat:N.game.etat(),err:window.__ERR.count};
   });
   assert.ok(pixels.w>0&&pixels.h>0,'Dimensions du tampon absentes');
   assert.equal(pixels.indices.length,pixels.w*pixels.h,'Tampon incomplet');
   const p={ok:true,raison:r.raison,journal:r.journal,echantillons:await page.evaluate(()=>window.__P36ech),fin:{t:r.tempsJeu,score:r.score,etat:pixels.etat},params:{pilote,graine},erreurs:{zero:!r.err&&!pixels.err&&!errors.length}};
   const resume=resumer(p),phase=r.journal.find(e=>e.type==='phase'&&e.d.evt==='arrivee');
   assert.equal(resume.cyclopeAtteint,!!phase);assert.equal(resume.entreeCyclope,phase?.t??null);
   for(const m of resume.morts){const original=r.journal.find(e=>e.type==='mort'&&e.pas===m.pas);assert.equal(m.t,original.t);assert.equal(m.tempsCombat,original.d.t);}
   if(profil==='paysage')paysage.push({pilote,graine,p});
   const file=`${profil}-${pilote}-${graine}.json.gz`;fs.writeFileSync(path.join(OUT,file),zlib.gzipSync(JSON.stringify({r,p,pixels,errors})));
   result.cas.push({profil,pilote,graine,fin:r.fin,raison:r.raison,arrivee:resume.entreeCyclope,victoire:resume.victoire,err:Math.max(r.err,pixels.err),errors,pixels:{w:pixels.w,h:pixels.h,histogramme:pixels.histogramme,horsPalette:pixels.horsPalette,sha256:sha(Buffer.from(pixels.indices))},recu:file});
   if(graine===1)await page.screenshot({path:path.join(OUT,`${profil}-${pilote}.png`)});
   ecrire();console.log(JSON.stringify({profil,pilote,graine,fin:r.fin,err:r.err}));
  }finally{await ctx.close();}
 }
 result.critere.avant=await relireCritere('R-04',paysage,true);result.critere.apres=await relireCritere('R-04',paysage);
}catch(e){result.exception=String(e.stack||e);process.exitCode=1;}
finally{if(browser)await browser.close();if(serveur.listening)await new Promise(ok=>serveur.close(ok));}
result.complet=result.cas.length===56;
result.zeroErreur=result.complet&&result.cas.every(c=>c.fin&&!c.err&&!c.errors.length&&!c.pixels.horsPalette);
if(!result.zeroErreur)process.exitCode=1;
ecrire();

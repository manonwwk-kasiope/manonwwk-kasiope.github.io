/* À lancer HORS DU BAC : cd proto-neon && node tools/codex-p37/verifier.mjs
   Un serveur local, un seul Chromium muet, profils successifs. Aucun accès extérieur.
   70 paires autres + 50 paires humain paysage ; 5 humain portrait et 5 bureau.
   --fumee réduit à une graine par pilote/profil, sans qualifier les proportions.
   Sources avant/après figées : arrêt si les sources actuelles ou le bundle ont dérivé. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {sources} from '../codex-p14/vm.mjs';
import {HERE,ROOT,hash,snap,read,date,partie} from './mesurer.mjs';
const dir=path.join(HERE,'navigateur');fs.mkdirSync(dir,{recursive:true});
const avant=snap('sources-avant.json.gz'),apres=snap('sources-apres.json.gz');
assert.equal(hash(sources()),hash(apres),'Sources dérivées : reconstruire et regeler le candidat avant le banc');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');let htmlAvant=html;
const anciens=new Map(avant);
for(const [f,s]of apres){assert(html.includes(s),'Bundle obsolète : '+f);if(s!==anciens.get(f))htmlAvant=htmlAvant.replace(s,()=>anciens.get(f));}
const fumee=process.argv.includes('--fumee');
const profils={paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900}}};
const bilan={dateParis:date(),fumee,bundleSha256:hash(html),sourcesAvantSha256:hash(avant),sourcesApresSha256:hash(apres),cas:[],paires:[],erreurs:[]};
const save=()=>fs.writeFileSync(path.join(dir,'resultats.json'),JSON.stringify(bilan,null,2)+'\n');
const server=http.createServer((req,res)=>{
 try{
 const u=new URL(req.url,'http://127.0.0.1'),serie=u.pathname.split('/')[1];
 if(!['avant','apres'].includes(serie)){res.writeHead(404);return res.end();}
 const rel=u.pathname.slice(serie.length+2)||'index.html';
 if(rel==='index.html'){res.setHeader('Content-Type','text/html');return res.end(serie==='avant'?htmlAvant:html);}
 const f=path.resolve(ROOT,decodeURIComponent(rel));
 if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e));}
});
let browser;
async function run(serie,profil,pilote,graine){
 const context=await browser.newContext(profils[profil]),page=await context.newPage(),erreurs=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());return u.protocol==='data:'||u.origin===origin?route.continue():route.abort('blockedbyclient');});
 page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
 await page.addInitScript(seed=>{window.__SEED=seed;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};},graine);
 try{
  await page.goto(`${origin}/${serie}/index.html?journal=1`,{waitUntil:'load'});
  const r=await page.evaluate(({fn,pilote,graine})=>(0,eval)('('+fn+')')({pilote,graine}),{fn:partie.toString(),pilote,graine});
  const dessin=await page.evaluate(()=>{
   const N=window.__N,G=N.gfx,S=window.__S;
   // Dessin réel d'une scène de jeu séparée, APRÈS la partie enregistrée.
   N.pilote.arreter();N.game.reset(7,{depart:'plongee'});N.intro.skip();N.game.dbg.scene('calme');
   N.gfx.masque(true);G.origin(0,0);G.clear(0);N.game.draw();N.fx.draw();N.game.drawTop();G.origin(0,0);N.fx.drawEcran?.();N.hud.draw();G.present();
   const buf=Array.from(G.buf()),histogramme=Array(16).fill(0);let horsPalette=0;
   for(const v of buf)if(v<16)histogramme[v]++;else horsPalette++;
   return {etat:N.game.etat(),w:G.W,h:G.H,px:G.PX,horsPalette,histogramme,buf,journal:N.journal.dump(),err:window.__ERR,player:{...S.player}};
  });
  const stem=`${serie}-${profil}-${pilote}-${graine}`;
  if(graine===1){await page.screenshot({path:path.join(dir,stem+'.png')});fs.writeFileSync(path.join(dir,stem+'-pixels.json.gz'),zlib.gzipSync(JSON.stringify(dessin)));}
  const journalSha256=hash(r.journal),{journal,sorties,...reste}=r;
  const cache=stem+'.json.gz';fs.writeFileSync(path.join(dir,cache),zlib.gzipSync(JSON.stringify({...r,dessin,erreursConsole:erreurs})));
  const c={serie,profil,...reste,journalSha256,sortiesSha256:hash(sorties),cache,erreursConsole:erreurs,dessin:{etat:dessin.etat,w:dessin.w,h:dessin.h,horsPalette:dessin.horsPalette,histogramme:dessin.histogramme,bufSha256:hash(dessin.buf),err:dessin.err}};
  bilan.cas.push(c);save();
  if(r.raison!=='fin')bilan.erreurs.push(stem+' : '+r.raison+' à '+r.tempsJeu+' s');
  assert.equal(r.err,0,stem+' __ERR');assert.equal(dessin.err.count,0,stem+' erreur dessin');assert.equal(erreurs.length,0,stem+' console');assert.equal(dessin.horsPalette,0,stem+' palette');assert(dessin.histogramme.filter(n=>n>0).length>1,stem+' tampon vide');
  if(pilote==='humain'&&serie==='apres'){assert.equal(sorties.pouvoir.length,0,stem+' pouvoir manuel');assert.equal(sorties.apogee.length,0,stem+' APOGÉE manuelle');assert.equal(sorties.boost.length,0,stem+' boost');}
  console.log(JSON.stringify({serie,profil,pilote,graine,t:r.tempsJeu,err:r.err}));return c;
 }finally{await context.close();}
}
let origin;
try{
 await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({args:['--mute-audio']});bilan.chromium=browser.version();
 for(const [profil]of Object.entries(profils)){
  if(profil==='paysage'){
   for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=(fumee?1:pilote==='humain'?50:10);graine++){
    const a=await run('avant',profil,pilote,graine),b=await run('apres',profil,pilote,graine);
    if(pilote!=='humain'){
     const champs=['raison','etat','tempsJeu','tempsCombat','tempsSimule','pas','vague','score','journalSha256','sortiesSha256'];
     const differences=champs.filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));bilan.paires.push({pilote,graine,identique:!differences.length,differences});save();assert.equal(differences.length,0,'Régression autre pilote');
    }
   }
  }else for(let graine=1;graine<=(fumee?1:5);graine++)await run('apres',profil,'humain',graine);
 }
 bilan.complete=true;bilan.conforme=bilan.paires.every(p=>p.identique)&&!bilan.erreurs.length;
}catch(e){bilan.erreurs.push(String(e.stack||e));bilan.conforme=false;process.exitCode=1;}
finally{save();if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));}

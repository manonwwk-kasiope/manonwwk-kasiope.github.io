/* À lancer hors bac : cd proto-neon && node tools/codex-p38/verifier.mjs
   Un serveur Node sur port libre et UN Chromium muet ; profils et pages strictement en série.
   Ne contacte aucun service extérieur. Les deux bundles proviennent de preparer.mjs.
   Un échec avant est attendu ; seule la candidate doit satisfaire l'égalité stricte. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {installerRAF,amorcerPartie,jouerControle} from '../codex-p16/raf-controle.mjs';
import {jeu,comparer,sha} from './rejouer.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),OUT=path.join(HERE,'navigateur');
fs.mkdirSync(OUT,{recursive:true});
const manifeste=JSON.parse(fs.readFileSync(path.join(HERE,'manifeste.json')));
const bundles=Object.fromEntries(['avant','apres'].map(phase=>{const html=fs.readFileSync(path.join(HERE,'bundle-'+phase+'.html'));assert.equal(sha(html),manifeste.bundles[phase]);return [phase,html];}));
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900},isMobile:false,hasTouch:false}]];
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),manifeste,cas:[],repetitions:[],limite:'Chromium avec émulation iPhone ; ne qualifie pas Safari réel.'};
const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(out,null,2)+'\n');
const serveur=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url,'http://local').pathname;
    for(const phase of ['avant','apres']) if(u==='/__p38-'+phase+'.html'){res.setHeader('Content-Type','text/html');return res.end(bundles[phase]);}
    const f=path.resolve(ROOT,'.'+decodeURIComponent(u));
    if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
    const type={'.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json','.js':'text/javascript'};
    res.setHeader('Content-Type',type[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
  }catch(e){res.writeHead(400);res.end();}
});
let browser;
try{
  await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
  browser=await chromium.launch({args:['--mute-audio']});out.chromium=browser.version();
  const origine=`http://127.0.0.1:${serveur.address().port}`;
  async function run(phase,profil,options,graine,simulation,repetition=false){
    const ctx=await browser.newContext(options),errors=[],reseau=[];
    await ctx.route('**/*',route=>{const u=route.request().url();return u.startsWith(origine+'/')||u.startsWith('data:')?route.continue():route.abort('blockedbyclient');});
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)reseau.push({url:r.url(),statut:r.status()});});
    try{
      await page.addInitScript(g=>{window.__SEED=g;window.__DT=1/60;},graine);
      await page.addInitScript(installerRAF);
      await page.goto(origine+'/__p38-'+phase+'.html?journal=1',{waitUntil:'load'});
      const attente=await page.evaluate(()=>window.__N.R.perf.attenteP16);
      await page.waitForFunction(()=>window.__N?.art?.ready()&&window.__R30RAF,null,{timeout:attente.delaiMs,polling:attente.pollingMs});
      const debut=await page.evaluate(amorcerPartie,{graine});
      // Snapshot des vraies entrées appliquées, par pas ; sans changer le pilote ni ses décisions.
      await page.evaluate(()=>{
        window.__P38entrees=[];const pilote=window.__PILOT;
        window.__PILOT=d=>{pilote(d);window.__P38entrees.push({pas:window.__N.horloge.pas(),t:window.__N.horloge.t(),input:JSON.parse(JSON.stringify(window.__S.input))});};
      });
      const r=await page.evaluate(jouerControle,{T:60,simulation,dessiner:!simulation});
      const mesures=await page.evaluate(()=>{
        const N=window.__N,b=N.gfx.buf(),histogramme=Array(16).fill(0);let horsPalette=0;
        for(const p of b){if(p<16)histogramme[p]++;else horsPalette++;}
        return {pixels:{w:N.gfx.W,h:N.gfx.H,indices:Array.from(b),histogramme,horsPalette},entrees:window.__P38entrees,etat:N.game.dbg().st,horloge:N.horloge.etat(),vue:window.__S.vue};
      });
      if(!simulation)await page.screenshot({path:path.join(OUT,`${phase}-${profil}-${graine}${repetition?'-bis':''}.png`)});
      const {indices,...pixels}=mesures.pixels;pixels.sha256=sha(new Uint8Array(indices));
      return {...r,debut,erreursConsole:errors,reseau,pixels,entrees:mesures.entrees,etat:mesures.etat,horloge:mesures.horloge,vue:mesures.vue};
    }finally{await ctx.close();}
  }
  for(const [profil,options] of profils)for(let graine=1;graine<=10;graine++){
    const cas={profil,graine,variantes:{}};
    for(const phase of ['avant','apres']){
      const dessine=await run(phase,profil,options,graine,false),simule=await run(phase,profil,options,graine,true);
      const comparaison=comparer(jeu(dessine.journal),jeu(simule.journal));
      const bornePas=Math.min(dessine.fin.pas,simule.fin.pas);
      const a=dessine.entrees.filter(e=>e.pas<=bornePas),b=simule.entrees.filter(e=>e.pas<=bornePas);
      const entreesIdentiques=JSON.stringify(a)===JSON.stringify(b);
      const fichier=`${phase}-${profil}-${graine}.json.gz`;
      fs.writeFileSync(path.join(OUT,fichier),zlib.gzipSync(JSON.stringify({dessine,simule})));
      const erreurs=[dessine,simule].every(r=>r.ok&&!r.err.count&&!r.erreursConsole.length&&!r.reseau.length);
      cas.variantes[phase]={...comparaison,entreesIdentiques,pasEntreesCommuns:bornePas,fin:[dessine.fin,simule.fin],erreurs,preuve:fichier,pixels:dessine.pixels};
      if(phase==='apres'&&graine===7){
        const bis=await run(phase,profil,options,graine,false,true);
        const signature=J=>J.filter(e=>!['perf','vue','sfx','bloc','section','geste'].includes(e.type)&&e.t<=60).map(e=>JSON.stringify([e.pas,e.type,e.d]));
        const trace=signature(dessine.journal),traceBis=signature(bis.journal);
        out.repetitions.push({profil,graine,journauxComplets:JSON.stringify(trace)===JSON.stringify(traceBis),pixels:dessine.pixels.sha256===bis.pixels.sha256,erreurs:!bis.err.count&&!bis.erreursConsole.length});
        fs.writeFileSync(path.join(OUT,`apres-${profil}-${graine}-bis.json.gz`),zlib.gzipSync(JSON.stringify(bis)));
      }
      console.log(phase,profil,graine,comparaison.egaux,comparaison.premier,entreesIdentiques);save();
    }
    out.cas.push(cas);save();
  }
  out.conforme=out.cas.length===30&&out.cas.every(c=>c.variantes.apres.egaux&&c.variantes.apres.entreesIdentiques&&c.variantes.apres.erreurs&&c.variantes.apres.pixels.horsPalette===0)&&out.repetitions.every(c=>c.journauxComplets&&c.pixels&&c.erreurs);
  if(!out.conforme)process.exitCode=1;
}catch(e){out.erreur=String(e.stack||e);process.exitCode=1;}
finally{save();if(browser)await browser.close();await new Promise(resolve=>{if(serveur.listening)serveur.close(resolve);else resolve();});}

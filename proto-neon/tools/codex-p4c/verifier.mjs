// Hors bac seulement : cd proto-neon && node tools/codex-p4c/verifier.mjs
// Un seul Chromium muet, profils et pages en série. --scenes-seules réutilise les parties déjà reçues.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {scenarios,partieNavigateur} from './scenarios.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),OUT=path.join(HERE,'playwright');
fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
let avant=html;
for(const f of ['02-regles.js','72-ennemis.js','73-arene.js']) {
  const actuel=fs.readFileSync(path.join(ROOT,'src',f),'utf8');
  if(!avant.includes(actuel)) throw new Error('Reconstruire index.html : source absente du bundle '+f);
  avant=avant.replace(actuel,()=>fs.readFileSync(path.join(HERE,'avant-'+f),'utf8'));
}
const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:crypto.createHash('sha256').update(html).digest('hex'),profils:[],parties:[],console:[]};
const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(bilan,null,2));
const server=http.createServer((req,res)=>{
  const u=decodeURIComponent(new URL(req.url,'http://local').pathname);
  if(u==='/index.html'||u==='/avant.html') {res.setHeader('Content-Type','text/html');res.end(u==='/avant.html'?avant:html);return;}
  const f=path.resolve(ROOT,'.'+u);
  if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()) {res.writeHead(404);res.end();return;}
  const types={'.js':'text/javascript','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json'};
  res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
});
let browser;
try {
  await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});
  browser=await chromium.launch({args:['--mute-audio']});bilan.chromium=browser.version();
  for(const [profil,opt] of Object.entries({paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900}}})) {
    for(const mode of ['avant','apres']) {
      async function pageNeuve(graine) {
        const ctx=await browser.newContext(opt),page=await ctx.newPage();
        page.on('pageerror',e=>bilan.console.push({profil,mode,erreur:e.message}));
        page.on('console',m=>{if(m.type()==='error')bilan.console.push({profil,mode,erreur:m.text()});});
        await page.addInitScript(g=>{window.__SEED=g;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};},graine);
        await page.goto(`http://127.0.0.1:${server.address().port}/${mode==='avant'?'avant':'index'}.html?journal=1`,{waitUntil:'load'});
        return {ctx,page};
      }
      const {ctx,page}=await pageNeuve(7);
      try {
        const r=await page.evaluate(scenarios);
        for(const c of r.captures) {
          const base=mode+'-'+profil+'-'+c.nom,bytes=Buffer.from(c.buf);
          fs.writeFileSync(path.join(OUT,base+'.bin'),bytes);c.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
          await page.evaluate(c=>{window.__N.gfx.buf().set(c.buf);window.__N.gfx.present();},c);
          await page.locator('#out').screenshot({path:path.join(OUT,base+'.png')});delete c.buf;
        }
        r.reguliersHorsVue=r.ennemis.every(e=>!e.debut.dansVue&&e.apparitions.every(j=>{const v=j.d.vue;return v&&!(j.d.x>=v.x&&j.d.x<=v.x+v.w&&j.d.y>=v.y&&j.d.y<=v.y+v.h);}));
        r.annonceAvantMouvement=r.murs[0].premier?.delai>=2;
        r.cyclopeDansVue=r.cyclope.filter(j=>{const d=j.d,v=d.vue;return v&&d.x>=v.x&&d.x<=v.x+v.w&&d.y>=v.y&&d.y<=v.y+v.h;}).length;
        bilan.profils.push({profil,mode,...r});save();
      } finally {await ctx.close();}
      if(!process.argv.includes('--scenes-seules')) for(const pilote of ['bon','humain']) for(let graine=1;graine<=10;graine++) {
        const {ctx,page}=await pageNeuve(graine);
        try {
          const r=await page.evaluate(partieNavigateur,{pilote,graine}),f=`${mode}-${profil}-${pilote}-${graine}.json.gz`;
          fs.writeFileSync(path.join(OUT,f),zlib.gzipSync(JSON.stringify(r)));
          const {journal,...resume}=r;bilan.parties.push({mode,profil,...resume,journal:f});save();
          console.log(JSON.stringify({mode,profil,pilote,graine,dansVue:r.dansVue,sansAnnonce:r.sansAnnonce,err:r.err.count}));
        } finally {await ctx.close();}
      }
    }
  }
  bilan.conforme=bilan.profils.filter(p=>p.mode==='apres').every(p=>p.reguliersHorsVue&&p.annonceAvantMouvement&&!p.cyclopeDansVue&&!p.err.count&&p.captures.every(c=>c.horsPalette===0&&c.nonVide>0))&&bilan.parties.filter(p=>p.mode==='apres').every(p=>!p.dansVue&&!p.armementsHorsVue&&!p.sansAnnonce&&!p.err.count&&p.raison==='fin')&&!bilan.console.length;
  if(!bilan.conforme)process.exitCode=1;
} catch(e) {bilan.environnement=String(e.stack||e);process.exitCode=1;}
finally {save();if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));}

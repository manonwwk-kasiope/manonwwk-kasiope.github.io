/* Hors bac uniquement : node proto-neon/tools/codex-p8/verifier.mjs
   Serveur sur port libre, un seul Chromium muet, contextes en série.
   Mesures de N.gfx.buf() APRÈS joueuse.drawTop et captures du canvas affiché. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { mesurer, capturer } from './sonde.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'../..');
const OUT=path.join(HERE,'navigateur'); fs.mkdirSync(OUT,{recursive:true});
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'index.html'))).digest('hex'),limite:'Chromium émulant iPhone : ne qualifie pas Safari matériel.',cas:[]};
const serveur=http.createServer((req,res)=>{
  const fichier=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!fichier.startsWith(ROOT+path.sep)||!fs.existsSync(fichier)||!fs.statSync(fichier).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json'})[path.extname(fichier)]||'application/octet-stream');
  fs.createReadStream(fichier).pipe(res);
});
let browser;
try {
  await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
  browser=await chromium.launch({args:['--mute-audio']}); bilan.navigateur=browser.version();
  for(const [profil,opts] of profils) for(const reduced of [false,true]) {
    const contexte=await browser.newContext({...opts,reducedMotion:reduced?'reduce':'no-preference'});
    try {
      const page=await contexte.newPage(),erreurs=[];
      page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
      await page.addInitScript(()=>{window.__SEED=7;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
      await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html?journal=1`,{waitUntil:'load'});
      const mesures=await page.evaluate(mesurer),captures=[];
      for(const scene of ['critique','boost']) {
        const etat=await page.evaluate(capturer,scene),nom=`${profil}-${reduced?'reduit':'anime'}-${scene}.png`;
        await page.locator('#out').screenshot({path:path.join(OUT,nom)});captures.push({nom,...etat});
      }
      const err=await page.evaluate(()=>window.__ERR);
      bilan.cas.push({profil,reduced,mesures,captures,err,erreurs});
    } finally {await contexte.close();}
  }
  bilan.conforme=bilan.cas.length===6&&bilan.cas.every(c=>!c.err.count&&!c.erreurs.length&&c.mesures.checks.every(t=>t.ok)&&c.captures.every(s=>!s.erreurs));
  if(!bilan.conforme)process.exitCode=1;
} catch(e) {bilan.environnement=String(e.stack||e);process.exitCode=1;}
finally {if(browser)await browser.close();await new Promise(r=>serveur.close(r));fs.writeFileSync(path.join(OUT,'sortie.json'),JSON.stringify(bilan,null,2));}
console.log(JSON.stringify({conforme:bilan.conforme,cas:bilan.cas.length,environnement:bilan.environnement}));

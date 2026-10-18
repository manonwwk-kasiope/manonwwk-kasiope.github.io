/* HORS BAC UNIQUEMENT : cd proto-neon && node build.mjs && node tools/codex-p27/verifier.mjs --raccords
   --raccords applique les patchs 03 et 76 au HTML en mémoire. Sans option après leur intégration.
   Un seul Chromium muet à la fois ; profils successifs ; port libre ; aucune requête extérieure permise.
   Exécute aussi les bancs cloud serpents, aventure et voyage, sans modifier leurs fichiers réservés. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';import {spawn}from 'node:child_process';
import {chromium,devices}from 'playwright';
import {ICI,PROTO,sources}from './vm.mjs';import {raccorder}from './raccords.mjs';
import {scenario,vagueScenario}from './scenarios.mjs';import {photosensibilite,apparitions}from './mesures.mjs';
let bundle=fs.readFileSync(PROTO+'/index.html','utf8');const raccords=process.argv.includes('--raccords');
if(raccords){const a=sources(),b=raccorder(a);for(let i=0;i<a.length;i++)if(a[i][1]!==b[i][1]){if(!bundle.includes(a[i][1]))throw Error('Reconstruire index.html avant le contrôle');bundle=bundle.replace(a[i][1],b[i][1]);}}
const OUT=ICI+'/navigateur';fs.mkdirSync(OUT,{recursive:true});
const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),raccordsEnMemoire:raccords,bundleSha256:crypto.createHash('sha256').update(bundle).digest('hex'),cas:[],bancs:[]};
const save=()=>fs.writeFileSync(OUT+'/mesures.json',JSON.stringify(bilan,null,2));
const server=http.createServer((req,res)=>{
 const u=decodeURIComponent(new URL(req.url,'http://local').pathname);
 if(u==='/index.html'||u==='/aventure.html'){res.setHeader('Content-Type','text/html');return res.end(u==='/aventure.html'?bundle.replace('</body>',fs.readFileSync(PROTO+'/tools/aventure/panneau.html','utf8')+'</body>'):bundle);}
 const f=path.resolve(PROTO,'.'+u);if(!f.startsWith(PROTO+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
 const types={'.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json','.png':'image/png','.js':'text/javascript'};
 res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');const size=fs.statSync(f).size,range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 if(range){const start=+range[1],end=range[2]?Math.min(size-1,+range[2]):size-1;if(start>end){res.writeHead(416);return res.end();}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1});return fs.createReadStream(f,{start,end}).pipe(res);}
 res.setHeader('Content-Length',size);fs.createReadStream(f).pipe(res);
});
let browser;
try{
 await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({args:['--mute-audio']});bilan.chromium=browser.version();
 for(const [profil,opts]of [['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]]){
  for(const [type,vague]of [['tique',2],['voleur',3],['miroir',4],['brouilleur',5]]){
   const ctx=await browser.newContext(opts);await ctx.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.addInitScript(()=>{window.__SEED=7;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
   try{
    await page.goto(base+'/index.html?journal=1',{waitUntil:'load'});
    const r=await page.evaluate('('+scenario.toString()+')('+JSON.stringify(type)+')');
    for(const c of r.captures){const nom=profil+'-'+type+'-'+c.nom;await page.evaluate(buf=>{const N=window.__N;N.gfx.buf().set(buf);N.gfx.present();},c.buf);await page.locator('#out').screenshot({path:OUT+'/'+nom+'.png'});fs.writeFileSync(OUT+'/'+nom+'.bin',Buffer.from(c.buf));c.sha256=crypto.createHash('sha256').update(Buffer.from(c.buf)).digest('hex');c.image=nom+'.png';delete c.buf;}
    const seuil=await page.evaluate(()=>window.__N.R.criteres.R13);r.R13=photosensibilite(r.transitions,seuil);r.R06=apparitions(r.journal);
    const v=await page.evaluate('('+vagueScenario.toString()+')('+JSON.stringify(type)+','+vague+')');v.R13=photosensibilite(v.transitions,seuil);v.R06=apparitions(v.journal);r.vagueForcee=v;
    r.conforme=!r.err&&!v.err&&!errors.length&&r.preavis>=.8&&r.interruption.annule&&r.interruption.repris>=.8&&!r.R06.dansVue&&!r.R06.horsVue&&!v.R06.dansVue&&!v.R06.horsVue&&!r.palette.hors&&!r.palette.cyan&&r.palette.maxPixels>0&&r.R13.maxParSeconde<=seuil.flashsParSeconde&&v.R13.maxParSeconde<=seuil.flashsParSeconde;
    bilan.cas.push({profil,...r,console:errors});save();console.log(profil,type,r.conforme?'OK':'ÉCHEC',JSON.stringify({preavis:r.preavis,R13:v.R13.maxParSeconde,err:r.err+v.err}));
   }finally{await ctx.close();}
  }
 }
 await browser.close();browser=null;
 // Adapter seulement chemins, serveur et sortie ; aucune assertion ni aucun seuil des bancs n'est retiré.
 const adapters=ICI+'/hors-bac';fs.mkdirSync(adapters,{recursive:true});
 for(const nom of ['serpents','aventure','voyage']){
  let code=fs.readFileSync(PROTO+'/tools/'+nom+'/banc.mjs','utf8').replaceAll("'/opt/node22/lib/node_modules/playwright/index.mjs'","'playwright'");
  code=code.replaceAll('http://127.0.0.1:8133/proto-neon/tools/aventure/index.html',base+'/aventure.html').replaceAll('http://127.0.0.1:8133/proto-neon/index.html',base+'/index.html');
  code=code.replaceAll("'--autoplay-policy=no-user-gesture-required'","'--autoplay-policy=no-user-gesture-required', '--mute-audio'");
  code=code.replace(/(const browser = await chromium.launch\([^\n]+\);)/g,`$1\nconst __ctx=browser.newContext.bind(browser);browser.newContext=async function(...args){const c=await __ctx(...args);await c.route('**/*',r=>r.request().url().startsWith('${base}/')?r.continue():r.abort());return c;};`);
  const script=adapters+'/'+nom+'.mjs';fs.writeFileSync(script,code);
  const args=nom==='serpents'?['--url',base+'/index.html','--sortie',OUT+'/'+nom]:nom==='aventure'?[OUT+'/'+nom]:['--sortie',OUT+'/'+nom];
  const log=fs.createWriteStream(OUT+'/'+nom+'.log');
  const exit=await new Promise((ok,ko)=>{const p=spawn(process.execPath,[script,...args],{stdio:['ignore','pipe','pipe']});p.stdout.pipe(log,{end:false});p.stderr.pipe(log,{end:false});p.on('error',ko);p.on('exit',c=>{log.end();ok(c);});});
  bilan.bancs.push({nom,exit,conforme:exit===0});save();console.log('banc',nom,'sortie',exit);
 }
 bilan.conforme=bilan.cas.length===12&&bilan.cas.every(c=>c.conforme)&&bilan.bancs.every(c=>c.conforme);if(!bilan.conforme)process.exitCode=1;
}catch(e){bilan.exception=e.stack;process.exitCode=1;console.error(e);}finally{save();if(browser)await browser.close();await new Promise(r=>server.close(r));}

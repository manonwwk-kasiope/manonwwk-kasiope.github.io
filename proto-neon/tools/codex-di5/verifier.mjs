/* Local : node proto-neon/tools/codex-di5/verifier.mjs --statique
   HORS BAC UNIQUEMENT : node proto-neon/tools/codex-di5/verifier.mjs --navigateur
   Cette branche n'a pas été exécutée par codex-di5. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {flashs} from './r13.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..');
if(!process.argv.includes('--navigateur')){
 execFileSync(process.execPath,[path.join(HERE,'controles.mjs')],{stdio:'inherit'});
 const f=path.join(HERE,'films.json');if(fs.existsSync(f)){
  const data=JSON.parse(fs.readFileSync(f));assert(data.termine,'Qualification des films incomplète');let relus=0;
  for(const film of data.films)for(const cas of film.cas){const file=path.join(HERE,'films',cas.masques);if(!fs.existsSync(file))continue;
   let images=JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));if(cas.selectionSegment)images=images.filter(x=>x.segment===cas.selectionSegment).map((x,i)=>({...x,w:i/cas.hz}));const r=flashs(images,.066,undefined,{hzFixe:cas.hz});assert(r.qualifiable);assert.equal(r.maxParSeconde,cas.maxParSeconde);assert.equal(r.a,cas.instant);relus++;
  }assert(relus>=data.films.length);console.log(JSON.stringify({masquesRelus:relus,films:data.films.length}));
 }
 const pf=path.join(HERE,'proceduraux.json');if(fs.existsSync(pf)){
  const p=JSON.parse(fs.readFileSync(pf));for(const c of p.cas){const file=path.join(HERE,c.segment?'films':'',c.masques);let images=JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));if(c.segment)images=images.filter(x=>x.segment===c.segment).map((x,i)=>({...x,w:i/c.hz}));const r=flashs(images,.066,undefined,{hzFixe:c.hz});assert(r.qualifiable);assert.equal(r.maxParSeconde,c.maxParSeconde);assert.equal(r.a,c.a);}console.log(JSON.stringify({complementsRelus:p.cas.length}));
 }
}else{
 const {chromium,devices}=await import('playwright');
 const http=await import('node:http');const {installer}=await import('../jury2/sonde.mjs');
 const LOCK='/tmp/snake-chromium-chef.lock';let owned=false,browser,server;
 const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),portee:'Chrome, temps de présentation w réel ; Safari physique reste à vérifier',profils:[]};
 try{
  fs.mkdirSync(LOCK);owned=true;
  server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local');const p=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!p.startsWith(ROOT+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);return res.end();}
   res.setHeader('Content-Type',({'.html':'text/html','.mp4':'video/mp4','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg'})[path.extname(p)]||'application/octet-stream');
   const length=fs.statSync(p).size,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);if(range){const a=+range[1],b=range[2]?Math.min(+range[2],length-1):length-1;if(a>b){res.writeHead(416);return res.end();}res.writeHead(206,{'Content-Range':`bytes ${a}-${b}/${length}`,'Accept-Ranges':'bytes','Content-Length':b-a+1});return fs.createReadStream(p,{start:a,end:b}).pipe(res);}res.setHeader('Content-Length',length);fs.createReadStream(p).pipe(res);
  });
  await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--disable-background-networking','--autoplay-policy=no-user-gesture-required']});
  const profils={paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900}}};
  for(const [profil,opts]of Object.entries(profils)){
   const ctx=await browser.newContext({...opts,serviceWorkers:'block'});
   try{
    await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
    await ctx.addInitScript({content:`(${function(){const p=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;this.defaultMuted=true;this.volume=0;return p.apply(this,arguments);};}.toString()})();(${installer.toString()})({pixels:true,media:false});`});
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(origin+'/index.html',{waitUntil:'load'});await page.waitForFunction(()=>window.__N?.art?.ready?.());
    const seuils=await page.evaluate(()=>__N.R.criteres.R13);
    const cases=[];
    for(const film of ['chasse','retournement','rival','plongee','reveil','apotheose']){
     await page.evaluate(film=>{__N.intro.skip();__N.game.reset(6,{depart:'jeu'});__N.game.dbg.etat('panneau');__N.intro.transition(film);__N.journal.actif(true);__jury.vider();__jury.commencer();},film);
     // Borne sur une horloge observée, aucun pas fixe supposé : la suite est prise après chaque rendu.
     await page.waitForFunction(()=>__jury.horloge().w>=6,null,{timeout:12000});
     const data=await page.evaluate(()=>({...__jury.vider(),journal:__N.journal.dump(),err:__ERR,etat:__N.game.etat()}));
     const file=`${profil}-${film}-reel.json.gz`;fs.writeFileSync(path.join(HERE,file),zlib.gzipSync(JSON.stringify(data)));
     const mesure=flashs(data.frames,seuils.aire);cases.push({film,fichier:file,mesure,etat:data.etat,err:data.err});assert(mesure.qualifiable);assert.equal(data.err.count,0);
    }out.profils.push({profil,cases,errors});assert.equal(errors.length,0);
   }finally{await ctx.close();}
  }
 }finally{if(browser)await browser.close();if(server?.listening)await new Promise(ok=>server.close(ok));if(owned)fs.rmdirSync(LOCK);fs.writeFileSync(path.join(HERE,'navigateur.json'),JSON.stringify(out,null,2)+'\n');}
}

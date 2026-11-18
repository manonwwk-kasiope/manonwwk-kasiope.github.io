'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {once}=require('node:events'),{execFileSync}=require('node:child_process'),v8=require('node:v8'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'../..'),old=path.join(__dirname,'temoin-4-epoques'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'snake-offline-')),bundle=path.join(tmp,'edition');
const report={};const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.mp3':'audio/mpeg','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json'};
let directory=old,missing=new Set(),offline=false,requests=0,scope,denySockets=false;
let meter=null,disconnectFile=null;
const server=http.createServer((req,res)=>{

  const url=new URL(req.url,'http://127.0.0.1'),file=decodeURIComponent(url.pathname.slice('/arcade/'.length))||'index.html';
  if(!url.pathname.startsWith('/arcade/')||!file.split('/').every(part=>part!=='.'&&part!=='..'&&part!=='')){res.writeHead(400).end();return;}
  if(meter)meter.push({file,bytes:0});
  if(denySockets){req.socket.destroy();return;}
  if(file==='probe.html'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Test de cache</title>');return;}
  if(missing.has(file)||!fs.existsSync(path.join(directory,file))||!fs.statSync(path.join(directory,file)).isFile()){res.writeHead(404).end();return;}
  const data=fs.readFileSync(path.join(directory,file));
  if(meter)meter[meter.length-1].bytes=data.length;
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':data.length,'ETag':'"'+data.length+'"'});res.end(data);
});
async function net(req){
  requests++;
  const name=new URL(typeof req==='string'?req:req.url).pathname.slice('/arcade/'.length);
  if(disconnectFile===name){
    if(meter)meter.push({file:name,bytes:0});
    throw new TypeError('Connexion interrompue');
  }
  if(offline)throw new TypeError('offline');
  return fetch(req);
}
class Buckets{
  constructor(data=new Map()){this.data=data;}
  async keys(){return [...this.data.keys()];}
  async delete(k){return this.data.delete(k);}
  async open(k){
    if(!this.data.has(k))this.data.set(k,new Map());const entries=this.data.get(k);
    const key=r=>typeof r==='string'?r:r.url;
    const pack=async r=>({status:r.status,headers:[...r.headers],bytes:Buffer.from(await r.arrayBuffer())});
    return {async put(r,res){entries.set(key(r),await pack(res));},
      async match(r){const e=entries.get(key(r));return e?new Response(e.bytes,{status:e.status,headers:e.headers}):undefined;},
      async addAll(batch){const ready=[];for(const r of batch){const res=await net(r);if(!res.ok)throw Error('précache '+res.status);ready.push([key(r),await pack(res)]);}for(const [url,row] of ready)entries.set(url,row);}
    };
  }
}
function worker(code,caches){
  const handlers={},lifecycle={waiting:false,claimed:false};
  const self={registration:{scope},async skipWaiting(){lifecycle.waiting=true;},clients:{async claim(){lifecycle.claimed=true;}},
    addEventListener(type,fn){handlers[type]=fn;}};
  vm.runInNewContext(code,{self,caches,fetch:net,Request,Response,Headers,URL,Set,crypto:require("node:crypto").webcrypto},{filename:'sw.js'});
  const signal=type=>new Promise((resolve,reject)=>{handlers[type]({waitUntil:p=>Promise.resolve(p).then(resolve,reject)});});
  return {lifecycle,signal,async serve(name,headers={}){const request=new Request(new URL(name,scope),{headers});let p;
    handlers.fetch({request,respondWith:r=>{p=r;}});return p||net(request);}};
}
function browserModel(storage){
  const tab={window:{addEventListener(){}},document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},localStorage:{
    get length(){return storage.size;},key:i=>[...storage.keys()][i],getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},btoa,atob};
  return vm.createContext(tab);
}
const bytes=async r=>Buffer.from(await r.arrayBuffer());
async function range(w,name){
  const original=fs.readFileSync(path.join(bundle,name)),n=original.length;
  const ranges=[['bytes=11-42',11,42],['bytes=-239',n-239,n-1],['bytes='+(n-50)+'-',n-50,n-1]];
  for(const [value,start,end] of ranges){
    const r=await w.serve(name,{Range:value});assert.equal(r.status,206);
    assert.equal(r.headers.get('Content-Type'),mime[path.extname(name)]);assert.equal(r.headers.get('Content-Range'),'bytes '+start+'-'+end+'/'+n);
    assert.equal(r.headers.get('ETag'),'"'+n+'"');assert.equal(r.headers.get('Content-Length'),String(end-start+1));assert.deepEqual(await bytes(r),original.subarray(start,end+1));
  }
  const invalid=await w.serve(name,{Range:'bytes='+n+'-'});assert.equal(invalid.status,416);
  assert.equal(invalid.headers.get('Content-Range'),'bytes */'+n);
  const valid=await w.serve(name,{Range:'bytes=0-3','If-Range':'"'+n+'"'});assert.equal(valid.status,206);
  assert.deepEqual(await bytes(valid),original.subarray(0,4));
  const stale=await w.serve(name,{Range:'bytes=0-3','If-Range':'"ancienne"'});assert.equal(stale.status,200);
  assert.deepEqual(await bytes(stale),original);
}
async function main(){
  const build=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'preparer.cjs'),bundle],{encoding:'utf8'}));report.edition=build.edition;
  const duplicate=path.join(tmp,'identique');
  const second=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'preparer.cjs'),duplicate],{encoding:'utf8'}));
  assert.equal(second.edition,build.edition);
  for(const f of fs.readdirSync(bundle,{recursive:true}))if(fs.statSync(path.join(bundle,f)).isFile())assert.deepEqual(fs.readFileSync(path.join(bundle,f)),fs.readFileSync(path.join(duplicate,f)));
  report.emittedFiles=build.files;report.buildsByteIdentical=true;
  server.listen(0,'127.0.0.1');await once(server,'listening');scope='http://127.0.0.1:'+server.address().port+'/arcade/';
  let db=new Buckets();await db.open('cache-autre-jeu');
  const oldSW=await (await net(scope+'sw.js')).text(),previous=worker(oldSW,db);
  await previous.signal('install');await previous.signal('activate');
  const storage=new Map(),tab=browserModel(storage);
  for(const name of ['moteur.js','palmares.js','fantome.js'])vm.runInContext(await (await previous.serve(name)).text(),tab);
  const before=Array.from(tab.window.SnakeArcade.eras,e=>e.year);assert.deepEqual(before,[1976,1985,2185,2985]);
  for(const year of before){
    const row={id:'fixture-'+year,year,difficulty:2,score:year*11,endedAt:1995,status:'dead',name:'PILOTE TEST'};
    tab.window.SnakePalmares.record(row);
    const game=tab.window.SnakeArcade.create(()=>.5,before.indexOf(year));tab.window.SnakeEcho.begin(year);
    tab.window.SnakeEcho.update(game);tab.window.SnakeArcade.tick(game,game.stepTime);game.score=row.score;tab.window.SnakeEcho.end(game);
  }
  const originalValues=new Map(storage);
  directory=bundle;const sw=await (await net(scope+'sw.js')).text(),candidate=worker(sw,db),blocked='audio/electro-titan-t112.mp3';
  missing.add('apercu-2985.webp');await assert.rejects(candidate.signal('install'));
  assert.equal(candidate.lifecycle.waiting,false);assert.match(await (await previous.serve('./')).text(),/moteur\.js/);
  missing.clear();meter=[];await candidate.signal('install');report.legacyReuse=summarize(meter);meter=null;await candidate.signal('activate');assert(candidate.lifecycle.claimed);
  const cacheKeys=await db.keys();assert(cacheKeys.includes('cache-autre-jeu'));assert.equal(cacheKeys.filter(n=>n.startsWith('snake2985:')).length,1);
  // Un nouveau contexte et des caches restaurés du disque représentent une reprise à froid.
  const checkpoint=path.join(tmp,'cache.bin');fs.writeFileSync(checkpoint,v8.serialize(db.data));
  db=new Buckets(v8.deserialize(fs.readFileSync(checkpoint)));const cold=worker(sw,db);offline=true;
  const initialRequests=requests;const html=await (await cold.serve('./?retour')).text();
  for(const file of ['arcade.js','arcade.css']){const link=html.match(new RegExp(file.replace('.','\\.')+'\\?v=[0-9a-f]+'))[0];
    assert.deepEqual(await bytes(await cold.serve(link)),fs.readFileSync(path.join(bundle,file)));}
  const all=fs.readdirSync(bundle,{recursive:true}).filter(f=>fs.statSync(path.join(bundle,f)).isFile()&&f!=='sw.js');
  for(const f of all)assert.deepEqual(await bytes(await cold.serve(f)),fs.readFileSync(path.join(bundle,f)));
  const packed=await (await cold.serve('arcade.js')).text(),coldTab=browserModel(storage);
  // Exécute les modules de lecture byte-pour-byte présents dans le bundle actif.
  for(const name of ['labo/moteur.js','palmares.js','labo/chrono/chrono.js']){
    const code=fs.readFileSync(path.join(project,name),'utf8');assert(packed.includes(code));vm.runInContext(code,coldTab);}
  assert.deepEqual(Array.from(coldTab.window.SnakeArcade.eras,e=>e.year),[1976,1985,1995,2185,2985]);
  const hall=coldTab.window.SnakePalmares,archives=coldTab.window.SnakeChrono.archive(coldTab.localStorage);
  for(const year of before){
    assert.equal(hall.list(year)[0].score,year*11);
    const echo=archives.load(year);assert(echo?.legacy);assert.equal(echo.year,year);assert.equal(echo.score,year*11);
  }
  assert.equal(hall.list(1995).length,0);assert.equal(archives.load(1995),null);
  hall.record({id:'nouveau-1995',year:1995,difficulty:1,score:1995,status:'dead'});
  for(const [k,v] of originalValues)assert.equal(storage.get(k),v);
  const media=all.filter(f=>f.endsWith('.mp3')||f.endsWith('.webp'));
  for(const name of media)await range(cold,name);
  assert.equal(requests,initialRequests);
  const plates=fs.readdirSync(path.join(project,'labo/campagne/decors'),{recursive:true}).filter(f=>f.endsWith('.webp')).sort().map(f=>'decors/'+f);
  for(const f of ['decors/chantier-orbital.webp','decors/circuit-antenne.webp','decors/quai-verriere.webp','decors/etoile-effondree.webp'])assert(plates.includes(f));
  const literalAllowlist=Object.keys(JSON.parse(sw.match(/const gameHashes = (\{[\s\S]*?\});/)[1]));
  for(const f of plates)assert(media.includes(f) && literalAllowlist.includes(f));
  for(const year of [1976,1985,1995,2185,2985])assert(literalAllowlist.includes('apercu-'+year+'.webp'));
  assert.equal(report.legacyReuse.files.filter(name=>name.endsWith('.mp3')).length,0);
  report.paintedPlates=plates.map(name=>({name,bytes:fs.statSync(path.join(bundle,name)).size,coldFull200:true,ranges206:4}));
  report.migration={years:before,records:4,ghosts:4,additional1995:hall.list(1995).length,cachedFiles:all.length,networkCallsCold:0,
    images:media.filter(f=>f.endsWith('.webp')).length,audio:media.filter(f=>f.endsWith('.mp3')).length,verified206:media.length*4};
  // Installation neuve avec deux médias absents puis vraie réparation lorsque le réseau revient.
  offline=false;const freshDb=new Buckets(),first=worker(sw,freshDb),card='paysage-1995.webp';
  missing=new Set([blocked,card]);await first.signal('install');await first.signal('activate');offline=true;
  assert.equal((await first.serve('./')).status,200);assert.equal((await first.serve('arcade.js')).status,200);
  const artwork=await first.serve(card);assert.match(artwork.headers.get('Content-Type'),/^image\/svg/);assert((await artwork.text()).includes('<svg'));
  assert.equal((await first.serve(blocked,{Range:'bytes=0-1'})).status,503);
  offline=false;missing.clear();
  await range(first,card);await range(first,blocked);offline=true;const healed=worker(sw,freshDb);
  const prior=requests;await range(healed,card);await range(healed,blocked);assert.equal(requests,prior);
  offline=false;missing=new Set(['arcade.js']);const failedDb=new Buckets(),broken=worker(sw,failedDb);
  await assert.rejects(broken.signal('install'));assert(!broken.lifecycle.waiting);assert.equal((await failedDb.keys()).length,0);
  report.firstInstall={missingMedia:2,illustration:'SVG de repli',absentAudio:503,repaired:2,missingCore:'installation refusée sans cache résiduel'};
  report.update={failedUpdate:'ancienne version toujours servie',activated:'nouvelle version seule pour cette portée',otherScope:'préservé'};
  missing.clear();offline=false;
  const fixtures=makeEditions(all);
  await incrementalCheck(all,fixtures);
  if(process.argv.includes('--browser-reuse'))await incrementalBrowser(fixtures,all);
  directory=bundle;
  if(process.argv.includes('--browser'))await browserCheck(all,media,build);
  console.log(JSON.stringify(report,null,2));
}
function summarize(records){
  const assets=records.filter(row=>!['sw.js','probe.html','favicon.ico'].includes(row.file));
  return {requests:assets.length,bytes:assets.reduce((sum,row)=>sum+row.bytes,0),files:assets.map(row=>row.file)};
}
function makeEditions(all){
  const buildWorker=require('./worker-build.cjs');
  const js=path.join(tmp,'modif-js'),media=path.join(tmp,'modif-media');
  fs.cpSync(bundle,js,{recursive:true});
  fs.appendFileSync(path.join(js,'arcade.js'),'\n/* Édition de vérification */\n');
  const stamp=require('node:crypto').createHash('sha256');
  for(const f of ['arcade.js','arcade.css'])stamp.update(f).update(fs.readFileSync(path.join(js,f)));
  const token=stamp.digest('hex').slice(0,16);
  const html=path.join(js,'index.html');
  fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace(/(arcade\.(?:css|js)\?v=)[a-f0-9]+/g,(_,prefix)=>prefix+token));
  // Conserver l'ordre du manifeste de la distribution témoin.
  const names=Object.keys(JSON.parse(fs.readFileSync(path.join(bundle,'sw.js'),'utf8').match(/const gameHashes = (\{[\s\S]*?\});/)[1]));
  assert.deepEqual([...names].sort(),[...all].sort());
  buildWorker(js,names);
  fs.cpSync(js,media,{recursive:true});
  const mp3=names.find(n=>n.endsWith('.mp3')),file=path.join(media,mp3),original=fs.readFileSync(file);
  original[original.length-1]^=1;fs.writeFileSync(file,original);buildWorker(media,names);
  return {js,media,mp3};
}
async function incrementalCheck(all,fixtures){
  const db=new Buckets(),phase={};
  // Un cache d'un autre montage du même jeu ne doit ni fournir des actifs ni être nettoyé.
  const foreignName='snake2985:/autre/:legacy',foreign=await db.open(foreignName);
  await foreign.put(new URL('arcade.js',scope).href,new Response(fs.readFileSync(path.join(bundle,'arcade.js'))));

  async function install(dir,label,expected,fail=false){
    directory=dir;meter=[];
    const code=fs.readFileSync(path.join(dir,'sw.js'),'utf8'),candidate=worker(code,db);
    try{
      if(fail){
        const oldKeys=await db.keys();
        await assert.rejects(candidate.signal('install'));assert.deepEqual(await db.keys(),oldKeys);assert(!candidate.lifecycle.waiting);
      }else{
        await candidate.signal('install');await candidate.signal('activate');
      }
      const m=summarize(meter);assert.deepEqual(m.files.slice().sort(),expected.slice().sort(),label);
      phase[label]={requests:m.requests,bytes:m.bytes};
    }finally{meter=null;}
    return candidate;
  }
  await install(bundle,'premiere',all);
  assert.equal(phase.premiere.bytes,all.reduce((n,file)=>n+fs.statSync(path.join(bundle,file)).size,0));
  const changed=['arcade.js','index.html'];
  const oldMusic=fs.readFileSync(path.join(bundle,fixtures.mp3));
  const script=await install(fixtures.js,'javascript',changed);
  // Cache corrompu à longueur inchangée, dont les éventuelles métadonnées sont intactes.
  const key=new URL('apercu-1995.webp',scope).href;
  const active=await db.open((await db.keys()).find(name=>name!==foreignName)),bad=await bytes(await active.match(key));
  bad[bad.length-1]^=1;await active.put(key,new Response(bad,{headers:{'Content-Type':'image/webp'}}));
  disconnectFile=fixtures.mp3;
  await install(fixtures.media,'coupure',[fixtures.mp3,'apercu-1995.webp'],true);
  assert.deepEqual(await bytes(await script.serve(fixtures.mp3)),oldMusic);disconnectFile=null;
  const target=path.join(fixtures.media,fixtures.mp3),correct=fs.readFileSync(target);
  fs.writeFileSync(target,oldMusic);
  try{await install(fixtures.media,'reseauCorrompu',[fixtures.mp3,'apercu-1995.webp'],true);}
  finally{fs.writeFileSync(target,correct);}
  await install(fixtures.media,'mediaEtCacheCorrompu',[fixtures.mp3,'apercu-1995.webp']);
  const rollback=await install(fixtures.js,'retourEditionPrecedente',[fixtures.mp3]);
  assert.deepEqual(await bytes(await rollback.serve(fixtures.mp3)),oldMusic);
  const last=await install(fixtures.media,'mediaSeul',[fixtures.mp3]);
  for(const name of all)assert.deepEqual(await bytes(await last.serve(name)),fs.readFileSync(path.join(fixtures.media,name)));
  assert((await db.keys()).includes(foreignName));
  report.incremental=phase;
}
async function incrementalBrowser(fixtures,all){
  const {chromium}=require('playwright');
  const executable=process.env.SNAKE_HEADLESS_SHELL||path.join(os.homedir(),'Library/Caches/ms-playwright/chromium_headless_shell-1187/chrome-mac/headless_shell');
  assert.equal(path.basename(executable),'headless_shell');
  const browser=await chromium.launch({executablePath:executable,headless:true,args:['--mute-audio','--autoplay-policy=user-gesture-required']});
  try{
    const page=await browser.newPage();
    await page.addInitScript(()=>{Object.defineProperty(HTMLMediaElement.prototype,'play',{value:()=>Promise.resolve()});});
    directory=bundle;await page.goto(scope+'probe.html');
    let first=true;const observations={};
    for(const [label,dir,expected] of [['premiere',bundle,all],['javascript',fixtures.js,['arcade.js','index.html']],['media',fixtures.media,[fixtures.mp3]],['rollback',fixtures.js,[fixtures.mp3]]]){
      directory=dir;meter=[];
      const edition=fs.readFileSync(path.join(dir,'sw.js'),'utf8').match(/const version = prefix \+ "([0-9a-f]+)"/)[1];
      await page.evaluate(async first=>{
        if(first)await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});
        else await (await navigator.serviceWorker.ready).update();
      },first);first=false;
      await page.waitForFunction(async edition=>{const names=await caches.keys();return !!navigator.serviceWorker.controller&&names.length===1&&names[0].endsWith(edition)&&!!(await navigator.serviceWorker.ready).active;},edition,{timeout:45000});
      const metrics=summarize(meter);
      assert.deepEqual(metrics.files.slice().sort(),expected.slice().sort());
      observations[label]={requests:metrics.requests,bytes:metrics.bytes,workerBytes:meter.filter(row=>row.file==='sw.js').reduce((n,row)=>n+row.bytes,0)};
      meter=null;
    }
    report.incrementalChromium=observations;
  }finally{meter=null;await browser.close();}
}
async function browserCheck(all,media,build){
  const {chromium}=require('playwright');
  const executable=process.env.SNAKE_HEADLESS_SHELL||path.join(os.homedir(),'Library/Caches/ms-playwright/chromium_headless_shell-1187/chrome-mac/headless_shell');
  assert.equal(path.basename(executable),'headless_shell');
  assert(fs.existsSync(executable),'chromium-headless-shell absent');
  let context,offlineHits=0;
  const profile=path.join(tmp,'profil');
  const start=async()=>{
    context=await chromium.launchPersistentContext(profile,{executablePath:executable,headless:true,args:['--mute-audio','--autoplay-policy=user-gesture-required'],viewport:{width:844,height:390}});
    await context.addInitScript(()=>{
      Object.defineProperty(HTMLMediaElement.prototype,'play',{value:function(){this.muted=true;this.volume=0;return Promise.resolve();}});
      if(window.AudioContext)Object.defineProperty(AudioContext.prototype,'resume',{value:()=>Promise.resolve()});
    });
    return context.newPage();
  };
  const ready=async page=>{await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.waitForFunction(()=>!!navigator.serviceWorker.controller);};
  try{
    directory=old;missing.clear();offline=false;
    let page=await start();await page.goto(scope);await ready(page);
    assert.deepEqual(await page.evaluate(()=>SnakeArcade.eras.map(e=>e.year)),[1976,1985,2185,2985]);
    await page.evaluate(()=>{
      for(const [i,{year}] of SnakeArcade.eras.entries()){
        SnakePalmares.record({id:'vrai-'+year,name:'PILOTE TEST',year,score:year*11,difficulty:2,status:'dead'});
        const g=SnakeArcade.create(()=>.5,i);SnakeEcho.begin(year);SnakeEcho.update(g);
        SnakeArcade.tick(g,g.stepTime);g.score=year*11;SnakeEcho.end(g);
      }
    });
    directory=bundle;
    // L'ancienne page peut se recharger sur controllerchange ; le processus d'actualisation lui survit.
    await page.evaluate(()=>{navigator.serviceWorker.ready.then(r=>r.update());});
    await page.waitForFunction(async edition=>(await caches.keys()).some(k=>k.endsWith(edition)) &&
      !(await caches.keys()).some(k=>k.endsWith('20261117-6')),build.edition,{timeout:45000});
    await page.goto(scope);await ready(page);await page.waitForFunction(()=>window.SnakeArcade?.eras.length===5);
    await context.close();context=null;
    // Même origine et même stockage, processus entièrement redémarré, réseau indisponible.
    denySockets=true;page=await start();await context.setOffline(true);
    page.on('response',r=>{if(r.fromServiceWorker())offlineHits++;});
    await page.goto(scope,{waitUntil:'load'});await ready(page);
    const actual=await page.evaluate(async({all,media})=>{
      const sha=async r=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await r.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
      const full={},partials={};
      for(const f of all){const r=await fetch(f);if(r.status!==200)throw Error(f+' '+r.status);full[f]=await sha(r);}
      for(const f of media){const r=await fetch(f,{headers:{Range:'bytes=11-42'}});partials[f]={status:r.status,range:r.headers.get('Content-Range'),hash:await sha(r)};}
      const archive=SnakeChrono.archive(localStorage);
      const ghosts=[1976,1985,2185,2985].map(year=>{const clip=archive.load(year);return [clip.year,clip.legacy,clip.score];});
      return {full,partials,ghosts,years:SnakeArcade.eras.map(e=>e.year),scores:SnakePalmares.list().map(r=>[r.year,r.score]),screen:document.body.dataset.screen};
    },{all,media});
    const sha=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
    for(const f of all)assert.equal(actual.full[f],sha(fs.readFileSync(path.join(bundle,f))));
    for(const f of media){const b=fs.readFileSync(path.join(bundle,f)),r=actual.partials[f];assert.equal(r.status,206);assert.equal(r.range,'bytes 11-42/'+b.length);assert.equal(r.hash,sha(b.subarray(11,43)));}
    assert.deepEqual(actual.years,[1976,1985,1995,2185,2985]);assert.deepEqual(actual.scores.sort((a,b)=>a[0]-b[0]),[1976,1985,2185,2985].map(y=>[y,y*11]));
    assert.deepEqual(actual.ghosts,[1976,1985,2185,2985].map(y=>[y,true,y*11]));
    assert.equal(actual.screen,'prep');assert(offlineHits>0);
    report.chromium={updated:true,coldRestart:true,cachedVerified:all.length,ranges:media.length,scores:actual.scores,legacyGhosts:actual.ghosts.length,serviceWorkerResponses:offlineHits};
    // Un profil privé indépendant du profil migré exerce aussi la première installation dégradée.
    denySockets=false;missing=new Set(['paysage-1995.webp','audio/electro-titan-t112.mp3']);
    const incomplete=await context.browser().newContext({viewport:{width:844,height:390}});
    try {
      await incomplete.addInitScript(()=>{Object.defineProperty(HTMLMediaElement.prototype,'play',{value:()=>Promise.resolve()});});
      const tab=await incomplete.newPage();await tab.goto(scope);await ready(tab);denySockets=true;
      await incomplete.setOffline(true);await tab.reload();
      const probe=()=>tab.evaluate(async()=>{
        const img=await fetch('paysage-1995.webp'),clip=await fetch('audio/electro-titan-t112.mp3',{headers:{Range:'bytes=0-31'}});
        return [document.body.dataset.screen,img.headers.get('Content-Type'),img.status,clip.status,(await clip.arrayBuffer()).byteLength];
      });
      const degraded=await probe();assert.deepEqual(degraded.slice(0,4),['prep','image/svg+xml',200,503]);
      missing.clear();denySockets=false;await incomplete.setOffline(false);
      assert.deepEqual(await probe(),['prep','image/webp',200,206,32]);
      denySockets=true;await incomplete.setOffline(true);
      assert.deepEqual(await probe(),['prep','image/webp',200,206,32]);
      report.chromium.firstInstall='noyau hors ligne, dessin de repli, puis deux médias réparés';
    }finally{await incomplete.close();}
  }finally{denySockets=false;if(context)await context.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});});

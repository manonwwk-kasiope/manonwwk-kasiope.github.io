'use strict';
const {webkit}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'preuves'),years=[1976,1985,1995,2185,2985];
const stamp=process.env.CAMPAGNE_PASSE||'passe-01',folder=path.join(out,stamp),history=[];
fs.mkdirSync(out,{recursive:true});
fs.mkdirSync(folder); // Each run owns its evidence directory.
const log=(e)=>{history.push(e);fs.appendFileSync(path.join(folder,'journal.jsonl'),JSON.stringify(e)+'\n');};
function bindReadOnly(name,transform){
 let value;Object.defineProperty(window,name,{get(){return value;},set(v){value=transform(v);}});
}
function instrument(){
 window.probe={events:[],attempts:0,draws:0,realInputs:0,syntheticInputs:0,initialKeys:Object.keys(localStorage)};
 const p=window.probe;
 for(const t of ['click','keydown','keyup'])document.addEventListener(t,e=>{p[e.isTrusted?'realInputs':'syntheticInputs']++;},true);
 let seed=298501;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 bindReadOnly('SnakeArcade',v=>({...v,create(...args){const s=v.create(...args);p.s=s;return s;}}));
 bindReadOnly('SnakeMondeVivant',v=>({...v,observe(s,event){if(event&&['boss','bossDefeated','sector','workshopRecipe','death','flightStart','flightEnd','upgrade','clear','win'].includes(event.type))p.events.push({year:s.year,t:s.elapsed,...event});return v.observe(s,event);}}));
 bindReadOnly('SnakeSpectacle',v=>({...v,draw(...args){p.draws++;return v.draw(...args);}}));
 let clock=10,cursor=0,callbacks=new Map();
 window.requestAnimationFrame=fn=>{callbacks.set(++cursor,fn);return cursor;};
 window.cancelAnimationFrame=id=>callbacks.delete(id);
 p.run=function(dt){
   let left=dt;
   while(left>1e-9){const t=Math.min(.04,left),q=callbacks;callbacks=new Map();clock+=t*1000;for(const f of q.values())f(clock);left-=t;}
 };
}
async function main(){
 const server=http.createServer((req,res)=>{
   const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
   if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);res.end();return;}
   const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
   res.setHeader('content-type',type[path.extname(filename)]||'application/octet-stream');
   res.setHeader('Content-Security-Policy',"media-src 'none'; object-src 'none'");
   fs.createReadStream(filename).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/labo/campagne/index.html';
 let browser;
 try{
 browser=await webkit.launch({headless:true});const c=await browser.newContext({viewport:{width:854,height:393},reducedMotion:'reduce',serviceWorkers:'block'});
 await c.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===new URL(url).origin&&!u.pathname.endsWith('.mp3')?route.continue():route.abort();});
 const source=fs.readFileSync(path.join(__dirname,'../equilibrage/pilotes.cjs'),'utf8');
 const build=fs.readFileSync(path.join(__dirname,'pilote.js'),'utf8');
 const silence=fs.readFileSync(path.join(__dirname,'../charge-ios/silence.js'),'utf8');
 await c.addInitScript({content:silence+'\n'+bindReadOnly.toString()+'\n('+instrument.toString()+')();\n(()=>{const module={exports:{}};'+source+'; const expertLibrary=module.exports;'+build+';window.pilotDecision=buildPilot(expertLibrary);})();'});
 const p=await c.newPage(),errors=[];p.on('pageerror',err=>{errors.push(err.message);log({type:'pageerror',message:err.message});});
 await p.goto(url,{waitUntil:'networkidle'});
 const run=dt=>p.evaluate(t=>probe.run(t),dt);
 const click=async(loc)=>{
   await loc.waitFor({state:'visible',timeout:4000});const b=await loc.boundingBox();assert(b);
   await p.mouse.click(b.x+b.width/2,b.y+b.height/2);
 };
 const take=async(id)=>{await p.screenshot({path:path.join(folder,id+'.png'),timeout:10000});};
 await run(.02);
 assert.deepEqual(await p.evaluate(()=>probe.initialKeys),[]);
 let index=0,attempt=0,held=[],screen='prep',changed=false,kept=false,upgradeCount=0;
 const snapshots=new Set(),epilogueMeasurements=[];let motionRestored=false;
 const release=async()=>{for(const k of held)await p.keyboard.up(k);held=[];};
 while(index<years.length){
   const year=years[index];if(screen==='prep'){
     attempt++;assert(attempt<=12,'12 tentatives '+year);
     assert.equal(await p.evaluate(()=>probe.s.year),year);
     await click(p.locator('[data-id=prism]'));await click(p.locator('[data-id=chain]'));
     await click(p.getByRole('button',{name:'Jouer en silence',exact:true}));
     log({type:'départ',year,attempt});screen='play';await run(.02);
   }
   for(let n=0;screen==='play'&&n<5000;n++){
     const v=await p.evaluate(()=>{
       const s=probe.s,screen=document.body.dataset.screen;
       const c=document.querySelector('#monde'),r=SnakeSpectacle;
       const project=pt=>{
         const q=r.project(r.camera(s,s.elapsed,matchMedia('(prefers-reduced-motion: reduce)').matches),pt.x,pt.y,s.plane);return {x:q.x*c.clientWidth/r.width,y:q.y*c.clientHeight/r.height};
       };
       return {screen,year:s.year,sector:s.difficulty,levels:s.levels,status:s.status,boss:s.boss?.name,bossKind:s.boss?.kind,
         action:screen==='play'?pilotDecision(s,project):null};
     });
     if(v.screen!=='play'){screen=v.screen;break;}
     if(year===2985 && v.bossKind==='final' && !motionRestored){
       await p.emulateMedia({reducedMotion:'no-preference'});motionRestored=true;
     }
     if(v.boss&&!snapshots.has(year+'-'+attempt+'-'+v.bossKind)){
       snapshots.add(year+'-'+attempt+'-'+v.bossKind);await take(year+'-'+attempt+'-boss-'+v.bossKind);
     }
     const a=v.action;
     if(a.flight){
       for(const k of held.filter(x=>!a.keys.includes(x)))await p.keyboard.up(k);
       for(const k of a.keys.filter(x=>!held.includes(x)))await p.keyboard.down(k);
       held=a.keys;
     }else{
       await release();if(a.shift)await p.keyboard.press('x');if(a.fire)await p.keyboard.press('Space');await p.keyboard.press(a.keys[0]);
     }
     await run(a.advance);
   }
   await release();assert.notEqual(screen,'play','pilotage hors délai');
   if(screen==='upgrade'){
     const info=await p.evaluate(()=>({n:probe.s.difficulty,levels:probe.s.levels}));
     const satellite=p.locator('.sat-confirmer');
     if(await satellite.count()){
       await take(year+'-'+attempt+'-atelier-satellite');
       if(index%2===0)await click(p.locator('.sat-mode').nth(2));
       await click(satellite);
       const rec=await p.evaluate(()=>SnakeAtelier.receipt(probe.s));assert(rec);if(rec.changed)changed=true;else kept=true;
       log({...rec,type:'atelier-satellite',attempt});
     }
     await take(year+'-'+attempt+'-upgrade-'+info.n);
     const gun=!info.levels.arc?1:!info.levels.rail?0:2;await click(p.locator('.ameliorations button').nth(gun));
     upgradeCount++;screen='play';continue;
   }
   assert.equal(screen,'end');
   const summary=await p.evaluate(()=>({status:probe.s.status,score:probe.s.score,cause:probe.s.cause,sector:probe.s.difficulty,events:probe.events.splice(0),t:probe.s.elapsed,draws:probe.draws}));
   log({type:'issue',year,attempt,...summary});await take(year+'-'+attempt+'-fin');
   if(summary.status==='dead'){assert.equal(await p.locator('.vic-epilogue').count(),0);await click(p.locator('.bf-retry'));screen='prep';continue;}
   assert.equal(summary.status,index===4?'won':'cleared');
   assert.equal(summary.events.filter(ev=>ev.type==='bossDefeated').length,2);
   const won=summary.status==='won';
   if(won){
     const root=p.locator('.vic-epilogue');await root.waitFor();
     assert.equal(await p.locator('.bf-review,.bf-launch').count(),0);
     assert(await p.locator('.vic-primary').evaluate(b=>document.activeElement===b));
     const dates=await root.locator('.vic-date').allTextContents();
     assert.deepEqual(dates,years.map(String));
     assert.equal(await root.locator('h2').textContent(),'Singularité vaincue');
     const score=await root.locator('.vic-score strong').textContent();
     assert.equal(Number(score.replace(/[^0-9]/g,'')),summary.score);
     for(const [width,height,motion] of [[854,393,'no-preference'],[568,275,'no-preference'],[568,275,'reduce']]){
       await p.setViewportSize({width,height});await p.emulateMedia({reducedMotion:motion});
       const m=await root.evaluate(async el=>{
         const all=q=>[...el.querySelectorAll(q)];
         const imgs=all('.vic-land');await Promise.all(imgs.map(img=>img.decode()));
         const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
         return {width:innerWidth,height:innerHeight,root:rect(el),scroll:el.scrollHeight-el.clientHeight,
           title:rect(el.querySelector('.vic-title')),route:rect(el.querySelector('.vic-route')),
           dates:all('.vic-date').map(rect),gestures:all('.vic-gestures li').map(n=>n.textContent),
           buttons:all('button').map(b=>({label:b.textContent,...rect(b)})),
           images:imgs.map(img=>({loaded:img.naturalWidth>0,name:getComputedStyle(img).animationName,delay:getComputedStyle(img).animationDelay}))};
       });
       const label=width+'x'+height+'-'+motion;
       const contained=b=>b.x>=m.root.x-1&&b.y>=m.root.y-1&&b.x+b.w<=m.root.x+m.root.w+1&&b.y+b.h<=m.root.y+m.root.h+1;
       assert(m.root.x>=0 && m.root.y>=0 && m.root.x+m.root.w<=width+1 && m.root.y+m.root.h<=height+1,label);
       assert(m.scroll<=1 && m.route.h>=48 && m.dates.every(contained) && m.buttons.every(b=>contained(b)&&b.h>=44&&b.w>=44),label);
       assert(m.title.y+m.title.h<=m.route.y+1 && m.buttons.every(b=>b.y>=m.route.y+m.route.h-1),label);
       assert.equal(m.buttons.length,3);assert(m.gestures.length<=2);
       assert(m.images.every(i=>i.loaded && i.name===(motion==='reduce'?'none':'vic-arrive')),label);
       if(motion!=='reduce')assert.equal(new Set(m.images.map(i=>i.delay)).size,years.length);
       epilogueMeasurements.push({...m,motion});log({type:'épilogue',...m,motion});
       const dir=path.join(folder,'epilogue');fs.mkdirSync(dir,{recursive:true});
       await p.screenshot({path:path.join(dir,label+'.png'),timeout:10000});
     }
     await p.setViewportSize({width:854,height:393});
   }else assert.equal(await p.locator('.vic-epilogue').count(),0);
   await click(p.getByRole('button',{name:won?'Signer le palmarès':'Signer · Palmarès',exact:true}));
   const signature=p.locator('dialog[open] input');
   if(won)assert(await signature.evaluate(b=>document.activeElement===b));
   await signature.fill('ARCADE QA');
   await click(p.getByRole('button',{name:'Signer',exact:true}));await take(year+'-palmares');
   await click(p.getByRole('button',{name:'Fermer',exact:true}));
   if(won)await p.waitForFunction(()=>document.activeElement?.textContent==='Signer le palmarès',null,{polling:20,timeout:1500});
   await click(p.locator(won?'.vic-primary':'.bf-launch'));
   await run(.04);screen='prep';index++;attempt=0;
 }
 assert(changed&&kept);
 const last=await p.evaluate(()=>({year:probe.s.year,screen:document.body.dataset.screen,hall:SnakePalmares.list(),muted:silence,inputs:{trusted:probe.realInputs,synthetic:probe.syntheticInputs},draws:probe.draws}));
 assert.equal(last.year,1976);assert.equal(last.screen,'prep');assert.equal(last.inputs.synthetic,0);assert(last.inputs.trusted>100);assert.equal(last.muted.media+last.muted.context,0);
 const complete=last.hall.filter(x=>x.cleared);assert.equal(complete.length,5);assert(complete.every(x=>x.name==='ARCADE QA'&&x.difficulty===10));
 await take('nouveau-cycle');await click(p.getByRole('button',{name:'Jouer en silence',exact:true}));await run(.55);
 assert.equal(await p.evaluate(()=>probe.s.year===1976&&probe.s.elapsed>.5&&document.body.dataset.screen==='play'),true);
 await p.reload({waitUntil:'networkidle'});await run(.02);await click(p.getByRole('button',{name:'Palmarès',exact:true}));await take('palmares-recharge');
 const persisted=await p.evaluate(()=>SnakePalmares.list());assert.deepEqual(persisted,last.hall);
 assert.deepEqual(errors,[]);
 log({type:'validation',upgradeCount,...last,persisted:true});fs.writeFileSync(path.join(folder,'resultat.json'),JSON.stringify({years,upgradeCount,changed,kept,epilogueMeasurements,last,persisted,errors},null,2));
 console.log('5 époques terminées, dix boss, nouveau cycle et scores signés persistants.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{log({type:'failure',message:String(e),stack:e.stack});console.error(e);process.exitCode=1;});

'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {webkit}=require('playwright'),instrument=require('./webkit-page.js');
const {timeline,tempos}=require('./mesure.cjs');
const bundle=process.env.CADENCE_BUNDLE;
const root=bundle?path.resolve(bundle):path.resolve(__dirname,'../..');
let edition=null;
if(bundle){
 const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 edition=worker.match(/const version = prefix \+ "([a-f0-9]{16})"/)[1];
 const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
 assert.equal(digest(worker.replace(edition,'__EDITION__')).slice(0,16),edition);
 const entries=JSON.parse(worker.match(/const gameHashes = (\{[\s\S]*?\});/)[1]);
 for(const [file,expected] of Object.entries(entries))assert.equal(digest(fs.readFileSync(path.join(root,file))),expected,file);
}
const source=fs.readFileSync(path.join(__dirname,'../equilibrage/pilotes.cjs'),'utf8');
const pilot=fs.readFileSync(path.join(__dirname,'../bout-en-bout/pilote.js'),'utf8');
const silence=fs.readFileSync(path.join(__dirname,'../charge-ios/silence.js'),'utf8');
const files=Object.keys(tempos);
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const motion=process.env.CADENCE_MOTION||'reduce';
assert(['normal','reduce'].includes(motion),'CADENCE_MOTION doit valoir normal ou reduce');
const report=edition?`webkit-${edition}-${motion}.json`:motion==='normal'?'webkit-anime-resultats.json':'webkit-resultats.json';
const room=bundle?'/index.html?muet=1':'/labo/campagne/index.html?muet=1';
function serve(){
 const types={'.html':'text/html','.js':'text/javascript','.webp':'image/webp','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
 return http.createServer((req,res)=>{
  const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Security-Policy',"media-src 'none'; object-src 'none'");
  res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');
  fs.createReadStream(filename).on('error',()=>res.destroy()).pipe(res);
 });
}
async function run(browser,origin,scenario,hz,policy,physical){
 const {year,seed,name}=scenario,max=physical?.duration??(name==='boss'?90000:15000);
 const ctx=await browser.newContext({viewport:{width:568,height:300},reducedMotion:motion==='normal'?'no-preference':'reduce',deviceScaleFactor:1,serviceWorkers:'block'});
 const errors=[];
 try{
  await ctx.addInitScript({content:silence+'\n('+instrument.toString()+')('+JSON.stringify({year,seed,policy,motion,timing:timeline(tempos[hz],max)})+');\n(()=>{const module={exports:{}};'+source+';const lib=module.exports;'+pilot+';window.pilotDecision=buildPilot(lib);})();'});
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===origin&&!/\.(mp3|wav|m4a|ogg)$/i.test(u.pathname)?r.continue():r.abort();});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+room,{waitUntil:'load'});await page.evaluate(()=>cadenceProbe.start());
  async function centre(selector){return page.evaluate(sel=>{const node=document.querySelector(sel);if(!node)return null;const b=node.getBoundingClientRect();return [Math.round(b.x+b.width/2),Math.round(b.y+b.height/2)];},selector);}
  async function click(sel){const p=await centre(sel);assert(p,sel);await page.mouse.click(...p);}
  const pre=await page.evaluate(()=>[window.silenceReady,SnakeCampagneSon.muteLocked,cadenceProbe.state.year,matchMedia('(prefers-reduced-motion: reduce)').matches]);assert.deepEqual(pre,[true,true,year,motion==='reduce']);
  await click('[data-id=prism]');await click('[data-id=chain]');await click('#validations .action');
  const stick=await centre('#stick');let down=false;
  await page.evaluate(()=>{cadenceProbe.testInput=true;});
  const commands=physical?.commands||[];
  async function advance(t){await page.evaluate(t=>cadenceProbe.until(t),t);}
  async function apply(c){
    const [,type,...args]=c;
    await page.evaluate(()=>cadenceProbe.beginInput());
    if(type!=='aim'&&down){await page.mouse.up();down=false;}
    if(type==='aim'){
      if(!down){await page.mouse.move(...stick);await page.mouse.down();down=true;}
      await page.mouse.move(stick[0]+args[0],stick[1]+args[1]);
    }else if(type==='touche')await page.keyboard.press(args[0]);
    else if(type==='clic')await page.mouse.click(args[0],args[1]);
    await page.evaluate(v=>cadenceProbe.endInput(...v),[type,args,type==='aim'?[stick[0]+args[0],stick[1]+args[1]]:args]);
  }
  async function issue(t,type,...a){const c=[t,type,...a];commands.push(c);await apply(c);}
  let duration=max;
  if(physical){
    for(const c of commands){await advance(c[0]);await apply(c);}
  }else if(name==='boss'){
    let t=8.3;
    while(t<max){
      await advance(t);const a=await page.evaluate(()=>cadenceProbe.action());
      if(a.kind==='fin'){duration=Math.ceil((t+1000)/1000)*1000;break;}
      if(a.kind==='atelier'){
        if(a.confirm)await issue(t,'clic',...await centre('.sat-confirmer'));
        const p=await centre('.ameliorations button:nth-child('+(a.i+1)+')');assert(p);await issue(t,'clic',...p);
      }else if(a.kind==='aim')await issue(t,'aim',...a.v);
      else{
        if(a.shift)await issue(t,'touche','x');if(a.fire)await issue(t,'touche','Space');await issue(t,'touche',a.d);
      }
      t=Math.round((t+a.in)*10)/10;
    }
  }else{
    for(const c of scenario.commands){
      const [t,type,x,y]=c;await advance(t);
      if(type==='aim')await issue(t,'aim',...await page.evaluate(([x,y])=>cadenceProbe.project(x,y),[x,y]));
      if(type==='turn')await issue(t,'touche',x>0?'ArrowRight':x<0?'ArrowLeft':y>0?'ArrowDown':'ArrowUp');
      if(type==='plan'||type==='nova')await issue(t,'touche',type==='plan'?'x':'Space');
    }
    duration=scenario.duration;
  }
  await advance(duration);if(down)await page.mouse.up();
  const data=await page.evaluate(()=>({snap:cadenceProbe.snap(),marks:cadenceProbe.observations,events:cadenceProbe.events,cues:cadenceProbe.cues,inputs:cadenceProbe.inputs,proofs:cadenceProbe.proofs,frames:cadenceProbe.frames,mute:window.silence}));
  assert.deepEqual(errors,[]);assert.deepEqual(data.mute,{media:0,context:0});assert(data.inputs.every(ev=>ev.at(-1)===true));
  const {snap,marks,events,inputs,proofs,frames}=data;
  return {samples:marks,finalState:snap,physical:{name,year,seed,commands,duration},result:{name,hz,policy,inputs:inputs.length,inputHash:hash(proofs),rawInputHash:hash(inputs),verified:proofs.length,marks:marks.length,states:hash(marks),final:hash(snap),
    cues:data.cues,events:events.map(e=>[e[0],+e[1].toFixed(6),e[2]]),status:snap.status,score:snap.score,frames,commandHash:hash(commands),muted:data.mute,errors}};
 }finally{await ctx.close();}
}
async function main(){
 const host=serve();await new Promise(r=>host.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+host.address().port;
 let browser;const results=[],physical=[];
 try{
  browser=await webkit.launch({headless:true});const traces=require('./commandes.json');
  for(const scenario of traces){
   const frozen=fs.existsSync(path.join(__dirname,'webkit-commandes.json'))?JSON.parse(fs.readFileSync(path.join(__dirname,'webkit-commandes.json'),'utf8')).find(t=>t.name===scenario.name):null;
   const base=await run(browser,origin,scenario,'60 Hz','mixte',frozen);physical.push(base.physical);results.push(base.result);
   console.log('référence',scenario.name,base.result.score,base.result.status,base.result.events.filter(e=>e[0]==='boss').length);
   if(!frozen)fs.writeFileSync(path.join(__dirname,'webkit-commandes.json'),JSON.stringify(physical,null,2)+'\n');
   for(const policy of ['mixte','variable'])for(const hz of files){
    if(policy==='mixte'&&hz==='60 Hz')continue;
    const r=await run(browser,origin,scenario,hz,policy,base.physical);results.push(r.result);
    console.log(policy,hz,scenario.name,r.result.status,r.result.score,r.result.states===base.result.states);
    if(policy==='mixte' && (r.result.states!==base.result.states || r.result.final!==base.result.final)){
      const i=r.samples.findIndex((s,j)=>hash(s)!==hash(base.samples[j]));
      const ref=i<0?base.finalState:base.samples[i],other=i<0?r.finalState:r.samples[i];
      r.result.divergence={seconde:i<0?'finale':i+1,fields:Object.fromEntries(Object.keys(ref).filter(k=>hash(ref[k])!==hash(other[k])).map(k=>[k,[ref[k],other[k]]]))};
    }
    fs.writeFileSync(path.join(__dirname,report),JSON.stringify({version:browser.version(),edition,motion,results},null,2)+'\n');
   }
  }
 }finally{if(browser)await browser.close();await new Promise(r=>host.close(r));}
 const mixed=results.filter(r=>r.policy==='mixte');
 const divergences=[];
 for(const t of physical){
   const rows=mixed.filter(r=>r.name===t.name);
   if(!rows.every(r=>r.states===rows[0].states&&r.final===rows[0].final))divergences.push(t.name);
   assert(results.filter(r=>r.name===t.name).every(r=>r.commandHash===rows[0].commandHash&&r.inputHash===rows[0].inputHash),'gestes DOM '+t.name);
 }
 console.log('Divergences mixte',divergences);
 assert.deepEqual(divergences,[],'Équivalence des états de simulation WebKit');
 assert(mixed.some(r=>r.name==='boss'&&r.events.some(e=>e[0]==='boss')),'gardien joué');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run,serve};

'use strict';
const {webkit}=require('playwright'),fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),crypto=require('crypto'),assert=require('assert/strict');
const lab=path.dirname(__dirname),game=path.dirname(lab),years=[1976,1985,1995,2185,2985];
const load=p=>fs.readFileSync(path.join(lab,p),'utf8');
async function main(){
 const assets=new Map(),hashes={};
 // Freeze the shipped scripts, styles, fonts and artwork on their first request.
 const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(game,'.'+name);
  if(!file.startsWith(game+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  if(!assets.has(name)){const bytes=fs.readFileSync(file);assets.set(name,bytes);hashes[name]=crypto.createHash('sha256').update(bytes).digest('hex');}
  const mime={'.html':'text/html','.js':'application/javascript','.webp':'image/webp','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
  res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Content-Security-Policy',"media-src 'none'; object-src 'none'");res.end(assets.get(name));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/labo/campagne/index.html';
 let browser;const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'snake-pellicule-'));console.log('Images temporaires '+tmp);
 try{
  browser=await webkit.launch({headless:true});const ctx=await browser.newContext({viewport:{width:960,height:440},deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'no-preference'});
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===new URL(url).origin&&!/\.(mp3|wav|ogg)$/.test(u.pathname)?r.continue():r.abort();});
  const js=load('charge-ios/silence.js')+'\n'+load('film/camera.js')+'\nfilmCamera();\n(()=>{const module={exports:{}};'+load('equilibrage/pilotes.cjs')+';const expertLib=module.exports;'+load('bout-en-bout/pilote.js')+';window.pilotDecision=buildPilot(expertLib);})();';
  await ctx.addInitScript({content:js});const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url,{waitUntil:'networkidle'});await p.evaluate(()=>cinema.advance(1,false));
  let held=[],ids=0;const clips=[],runs=[];
  const click=async loc=>{const box=await loc.boundingBox();assert(box);await p.mouse.click(box.x+box.width/2,box.y+box.height/2);};
  const release=async()=>{for(const k of held)await p.keyboard.up(k);held=[];};
  for(const [i,year] of years.entries()){
   let complete=false;
   for(let attempt=1;attempt<=10&&!complete;attempt++){
    const painted=await p.evaluate(async y=>y===1976||await SnakeMatieres.load(y),year);assert(painted);
    await click(p.locator('[data-id=prism]'));await click(p.locator('[data-id=chain]'));await click(p.getByRole('button',{name:'Jouer en silence',exact:true}));
    const logAt=await p.evaluate(()=>cinema.logs.length);
    let screen;
    for(let n=0;n<6000;n++){
      const data=await p.evaluate(()=>{const s=cinema.state;return{screen:document.body.dataset.screen,levels:s.levels,action:document.body.dataset.screen==='play'?cinema.pick():null};});screen=data.screen;
      if(screen==='end')break;
      if(screen==='upgrade'){
        await release();
        if(await p.locator('.sat-confirmer').count()){if(i%2===0)await click(p.locator('.sat-mode').nth(2));await click(p.locator('.sat-confirmer'));}
        await click(p.locator('.ameliorations button').nth(!data.levels.arc?1:!data.levels.rail?0:2));continue;
      }
      assert.equal(screen,'play');const a=data.action;
      if(a.flight){for(const k of held.filter(v=>!a.keys.includes(v)))await p.keyboard.up(k);for(const k of a.keys.filter(v=>!held.includes(v)))await p.keyboard.down(k);held=a.keys;}
      else{await release();if(a.shift)await p.keyboard.press('x');if(a.fire)await p.keyboard.press('Space');await p.keyboard.press(a.keys[0]);}
      await p.evaluate(f=>cinema.advance(f?2:12,!f),a.flight);
    }
    assert.equal(screen,'end');await release();
    const report=await p.evaluate(j=>({status:cinema.state.status,t:cinema.state.elapsed,score:cinema.state.score,cause:cinema.state.cause,events:cinema.logs.slice(j),audio:{...silence}}),logAt);
    runs.push({year,attempt,...report});
    assert.equal(report.audio.media+report.audio.context,0);
    if(report.status==='dead'){await click(p.locator('.bf-retry'));await p.evaluate(y=>{delete cinema.tracks[y];},year);continue;}
    complete=true;assert.equal(report.events.filter(e=>e.type==='bossDefeated').length,2);
    const frames=await p.evaluate(y=>{const t=cinema.tracks[y];return {n:t.frames.length,done:t.done,meta:t.frames.map(({pic,...keep})=>keep)};},year);
    if(frames.n!==180)throw Error('Prise '+year+' : '+frames.n+' images, vol='+report.events.filter(e=>e.type==='flightStart').length);
    for(let j=0;j<180;j+=10){
      const batch=await p.evaluate(({j,year})=>cinema.tracks[year].frames.slice(j,j+10).map(r=>r.pic),{j,year});
      for(const b64 of batch)fs.writeFileSync(path.join(tmp,String(ids++).padStart(4,'0')+'.jpg'),Buffer.from(b64,'base64'));
    }
    const times=frames.meta.map(x=>x.t),from=Math.min(...times),to=Math.max(...times);
    clips.push({year,attempt,from,to,frames:frames.n,phases:[...new Set(frames.meta.map(x=>x.boss|| (x.flight?'vol':'grille')))],planes:[...new Set(frames.meta.map(x=>x.plane))],beatFrames:frames.meta.filter(f=>f.beat).length,decorReady:frames.meta.every(f=>f.paint),events:report.events.filter(e=>e.t>=from-.04&&e.t<=to+.04)});
    console.log(year+' : '+frames.n+' images, '+from.toFixed(2)+'–'+to.toFixed(2)+' s');
    await p.evaluate(y=>{delete cinema.tracks[y];},year);
    if(i<4){await click(p.locator('.bf-launch'));await p.evaluate(()=>cinema.advance(1,false));}
   }
   assert(complete);
  }
  assert.deepEqual(errors,[]);assert.equal(ids,900);
  fs.writeFileSync(path.join(__dirname,'provenance.json'),JSON.stringify({seed:298501,fps:30,frames:ids,sourceHashes:hashes,clips,runs,errors},null,2));
  fs.writeFileSync(path.join(tmp,'SUCCES'),'900 images');
  console.log('Pellicule '+tmp);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

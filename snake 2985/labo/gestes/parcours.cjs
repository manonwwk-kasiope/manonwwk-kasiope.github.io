'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),doigts=require('./doigts.cjs');
const root=path.resolve(__dirname,'../..');
function installedShell(){
  const pkg=require.resolve('playwright-core/package.json'),manifest=require(path.join(path.dirname(pkg),'browsers.json'));
  const revision=manifest.browsers.find(b=>b.name==='chromium-headless-shell').revision;
  const shell=fs.realpathSync(path.join(os.homedir(),'Library/Caches/ms-playwright','chromium_headless_shell-'+revision,'chrome-mac/headless_shell'));
  assert.equal(path.basename(shell),'headless_shell');return shell;
}
function server(){
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json'};
  return http.createServer((req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
}
function instrumentation(){
  // Mute before any campaign scripts, native playback or autoplay.
  for(const [k,v] of [['muted',true],['defaultMuted',true],['volume',0]])Object.defineProperty(HTMLMediaElement.prototype,k,{configurable:true,get:()=>v,set(){}});
  HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
  window.AudioContext=window.webkitAudioContext=undefined;
  let frame,state,time=0;
  const native=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>cb.name==='frame'?(frame=cb,314159):native(cb);
  let ecology;
  Object.defineProperty(window,'SnakeEcologie',{configurable:true,get:()=>ecology,set:api=>{
    const tick=api.tick;
    ecology={...api,tick(s,...args){state=s;return tick.call(api,s,...args);}};
  }});
  let seed=17;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const events=[],active=new Set();
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','click','touchstart','touchend','touchcancel'])
    document.addEventListener(type,e=>{
      if(e.pointerType==='touch'){if(type==='pointerdown')active.add(e.pointerId);if(['pointercancel','pointerup'].includes(type))active.delete(e.pointerId);}
      const target=e.target.closest?.('button,#stick,#monde');
      events.push({type,id:e.pointerId,kind:e.pointerType,primary:e.isPrimary,target:target?.id||target?.textContent,
        trusted:e.isTrusted,contacts:active.size,touches:e.touches?.length,x:e.clientX,y:e.clientY});
    },true);
  window.gesturesProbe={
    step(n){for(let i=0;i<n;i++){if(!frame)throw Error('Boucle chambre absente');time+=1000/60;frame(time);}},
    snapshot(){
      const stick=document.getElementById('stick'),s=state;
      return {screen:document.body.dataset.screen,elapsed:s?.elapsed,plane:s?.plane,charge:s?.novaCharge,
        xy:s?.snake?.[0],flight:!!s?.flight,cap:s?.flight?.targetAngle,year:s?.year,transform:stick.firstElementChild.style.transform,
        captures:[...active].filter(id=>stick.hasPointerCapture(id)),contacts:active.size};
    },
    angle(){
      const s=state,render=window.SnakeSpectacle,cam=render.camera(s,s.elapsed,false),h=s.snake[0];
      const a=s.flight.targetAngle,project=(x,y)=>render.project(cam,x,y,s.plane),p=project(h.x,h.y),q=project(h.x+.001*Math.cos(a),h.y+.001*Math.sin(a));
      const canvas=document.getElementById('monde');
      return Math.atan2((q.y-p.y)*canvas.clientHeight/render.height,(q.x-p.x)*canvas.clientWidth/render.width);
    }, events
  };
}
async function run(){
  const host=server();await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));
  let browser;const result={version:null,cases:[],pageErrors:[],failures:[]};
  try{
    browser=await chromium.launch({headless:true,executablePath:installedShell(),args:['--mute-audio','--disable-background-networking','--enable-features=SyntheticPointerActions']});
    result.version=browser.version();const ctx=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:852,height:393},deviceScaleFactor:1,serviceWorkers:'block'});
    await ctx.addInitScript(instrumentation);
    const origin='http://127.0.0.1:'+host.address().port;
    await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    for(const mode of ['grille','vol']){
      const page=await ctx.newPage();page.on('pageerror',e=>result.pageErrors.push(e.message));
      const session=await ctx.newCDPSession(page);
      const touch=doigts((k,v)=>session.send(k,v));
      const step=async(n=1)=>page.evaluate(n=>gesturesProbe.step(n),n), snap=()=>page.evaluate(()=>gesturesProbe.snapshot());
      const centre=async(locator)=>{const b=await locator.boundingBox();assert(b);return{x:b.x+b.width/2,y:b.y+b.height/2};};
      const loc=id=>page.locator('#'+id);
      const entry={mode,checks:[],events:[]};result.cases.push(entry);
      function check(label,okay,data){entry.checks.push({label,ok:!!okay,data});if(!okay)result.failures.push(mode+' / '+label);}
      try{
        await page.goto(origin+'/labo/campagne/index.html',{waitUntil:'load'});await step();
        const muted=await page.evaluate(()=>{const a=document.createElement('audio');return a.muted&&a.volume===0&&window.AudioContext===undefined;});assert(muted);
        await touch.tap(3,await centre(page.getByRole('button',{name:'Jouer en silence'})));await step(2);
        assert.equal((await snap()).screen,'play');
        const l=await centre(loc('stick')),lt={x:l.x+21,y:l.y};
        await touch.down(1,l.x,l.y);await touch.move(1,lt.x,lt.y);
        const held=await snap();check('capture du manche',held.captures.length===1,held);
        if(mode==='grille'){
          const nb=await loc('nova').boundingBox(),anchor={x:nb.x+nb.width-2,y:nb.y+nb.height/2};
          await touch.down(2,anchor.x,anchor.y);await touch.move(2,anchor.x-20,anchor.y);
          await touch.up(2);const dismissed=await snap();
          check('glissé droit annulé, nova conservée',dismissed.charge===1&&dismissed.captures.length===1,dismissed);
          await touch.down(2,anchor.x,anchor.y);await touch.move(2,anchor.x+5,anchor.y);await touch.up(2);
          const nova=await snap();check('nova du second doigt',nova.charge<.1&&nova.captures.length===1,nova);
          await touch.tap(2,await centre(loc('plan')));const shifted=await snap();check('bascule du second doigt',shifted.plane===1&&shifted.captures.length===1,shifted);
          await touch.move(1,l.x,l.y-22);await step(19);
          const turned=await snap();check('virage après libération du seul doigt droit',turned.xy.y<held.xy.y,turned);
        }else{
          for(let i=0;i<200 && !(await snap()).flight;i+=4)await step(4);
          const entryFlight=await snap();check('premier portail, même doigt',entryFlight.flight&&entryFlight.captures[0]===held.captures[0],entryFlight);
          if(entryFlight.flight){
            for(const deg of [-90,-45,0,45,90,135,180,-135]){
              const a=deg*Math.PI/180;await touch.move(1,l.x+24*Math.cos(a),l.y+24*Math.sin(a));
              const actual=await page.evaluate(()=>gesturesProbe.angle());
              const err=Math.abs(Math.atan2(Math.sin(actual-a),Math.cos(actual-a)))*180/Math.PI;
              check('cap écran '+deg+'°',err<3,{erreurDeg:+err.toFixed(3)});
            }
            await touch.tap(2,await centre(loc('nova')));const nova=await snap();check('nova en vol à deux doigts',nova.charge<.1&&nova.captures.length===1,nova);
            await touch.tap(2,await centre(loc('plan')));const layer=await snap();check('plan tenu pendant le vol',layer.flight&&layer.plane===entryFlight.plane&&layer.captures.length===1,layer);
          }
        }
        const multi=await page.evaluate(()=>({
          count:gesturesProbe.events.filter(e=>e.type==='touchstart'&&e.touches===2&&e.trusted).length,
          releases:gesturesProbe.events.filter(e=>e.type==='pointerup'&&e.contacts===1&&!e.primary&&e.trusted).length
        }));
        check('deux contacts natifs et levée indépendante',multi.count>=2&&multi.releases>=2,multi);
        await touch.cancel();const cancelled=await snap();check('interruption tactile et capture libérée',!cancelled.contacts&&!cancelled.captures.length&&!cancelled.transform,cancelled);
        await touch.down(8,l.x,l.y);await touch.move(8,l.x+18,l.y);
        await touch.tap(3,await centre(loc('pause')));const pairPause=await snap();
        check('pause du second pouce',pairPause.screen==='pause',pairPause);
        await touch.up(8);
        if(pairPause.screen!=='pause')await touch.tap(3,await centre(loc('pause')));
        const paused=await snap();await step(10);const still=await snap();
        check('pause et temps figé',paused.screen==='pause'&&paused.elapsed===still.elapsed,still);
        await touch.tap(3,await centre(page.getByRole('button',{name:'Reprendre'})));await step(2);
        await touch.down(7,l.x,l.y);await touch.move(7,l.x+18,l.y);const fresh=await snap();await touch.up(7);
        check('nouveau doigt après reprise',fresh.screen==='play' && fresh.captures.length===1 && !(await snap()).captures.length,fresh);
      }catch(e){result.failures.push(mode+' / '+e.message);}
      entry.events=await page.evaluate(()=>gesturesProbe.events);await page.close();
    }
  }finally{if(browser)await browser.close();await new Promise(resolve=>host.close(resolve));}
  fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({version:result.version,checks:result.cases.map(e=>[e.mode,e.checks.length]),failures:result.failures,pageErrors:result.pageErrors}));
  if(result.failures.length||result.pageErrors.length)process.exitCode=1;
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={instrumentation,installedShell};

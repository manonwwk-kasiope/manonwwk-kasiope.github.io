'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {webkit,devices}=require('playwright');
const root=path.resolve(process.argv[2]),origin='http://borne.test';
async function run(){
  const browser=await webkit.launch({headless:true});
  const essais=[],years=[1976,1985,1995,2185,2985],errors=[];
  let mediaRequests=0;
  try{
    const ctx=await browser.newContext({...devices['iPhone 13 landscape'],viewport:{width:852,height:275},reducedMotion:'reduce',serviceWorkers:'block'});
    await ctx.addInitScript(()=>{
      window.soundAttempts=0;
      HTMLMediaElement.prototype.play=function(){window.soundAttempts++;return Promise.reject(Error('Son bloqué'));};
      for(const [key,value] of [['muted',true],['volume',0]])Object.defineProperty(HTMLMediaElement.prototype,key,{get:()=>value,set:()=>{}});
      window.AudioContext=window.webkitAudioContext=undefined;
      let now=1,jobs=[],seed=3671;
      Object.defineProperty(performance,'now',{value:()=>now});
      window.requestAnimationFrame=fn=>jobs.push(fn);
      window.step=()=>{now+=20;const q=jobs;jobs=[];for(const f of q)f(now);};
      Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    });
    await ctx.route('**/*',route=>{
      const u=new URL(route.request().url()),name=path.resolve(root,'.'+decodeURIComponent(u.pathname));
      if(u.pathname.endsWith('.mp3'))mediaRequests++;
      return u.origin===origin&&name.startsWith(root+path.sep)&&!u.pathname.endsWith('.mp3')&&fs.existsSync(name)?route.fulfill({path:name}):route.abort();
    });
    const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto(origin+'/index.html?muet=1');
    const step=n=>p.evaluate(n=>{for(let i=0;i<n;i++)step();},n);
    const button=name=>p.getByRole('button',{name,exact:true});
    async function tap(loc){await loc.scrollIntoViewIfNeeded();const b=await loc.boundingBox();assert(b);await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
    const read=()=>p.evaluate(()=>{
      const mark=document.querySelector('.nova-sync-cue');
      return {screen:document.body.dataset.screen,year:document.querySelector('#date').textContent,now:performance.now(),cue:mark.dataset.cue,noteVisible:getComputedStyle(mark).visibility==='visible'&&!!mark.getBoundingClientRect().width,charge:document.querySelector('#nova').lastElementChild.textContent,message:document.querySelector('#message').textContent};
    });
    await step(1);
    for(const [idx,year] of years.entries()){
      for(const mode of ['accent','hors']){
        assert.match(await p.locator('#rang').textContent(),new RegExp(year));
        await tap(button('Jouer en silence'));await step(1);
        assert(await p.locator('#son').isDisabled());
        let before=await read();
        for(let i=0;i<120&&before.screen==='play'&&(mode==='accent'?before.cue!=='hit':before.cue!=='off');i++){
          await step(1);before=await read();
        }
        assert.equal(before.screen,'play',JSON.stringify(before));
        assert.equal(before.charge,'100 %');assert.equal(before.noteVisible,mode==='accent');assert.equal(before.cue,mode==='accent'?'hit':'off');
        await tap(p.locator('#nova'));await step(1);
        const after=await read();
        assert.equal(parseInt(after.charge),mode==='accent'?6:0,JSON.stringify(after));
        if(mode==='accent')assert.match(after.message,/en rythme · \+6 %/);else assert.equal(after.message,'Nova');
        essais.push({year,mode,before,after});
        if(mode==='hors'&&idx===years.length-1)break;
        for(let i=0;i<80&&(await read()).screen==='play';i++)await step(12);
        assert.equal((await read()).screen,'end');
        if(mode==='accent')await tap(button('Rejouer '+year));
        else{
          const next=years[idx+1];await tap(p.getByRole('radio',{name:new RegExp('^'+next+',')}));await tap(button('Sauter en '+next));
        }
        await step(1);
      }
    }
    assert.equal(await p.evaluate(()=>soundAttempts),0);assert.equal(mediaRequests,0);assert.deepEqual(errors,[]);
    await ctx.close();
  }finally{await browser.close();}
  const evidence={bundle:path.basename(root),sha256Arcade:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'arcade.js'))).digest('hex'),viewport:[852,275],reduced:true,mediaRequests,soundAttempts:0,errors,browserClosed:true,essais};
  fs.writeFileSync(path.join(__dirname,'borne.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(essais.map(r=>[r.year,r.mode,r.before.now,r.after.charge,r.after.message].join(' · ')).join('\n'));
}
run().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const {webkit,devices}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.join(__dirname,'index.html')).href;
(async()=>{
  const browser=await webkit.launch({headless:true});
  try{
    for(const [width,height] of [[852,275],[568,320]]){
      const ctx=await browser.newContext({...devices['iPhone SE landscape'],viewport:{width,height},reducedMotion:'reduce'});
      await ctx.route(/^https?:/,route=>route.abort());
      await ctx.addInitScript(()=>{
        Object.defineProperty(HTMLMediaElement.prototype,'muted',{get:()=>true,set:()=>{}});
        Object.defineProperty(HTMLMediaElement.prototype,'volume',{get:()=>0,set:()=>{}});
        HTMLMediaElement.prototype.play=()=>Promise.resolve();window.AudioContext=window.webkitAudioContext=undefined;
        let api;
        Object.defineProperty(window,'SnakeArcade',{get:()=>api,set:v=>{
          const create=v.create;
          api={...v,create(...args){const s=create(...args);window.observed=s;return s;}};
        }});
        let time=1,callbacks=[];
        window.requestAnimationFrame=fn=>{callbacks.push(fn);return callbacks.length;};
        window.advance=n=>{for(let k=0;k<n;k++){const q=callbacks;callbacks=[];time+=40;for(const fn of q)fn(time);}};
        let seed=3163;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
      });
      const page=await ctx.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);
      const run=n=>page.evaluate(n=>advance(n),n);
      const press=async selector=>{
        const box=await page.locator(selector).first().boundingBox();
        assert.ok(box,selector);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
      };
      await run(1);
      assert.deepEqual(errors,[]);
      async function checkTargets(){
        const bad=await page.locator('button:visible').evaluateAll(els=>els.filter(e=>!e.closest('[inert]')).filter(e=>{
          const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9||r.x<-.1||r.y<-.1||r.right>innerWidth+.1||r.bottom>innerHeight+.1;
        }).map(e=>e.textContent));
        assert.deepEqual(bad,[]);
      }
      await checkTargets();
      await press('[data-id=prism]');await press('[data-id=chain]');
      assert.equal(await page.locator('h1').textContent(),'Vitrail électrique');
      await press('#validations button');await run(1);
      await press('#plan');await run(2);
      assert.equal(await page.evaluate(()=>observed.plane),1);
      await run(18);await press('#plan');await run(1);
      assert.equal(await page.evaluate(()=>observed.plane),0);
      await press('#pause');await run(8);
      const paused=await page.evaluate(()=>observed.elapsed);
      await run(4);assert.equal(await page.evaluate(()=>observed.elapsed),paused);
      await press('#validations button');await run(1);
      await run(30);
      assert.ok(await page.evaluate(()=>Boolean(observed.flight)),'entrée en vol depuis les commandes normales');
      const angle=await page.evaluate(()=>observed.flight.targetAngle);
      await page.keyboard.down('ArrowDown');await run(2);await page.keyboard.up('ArrowDown');
      assert.notEqual(await page.evaluate(()=>observed.flight.targetAngle),angle);
      await press('#nova');await run(1);assert.ok(await page.evaluate(()=>observed.novaCharge<1));
      // Let normal motion complete the flight and the subsequent run.
      for(let i=0;i<30;i++){
        if(await page.locator('body').getAttribute('data-screen')==='end')break;
        if(await page.locator('body').getAttribute('data-screen')==='upgrade')await press('#options button');
        await run(16);
      }
      assert.equal(await page.locator('body').getAttribute('data-screen'),'end');
      const years=await page.locator('[role=radio]').allTextContents();
      assert.deepEqual(years.map(s=>Number(s.match(/\d{4}/)[0])),[1985,1995,2185,2985]);
      await checkTargets();
      await press('.bf-review');
      assert.equal(await page.locator('dialog[open]').count(),1);await press('dialog[open] header button');
      await press('.titre-saut button');
      assert.equal(await page.locator('dialog[open]').count(),1);
      const filters=await page.locator('dialog[open] select option').allTextContents();
      assert.ok(filters.includes('1995'));await press('dialog[open] header button');
      await press('[role=radio]:nth-child(2)');await press('.bf-launch');await run(1);
      assert.equal(await page.evaluate(()=>observed.year),1995);
      assert.match(await page.locator('#rang').textContent(),/8 bits/);
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({width,height,years,flight:true,pause:true,plane:true,nova:true,errors}));
      await ctx.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

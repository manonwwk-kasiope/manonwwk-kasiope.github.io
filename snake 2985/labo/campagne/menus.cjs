'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {webkit,devices}=require('playwright');
const dist=process.env.CAMPAGNE_DIST;
const root=dist?path.resolve(dist):path.resolve(__dirname,'../..');
const origin='http://campagne.test',start=origin+(dist?'/index.html':'/labo/campagne/index.html');
(async()=>{
  const browser=await webkit.launch({headless:true}),measures=[];
  try{
    for(const [width,height] of [[568,275],[874,292],[844,390]]){
      const ctx=await browser.newContext({...devices['iPhone 13 landscape'],viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
      await ctx.route('**/*',route=>{
        const u=new URL(route.request().url());
        if(u.origin!==origin||u.pathname.endsWith('.mp3'))return route.abort();
        const name=path.resolve(root,'.'+decodeURIComponent(u.pathname));
        return name.startsWith(root+path.sep)&&fs.existsSync(name)?route.fulfill({path:name}):route.abort();
      });
      await ctx.addInitScript(()=>{
        window.soundAttempts=0;HTMLMediaElement.prototype.play=()=>{soundAttempts++;return Promise.resolve();};
        Object.defineProperty(HTMLMediaElement.prototype,'muted',{get:()=>true,set:()=>{}});
        Object.defineProperty(HTMLMediaElement.prototype,'volume',{get:()=>0,set:()=>{}});
        window.AudioContext=window.webkitAudioContext=undefined;
        let jobs=[],now=1;
        Object.defineProperty(performance,'now',{value:()=>now});
        window.requestAnimationFrame=fn=>{jobs.push(fn);return jobs.length;};
        window.step=n=>{for(let i=0;i<n;i++){const list=jobs;jobs=[];now+=40;for(const f of list)f(now);}};
        let seed=3671;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
      });
      const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
      const step=n=>p.evaluate(n=>step(n),n);
      async function touch(b){await b.scrollIntoViewIfNeeded();const r=await b.boundingBox();assert.ok(r);await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);}
      const btn=name=>p.getByRole('button',{name,exact:true});
      const screen=()=>p.locator('body').getAttribute('data-screen');
      async function hitTest(locator){
        return locator.evaluateAll(list=>list.filter(e=>!e.disabled&&!e.closest('[inert]')).map(e=>{
          const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
          return {name:e.getAttribute('aria-label')||e.textContent.trim(),w:r.width,h:r.height,
            live:e.contains(document.elementFromPoint(x,y)),inside:r.left>=-.5&&r.top>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5};
        }));
      }
      await p.goto(start);await step(1);
      const targets=await hitTest(p.locator('#rideau button:visible'));
      const inaccessible=targets.filter(t=>!t.live||!t.inside||t.w<43.9||t.h<43.9);
      assert.deepEqual(inaccessible,[],JSON.stringify({width,height,inaccessible}));
      await touch(btn('Carte des époques'));const modal=p.locator('dialog.voyage-carte');
      assert.equal(await modal.isVisible(),true);
      const unsafe=[];
      for(const [lo,hi,bottom] of [[47,8,21],[8,47,21],[47,47,21]]){
        await p.evaluate(([lo,hi,bottom])=>{const style=document.documentElement.style;
          for(const [edge,n] of [['gauche',lo],['droite',hi],['bas',bottom]])style.setProperty('--borne-'+edge,n+'px');
        },[lo,hi,bottom]);
        const bounds=await modal.boundingBox();
        if(bounds.x<lo-.5||bounds.x+bounds.width>width-hi+.5||bounds.y+bounds.height>height-bottom+.5)unsafe.push({lo,hi,bottom,bounds});
      }
      await p.evaluate(()=>{for(const edge of ['gauche','droite','bas'])document.documentElement.style.removeProperty('--borne-'+edge);});
      assert.deepEqual(unsafe,[]);const tabs=modal.getByRole('tab');assert.equal(await tabs.count(),5);
      await touch(tabs.nth(4));assert.equal(await modal.locator('.vc-depart').isDisabled(),true);
      await p.waitForFunction(()=>document.querySelector('.vc-horizon img').naturalWidth>0,undefined,{polling:25});
      const preview=modal.locator('.vc-apercu');
      await touch(preview);await p.waitForFunction(()=>!document.querySelector('.vc-extrait').hidden,undefined,{polling:25});
      const pixel=()=>p.locator('.vc-extrait').evaluate(c=>c.toDataURL());
      const still=await pixel();await touch(preview);assert.notEqual(await pixel(),still);
      await touch(tabs.nth(0));assert.equal(await modal.locator('.vc-extrait').isVisible(),false);
      const cardBounds=await hitTest(modal.locator('button:visible'));
      assert.ok(cardBounds.every(b=>b.live&&b.w>=44&&b.h>=44),JSON.stringify(cardBounds));
      await touch(modal.getByRole('button',{name:'Fermer'}));
      await touch(btn('Jouer en silence'));await step(1);await touch(btn('Activer le turbo'));await step(1);await touch(btn('Désactiver le turbo'));await step(1);await touch(btn('Pause'));await step(1);
      await touch(btn('Pilotage'));const guide=p.locator('dialog.guide');assert.ok(await guide.isVisible());
      await touch(guide.getByRole('button',{name:'Arsenal de 1976'}));assert.ok(await guide.getByText('Peigne binaire',{exact:true}).isVisible());
      await touch(guide.getByRole('button',{name:'Fermer'}));await touch(btn('Reprendre'));
      for(let i=0;i<30&&(await screen())==='play';i++)await step(16);
      assert.equal(await screen(),'end');
      await touch(p.getByRole('radio',{name:/^1995,/}));await touch(btn('Sauter en 1995'));
      await step(1);await p.waitForFunction(()=>SnakeMatieres.ready(1995),undefined,{polling:25});
      await p.reload();await step(1);
      assert.match(await p.locator('#rang').textContent(),/1995.*8 bits/i);
      assert.equal(await btn('Miser de la nova').isVisible(),true);
      await touch(btn('Carte des époques'));await touch(p.locator('.vc-date').nth(4));
      assert.equal(await p.locator('.vc-depart').isDisabled(),false);
      await touch(p.locator('.vc-depart'));await step(1);
      await p.waitForFunction(()=>SnakeMatieres.ready(2985),undefined,{polling:25});assert.match(await p.locator('#rang').textContent(),/2985.*32 bits/);
      await touch(btn('Jouer en silence'));await step(3);
      await p.setViewportSize({width:height,height:width});
      try{await p.waitForFunction(()=>document.getElementById('vertical').open,undefined,{polling:25,timeout:3500});}
      catch(error){throw Error(JSON.stringify(await p.evaluate(()=>({url:location.href,viewport:[innerWidth,innerHeight,visualViewport.width,visualViewport.height],portrait:matchMedia('(orientation:portrait) and (any-pointer:coarse)').matches,dialog:document.getElementById('vertical').outerHTML.slice(0,180),screen:document.body.dataset.screen})))+' '+errors+' '+error);}
      assert.equal(await screen(),'pause');
      await p.setViewportSize({width,height});
      await p.waitForFunction(()=>!document.getElementById('vertical').open,undefined,{polling:25});
      assert.equal(await p.evaluate(()=>document.activeElement?.textContent),'Reprendre');
      await touch(btn('Palmarès'));const hall=p.locator('dialog.snake-archives[open]');
      assert.equal(await hall.isVisible(),true);
      await p.setViewportSize({width:height,height:width});
      await p.waitForFunction(()=>document.getElementById('vertical').open,undefined,{polling:25});
      assert.equal(await p.locator('dialog[open]').count(),2);
      await p.setViewportSize({width,height});await p.waitForFunction(()=>!document.getElementById('vertical').open,undefined,{polling:25});
      assert.equal(await p.locator('dialog[open]').count(),1);
      await touch(hall.getByRole('button',{name:'Fermer'}));
      await p.goto(start+'?muet=1');await step(1);
      assert.equal(await btn('Avec musique').count(),0);await touch(btn('Jouer en silence'));await step(1);
      assert.equal(await p.locator('#son').isDisabled(),true);
      assert.equal(await p.evaluate(()=>window.soundAttempts),0);assert.deepEqual(errors,[]);
      measures.push({width,height,startTargets:targets.length,cardTargets:cardBounds.length,lockedAtStart:true,remembered1995:true,visited2985:true,actualPreviewFramesChanged:true,challengeRestored:true,rotationPaused:true,hallPreserved:true,mutedURL:true,simulatedSafeAreas:3,errors});
      if(process.env.SNAKE_CAPTURE_DIR)await p.screenshot({path:path.join(process.env.SNAKE_CAPTURE_DIR,'campagne-2985-'+width+'.png')});
      await ctx.close();
    }
    console.log(JSON.stringify(measures,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

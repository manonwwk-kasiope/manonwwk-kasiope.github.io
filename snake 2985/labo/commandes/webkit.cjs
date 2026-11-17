'use strict';
const {webkit,devices}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await webkit.launch({headless:true});
  try{
    for(const [width,height] of [[568,320],[852,275]]){
      const context=await browser.newContext({...devices['iPhone SE landscape'],viewport:{width,height},reducedMotion:'reduce'});
      await context.route(/^https?:/, route=>route.abort());
      await context.addInitScript(()=>{
        Object.defineProperty(HTMLMediaElement.prototype,'muted',{get:()=>true,set:()=>{}});
        Object.defineProperty(HTMLMediaElement.prototype,'volume',{get:()=>0,set:()=>{}});
        HTMLMediaElement.prototype.play=()=>Promise.resolve();
        window.AudioContext=window.webkitAudioContext=undefined;

      });
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
      async function layout(){
        const sizes=await page.locator('button:visible,#pilot:visible,canvas:visible').evaluateAll(nodes=>nodes.map(n=>{
          const r=n.getBoundingClientRect();return {id:n.id||n.textContent,x:r.x,y:r.y,w:r.width,h:r.height,button:n.tagName!=='CANVAS'};
        }));
        for(const r of sizes){
          assert.ok(r.x>=-.5&&r.y>=-.5&&r.x+r.w<=width+.5&&r.y+r.h<=height+.5,JSON.stringify(r));
          if(r.button)assert.ok(r.w>=44&&r.h>=44,JSON.stringify(r));
        }
        return sizes.length;
      }
      await layout();
      await page.locator('#plane').tap();assert.match(await page.locator('#status').textContent(),/Plan 2/);
      await page.locator('#switch').tap();assert.equal(await page.locator('#switch').textContent(),'Glissé');
      await page.locator('#flight').tap();assert.equal(await page.locator('#flight').textContent(),'Sur grille');
      await page.locator('#forge').tap();const count=await layout();
      const images=new Set();
      for(const core of ['orbit','prism','well'])for(const mod of ['echo','chain','blast']){
        await page.locator('[data-id="'+core+'"]').tap();await page.locator('[data-id="'+mod+'"]').tap();
        assert.equal(await page.locator('#recipe').textContent(),await page.evaluate(([c,m])=>SnakeForge.name(c,m),[core,mod]));
        images.add(await page.locator('#preview').evaluate(n=>n.toDataURL()));
        await layout();
      }
      await page.locator('#forge').tap();assert.match(await page.locator('#status').textContent(),/Lunes fantômes/);
      await page.locator('#forge').tap();await page.locator('[data-id="well"]').tap();await page.locator('[data-id="blast"]').tap();
      await page.locator('#equip').tap();assert.match(await page.locator('#status').textContent(),/Soleil noir/);
      assert.equal(images.size,9);assert.deepEqual(errors,[]);console.log(JSON.stringify({width,height,workshopTargetsAndCanvas:count,distinctStaticPreviews:images.size,recipes:9,errors}));await context.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const {webkit,devices}=require('playwright');
const {pathToFileURL}=require('node:url'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const url=pathToFileURL(path.join(__dirname,'index.html')).href;
async function measure(page){
  return page.locator('.bf').evaluate(root=>{
    const box=n=>{const{x,y,width:w,height:h}=n.getBoundingClientRect();return{x,y,w,h,area:w*h};};
    const rect=box(root);
    const r=n=>box(root.querySelector(n));
    const buttons=Array.from(root.querySelectorAll('button'),n=>({...box(n),text:n.textContent.trim()}));
    const imgs=Array.from(root.querySelectorAll('img'),n=>({...box(n),loaded:n.complete&&n.naturalWidth>0}));
    const report=r('.bf-report');
    const allContent=Array.from(root.querySelectorAll('button,p,h2,canvas,.bf-cardtext'),n=>Object.assign(box(n),{tag:n.tagName}));
    const outside=allContent.filter(c=>c.x<rect.x-.8||c.x+c.w>rect.x+rect.w+.8||c.y<rect.y-.8||c.y+c.h>rect.y+rect.h+.8);
    const overlap=buttons.flatMap((b,i)=>buttons.slice(i+1).filter(c=>Math.min(b.x+b.w,c.x+c.w)-Math.max(b.x,c.x)>.8&&Math.min(b.y+b.h,c.y+c.h)-Math.max(b.y,c.y)>.8).map(c=>[b.text,c.text]));
    return {box:rect,reportPixels:Math.round(report.area),reportShare:+(report.area/rect.area).toFixed(3),
      destinationPixels:Math.round(r('.bf-choice').area),imagePixels:Math.round(imgs.reduce((s,n)=>s+n.area,0)),
      targets:buttons.length,minTargetWidth:Math.min(...buttons.map(x=>x.w)),minTargetHeight:Math.min(...buttons.map(x=>x.h)),
      overflow:Math.max(root.scrollHeight-root.clientHeight,root.scrollWidth-root.clientWidth),outside,overlap,loaded:imgs.every(i=>i.loaded)};
  });
}
(async()=>{
  const browser=await webkit.launch({headless:true});
  const results=[];
  try{
    for(const [width,height] of [[568,320],[852,275]]){
      const context=await browser.newContext({...devices['iPhone SE landscape'],viewport:{width,height},reducedMotion:'reduce'});
      await context.route(/^https?:/,r=>r.abort());
      await context.addInitScript(()=>{
        Object.defineProperty(HTMLMediaElement.prototype,'muted',{get:()=>true,set:()=>{}});
        Object.defineProperty(HTMLMediaElement.prototype,'volume',{get:()=>0,set:()=>{}});
        HTMLMediaElement.prototype.play=()=>Promise.resolve();window.AudioContext=window.webkitAudioContext=undefined;
      });
      try{
        const page=await context.newPage(),errors=[],network=[];
        page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
        for(const v of ['A','B']){
          await page.goto(url+'?v='+v);
          await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
          const m=await measure(page);
          assert.equal(m.overflow,0,JSON.stringify(m));assert.deepEqual(m.outside,[]);assert.deepEqual(m.overlap,[]);assert.ok(m.loaded);
          assert.ok(m.minTargetWidth>=44&&m.minTargetHeight>=44);
          await page.screenshot({path:path.join(__dirname,'preuve-'+v+'-'+width+'.png'),scale:'css'});
          const radios=page.getByRole('radio');
          await radios.first().focus();await page.keyboard.press('End');assert.equal(await radios.last().getAttribute('aria-checked'),'true');
          await page.keyboard.press('Home');assert.equal(await radios.first().getAttribute('aria-checked'),'true');
          await radios.nth(2).tap();assert.equal(await radios.nth(2).getAttribute('aria-checked'),'true');
          await page.getByRole('button',{name:'Revoir 2 s'}).tap();
          assert.equal(await page.locator('.bf-outcome').isVisible(),true);
          await page.getByRole('button',{name:'Sauter en 2185'}).tap();assert.match(await page.locator('.demo-end').innerText(),/Destination · 2185/);
          await page.goto(url+'?v='+v+'&year=2985&status=won');assert.equal(await page.getByRole('radio').count(),1);
          assert.equal(await page.getByRole('button',{name:'Repartir en 1976'}).isVisible(),true);
          const last=await measure(page);assert.deepEqual(last.outside,[]);assert.equal(last.overflow,0);
          results.push({width,height,v,...m});
        }
        assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
      }finally{await context.close();}
    }
    fs.writeFileSync(path.join(__dirname,'webkit.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results.map(({width,v,imagePixels,reportShare,minTargetHeight,targets})=>({width,v,imagePixels,reportShare,minTargetHeight,targets}))));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

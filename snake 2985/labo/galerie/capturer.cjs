'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const cases=require('./etats.json');
(async()=>{
  const cache=path.join(require('node:os').homedir(),'Library/Caches/ms-playwright');
  const directory=fs.readdirSync(cache).filter(d=>/^chromium_headless_shell-\d+$/.test(d)).sort((a,b)=>Number(b.split('-').at(-1))-Number(a.split('-').at(-1)))[0];
  const executablePath=path.join(cache,directory,'chrome-mac','headless_shell');
  assert.ok(fs.statSync(executablePath).isFile());
  const browser=await chromium.launch({headless:true,executablePath,args:['--mute-audio','--disable-background-networking']});
  assert.match(browser.version(),/\d+\./);
  try{
    const ctx=await browser.newContext({viewport:{width:960,height:440},deviceScaleFactor:2});
    // Origine locale interceptée en mémoire pour une toile lisible après les WebP.
    const origin='http://galerie.test/';
    await ctx.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!=='http://galerie.test')return route.abort();
      const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
      return route.fulfill({path:file});
    });
    await ctx.addInitScript(()=>{
      Object.defineProperty(HTMLMediaElement.prototype,'muted',{get:()=>true,set:()=>{}});
      Object.defineProperty(HTMLMediaElement.prototype,'volume',{get:()=>0,set:()=>{}});
      HTMLMediaElement.prototype.play=()=>Promise.resolve();window.AudioContext=window.webkitAudioContext=undefined;
    });
    const page=await ctx.newPage(),err=[],receipts=[];
    page.on('pageerror',e=>err.push(e.message));
    for(const state of cases){
      const url=origin+'labo/galerie/scene.html?year='+state.year;
      await page.goto(url);await page.waitForFunction(()=>window.frameFacts);
      const facts=await page.evaluate(()=>window.frameFacts);
      assert.deepEqual(JSON.parse(JSON.stringify(facts)),state);
      const png=await page.locator('#scene').screenshot({type:'png'});
      const hash=crypto.createHash('sha256').update(png).digest('hex');
      await page.reload();await page.waitForFunction(()=>window.frameFacts);
      const two=await page.locator('#scene').screenshot({type:'png'});
      assert.ok(png.equals(two),'Rendu divergent '+state.year);
      fs.writeFileSync(path.join(__dirname,'scene-'+state.year+'.png'),png);
      receipts.push({year:state.year,sha256:hash,width:png.readUInt32BE(16),height:png.readUInt32BE(20),identicalOnReload:true});
    }
    assert.deepEqual(err,[]);fs.writeFileSync(path.join(__dirname,'captures.json'),JSON.stringify(receipts,null,2)+'\n');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

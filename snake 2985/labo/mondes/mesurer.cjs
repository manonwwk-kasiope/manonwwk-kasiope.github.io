'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const dir=__dirname,lab=path.join(dir,'..'),years=[1976,1985,1995,2185,2985];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--mute-audio']});
 try{
  const page=await browser.newPage({viewport:{width:740,height:328},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};});
  let source=fs.readFileSync(path.join(lab,'spectacle.js'),'utf8');
  // Reproduit le raccord du laboratoire même quand spectacle.js est testé isolément.
  if(!source.includes('SnakeMondes.draw')){assert(source.includes('world(c,s,time,cam);'));source=source.replace('world(c,s,time,cam);','SnakeMondes.draw(c,s.year,time,{...cam,nearBoss:s.nearBoss},reduced);');}
  if(!(/SnakeMondes(?:\?\.)?\.?finish/.test(source))){const end='  }\n  window.SnakeSpectacle';assert(source.includes(end));source=source.replace(end,'    SnakeMondes.finish(canvas,s.year);\n'+end);}
  const snakeCall='serpent(c,s,cam,points,z);';assert(source.includes(snakeCall));
  source=source.replace(snakeCall,'if(!s.testHideSnake)'+snakeCall);
  await page.route('**/spectacle.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(dir,'mondes.js'),'utf8')+'\n'+source}));
  await page.goto(pathToFileURL(path.join(lab,'scene-visuel.html')).href);
  const results=[];
  for(const year of years){
   const data=await page.evaluate(year=>{
    const s=scene('bascule');s.year=year;s.nearBoss=1;
    const el=document.querySelector('canvas'),c=el.getContext('2d'),cam=SnakeSpectacle.camera(s,2),W=el.width,H=el.height;
    const pixels=(t,n,reduce)=>{c.setTransform(W/960,0,0,H/440,0,0);SnakeMondes.draw(c,year,t,{...cam,nearBoss:n},reduce);SnakeMondes.finish(el,year);return c.getImageData(0,0,W,Math.floor(H*.3)).data;};
    function different(a,b){let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)n++;return n/(a.length/4);}
    const base=pixels(2,0,false),future=pixels(4,0,false),approach=pixels(2,1,false);
    const stable=different(pixels(2,0,true),pixels(4,0,true));
    const render=(state,t=2)=>{SnakeSpectacle.draw(el,state,t,false);return c.getImageData(0,0,W,H).data;};
    const marked=render(s);
    const light=(r,g,b)=>[r,g,b].map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
    function signal(p,ref,raster){const x=Math.round(p.x*W/960),y=Math.round(p.y*H/440);let peak=0,n=0;const luminance=(a,i)=>light(a[i],a[i+1],a[i+2]);
     for(let j=y-6;j<=y+6;j++)for(let i=x-8;i<=x+8;i++){const k=4*(j*W+i),a=luminance(raster,k),b=luminance(ref,k);const contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);peak=Math.max(peak,contrast);if(contrast>=3)n++;}return {n,peak};}
    const colors=new Set();for(let i=0;i<marked.length;i+=4)colors.add(marked[i]<<16|marked[i+1]<<8|marked[i+2]);
    const times={},readability={};
    for(const mode of ['sol','bascule']){
      const vals=[],state=scene(mode);state.year=year;
      const mat=SnakeSpectacle.camera(state,2),head=state.snake[0],frame=render(state);
      readability[mode]={head:signal(SnakeSpectacle.project(mat,head.x,head.y,mode==='bascule'?mat.level:head.plane),render({...state,testHideSnake:true}),frame),danger:signal(SnakeSpectacle.project(mat,20,7,state.plane),render({...state,boss:{...state.boss,attack:null}}),frame)};
      for(let i=0;i<18;i++){
        const start=performance.now();render(state,2+i/60);const dt=performance.now()-start;
        if(i>=3)vals.push(dt);
      }
      vals.sort((a,b)=>a-b);times[mode]={n:vals.length,median:vals[7],p95:vals[14]};
    }
    SnakeSpectacle.draw(el,s,2,false);
    return {year,bits:SnakeMondes.formats[year].bits,distinctColors:colors.size,skyMotion:different(base,future),bossChange:different(base,approach),stable,readability,times};
   },year);
   results.push(data);await page.screenshot({path:path.join(dir,'scene-'+year+'.png')});
  }
  console.log(JSON.stringify(results,null,2));
  for(const r of results){assert(r.skyMotion>.001&&r.bossChange>.0001&&r.stable===0&&Object.values(r.readability).every(v=>v.head.n>=6&&v.danger.n>=6)&&r.distinctColors<=2**r.bits,JSON.stringify(r));}
  require('node:child_process').execFileSync(process.execPath,[path.join(dir,'planche.cjs')]);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'mesures.json'),JSON.stringify(results,null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

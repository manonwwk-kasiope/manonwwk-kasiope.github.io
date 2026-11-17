'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
  const lab=path.resolve(__dirname,'..'), dir=path.join(lab,'preuves-visuel');
  const browser=await chromium.launch({headless:true,args:['--mute-audio']});
  try{
    const page=await browser.newPage({viewport:{width:740,height:328},deviceScaleFactor:2,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};});
    await page.goto(pathToFileURL(path.join(lab,'scene-visuel.html')).href);
    for(const [mode,method] of [['sol','direct'],['sol','bands'],['bascule','direct'],['vol','direct'],['fini','direct']]){
      await page.evaluate(([mode,method])=>SnakeSpectacle.draw(document.querySelector('canvas'),scene(mode),2,false,method),[mode,method]);
      await page.screenshot({path:path.join(dir,mode+'-'+method+'.png')});
    }
    const measures=await page.evaluate(()=>{
      const api=SnakeSpectacle,canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
      const testCases=['sol','bascule','vol','fini'], scaleX=canvas.clientWidth/api.width,scaleY=canvas.clientHeight/api.height;
      function distance(a,b){return Math.hypot((a.x-b.x)*scaleX,(a.y-b.y)*scaleY);}
      const geometry=testCases.map(mode=>{
        const s=scene(mode),cam=api.camera(s,2),P=(x,y,z)=>api.project(cam,x,y,z);
        let minArea=Infinity,minHeight=Infinity,minCross=Infinity,bandErr=0,maxCenterError=0,visible=true;
        for(let z=0;z<=1;z++)for(let y=0;y<18;y++)for(let x=0;x<36;x++){
          const q=api.tile(cam,x,y,z),center=P(x,y,z);
          let area=0;
          q.forEach((p,i)=>{
            const b=q[(i+1)%4];
            area+=p.x*b.y-p.y*b.x;
            const cross=(b.x-p.x)*(center.y-p.y)-(b.y-p.y)*(center.x-p.x);
            minCross=Math.min(minCross,cross);
            visible&&=p.x>=0&&p.x<=api.width&&p.y>=0&&p.y<=api.height;
          });
          minArea=Math.min(minArea,area*.5*scaleX*scaleY);
          minHeight=Math.min(minHeight,distance(q[0],q[3]));
          // Intersection des deux diagonales du quadrilatère, indépendamment de P.
          const a=q[0],b=q[2],d=q[1],e=q[3];
          const dx=b.x-a.x,dy=b.y-a.y,ex=e.x-d.x,ey=e.y-d.y;
          const u=((d.x-a.x)*ey-(d.y-a.y)*ex)/(dx*ey-dy*ex);
          maxCenterError=Math.max(maxCenterError,distance(center,{x:a.x+dx*u,y:a.y+dy*u}));
          const edgeA=P(-.5,y,z),edgeB=P(35.5,y,z),f=(x+.5)/36;
          bandErr=Math.max(bandErr,distance(center,{x:edgeA.x+(edgeB.x-edgeA.x)*f,y:edgeA.y+(edgeB.y-edgeA.y)*f}));
        }
        return {mode,minArea,minHeight,minCross,visible,maxCenterError,bandErr};
      });
      const times={direct:[],bands:[]};
      // Lecture synchrone de toute la surface pour réaliser les commandes différées.
      for(let round=0;round<5;round++)for(const mode of round%2?['bands','direct']:['direct','bands']){
        const s=scene('sol');
        for(let i=0;i<12;i++){
          const t=performance.now();api.draw(canvas,s,2+i*.017,false,mode);ctx.getImageData(0,0,canvas.width,canvas.height);
          if(round)times[mode].push(performance.now()-t);
        }
      }
      const perf=Object.fromEntries(Object.entries(times).map(([mode,v])=>{v.sort((a,b)=>a-b);return [mode,{n:v.length,median:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)]}];}));
      function pixels(mode,t,reduced){api.draw(canvas,scene(mode),t,reduced);return ctx.getImageData(0,0,canvas.width,canvas.height).data;}
      const compare=(a,b,rows)=>{let k=0;for(let i=0;i<canvas.width*rows*4;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)k++;return k/(canvas.width*rows);};
      const still=pixels('sol',2,true), reverse=pixels('sol',4,true),normal1=pixels('sol',2,false),normal2=pixels('sol',4,false);
      const skyRows=Math.floor(canvas.height*.31);
      return {viewport:[innerWidth,innerHeight],pixels:[canvas.width,canvas.height],geometry,perf,skyChange:compare(normal1,normal2,skyRows),reducedChange:compare(still,reverse,canvas.height),userAgent:navigator.userAgent};
    });
    for(const g of measures.geometry){assert(g.visible&&g.minCross>0&&g.minArea>20&&g.maxCenterError<.001);}
    assert(measures.skyChange>.02&&measures.reducedChange===0);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(dir,'mesures.json'),JSON.stringify(measures,null,2)+'\n');
    console.log(JSON.stringify(measures,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

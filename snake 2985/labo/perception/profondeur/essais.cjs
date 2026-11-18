'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Pas');
const lab=path.resolve(__dirname,'../..'),ctx=vm.createContext({document:{createElement:()=>createCanvas(300,150)},devicePixelRatio:2});ctx.window=ctx;
const src=p=>fs.readFileSync(path.join(lab,p),'utf8');for(const p of ['../forge.js','../vol-libre.js','moteur.js','mondes/mondes.js','quantification/quantification.js','sprites/sprites.js','endurance/phosphore/lisibilite.js','locomotion/locomotion.js','perception/marquage.js','spectacle.js'])vm.runInContext(src(p),ctx);
const marker=ctx.SnakeMarquage,off={...marker,drawDepth(){}};
const thin={...marker,drawDepth(c,s,cam,z,P){
 if(z===s.plane)return;c.save();c.strokeStyle='#dce8de';c.lineWidth=1.4;
 for(const p of s.cells.filter(p=>p.plane===z)){
  const q=P(cam,p.x,p.y,z),d=z?-1:1,x=q.x+12*q.k,y=q.y;
  c.beginPath();c.moveTo(x,y-d*4);c.lineTo(x,y+d*4);c.lineTo(x-3,y+d);c.moveTo(x,y+d*4);c.lineTo(x+3,y+d);c.stroke();
 }c.restore();
}};
const rgb=x=>x.getContext('2d').getImageData(0,0,x.width,x.height).data;
const linear=Array.from({length:256},(_,i)=>(i/255)<=.04045?(i/255)/12.92:((i/255+.055)/1.055)**2.4);
const M={normal:[.2126,.7152,.0722],protan:[0,0,0],deutan:[0,0,0]};
const matrix={protan:[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],deutan:[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]]};
function lum(a,i,name){
 const vals=[linear[a[i]],linear[a[i+1]],linear[a[i+2]]],mix=r=>Math.max(0,Math.min(1,r.reduce((n,k,j)=>n+k*vals[j],0)));
 return .05+(name==='normal'?vals:matrix[name].map(mix)).reduce((n,v,k)=>n+v*M.normal[k],0);
}
function diff(a,b){
 const A=rgb(a),B=rgb(b),counts={pixels:0,normal:0,protan:0,deutan:0};let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
 for(let i=0;i<A.length;i+=4)if(A[i]!==B[i]||A[i+1]!==B[i+1]||A[i+2]!==B[i+2]){
   counts.pixels++;const x=i/4%a.width,y=Math.floor(i/4/a.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const name of Object.keys(M)){const aa=lum(A,i,name),bb=lum(B,i,name);if(Math.max(aa,bb)/Math.min(aa,bb)>=3)counts[name]++;}
 }
 return {...counts,bbox:counts.pixels?[minX,minY,maxX,maxY]:null};
}
const years=[1976,1985,1995,2185,2985],rows=[],protections=[];
const sheet=createCanvas(922,570),g=sheet.getContext('2d');g.fillStyle='#131923';g.fillRect(0,0,922,570);g.fillStyle='#ede3ce';g.font='bold 18px Pas';g.fillText('Cellule au premier plan ou sur l’autre grille',16,24);
['Plan actif','Autre plan, sans repère','Flèche fine','Palier + chevron'].forEach((t,i)=>{g.font='14px Pas';g.fillText(t,70+i*211,54);});
function fixture(year,z,near){
 const s=ctx.SnakeArcade.create(()=>.45,year);s.plane=z;s.drones=[];s.cells=[];s.snake=s.snake.map(p=>({...p,plane:z}));s.previousSnake=s.snake;
 return {s,p:{x:24,y:near?13:5,plane:1-z}};
}
function frame(s,w,api){
 const h=w===568?275:292,cv=createCanvas(w*2,h*2);cv.clientWidth=w;cv.clientHeight=h;ctx.SnakeMarquage=api;ctx.SnakeSpectacle.draw(cv,s,1.75,true);return cv;
}
function zoom(cv,world,s){
 const cam=ctx.SnakeSpectacle.camera(s,1.75,true),p=ctx.SnakeSpectacle.project(cam,world.x,world.y,world.plane);
 return [p.x/960*cv.width,p.y/440*cv.height];
}
for(const [j,year] of years.entries()){
 for(const w of [568,874])for(const z of [0,1])for(const near of [false,true]){
  const {s,p}=fixture(year,z,near);s.cells=[p];const frames=[off,thin,marker].map(a=>frame(s,w,a));
  const contrast=[diff(frames[0],frames[1]),diff(frames[0],frames[2])];assert(contrast[1].pixels>0);
  s.cells=[];const empty=frame(s,w,off);const object=diff(frames[0],empty),markedObject=diff(frames[2],empty);
  rows.push({year,w,z,near,thin:contrast[0],shelf:contrast[1],object,markedObject});
  s.cells=[{...p,plane:z}];const current=frame(s,w,marker);
  if(w===568&&z===1&&near){
   g.fillStyle='#f4e4c9';g.font='16px Pas';g.fillText(String(year),15,114+j*96);
   [current,...frames].forEach((cv,i)=>{const [x,y]=zoom(cv,{...p,plane:i===0?z:1-z},s);
    g.imageSmoothingEnabled=false;g.drawImage(cv,x-27,y-13,54,27,68+i*211,65+j*96,181,90);});
  }
 }
 const {s,p}=fixture(year,1,true);
 const twoPlanes=[0,1];
 for(const z of twoPlanes)for(const phase of ['warning','active']){
   s.cells=[p];const tiles=[];
   for(let dx=-2;dx<=2;dx++)for(let dy=-3;dy<=3;dy++)tiles.push({x:p.x+dx,y:p.y+dy,plane:z});
   s.ecologie={wave:{tiles,plane:z,phase,mask:new Set(tiles.map(t=>t.y*s.width+t.x))}};
   let a=frame(s,568,off),b=frame(s,568,marker);let d=diff(a,b);assert.equal(d.pixels,0);protections.push({year,z,phase,pixels:d.pixels});
 }
 for(const plane of [0,1])for(const offset of [-3,1,3]){
   const tile={x:p.x+offset,y:p.y,plane};s.ecologie={wave:{phase:'warning',plane,tiles:[tile]}};s.cells=[p];
   const a=frame(s,568,off),b=frame(s,568,marker),d=diff(a,b);
   const cam=ctx.SnakeSpectacle.camera(s,1.75,true),quad=ctx.SnakeSpectacle.tile(cam,tile.x,tile.y,plane);
   const A=rgb(a),B=rgb(b);let damagePixels=0;
   for(let k=0;k<A.length;k+=4){
     if(A[k]===B[k]&&A[k+1]===B[k+1]&&A[k+2]===B[k+2])continue;
     const x=(k/4%a.width+.5)*960/a.width,y=(Math.floor(k/4/a.width)+.5)*440/a.height;
     if(quad.every((p,i)=>{const q=quad[(i+1)%4];return (q.x-p.x)*(y-p.y)-(q.y-p.y)*(x-p.x)>=0;}))damagePixels++;
   }
   assert.equal(damagePixels,0);protections.push({year,plane,offset,phase:'warning-isolée',markerPixels:d.pixels,damagePixels});
 }
 s.ecologie=null;s.cells=[{...p,plane:1}];assert.equal(diff(frame(s,568,off),frame(s,568,marker)).pixels,0);
}
fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify({rows,protections},null,2)+'\n');fs.writeFileSync(path.join(__dirname,'planche.png'),sheet.toBuffer('image/png'));
console.log('40 états, 20 écrans de danger inchangés');

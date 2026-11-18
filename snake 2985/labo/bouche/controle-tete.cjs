'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const file=path.join(__dirname,'essais.cjs'),code=fs.readFileSync(file,'utf8'),at=code.indexOf('const sheet=createCanvas');assert(at>0);
const kit=new Module(file,module);kit.filename=file;kit.paths=module.paths;kit._compile(code.slice(0,at)+'\nmodule.exports={win,createCanvas,scene,state,shot,cv,years,cores,mods,linear};',file);
const {win,createCanvas,scene,state,shot,cv,years,cores,mods,linear}=kit.exports;
let pose;
const sprites=win.SnakeSprites;win.SnakeSprites={...sprites,draw(c,role,year,o){
 if(role==='head')pose={o:{...o},w:c.canvas.width,h:c.canvas.height,m:c.getTransform()};
 return sprites.draw(c,role,year,o);
}};
const memo=new Map();
function masks(s,reduced){
 const {o,w,h,m}=pose,id=JSON.stringify([s.year,o.x,o.y,o.angle,o.unit,w,h,reduced]);
 if(memo.has(id))return memo.get(id);
 const geom=sprites.raster(s.year,'head');
 const atlas=createCanvas(geom.w,geom.h),ac=atlas.getContext('2d'),img=ac.createImageData(geom.w,geom.h);
 for(let i=0;i<geom.data.length;i++){const k=geom.data[i];if(!k)continue;img.data[i*4]=k===7?255:0;img.data[i*4+1]=k===5?255:0;img.data[i*4+2]=k<=2?255:0;img.data[i*4+3]=255;}
 ac.putImageData(img,0,0);
 const surface=createCanvas(w,h),c=surface.getContext('2d');c.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);
 const scale=geom.scale*Math.max(.78,390/o.viewportWidth,o.unit);c.translate(o.x,o.y);c.rotate(o.angle);c.scale(scale,scale);c.imageSmoothingEnabled=s.year>=2185;
 const sw=geom.w/geom.density,sh=geom.h/geom.density;c.drawImage(atlas,-sw/2,-sh/2,sw,sh);
 const f=win.SnakeMondes.formats[s.year],lw=Math.min(w,f.width),lh=Math.round(lw*h/w);
 const logic=createCanvas(lw,lh),lc=logic.getContext('2d');lc.imageSmoothingEnabled=true;lc.imageSmoothingQuality='low';lc.drawImage(surface,0,0,lw,lh);
 const out=createCanvas(cv.width,cv.height),oc=out.getContext('2d');oc.imageSmoothingEnabled=false;oc.drawImage(logic,0,0,out.width,out.height);
 const cam=scene.camera(s,reduced?0:s.elapsed,reduced),h0=s.snake[0],pt=scene.project(cam,h0.x,h0.y,s.plane);
 const x=Math.round(pt.x*cv.width/960)-38,y=Math.round(pt.y*cv.height/440)-38;
 const mask=oc.getImageData(x,y,76,76).data;memo.set(id,mask);return mask;
}
const lum=(a,i)=>.05+.2126*linear[a[i]]+.7152*linear[a[i+1]]+.0722*linear[a[i+2]],ratio=(a,b)=>Math.max(a,b)/Math.min(a,b);
function inspect(A,B,m){
 const r={delta:0,interior:0,opaque:0,maxInnerDelta:0,body:0,rim:0,heading:0,highlight:0,partial:0,baseEdges:0,lostEdges:0,gainedEdges:0};const a=A.data,b=B.data;
 for(let i=0;i<m.length;i+=4){
   const alpha=m[i+3]/255,changed=a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2];
   if(changed){r.delta++;
    if(alpha===1)r.opaque++;
    if(alpha>=.95){r.maxInnerDelta=Math.max(r.maxInnerDelta,Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));r.interior++;if(m[i+2]>=242)r.rim++;else r.body++;}
    if(alpha*m[i]/255>=.5)r.heading++;
    if(alpha*m[i+1]/255>=.5)r.highlight++;
    if(alpha>0&&alpha<.95)r.partial++;
   }
   if(alpha<.5)continue;
   const x=i/4%76,y=Math.floor(i/4/76);
   for(const j of [x?i-4:-1,x<75?i+4:-1,y?i-304:-1,y<75?i+304:-1]){
     if(j<0||m[j+3]>=128)continue;
     const old=ratio(lum(a,i),lum(a,j)),fresh=ratio(lum(b,i),lum(b,j));
     if(old>=3)r.baseEdges++;if(old>=3&&fresh<3)r.lostEdges++;if(old<3&&fresh>=3)r.gainedEdges++;
   }
 }
 return r;
}
const rows=[];
for(const year of years)for(const core of cores)for(const mod of mods)for(const dir of [[1,0],[0,-1]])for(const reduced of [false,true]){
 const {s,h}=state(year,core,mod,dir,reduced?1:0);let prev=0;
 for(const age of [.04,.12,.175]){
   s.elapsed=1+age;win.SnakeForge.update(s,age-prev,h);prev=age;
   const a=shot(s,reduced,false),b=shot(s,reduced,true),mask=masks(s,reduced);
   assert(mask.some((v,i)=>i%4===0&&v>127),'repère de cap absent');
   rows.push({year,core,mod,dir,reduced,age,...inspect(a,b,mask)});
 }
}
fs.writeFileSync(path.join(__dirname,'tete.json'),JSON.stringify(rows)+'\n');
for(const y of years){const rr=rows.filter(r=>r.year===y);console.log(y,Object.fromEntries(['interior','body','rim','heading','highlight','partial','lostEdges','gainedEdges'].map(k=>[k,Math.max(...rr.map(r=>r[k]))])));}

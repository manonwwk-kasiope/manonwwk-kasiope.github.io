'use strict';
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const film=path.join(__dirname,'../Snake-2985-cinq-epoques.mp4'),prov=require('../provenance.json'),w=960,h=440,bytes=w*h*3;
const lin=Array.from({length:256},(_,v)=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4);
const a=lin.map(v=>.2126*v),b=lin.map(v=>.7152*v),c=lin.map(v=>.0722*v);
const ff=spawn('ffmpeg',['-v','error','-nostdin','-i',film,'-map','0:v:0','-an','-sn','-dn','-vf','crop=960:440:20:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{stdio:['ignore','pipe','inherit']});
const buffer=Buffer.alloc(bytes);let used=0,n=0,prev=new Float32Array(w*h),curr=new Float32Array(w*h);const results=[];
function frame(){
 const cut=n%180===0,row={frame:n,sec:n/30,year:prov.clips[Math.floor(n/180)].year,cut};
 const all=[0,0,0,0],arena=[0,0,0,0];let net=0;
 for(let y=0,i=0,k=0;y<h;y++)for(let x=0;x<w;x++,i++,k+=3){
   const l=a[buffer[k]]+b[buffer[k+1]]+c[buffer[k+2]];curr[i]=l;if(cut)continue;
   const d=l-prev[i];net+=d;
   if(d>.1||d<-.1){const dir=d>0?0:1;all[dir]++;const inside=x>=160&&x<800&&y>=180&&y<340;
    if(inside)arena[dir]++;if(Math.abs(d)>.25){all[dir+2]++;if(inside)arena[dir+2]++;}}
 }
 if(!cut){row.full=all.map(k=>k/(w*h));row.interior=arena.map(k=>k/(640*160));row.avgDrift=net/(w*h);}
 results.push(row);[curr,prev]=[prev,curr];n++;
}
ff.stdout.on('data',buf=>{let pos=0;while(pos<buf.length){const len=Math.min(bytes-used,buf.length-pos);buf.copy(buffer,used,pos,pos+len);used+=len;pos+=len;if(used===bytes){frame();used=0;}}});
ff.on('close',code=>{assert.equal(code,0);assert.equal(n,900);assert.equal(used,0);
 const summary=prov.clips.map((clip,j)=>{const frames=results.filter(r=>r.year===clip.year&&!r.cut);return {year:clip.year,n:frames.length,full:Math.max(...frames.map(r=>Math.max(...r.full.slice(0,2)))),interior:Math.max(...frames.map(r=>Math.max(...r.interior.slice(0,2)))),largeContrast:Math.max(...frames.map(r=>Math.max(...r.full.slice(2)))),peak:frames.reduce((a,b)=>Math.max(...a.full)>Math.max(...b.full)?a:b).frame,events:clip.events.filter(e=>['nova','novaOverload','bossVolley','guardianWarning'].includes(e.type)).map(e=>({type:e.type,sec:6*j+e.t-clip.from}))};});
 fs.writeFileSync(path.join(__dirname,'film.json'),JSON.stringify({sha256:crypto.createHash('sha256').update(fs.readFileSync(film)).digest('hex'),columns:['rise>.10','fall>.10','rise>.25','fall>.25'],summary,results})+'\n');console.log(summary.map(s=>[s.year,s.full,s.interior,s.peak]));});

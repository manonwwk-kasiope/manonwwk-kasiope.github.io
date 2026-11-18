'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Presage');
const lab=path.resolve(__dirname,'..'),ctx=vm.createContext({URL,Image:class extends Image{set src(url){super.src=fs.readFileSync(path.join(lab,'campagne/decors',url.split('/').pop()));}},document:{baseURI:'https://fixture.local/',createElement:()=>createCanvas(300,150)},devicePixelRatio:2});
ctx.window=ctx;
function load(file){let src=fs.readFileSync(path.join(lab,file),'utf8');
 if(file==='spectacle.js'&&!src.includes('SnakePresage?.draw'))src=src.replace('    const projected=snakePoints','    window.SnakePresage?.draw(c,s,cam,reduced);\n    const projected=snakePoints');
 vm.runInContext(src,ctx,{filename:file});}
for(const f of ['../forge.js','../vol-libre.js','moteur.js','audio/horloge.js','audio/pouls-data.js','mondes/mondes.js','campagne/matieres.js','quantification/quantification.js','sprites/sprites.js','locomotion/locomotion.js','monde-vivant/monde.js','campagne/impact.js','presage/presage.js','spectacle.js'])load(f);
const {SnakeArcade:game,SnakeCampagnePulseData:tracks,SnakePresage:sign,SnakeSpectacle:scene}=ctx;
const cv=createCanvas(1136,550);cv.clientWidth=568;cv.clientHeight=275;
function shot(s,enabled,reduce=false){
 ctx.SnakePresage=enabled?sign:null;scene.draw(cv,s,2.2,reduce);
 return cv.getContext('2d').getImageData(0,0,cv.width,cv.height);
}
function diff(a,b){
 let count=0,visible=0,maxY=-1;
 for(let i=0;i<a.data.length;i+=4){let n=0;
   for(let j=0;j<3;j++)n=Math.max(n,Math.abs(a.data[i+j]-b.data[i+j]));
   if(n){count++;maxY=Math.max(maxY,Math.floor(i/4/a.width));}if(n>=16)visible++;
 }
 return {count,visible,logicalMaxY:maxY<0?-1:Math.ceil(maxY*440/a.height)};
}
function beat(year,number,phase){
 const row=tracks.find(r=>r.year===year),clock=ctx.SnakePulse.create(tracks,year),lead=clock.visualLead*row.rate;
 const t=row.bars[4]+(number+phase)*(row.bars[5]-row.bars[4])/4+row.attackOffset-lead;
 const result=clock.sample({now:0,mediaTime:t,audible:true});
 assert(result.beat===number);assert(Math.abs(result.phase-phase)<1e-6);return result;
}
const rows=[],drawTimes=[],reductions=[];
const out=createCanvas(1090,695),g=out.getContext('2d');g.fillStyle='#12161e';g.fillRect(0,0,out.width,out.height);g.fillStyle='#f2e8d6';g.font='bold 20px Presage';g.fillText('Présages du gardien',18,27);
const headers=['Horizon témoin','Approche · 68 %','Veille · sur la noire','Veille · entre deux noires'];
for(const [i,t] of headers.entries()){g.font='14px Presage';g.fillText(t,70+i*252,53);}
const crops={1976:[298,42,195,42],1985:[137,10,107,78],1995:[228,35,139,42],2185:[294,0,210,55],2985:[525,18,165,60]};
function include(row,col,im,year){
 const temp=createCanvas(im.width,im.height);temp.getContext('2d').putImageData(im,0,0);
 const [x,y,w,h]=crops[year],dx=70+col*252,dy=67+row*122;
 const scale=Math.min(246/w,106/h),ww=w*scale,hh=h*scale;
 g.imageSmoothingEnabled=false;g.drawImage(temp,x/960*im.width,y/440*im.height,w/960*im.width,h/440*im.height,dx,dy+(106-hh)/2,ww,hh);
}
async function main(){
 for(const [i,year] of [1976,1985,1995,2185,2985].entries()){
   if(year!==1976)assert(await ctx.SnakeMatieres.load(year));
   const s=game.create(()=>.42,year);ctx.SnakeMondeVivant.observe(s);
   g.fillStyle='#e8dbc0';g.font='bold 16px Presage';g.fillText(String(year),15,125+i*122);
   for(const p of [.20,.44,.68,.84,.98]){
     s.nearBoss=p;
     for(const [n,ph] of [[0,0],[1,.25],[2,.5],[3,.75]]){
       s.beat=beat(year,n,ph);const a=shot(s,false),b=shot(s,true),d=diff(a,b);
       assert(d.logicalMaxY<=86);if(p===.20)assert.equal(d.count,0);
       if(p===.98)assert(d.visible>10,year);
       rows.push({year,p,n,ph,...d});
       if(n===0&&p===.98){include(i,0,a,year);include(i,2,b,year);}
       if(n===0&&p===.68)include(i,1,b,year);
       if(n===2&&p===.98)include(i,3,b,year);
     }
   }
   s.nearBoss=.98;s.beat=beat(year,0,0);const downbeat=shot(s,true);
   s.beat=beat(year,0,.5);const phaseOnly=diff(downbeat,shot(s,true));assert(phaseOnly.visible>10);
   s.beat=beat(year,0,0);const reduced=shot(s,true,true);
   s.beat=beat(year,3,.75);assert.equal(diff(reduced,shot(s,true,true)).count,0);
   for(const key of ['flight','ecologie','director','boss']){
     const orig=s[key];s[key]=({flight:{total:4,remaining:3,rings:[],angle:0},ecologie:{wave:{plane:0,tiles:[]}},director:{offer:{kind:'convoi',anchors:[]}},boss:{x:20,y:7,plane:0,hp:10,maxHp:10,attack:{phase:'warning',plane:0,tiles:[]}}})[key];
     const d=diff(shot(s,false),shot(s,true));assert.equal(d.count,0,key);s[key]=orig;
   }
   reductions.push({year,phaseOnly,motionPixelsAtFixedPressure:0,imminentPixels:[0,0,0,0]});
   s.beat=beat(year,0,0);const cam=scene.camera(s,2.2,false);cam.time=2.2;const tc=createCanvas(960,440),c=tc.getContext('2d');
   const times=[];
   for(let k=0;k<125;k++){
     c.clearRect(0,0,960,100);const begin=performance.now();
     for(let loop=0;loop<12;loop++)sign.draw(c,s,cam,false);
     const stop=performance.now();c.getImageData(0,0,960,90);
     if(k>=25)times.push((stop-begin)/12);
   }
   times.sort((a,b)=>a-b);drawTimes.push({year,msP50:times[49],msP95:times[94]});
 }
 fs.writeFileSync(path.join(__dirname,'planche.png'),out.toBuffer('image/png'));
 fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify({rows,drawTimes,reductions},null,2)+'\n');
 console.log(drawTimes,rows.filter(r=>r.p===.98&&r.n===0));
}
main().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),__dirname]}));
const lab=path.dirname(__dirname),files=['../mondes/mondes.js','matieres.js','../spectacle.js','../sprites/sprites.js','../artillerie/artillerie.js','../../forge.js','../../vol-libre.js','../moteur.js'];
function environment(proto='https:',bad=false){
 let requested=0;
 class Sample extends Image{set src(v){requested++;if(bad){queueMicrotask(()=>this.onerror());return;}super.src=fs.readFileSync(path.join(__dirname,'decors',path.basename(new URL(v).pathname)));}}
 const ctx=vm.createContext({document:{currentScript:{src:proto+'//example.test/jeu/matieres.js'},baseURI:proto+'//example.test/jeu/index.html',createElement:t=>{assert.equal(t,'canvas');return createCanvas(300,150);}},Image:Sample,URL,devicePixelRatio:2});ctx.window=ctx;
 for(const n of files)vm.runInContext(fs.readFileSync(path.resolve(__dirname,n),'utf8'),ctx,{filename:n});
 return {ctx,requested:()=>requested};
}
const difference=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>15)n++;return n/(a.length/4);};
(async()=>{
 const env=environment(),ctx=env.ctx,mat=ctx.SnakeMatieres,f=environment('file:'),failed=environment('https:',true),receipts=[];
 assert.equal(await f.ctx.SnakeMatieres.load(1985),false);assert.equal(f.requested(),0);
 assert.equal(await failed.ctx.SnakeMatieres.load(1995),false);assert.equal(await mat.load(1976),false);
 const out=path.join(lab,'mondes','preuves-horizons');fs.mkdirSync(out,{recursive:true});
 for(const year of [1985,1995,2185,2985]){
   const first=mat.load(year);assert.equal(mat.load(year),first);assert.equal(await first,true);
   assert.equal(mat.ready(year),true);
   const cv=createCanvas(1480,656);cv.clientWidth=740;cv.clientHeight=328;
   const s=ctx.SnakeArcade.create(()=>.4,year);s.year=year;
   const paint=(time,reduce)=>{ctx.SnakeSpectacle.draw(cv,s,time,reduce);return cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;};
   const a=paint(1,false),b=paint(3,false),u=paint(1,true),v=paint(3,true);
   const colors=new Set();for(let i=0;i<a.length;i+=4)colors.add(a[i]<<16|a[i+1]<<8|a[i+2]);
   const bits=ctx.SnakeMondes.formats[year].bits;assert(colors.size<=2**bits);
   assert.equal(difference(u,v),0);const changed=difference(a,b);assert(changed>.002);
   paint(1,false);fs.writeFileSync(path.join(out,year+'.png'),cv.toBuffer('image/png'));
   const row={year,colors:colors.size,changed,frozen:difference(u,v)};
   if(year===1985||year===1995){
     const c=createCanvas(960,440),g=c.getContext('2d');mat.draw(g,year,3,{look:0,nearBoss:0},false);
     const withTraffic=g.getImageData(0,0,960,177).data,api=ctx.SnakeMondes;
     ctx.SnakeMondes={...api,traffic(){}};
     mat.draw(g,year,3,{look:0,nearBoss:0},false);
     row.traffic=difference(withTraffic,g.getImageData(0,0,960,177).data);assert(row.traffic>.02);ctx.SnakeMondes=api;
   }
   receipts.push(row);
 }
 assert.equal(env.requested(),4);fs.writeFileSync(path.join(out,'mesures.json'),JSON.stringify(receipts,null,2));console.log(receipts);
})().catch(e=>{console.error(e);process.exitCode=1;});

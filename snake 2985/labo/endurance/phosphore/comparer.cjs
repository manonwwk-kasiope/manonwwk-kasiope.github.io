'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),__dirname]}));
const folder=__dirname,lab=path.resolve(folder,'../..'),game=path.dirname(lab),tests=[ 'double','adaptative','groupe' ];
const ctx=vm.createContext({document:{createElement:name=>{if(name!=='canvas')throw Error(name);return createCanvas(300,150);}},devicePixelRatio:2,console});ctx.window=ctx;
const logical1976=process.argv.includes('--logique1976'),pad=Number(process.env.PH_PAD)||0,postfix=pad?'-halo'+pad:logical1976?'-logique':'';
for(const file of [path.join(lab,'mondes/mondes.js'),path.join(lab,'spectacle.js'),path.join(lab,'locomotion/locomotion.js'),path.join(lab,'animation-boss/animation.js'),path.join(folder,'lisibilite.js'),path.join(lab,'sprites/sprites.js'),path.join(lab,'artillerie/artillerie.js'),path.join(lab,'campagne/indices.js'),path.join(lab,'gardiens/gardiens.js'),path.join(game,'vol-libre.js'),path.join(game,'forge.js'),path.join(lab,'moteur.js')]){
 let src=fs.readFileSync(file,'utf8');if(logical1976&&file.endsWith('/spectacle.js'))src=src.replace('s.year===1985||s.year===2185','s.year===1976||s.year===1985||s.year===2185');
 if(pad&&file.endsWith('/lisibilite.js'))src=src.replace(/pad=\d+,el=/, 'pad='+pad+',el=');
 vm.runInContext(src,ctx,{filename:file});
}
const api=ctx.SnakeSpectacle,ph=ctx.SnakePhosphore,sprites=ctx.SnakeSprites,year=1976;
let strategy='groupe',drawHeads=0,hidden=false,headOpts=null;ctx.SnakePhosphore={headHalo:ph.headHalo,draw(c,s,cam,project,z){return hidden?true:ph.draw(c,s,cam,project,z,strategy);}};
ctx.SnakeSprites={...sprites,draw(c,role,year,opts){if(role==='head'){drawHeads++;headOpts={...opts};}sprites.draw(c,role,year,opts);}};
function fixture(name){
 const plane=name.includes('haut')?1:0;
 const s=ctx.SnakeArcade.create(()=>.37,year),tags=['balayage','banques','portier','mixte'];
 const which=tags.find(k=>name.includes(k));Object.assign(s,{plane,year,progress:1,elapsed:4});
 const head={x:12,y:9,plane};
 s.snake=Array.from({length:9},(_,i)=>({x:head.x-i,y:9,plane:i>3?1-plane:plane}));s.previousSnake=s.snake;
 if(name.includes('bascule'))s.planeShift={from:1-plane,to:plane,total:.35,remaining:.18};
 const keys=[];
 for(let y=0;y<18;y++)for(let x=0;x<36;x++){
   const u=x-12,v=y-9;
   const hit=which==='balayage'?v===0:which==='banques'?(v%5+5)%5<=1:which==='portier'?Math.abs(u)<=3&&Math.abs(v)<=5&&!(v>=1&&u!==0):(Math.abs(x-18)+Math.abs(y-8)===7||Math.abs(x-18)+Math.abs(y-8)===8);
   if(hit)keys.push(y*36+x);
 }
 const tile=(k,z)=>({x:k%36,y:Math.floor(k/36),plane:z});
 const attack={plane,phase:name.includes('actif')?'active':'warning',danger:new Set(keys),tiles:keys.map(k=>tile(k,plane)),remaining:.5,total:1};
 s.boss={x:25,y:7,plane,id:24,kind:name.includes('banques')?'final':'mid',hp:21,maxHp:32,next:{x:24,y:7},attack:which==='portier'?null:attack};
 s.ecologie={wave:which==='portier'?{...attack,danger:undefined,mask:new Set(keys)}:null};
 if(which==='mixte'){
   const other=[4,5,6,7,8].map(v=>v*36+6);
   s.ecologie.wave={plane:1-plane,phase:'active',mask:new Set(other),tiles:other.map(k=>tile(k,1-plane))};
 }
 s.drones=[{x:20,y:9,plane,next:{x:19,y:9},warmup:0,id:2},{x:17,y:8,plane:1-plane,next:{x:17,y:9},warmup:0,id:3}];
 s.cells=[{x:13,y:9,plane},{x:23,y:7,plane},{x:29,y:10,plane:1-plane,bonus:true}];s.flightGate={x:15,y:9,plane};
 s.director={offer:{kind:'relais',anchors:[{x:16,y:9,plane},{x:21,y:8,plane}],step:0,phase:'active'}};
 s.evolution={marks:[{x:24,y:9,plane,kind:'switch',first:{x:21,y:9,plane}}],effects:[]};
 s.shots=[{x:3,y:9,toX:32,toY:9,plane,kind:'rail',life:.13,maxLife:.16}];
 s.effects=[{x:14,y:8,plane,kind:'nova',radius:5,life:.6,maxLife:1}];
 s.forge={projectiles:[{x:23,y:9,kind:'well',plane,radius:3.5,life:2,maxLife:3},{x:13,y:8,kind:'prism',plane,vx:3,vy:1}],orbits:[{x:14,y:9,plane,kind:'orbit',radius:2,angle:.3}],effects:[{x:8,y:10,plane,toX:25,toY:8,kind:'chain',life:.4,maxLife:.5}]};
 return s;
}
const scenes=['balayage-bas','balayage-haut-actif','banques-haut-bascule','banques-bas-actif','portier-haut','portier-bas-bascule-actif','mixte-bas-actif','mixte-haut'];
function sample(canvas,w,h){
 const cw=canvas.width,ch=canvas.height,data=canvas.getContext('2d').getImageData(0,0,cw,ch).data,result=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const ix=Math.floor((x+.5)*cw/w),iy=Math.floor((y+.5)*ch/h);const r=data[4*(iy*cw+ix)];result[y*w+x]=r<27?0:r<80?1:r<180?2:3;}
 return result;
}
const ratio=[[1,1.79,5.05,14.19],[1.79,1,2.81,7.87],[5.05,2.81,1,2.81],[14.19,7.87,2.81,1]];
function areas(samples,marked,ref){
 let changed=0;const counts=[0,0,0,0];for(const k of samples){counts[marked[k]]++;if(ratio[marked[k]][ref[k]]>=3)changed++;}
 const N=samples.length,need=Math.max(1,Math.ceil(N*.15));
 let best=0;
 // Deux groupes occupant chacun au moins 15 % et présentant une vraie différence de luminance.
 for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)if(ratio[a][b]>=3){
   const lo=counts.slice(0,a+1).reduce((x,y)=>x+y,0),hi=counts.slice(b).reduce((x,y)=>x+y,0);
   best=Math.max(best,Math.min(lo,hi));
 }
 return {ok:best>=need,signal:changed>=Math.max(1,Math.ceil(N*.15)),area:best/N,changed:changed/N,N};
}
const sizes=[[568,284],[740,328]],rows=[],detail=[],counts=[];
for(const [vw,vh] of sizes){
 const canvas=createCanvas(vw*2,vh*2);canvas.clientWidth=vw;canvas.clientHeight=vh;
 const w=384,h=Math.round(w*vh/vw);
 for(const name of scenes){
  const s=fixture(name),cam=api.camera(s,2.2,false),z=s.plane;
  const paint=(mode,hide=false)=>{strategy=mode;hidden=hide;drawHeads=0;api.draw(canvas,s,2.2,false);assert.equal(drawHeads,1,name);return sample(canvas,w,h);};
  const ref=paint('groupe',true);
  const head=s.snake[0];
  // Surface alpha indépendante de la vraie tête, halo inclus. Les pixels protégés
  // sont mesurés sur le rendu actuel, sans rayon d'exclusion choisi à la main.
  const stencil=createCanvas(w,h),sc=stencil.getContext('2d');stencil.clientWidth=vw;
  sc.setTransform(w/960,0,0,h/440,0,0);
  ph.headHalo(sc,headOpts,headOpts.angle,headOpts.unit);
  sprites.draw(sc,'head',year,headOpts);
  const cover=sc.getImageData(0,0,w,h).data;
  for(const mode of tests){
   const m=paint(mode),mask=ph.cells(s,z),arr=[];
   let totalSelected=0,changedSelected=0;
   const domain=new Uint8Array(w*h);
   for(const k of mask.keys()){
    const x=k%36,y=Math.floor(k/36),q=ph.projectCell(api.project,cam,x,y,z,w,h);
    const center=[],entry=[],all=[],bound=[[],[],[],[]];
    ph.walk(q,w,h,(ix,iy,u,v)=>{const at=iy*w+ix;domain[at]=1;all.push(at);if(Math.abs(u-.5)<=.3&&Math.abs(v-.5)<=.32)center.push(at);
     if(u<.24||v<.24||u>.76||v>.76)entry.push(at);
     if(u<.24)bound[0].push(at);if(v<.24)bound[1].push(at);if(u>.76)bound[2].push(at);if(v>.76)bound[3].push(at);});
    const exposed=a=>a.filter(i=>cover[4*i+3]<128);
    const cx=exposed(center),ex=exposed(entry);
    const cen=areas(cx,m,ref),ent=areas(ex,m,ref);
    totalSelected+=all.length;changedSelected+=all.filter(k=>m[k]!==ref[k]).length;
    const underHead=cx.length<2||ex.length<2;
    arr.push({key:k,cen,ent,edges:bound.filter(a=>areas(exposed(a),m,ref).ok).length,head:underHead});
   }
   const clear=arr.filter(v=>!v.head), pass=r=>r.cen.ok&&r.ent.ok;
   const row={vw,name,mode,tiles:arr.length,clear:clear.length,pass:clear.filter(pass).length,allPass:arr.filter(pass).length,
    center:clear.filter(v=>v.cen.ok).length,entry:clear.filter(v=>v.ent.ok).length,centerAttributed:clear.filter(v=>v.cen.signal).length,
    entryAttributed:clear.filter(v=>v.ent.signal).length,fourEdges:clear.filter(v=>v.edges===4).length,pixelChange:changedSelected/totalSelected};
   rows.push(row);for(const r of arr)if(!pass(r)||r.edges<4)detail.push({vw,name,mode,key:r.key,head:r.head,edges:r.edges,center:r.cen.area,entry:r.ent.area});
   if(name==='banques-bas-actif'&&vw===740)fs.writeFileSync(path.join(folder,mode+postfix+'.png'),canvas.toBuffer('image/png'));
  }
 }
}
for(const mode of tests){const rr=rows.filter(r=>r.mode===mode),t={mode};
 for(const k of ['tiles','clear','pass','allPass','center','entry','centerAttributed','entryAttributed','fourEdges'])t[k]=rr.reduce((a,r)=>a+r[k],0);
 t.pixelChange=rr.reduce((a,r)=>a+r.pixelChange,0)/rr.length;counts.push(t);}
console.log(counts);fs.writeFileSync(path.join(folder,'mesures'+postfix+'.json'),JSON.stringify({counts,rows,failures:detail},null,2));
// Comptage de rôle sur les deux plans, y compris un état de transition dont
// le plan logique et la vraie position de tête diffèrent.
const countsHeads=[];
for(const active of [0,1])for(const headPlane of [0,1]){
 const cv=createCanvas(1136,568);cv.clientWidth=568;cv.clientHeight=284;
 const s=fixture('balayage-bas');s.plane=active;s.snake[0].plane=headPlane;s.planeShift={from:1-active,to:active,total:.35,remaining:.17};hidden=false;strategy='groupe';
 const calls=[],base=ctx.SnakeSprites;
 ctx.SnakeSprites={...base,draw(c,role,y,o){if(role==='head')calls.push({plane:o.plane,opacity:c.globalAlpha});base.draw(c,role,y,o);}};
 api.draw(cv,s,2,false);ctx.SnakeSprites=base;assert.equal(calls.length,1);assert.equal(calls[0].plane,headPlane);assert.equal(calls[0].opacity,1);
 countsHeads.push({active,headPlane,...calls[0]});
}
const chrono=[];
for(const mode of tests){
 const cv=createCanvas(1136,568),c=cv.getContext('2d');cv.clientWidth=568;cv.clientHeight=284;c.setTransform(cv.width/960,0,0,cv.height/440,0,0);
 const s=fixture('banques-bas-actif'),cam=api.camera(s,2,false);
 for(const type of ['chaud','roulis','orientation']){
   const times=[];
   for(let i=0;i<50;i++){if(type==='roulis'){cam.dx=Math.sin(i*.2)*1.5;cam.bank=.035*Math.sin(i*.13);}if(type==='orientation')cam.yaw=-.06+.01*Math.sin(i*.13);
     const t=performance.now();ph.draw(c,s,cam,api.project,0,mode);if(i>=5)times.push(performance.now()-t);
   }
   times.sort((a,b)=>a-b);chrono.push({mode,type,tiles:ph.cells(s,0).size,n:times.length,p50:times[22],p95:times[42]});
 }
}
fs.writeFileSync(path.join(folder,'roles-et-cout'+postfix+'.json'),JSON.stringify({countsHeads,chrono},null,2));

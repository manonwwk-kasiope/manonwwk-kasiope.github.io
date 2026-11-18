'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),os=require('node:os');
const {createCanvas,Image}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),__dirname]}));
const lab=path.resolve(__dirname,'../..'),game=path.dirname(lab),apis=[],results=[];
const ctx=vm.createContext({document:{createElement:k=>{assert.equal(k,'canvas');return createCanvas(300,150);}},devicePixelRatio:2,Image,console});ctx.window=ctx;
const load=name=>vm.runInContext(fs.readFileSync(path.resolve(lab,name),'utf8'),ctx,{filename:name});
for(const file of ['../vol-libre.js','../forge.js','gardiens/gardiens.js','moteur.js','mondes/mondes.js','spectacle.js'])load(file);
const canvas=createCanvas(1136,568);canvas.clientWidth=568;canvas.clientHeight=284;
for(const year of [1976,1985,1995,2185,2985])ctx.SnakeSpectacle.draw(canvas,ctx.SnakeArcade.create(()=>.35,year),2,false);
for(const file of ['endurance/phosphore/lisibilite.js','sprites/sprites.js','locomotion/locomotion.js','animation-boss/animation.js','artillerie/artillerie.js','campagne/indices.js','surf-boss/surf.js'])load(file);
ctx.SnakeArchives={draw(){}};
ctx.SnakeKnot={draw(){}};
ctx.SnakeMatieres={draw(c){c.fillStyle='#201b30';c.fillRect(0,0,960,440);return true;}};
const names={SnakeMatieres:['draw'],SnakeKnot:['draw'],SnakeSurf:['draw'],SnakeArchives:['draw'],SnakeLocomotion:['transform','overlay'],SnakeSprites:['draw'],SnakeArtillerie:['draw'],SnakeBossAnimation:['before','after'],SnakeMondes:['draw','finish']};
let logs=[];
for(const [key,methods] of Object.entries(names)){
 const base=ctx[key],obj={...base};
 for(const method of methods){const fn=base[method];assert(fn,key+'.'+method);obj[method]=function(...a){
  const label=key+'.'+method;
  const asset=a[0]?.canvas||a[0],width=asset?.width;
  const row={label,width};
  if(key==='SnakeSprites'){row.role=a[1];row.o={...a[3]};row.alpha=a[0].globalAlpha;}
  if(key==='SnakeLocomotion'&&method==='transform')row.method=a.at(-1);
  if(key==='SnakeLocomotion'&&method==='overlay'){row.phase=a.at(-1);row.z=a[4];}
  logs.push(row);return fn.apply(base,a);
 };}ctx[key]=obj;
}
for(const year of [1976,1985,1995,2185,2985])for(const z of [0,1]){
 const s=ctx.SnakeArcade.create(()=>.31,year);s.year=year;s.plane=z;
 s.snake[0]={x:11,y:9,plane:z};s.previousSnake[0]={x:10,y:9,plane:1-z};s.progress=.23;
 s.snake[1]={x:10,y:9,plane:1-z};s.boss={x:25,y:6,plane:z,lane:1,kind:'final',hp:22,maxHp:38};
 logs=[];ctx.SnakeSpectacle.draw(canvas,s,2,false);
 const logical=year===1985?480:year===2185?768:1136;
 for(const mod of ['SnakeMatieres','SnakeArtillerie','SnakeSurf','SnakeArchives']){
   const row=logs.find(v=>v.label===mod+'.draw');assert.equal(row?.width,logical,mod+' '+year);
 }
 assert(!logs.some(r=>r.label==='SnakeMondes.draw'));
 const transform=logs.find(v=>v.label==='SnakeLocomotion.transform');assert.equal(transform.method,'joint');
 const overlays=logs.filter(v=>v.label==='SnakeLocomotion.overlay').map(v=>v.z+':'+v.phase);
 assert.deepEqual(overlays,['0:links','0:pulse','1:links','1:pulse']);
 const head=logs.filter(v=>v.role==='head');assert.equal(head.length,1);assert.equal(head[0].alpha,1);assert.equal(head[0].o.plane,z);assert.equal(head[0].o.viewportWidth,568);
 const p=ctx.SnakeSpectacle.project(ctx.SnakeSpectacle.camera(s,2,false),11,9,z);
 assert.equal(head[0].o.x,p.x);assert.equal(head[0].o.y,p.y);
 const before=logs.findIndex(v=>v.label==='SnakeBossAnimation.before'),after=logs.findIndex(v=>v.label==='SnakeBossAnimation.after'),boss=logs.findIndex(v=>v.role==='boss');assert(before>=0&&before<boss&&boss<after);
 const last=logs.at(-1);assert.equal(last.label,'SnakeMondes.finish');assert.equal(last.width,logical);
 const data=canvas.getContext('2d').getImageData(0,0,1136,568).data,colors=new Set();
 for(let i=0;i<data.length;i+=4)colors.add(data[i]<<16|data[i+1]<<8|data[i+2]);
 assert(colors.size<=Math.pow(2,ctx.SnakeMondes.formats[year].bits));
 results.push({year,plane:z,sourceWidth:logical,colors:colors.size,head:[head[0].o.x,head[0].o.y],overlays});
}
fs.writeFileSync(path.join(__dirname,'integration.json'),JSON.stringify(results,null,2));console.log('10 scènes peuplées et 5 replis sans modules vérifiés.');

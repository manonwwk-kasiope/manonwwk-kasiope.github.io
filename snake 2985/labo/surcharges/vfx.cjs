'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),__dirname]}));
GlobalFonts.registerFromPath("/System/Library/Fonts/Supplemental/Arial.ttf","VfxText");
const sandbox=vm.createContext({document:{createElement:()=>createCanvas(300,150)},devicePixelRatio:1});sandbox.window=sandbox;
const load=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),sandbox,{filename:file});
for(const f of ['../../forge.js','../moteur.js','../mondes/mondes.js','../sprites/sprites.js','../locomotion/locomotion.js','../artillerie/artillerie.js','../endurance/phosphore/lisibilite.js','surcharges.js','effets.js','../spectacle.js'])load(f);
const {SnakeSurcharges:physics,SnakeSurchargeFX:fx,SnakeSpectacle:scene}=sandbox;
const integrated=/SnakeSurchargeFX|SnakeSurcharges\.draw/.test(fs.readFileSync(path.join(__dirname,'../spectacle.js'),'utf8'));
const art=sandbox.SnakeArtillerie;
if(!integrated)sandbox.SnakeArtillerie={...art,draw(...args){art.draw(...args);fx.draw(...args);}};
const kit=physics.install({fire:()=>true},{update(){}});
const years=[1976,1985,1995,2185,2985],labels=['Peigne binaire','Carreau à ricochets','Train de la trace','Pince des deux lunes','Échos des deux plans'];
const sheet=createCanvas(1020,5*207+40),board=sheet.getContext('2d'),metrics=[];
board.fillStyle='#10151d';board.fillRect(0,0,sheet.width,sheet.height);
board.fillStyle='#e3e9f0';board.font='bold 20px VfxText';board.fillText('Surcharges · deux instants du même tir',18,28);
function ageState(year,phase){
  const s=sandbox.SnakeArcade.create(()=>.34,year);
  s.snake=Array.from({length:12},(_,i)=>({x:18-i,y:10+Math.max(0,i-6)*.35,plane:0}));
  s.previousSnake=s.snake;s.eaten=2;assert(kit.engine.fire(s));
  kit.forge.update(s,phase*physics.read(s).active.duration,{targets:()=>[]});
  // Le serpent a continué sa route pendant la décharge.
  const shift=phase*6;s.snake=s.snake.map(p=>({...p,x:p.x+shift}));s.previousSnake=s.snake;
  return s;
}
function measure(s,z){
  const canvas=createCanvas(736,376),context=canvas.getContext('2d');
  const p=(cam,x,y)=>({x:18+x*20,y:18+y*20});
  let paints=0;
  const counter=new Proxy(context,{get(c,key){if(key==='stroke'||key==='fill')return (...a)=>{paints++;return c[key](...a);};return typeof c[key]==='function'?c[key].bind(c):c[key];},set(c,k,v){c[k]=v;return true;}});
  fx.draw(counter,s,{},z,1,false,p);
  const pixels=context.getImageData(0,0,736,376).data,shapes=physics.geometry(s).filter(g=>g.plane===z);
  let count=0,outside=0;
  for(let y=0;y<376;y++)for(let x=0;x<736;x++){
    if(pixels[(736*y+x)*4+3]<12)continue;
    count++;const point={x:(x+.5-18)/20,y:(y+.5-18)/20};
    if(!shapes.some(g=>physics.touches({...g,width:g.width+.13},point)))outside++;
  }
  assert.equal(outside,0);assert.equal(count>0,shapes.length>0);
  return {paints,pixels:count,outside};
}
function still(s,z){
  const cv=createCanvas(500,250),c=cv.getContext('2d'),api=sandbox.SnakeSurcharges,active=api.read(s).active;
  const p=(_,x,y)=>({x:9+x*13,y:9+y*13});
  const bytes=(age,reduce)=>{
    sandbox.SnakeSurcharges={...api,read:()=>({active:{...active,age}})};
    c.clearRect(0,0,500,250);fx.draw(c,s,{},z,age,reduce,p);
    return Buffer.from(c.getImageData(0,0,500,250).data);
  };
  try{assert(bytes(.03,true).equals(bytes(.24,true)));assert(!bytes(.03,false).equals(bytes(.24,false)));}
  finally{sandbox.SnakeSurcharges=api;}
}
for(const [row,year] of years.entries()){
  const y=40+row*207;
  board.fillStyle='#d6dee6';board.font='bold 17px VfxText';board.fillText(year+'   '+labels[row],18,y+19);
  for(const [i,phase] of [.42,.79].entries()){
    const s=ageState(year,phase),geometry=physics.geometry(s),z=geometry[0].plane;
    const samples=[measure(s,0),measure(s,1)];still(s,z);
    metrics.push({year,phase,z,primitives:geometry.length,samples});
    const cv=createCanvas(960,440);scene.draw(cv,s,phase,false);
    const cam=scene.camera(s,phase,false),points=geometry.flatMap(g=>g.kind==='ring'?
      [[g.x-g.r,g.y],[g.x+g.r,g.y],[g.x,g.y-g.r],[g.x,g.y+g.r]]:
      [[g.ax,g.ay],[g.bx,g.by]]).map(([x,y])=>scene.project(cam,x,y,z));
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),w=Math.max(250,Math.max(...xs)-Math.min(...xs)+75, (Math.max(...ys)-Math.min(...ys)+45)*2.95),h=w/2.95;
    const x0=Math.max(0,Math.min(960-w,(Math.min(...xs)+Math.max(...xs)-w)/2));
    const y0=Math.max(0,Math.min(440-h,(Math.min(...ys)+Math.max(...ys)-h)/2));
    board.imageSmoothingEnabled=false;board.drawImage(cv,x0,y0,w,h,18+i*500,y+28,487,165);
    board.fillStyle='#0b101ae8';board.fillRect(24+i*500,y+34,113,20);
    board.fillStyle='#e6eaf0';board.font='13px VfxText';board.fillText(Math.round(phase*100)+' %  ·  plan '+z,31+i*500,y+49);
  }
}
fs.writeFileSync(path.join(__dirname,'vfx-planche.png'),sheet.toBuffer('image/png'));
fs.writeFileSync(path.join(__dirname,'vfx-mesures.json'),JSON.stringify(metrics,null,2)+'\n');
console.log('10 phases × 2 plans, confinement et réduction vérifiés ; opérations de peinture maximales :',Math.max(...metrics.flatMap(r=>r.samples.map(s=>s.paints))));

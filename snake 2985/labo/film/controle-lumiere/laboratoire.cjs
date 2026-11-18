'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]})),lab=path.resolve(__dirname,'../..');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Mesure');
const env=vm.createContext({URL,Image:class extends Image{set src(url){super.src=fs.readFileSync(path.join(lab,'campagne/decors',url.split('/').pop()));}},document:{baseURI:'https://fixture.local/',createElement:()=>createCanvas(1,1)},devicePixelRatio:1});env.window=env;
for(const p of ['../forge.js','../vol-libre.js','moteur.js','gardiens/gardiens.js','mondes/mondes.js','quantification/quantification.js','campagne/matieres.js','sprites/sprites.js','perception/marquage.js','locomotion/locomotion.js','animation-boss/animation.js','campagne/impact.js','camera/camera.js','artillerie/artillerie.js','endurance/phosphore/lisibilite.js','surcharges/surcharges.js','surcharges/effets.js','spectacle.js']){
 let code=fs.readFileSync(path.join(lab,p),'utf8');
 if(p==='spectacle.js'){const marker='function mask(c,cam,attack,z){';assert(code.includes(marker));code=code.replace(marker,marker+'if(window.skipMask)return;');}
 vm.runInContext(code,env,{filename:p});
}
const {SnakeSurchargeFX:fx,SnakeSurcharges:physics,SnakeSpectacle:scene,SnakeArcade:engine}=env;
const phosphor=env.SnakePhosphore;env.SnakePhosphore={...phosphor,draw(...args){if(!env.skipMask)return phosphor.draw(...args);}};
const kit=physics.install(engine,{update(){}});
const w=720,h=330,cv=createCanvas(w,h);cv.clientWidth=w;cv.clientHeight=h;
const linear=Array.from({length:256},(_,v)=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4);
const L=(buf,i)=>linear[buf[i]]*.2126+linear[buf[i+1]]*.7152+linear[buf[i+2]]*.0722;
function snapshot(s,reduce,armed,mask){
 const effects=s.effects;env.SnakeSurchargeFX=armed?fx:null;
 if(!armed)s.effects=s.effects.filter(e=>e.kind!=='nova');
 env.skipMask=!mask;scene.draw(cv,s,s.elapsed,reduce);s.effects=effects;
 return cv.getContext('2d').getImageData(0,0,w,h).data;
}
function zones(s,reduce){
 const labels=createCanvas(w,h),g=labels.getContext('2d'),cam=scene.camera(s,reduce?0:s.elapsed,reduce);g.scale(w/960,h/440);
 function poly(pts,id){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle='rgb('+((id>>8)&255)+','+(id&255)+',255)';g.fill();}
 for(const z of [0,1])poly([[-.5,-.5],[35.5,-.5],[35.5,17.5],[-.5,17.5]].map(([x,y])=>scene.project(cam,x,y,z)),0);
 s.boss.attack.tiles.forEach((p,i)=>poly(scene.tile(cam,p.x,p.y,s.boss.attack.plane),i+1));
 return g.getImageData(0,0,w,h).data;
}
async function main(){
 const all=[],proof=createCanvas(588,364),g=proof.getContext('2d');g.fillStyle='#151b24';g.fillRect(0,0,588,364);g.fillStyle='#f1e7d4';g.font='15px Mesure';g.fillText('1985 · annonce, mouvement réduit',12,20);g.fillText('Témoin',12,43);g.fillText('Nova + surcharge',302,43);
 for(const year of [1976,1985,1995,2185,2985])for(const reduced of [false,true]){
   if(year!==1976)assert(await env.SnakeMatieres.load(year));
   const s=engine.create(()=>.4,year);s.difficulty=s.sector=9;s.sectorCells=1;s.cells.unshift({x:10,y:9,plane:0});
   env.SnakeGardiens.tick(s,s.stepTime+1e-6);assert.equal(s.boss.attack.phase,'warning');
   const origin=s.elapsed;s.eaten=3;s.novaCharge=1;s.snake=Array.from({length:9},(_,i)=>({x:10-i,y:9,plane:0}));s.previousSnake=s.snake;
   assert(kit.engine.fire(s));assert(physics.read(s).active);
   const duration=physics.read(s).active.duration,initial=s.effects.find(e=>e.kind==='nova');assert(initial);const life=initial.life;
   for(const e of s.events){env.SnakeImpact.event(s,e);env.SnakeCameraMusicale.cue(s,e,{phase:.22,bpm:144});}
   for(let j=0;j<15;j++){
     const age=duration*(j+.02)/15;s.elapsed=origin+age;
     kit.forge.update(s,j?duration/15:duration*.02/15,{targets:()=>[]});initial.life=Math.max(0,life-age);
     if(initial.life===0)s.effects=s.effects.filter(x=>x!==initial);
     // Maintien du masque d'annonce réel pour balayer toutes les formes du tir.
     const a=snapshot(s,reduced,false,true),b=snapshot(s,reduced,false,false),c=snapshot(s,reduced,true,true),d=snapshot(s,reduced,true,false),zone=zones(s,reduced);
     let arena=0,changed=0,bright=0,dark=0,basePixels=0,lost=0;const baseByTile=new Map(),keptByTile=new Map();
     for(let i=0;i<a.length;i+=4){
       if(zone[i+3]<250)continue;arena++;
       if(a[i]!==c[i]||a[i+1]!==c[i+1]||a[i+2]!==c[i+2])changed++;
       const la=L(a,i),lc=L(c,i);if(lc-la>.1)bright++;if(la-lc>.1)dark++;
       const id=zone[i]*256+zone[i+1];
       if(!id||id>s.boss.attack.tiles.length)continue;
       const base=Math.abs(la-L(b,i)),live=Math.abs(lc-L(d,i));
       if(base>=.1){basePixels++;baseByTile.set(id,(baseByTile.get(id)||0)+1);if(live<.1)lost++;}
       if(live>=.1)keptByTile.set(id,(keptByTile.get(id)||0)+1);
     }
     if(year===1985&&reduced&&j===0){
       const cell=s.boss.attack.tiles[11],cam=scene.camera(s,0,true),pos=scene.project(cam,cell.x,cell.y,s.boss.attack.plane);
       for(const [col,bytes] of [a,c].entries()){
         const snap=createCanvas(w,h),gc=snap.getContext('2d'),img=gc.createImageData(w,h);img.data.set(bytes);gc.putImageData(img,0,0);
         g.imageSmoothingEnabled=false;g.drawImage(snap,10+col*290,52,280,128);
         const bx=pos.x*w/960-29,by=pos.y*h/440-16;g.drawImage(snap,bx,by,58,32,10+290*col,194,280,154);
         const q=scene.tile(cam,cell.x,cell.y,s.boss.attack.plane);g.beginPath();
         q.forEach((q,i)=>{const x=10+290*col+(q.x*w/960-bx)*280/58,y=194+(q.y*h/440-by)*154/32;if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.closePath();g.setLineDash([2,3]);g.strokeStyle='#d9e7d1';g.lineWidth=1;g.stroke();g.setLineDash([]);
       }
     }
     const readable=[...baseByTile].filter(([id,n])=>n>=8);
     all.push({year,reduced,j,age,arena,changed:changed/arena,bright:bright/arena,dark:dark/arena,basePixels,lost,readable:readable.length,missing:readable.filter(([id])=>(keptByTile.get(id)||0)<8).map(([id,n])=>({id,n,after:keptByTile.get(id)||0}))});
   }
 }
 fs.writeFileSync(path.join(__dirname,'annonce-1985.png'),proof.toBuffer('image/png'));
 fs.writeFileSync(path.join(__dirname,'laboratoire.json'),JSON.stringify(all)+'\n');
 for(const y of [1976,1985,1995,2185,2985]){const rr=all.filter(r=>r.year===y);
 console.log(y,...[Math.max(...rr.map(r=>r.changed)),Math.max(...rr.map(r=>r.bright)),Math.max(...rr.map(r=>r.lost/(r.basePixels||1)))].map(n=>(100*n).toFixed(2)),Math.max(...rr.map(r=>r.missing.length)));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Virages');
const lab=path.join(__dirname,'..'),ctx=vm.createContext({document:{createElement:()=>createCanvas(300,150)},devicePixelRatio:2});ctx.window=ctx;
const source=p=>fs.readFileSync(path.join(lab,p),'utf8');
for(const file of ['../forge.js','../vol-libre.js','moteur.js','mondes/mondes.js','sprites/sprites.js','locomotion/locomotion.js','animation-boss/animation.js','artillerie/artillerie.js','quantification/quantification.js','endurance/phosphore/lisibilite.js','perception/marquage.js','virages/virages.js']){
 vm.runInContext(source(file),ctx,{filename:file});
}
const marker='      if(window.SnakeArtillerie)';const original=source('spectacle.js');assert.equal(original.split(marker).length,2);
vm.runInContext(original.replace(marker,'      window.testDraw?.(c,s,cam,z,project);\n'+marker),ctx);
const api=ctx.SnakeVirages,game=ctx.SnakeArcade,scene=ctx.SnakeSpectacle;
function fixture(year,z,near,rotation=0){
 const s=game.create(()=>.42,year),x=18,y=near?12:6;
 const facing=[[1,0],[0,1],[-1,0],[0,-1]][rotation],next=[facing[1],-facing[0]];s.direction={x:facing[0],y:facing[1]};
 s.snake=Array.from({length:6},(_,i)=>({x:x-i*facing[0],y:y-i*facing[1],plane:z}));s.previousSnake=s.snake;s.plane=z;s.turbo=true;s.progress=1;s.drones=[];s.cells=[];s.spawnClock=s.gunClock=99;
 assert(game.turn(s,...next));assert(game.turn(s,...facing));assert(!game.turn(s,...next));
 return s;
}
function legacy(c,s,cam,z,project){
 const marks=api.footprints(s,z);if(!marks.length)return;
 c.save();c.strokeStyle='#b4d7cb';c.lineWidth=2.1;c.setLineDash([5,2]);c.beginPath();
 for(const [i,p] of [s.snake[0],...marks].entries()){
   const a=project(cam,p.x,p.y,z);if(i)c.lineTo(a.x,a.y);else c.moveTo(a.x,a.y);
 }
 c.stroke();c.restore();
}
const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const lum=(p,i)=>.2126*linear(p[i])+.7152*linear(p[i+1])+.0722*linear(p[i+2]);
const rgb=(cv)=>cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
const years=[1976,1985,1995,2185,2985],rows=[];
const sheet=createCanvas(1030,775),g=sheet.getContext('2d');g.fillStyle='#121822';g.fillRect(0,0,1030,775);g.fillStyle='#f1ebd6';g.font='bold 20px Virages';g.fillText('Deux virages saisis · grille haute, Turbo',16,31);
for(const [col,title] of ['Sans empreinte','Trait discontinu','Empreintes de pas'].entries()){g.font='16px Virages';g.fillText(title,100+col*310,57);}
function render(w,h,s,kind){
 ctx.testDraw=kind;const cv=createCanvas(w*2,h*2);cv.clientWidth=w;cv.clientHeight=h;scene.draw(cv,s,1,false);return cv;
}
function metrics(a,b,centers,w,h){
 const pa=rgb(a),pb=rgb(b);let diff=0,head=0,readable=[0,0],changed=[0,0];
 for(let i=0;i<pa.length;i+=4){
   if(pa[i]===pb[i]&&pa[i+1]===pb[i+1]&&pa[i+2]===pb[i+2])continue;
   diff++;const x=(i/4%a.width+.5)*960/a.width,y=(Math.floor(i/4/a.width)+.5)*440/a.height;
   const d=centers.map(p=>Math.hypot(x-p.x,y-p.y));
   if(d[0]<3)head++;
   const nearest=d[1]<d[2]?0:1;
   if(d[nearest+1]<=8){changed[nearest]++;const l1=lum(pa,i)+.05,l2=lum(pb,i)+.05;if(Math.max(l1,l2)/Math.min(l1,l2)>=3)readable[nearest]++;}
 }
 return {changedOutputPixels:diff,headCentre:head,changedFootprints:changed,contrast3:readable};
}
for(const [idx,year] of years.entries()){
 for(const [w,h] of [[568,275],[874,292]])for(const z of [0,1])for(const near of [false,true])for(const rotation of [0,1,2,3]){
   const s=fixture(year,z,near,rotation),marks=api.footprints(s,z);assert.equal(marks.length,2);assert.equal(api.footprints(s,1-z).length,0);
   const cam=scene.camera(s,1,false),centers=[s.snake[0],...marks].map(p=>scene.project(cam,p.x,p.y,z));
   const imgs=[null,legacy,api.draw].map(fn=>render(w,h,s,fn));
   const alt=metrics(imgs[0],imgs[1],centers,w,h),selected=metrics(imgs[0],imgs[2],centers,w,h);
   assert.equal(selected.headCentre,0);assert(selected.changedOutputPixels>0);rows.push({year,w,h,z,near,rotation,alt,selected});
   if(w===568&&z===1&&near&&rotation===0){
     g.fillStyle='#e4d6ba';g.font='16px Virages';g.fillText(String(year),16,113+idx*139);
     for(const [col,cv] of imgs.entries()){
       const cx=(centers[0].x+centers[2].x)/2,cy=(centers[0].y+centers[2].y)/2;
       const ratio=cv.width/960,vy=cv.height/440;
       g.imageSmoothingEnabled=false;g.drawImage(cv,(cx-48)*ratio,(cy-22)*vy,96*ratio,44*vy,100+col*310,71+idx*139,288,132);
     }
   }
 }
}
const s=fixture(1995,0,false),start=s.snake[0],list=api.footprints(s,0);
const march=()=>{const n=s.turns.length;for(let i=0;i<60&&s.turns.length===n;i++)game.tick(s,1/60);};
march();assert.equal(s.snake[0].x,list[0].x);assert.equal(s.snake[0].y,list[0].y);assert.equal(api.footprints(s,0).length,1);march();assert.equal(s.snake[0].x,list[1].x);assert.equal(s.snake[0].y,list[1].y);assert.equal(api.footprints(s,0).length,0);
for(const type of ['danger','telegraph','cell','pointer','body','drone','gate','flight','wall','old']){
 const s=fixture(1976,0,false),q=api.footprints(s,0)[0],k=q.y*s.width+q.x;
 if(type==='danger')s.ecologie={wave:{phase:'active',plane:0,mask:new Set([k]),tiles:[q]}};
 if(type==='telegraph')s.ecologie={wave:{phase:'warning',plane:0,tiles:[q]}};
 if(type==='cell')s.cells=[q];
 if(type==='pointer')s.aide={at:q};
 if(type==='body')s.snake.push(q);
 if(type==='drone')s.drones=[{...q,warmup:.1}];
 if(type==='gate')s.flightGate=q;
 if(type==='flight')s.flight={remaining:2};
 if(type==='wall')s.snake[0].y=0;
 if(type==='old')delete s.turns;
 assert.equal(api.footprints(s,0).length,0,type);
 if(['danger','telegraph','cell','pointer','body','drone','gate'].includes(type)){
   const a=render(568,275,s,null),b=render(568,275,s,api.draw);assert(Buffer.from(rgb(a)).equals(Buffer.from(rgb(b))),type+' pixels protégés');
 }
}
const quiet=fixture(1995,0,true);quiet.turbo=false;
const baseFrame=render(568,275,quiet,null);assert(Buffer.from(rgb(baseFrame)).equals(Buffer.from(rgb(render(568,275,quiet,api.draw)))));
quiet.initiation={prepared:true,stage:'virage'};assert(!Buffer.from(rgb(baseFrame)).equals(Buffer.from(rgb(render(568,275,quiet,api.draw)))));
quiet.initiation.stage='libre';assert(Buffer.from(rgb(baseFrame)).equals(Buffer.from(rgb(render(568,275,quiet,api.draw)))));
const movement=[];
for(const year of years){
 const s=fixture(year,0,false),base=s.snake[0];s.turns=[];game.turbo(s,true);assert(game.shiftPlane(s));
 const high=s.snake[0].plane;assert.equal(high,1);assert.equal(api.footprints(s,1).length,0);
 const change=[];assert(game.turn(s,0,-1));assert(game.turn(s,1,0));let previous=-1;
 for(let frame=0;frame<70;frame++){
   const marks=api.footprints(s,high),n=marks.length;
   if(n!==previous){
     const a=render(568,275,s,null),b=render(568,275,s,api.draw);
     const changed=!Buffer.from(rgb(a)).equals(Buffer.from(rgb(b)));
     assert.equal(changed,n>0,year+' frame '+frame);
     change.push({frame,queued:n,visible:changed,plane:high,head:[s.snake[0].x,s.snake[0].y]});previous=n;
   }
   if(!n)break;
   game.tick(s,1/60);
 }
 assert.deepEqual(change.map(r=>r.queued),[2,1,0]);assert.equal(change[0].frame,0);
 assert.equal(s.snake[0].x,base.x+1);assert.equal(s.snake[0].y,base.y-1);movement.push({year,change});
}
fs.writeFileSync(path.join(__dirname,'mouvement.json'),JSON.stringify(movement,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify(rows,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'comparaison.png'),sheet.toBuffer('image/png'));
console.log(rows.length+' combinaisons × 3 rendus. Toutes les assertions passent.');

'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Marque');
const lab=path.resolve(__dirname,'..'),win=vm.createContext({document:{createElement:()=>createCanvas(1,1)},devicePixelRatio:2});win.window=win;
for(const p of ['../forge.js','moteur.js','mondes/mondes.js','quantification/quantification.js','sprites/sprites.js','locomotion/locomotion.js','artillerie/artillerie.js','endurance/phosphore/lisibilite.js','bouche/bouche.js','spectacle.js']){
 let code=fs.readFileSync(path.join(lab,p),'utf8');if(p==='spectacle.js'){const anchor='      window.SnakeSurchargeFX?.draw';assert(code.includes(anchor));if(!code.includes('SnakeBouche?.draw'))code=code.replace(anchor,'      window.SnakeBouche?.draw(c,s,cam,z,reduced,project);\n'+anchor);}
 vm.runInContext(code,win);
}
const fx=win.SnakeBouche,engine=win.SnakeArcade,forge=win.SnakeForge,scene=win.SnakeSpectacle;
const years=[1976,1985,1995,2185,2985],cores=['orbit','prism','well'],mods=['echo','chain','blast'],linear=Array.from({length:256},(_,i)=>(i/255)<=.04045?(i/255)/12.92:((i/255+.055)/1.055)**2.4);
const compare=(a,b)=>{
 let count=0,contrast3=0,rad=0;for(let i=0;i<a.data.length;i+=4){
  if(a.data[i]===b.data[i]&&a.data[i+1]===b.data[i+1]&&a.data[i+2]===b.data[i+2])continue;
  count++;const y=p=>.05+.2126*linear[p[i]]+.7152*linear[p[i+1]]+.0722*linear[p[i+2]];
  const l=y(a.data),r=y(b.data);if(Math.max(l,r)/Math.min(l,r)>=3)contrast3++;
  rad=Math.max(rad,Math.hypot((i/4%a.width+.5)-a.width/2,(Math.floor(i/4/a.width)+.5)-a.height/2));
 }return {count,contrast3,rad};
};
function state(year,core,mod,dir,z){
 const s=engine.create(()=>.4,year);s.plane=z;s.snake=Array.from({length:5},(_,i)=>({x:17-i*dir[0],y:9-i*dir[1],plane:z}));s.previousSnake=s.snake;s.direction={x:dir[0],y:dir[1]};s.progress=1;s.cells=[];s.drones=[];s.elapsed=1;
 forge.equip(s,core,mod);s.forge.clock=0;
 const h={targets:()=>[],plane:()=>z,emit:(type,e)=>fx.event(s,{...e,type}),visible:()=>true};
 forge.update(s,1/600,h);return {s,h};
}
const cv=createCanvas(1136,550);cv.clientWidth=568;cv.clientHeight=275;
function shot(s,reduce,on,full=false){
 win.SnakeBouche=on?fx:null;scene.draw(cv,s,s.elapsed,reduce);
 const c=cv.getContext('2d');if(full)return c.getImageData(0,0,cv.width,cv.height);
 const cam=scene.camera(s,reduce?0:s.elapsed,reduce),head=s.snake[0],pt=scene.project(cam,head.x,head.y,s.plane);
 return c.getImageData(Math.round(pt.x*cv.width/960)-38,Math.round(pt.y*cv.height/440)-38,76,76);
}
const sheet=createCanvas(870,548),g=sheet.getContext('2d');g.fillStyle='#131a23';g.fillRect(0,0,870,548);g.fillStyle='#f4e7cc';g.font='bold 20px Marque';g.fillText('Prisme · départ du tir à 120 ms',15,28);
['Témoin commun','Écho','Chaîne','Détonation'].forEach((t,i)=>{g.font='15px Marque';g.fillText(t,86+i*192,54);});
const rows=[],bounds=[],timing=[];
for(const [yi,year] of years.entries())for(const core of cores)for(const dir of [[1,0],[0,-1]])for(const reduce of [false,true]){
 const settings=mods.map(m=>state(year,core,m,dir,reduce?1:0));let prev=0;
 for(const age of [.040,.120,.175]){
   const current=[];
   for(const {s,h} of settings){s.elapsed=1+age;forge.update(s,age-prev,h);const old=shot(s,reduce,false),fresh=shot(s,reduce,true);current.push({old,fresh});}
   prev=age;for(const [i,j] of [[0,1],[1,2],[2,0]]){
     const before=compare(current[i].old,current[j].old),after=compare(current[i].fresh,current[j].fresh);
     assert.equal(before.count,0);rows.push({year,core,dir,reduce,age,pair:mods[i]+'-'+mods[j],before:before.count,after});
   }
   if(core==='prism'&&dir[0]===1&&!reduce&&age===.120){
     g.fillStyle='#f4e7cc';g.font='15px Marque';g.fillText(String(year),15,109+yi*94);
     [current[0].old,...current.map(c=>c.fresh)].forEach((im,i)=>{const stage=createCanvas(76,76);stage.getContext('2d').putImageData(im,0,0);g.imageSmoothingEnabled=false;g.drawImage(stage,10,13,65,45,80+192*i,65+94*yi,130,90);});
   }
 }
 if(dir[0]===1&&!reduce){
   const {s}=settings[0];
   for(const key of ['boss','ecologie']){
     if(key==='boss')s.boss={x:23,y:10,plane:0,hp:12,maxHp:12,attack:{plane:0,phase:'warning',tiles:[{x:18,y:9}]}};
     else s.ecologie={wave:{plane:0,phase:'active',tiles:[{x:18,y:9}]}};
     assert.equal(compare(shot(s,false,false,true),shot(s,false,true,true)).count,0);s[key]=null;
   }
   for(const {s} of settings){
     const d=compare(shot(s,reduce,false,true),shot(s,reduce,true,true));bounds.push({year,core,mod:s.forge.mod,count:d.count});
     s.elapsed=1.21;assert.equal(compare(shot(s,reduce,false,true),shot(s,reduce,true,true)).count,0);
   }
   const c=cv.getContext('2d'),cam=scene.camera(s,1.12,false);s.elapsed=1.12;const times=[];
   for(let k=0;k<80;k++){const start=performance.now();for(let i=0;i<12;i++)fx.draw(c,s,cam,0,false,scene.project);const dt=performance.now()-start;if(k>=20)times.push(dt/12);}
   times.sort((a,b)=>a-b);timing.push({year,core,p95:times[Math.ceil(times.length*.95)-1]});
 }
}
fs.writeFileSync(path.join(__dirname,'planche.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify({rows,bounds,timing})+'\n');
console.log(rows.length,'paires ; minimum/médiane de pixels de contraste 3:1',Math.min(...rows.map(r=>r.after.contrast3)),rows.map(r=>r.after.contrast3).sort((a,b)=>a-b)[rows.length/2]);

'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Access');
const lab=path.resolve(__dirname,'../..'),env=vm.createContext({document:{createElement:()=>createCanvas(1,1)},devicePixelRatio:2});env.window=env;
for(const p of ['../forge.js','../vol-libre.js','moteur.js','mondes/mondes.js','quantification/quantification.js','endurance/phosphore/lisibilite.js','sprites/sprites.js','spectacle.js'])vm.runInContext(fs.readFileSync(path.join(lab,p),'utf8'),env);
const source=fs.readFileSync(path.join(lab,'spectacle.js'),'utf8'),guard="if(active && cam.year!==1976){";
assert.equal(source.split(guard).length,2);
vm.runInContext(source.replace(guard,"if(false){").replace('window.SnakeSpectacle=','window.SnakeOldScene='),env);
const matrices={protan:[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],deutan:[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]]};
const gray=[[.2126,.7152,.0722],[.2126,.7152,.0722],[.2126,.7152,.0722]];
const linear=Array.from({length:256},(_,i)=>{const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
const codes=Array.from({length:4097},(_,i)=>{const v=i/4096;return Math.round(255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055));});
function convert(bytes,i,M){
 const r=linear[bytes[i]],g=linear[bytes[i+1]],b=linear[bytes[i+2]];
 if(!M)return [bytes[i],bytes[i+1],bytes[i+2]];
 return M.map(m=>codes[Math.round(4096*Math.max(0,Math.min(1,m[0]*r+m[1]*g+m[2]*b)))]);
}
const years=[1976,1985,1995,2185,2985],names=['cellule','menace','portail','plan'];
const photos=createCanvas(960,605),out=photos.getContext('2d');out.fillStyle='#101720';out.fillRect(0,0,960,605);out.font='bold 19px Access';out.fillStyle='#f3ecdc';out.fillText('Vision rouge-vert · simulation de deutéranopie',14,24);
const cols=['Cellule','Cases dangereuses','Porte de vol','Deux plans','Capture archivée'];for(const [i,k] of cols.entries()){out.font='15px Access';out.fillText(k,76+i*175,52);}
const phases=createCanvas(722,398),pc=phases.getContext('2d');pc.fillStyle='#121820';pc.fillRect(0,0,722,398);pc.fillStyle='#eee7d8';pc.font='bold 18px Access';pc.fillText('Signal de danger · luminance seule',15,26);
for(const [i,label] of ['Annonce','Impact avant','Impact corrigé'].entries()){pc.font='15px Access';pc.fillText(label,80+i*210,54);}
const rows=[],archive=[],planes=[],warnings=[],bounds=[],target={cellule:[12,7],menace:[17,7],portail:[21,7],plan:[24,11]};
function render(s,renderer=env.SnakeSpectacle){
 const cv=createCanvas(1136,550);cv.clientWidth=568;cv.clientHeight=275;renderer.draw(cv,s,1.75,true);return cv;
}
function crop(cv,x,y,w,h){
 const el=createCanvas(w,h);el.getContext('2d').drawImage(cv,Math.round(x-w/2),Math.round(y-h/2),w,h,0,0,w,h);return el;
}
function transformed(cv,M){
 const c=cv.getContext('2d'),img=c.getImageData(0,0,cv.width,cv.height);
 for(let i=0;i<img.data.length;i+=4){const a=convert(img.data,i,M);img.data[i]=a[0];img.data[i+1]=a[1];img.data[i+2]=a[2];}
 const output=createCanvas(cv.width,cv.height);output.getContext('2d').putImageData(img,0,0);return output;
}
function metrics(a,b,M){
 const bytes=cv=>cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,A=bytes(a),B=bytes(b);
 let changed=0,three=0;const lum=p=>.05+.2126*linear[p[0]]+.7152*linear[p[1]]+.0722*linear[p[2]];
 for(let i=0;i<A.length;i+=4){
   const x=convert(A,i,M),y=convert(B,i,M),u=lum(x),v=lum(y);
   if(Math.max(...x.map((n,j)=>Math.abs(n-y[j])))>=16)changed++;
   if(Math.max(u,v)/Math.min(u,v)>=3)three++;
 }
 return {delta16:changed,contrast3:three};
}
function addPic(img,col,row){
 out.imageSmoothingEnabled=false;out.drawImage(img,73+col*175,66+row*105,161,86);
}
function set(s,kind,on){
 if(kind==='cellule')s.cells=on?[{x:12,y:7,plane:s.plane}]:[];
 if(kind==='menace'){
   const tiles=[{x:16,y:7},{x:17,y:7},{x:18,y:7}];
   s.ecologie=on?{wave:{phase:'active',plane:s.plane,tiles,danger:new Set(tiles.map(p=>p.y*36+p.x))}}:null;
 }
 if(kind==='portail')s.flightGate=on?{x:21,y:7,plane:s.plane}:null;
}
async function main(){
 const annotations=JSON.parse(fs.readFileSync(path.join(lab,'perception/annotations.json')));
 for(const [row,year] of years.entries()){
   out.fillStyle='#e6d9bf';out.font='bold 16px Access';out.fillText(String(year),14,112+row*105);
   for(const plane of [0,1]){
     const s=env.SnakeArcade.create(()=>.4,year);s.cells=[];s.drones=[];s.plane=plane;s.snake=s.snake.map(p=>({...p,plane}));s.previousSnake=s.snake;
     const cam=env.SnakeSpectacle.camera(s,1.75,true);
     for(const [col,kind] of names.entries()){
       const [x,y]=target[kind],p=env.SnakeSpectacle.project(cam,x,y,plane);
       const get=()=>crop(render(s),p.x*1136/960,p.y*550/440,96,52);
       if(kind==='plan'){
         const a=env.SnakeSpectacle.project(cam,x,y,0),b=env.SnakeSpectacle.project(cam,x,y,1),mx=(a.x+b.x)/2*1136/960,my=(a.y+b.y)/2*550/440;
         const phase=()=>crop(render(s),mx,my,103,58);s.cells=[{x,y,plane:0},{x,y,plane:1}];const both=phase();
         if(plane===1)addPic(transformed(both,matrices.deutan),col,row);
         for(const objectPlane of [plane,1-plane]){s.cells=[{x,y,plane:objectPlane}];const one=phase();s.cells=[];const none=phase();
           planes.push({year,active:plane,objectPlane,cssDistance:Math.hypot((a.x-b.x)*568/960,(a.y-b.y)*275/440),protan:metrics(one,none,matrices.protan),deutan:metrics(one,none,matrices.deutan)});}
         continue;
       }
       set(s,kind,false);const base=get();set(s,kind,true);const b=get();set(s,kind,false);
       rows.push({year,plane,kind,normal:metrics(b,base,null),protan:metrics(b,base,matrices.protan),deutan:metrics(b,base,matrices.deutan)});
       if(plane===1)addPic(transformed(b,matrices.deutan),col,row);
       if(kind==='menace'){
         set(s,kind,true);s.ecologie.wave.phase='warning';const warning=get();set(s,kind,false);
         warnings.push({year,plane,protan:metrics(b,warning,matrices.protan),deutan:metrics(b,warning,matrices.deutan),gray:metrics(b,warning,gray)});
         for(const phase of ['warning','active']){
           set(s,kind,true);s.ecologie.wave.phase=phase;
           const before=render(s,env.SnakeOldScene),after=render(s);
           if(plane===1&&year!==1976){
             const imgs=phase==='warning'?[[after,0]]:[[before,1],[after,2]];
             for(const [cv,col] of imgs){
               const region=transformed(crop(cv,p.x*1136/960,p.y*550/440,78,31),gray);
               pc.imageSmoothingEnabled=false;pc.drawImage(region,80+col*210,65+(row-1)*81,195,77);
             }
             pc.fillStyle='#eee7d8';pc.fillText(String(year),15,108+(row-1)*81);
           }
           const buf=cv=>cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,A=buf(before),B=buf(after);
           const polygons=s.ecologie.wave.tiles.map(t=>env.SnakeSpectacle.tile(cam,t.x,t.y,plane));
           const inQuad=(x,y,q)=>q.every((a,i)=>{const b=q[(i+1)%4];return (b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x)>=0;});
           let count=0,outside=0;
           for(let j=0;j<A.length;j+=4){
             if(A[j]===B[j]&&A[j+1]===B[j+1]&&A[j+2]===B[j+2])continue;
             count++;const px=(j/4%before.width+.5)*960/before.width,py=(Math.floor(j/4/before.width)+.5)*440/before.height;
             if(!polygons.some(q=>inQuad(px,py,q)))outside++;
           }
           bounds.push({year,plane,phase,count,outside});assert.equal(outside,0,year+' '+plane);assert.equal(count>0,phase==='active'&&year!==1976);
           set(s,kind,false);
         }
       }
     }
   }
   const r=annotations.find(a=>a.year===year&&a.split==='holdout'&&a.ablation==='normal'&&a.hazard==='active'&&a.head&&a.target);
   assert(r);const img=await loadImage(path.join(lab,'perception/corpus',r.id+'.png'));const tmp=createCanvas(img.width,img.height);tmp.getContext('2d').drawImage(img,0,0);
   const center=[(r.head[0]+r.target[0])/2,(r.head[1]+r.target[1])/2];
   addPic(transformed(crop(tmp,...center,110,59),matrices.deutan),4,row);archive.push({year,id:r.id,plane:r.plane,mode:r.mode});
 }
 fs.writeFileSync(path.join(__dirname,'phases.png'),phases.toBuffer('image/png'));fs.writeFileSync(path.join(__dirname,'planche.png'),photos.toBuffer('image/png'));fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify({rows,planes,warnings,bounds,archive},null,2)+'\n');console.log(rows.length+' comparaisons appariées, '+archive.length+' captures du jeu.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

// Compare les fichiers PNG déjà produits, sans navigateur ni décodage de média.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{PNG}=require('playwright-core/lib/utilsBundle');
const dir=__dirname,lab=path.dirname(dir),game=path.dirname(lab),ctx=vm.createContext({});ctx.window=ctx;
const archive=path.join(dir,'releves','sources-mesurees.json.gz');
const frozen=fs.existsSync(archive)?JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(archive))):null;
for(const [key,file] of Object.entries({'vol.js':path.join(game,'vol-libre.js'),'forge.js':path.join(game,'forge.js'),'gardiens.js':path.join(lab,'gardiens/gardiens.js'),'moteur.js':path.join(lab,'moteur.js'),'spectacle.js':path.join(lab,'spectacle.js')}))vm.runInContext(frozen?.[key]??fs.readFileSync(file,'utf8'),ctx);
function targets(year){
 let seed=year;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const s=ctx.SnakeArcade.create(rnd,year);s.difficulty=4;s.sector=4;s.sectorCells=1;s.cells.unshift({x:10,y:9,plane:0});ctx.SnakeArcade.tick(s,s.stepTime+.00001);
 for(let i=0;i<15;i++)ctx.SnakeArcade.tick(s,1/60);
 const cam=ctx.SnakeSpectacle.camera(s,2.4,false);
 const p=s.snake[0],prev=s.previousSnake[0];
 const head=ctx.SnakeSpectacle.project(cam,prev.x+(p.x-prev.x)*s.progress,prev.y+(p.y-prev.y)*s.progress,p.plane);
 const danger=s.boss?.attack?.tiles?.filter(q=>q.x>4&&q.x<30&&q.y>3&&q.y<14&&(Math.abs(q.x-p.x)+Math.abs(q.y-p.y)>4)&&Math.abs(q.x-s.boss.x)+Math.abs(q.y-s.boss.y)>3)?.[0];
 return {head,boss:ctx.SnakeSpectacle.project(cam,s.boss.x,s.boss.y,s.boss.plane),danger:danger&&ctx.SnakeSpectacle.project(cam,danger.x,danger.y,danger.plane??0)};
}
const lum=[...Array(256)].map((_,v)=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4);
const Y=(p,i)=>.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
const light=(p,i)=>.2126*lum[p[i]]+.7152*lum[p[i+1]]+.0722*lum[p[i+2]];
function imageDiff(a,b,roi){
 const [sx,sy,ex,ey]=roi,flat=a.data,other=b.data;let pixels=0,equal=0,large=0,ssimTotal=0,patches=0,error=0;
 for(let y=sy;y<ey;y+=8)for(let x=sx;x<ex;x+=8){
  let k=0,u=0,v=0,uu=0,vv=0,uv=0;
  for(let j=y;j<Math.min(y+8,ey);j++)for(let i=x;i<Math.min(x+8,ex);i++){
   const z=(j*a.width+i)*4,A=Y(flat,z),B=Y(other,z),d=Math.abs(flat[z]-other[z])+Math.abs(flat[z+1]-other[z+1])+Math.abs(flat[z+2]-other[z+2]);
   k++;u+=A;v+=B;uu+=A*A;vv+=B*B;uv+=A*B;pixels++;if(d===0)equal++;if(d>72)large++;error+=d/3;
  }
  u/=k;v/=k;const va=uu/k-u*u,vb=vv/k-v*v,cov=uv/k-u*v;
  ssimTotal+=(2*u*v+6.5025)*(2*cov+58.5225)/((u*u+v*v+6.5025)*(va+vb+58.5225));patches++;
 }
 return {pixels,exact:equal/pixels,rgbDeltaAbove72:large/pixels,meanChannelError:error/pixels,ssimLuma8:ssimTotal/patches};
}
function feature(a,b,p,r){
 if(!p)return null;
 const cx=Math.round(p.x*a.width/960),cy=Math.round(p.y*a.height/440);
 const box=[cx-r,cy-r,cx+r+1,cy+r+1];
 const contrast=img=>{
   const va=[];for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++)va.push(light(img.data,(y*img.width+x)*4));
   va.sort((A,B)=>A-B);return (va[Math.floor(va.length*.95)]+.05)/(va[Math.floor(va.length*.1)]+.05);
 };
 return {referenceContrast:contrast(a),logicalContrast:contrast(b),...imageDiff(a,b,box)};
}
function compare(folder,smoke){
 const result=[];
 for(const width of smoke?[740]:[568,740])for(const year of [1976,1985,1995,2185,2985]){
   const prefix=(smoke?'':width+'-')+year+'-';
   const read=k=>PNG.sync.read(fs.readFileSync(path.join(folder,prefix+k+'.png'))),a=read('dpr2'),b=read('logique');
   const tar=targets(year);result.push({width,year,full:imageDiff(a,b,[0,0,a.width,a.height]),head:feature(a,b,tar.head,12),danger:feature(a,b,tar.danger,8),boss:feature(a,b,tar.boss,18)});
 }
 return result;
}
module.exports=compare;
if(require.main===module){const smoke=process.argv.includes('--smoke'),folder=path.join(dir,smoke?'smoke':'releves');const r=compare(folder,smoke);fs.writeFileSync(path.join(folder,'images.json'),JSON.stringify(r,null,2));for(const a of r)console.log(a.width,a.year,a.full.ssimLuma8.toFixed(3),a.head.logicalContrast.toFixed(2),a.danger?.logicalContrast?.toFixed(2),a.full.exact.toFixed(3));}

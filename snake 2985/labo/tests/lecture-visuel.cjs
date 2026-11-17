// Contrôle des pixels réellement restitués, hors navigateur. Exécuter après mesure-visuel.cjs.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {PNG}=require('playwright-core/lib/utilsBundle');
const lab=path.resolve(__dirname,'..'),dir=path.join(lab,'preuves-visuel'),ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(lab,'spectacle.js'),'utf8'),ctx);
const fixture=fs.readFileSync(path.join(lab,'scene-visuel.html'),'utf8');
const scene=vm.runInContext('const seg='+fixture.split('const seg=')[1].split('window.scene=')[0]+';scene;',ctx);
const api=ctx.window.SnakeSpectacle;
function light(r,g,b){return [r,g,b].map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
const result=[];
for(const mode of ['sol','bascule','vol','fini']){
  const s=scene(mode),cam=api.camera(s,2),png=PNG.sync.read(fs.readFileSync(path.join(dir,mode+'-direct.png')));
  const h=s.snake[0],points=[['tete',h.x,h.y,mode==='bascule'?cam.level:s.plane]];
  if(s.boss?.attack)points.push(['danger',20,7,s.plane]);
  function pixel(x,y){return Array.from(png.data.subarray((y*png.width+x)*4,(y*png.width+x)*4+3));}
  for(const [type,x,y,z] of points){
    const p=api.project(cam,x,y,z),cx=Math.round(p.x*png.width/api.width),cy=Math.round(p.y*png.height/api.height);
    const bg=light(...pixel(cx,cy+16));
    let signal=0,maxContrast=0;
    for(let iy=cy-7;iy<=cy+7;iy++)for(let ix=cx-9;ix<=cx+9;ix++){
      const [r,g,b]=pixel(ix,iy),matched=type==='tete'?g>160&&g>r*1.12&&b>130:r>150&&r>g*1.18&&r>b*1.22;
      if(matched){signal++;maxContrast=Math.max(maxContrast,(light(r,g,b)+.05)/(bg+.05));}
    }
    assert(signal>=8&&maxContrast>3,mode+' '+type+' '+signal+' '+maxContrast);
    result.push({scene:mode,type,couleurDetecteePixels:signal,contrastePointeFondVoisin:maxContrast});
  }
}
fs.writeFileSync(path.join(dir,'lecture.json'),JSON.stringify(result,null,2)+'\n');
console.log(result);

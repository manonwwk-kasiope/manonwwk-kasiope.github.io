'use strict';
// Vérifie le branchement réel avec le binaire Skia local et les mêmes captures.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),os=require('node:os'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
const source=fs.readFileSync(path.join(__dirname,'reference.cjs'),'utf8');
const start=source.indexOf('    const img=c.getImageData'),end=source.indexOf('    c.putImageData(img',start);assert(start>0&&end>start);
const first=source.slice(start,source.indexOf('    for(let y=0,i=0;',start));
const hook=first.replace(/,packed=new Uint32Array\([^;]+/,'')+"    SnakeQuantification.convert(buf,w,h,f.bits,table);\n";
function world(src){
  const sandbox=vm.createContext({module:{exports:{}},document:{createElement:()=>createCanvas(1,1)},SnakeQuantification:require('./quantification.js')});sandbox.window=sandbox;vm.runInContext(src,sandbox);return sandbox.module.exports;
}
const old=world(source),newWorld=world(source.slice(0,start)+hook+source.slice(end));
async function main(){
  let passed=0;
  for(const y of [1976,1985,1995,2185,2985])for(const screen of [568,740]){
    const image=await loadImage(path.join(__dirname,'../endurance/releves',screen+'-'+y+'-dpr2.png'));
    for(const direct of [true,false]){
      const outputs=[old,newWorld].map(mod=>{
        const fullW=screen*2,fullH=Math.round(fullW*image.height/image.width),w=direct?Math.min(mod.formats[y].width,fullW):fullW;
        const cv=createCanvas(w,Math.round(w*image.height/image.width)),out=direct?createCanvas(fullW,fullH):cv;
        cv.getContext('2d').drawImage(image,0,0,cv.width,cv.height);mod.finish(cv,y,out);
        return Buffer.from(out.getContext('2d').getImageData(0,0,out.width,out.height).data);
      });assert(outputs[0].equals(outputs[1]),[y,screen,direct].join('/'));passed++;
    }
  }
  console.log(passed+' sorties complètes Skia RGBA identiques (deux chemins de surface).');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

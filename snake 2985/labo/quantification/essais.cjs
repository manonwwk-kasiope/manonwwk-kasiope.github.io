'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),os=require('node:os'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
const reference=require('./reference.cjs'),fast=require('./quantification.js'),years=[1976,1985,1995,2185,2985];
const table=year=>reference.formats[year].palette?reference.lut(year):null;
const alt=vm.createContext({window:{}});
const source=fs.readFileSync(path.join(__dirname,'quantification.js'),'utf8');
vm.runInContext(source.replace(/const nativeLittle=[^;]+;/,'const nativeLittle=false;'),alt);
const fall=alt.window.SnakeQuantification;
function compare(input,w,h,year,repli=false){
  const bits=reference.formats[year].bits,pal=table(year),expected=new Uint8ClampedArray(input),got=new Uint8ClampedArray(input);
  reference.convert(expected,w,h,year);fast.convert(got,w,h,bits,pal);
  assert(Buffer.from(got.buffer).equals(Buffer.from(expected.buffer)),year+' voie native');
  if(repli){
    const misaligned=new Uint8ClampedArray(new ArrayBuffer(input.length+2),1,input.length);misaligned.set(input);
    fast.convert(misaligned,w,h,bits,pal);assert(Buffer.from(misaligned).equals(Buffer.from(expected.buffer)),year+' décalage');
    got.set(input);fall.convert(got,w,h,bits,pal);assert(Buffer.from(got.buffer).equals(Buffer.from(expected.buffer)),year+' repli forcé');
  }
}
function exhaustive(){
  // Chaque indice RGB555, dans les seize cases Bayer, aux bords bas, haut
  // et intermédiaire de la cellule ; les trois canaux traversent 0 à 255.
  const w=512,h=1024,buf=new Uint8ClampedArray(w*h*4);
  for(let rem=0;rem<8;rem++){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const j=(y*w+x)*4,k=((y>>2)*(w>>2)+(x>>2)),phase=(y&3)*4+(x&3);
      buf[j]=((k>>10)<<3)+rem;buf[j+1]=(((k>>5)&31)<<3)+((rem+3)&7);
      buf[j+2]=((k&31)<<3)+((rem+5)&7);buf[j+3]=(k*17+phase*13+rem)&255;
    }
    for(const year of years)compare(buf,w,h,year,rem===0);
  }
  let seed=481716;
  for(const [w,h] of [[1,1],[3,2],[257,151],[768,351]]){
    const input=new Uint8ClampedArray(w*h*4);
    for(let i=0;i<input.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;input[i]=seed>>>24;}
    for(const year of years)compare(input,w,h,year,true);
  }
}
const stat=(a)=>{const sorted=a.slice().sort((x,y)=>x-y);return {med:sorted[Math.ceil(a.length*.5)-1],p95:sorted[Math.ceil(a.length*.95)-1]};};
const names=['resize','read','convert','put','upscale','total'];
function runner(year,screen,image){
  const f=reference.formats[year],w=Math.min(screen*2,f.width),h=Math.round(w*image.height/image.width),direct=[1985,2185].includes(year);
  const src=createCanvas(screen*2,Math.round(screen*2*image.height/image.width)),input=src.getContext('2d');input.drawImage(image,0,0,src.width,src.height);
  const work=createCanvas(w,h),c=work.getContext('2d'),out=createCanvas(src.width,src.height),o=out.getContext('2d');
  const pal=table(year);
  return optimized=>{
    if(direct)c.drawImage(src,0,0,w,h); // production : le rendu de scène a déjà rempli la surface logique.
    const start=performance.now();
    if(!direct){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='low';c.drawImage(src,0,0,w,h);}
    const scaled=performance.now();c.save();c.setTransform(1,0,0,1,0,0);
    const img=c.getImageData(0,0,w,h),read=performance.now();
    if(optimized)fast.convert(img.data,w,h,f.bits,pal);else reference.convert(img.data,w,h,year);
    const converted=performance.now();c.putImageData(img,0,0);c.restore();const written=performance.now();
    o.save();o.setTransform(1,0,0,1,0,0);o.imageSmoothingEnabled=false;o.drawImage(work,0,0,out.width,out.height);o.restore();
    const end=performance.now();return [scaled-start,read-scaled,converted-read,written-converted,end-written,end-start];
  };
}
async function main(){
  exhaustive();
  const bench=[],scenes=[],warm=24,pairs=181;
  for(const year of years)for(const screen of [568,740]){
    const file=path.join(__dirname,'../endurance/releves',screen+'-'+year+'-dpr2.png'),image=await loadImage(file);
    const w=Math.min(screen*2,reference.formats[year].width),h=Math.round(w*image.height/image.width),cv=createCanvas(w,h),c=cv.getContext('2d');c.drawImage(image,0,0,w,h);
    const input=c.getImageData(0,0,w,h).data;compare(input,w,h,year,true);
    scenes.push({year,screen,w,h,source:path.basename(file),sha256:crypto.createHash('sha256').update(input).digest('hex')});
    if(year===2985)continue;
    const run=runner(year,screen,image),sets=[[],[]];
    for(let i=-warm;i<pairs;i++){
      const seq=(i&1)?[1,0]:[0,1];
      for(const variant of seq){const sample=run(variant);if(i>=0)sets[variant].push(sample);}
    }
    const timing=sets.map(set=>Object.fromEntries(names.map((name,k)=>[name,stat(set.map(a=>a[k]))])));
    const deltas=Object.fromEntries(names.map((name,k)=>[name,stat(sets[0].map((a,i)=>a[k]-sets[1][i][k]))]));
    bench.push({year,screen,reference:timing[0],optimized:timing[1],pairedSaving:deltas});
    console.log(year,screen,'conversion',timing.map(v=>v.convert.med.toFixed(3)),'finish',timing.map(v=>v.total.med.toFixed(3)));
  }
  fs.writeFileSync(path.join(__dirname,'recu.json'),JSON.stringify({date:new Date().toISOString(),node:process.version,cpu:os.cpus()[0].model,warm,pairs,unit:'ms',scenes,bench},null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

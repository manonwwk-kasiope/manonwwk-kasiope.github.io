'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8');
for(const route of ['file','https','image absente'])test('aperçu PNG sur geste, fermeture et focus — '+route,async()=>{
  let focus,requested=[],created=[],revoked=[];
  class El{
    constructor(tag){this.tag=tag;this.handlers={};this.nodes=[];}
    addEventListener(k,fn){this.handlers[k]=fn;}setAttribute(k,v){this[k]=v;}
    showModal(){this.open=true;}append(...items){this.nodes.push(...items);}remove(){this.removed=true;}
    close(){this.open=false;this.handlers.close();}focus(){focus=this;}
  }
  function element(tag){
    if(tag!=='canvas')return new El(tag);
    const cv=createCanvas(960,520);cv.setAttribute=()=>{};cv.toBlob=cb=>cb(cv.toBuffer('image/png'));return cv;
  }
  const base=route==='file'?'file:///local/':'https://localhost/';
  const world={location:new URL(base),window:null,OffscreenCanvas:function(w,h){return createCanvas(w,h);},
    document:{currentScript:{src:base+'cartouches/cartouches.js'},createElement:element,body:new El('body')},
    Image:class {set src(v){requested.push(v);}async decode(){if(route==='image absente')throw new Error('absente');
      return loadImage(path.join(__dirname,'../bifurcation/paysage-1995.webp')).then(img=>Object.assign(this,{width:img.width,height:img.height}));}},
    URL:class extends URL{static createObjectURL(blob){created.push(blob);return 'blob:carte';}static revokeObjectURL(url){revoked.push(url);}}};
  // Le décodeur de Skia produit une vraie surface pour le chemin avec image.
  if(route==='https'){
    const img=await loadImage(path.join(__dirname,'../bifurcation/paysage-1995.webp'));
    Object.defineProperty(img,'src',{set(v){requested.push(v);}});
    img.decode=async()=>{};world.Image=function(){return img;};
  }
  world.window=world;vm.createContext(world);
  for(const file of ['../sprites/sprites.js','../mondes/mondes.js','cartouches.js'])vm.runInContext(read(file),world);
  const trigger=new El('button'),record={name:'CLÉO',year:1995,difficulty:7,score:765432};
  await world.SnakeCartouches.open(record,trigger);
  const dialog=world.document.body.nodes[0],close=dialog.nodes[0].nodes[1],link=dialog.nodes.at(-1);
  assert.equal(dialog.open,true);assert.equal(close,focus);assert.equal(link.hidden,false);assert.equal(link.download,'snake-1995-765432.png');
  assert.equal(link.href,'blob:carte');assert.equal(created.length,1);assert.equal(created[0].subarray(1,4).toString(),'PNG');
  assert.equal(requested.length,route==='file'?0:1);assert(requested.every(p=>p.startsWith('https://localhost/bifurcation/')));
  close.onclick();assert.deepEqual(revoked,['blob:carte']);assert(trigger===focus&&dialog.removed);
});

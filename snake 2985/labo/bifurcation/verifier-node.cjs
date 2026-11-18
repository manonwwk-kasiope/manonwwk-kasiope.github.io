'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {destinations,mount}=require('./bifurcation.js');
const years=[1976,1985,1995,2185,2985];
class Element{
  constructor(tag,doc){this.tag=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.events={};this.attrs={};}
  append(...kids){for(const kid of kids){this.children.push(kid);kid.parent=this;}}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(name,f){(this.events[name]||=[]).push(f);}
  emit(type,more={}){if(type==='click'&&this.disabled)return;for(const f of this.events[type]||[])f({preventDefault(){},...more});}
  all(cls){return this.children.flatMap(n=>[...(n.className?.split(' ').includes(cls)?[n]:[]),...n.all(cls)]);}
  focus(){this.ownerDocument.activeElement=this;}
  remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
}
function mountTest(year,status,variant,callbacks){
  const doc={createElement(t){return new Element(t,doc);}},host=doc.createElement('div');
  const handle=mount(host,{year,status,cause:'Mur',boss:'Le Registre',score:317,records:{1985:2500,2185:9021},
    durationMs:2000,drawReview:c=>assert.equal(c.tag,'canvas')},callbacks,{variant,assetBase:''});
  return {host,handle,doc};
}
let runs=0;
for(const [i,year] of years.entries())for(const status of ['dead','cleared','won'])for(const variant of ['cards','wheel']){
  const wanted=i===4?[1976]:status==='dead'?years.slice(i+1):[years[i+1]];
  const choices=destinations(year,status);
  assert.deepEqual(choices.map(c=>c.year),wanted);
  assert.equal(choices[0].cycle,i===4);
  const calls=[];
  const {host,handle,doc}=mountTest(year,status,variant,{
    onJump:p=>calls.push(['jump',p.year,p.cycle]),onRetry:p=>calls.push(['retry',p.year]),onReview:p=>calls.push(['review',p.durationMs,p.canvas.tag])
  });
  const radios=host.all('bf-stop');assert.equal(radios.length,wanted.length);
  assert.equal(radios.filter(r=>r.tabIndex===0).length,1);
  handle.focus();assert.equal(doc.activeElement,radios[0]);
  radios[0].emit('keydown',{key:'End'});assert.equal(doc.activeElement,radios.at(-1));
  assert.equal(radios.at(-1).attrs['aria-checked'],'true');
  radios.at(-1).emit('keydown',{key:'Home'});assert.equal(doc.activeElement,radios[0]);
  host.all('bf-review')[0].emit('click');assert.deepEqual(calls,[['review',2000,'canvas']]);
  if(variant==='wheel'&&wanted.length>1){
    const vis=host.all('bf-panorama')[0];
    vis.emit('pointerdown',{isPrimary:true,button:0,pointerId:9,clientX:120});
    vis.emit('pointerup',{pointerId:9,clientX:65});assert.equal(radios[1].attrs['aria-checked'],'true');
    vis.emit('wheel',{deltaX:0,deltaY:-80,deltaMode:0,timeStamp:100});assert.equal(radios[0].attrs['aria-checked'],'true');
  }
  radios.at(-1).emit('click');assert.equal(calls.length,1);
  const images=[...host.all('bf-strip'),...host.all('bf-hero')];
  assert.ok(images.length);for(const img of images)assert.ok(fs.existsSync(path.join(__dirname,img.src)));
  host.all('bf-launch')[0].emit('click');host.all('bf-launch')[0].emit('click');host.all('bf-retry')[0].emit('click');
  assert.deepEqual(calls.at(-1),['jump',wanted.at(-1),i===4]);assert.equal(calls.length,2);
  handle.destroy();assert.equal(host.children.length,0);
  const retry=mountTest(year,status,variant,{onRetry:p=>calls.push(['retry',p.year])});
  retry.host.all('bf-retry')[0].emit('click');assert.deepEqual(calls.at(-1),['retry',year]);runs++;
}
console.log(JSON.stringify({cases:runs,years,variants:['cards','wheel'],statuses:['dead','cleared','won'],keyboard:true,pointer:true,doubleDispatch:false}));

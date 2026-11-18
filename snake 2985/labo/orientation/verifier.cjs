'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const {mount} = require('./orientation');
const read = name => fs.readFileSync(path.resolve(__dirname, name), 'utf8');

function chamber(start, initialPortrait, year) {
  const doc = {getElementById: () => null}, stack = [];
  class Element extends EventTarget {
    constructor(tag) {super();this.tag=tag;this.children=[];this.dataset={};this.ownerDocument=doc;}
    append(...els) {for(const el of els) if(el instanceof Element){el.parent=this;this.children.push(el);}}
    replaceChildren(...els) {for(const child of this.children)child.parent=null;this.children=[];this.append(...els);}
    setAttribute(k,v) {this[k]=v;}
    toggleAttribute(k,v) {if(v)this[k]='';else delete this[k];}
    get isConnected(){return this===doc.body || !!this.parent?.isConnected;}
    find(fn){if(fn(this))return this;for(const child of this.children){const found=child.find(fn);if(found)return found;}}
    closest(){for(let el=this;el;el=el.parent)if(el.hidden||el.inert||(el.tag==='dialog'&&!el.open))return el;return null;}
    querySelector(id){return this.find(el=>el.id===id.slice(1));}
    focus(){doc.activeElement=this;}
    setSelectionRange(start,end,dir){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:dir});}
    showModal(){assert(!this.open);stack.push(this);this.open=true;(this.find(e=>e.tag==='h2')||this).focus();}
    close(){assert.equal(stack.pop(),this);this.open=false;this.dispatchEvent(new Event('close'));}
  }
  doc.createElement=tag=>new Element(tag);
  doc.body=new Element('body');doc.body.focus();
  const dialog=new Element('dialog'), date=new Element('p'), title=new Element('h2');
  date.id='vertical-date';dialog.append(date,title);doc.body.append(dialog);
  const portrait=new EventTarget();portrait.matches=initialPortrait;
  const win={document:doc,console,btoa,atob,cancelAnimationFrame(){},addEventListener(){},manualCalm:false,
    portrait,systemMotion:{matches:false},audio:{muteLocked:true},screen:start,matchMedia:()=>({matches:false})};
  win.window=win;vm.createContext(win);
  for(const file of ['../../palmares.js','../../forge.js','../../vol-libre.js','../moteur.js','../chrono/chrono.js','../reprise/reprise.js','../campagne/archives.js'])
    vm.runInContext(read(file),win,{filename:file});
  win.forge=win.SnakeForge;win.arcade=win.SnakeArcade;win.archives=win.SnakeArchives;
  win.state=win.arcade.create(()=>.3,year);
  const options=new Element('section'),validations=new Element('section');
  doc.body.append(options,validations);win.ui={options,validations};
  win.show=page=>{win.screen=page;options.replaceChildren();validations.replaceChildren();};
  const source=read('../campagne/chambre.js');
  for(const [begin,end] of [['function button(','function note('],['function pause()','function upgrade()']]){
    const a=source.indexOf(begin),b=source.indexOf(end,a);
    assert(a>=0 && b>a);vm.runInContext(source.slice(a,b),win);
  }
  const primary=()=>validations.find(el=>el.className==='action');
  const install=()=>mount(dialog,{query:portrait,year:()=>win.state.year,screen:()=>win.screen,pause:win.pause,primary});
  function rotate(value){portrait.matches=value;portrait.dispatchEvent(new Event('change'));}
  return {doc,win,stack,date,dialog,install,rotate,primary,options,validations};
}

test('portrait initial, cinq dates du moteur, retour au choix actif',()=>{
  for(const [year,bits] of [[1976,2],[1985,4],[1995,8],[2185,16],[2985,32]]){
    const e=chamber('prep',true,year);
    const option=e.win.button(e.options,'Cellule',()=>{});option.focus();
    const controller=e.install();controller.refresh();
    assert.equal(e.date.textContent,year+' · '+bits+' bits');assert.equal(e.stack.length,1);
    const cancel=new Event('cancel',{cancelable:true});e.dialog.dispatchEvent(cancel);assert(cancel.defaultPrevented);
    e.rotate(false);assert.equal(e.doc.activeElement,option);assert.equal(e.win.screen,'prep');
  }
});
test('interruption en partie, vraie commande Reprendre seulement après retour en paysage',()=>{
  const e=chamber('play',false,2185);e.install();e.rotate(true);
  const resume=e.primary();assert.equal(resume.textContent,'Reprendre');assert.equal(e.win.screen,'pause');
  resume.dispatchEvent(new Event('click'));assert.equal(e.win.screen,'pause');
  e.rotate(false);assert.equal(e.doc.activeElement,resume);assert.equal(e.win.screen,'pause');
  e.rotate(true);e.rotate(false);assert.equal(e.primary(),resume);
  resume.dispatchEvent(new Event('click'));assert.equal(e.win.screen,'play');
});
test('vraie tentative, palmarès + signature en cours sous le dialogue de rotation',()=>{
  const e=chamber('end',false,1995),{state,archives,arcade}=e.win;
  archives.newRun(state);
  for(let i=0;i<2000 && state.status==='playing';i++){arcade.tick(state,1/60);archives.tick(state);}
  assert.equal(state.status,'dead');archives.end(state);
  const signer=e.win.button(e.validations,'Signer',archives.openHall,true);signer.focus();
  archives.openHall();const hall=e.stack[0],field=hall.find(el=>el.type==='text');
  field.value='ALIZE';field.focus();field.setSelectionRange(1,4,'backward');
  e.install();e.rotate(true);assert.deepEqual(e.stack,[hall,e.dialog]);
  e.rotate(false);assert.deepEqual(e.stack,[hall]);assert.equal(e.doc.activeElement,field);
  assert.deepEqual([field.value,field.selectionStart,field.selectionEnd,field.selectionDirection],['ALIZE',1,4,'backward']);
  hall.find(el=>el.tag==='form').dispatchEvent(new Event('submit',{cancelable:true}));
  assert.equal(e.win.SnakePalmares.list(1995)[0].name,'ALIZE');
  hall.close();assert.equal(e.doc.activeElement,signer);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
test('La chambre initialise, affiche et pilote les 45 combinaisons via ses commandes',()=>{
  const html=fs.readFileSync(path.join(__dirname,'chambre.html'),'utf8');
  const ids={};
  for(const [,id] of html.matchAll(/id="([^"]+)"/g)){
    ids[id]={value:'',add(option){if(this.value==='')this.value=String(option.value);}};
  }
  Object.assign(ids.arena,{width:900,height:450,getContext(){return new Proxy({},{get:()=>()=>{}});}});
  const pads=['0,-1','-1,0','0,1','1,0'].map(d=>({dataset:{d}}));
  const sandbox={
    Option:function(text,value){this.text=text;this.value=value;},
    addEventListener(){},document:{getElementById:id=>ids[id],querySelectorAll:()=>pads},
    requestAnimationFrame:fn=>{sandbox.frame=fn;},
  };
  sandbox.window=sandbox;
  for(const [,src] of html.matchAll(/<script src="([^"]+)"/g))
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,src),'utf8'),sandbox);
  let time=0;
  for(let era=0;era<5;era++)for(const core of ['orbit','prism','well'])for(const mod of ['echo','chain','blast']){
    Object.assign(ids.era,{value:era});ids.core.value=core;ids.mod.value=mod;ids.mod.onchange();
    assert(ids.help.textContent.includes(sandbox.SnakeEvolution.eras[era].name));
    assert.equal(ids.pause.textContent,'Jouer');
    ids.phase.onclick();assert(ids.status.textContent.includes('Plan 2'));
    pads[2].onclick();assert.equal(ids.pause.textContent,'Pause');
    for(let i=0;i<45;i++){time+=16;sandbox.frame(time);}
    ids.pause.onclick();assert.equal(ids.pause.textContent,'Jouer');
    ids.reset.onclick();assert(ids.status.textContent.includes('Plan 1'));
  }
});

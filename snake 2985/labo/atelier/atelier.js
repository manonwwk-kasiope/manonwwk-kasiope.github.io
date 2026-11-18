(() => {
  'use strict';
  const receipts=new WeakMap(), mounted=new WeakMap();
  const subtitles={orbit:'Protège les flancs',prism:'Traverse la ligne',well:'Rassemble les drones'};
  function available(s){
    return !!(s?.status==='upgrade' && s.difficulty===5 && s.nextBossKind==='final'
      && s.finishers?.length===1 && s.forge && !receipts.has(s));
  }
  function apply(s,core,{forge,archives,onDone}){
    if(!available(s)||!forge.cores.some(c=>c.id===core))return null;
    const {core:before,mod}=s.forge;
    if(before!==core&&!forge.equip(s,core,mod))return null;
    const receipt=Object.freeze({type:'workshopRecipe',year:s.year,sector:s.sector,from:before,core,mod,changed:before!==core,elapsed:s.elapsed});
    receipts.set(s,receipt);
    if(s.events.length>=96)s.events.shift();
    s.events.push(receipt);
    archives?.tick?.(s);
    onDone?.(receipt);
    return receipt;
  }
  function mount(host,s,opts){
    if(!available(s))return null;
    const running=mounted.get(host);
    if(running?.state===s)return running;
    running?.destroy();
    const root=document.createElement('section');
    root.className='sat-atelier';root.setAttribute('aria-label','Atelier satellite');
    const el=(tag,cls,parent,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;parent.append(e);return e;};
    const display=el('div','sat-apercu',root);
    const canvas=el('canvas','',display);canvas.width=460;canvas.height=192;canvas.setAttribute('aria-label','Démonstration de la recette sélectionnée');
    const info=el('div','sat-reglage',root);
    const name=el('strong','sat-recette',info);
    const detail=el('span','sat-effet',info);
    const group=el('div','sat-choix',info);group.setAttribute('role','group');group.setAttribute('aria-label','Cœur du satellite');
    const buttons=[];
    let selected=s.forge.core,alive=true;
    function preview(core){
      if(!alive)return;
      selected=core;
      const model=opts.forge.cores.find(c=>c.id===core);
      name.textContent=opts.forge.name(core,s.forge.mod);
      detail.textContent=model.description;
      for(const b of buttons)b.node.setAttribute('aria-pressed',String(b.id===core));
      confirm.textContent=core===s.forge.core?'Garder ma recette':'Équiper cette recette';
      opts.banc.select(canvas,s.year,core,s.forge.mod,!!opts.reduced);
    }
    for(const model of opts.forge.cores){
      const b=el('button','sat-mode',group);b.type='button';
      el('strong','',b,model.name);el('span','',b,subtitles[model.id]);
      b.setAttribute('aria-label',model.name+' · '+subtitles[model.id]+(model.id===s.forge.core?' · équipé':''));
      b.addEventListener('click',()=>preview(model.id));buttons.push({node:b,id:model.id});
    }
    const footer=el('div','sat-action',info);
    el('span','sat-mod',footer,opts.forge.mods.find(m=>m.id===s.forge.mod).name+' conservé');
    const confirm=el('button','sat-confirmer',footer);confirm.type='button';
    function destroy(){
      if(!alive)return;
      alive=false;opts.banc.stop();root.remove();mounted.delete(host);
    }
    function commit(){
      if(!alive||!available(s))return;
      apply(s,selected,{...opts,onDone:receipt=>{destroy();opts.onDone?.(receipt);}});
    }
    confirm.addEventListener('click',commit);
    root.addEventListener('keydown',e=>{
      if(e.defaultPrevented||e.repeat)return;
      if(e.key==='Enter'&&buttons.some(b=>b.node===e.target&&b.id===selected)){
        e.preventDefault();commit();return;
      }
      if(e.key==='Escape'){e.preventDefault();preview(s.forge.core);confirm.focus();return;}
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();
      const i=buttons.findIndex(b=>b.id===selected);
      const j=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;
      preview(buttons[j].id);buttons[j].node.focus();
    });
    host.append(root);preview(selected);confirm.focus();
    const panel={state:s,root,frame:now=>{if(alive)opts.banc.frame(now);},destroy};
    mounted.set(host,panel);
    return panel;
  }
  const api={available,mount,apply,receipt:s=>receipts.get(s)||null};
  if(typeof window!=='undefined')window.SnakeAtelier=api;
  if(typeof module!=='undefined')module.exports=api;
})();

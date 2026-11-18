(() => {
  'use strict';
  const years=[1976,1985,1995,2185,2985],key='snake2985.voyage.v1';
  const script=typeof document==='undefined'?null:document.currentScript;
  const assets=script?.src?new URL(script.dataset?.musicRoot?'.':'../bifurcation/',script.src).href:'../bifurcation/';
  const fmt=new Intl.NumberFormat('fr-FR');
  let cache={last:null,seen:[]},active=null;
  function stored(){
    try{
      const raw=JSON.parse(window.localStorage.getItem(key));
      if(raw&&Array.isArray(raw.seen)&&years.includes(raw.last)){
        for(const year of raw.seen)if(years.includes(year)&&!cache.seen.includes(year))cache.seen.push(year);
        if(!cache.last||!unsaved)cache.last=raw.last;
      }
    }catch{}
    return cache;
  }
  let unsaved=false;
  function visit(year){
    if(!years.includes(year))return false;
    const current=stored();current.last=year;
    if(!current.seen.includes(year))current.seen.push(year);
    try{window.localStorage.setItem(key,JSON.stringify(current));unsaved=false;}catch{unsaved=true;}
    return true;
  }
  function progress(records=[]){
    const visited=stored(),open=new Set([1976,...visited.seen]),info=new Map();
    let last=null,latest=-Infinity;
    for(const r of records){
      const y=Number(r?.year);if(!years.includes(y))continue;
      const row=info.get(y)||{score:0,cap:1,won:false};
      row.score=Math.max(row.score,Math.max(0,Number(r.score)||0));row.cap=Math.max(row.cap,Math.min(10,Number(r.difficulty)||1));
      const status=r.status??(r.cleared?'cleared':'dead');
      row.won ||=status==='cleared'||status==='won';info.set(y,row);open.add(y);
      if(['dead','cleared','won'].includes(status))for(const d of window.SnakeBifurcation.destinations(y,status))open.add(d.year);
      const at=Number(r.endedAt)||0;if(at>latest){latest=at;last=y;}
    }
    return {open,info,last:visited.last||last||1976};
  }
  function resume(records){return progress(records).last;}
  function open(options,onPick){
    if(active){active.focus();return active;}
    const {eras,records=[]}=options,eligible=progress(records),current=years.includes(options.year)?options.year:eligible.last;
    const source=options.assetBase??assets;
    let selected=current,closed=false;
    const before=document.activeElement,dlg=document.createElement('dialog');
    dlg.className='voyage-carte';dlg.setAttribute('aria-labelledby','voyage-titre');
    const el=(tag,cls,parent,txt)=>{const v=document.createElement(tag);if(cls)v.className=cls;if(txt)v.textContent=txt;parent.append(v);return v;};
    const top=el('header','vc-top',dlg),title=el('h2','',top,'Carte des époques');title.id='voyage-titre';
    const x=el('button','vc-fermer',top,'Fermer');x.type='button';
    const nav=el('div','vc-ligne',dlg);nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Époques');
    const panel=el('section','vc-panel',dlg);panel.id='voyage-detail';panel.setAttribute('role','tabpanel');
    const hero=el('div','vc-horizon',panel),image=el('img','',hero);image.alt='';
    const place=el('h3','',hero);
    const side=el('div','vc-fiche',panel), arsenal=el('p','vc-arsenal',side),history=el('p','vc-historique',side);
    const guard=el('p','vc-gardien',side);
    const launch=el('button','vc-depart',side);launch.type='button';
    const buttons=[];
    const name=y=>eras.find(e=>e.year===y);
    function paint(y,focus=false){
      if(!years.includes(y)||!name(y))return;
      selected=y;const model=name(y),r=eligible.info.get(y),allowed=eligible.open.has(y);
      for(const tab of buttons){
        const on=tab.year===y;tab.node.tabIndex=on?0:-1;tab.node.setAttribute('aria-selected',String(on));
        if(on&&focus)tab.node.focus();
      }
      panel.setAttribute('aria-labelledby','voyage-date-'+y);place.textContent=model.name;
      image.src=source+'paysage-'+y+'.webp';
      arsenal.textContent=model.weapons.join(' · ');
      history.textContent=r?'Record '+fmt.format(r.score)+' pts · Cap '+r.cap+'/10':'Aucun record · 10 caps';
      const boss=r?.won?model.bosses?.[1]:r?.cap>=5?model.bosses?.[0]:null;
      guard.textContent=boss?'Gardien rencontré · '+boss:!allowed?'Une défaite antérieure ou la victoire précédente ouvre cette époque.':'';
      guard.hidden=!guard.textContent;
      launch.disabled=!allowed;
      launch.textContent=!allowed?'Époque verrouillée':r?'Battre mon record':'Partir en '+y;
      launch.setAttribute('aria-label',allowed?'Préparer '+y+' à zéro point':'Époque verrouillée');
    }
    for(const [i,y] of years.entries()){
      const tab=el('button','vc-date',nav);tab.type='button';tab.id='voyage-date-'+y;
      tab.dataset.locked=String(!eligible.open.has(y));tab.setAttribute('role','tab');tab.setAttribute('aria-controls','voyage-detail');
      tab.setAttribute('aria-label',y+', '+2**(i+1)+' bits, '+(eligible.open.has(y)?'accessible':'verrouillée, aperçu disponible'));
      const thumb=el('img','vc-mini',tab);thumb.alt='';thumb.src=source+'paysage-'+y+'.webp';
      const caption=el('span','vc-num',tab);el('strong','',caption,String(y));el('small','',caption,2**(i+1)+' bits');
      tab.addEventListener('click',()=>paint(y,true));buttons.push({year:y,node:tab});
    }
    function finish(){
      if(closed)return;closed=true;active=null;
      if(dlg.open)dlg.close();dlg.remove();if(before?.isConnected!==false)before?.focus?.();
    }
    launch.addEventListener('click',()=>{
      if(closed||!eligible.open.has(selected))return;
      const y=selected,record=eligible.info.get(y)?.score??null;
      finish();onPick?.({year:y,record});
    });
    x.addEventListener('click',finish);
    dlg.addEventListener('cancel',e=>{e.preventDefault();finish();});
    dlg.addEventListener('close',finish);
    dlg.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.key==='Escape'){e.preventDefault();finish();return;}
      if(!buttons.some(b=>b.node===e.target))return;
      const i=years.indexOf(selected);
      const n=({ArrowLeft:(i+4)%5,ArrowRight:(i+1)%5,Home:0,End:4})[e.key];
      if(n!==undefined){e.preventDefault();paint(years[n],true);}
    });
    document.body.append(dlg);paint(current);dlg.showModal();
    const focus=()=>buttons.find(b=>b.year===selected)?.node.focus();focus();
    active={root:dlg,focus,close:finish};return active;
  }
  const api={open,visit,resume,progress};
  if(typeof window!=='undefined')window.SnakeCarte=api;
  if(typeof module!=='undefined')module.exports=api;
})();

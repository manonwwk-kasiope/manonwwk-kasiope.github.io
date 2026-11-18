(function(root){
  'use strict';
  const years=[1976,1985,1995,2185,2985];
  const defaults={1976:'Le Terminal',1985:'Le Circuit néon',1995:'La Gare de verre',2185:'La Ceinture orbitale',2985:'Le Cœur galactique'};
  const src=typeof document!=='undefined'?document.currentScript?.src:null;
  const base=src?new URL(src.endsWith('/epilogue/epilogue.js')?'../bifurcation/':'.',src).href:'';
  const fmt=new Intl.NumberFormat('fr-FR');
  const tripKey='snake2985.traversee.v1';
  const ranks={'Cœur frappé en surf':5,'Circuit de queue fermé':4,'Train doublé':4,'Slalom réussi':3,'Choc absorbé':2};
  function create(storage,resume=false){
    const v={route:[],gestures:[],current:null,storage};
    if(!storage)return v;
    try{
      if(!resume){storage.removeItem(tripKey);return v;}
      const data=JSON.parse(storage.getItem(tripKey));
      if(!Array.isArray(data?.route))return v;
      v.route=[...new Set(data.route.filter(y=>years.includes(y)))];
      if(Array.isArray(data.gestures))for(const g of data.gestures){
        if(g&&v.route.includes(g.year)&&Object.hasOwn(ranks,g.text)&&!v.gestures.some(old=>old.text===g.text))
          v.gestures.push({year:g.year,text:g.text,rank:ranks[g.text]});
      }
      v.gestures.sort((a,b)=>b.rank-a.rank);v.gestures.length=Math.min(2,v.gestures.length);
    }catch{ /* Une traversée neuve fonctionne aussi sans stockage. */ }
    return v;
  }
  function save(v){
    try{v.storage?.setItem(tripKey,JSON.stringify({route:v.route,gestures:v.gestures}));}catch{}
  }
  function start(v,s){
    if(!years.includes(s.year)||s.status!=='playing')return;
    v.current=s;
    if(!v.route.includes(s.year)){v.route.push(s.year);save(v);}
  }
  function observe(v,s,events){
    if(v.current!==s)return;
    for(const e of events){
      let text,rank;
      if(e.type==='bossHit' && e.weapon==='surf' && e.heart && e.damage>0){text='Cœur frappé en surf';rank=5;}
      else if(e.type==='knotClosed'){text='Circuit de queue fermé';rank=4;}
      else if(e.type==='flightEnd'&&e.success){text='Slalom réussi';rank=3;}
      else if(e.type==='ecoAbsorb'){text='Choc absorbé';rank=2;}
      else if(e.type==='score' && e.kind==='aiguillage' && e.points>0){text='Train doublé';rank=4;}
      else continue;
      const previous=v.gestures.find(g=>g.text===text);
      if(previous){if(previous.year!==s.year){previous.year=s.year;save(v);}continue;}
      if(v.gestures.length===2&&rank<=v.gestures[1].rank)continue;
      v.gestures.push({year:s.year,text,rank});
      v.gestures.sort((a,b)=>b.rank-a.rank);v.gestures.length=Math.min(2,v.gestures.length);save(v);
    }
  }
  function finish(v,s,row,hall){
    if(v.current!==s||s.status!=='won'||s.year!==2985||s.difficulty!==10)return null;
    if(!row||row.status!=='won'||row.year!==s.year||row.score!==s.score)return null;
    const prior=hall.list(2985).filter(r=>r.id!==row.id);
    const best=prior.reduce((n,r)=>n===null||r.score>n?r.score:n,null);
    return {year:s.year,score:s.score,previous:best,route:[...v.route],gestures:v.gestures.map(({year,text})=>({year,text}))};
  }
  function mount(host,summary,actions,options={}){
    const doc=host.ownerDocument,root=doc.createElement('section');
    root.className='vic-epilogue';root.dataset.reduced=String(!!options.reduced);
    const add=(parent,tag,cls,text)=>{
      const el=doc.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;parent.append(el);return el;
    };
    const header=add(root,'header','vic-head');
    const title=add(header,'h2','vic-title','Singularité vaincue');title.id='issue-partie';
    root.setAttribute('aria-labelledby',title.id);
    const report=add(header,'div','vic-score');
    add(report,'strong','',fmt.format(summary.score)+' pts');
    const diff=summary.previous===null?null:summary.score-summary.previous;
    const delta=diff===0?'égalé':(diff>0?'+':'−')+fmt.format(Math.abs(diff))+' pts';
    const caption=diff===null?'Premier score en 2985':'Record précédent '+fmt.format(summary.previous)+' · '+delta;
    add(report,'span','vic-record',caption);
    const route=add(root,'ol','vic-route');route.setAttribute('aria-label','Époques jouées dans cette traversée');
    for(const [i,year] of summary.route.entries()){
      const stop=add(route,'li','vic-stop');stop.dataset.year=String(year);
      stop.style.setProperty('--delay',i*75+'ms');
      const img=add(stop,'img','vic-land');img.src=(options.assetBase??base)+'paysage-'+year+'.webp';img.alt='';
      const label=add(stop,'span','vic-date',String(year));label.setAttribute('aria-label',year+' · '+defaults[year]);
    }
    if(summary.gestures.length){
      const hit=add(root,'ul','vic-gestures');hit.setAttribute('aria-label','Gestes réalisés');
      for(const g of summary.gestures)add(hit,'li','',g.text+' · '+g.year);
    }
    const nav=add(root,'div','vic-actions');let done=false;
    function action(text,fn,commit=false){
      const b=add(nav,'button','',text);b.type='button';b.addEventListener('click',()=>{
        if(done)return;if(commit)done=true;fn();
      });return b;
    }
    const sign=action('Signer le palmarès',()=>{sign.focus();actions.onHall();doc.querySelector('dialog.snake-archives[open] form input')?.focus();});
    if(actions.onRetry)action('Rejouer 2985',actions.onRetry,true);
    const next=action('Nouveau cycle · 1976',actions.onCycle,true);next.className='vic-primary';
    host.append(root);
    return {root,focus:()=>next.focus(),destroy(){done=true;root.remove();}};
  }
  const api={create,start,observe,finish,mount};if(typeof module==='object')module.exports=api;else root.SnakeEpilogue=api;
})(typeof window!=='undefined'?window:globalThis);

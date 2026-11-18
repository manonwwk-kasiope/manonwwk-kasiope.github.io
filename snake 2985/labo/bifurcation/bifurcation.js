(function(){
  'use strict';
  const chronology=[
    {year:1976,bits:2,place:'Le Terminal'},
    {year:1985,bits:4,place:'Le Circuit néon'},
    {year:1995,bits:8,place:'La Gare autoroutière'},
    {year:2185,bits:16,place:'La Ceinture orbitale'},
    {year:2985,bits:32,place:'Le Cœur galactique'}
  ];
  const base=typeof document!=='undefined' && document.currentScript?.src?new URL('.',document.currentScript.src).href:'';
  const fmt=new Intl.NumberFormat('fr-FR');
  function destinations(year,status){
    const i=chronology.findIndex(e=>e.year===+year);
    if(i<0||!['dead','cleared','won'].includes(status))throw new RangeError('Fin de partie ou année inconnue.');
    const cycle=i===chronology.length-1;
    return (cycle?chronology.slice(0,1):chronology.slice(i+1,status==='dead'?undefined:i+2)).map(e=>({...e,cycle}));
  }
  function mount(host,summary,actions={},options={}){
    const choices=destinations(summary.year,summary.status);
    let index=0,committed=false,disposed=false;
    const doc=host.ownerDocument,variant=options.variant==='wheel'?'wheel':'cards';
    const duration=Math.max(0,Math.min(2000,Number(summary.durationMs)||0));
    const score=Math.max(0,Math.floor(Number(summary.score)||0));
    const best=year=>Math.max(0,Math.floor(Number(summary.records?.[year])||0));
    function tag(parent,name,cls,label){
      const el=doc.createElement(name);
      if(cls)el.className=cls;if(label!==undefined)el.textContent=label;parent.append(el);return el;
    }
    function button(parent,cls,label,fn){
      const el=tag(parent,'button',cls,label);el.type='button';el.addEventListener('click',fn);return el;
    }
    const root=tag(host,'section','bf bf-'+variant);
    root.setAttribute('aria-label','Bilan et saut temporel');
    const info=tag(root,'section','bf-report');
    const dead=summary.status==='dead';
    tag(info,'h2','bf-outcome',(dead?'Défaite':'Victoire')+' · '+summary.year);
    const points=tag(info,'p','bf-score',fmt.format(score));tag(points,'span','',' pts');
    tag(info,'p','bf-record','Record '+fmt.format(best(summary.year))+' pts');
    if(summary.boss)tag(info,'p','bf-boss',(dead?'Gardien · ':'Vaincu · ')+String(summary.boss));
    if(summary.cause && dead)tag(info,'p','bf-cause',String(summary.cause));
    const film=duration&&typeof summary.drawReview==='function'?tag(info,'canvas','bf-film'):null;
    if(film){film.width=320;film.height=60;film.setAttribute('aria-label','Trajectoire observée avant l’impact');summary.drawReview(film);}
    const review=button(info,'bf-review',duration?'Revoir '+fmt.format(duration/1000)+' s':'Reprise indisponible',()=>{
      if(!committed&&duration)actions.onReview?.({year:+summary.year,durationMs:duration,canvas:film});
    });
    review.disabled=duration===0;
    const retry=button(info,'bf-retry','Rejouer '+summary.year,()=>commit('retry'));
    const choose=tag(root,'section','bf-choice');
    tag(choose,'h2','bf-title',choices[0].cycle?'Nouveau cycle':dead?'Choisir le prochain saut':'Prochaine époque');
    const visual=variant==='wheel'?tag(choose,'div','bf-panorama'):null;
    const hero=visual?tag(visual,'img','bf-hero'):null;
    if(hero)hero.alt='';
    const caption=visual?tag(visual,'p','bf-caption'):null;
    const list=tag(choose,'div','bf-options');list.setAttribute('role','radiogroup');list.setAttribute('aria-label','Destination');
    const image=year=>(options.assetBase??base)+'paysage-'+year+'.webp';
    const radios=choices.map((item,i)=>{
      const b=button(list,'bf-stop','',()=>select(i));
      b.setAttribute('role','radio');
      const label=item.year+', '+item.bits+' bits, '+item.place+', record '+fmt.format(best(item.year))+' points';
      b.setAttribute('aria-label',label);
      if(variant==='cards'){
        const img=tag(b,'img','bf-strip');img.src=image(item.year);img.alt='';
      }
      const text=tag(b,'span','bf-cardtext');
      tag(text,'strong','bf-date',String(item.year));
      if(variant==='cards'){
        tag(text,'span','bf-bits',item.bits+' bits');
        tag(text,'span','bf-cardrecord','Record '+fmt.format(best(item.year)));
      }
      b.addEventListener('keydown',event=>{
        const n=radios.length;
        const indices={ArrowLeft:(i+n-1)%n,ArrowUp:(i+n-1)%n,ArrowRight:(i+1)%n,ArrowDown:(i+1)%n,Home:0,End:n-1};
        if(Object.hasOwn(indices,event.key)){
          event.preventDefault();select(indices[event.key]);radios[index].focus();
        }
      });
      return b;
    });
    const launch=button(choose,'bf-launch','',()=>commit('jump'));
    function commit(which){
      if(committed||disposed)return;
      const handler=which==='retry'?actions.onRetry:actions.onJump;
      if(typeof handler!=='function')return;
      committed=true;
      for(const b of [launch,retry,review,...radios])b.disabled=true;
      if(which==='retry')handler({year:+summary.year,cycle:false});else handler({...choices[index]});
    }
    function select(i){
      if(disposed||committed)return;
      index=i;
      radios.forEach((b,n)=>{b.tabIndex=n===i?0:-1;b.setAttribute('aria-checked',String(n===i));});
      const current=choices[i];
      if(hero){hero.src=image(current.year);caption.textContent=current.place+' · '+current.bits+' bits · Record '+fmt.format(best(current.year));}
      launch.textContent=current.cycle?'Repartir en '+current.year:'Sauter en '+current.year;
    }
    if(visual && choices.length>1){
      let drag=null,accum=0,lastWheel=-Infinity;
      visual.addEventListener('pointerdown',event=>{
        if(!event.isPrimary || event.button!==0)return;
        drag={id:event.pointerId,x:event.clientX};
        visual.setPointerCapture?.(event.pointerId);
      });
      visual.addEventListener('pointerup',event=>{
        if(drag?.id!==event.pointerId)return;
        const dx=event.clientX-drag.x;drag=null;
        if(Math.abs(dx)>=32)select(Math.max(0,Math.min(choices.length-1,index-Math.sign(dx))));
      });
      for(const phase of ['pointercancel','lostpointercapture'])visual.addEventListener(phase,()=>{drag=null;});
      visual.addEventListener('wheel',event=>{
        const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
        if(!delta)return;
        event.preventDefault();
        if(event.timeStamp-lastWheel>180 || Math.sign(accum)!==Math.sign(delta))accum=0;
        lastWheel=event.timeStamp;accum+=delta*(event.deltaMode===1?16:event.deltaMode===2?80:1);
        if(Math.abs(accum)>=42){select(Math.max(0,Math.min(choices.length-1,index+Math.sign(accum))));accum=0;}
      },{passive:false});
    }
    root.dataset.count=String(choices.length);
    select(0);
    return {root,focus:()=>radios[index].focus(),destroy(){disposed=true;root.remove();}};
  }
  const api=Object.freeze({destinations,mount});
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeBifurcation=api;
})();

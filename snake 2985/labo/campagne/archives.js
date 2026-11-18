(() => {
  'use strict';
  const chrono=window.SnakeChrono, reprise=window.SnakeReprise, hall=window.SnakePalmares;
  const attempts=new WeakMap(), years=[1976,1985,1995,2185,2985];
  let storage=null;
  try { storage=window.localStorage; } catch { /* La session reste jouable en mémoire. */ }
  const archive=chrono.archive(storage);
  const routeKey='snake2985.chrono.saut.v1';
  let session=null, activeAttempt=null;
  try {session=window.sessionStorage;} catch { /* L’onglet conserve son choix en mémoire. */ }
  function abandon(){
    pending=null;
    if(activeAttempt){activeAttempt.source=null;activeAttempt.rival=null;}
    try{session?.removeItem(routeKey);}catch{}
  }
  function storedRoute(){
    try{
      const raw=session?.getItem(routeKey);
      if(!raw||raw.length>9000)return null;
      const data=JSON.parse(raw);
      if(data?.v!==1||!years.includes(data.year))return null;
      const clip=chrono.open(data.record);
      return clip&&chrono.futureYears(clip.year).includes(data.year)?{year:data.year,record:data.record,clip}:null;
    }catch{return null;}
  }
  function saveRoute(route){
    try{session?.setItem(routeKey,JSON.stringify({v:1,year:route.year,record:route.record}));}catch{}
  }
  function resumeYear(){return storedRoute()?.year??null;}
  let latest=null, pending=null, dialog=null, focusBefore=null, animation=null, sequence=0;
  const fmt=n=>n.toLocaleString('fr-FR');
  const clock=t=>(t/1000).toFixed(2).replace('.',',')+' s';
  const elem=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  function button(parent,text,callback) {
    const b=elem('button',text);b.type='button';b.addEventListener('click',callback);parent.append(b);return b;
  }
  function newRun(s,{resume=false}={}) {
    if(attempts.has(s)) return attempts.get(s).id;
    const route=pending||(resume?storedRoute():null);
    pending=null;
    const source=route&&(route.year===null||route.year===s.year)?route.clip:null;
    const rival=source&&chrono.challenge(source,s);
    if(rival && route.year===null)saveRoute({...route,year:s.year});
    if(!rival)abandon();
    const id=window.crypto?.randomUUID?.() || 'arc-'+Date.now().toString(36)+'-'+(++sequence)+'-'+Math.random().toString(36).slice(2);
    const a={id,source:rival?source:null,rival,rec:chrono.recorder(),review:reprise.create(),row:null,clip:null,record:null};
    attempts.set(s,a);activeAttempt=a;tick(s);return id;
  }
  function tick(s) {
    const a=attempts.get(s);
    if(!a || a.row)return;
    a.review.capture(s,s.elapsed*1000);chrono.capture(a.rec,s);chrono.update(a.rival,s);
  }
  function end(s) {
    const a=attempts.get(s);
    if(!a || !['dead','won','cleared'].includes(s.status))return null;
    if(a.row)return a.row;
    tick(s);
    a.row=hall.record({id:a.id,year:s.year,name:hall.getName(),difficulty:s.difficulty,score:s.score,status:s.status});
    if(s.status==='dead'){
      const encoded=chrono.finish(a.rec,s);
      if(encoded){a.record=encoded;a.clip=chrono.open(encoded);archive.save(encoded);}
    }
    if(a===activeAttempt&&a.source)abandon();
    latest=a;return a.row;
  }
  function jump(s,year=null) {
    const a=s?attempts.get(s):latest;
    abandon();
    if(a?.row?.status!=='dead'||!a.clip||!a.record)return false;
    if(year!==null&&!chrono.futureYears(a.clip.year).includes(year))return false;
    pending={clip:a.clip,record:a.record,year};
    if(year!==null)saveRoute(pending);
    return true;
  }
  function offer(s) {
    const c=attempts.get(s)?.rival;
    if(c?.bet!=='disponible' || c.model!=='poursuite' || s.novaCharge<.25 || s.elapsed*1000>Math.min(2000,c.sprint/2))return '';
    return 'Miser 25 % de nova · dépasser '+fmt(c.segmentGain)+' points en '+clock(c.sprint);
  }
  function wager(s) {return chrono.wager(attempts.get(s)?.rival,s);}
  function label(s) {
    const a=attempts.get(s),c=a?.rival;
    if(!c)return '';
    const record=c.status==='record battu'?'Record de '+a.source.year+' battu':'Score de '+a.source.year+' à battre · '+fmt(c.target);
    const bet={engagé:'Pari · '+fmt(s.score)+' / '+fmt(c.segmentGain+1),gagné:'Pari gagné · nova rechargée',perdu:'Mise perdue'};
    return record+(bet[c.bet]?' · '+bet[c.bet]:'');
  }
  function draw(canvas,s,reduced=false) {
    const source=attempts.get(s)?.source,renderer=window.SnakeSpectacle;
    if(!source || !renderer || s.elapsed*1000>source.duration)return;
    const t=s.elapsed*1000,g=chrono.ghost(source,t),ctx=canvas.getContext('2d');
    if(!g || !ctx)return;
    const cam=renderer.camera(s,reduced?0:s.elapsed,reduced);
    ctx.save();
    ctx.setTransform(canvas.width/renderer.width,0,0,canvas.height/renderer.height,0,0);
    if(g.plane!==s.plane)ctx.globalAlpha=.56;
    chrono.draw(ctx,source,t,p=>renderer.project(cam,p.x,p.y,p.plane),g.plane);
    ctx.restore();
  }
  function stop() {if(animation!==null)cancelAnimationFrame(animation);animation=null;}
  let refreshOpenHall=null,detachReplay=null;
  window.addEventListener('storage',event=>{
    if(dialog?.open && (!event.key || event.key.startsWith('snake2985.hall.tentative.')))refreshOpenHall?.();
  });
  function panel(title) {
    refreshOpenHall=null;detachReplay?.();detachReplay=null;
    stop();
    if(!dialog){
      dialog=elem('dialog');dialog.className='snake-archives';
      dialog.setAttribute('aria-labelledby','archives-titre');
      dialog.addEventListener('close',()=>{stop();detachReplay?.();detachReplay=null;refreshOpenHall=null;focusBefore?.focus?.();});
      dialog.addEventListener('keydown',e=>e.stopPropagation());
      document.body.append(dialog);
    }
    if(!dialog.open)focusBefore=document.activeElement;
    const head=elem('header'),heading=elem('h2',title);heading.id='archives-titre';
    head.append(heading);const close=button(head,'Fermer',()=>dialog.close());
    const body=elem('section');dialog.replaceChildren(head,body);
    if(!dialog.open)dialog.showModal();close.focus();return body;
  }
  function openHall() {
    const body=panel('Palmarès'),bar=elem('div');bar.className='archives-outils';
    const label=elem('label','Époque'),select=elem('select');
    const pageSize=12;
    let page=0,records=[],filtered=[],personal=null,yearOptions='';
    label.append(select);bar.append(label);
    if(latest?.row){
      const form=elem('form'),signature=elem('label','Signature'),input=elem('input');
      input.type='text';input.value=latest.row.name;input.autocomplete='off';input.maxLength=40;
      signature.append(input);form.append(signature);
      const sign=elem('button','Signer');sign.type='submit';form.append(sign);
      const status=elem('output');form.append(status);
      form.addEventListener('submit',e=>{e.preventDefault();
        const signed=hall.setName(latest.id,input.value);latest.row.name=signed;input.value=signed;
        status.textContent='Signé '+signed;refresh();goToAttempt();
      });
      bar.append(form);
    }
    const table=elem('table'),thead=elem('thead'),row=elem('tr'),rows=elem('tbody');
    for(const txt of ['Rang','Pilote','Époque','Cran','Score']){
      const th=elem('th',txt);th.scope='col';row.append(th);
    }
    thead.append(row);table.append(thead,rows);
    const empty=elem('p','Aucune tentative dans cette époque.');
    const summary=elem('p'),nav=elem('nav'),pageInfo=elem('output');
    summary.className='archives-resultat';summary.setAttribute('aria-live','polite');
    nav.className='archives-pages';nav.setAttribute('aria-label','Pages du palmarès');
    const prev=button(nav,'Précédente',()=>{page--;paint();});
    pageInfo.setAttribute('aria-live','polite');nav.append(pageInfo);
    const next=button(nav,'Suivante',()=>{page++;paint();});
    const mine=button(nav,'Voir mon rang',goToAttempt);
    const card=window.SnakeCartouches&&button(nav,'Carte souvenir',()=>window.SnakeCartouches.open(personal,card));
    function goToAttempt(){
      if(!personal)return;
      if(select.value && Number(select.value)!==personal.year)select.value=String(personal.year);
      filter();
      page=Math.floor(filtered.findIndex(r=>r.id===personal.id)/pageSize);paint();
    }
    function filter(){filtered=select.value?records.filter(r=>r.year===Number(select.value)):records;}
    function paint(){
      const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
      page=Math.max(0,Math.min(page,pages-1));
      prev.disabled=page===0;next.disabled=page===pages-1;
      prev.hidden=next.hidden=pages===1;
      pageInfo.textContent=filtered.length?'Page '+fmt(page+1)+' sur '+fmt(pages):'';
      mine.hidden=!personal;
      if(card)card.hidden=!window.SnakeCartouches.compatible(personal);
      empty.hidden=filtered.length>0;table.hidden=!filtered.length;
      const visible=filtered.slice(page*pageSize,(page+1)*pageSize);
      rows.replaceChildren(...visible.map((r,i)=>{
        const tr=elem('tr');
        if(r.id===personal?.id){tr.className='archives-moi';tr.setAttribute('aria-current','true');}
        for(const val of [page*pageSize+i+1,r.name,r.year,r.difficulty+'/10'+(r.cleared?' ✓':''),fmt(r.score)])tr.append(elem('td',String(val)));
        return tr;
      }));
    }
    function refresh(){
      records=hall.list();
      const values=[...new Set([...years,...records.map(r=>r.year)])].sort((a,b)=>a-b);
      if(values.join(',')!==yearOptions){
        const keep=select.value;yearOptions=values.join(',');
        select.replaceChildren(...['',...values].map(year=>{
          const op=elem('option',String(year||'Toutes les époques'));op.value=String(year);return op;
        }));
        select.value=values.includes(Number(keep))?keep:'';
      }
      personal=latest?records.find(r=>r.id===latest.id):records.reduce((last,r)=>!last||r.endedAt>last.endedAt?r:last,null);
      summary.hidden=!personal;
      if(personal){
        const epoch=records.filter(r=>r.year===personal.year),rival=epoch.find(r=>r.id!==personal.id);
        const gap=personal.score-(rival?.score??0);
        const comparison=!rival?'Premier record de cette époque.':gap===0?'Record d’époque égalé.':
          gap>0?'Record d’époque battu de '+fmt(gap)+' pts.':'À '+fmt(-gap)+' pts du record d’époque.';
        summary.textContent='Dernière tentative · '+personal.year+' · '+fmt(personal.score)+' pts. Rang époque '+
          fmt(epoch.indexOf(personal)+1)+' / '+fmt(epoch.length)+' · Rang général '+
          fmt(records.indexOf(personal)+1)+' / '+fmt(records.length)+'. '+comparison;
      }
      filter();paint();
    }
    select.addEventListener('change',()=>{page=0;filter();paint();});
    body.append(bar,summary,nav,table,empty);
    refreshOpenHall=refresh;refresh();

  }
  const masks=reprise.flags;
  function board(canvas,frame,plane,impact) {
    const ctx=canvas.getContext('2d'),n=12;
    ctx.fillStyle=plane?'#15132b':'#0b1c23';ctx.fillRect(0,0,432,216);
    ctx.strokeStyle='#334553';ctx.lineWidth=.6;ctx.beginPath();
    for(let x=0;x<=36;x++){ ctx.moveTo(x*n,0);ctx.lineTo(x*n,216); }
    for(let y=0;y<=18;y++){ctx.moveTo(0,y*n);ctx.lineTo(432,y*n);}
    ctx.stroke();
    const square=(x,y,offset,color)=>{ctx.fillStyle=color;ctx.fillRect(x*n+offset,y*n+offset,n-2*offset,n-2*offset);};
    for(let i=0;i<648;i++){
      const bits=frame.cells[i+plane*648];if(!bits)continue;
      const x=i%36,y=Math.floor(i/36);
      if(bits&masks.warning)square(x,y,0,'#8b6737');
      if(bits&masks.active)square(x,y,0,'#bf3850');
      if(bits&masks.hull)square(x,y,1,'#dd827d');
      if(bits&masks.gate){ctx.strokeStyle='#b2a3ff';ctx.strokeRect(x*n+2,y*n+2,8,8);}
      if(bits&masks.cell)square(x,y,4,'#ffdc79');
      if(bits&masks.body)square(x,y,2,'#71c5aa');
      if(bits&masks.drone)square(x,y,2,'#ff6974');
      if(bits&masks.next){ctx.fillStyle='#f9a683';ctx.fillRect(x*n+5,y*n+2,2,8);ctx.fillRect(x*n+2,y*n+5,8,2);}
    }
    if(frame.plane===plane){ctx.fillStyle='#fbffed';ctx.beginPath();ctx.arc((frame.x+.5)*n,(frame.y+.5)*n,4.7,0,2*Math.PI);ctx.fill();}
    if(impact?.plane===plane){
      const x=Math.max(0,Math.min(35,impact.x)),y=Math.max(0,Math.min(17,impact.y));
      ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.strokeRect(x*n+1,y*n+1,10,10);
    }
  }
  function openReplay(getReduced) {
    if(!latest?.review.death)return false;
    const review=latest.review,{start,end}=review.bounds(),death=review.death;
    const body=panel('Dernière trajectoire'),tip=elem('p',death.cause+' · '+death.tip);
    const views=elem('div');views.className='archives-plans';
    const canvases=[0,1].map(i=>{
      const figure=elem('figure'),caption=elem('figcaption',i?'Plan haut':'Plan bas'),canvas=elem('canvas');
      canvas.width=432;canvas.height=216;canvas.setAttribute('aria-hidden','true');
      figure.append(caption,canvas);views.append(figure);return canvas;
    });
    const slider=elem('input');slider.type='range';slider.min=start;slider.max=end;slider.step='1';slider.value=end;
    slider.setAttribute('aria-label','Instant de la dernière trajectoire');
    const status=elem('output'),controls=elem('div');controls.className='archives-commandes';
    status.setAttribute('aria-live','off');
    let t=end,previous=null;
    const paint=ms=>{
      t=Math.max(start,Math.min(end,ms));slider.value=t;
      const f=review.frameAt(t);
      canvases.forEach((c,i)=>board(c,f,i,t>=end?death:null));
      const when=t>=end?'Impact':clock(end-t)+' avant impact';
      status.textContent=when+' · plan '+(f.plane+1)+' · '+(f.flight?'vol':'grille')+' · case '+(Math.round(f.x)+1)+', '+(Math.round(f.y)+1);
      slider.setAttribute('aria-valuetext',status.textContent);
    };
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced=()=>preference.matches||(typeof getReduced==='function'&&getReduced());
    let play;
    const pause=()=>{stop();previous=null;play.textContent=reduced()?'Image suivante':'Lire';};
    const advance=now=>{
      if(previous!==null)paint(t+Math.max(0,now-previous));previous=now;
      if(t>=end){pause();return;}animation=requestAnimationFrame(advance);
    };
    button(controls,'− 0,25 s',()=>{pause();paint(t-250);});
    play=button(controls,reduced()?'Image suivante':'Lire',()=>{
      if(reduced()){
        if(t>=end)paint(start);
        else {
          const current=review.frameAt(t).t;
          let probe=t;
          do {probe=Math.min(end,probe+5);} while(probe<end && review.frameAt(probe).t===current);
          paint(probe);
        }
        return;
      }
      if(animation!==null){pause();return;}
      if(t>=end)paint(start);
      previous=null;play.textContent='Suspendre';animation=requestAnimationFrame(advance);
    });
    button(controls,'+ 0,25 s',()=>{pause();paint(t+250);});
    slider.addEventListener('input',()=>{pause();paint(Number(slider.value));});
    const visible=()=>{if(document.hidden)pause();};
    const cover=e=>{if(e.target!==dialog&&e.target.tagName==='DIALOG'&&e.target.open)pause();};
    document.addEventListener?.('visibilitychange',visible);document.addEventListener?.('toggle',cover,true);
    preference.addEventListener?.('change',pause);
    detachReplay=()=>{
      document.removeEventListener?.('visibilitychange',visible);document.removeEventListener?.('toggle',cover,true);
      preference.removeEventListener?.('change',pause);
    };
    body.append(tip,views,slider,controls,status);paint(end);return true;
  }
  function bande(s){
    const review=attempts.get(s)?.review, range=review?.bounds();
    if(!review?.death||!range)return {};
    return {durationMs:Math.round(range.end-range.start),drawReview(canvas){
      const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
      c.fillStyle='#0b1422';c.fillRect(0,0,w,h);
      c.strokeStyle='#445168';c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.stroke();
      const xs=p=>5+p.plane*w/2+p.x/35*(w/2-10),ys=p=>4+p.y/17*(h-8);
      let before=null;
      for(let t=range.start;t<=range.end+49;t+=50){
        const p=review.frameAt(Math.min(range.end,t));
        if(before && p.plane===before.plane){
          c.strokeStyle=p.plane?'#b6b6ff':'#94f5ca';c.lineWidth=2;c.beginPath();c.moveTo(xs(before),ys(before));c.lineTo(xs(p),ys(p));c.stroke();
        }
        before=p;
      }
      if(before){c.fillStyle='#ffc89d';c.fillRect(xs(before)-2,ys(before)-2,4,4);}
    }};
  }
  window.SnakeArchives=Object.freeze({newRun,tick,end,jump,resumeYear,abandon,offer,wager,label,draw,openHall,openReplay,bande,death:s=>attempts.get(s)?.review?.death});
})();

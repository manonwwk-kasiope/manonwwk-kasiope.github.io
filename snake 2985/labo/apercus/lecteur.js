// Photogrammes d'une vraie partie. La carte reste consultable pendant le décodage.
(() => {
  'use strict';
  const width=336,height=154,count=40,columns=8,period=100;
  const names={1976:'Cellules du Terminal',1985:'Ricochets du Magnétron',1995:'Express du viaduc',2185:'Vol dans la ceinture',2985:'Écho de la Singularité'};
  function mount(canvas,button,options={}){
    const win=canvas.ownerDocument.defaultView,doc=canvas.ownerDocument;
    const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced=()=>motion.matches||Boolean(options.reduced?.());
    let year=null,source='',sheet=null,started=0,timer=null,frame=-1,mode='ready',sequence=0;
    const captions={ready:'Voir en action',loading:'Chargement…',play:'Arrêter',end:'Revoir',still:'Image suivante',error:'Réessayer'};
    function label(status){
      mode=status;button.textContent=captions[status];
      button.setAttribute('aria-label',captions[status]+' · '+year+' · '+names[year]);
      button.setAttribute('aria-busy',String(status==='loading'));
      button.setAttribute('aria-pressed',String(status==='play'));
    }
    function stopTimer(){
      if(timer!==null){win.clearTimeout(timer);timer=null;}
    }
    function paint(index){
      if(index===frame)return;
      frame=index;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(sheet,(index%columns)*width,Math.floor(index/columns)*height,width,height,0,0,width,height);
      canvas.hidden=false;
    }
    function step(){
      stopTimer();
      if(mode!=='play')return;
      if(doc.hidden){label('end');return;}
      const elapsed=Math.max(0,win.performance.now()-started);
      paint(Math.min(count-1,Math.floor(elapsed/period)));
      if(reduced()){label('still');return;}
      if(elapsed>=count*period){label('end');return;}
      timer=win.setTimeout(step,period-elapsed%period);
    }
    function start(){
      if(reduced()){paint(frame<0?0:(Math.floor(frame/10)+1)*10%count);label('still');return;}
      if(mode==='play'){stopTimer();label('end');return;}
      started=win.performance.now();label('play');step();
    }
    function press(){
      if(!names[year]||mode==='loading')return;
      if(sheet){start();return;}
      label('loading');const stamp=sequence,img=new win.Image();
      img.decoding='async';
      img.onload=()=>{
        if(stamp!==sequence)return;
        if(img.naturalWidth!==width*columns||img.naturalHeight!==height*count/columns){label('error');return;}
        sheet=img;
        if(doc.hidden){label('ready');return;}
        start();
      };
      img.onerror=()=>{if(stamp===sequence)label('error');};
      img.src=source;
    }
    function select(value,url){
      sequence++;stopTimer();sheet=null;frame=-1;year=value;source=url;
      canvas.hidden=true;label('ready');
    }
    function interrupt(){
      if(mode==='play'){stopTimer();label(reduced()?'still':'end');}
      else if(mode==='loading'){sequence++;label('ready');}
    }
    function visibility(){if(doc.hidden)interrupt();}
    function stacked(e){if(e.target.tagName==='DIALOG'&&e.target.open&&!e.target.contains(canvas))interrupt();}
    canvas.width=width;canvas.height=height;
    button.addEventListener('click',press);doc.addEventListener('visibilitychange',visibility);
    doc.addEventListener('toggle',stacked,true);motion.addEventListener('change',interrupt);
    return {select,interrupt,destroy(){
      sequence++;stopTimer();sheet=null;
      button.removeEventListener('click',press);doc.removeEventListener('visibilitychange',visibility);
      doc.removeEventListener('toggle',stacked,true);motion.removeEventListener('change',interrupt);
    }};
  }
  const api={mount};
  if(typeof window!=='undefined')window.SnakeApercus=api;
  if(typeof module!=='undefined')module.exports=api;
})();

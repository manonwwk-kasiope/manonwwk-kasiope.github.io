'use strict';
(async()=>{
 const css=Number(new URLSearchParams(location.search).get('w')),height=css===874?292:275;
 const c=document.querySelector('canvas'),o=document.querySelector('output'),fast=window.SnakeQuantification;
 const view=()=>({w:innerWidth,h:innerHeight,visualW:visualViewport.width,visualH:visualViewport.height,screenW:screen.width,screenH:screen.height,dpr:devicePixelRatio});
 const post=async(kind,data)=>{const r=await fetch('/result'+location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,css,...data})});if(!r.ok)throw Error('HTTP '+r.status);};
 const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 async function hash(s,t,optimized){
   window.SnakeQuantification=optimized?fast:undefined;SnakeSpectacle.draw(c,s,t,false);
   const rgb=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',rgb)),n=>n.toString(16).padStart(2,'0')).join('');
 }
 function setup(year){
   let seed=year;const s=SnakeArcade.create(()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),year);
   SnakeForge.equip(s,'prism','chain');s.difficulty=s.sector=9;s.sectorCells=1;s.cells.unshift({x:10,y:9,plane:0});
   SnakeGardiens.tick(s,s.stepTime+1e-6);if(!s.boss)throw Error('Boss absent '+year);
   SnakeArcade.fire(s);SnakeMondeVivant.observe(s);
   for(const e of s.events){SnakeMondeVivant.observe(s,e);SnakeImpact.event(s,e);}
   return s;
 }
 function stats(samples){
   const a=samples.slice().sort((a,b)=>a-b);const at=p=>a[Math.max(0,Math.ceil(p*a.length)-1)];
   return {n:a.length,p50:at(.5),p95:at(.95),p99:at(.99),over25:a.filter(v=>v>25).length,over50:a.filter(v=>v>50).length};
 }
 try{
   if(!silenceReady||!fast||![568,874].includes(css)||!matchMedia('(orientation: landscape)').matches||!/iPhone.*Version\/27\.2.*Mobile\/.*Safari\//.test(navigator.userAgent))throw Error('Contexte Safari/silence/géométrie invalide '+navigator.userAgent);
   const layoutEnd=performance.now()+10000;while((visualViewport.width<css||visualViewport.height<height)&&performance.now()<layoutEnd)await raf();
   if(visualViewport.width<css||visualViewport.height<height)throw Error('Surface non visible '+JSON.stringify(view()));
   c.style.width=css+'px';c.style.height=height+'px';await raf();
   if(c.clientWidth!==css||c.clientHeight!==height)throw Error('Taille CSS inattendue');
   await post('start',{ua:navigator.userAgent,view:view(),cssHeight:height,isolated:crossOriginIsolated});
   for(const [index,year] of [1976,1985,1995,2185].entries()){
     if(year!==1976&&!await SnakeMatieres.load(year))throw Error('Peinture absente '+year);
     const s=setup(year),hashes=[];
     for(const t of [.25,1.25,3.25]){
       // Préchauffer la scène (sprites et décor) avant de lire ses pixels.
       SnakeSpectacle.draw(c,s,t,false);
       const a=await hash(s,t,false),b=await hash(s,t,true);if(a!==b)throw Error('Identité '+year+' à '+t+' '+a+' '+b);hashes.push({t,a,b});
     }
     const all=[{draw:[],conversion:[],raf:[]},{draw:[],conversion:[],raf:[]}];
     for(let block=0;block<8;block++){
       const mode=(block+Math.floor(block/2)+index)%2;window.SnakeQuantification=mode?fast:undefined;
       for(let f=0;f<4;f++){await raf();SnakeSpectacle.draw(c,s,.25+f/60,false);}
       const m=all[mode];let last=null;const start=performance.now();
       for(let f=0;performance.now()-start<3900;f++){
         const ts=await raf();if(last!==null)m.raf.push(ts-last);last=ts;
         const begin=performance.now();SnakeSpectacle.draw(c,s,.25+(f%80)/60,false);m.draw.push(performance.now()-begin);m.conversion.push(window.quantMs);
       }
       await post('bloc',{year,block,mode});
     }
     await post('year',{year,hashes,size:[c.width,c.height],view:view(),timings:all.map(entry=>Object.fromEntries(Object.entries(entry).map(([k,a])=>[k,stats(a)])))});
   }
   if(silence.media||silence.context)throw Error('Tentative audio');
   await post('done',{audio:silence,view:view()});
   if(css===874&&new URLSearchParams(location.search).has('suite')){location.replace(location.pathname+'?w=568');return;}
   o.textContent='Mesure terminée';
 }catch(e){await post('error',{message:String(e),stack:e.stack});o.textContent='Erreur de mesure';}
})();

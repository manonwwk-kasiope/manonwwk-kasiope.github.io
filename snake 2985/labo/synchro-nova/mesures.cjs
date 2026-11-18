'use strict';
const fs=require('node:fs'),path=require('node:path');
require('./accents.js');const sig=require('./synchro.js');
const clock=require('../audio/horloge.js'),rows=require('../audio/pouls.json');
function generator(seed){
  let state=seed;return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)+.5)/4294967296;
}
function measure(){
  return global.SnakeNovaAccents.map(row=>{
    const grid=rows.find(g=>g.year===row.year),intended=[],random=[],rand=generator(19762985+row.year);
    const period=row.hi-row.lo,loops=9;
    for(let i=0;i<row.accents.length*loops;i++){
      // Écart moteur hypothétique : réaction moyenne 20 ms et écart-type 45 ms.
      const noise=20+45*Math.sqrt(-2*Math.log(rand()))*Math.cos(2*Math.PI*rand());
      intended.push(sig.nearest(row.year,{playing:true,mediaTime:row.accents[i%row.accents.length]+noise*.001*row.rate}).ms);
    }
    for(let i=0;i<18000;i++){
      const mediaTime=row.lo+period*rand();
      random.push(sig.nearest(row.year,{playing:true,mediaTime}).ms);
    }
    const stats=(arr,w)=>+(100*arr.filter(x=>Math.abs(x)<=w).length/arr.length).toFixed(2);
    // Horloges réelles, même origine, deux boucles traversées en mode silencieux ou asservi au média.
    const a=clock.create(rows,row.year),b=clock.create(rows,row.year);
    a.sample({now:0,mediaTime:grid.loopStart});b.sample({now:0,mediaTime:grid.loopStart});
    let disagree=0,maxMs=0,checks=0;
    for(let i=0;i<120*60;i++){
      const now=i/60,one=a.sample({now,mediaTime:grid.loopStart+now*grid.rate,playing:true,audible:true});
      const two=b.sample({now,playing:true,audible:false});
      checks++;
      const d0=sig.nearest(row.year,one).ms,d1=sig.nearest(row.year,two).ms;
      maxMs=Math.max(maxMs,Math.abs(d0-d1));
      if((Math.abs(d0)<=80+1e-6)!==(Math.abs(d1)<=80+1e-6))disagree++;
    }
    return {year:row.year,accents:row.accents.length,tirsVisés:intended.length,tirsAléatoires:random.length,
      fenêtre45:{visésPct:stats(intended,45),aléatoiresPct:stats(random,45)},
      fenêtre80:{visésPct:stats(intended,80),aléatoiresPct:stats(random,80)},
      vérifications:checks,décisionsDifférentes:disagree,erreurMuetMaxMs:+maxMs.toFixed(6)};
  });
}
if(require.main===module){const out=measure();fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify(out,null,2)+'\n');console.table(out.map(r=>({année:r.year,visés45:r.fenêtre45.visésPct,visés80:r.fenêtre80.visésPct,hasard45:r.fenêtre45.aléatoiresPct,hasard80:r.fenêtre80.aléatoiresPct,diff:r.décisionsDifférentes})));}
module.exports={measure};

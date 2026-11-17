'use strict';
const targets={'découverte':[.55,.49,.43,.37,.31],'habitué':[.86,.81,.76,.71,.66],expert:[.98,.98,.98,.98,.98]};
const years=[1976,1985,1995,2185,2985];
function rate(rs){return rs.filter(r=>r.outcome==='victoire').length/rs.length;}
function rank(rows){
  return [...new Set(rows.map(r=>r.curve))].map(curve=>{
    const part=rows.filter(r=>r.curve===curve);
    let penalty=0;
    const rates={};
    for(const p of Object.keys(targets)){
      rates[p]=years.map(y=>rate(part.filter(r=>r.year===y&&r.pilot===p)));
      for(let i=0;i<5;i++)penalty+=Math.abs(rates[p][i]-targets[p][i]);
    }
    const minExpert=Math.min(...rates.expert);
    const opening=part.filter(r=>r.outcome==='mort'&&r.t<=3.2&&r.cause==='Drone').length;
    return {curve,mae:penalty/15,eligible:minExpert>=.85&&!opening,rates};
  }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||a.mae-b.mae);
}
if(require.main===module)console.log(JSON.stringify(rank(require('./calibration.json')),null,2));
module.exports={rank,targets,years};

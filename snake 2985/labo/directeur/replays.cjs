const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initial, step, decor, scenes } = require('./sequences.js');
function pilote(s, choix) {
  const {f, voie} = decor(s);
  if (choix === 'immobile') return {};
  let x=.32, y=voie, action=false;
  if (s.scene==='gare') {
    if (choix==='contourner') { y=voie>.5?.10:.90; }
    else { action = f===40 || f===136; }
  } else if (s.scene==='mue') {
    const croiser=choix==='synchroniser';
    x=f>=60 && f<166?.72:.32;
    action=f===43 || f===163;
    if (!croiser && f<60) x=.55;
  } else {
    if (choix==='surfer') {
      x=f>=90 && f<190?.88:.31;
      y=.8-.65*s.x;
      action=f===78 || f===221;
    } else { y=.1; action=(f===22 && s.z===0); }
  }
  return {dx:Math.max(-1,Math.min(1,(x-s.x)*130)),dy:Math.max(-1,Math.min(1,(y-s.y)*130)),action};
}
const variantes=[['sillage','contourner'],['synchroniser','appât isolé'],['surfer','survoler']];
const records=[];
for (const [i,scene] of scenes.entries()) for (const choix of [...variantes[i],'immobile']) {
  let s=initial(scene), trace=[], phases=[], mouvements=0, actions=0;
  for (let frame=0;frame<720;frame++) {
    const a=pilote(s,choix), cmd=[Math.round((a.dx||0)*100)/100,Math.round((a.dy||0)*100)/100,+!!a.action];
    const last=trace.at(-1);
    if(last && cmd.every((v,j)=>v===last[j+1])) last[0]++;
    else trace.push([1,...cmd]);
    if(cmd[0] || cmd[1]) mouvements++;
    if(cmd[2]) actions++;
    s=step(s,{dx:cmd[0],dy:cmd[1],action:cmd[2]});
    for(const e of s.events) phases.push([s.t,e]);
  }
  let v=initial(scene);
  for(const [n,dx,dy,action] of trace) for(let j=0;j<n;j++) v=step(v,{dx,dy,action});
  assert.deepEqual(v,s);
  let record={scene,choix,ticks:s.t,score:s.score,impacts:s.coups,mouvements,actions,phases,trace};
  records.push(record);
  console.log(scene,choix,s.score,s.coups,mouvements,actions);
}
assert(records[0].score>0 && records[0].impacts===0);
assert(records[1].impacts===0 && records[2].impacts>0);
assert(records[3].score>0 && records[4].impacts>0);
assert(records[6].score>0 && records[7].impacts===0 && records[8].impacts>0);
fs.writeFileSync(path.join(__dirname,'prises.js'),'globalThis.Prises = '+JSON.stringify(records)+';\n');

'use strict';
const assert=require('node:assert/strict'),rows=require('./pouls.json'),result=require('./calage-visuel.json');
const {create}=require('./horloge.js');
for(const row of rows){
  const fit=result.find(x=>x.year===row.year);
  const c=create(rows,row.year),sourceShift=fit.selected?fit.candidateSourceSeconds:0;
  assert(Math.abs(sourceShift+c.visualLead*row.rate)<1e-9);
  if(fit.selected){
    assert(fit.selectedTest.medianAbsMs<fit.testBefore.medianAbsMs);
    assert(fit.selectedTest.p90AbsMs<fit.testBefore.p90AbsMs);
  }
  for(const hz of [60,120])for(let phase=0;phase<8;phase++){
    const zero=row.loopStart+phase/(8*hz)*row.rate;
    const expected=[];
    for(let bar=0;bar+1<row.bars.length;bar++)for(let beat=0;beat<4;beat++){
      const t=row.bars[bar]+(row.bars[bar+1]-row.bars[bar])*beat/4+row.attackOffset+sourceShift;
      if(t>zero+.05 && t<row.loopEnd-.05)
        expected.push(Math.ceil((t-zero)/row.rate*hz-1e-9));
    }
    const seen=[];let previous=0;
    for(let frame=0;;frame++){
      const t=zero+frame/hz*row.rate;
      if(t>=row.loopEnd-.03)break;
      const value=c.sample({now:frame/hz,mediaTime:t});
      if(value.phase<previous && frame>=expected[0] && frame<=expected.at(-1))seen.push(frame);
      previous=value.phase;
    }
    assert.deepEqual(seen,expected);
  }
}
console.log('Calage conforme pour les 5 années à 60 et 120 Hz, chacune sur huit phases de trame.');

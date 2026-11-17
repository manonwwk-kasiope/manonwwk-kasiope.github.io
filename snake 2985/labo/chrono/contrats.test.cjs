'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),api=require('./chrono.js');
const clip={score:900,year:2185,elapsed:24000,startScore:700,duration:12000};
const game=()=>({year:2985,status:'playing',score:0,elapsed:0,novaCharge:1});
test('égalité, prolongation et classement brut',()=>{
  for(const model of ['poursuite','chrono']){
    const s=game(),c=api.challenge(clip,s,model);
    s.elapsed=24;s.score=900;api.update(c,s);assert.equal(c.status,'en cours');
    s.elapsed+=1/60;s.score+=50;api.update(c,s);
    assert.equal(c.status,model==='poursuite'?'record battu':'temps écoulé');
    assert.equal(s.score,950);
  }
});
test('mise facultative, récompense une seule fois, record séparé',()=>{
  const s=game(),c=api.challenge(clip,s);
  assert(api.wager(c,s));assert.equal(s.novaCharge,.75);assert(!api.wager(c,s));
  s.elapsed=5;s.score=200;api.update(c,s);assert.equal(c.bet,'engagé');
  s.score=201;api.update(c,s);assert.equal(c.bet,'gagné');assert.equal(s.novaCharge,1);assert.equal(c.status,'en cours');
  s.novaCharge=.1;api.update(c,s);assert.equal(s.novaCharge,.1);assert.equal(s.score,201);
  const declined=game(),d=api.challenge(clip,declined);declined.elapsed=2.1;assert(!api.wager(d,declined));
  assert.equal(declined.novaCharge,1);
});
test('données locales invalides refusées, contrats limités aux sauts futurs',()=>{
  const s=game();
  for(const year of [1976,2185])assert.equal(api.challenge(clip,{...s,year}),null);
  for(const obj of [null,{}, {...clip,v:1,bytes:'!'}, {...clip,v:1,bytes:'A'.repeat(10000)}])
    assert.equal(api.open(obj),null);
});
test('les dix sauts gardent le score et la date civile, archives locales séparées du classement',()=>{
  const years=[1976,1985,1995,2185,2985], data=new Map(),store={
    getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)
  };
  const archive=api.archive(store);
  data.set('snake2985.hall.tentative.ancienne-2185','classement avant insertion de 1995');
  let jumps=0;
  for(const [i,year] of years.entries()){
    assert.deepEqual(api.futureYears(year),years.slice(i+1));
    const key='snake2985.echo.v2.36x18.'+year;
    const old=JSON.stringify({year,width:36,height:18,score:year+1,until:2400,path:[0,9,8,1800,14,9,2400,18,8]});
    if(year!==1995)data.set(key,old);
    const previous=archive.load(year);
    if(year!==1995){
      assert(previous.legacy);assert.equal(previous.score,year+1);
      assert.equal(previous.duration,12000);assert.deepEqual(api.ghost(previous,6000),{x:14,y:9,plane:0,flight:false});
      if(year<2985)assert.equal(api.challenge(previous,{...game(),year:2985}).bet,'historique');
    }else assert.equal(previous,null);
    const s={...game(),year,width:36,height:18,score:200+i,plane:0,progress:1,snake:[{x:5,y:5,plane:0}]};
    const r=api.recorder();api.capture(r,s);s.elapsed=.1;s.status='dead';
    const record=api.finish(r,s);assert(archive.save(record));assert.equal(archive.load(year).year,year);
    assert.equal(archive.load(year).score,200+i);assert.equal(data.get(key),year===1995?undefined:old);
    for(const future of api.futureYears(year)){
      const c=api.challenge(archive.load(year),{...game(),year:future});assert.equal(c.target,200+i);jumps++;
    }
  }
  assert.equal(jumps,10);assert.equal(data.get('snake2985.hall.tentative.ancienne-2185'),'classement avant insertion de 1995');
});

'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
function harness(){
  const calls=[],ctx={};ctx.window=ctx;
  for(const f of ['../../forge.js','../evolution/evolution.js','../artillerie/artillerie.js']){
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
  }
  const install=ctx.SnakeEvolution.install;
  ctx.SnakeEvolution={...ctx.SnakeEvolution,install(f){
    const real=install(f);
    return {...real,update(s,dt,h){
      real.update(s,dt,{...h,emit(type,e){calls.push({type,...e,t:s.evolution?.marks?.[0]?.life});h.emit(type,e);}});
    }};
  }};
  let lines=0,state=null;
  const brush=new Proxy({},{get:(o,k)=>o[k]||(()=>{lines++;})});
  const cv={width:460,height:192,hidden:true,getContext:()=>brush,setAttribute(){}};
  const art=ctx.SnakeArtillerie;ctx.SnakeArtillerie={draw(c,s,...rest){state=s;art.draw(c,s,...rest);}};
  ctx.SnakeSprites={draw(){}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../campagne/banc.js'),'utf8'),ctx);
  return {cv,api:ctx.SnakeBanc,calls,get s(){return state;},get lines(){return lines;}};
}
const rows=[];
for(const year of [1976,1985,1995,2185,2985])for(const core of ['orbit','prism','well'])for(const mod of ['echo','chain','blast']){
  test(year+' / '+core+' / '+mod,()=>{
    const h=harness();h.api.select(h.cv,year,core,mod,false);
    assert.equal(h.cv.hidden,false);const sim=h.s,head0={...sim.snake[0]};
    for(let i=0;i<=65;i++)h.api.frame(50+i*40);
    assert.notEqual(sim.snake[0],head0);
    assert(sim.snake[0].x!==head0.x||sim.snake[0].y!==head0.y);
    const count=t=>h.calls.filter(e=>e.type===t).length,activ=count('evolutionTrigger'),hits=count('evolutionHit');
    assert.equal(activ,1);assert(hits>0);assert.equal(sim.evolution.impulses,hits);
    const mark=h.calls.find(e=>e.type==='evolutionTrigger');
    if(year===2185)assert.equal(sim.plane,1);
    if(year===1995)assert(mark.first&&mark.entered);
    const staticH=harness();staticH.api.select(staticH.cv,year,core,mod,true);
    const lines=staticH.lines;const still=JSON.stringify(staticH.s);
    for(const t of [200,600,2000])staticH.api.frame(t);
    assert.equal(staticH.lines,lines);assert.equal(JSON.stringify(staticH.s),still);
    assert.equal(staticH.s.evolution.activations,1);
    assert(staticH.s.evolution.impulses>0);assert(staticH.s.evolution.effects.length>0);
    rows.push({year,core,mod,activations:activ,impacts:hits,impactsImageFixe:staticH.s.evolution.impulses,plan:sim.plane});
    h.api.stop();assert(h.cv.hidden);const before=h.lines;h.api.frame(2800);assert.equal(h.lines,before);
  });
}
if(process.env.SNAKE_BANC_MESURE==='1')process.on('beforeExit',()=>{
  if(rows.length===45)fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify(rows,null,2)+'\n');
});

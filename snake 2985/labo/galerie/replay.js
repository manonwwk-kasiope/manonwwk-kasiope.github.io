(function(root){
  'use strict';
  const presets={
    1976:{start:[12,12],body:10,core:'orbit',mod:'echo',clock:5,sky:2.1},
    1985:{start:[15,11],body:13,core:'prism',mod:'chain',clock:0,sky:4.3},
    1995:{start:[8,11],body:12,core:'prism',mod:'blast',clock:.5,sky:4.6},
    2185:{start:[13,10],body:13,core:'orbit',mod:'chain',clock:.2,sky:3.85},
    2985:{start:[13,9],body:13,core:'well',mod:'blast',clock:.27,sky:7.1}
  };
  const pt=(x,y,plane=0)=>({x,y,plane});
  function make(year){
    const p=presets[year],idx=root.SnakeArcade.eras.findIndex(e=>e.year===year);
    let seed=68000+year;
    const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    const s=root.SnakeArcade.create(rng,idx,{shiftMode:'free'});
    s.elapsed=p.sky;
    let [x,y]=p.start;
    s.snake=Array.from({length:p.body},(_,i)=>{
      if(i>0){if(i<=4)x--;else if(i<=7)y--;else if(i<=10)x++;else y--;}
      return pt(x,y);
    });
    s.previousSnake=s.snake.map(q=>({...q}));s.progress=1;
    s.cells=[pt(18,p.start[1]),pt(9,4),pt(28,13),{...pt(19,7,1),bonus:true}];
    s.events=[];s.spawnClock=12;s.gunClock=4;
    root.SnakeForge.equip(s,p.core,p.mod);s.forge.clock=p.clock;
    const director=root.SnakeDirector.create();
    function ticks(n){
      for(let i=0;i<n;i++){
        const old=s.events.length;
        root.SnakeGardiens.tick(s,1/60);
        if(year===1995){root.SnakeDirector.tick(director,s,1/60);s.director=director;}
        for(const e of s.events.slice(old))root.SnakeImpact.event(s,e);
        if(s.status!=='playing')throw Error('État inattendu '+year+' '+s.status);
      }
    }
    if(year===1976){s.cells[0]=pt(15,12);ticks(36);}
    if(year===1985){
      ticks(22);
      if(!root.SnakeArcade.shiftPlane(s))throw Error('Bascule refusée');
      ticks(11);
    }
    if(year===1995){ticks(105);}
    if(year===2185){
      s.cells[0]=pt(14,10);s.gunClock=2;
      for(let i=0;!s.flight&&i<150;i++)ticks(1);
      if(!s.flight)throw Error('Portail du vol manquant');
      root.SnakeFlight.aim(s,1,-.36);
      ticks(27);
    }
    if(year===2985){
      s.sector=s.difficulty=9;s.sectorCells=1;s.eaten=16;s.nextFlightCell=19;s.cells[0]=pt(14,9);
      ticks(32);
      if(s.boss?.name!=='La Singularité')throw Error('Gardien final manquant');
      if(!root.SnakeArcade.fire(s))throw Error('Nova refusée');
      ticks(7);
    }
    return {s,t:s.elapsed};
  }
  function facts(s){return {year:s.year,time:s.elapsed,head:s.snake[0],body:s.snake.length,plane:s.plane,
    crossing:s.planeShift?.remaining||0,offer:s.director?.offer?.kind||null,
    flightRings:s.flight?.rings.length||0,boss:s.boss?.name||null,bossPhase:s.boss?.attack?.phase||null,
    weapon:s.forge.core,shots:s.forge.projectiles.length+s.forge.orbits.length,nova:s.effects.some(e=>e.kind==='nova')};}
  root.SnakeGalerie={make,facts,years:Object.keys(presets).map(Number)};
})(typeof window!=='undefined'?window:globalThis);

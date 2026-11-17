(() => {
  'use strict';
  // Commandes publiques du moteur pour dessiner le tracé. Les cellules d'entraînement
  // sont distribuées devant le joueur ; le moteur est seul à ajouter les segments.
  function create(engine,mode='exact',shape='rectangle') {
    const s=engine.create(()=>.35,0), commands=[];
    s.difficulty=10;s.gunClock=s.spawnClock=1000;s.drones=[];s.cells=[];
    s.forge.clock=1000;
    const add=(dx,dy,count)=>{for(let i=0;i<count;i++)commands.push({dx,dy});};
    // L'ancien segment du parcours assisté doit réellement venir du plan voisin.
    if(mode==='assist')engine.shiftPlane(s);
    add(1,0,6);
    if(mode==='assist')commands.push({switch:true});
    add(1,0,4);
    if(shape==='concave'){
      add(0,1,5);add(-1,0,2);add(0,-1,2);add(-1,0,3);add(0,-1,1);
    }else{add(0,1,4);add(-1,0,5);add(0,-1,1);}
    let frame=0,issued=false,prepared=false,offered=false;
    function tick(gesture=false) {
      if(s.status!=='playing')return;
      if(!prepared && commands.length){
        const c=commands[0];
        if(c.switch){if(engine.shiftPlane(s))commands.shift();engine.tick(s,1/60);return;}
        const head=s.snake[0], next={x:head.x+c.dx,y:head.y+c.dy,plane:s.plane};
        if(!issued){
          if(s.direction.x!==c.dx||s.direction.y!==c.dy)engine.turn(s,c.dx,c.dy);
          s.cells=[next];issued=true;
        }
        engine.tick(s,1/60);
        if(s.snake[0].x===next.x&&s.snake[0].y===next.y){commands.shift();issued=false;}
        return;
      }
      if(!prepared){
        s.cells=[];s.drones=[[16,11,0],[16,11,1],[17,13,0]].map(([x,y,plane],i)=>({x,y,plane,warmup:0,id:100+i,next:{x,y,plane},moveIn:1000,moveEvery:1000}));
        prepared=true;
      }
      if(s.knot?.preview){offered=true;if(gesture)engine.shiftPlane(s);}
      engine.tick(s,1/60);frame++;
    }
    return {s,tick,get ready(){return prepared;},get offered(){return offered;},get frames(){return frame;}};
  }
  const api={create};if(typeof window!=='undefined')window.SnakeKnotDemo=api;
  if(typeof module!=='undefined')module.exports=api;
})();

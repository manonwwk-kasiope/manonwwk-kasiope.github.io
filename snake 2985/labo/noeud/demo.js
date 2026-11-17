(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('arena'),ctx=canvas.getContext('2d');
  const original=window.SnakeForge,engine=window.SnakeArcade,knot=window.SnakeKnot;
  let route,wrapped,stage='idle',timer=0,previous=0;
  const project=p=>({x:(p.x+.5)*24,y:(p.y+.5)*24});
  function circle(p,color,r,outline){
    const q=project(p);ctx.beginPath();ctx.fillStyle=ctx.strokeStyle=color;ctx.arc(q.x,q.y,r,0,Math.PI*2);
    if(outline)ctx.stroke();else ctx.fill();
  }
  function paint(){
    const s=route.s;ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const part of [...s.snake].reverse())circle(part,'#63ead7',8,(part.plane??0)!==s.plane);
    circle(s.snake[0],'#fff',5,false);
    for(const t of s.drones) circle(t,t.plane===s.plane?'#ff7989':'#bda6e2',6,t.plane!==s.plane);
    knot.draw(ctx,s,project);
  }
  function reset(){
    wrapped=knot.install(engine,original,{mode:$('mode').value});
    window.SnakeForge=wrapped.forge;route=window.SnakeKnotDemo.create(wrapped.engine,$('mode').value);
    stage='idle';$('start').textContent='Dessiner la boucle';$('shift').disabled=$('skip').disabled=true;
    $('status').textContent='Les drones rouges occupent ton plan. Les contours indiquent le plan voisin.';paint();
  }
  function decide(shift){
    if(stage!=='choice')return;
    if(shift&&!wrapped.engine.shiftPlane(route.s))return;
    stage='resolve';$('shift').disabled=$('skip').disabled=true;
    $('status').textContent=shift?'Bascule engagée.':'Trajectoire maintenue.';
  }
  function simulate(){
    const s=route.s;route.tick(false);
    if(stage==='tracing'&&route.ready&&s.knot?.preview){
      stage='choice';$('shift').disabled=$('skip').disabled=false;
      $('status').textContent='Boucle repérée. Basculer coûtera 28 % de la charge nova à la fermeture.';
    }
    if(stage==='resolve'&&(s.knot.closures||s.status==='dead'||($('mode').value==='assist'&&!s.knot.pending&&route.frames>18))){
      stage='done';$('status').textContent=s.knot.closures?
        'Boucle fermée · '+s.knot.impacts+' cible touchée · les drones sur le bord et sur le plan voisin sont intacts.':
        s.status==='dead'?'Collision avec ta queue. Aucun circuit déclenché.':'Le serpent passe à côté de son ancien segment. Aucun circuit déclenché.';
    }
  }
  function frame(now){
    timer+=previous?Math.min(.08,(now-previous)/1000):0;previous=now;
    while(timer>=1/60){if(stage==='tracing'||stage==='resolve')simulate();timer-=1/60;}
    paint();requestAnimationFrame(frame);
  }
  $('start').onclick=()=>{reset();stage='tracing';$('start').textContent='Recommencer';$('status').textContent='Le serpent construit la boucle.';};
  $('mode').onchange=reset;$('shift').onclick=()=>decide(true);$('skip').onclick=()=>decide(false);
  reset();requestAnimationFrame(frame);
})();

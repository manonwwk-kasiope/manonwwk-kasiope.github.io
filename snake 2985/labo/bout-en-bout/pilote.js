'use strict';
function buildPilot({expert,observe,profiles}) {
  const same=(a,b)=>a.x===b.x&&a.y===b.y;
  const arrows=(x,y)=>{
    const a=Math.atan2(y,x),k=(Math.round(a/(Math.PI/4))+8)%8;
    return [['ArrowRight'],['ArrowRight','ArrowDown'],['ArrowDown'],['ArrowDown','ArrowLeft'],['ArrowLeft'],['ArrowLeft','ArrowUp'],['ArrowUp'],['ArrowUp','ArrowRight']][k];
  };
  return function choose(s,project=null){
    if(s.flight){
      const h=s.snake[0],target=s.flight.rings[s.flight.passed];
      const from=project?project(h):h,to=project?project(target):target;
      return {flight:true,keys:arrows(to.x-from.x,to.y-from.y),vector:[target.x-h.x,target.y-h.y],advance:.08};
    }
    const view=observe(s,profiles.expert),a=expert(s,view),h=s.snake[0],ec=s.ecologie?.wave;
    if(ec && ec.plane===s.plane){
      const key=(x,y)=>s.width*y+x;
      if(s.novaCharge===1 && Math.hypot(ec.emitter.x-h.x,ec.emitter.y-h.y)<=s.novaRadius)a.fire=true;
      else if(ec.mask.has(key(h.x+a.d[0],h.y+a.d[1]))||ec.mask.has(key(h.x,h.y)))a.shift=true;
    }else if(ec&&a.shift&&ec.mask.has(s.width*h.y+h.x))a.shift=false;
    if(a.shift && s.planeCooldown<=0){
      const other=1-s.plane;
      if(s.snake.slice(1).some(p=>p.plane===other&&same(p,h)))a.shift=false;
    }
    return {flight:false,keys:arrows(...a.d),shift:a.shift,fire:a.fire&&s.novaCharge===1,advance:Math.max(.0002,s.stepTime-s.stepClock+.00001)};
  };
}
if(typeof module==='object')module.exports=buildPilot;

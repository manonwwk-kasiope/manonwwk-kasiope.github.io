(function () {
  'use strict';
  // Independent of rendering. Coordinates are CSS pixels, time is monotonic ms.
  function createInput(emit, {mode = 'stick', flying = false, angle = 0} = {}) {
    let left, right;
    function route(e) {
      const {phase, id, x, y, t, zone} = e;
      if (phase === 'down') {
        if (zone === 'pilot' && !left) left = {id, x, y, angle};
        else if (['plane','nova'].includes(zone) && !right) right = {id, x, y, t, zone};
        return;
      }
      if (right && right.id === id) {
        const action = right;
        if (Math.hypot(x-action.x,y-action.y)>14 || zone !== action.zone) action.canceled = true;
        if (phase === 'up' && !action.canceled && (action.zone === 'plane' || t-action.t >= 280))
          emit({type:action.zone, t});
        if (phase === 'up' || phase === 'cancel') right = null;
        return;
      }
      if (!left || left.id !== id) return;
      if (phase === 'up' || phase === 'cancel') { left = null; return; }
      const dx = x-left.x, dy = y-left.y;
      const radius = Math.hypot(dx,dy);
      if (flying) {
        if (mode === 'stick' && radius < 8 || mode === 'swipe' && Math.abs(dx)<2) return;
        angle = mode === 'stick' ? Math.atan2(dy,dx) : left.angle + dx*Math.PI/66;
        emit({type:'aim', angle, t});
      } else {
        const threshold = mode === 'stick' ? 12 : 18;
        if (radius < threshold) { if (mode==='stick' && radius<7) left.last = null; return; }
        if (Math.abs(Math.abs(dx)-Math.abs(dy)) < radius*.15) return;
        const h = Math.abs(dx)>Math.abs(dy);
        const vx = h ? Math.sign(dx) : 0, vy = h ? 0 : Math.sign(dy);
        const key = vx+','+vy;
        if (left.last !== key) emit({type:'turn',x:vx,y:vy,t});
        left.last = key;
        if (mode === 'swipe') { left.x=x; left.y=y; }
      }
    }
    return {route, reset(){left=right=null;}, configure(options) {
      left=right=null; mode=options.mode??mode; flying=options.flying??flying; angle=options.angle??angle;
    }};
  }
  // The engine consumes one accepted turn on each grid boundary.
  function createTurnBuffer() {
    const queue=[];
    return {
      offer(direction,next) {
        const previous=queue.at(-1)||direction;
        if(queue.length===2 || Math.abs(next.x)+Math.abs(next.y)!==1 ||
          !Number.isInteger(next.x) || !Number.isInteger(next.y) ||
          previous.x*next.x+previous.y*next.y!==0) return false;
        queue.push({x:next.x,y:next.y});
        return true;
      },
      step(direction){return queue.shift()||direction;},
      reset(){queue.length=0;}
    };
  }
  const api = {createInput,createTurnBuffer};
  if (typeof module !== 'undefined') module.exports=api;
  if (typeof window !== 'undefined') window.LabControls=api;
})();

(() => {
  'use strict';
  // Time is monotonic milliseconds. Call advance at a frame or immediately before a real command.
  function create(simulate,hz=60){
    const frequency=typeof hz==='function'?hz:()=>hz;
    function period(){
      const h=frequency();
      if(!Number.isFinite(h)||h<=0)throw RangeError('Fréquence positive requise');
      return 1000/h;
    }
    let last=null,credit=0,generation=0;
    function reset(now=null){last=Number.isFinite(now)?now:null;credit=0;generation++;}
    function advance(now){
      if(!Number.isFinite(now))return 0;
      if(last===null){last=now;return 0;}
      if(now<=last)return 0;
      credit+=Math.min(80,now-last);last=now;
      let count=0;const token=generation;
      // Recorded frame stamps in this experiment are rounded to 0.1 ms. Preserve half a
      // quantum of signed debt to avoid losing a full display refresh to a 0.03 ms roundoff.
      for(let ms=period();credit+.0500001>=ms;ms=period()){
        credit-=ms;count++;
        if(simulate(ms/1000)===false || generation!==token){if(generation===token)reset(now);break;}
      }
      return count;
    }
    return {advance,reset};
  }
  const api={create};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeCadence=api;
})();

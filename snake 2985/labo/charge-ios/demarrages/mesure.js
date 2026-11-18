(() => {
  'use strict';
  let start = null;
  const raf = window.requestAnimationFrame.bind(window);
  document.addEventListener('click', e => {
    if (!e.isTrusted || e.target.closest('button')?.textContent !== 'Jouer en silence') return;
    start = {year:Number(document.querySelector('#rang').textContent.slice(0,4)),touch:performance.now(),
      width:innerWidth,height:innerHeight,starts:[],costs:[]};
  }, true);
  window.requestAnimationFrame = cb => {
    if (cb.name !== 'frame') return raf(cb);
    return raf(time => {
      const run = start, inGame = run && document.body.dataset.screen==='play';
      const entered = inGame ? performance.now() : 0;
      if (inGame) {
        if (!run.starts.length) run.firstExecution=entered;
        run.starts.push(time);
      }
      cb(time);
      if (!inGame) return;
      run.costs.push(performance.now()-entered);
      if (time-run.starts[0]>=2000 || document.body.dataset.screen!=='play') {
        start=null;
        navigator.sendBeacon('/mesure', JSON.stringify({...run,silence:window.silence}));
      }
    });
  };
})();

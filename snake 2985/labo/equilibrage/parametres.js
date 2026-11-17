(() => {
  'use strict';
  const curves = {
    temoin: { start:0, drone:[1,1], warning:[1,1], recharge:[1,1],rail:[1,1],incoming:[1,1] },
    progressive: { start:3.2, drone:[1.14,.74], warning:[1.16,.76], recharge:[1.18,.70],rail:[1,1],incoming:[1,1] },
    tendue: { start:3.2, drone:[1.07,.58], warning:[1.03,.60], recharge:[1.06,.50],rail:[.9,3.4],incoming:[1.2,.32] },
  };
  const rank = {1976:0,1985:1,1995:2,2185:3,2985:4};
  const chosen = 'progressive';
  const drones = new WeakSet(), warnings = new WeakSet();
  function tick(s,dt,next,curve=chosen) {
    const p=curves[curve];
    if (!p || !Number.isFinite(dt) || dt<=0) return;
    if(curve==='temoin'){next(s,dt);return;}
    while(dt>1e-9 && s.status==='playing'){
      const slice=Math.min(dt,1/60);
      const intensity=.62*(rank[s.year]/4)+.38*((s.difficulty-1)/9);
      const scale=pair=>pair[0]+(pair[1]-pair[0])*intensity;
      for(const d of s.drones){
        if(!drones.has(d)){
          d.moveEvery*=scale(p.drone);d.moveIn*=scale(p.drone);
          drones.add(d);
        }
        if(s.elapsed<p.start)d.warmup=Math.max(d.warmup,p.start-s.elapsed);
      }
      const a=s.boss?.attack;
      if(a?.phase==='warning'&&!warnings.has(a)){
        a.remaining=a.total=Math.max(.64,a.remaining*scale(p.warning));
        warnings.add(a);
      }
      const before=s.novaCharge,eaten=s.eaten,rift=s.riftUsed,flight=s.flight,rail=s.gunClock,spawn=s.spawnClock,boss=s.boss;
      const rechargeSeconds=4+(12-s.pace*1.05)/(1+s.levels.nova*.6);
      next(s,slice);
      if(s.gunClock>rail) s.gunClock*=scale(p.rail);
      if(s.spawnClock>spawn) s.spawnClock*=scale(p.incoming);
      if(s.eaten===eaten && s.riftUsed===rift && s.flight===flight && s.boss===boss && before<1 && s.novaCharge>before)
        s.novaCharge=Math.min(1,before+slice/rechargeSeconds*scale(p.recharge));
      dt-=slice;
    }
  }
  window.SnakeEquilibre={tick,curves,chosen};
})();

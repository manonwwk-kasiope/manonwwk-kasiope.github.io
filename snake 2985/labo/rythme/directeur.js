(function (root, factory) {
  const director = factory();
  if (typeof module === 'object') module.exports = director;
  else root.SnakeDirector = director;
})(globalThis, function () {
  'use strict';
  const warning = 1.5, windowLength = 7;
  const basePoints = { convoi: 100, mue: 160, aiguillage: 190, surf: 200, relais: 260 };
  const books = {1976:['convoi'],1985:['mue','convoi'],1995:['aiguillage','convoi'],
    2185:['surf','convoi'],2985:['relais','surf','mue']};
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const same = (a,b,r=0.85) => a && b && (a.plane??0)===(b.plane??0) && distance(a,b)<=r;
  function create() {
    return { phase:'rest', remaining:1, offer:null, intensity:0, chain:0, turn:0,
      era:null, kills:0, previous:null, trackedFlight:null, rounds:0 };
  }
  function anchors(s,kind) {
    const head=s.snake[0], plane=s.plane, opposite=1-plane;
    if (kind==='surf') {
      if (s.flightGate) return [{...s.flightGate}];
      return null;
    }
    const dir=s.direction;
    const free=p => p.x>=1 && p.y>=1 && p.x<s.width-1 && p.y<s.height-1 &&
      !s.drones.some(dr=>same(dr,p,1.25) || same(dr.next,p,1)) &&
      !s.snake.slice(1).some(seg=>same(seg,p)) && !same(s.flightGate,p);
    const vectors=[dir,{x:-dir.y,y:dir.x},{x:dir.y,y:-dir.x}];
    for (const v of vectors) {
      const origin={x:Math.round(head.x+v.x*5),y:Math.round(head.y+v.y*5),plane};
      if(kind==='aiguillage'){
        for(const side of [1,-1]){
          const at=(forward,lateral)=>({x:origin.x+forward*v.x-lateral*side*v.y,
            y:origin.y+forward*v.y+lateral*side*v.x,plane});
          const tracks=[origin,at(0,2),at(4,2),at(0,-2),at(7,0),at(-2,0)];
          if(tracks.every(free))return tracks;
        }
        continue;
      }
      if(s.shiftMode==='portal' && kind!=='convoi'){
        const gate=s.planeGates.find(g=>distance(g,origin)<5 && distance(g,head)<9);
        if(!gate)continue;
        origin.x=gate.x;origin.y=gate.y;
      }
      const target={x:origin.x+Math.round(v.x*3),y:origin.y+Math.round(v.y*3),plane:kind==='convoi'?plane:opposite};
      const path=[origin,target];
      if(kind==='relais')path.push({...origin});
      if(path.every(free))return path;
    }
    return null;
  }
  function tick(d,s,dt) {
    const events=[];let points=0;
    const result=()=>({events,points,suppressWaves:d.phase==='boss'||d.phase==='recovery'});
    if (!Number.isFinite(dt)||dt<=0||s.status!=='playing')return result();
    const h={...s.snake[0],plane:s.plane};
    if(d.era!==s.year){
      Object.assign(d,create(),{era:s.year,kills:s.kills});
    }
    const crowd=s.drones.filter(dr=>same(dr,h,3.1)).length;
    const target=Math.min(1,crowd*.45+Math.min(1,Math.max(0,s.kills-d.kills))*.6);
    d.intensity=Math.max(target,d.intensity*Math.exp(-dt/2.4));d.kills=s.kills;
    function transition(phase,remaining) { d.phase=phase;d.remaining=remaining; }
    function rest(reason,delay,phase='rest'){
      if(d.offer) events.push({type:'close',kind:d.offer.kind,reason});
      d.offer=null;d.trackedFlight=null;transition(phase,delay);
    }
    const before=d.previous;d.previous=h;
    if(s.boss || s.nearBoss>=.84){
      if(d.phase!=='boss'){
        rest(s.boss?'boss':'approche',0,'boss');d.chain=0;events.push({type:'bossBreath'});
      }
      return result();
    }
    if(d.phase==='boss'){transition('recovery',4);return result();}
    d.remaining-=dt;
    const o=d.offer;
    if(!o){
      if(d.remaining>1e-8)return result();
      if(d.intensity>.72){transition('recovery',1.5);return result();}
      if(s.flight){transition('rest',.25);return result();}
      const list=books[s.year], planned=list[d.turn%list.length];
      let kind=planned;
      if(planned==='surf' && !s.flightGate){kind='convoi';}
      const path=anchors(s,kind);
      if(!path){transition('rest',.5);return result();}
      // Keep a pending surf slot until a gate opens, but allow a convoy meanwhile.
      if(planned===kind)d.turn++;
      d.offer={kind,phase:'warning',anchors:path,step:0,remaining:warning,elapsed:0,
        armed:false, touchedTrain:false};
      transition('warning',warning);events.push({type:'warning',kind});return result();
    }
    o.remaining=Math.max(0,d.remaining);
    if(o.kind==='surf' && !o.armed && s.flight && same(h,o.anchors[0],1.5)){
      o.armed=true;d.trackedFlight=s.flight;events.push({type:'capture',kind:o.kind});
    }
    if(d.phase==='warning'){
      if(d.remaining>1e-8)return result();
      transition('active',windowLength);o.phase='active';o.remaining=d.remaining;
      events.push({type:'open',kind:o.kind});
    }
    o.elapsed+=dt;
    const [a,b,c]=o.anchors;
    if(o.kind==='convoi'){
      // A moving gate spans the announced line once; the tail opens the bonus.
      const u=Math.min(1,o.elapsed/2);o.train={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,plane:a.plane};
      if(u<1 && same(h,o.train,.74)){o.touchedTrain=true;}
      if(u>=1 && !o.touchedTrain && same(h,b))o.step=1;
    }else if(o.kind==='aiguillage'){
      const [,branch,finish,siding,start,end]=o.anchors;
      const u=Math.min(1,o.elapsed/6);
      o.train={x:start.x+(end.x-start.x)*u,y:start.y+(end.y-start.y)*u,plane:a.plane};
      if(same(h,o.train,.8)){
        d.chain=0;rest('train',3,'recovery');return result();
      }
      if(same(h,siding)){
        d.chain=0;rest('voie libre',2,'recovery');return result();
      }
      if(o.step===0 && same(h,a) && before && before.plane===h.plane &&
         (h.x-before.x)*(start.x-end.x)+(h.y-before.y)*(start.y-end.y)>0){
        o.step=1;events.push({type:'aiguille',kind:o.kind});
      }
      if(o.step===1 && same(h,branch)){o.step=2;events.push({type:'branche',kind:o.kind});}
      if(o.step===2 && same(h,finish) && u<7/9)o.step=3;
    }else if(o.kind==='surf'){
      if(d.trackedFlight){
        const f=d.trackedFlight;
        o.nextRing=f.rings[f.passed]||null;
        o.step=Math.min(2,f.passed);
      }
    }else{
      if(o.step===0 && before && same(before,a,1.1) && h.plane!==before.plane){
        o.step=1;events.push({type:'double',kind:o.kind});
      }
      if(o.step===1 && same(h,b)){o.step=2;events.push({type:'liaison',kind:o.kind});}
      if(o.kind==='relais' && o.step===2 && same(h,c))o.step=3;
    }
    const goal={convoi:1,mue:2,aiguillage:3,surf:Math.min(2,d.trackedFlight?.goal??2),relais:3}[o.kind];
    if(o.step===goal){
      d.chain=Math.min(3,d.chain+1);points=basePoints[o.kind]*d.chain;d.rounds++;
      events.push({type:'score',kind:o.kind,points,chain:d.chain});
      rest('réussi',2.5+3*d.intensity,'recovery');
    }else if(d.remaining<=1e-8){
      d.chain=0;rest('expiré',3+3*d.intensity,'recovery');
    }
    return result();
  }
  return {create,tick};
});

(function(){
  'use strict';
  const W=36,H=18,AREA=W*H,WINDOW=2000,INTERVAL=50,CAPACITY=42;
  const flags={body:1,cell:2,drone:4,next:8,hull:16,warning:32,active:64,gate:128};
  const plane=p=>p?.plane??0;
  function tile(x,y){x=Math.round(x);y=Math.round(y);return x>=0&&x<W&&y>=0&&y<H?y*W+x:-1;}
  function explain(s){
    const head=s.snake[0], event=s.events?.findLast(e=>e.type==='death');
    const pos={x:event?.x??head.x,y:event?.y??head.y,plane:event?.plane??plane(head)};
    const tried={x:head.x+s.direction.x,y:head.y+s.direction.y,plane:plane(head)};
    const cause=String(s.cause||event?.cause||'Impact').slice(0,80);
    let tip='Observe la dernière trajectoire avant de reprendre.', impact=pos, kind='impact';
    if(cause==='Mur'){
      impact=tried;kind='wall';tip='La prochaine case était hors de la grille. Prépare le virage une case plus tôt.';
    }else if(cause==='Ta propre queue'){
      impact=tried;kind='body';tip='La case visée était encore occupée par ton corps sur ce plan. Laisse passer la queue.';
    }else if(cause==='Drone'){
      kind='drone';tip='Le drone et ta trajectoire se sont rejoints sur ce plan. Regarde sa prochaine case, marquée d’une croix.';
    }else if(cause==='Transit saturé'){
      kind='landing';tip='Au retour du vol, le moteur n’a trouvé aucune position de repli. Observe l’encombrement à la sortie.';
    }else if(s.boss?.name===cause){
      const a=s.boss.attack;
      if(pos.x===head.x&&pos.y===head.y&&a?.phase==='active'&&plane(a)===pos.plane&&a.danger.has(tile(pos.x,pos.y))){
        kind='attack';tip='La zone hachurée était active sur ton plan. Quitte-la pendant le préavis.';
      }else{
        kind='hull';tip='La trajectoire a rencontré la coque du gardien. Laisse de la place autour de son centre.';
      }
    }
    return Object.freeze({cause,kind,...impact,tip});
  }
  function create(){
    const cells=new Uint8Array(CAPACITY*AREA*2);
    const times=new Float64Array(CAPACITY),heads=new Float32Array(CAPACITY*2),layers=new Uint8Array(CAPACITY),flight=new Uint8Array(CAPACITY);
    let start=0,count=0,death=null;
    const index=i=>(start+i)%CAPACITY;
    function capture(s,t){
      if(death||!Number.isFinite(t)||!s.snake?.length)return false;
      const previous=count?times[index(count-1)]:-Infinity;
      if(t<previous || (t-previous<INTERVAL && s.status!=='dead'))return false;
      let i;
      if(t===previous)i=index(count-1);
      else{
        if(count===CAPACITY){start=index(1);count--;}
        i=index(count++);
      }
      const offset=i*AREA*2;
      cells.fill(0,offset,offset+AREA*2);
      function mark(x,y,p,flag){const j=tile(x,y);if(j>=0 && (p===0||p===1))cells[offset+p*AREA+j]|=flag;}
      for(const p of s.snake)mark(p.x,p.y,plane(p),flags.body);
      for(const p of s.cells||[])mark(p.x,p.y,plane(p),flags.cell);
      for(const p of [s.rift,s.flightGate])if(p)mark(p.x,p.y,plane(p),flags.gate);
      for(const d of s.drones||[]){
        if(d.warmup>0)continue;
        mark(d.x,d.y,plane(d),flags.drone);
        if(d.next)mark(d.next.x,d.next.y,plane(d.next),flags.next);
      }
      if(s.boss){
        const b=s.boss;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)mark(b.x+dx,b.y+dy,plane(b),flags.hull);
        const a=b.attack;
        if(a)for(const j of a.danger||[])if(j>=0 && j<AREA)
          mark(j%W,Math.floor(j/W),plane(a),a.phase==='active'?flags.active:flags.warning);
      }
      times[i]=t;heads[2*i]=s.snake[0].x;heads[2*i+1]=s.snake[0].y;layers[i]=plane(s.snake[0]);flight[i]=s.flight?1:0;
      // Keep one actual sample at or before the left boundary.
      while(count>1&&times[index(1)]<=t-WINDOW){start=index(1);count--;}
      if(s.status==='dead')death=explain(s);
      return true;
    }
    function bounds(){
      if(!count)return null;
      const end=times[index(count-1)];return {start:Math.max(times[start],end-WINDOW),end,count};
    }
    function frameAt(ms){
      const range=bounds();if(!range)return null;
      const t=Math.max(range.start,Math.min(range.end,ms));let j=count-1;
      while(j>0&&times[index(j)]>t)j--;
      const i=index(j);
      // An independent copy lets a renderer retain a frame across subsequent ticks.
      return {t:times[i],x:heads[2*i],y:heads[2*i+1],plane:layers[i],flight:Boolean(flight[i]),
        cells:cells.slice(i*AREA*2,(i+1)*AREA*2)};
    }
    return {capture,bounds,frameAt,get death(){return death;}, reset(){start=count=0;death=null;},
      storageBytes:cells.byteLength+times.byteLength+heads.byteLength+layers.byteLength+flight.byteLength};
  }
  const api={create,flags,width:W,height:H};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeReprise=api;
})();

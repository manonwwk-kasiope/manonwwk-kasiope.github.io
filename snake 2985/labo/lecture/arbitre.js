(function(root,factory){
  const api=factory();if(typeof module==='object')module.exports=api;else root.SnakeLecture=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  // Masques de sept pixels, statiques et distincts, lisibles avec une seule encre.
  const shapes={
    danger:['0001000','0010100','0010100','0101010','0100010','1001001','1111111'],
    ring:['0011100','0100010','1000001','1000001','1000001','0100010','0011100'],
    plane:['0001000','0011100','0111110','0000000','0111110','0011100','0001000'],
    guardian:['1000001','1101011','1011101','1000001','0100010','0010100','0001000'],
    target:['0001000','0010100','0100010','1001001','0100010','0010100','0001000']
  };
  const texts={convoi:['Prends le sillage'],mue:['Pose ta mue','Rejoins le relais'],surf:['Entre en vol'],
    relais:['Pose ta mue','Rejoins le relais','Reviens au socle'],aiguillage:['Prends l’aiguille','Bifurque','Double le train']};
  const same=(p,q)=>p && q && p.x===q.x && p.y===q.y && (p.plane??0)===(q.plane??0);
  function threat(s){
    const h=s.snake[0],dir=s.turns[0]||s.direction,a=s.boss?.attack;
    const next=s.flight?h:{x:h.x+dir.x,y:h.y+dir.y,plane:s.plane};
    const mask=p=>a?.plane===s.plane && a.danger.has(Math.round(p.y)*s.width+Math.round(p.x));
    if(a && (a.phase==='active'||a.remaining<=.6)){
      if(mask(h))return ['Sors de la salve',h];
      const arrival=s.stepTime-s.stepClock;
      if(!s.flight && mask(next) && (a.phase!=='active'||arrival<a.remaining))
        return ['Sors de la salve',next];
    }
    if(s.flight){
      if(a?.plane!==s.plane)return null;
      const f=s.flight,speed=s.turbo?7.2:5.4,step=1/60;
      let x=h.x,y=h.y,angle=f.angle;
      for(let frame=1;frame<=15;frame++){
        const delta=Math.atan2(Math.sin(f.targetAngle-angle),Math.cos(f.targetAngle-angle));
        angle+=Math.max(-8*step,Math.min(8*step,delta*(1-Math.exp(-12*step))));
        x+=Math.cos(angle)*speed*step;y+=Math.sin(angle)*speed*step;
        const t=frame*step,p={x,y,plane:s.plane};
        const on=a.phase==='active'?t<a.remaining:t>=a.remaining && t<a.remaining+.33;
        if(on && mask(p))return ['Sors de la salve',p];
      }
      return null;
    }
    if(next.x<0||next.x>=s.width||next.y<0||next.y>=s.height)return ['Bord devant',h];
    const growing=s.cells.some(p=>same(p,next));
    if(s.snake.slice(0,growing?s.snake.length:-1).some(p=>same(p,next)))return ['Évite ta queue',next];
    const b=s.boss;
    if(b?.plane===s.plane && Math.max(Math.abs(next.x-b.x),Math.abs(next.y-b.y))<=1)return ['Évite la coque',next];
    for(const d of s.drones){
      if(d.warmup>0)continue;
      if(same(d,next)||(same(d.next,h)&&d.moveIn<=s.stepTime-s.stepClock))return ['Évite le drone',d];
    }
    return null;
  }
  const create=()=>({lastText:null});
  function read(m,s){
    const options=[];
    const add=(kind,text,at)=>{if(at)options.push({kind,text,at:{x:at.x,y:at.y,plane:at.plane??s.plane}});};
    if(s.status==='playing'){
      const h=s.snake[0],b=s.boss,o=s.director?.offer;
      const risk=threat(s);if(risk)add('danger',...risk);
      const ring=s.flight?.rings[s.flight.passed];
      if(ring)add('ring','Traverse l’anneau',ring);
      if(s.planeShift)add('plane',s.plane===0?'Premier plan':'Second plan',h);
      if(b)add('guardian',b.weak?(b.plane===s.plane?'Vise le cœur':'Cœur sur l’autre plan'):
        b.attack?.phase==='warning'?'Observe la salve':'Suis le gardien',b);
      if(o && texts[o.kind]){
        const i=Math.min(o.step,texts[o.kind].length-1);
        const at=o.kind==='convoi'?o.anchors[1]:o.anchors[i];
        add('target',texts[o.kind][i],at);
      }else{
        const cells=s.cells.filter(p=>p.plane===s.plane);
        const nearest=cells.reduce((best,p)=>!best||Math.hypot(h.x-p.x,h.y-p.y)<Math.hypot(h.x-best.x,h.y-best.y)?p:best,null);
        add('target','Prends la cellule',nearest);
      }
    }
    const primary=options[0]||null, text=primary?.text||'';
    const changed=text!==m.lastText;m.lastText=text;
    return {primary,secondary:options[1]||null,changed,announcement:changed?text:null,
      masked:options.slice(1).map(option=>option.kind)};
  }
  function draw(ctx,kind,x,y,scale,ink){
    const rows=shapes[kind];if(!rows)return;
    ctx.fillStyle=ink;
    rows.forEach((row,j)=>{for(let i=0;i<7;i++)if(row[i]==='1')
      ctx.fillRect(x+i*scale,y+j*scale,scale,scale);});
  }
  return {create,read,draw,shapes,palette:['#101629','#727d96','#dbc178','#faf8ed']};
});

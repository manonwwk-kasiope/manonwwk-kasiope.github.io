/* Deux empreintes de commande, exclusivement sur leurs cases libres. */
(function(root){
  'use strict';
  const inks={1976:['#dcf1ab','#70946b'],1985:['#96d9c6','#60a4a5'],1995:['#b6dfdf','#82bccd'],2185:['#abd6de','#80aabc'],2985:['#b6d3e9','#92a2be']};
  function blocked(s,x,y,z){
    const at=p=>p&&(p.plane??0)===z&&Math.abs(x-p.x)<.76&&Math.abs(y-p.y)<.76;
    const boss=s.boss;
    if(boss&&(boss.plane??0)===z&&Math.abs(x-boss.x)<=1&&Math.abs(y-boss.y)<=1)return true;
    for(const a of [boss?.attack,s.ecologie?.wave]){
      if((a?.plane??0)===z&&(a?.danger?.has?.(y*s.width+x)||a?.mask?.has?.(y*s.width+x)))return true;
      if(a?.tiles?.some(p=>(p.plane??a.plane??0)===z&&p.x===x&&p.y===y))return true;
    }
    const offer=s.director?.offer;
    if([s.rift,s.flightGate,s.bonus,s.aide?.at,offer?.train].some(at))return true;
    if(s.shiftMode==='portal'&&s.planeGates?.some(p=>p.x===x&&p.y===y))return true;
    return [s.snake,s.cells,s.drones,offer?.anchors,s.aide?.marks,s.evolution?.marks].some(list=>list?.some(at));
  }
  function footprints(s,z){
    const head=s.snake?.[0],turns=s.turns;
    if(!head||!turns?.length||s.flight||s.status!=='playing'||(head.plane??0)!==z)return [];
    let {x,y}=head;const marks=[];
    for(let i=0;i<Math.min(2,turns.length);i++){
      const d=turns[i];
      if(!d||!Number.isInteger(d.x)||!Number.isInteger(d.y)||Math.abs(d.x)+Math.abs(d.y)!==1)break;
      x+=d.x;y+=d.y;
      if(x<0||x>=s.width||y<0||y>=s.height||blocked(s,x,y,z))break;
      marks.push({x,y,dx:d.x,dy:d.y,order:i+1});
    }
    return marks;
  }
  function draw(c,s,cam,z,project){
    if(!s.turns?.length||(!s.turbo&&!(s.initiation?.prepared&&s.initiation.stage!=='libre')))return;
    const marks=footprints(s,z);if(!marks.length)return;
    const tones=inks[s.year]||inks[2985];c.save();c.lineCap='butt';
    for(const m of marks){
      // Talon carré, pointe resserrée. La deuxième semelle est plus courte.
      const P=(u,v)=>project(cam,m.x+u*m.dx-v*m.dy,m.y+u*m.dy+v*m.dx,z);
      const end=m.order===1?.47:.23,start=m.order===1?-.16:-.32;
      const halfWidth=s.year===2985&&m.order===1?.22:.17;
      const points=[P(start,-halfWidth),P(end-.05,-halfWidth),P(end,.03),P(end-.08,halfWidth),P(start,halfWidth)];
      c.beginPath();
      for(const [i,p] of points.entries()){if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}
      c.closePath();c.fillStyle=tones[m.order-1];c.fill();
      const a=P(start+.18,-.18),b=P(start+.18,.18);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
      c.strokeStyle='#172932';c.lineWidth=1.5;c.stroke();
      if(s.year===1976&&m.order===2){
        const a=P(end-.06,-.13),b=P(end-.06,.13);
        c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=tones[0];c.lineWidth=2;c.stroke();
      }
    }
    c.restore();
  }
  const api=Object.freeze({footprints,draw});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.SnakeVirages=api;
})(typeof window!=='undefined'?window:globalThis);

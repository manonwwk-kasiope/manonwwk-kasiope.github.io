(() => {
  'use strict';
  const eras = [
    { year:1976, bits:2, kind:'relay', name:'Relais binaire', verb:'Traverse le relais dans la direction de la flèche.' },
    { year:1985, bits:4, kind:'coil', name:'Bobine inductive', verb:'Fais traverser la bobine par ta tête, puis par le troisième segment.' },
    { year:1995, bits:8, kind:'switch', name:'Double aiguillage', verb:'Avance sur 1, puis vire vers 2 pour dévier le train lumineux.' },
    { year:2185, bits:16, kind:'phase', name:'Inversion orbitale', verb:'Change de plan à proximité du relais et frappe sur le plan d’arrivée.' },
    { year:2985, bits:32, kind:'shadow', name:'Ombre galactique', verb:'Entre dans l’ombre, puis ressors par un côté du cercle.' },
  ];
  const geometries = {
    orbit:'L’anneau frappe entre 1 et 4 cases de ta tête.',
    prism:'Le rayon frappe jusqu’à 7 cases dans ta direction.',
    well:'Le puits frappe dans un disque de 3,2 cases autour du relais.',
  };
  const routes = {
    echo:'Une frappe immédiate, puis deux impulsions retardées sur la même cible.',
    chain:'Trois impulsions rebondissent entre des cibles distantes de quatre cases au plus.',
    blast:'Les trois impulsions se répartissent entre les cibles proches du premier impact.',
  };
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  function describe(era,core,mod) {
    const e = eras.find(e=>e.year===era) || eras[era] || eras[0];
    return {name:e.name, gesture:e.verb, geometry:geometries[core], route:routes[mod]};
  }
  function attach(s) {
    return s.evolution ||= { marks:[], effects:[], pending:[], cooldown:0, activations:0, impulses:0, lastPlane:s.plane };
  }
  function createMark(s,data) {
    const e=attach(s);
    if (e.cooldown > 0 || e.marks.length || s.status !== 'playing') return;
    const d=s.direction, h=s.snake[0];
    const era=eras.find(e=>e.year===s.year) || eras[s.eraIndex] || eras[0];
    const forward = era.kind==='coil' || era.kind==='switch' ? 1 : 2;
    let dx=era.kind==='relay' ? -d.y : d.x, dy=era.kind==='relay' ? d.x : d.y;
    if (h.x + forward*dx < 0 || h.x + forward*dx >= s.width) dx=-dx;
    if (h.y + forward*dy < 0 || h.y + forward*dy >= s.height) dy=-dy;
    const m={ x:clamp(h.x+forward*dx,0,s.width-1), y:clamp(h.y+forward*dy,0,s.height-1),
      plane:data.plane, dx,dy, core:data.core,mod:data.mod,era:s.eraIndex,
      kind:era.kind,life:4,maxLife:4,radius:1,entered:false };
    if(m.kind==='switch') {
      m.first={x:m.x,y:m.y,plane:m.plane};
      m.inX=dx; m.inY=dy;
      m.dx=-dy; m.dy=dx;
      if(m.x+m.dx<0 || m.x+m.dx>s.width-1 || m.y+m.dy<0 || m.y+m.dy>s.height-1) {
        m.dx=-m.dx; m.dy=-m.dy;
      }
      m.x+=m.dx; m.y+=m.dy;
    }
    if(e.lastAnchor && distance(m,e.lastAnchor)<2.25) return;
    e.marks.push(m);
  }
  function wrap(s,hooks) {
    return {...hooks, emit(type,data) { hooks.emit(type,data); if(type==='forgeShot') createMark(s,data); }};
  }
  function eligible(s,m,h) {
    const p=s.snake[0], dir=s.direction;
    const origin=m.core==='well'?{...m,plane:s.plane}:{...p,plane:s.plane};
    return h.targets().filter(t => {
      if(!h.visible(origin,t)) return false;
      const r=distance(t,origin), x=t.x-origin.x, y=t.y-origin.y;
      if(m.core==='orbit') return r>=1 && r<=4;
      if(m.core==='prism') {
        const ahead=x*dir.x+y*dir.y, lateral=Math.abs(x*dir.y-y*dir.x);
        return ahead>=0 && ahead<=7 && lateral<=1.15;
      }
      return r<=3.2;
    }).sort((a,b)=>distance(a,origin)-distance(b,origin));
  }
  function impulse(s,h,target,origin,m) {
    if(s.status!=='playing' || !h.targets().includes(target) || !h.visible(origin,target)) return false;
    const e=s.evolution;
    h.damage(target,1);
    e.impulses++;
    e.effects.push({kind:m.mod,x:target.x,y:target.y,fromX:origin.x,fromY:origin.y,plane:origin.plane,life:.24,maxLife:.24,radius:1.2});
    h.emit('evolutionHit',{core:m.core,mod:m.mod,plane:origin.plane,x:target.x,y:target.y});
    return true;
  }
  function discharge(s,m,h) {
    const e=s.evolution, targets=eligible(s,m,h), start=targets[0];
    const origin={...m,plane:s.plane};
    e.activations++;
    e.cooldown=3.6;
    e.lastAnchor={x:m.x,y:m.y};
    h.emit('evolutionTrigger',{...origin,found:targets.length});
    if(m.kind==='switch') {
      e.effects.push({kind:'switchRail',fromX:m.first.x,fromY:m.first.y,x:m.x,y:m.y,plane:m.plane,life:.34,maxLife:.34,radius:1});
    }
    if(!start) return;
    impulse(s,h,start,origin,m);
    if(m.mod==='echo') {
      for(const delay of [.27,.54]) e.pending.push({delay,target:start,origin,m});
      return;
    }
    let anchor=start;
    const seen=new Set([start]);
    for(let i=1;i<3;i++) {
      const from={x:anchor.x,y:anchor.y,plane:origin.plane};
      const nearby=h.targets().filter(t=>h.visible(from,t) && distance(t,anchor)<=(m.mod==='chain'?4:2.5));
      nearby.sort((a,b)=>Number(seen.has(a))-Number(seen.has(b)) || distance(a,anchor)-distance(b,anchor));
      const next=nearby[0];
      if(!next) break;
      impulse(s,h,next,from,m); seen.add(next);
      if(m.mod==='chain') anchor=next;
    }
  }
  function trigger(s,m) {
    const p=s.snake[0], same=s.plane===m.plane, r=distance(p,m);
    if(m.kind==='switch') {
      if(!same) { m.entered=false; return false; }
      if(!m.entered) {
        if(distance(p,m.first)<=.48 && s.direction.x*m.inX+s.direction.y*m.inY>.65) m.entered=true;
        return false;
      }
      if(distance(p,m.first)>1.55) m.entered=false;
      return m.entered && r<=.48 && s.direction.x*m.dx+s.direction.y*m.dy>.65;
    }
    if(m.kind==='relay') return same && r<=.72 && m.dx*s.direction.x+m.dy*s.direction.y>.65;
    if(m.kind==='phase') return !same && s.evolution.lastPlane===m.plane && r<=2.1;
    if(same && r<=.74) m.entered=true;
    if(m.kind==='coil') {
      const tail=s.snake[2];
      return m.entered && same && tail && (tail.plane??0)===m.plane && distance(tail,m)<=.72 && r>=1.25;
    }
    return m.entered && same && r>=1.55 && Math.abs((p.x-m.x)*m.dy-(p.y-m.y)*m.dx)>=1.35;
  }
  function update(s,dt,h) {
    if(s.status!=='playing' || !Number.isFinite(dt) || dt<=0) return;
    const e=attach(s);
    e.cooldown=Math.max(0,e.cooldown-dt);
    for(const item of e.effects) item.life-=dt;
    e.effects=e.effects.filter(item=>item.life>0);
    for(const p of e.pending) p.delay-=dt;
    const due=e.pending.filter(p=>p.delay<=0); e.pending=e.pending.filter(p=>p.delay>0);
    for(const p of due) impulse(s,h,p.target,p.origin,p.m);
    const m=e.marks[0];
    if(m) {
      m.life-=dt;
      if(m.life<=0 || m.core!==s.forge.core || m.mod!==s.forge.mod || m.era!==s.eraIndex) e.marks.length=0;
      else if(trigger(s,m)) { e.marks.length=0; discharge(s,m,h); }
    }
    e.lastPlane=s.plane;
  }
  // Installation explicite dans la chambre : le moteur garde ses propres règles de dégâts.
  function install(forge) {
    if(forge.evolutionInstalled) return forge;
    const original=forge.update;
    return {...forge,evolutionInstalled:true,update(s,dt,h) { original(s,dt,wrap(s,h)); update(s,dt,h); }};
  }
  const api={describe,attach,wrap,update,install,eras};
  if(typeof window!=='undefined') window.SnakeEvolution=api;
  if(typeof module!=='undefined') module.exports=api;
})();

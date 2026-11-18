(() => {
  'use strict';
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const roles=[
    {id:'sentinelle',name:'Sentinelle',glyph:'viseur',hint:'La bande se verrouille. Quitte la voie ou détruis le viseur.'},
    {id:'equarrisseur',name:'Équarrisseur',glyph:'ciseaux',hint:'Il coupe devant ta tête. Suis l’ouverture ou plonge.'},
    {id:'sillage',name:'Chasseur de sillage',glyph:'chevrons',hint:'Il chasse dans la profondeur voisine. Lis le sillage avant de plonger.'},
    {id:'portier',name:'Gardien de porte',glyph:'portique',hint:'La cellule est gardée. Contourne le portique ou brise son émetteur.'},
  ];
  const colors={1976:'#aaff84',1985:'#ff65ca',1995:'#ffbd43',2185:'#56d9ff',2985:'#bd87ff'};
  const key=(s,x,y)=>y*s.width+x, dist=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.y-q.y);
  const inside=(s,x,y)=>x>=0&&y>=0&&x<s.width&&y<s.height;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const config={
    temoin:{},balises:{period:8.0,decay:.48,active:.68,width:0},maillage:{period:6.6,decay:.43,active:1.15,width:1}
  };
  function emit(s,type,data={}){
    if(s.events.length>=96)s.events.shift();
    s.events.push({type,...data});
  }
  function init(s,options={}){
    if(s.ecologie)return s.ecologie;
    s.ecologie={variant:options.variant||'maillage',shield:options.shield!==false,spent:false,wave:null,
      due:4.5,seq:0,protectedUntil:0,serial:0};
    return s.ecologie;
  }
  function settings(s,variant){
    const c=config[variant],n=s.difficulty;
    return {period:c.period-c.decay*(n-1),warning:1.40+.032*(n-1),active:c.active+.065*(n-1),
      depth:Math.min(4,1+Math.floor((n-1)/2)),width:c.width+(n>=5?1:0)+(n>=9?1:0)};
  }
  function limits(s,emitter){
    const plane=s.plane,walls=new Set();
    for(const p of s.snake.slice(1))if(p.plane===plane)walls.add(key(s,p.x,p.y));
    for(const d of s.drones)if(d.plane===plane)for(const p of [d,d.next])walls.add(key(s,p.x,p.y));
    if(emitter?.plane===plane)walls.add(key(s,emitter.x,emitter.y));
    if(s.boss?.plane===plane)for(const p of [s.boss,s.boss.next]){
      for(let x=p.x-1;x<=p.x+1;x++)for(let y=p.y-1;y<=p.y+1;y++)walls.add(key(s,x,y));
    }
    if(s.boss?.attack?.plane===plane)for(const k of s.boss.attack.danger)walls.add(k);
    return walls;
  }
  // Search for a simple cardinal path; an unproven candidate is discarded.
  function certificate(s,mask,plane,length,emitter){
    const walls=limits(s,emitter),h=s.snake[0],path=[],used=new Set([key(s,h.x,h.y)]);
    let fuel=600;
    function walk(x,y,dx,dy){
      if(path.length===length)return true;
      if(--fuel<0)return false;
      const options=dirs.filter(([vx,vy])=>vx*dx+vy*dy>=0).sort((a,b)=>{
        const space=v=>Math.min(x+v[0],s.width-1-x-v[0],y+v[1],s.height-1-y-v[1]);
        return space(b)-space(a);
      });
      for(const [vx,vy] of options){
        const xx=x+vx,yy=y+vy,k=key(s,xx,yy);
        if(!inside(s,xx,yy)||walls.has(k)||used.has(k)||(plane===s.plane&&mask.has(k)))continue;
        used.add(k);path.push({x:xx,y:yy,plane:s.plane});
        if(walk(xx,yy,vx,vy))return true;
        path.pop();used.delete(k);
      }
      return false;
    }
    return walk(h.x,h.y,s.direction.x,s.direction.y)?path:null;
  }
  function geometry(s,role,c){
    const h=s.snake[0],{x:dx,y:dy}=s.direction,project=Math.max(3,Math.round(c.warning/s.stepTime));
    let anchor=h,plane=s.plane;
    if(role.id==='portier')anchor=s.cells.filter(p=>p.plane===s.plane).sort((a,b)=>dist(a,h)-dist(b,h))[0]||h;
    if(role.id==='sillage'){
      plane=1-plane;
      anchor=s.snake.find(p=>p.plane===plane)||h;
    }
    const side=s.ecologie.seq%2?1:-1;
    const marks=[],mask=new Set();
    for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
      const u=(x-anchor.x)*dx+(y-anchor.y)*dy,v=(y-anchor.y)*dx-(x-anchor.x)*dy;
      let hit;
      switch(role.id){
        case 'sentinelle':hit=Math.abs(v)<=c.width && u>=2 && u<=project+7+s.difficulty;break;
        case 'equarrisseur':hit=u>=project-2&&u<=project+1+c.width&&Math.abs(v)<=6+c.width&&Math.abs(v-3*side)>1;break;
        case 'sillage':hit=u>=-1&&u<=project+5&&Math.abs(v-side*Math.floor(Math.max(0,u)/4))<=1+c.width;break;
        case 'portier':hit=Math.abs(u)<=2+c.width&&Math.abs(v)<=3+c.width&&!(v*side>=1&&Math.abs(u)>0);break;
      }
      if(hit){mask.add(key(s,x,y));marks.push({x,y,plane});}
    }
    return {mask,marks,plane};
  }
  function propose(s){
    const eco=s.ecologie,c=settings(s,eco.variant),role=roles[eco.seq%c.depth];
    eco.seq++;
    const {mask,marks,plane}=geometry(s,role,c);
    if(marks.length<3)return false;
    const h=s.snake[0];
    const emitter=marks.filter(p=>dist(p,h)>=4 && !s.snake.some(q=>p.plane===q.plane&&p.x===q.x&&p.y===q.y)
      && !s.cells.some(q=>p.plane===q.plane&&p.x===q.x&&p.y===q.y)
      && !s.drones.some(q=>p.plane===q.plane&&(dist(p,q)===0||dist(p,q.next)===0))
      && !(s.boss?.plane===plane&&Math.max(Math.abs(p.x-s.boss.x),Math.abs(p.y-s.boss.y))<=2))
      .sort((a,b)=>Math.abs(dist(a,h)-6)-Math.abs(dist(b,h)-6))[0];
    if(!emitter)return false;
    const length=Math.ceil((c.warning+c.active+s.stepClock)/s.stepTime)+1;
    const path=certificate(s,mask,plane,length,emitter);
    if(!path)return false;
    const d={...emitter,ecoRole:role.id,id:s.nextId++,next:emitter,warmup:0,moveEvery:Infinity,moveIn:Infinity};
    s.drones.push(d);
    eco.wave={...role,serial:++eco.serial,plane,mask,tiles:marks,path,emitter:d,phase:'warning',
      remaining:c.warning,total:c.warning,active:c.active,difficulty:s.difficulty,boss:s.boss};
    emit(s,'ecoWarning',{role:role.id,plane,serial:eco.serial,seconds:c.warning,tiles:marks.length,opening:length});
    return true;
  }
  function end(s,type){
    const e=s.ecologie,w=e.wave;
    s.drones=s.drones.filter(d=>d!==w.emitter);
    emit(s,type,{role:w.id,serial:w.serial,plane:w.plane});
    e.wave=null;e.due=s.elapsed+settings(s,e.variant).period;
  }
  function absorb(s){
    const e=s.ecologie;
    if(!e.shield||e.spent||s.snake.length<7||!['Mur','Ta propre queue'].includes(s.cause))return;
    const saved=s.snake,shorter=saved.slice(0,-2);
    s.snake=shorter;
    const mask=e.wave?.phase==='active'?e.wave.mask:new Set(),plane=e.wave?.plane??s.plane;
    const path=certificate(s,mask,plane,3,null);
    if(!path){s.snake=saved;return;}
    const cause=s.cause;
    s.events=s.events.filter(v=>v.type!=='death');s.effects=s.effects.filter(v=>v.kind!=='death');
    s.cause='';s.status='playing';s.progress=s.stepClock=0;s.previousSnake=shorter.slice();
    s.direction={x:path[0].x-shorter[0].x,y:path[0].y-shorter[0].y};s.turns.length=0;
    e.spent=true;e.protectedUntil=s.elapsed+1.5;
    s.novaRadius=Math.min(37,s.novaRadius-.62);
    emit(s,'ecoAbsorb',{cause,lost:2,remaining:shorter.length});
  }
  function advance(s,dt){
    const e=s.ecologie;
    if(s.status==='dead'){absorb(s);return;}
    const w=e.wave;
    if(e.variant==='temoin'||s.status!=='playing')return;
    if(w){
      if(s.flight||w.boss!==s.boss){end(s,'ecoCancel');return;}
      if(!s.drones.includes(w.emitter)){end(s,'ecoKill');return;}
      w.remaining-=dt;
      if(w.remaining<=0){
        if(w.phase==='active'){end(s,'ecoEvade');return;}
        w.phase='active';w.remaining=w.total=w.active;
        emit(s,'ecoActive',{role:w.id,serial:w.serial});
      }
      const h=s.snake[0];
      if(w.phase==='active'&&w.plane===s.plane&&w.mask.has(key(s,h.x,h.y))){
        s.status='dead';s.cause=w.name;s.progress=1;s.turns.length=0;
        s.effects.push({...h,kind:'death',life:.65,maxLife:.65,radius:2});
        emit(s,'death',{...h,cause:w.name,role:w.id});
      }
    } else if(s.elapsed>=Math.max(e.due,e.protectedUntil)&&!s.flight){
      if(!propose(s))e.due=s.elapsed+.45;
    }
  }
  function tick(s,dt,next,options){
    if(!Number.isFinite(dt)||dt<=0)return;
    init(s,options);
    while(dt>1e-9&&s.status==='playing'){
      const slice=Math.min(dt,1/60);
      const e=s.ecologie,h=s.snake[0],dir=s.turns[0]||s.direction;
      const body=e.wave?.emitter, willMove=!s.flight&&s.stepClock+slice+1e-10>=s.stepTime;
      const x=h.x+dir.x,y=h.y+dir.y;
      // Crossing the transmitter is harmless. Weapons can still destroy it between steps.
      const cross=willMove&&body&&body.plane===s.plane&&body.x===x&&body.y===y&&s.drones.includes(body);
      if(cross)s.drones=s.drones.filter(d=>d!==body);
      if(willMove&&s.elapsed<e.protectedUntil&&(!inside(s,x,y)||s.snake.slice(0,-1).some(p=>p.plane===s.plane&&p.x===x&&p.y===y))){
        const safe=certificate(s,e.wave?.mask||new Set(),e.wave?.plane??s.plane,3,null);
        if(safe){s.direction={x:safe[0].x-h.x,y:safe[0].y-h.y};s.turns.length=0;}
      }
      next(s,slice);
      if(cross&&e.wave?.boss===s.boss)s.drones.push(body);
      advance(s,slice);dt-=slice;
    }
  }
  function read(s){
    const w=s.ecologie?.wave;
    return w?{role:w.id,name:w.name,glyph:w.glyph,hint:w.hint,tint:colors[s.year],plane:w.plane,phase:w.phase,
      remaining:w.remaining,total:w.total,tiles:w.tiles,opening:w.path,emitter:w.emitter,serial:w.serial}:null;
  }
  window.SnakeEcologie={init,tick,read,settings};
})();

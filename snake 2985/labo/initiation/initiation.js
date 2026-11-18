(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.SnakeInitiation=api;})(globalThis,function(){
  const models=['actuel','corridor','facultatif'];
  const eq=(a,b)=>a && b && a.x===b.x && a.y===b.y;
  const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  function create(model,cycle=0){
    if(!models.includes(model))throw Error('Départ inconnu');
    return {model,stage:cycle>0||model==='actuel'?'libre':'virage',t:0,route:null,cursor:0,
      prepared:false,resumeTurn:false,flew:false,shot:false,at:null,marks:[],startPlane:null};
  }
  function prepare(d){
    if(d.model!=='facultatif'||d.stage!=='virage'||d.t!==0)return false;
    d.prepared=true;return true;
  }
  function square(s){
    const o=s.snake[0], d=s.direction;
    for(const k of [-1,1]){
      const p=(i,j)=>({x:o.x+i*d.x-j*k*d.y,y:o.y+i*d.y+j*k*d.x,plane:s.plane});
      const route=[[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1],[0,0]].map(([i,j])=>p(i,j));
      const clear=route.slice(0,-1).every(t=>t.x>=1&&t.y>=1&&t.x<s.width-1&&t.y<s.height-1 &&
        !s.snake.slice(1).some(b=>eq(t,b)&&b.plane===s.plane) &&
        !s.drones.some(b=>b.plane===s.plane&&(eq(t,b)||eq(t,b.next)))&& !eq(t,s.flightGate));
      if(clear)return route;
    }
    return null;
  }
  function dismiss(d){d.stage='libre';d.at=null;d.marks=[];}
  function update(d,s,dt,events=[]){
    if(s.status!=='playing'||d.stage==='libre')return;
    d.t+=dt;if(d.t>=60||s.boss){dismiss(d);return;}
    const h=s.snake[0];d.startPlane??=s.plane;
    d.shot ||=events.some(e=>e.type==='forgeShot');
    if(d.stage==='virage' && d.model==='facultatif' && s.flight){
      if(!d.prepared){dismiss(d);return;}
      d.resumeTurn=true;d.at=null;d.marks=[];return;
    }
    if(d.stage==='virage' && d.resumeTurn){
      if(!d.landing){
        const v=s.direction, choices=[{x:-v.y,y:v.x},{x:v.y,y:-v.x}];
        const safe=choices.find(n=>[1,2].every(i=>{
          const p={x:h.x+n.x*i,y:h.y+n.y*i};
          return p.x>=1&&p.y>=1&&p.x<s.width-1&&p.y<s.height-1 &&
            !s.snake.some(b=>eq(b,p)&&b.plane===s.plane)&&!s.drones.some(b=>eq(b,p)&&b.plane===s.plane);
        }));
        if(!safe){dismiss(d);return;}
        d.landing={x:h.x+safe.x*2,y:h.y+safe.y*2,plane:s.plane};d.arrivalDir={...v};
      }
      if(s.direction.x*d.arrivalDir.x+s.direction.y*d.arrivalDir.y===0){d.stage='forge';d.turnedAt=d.t;}
    }else if(d.stage==='virage'){
      if(s.direction.y!==0){
        if(d.model==='facultatif' && (s.direction.y>0||h.x<9||h.x>16)){dismiss(d);return;}
        d.stage='forge';d.turnedAt=d.t;
      }
      else if(d.model==='facultatif' && h.x>16 && !d.prepared){dismiss(d);return;}
    }
    if(d.stage==='forge' && d.shot && d.t-d.turnedAt>=.75)d.stage='plan';
    if(d.stage==='plan' && s.plane!==d.startPlane)d.stage='cellule';
    if(d.stage==='cellule' && s.flightGate)d.stage='porte';
    if(d.stage==='porte' && s.flightGate && s.flightGate.plane!==s.plane)d.stage='retour';
    if(d.stage==='retour' && s.flightGate?.plane===s.plane)d.stage='porte';
    if(s.flight){d.flew=true;d.stage='anneau';}
    if(d.stage==='anneau' && !s.flight && d.flew)d.stage='croissance';
    if(d.stage==='croissance' && s.snake.length>=9 && !s.flight){
      d.route=square(s);if(d.route){d.cursor=0;d.stage='boucle';}
    }
    if(d.stage==='boucle'){
      if(s.knot?.closures){dismiss(d);return;}
      if(eq(h,d.route[d.cursor]))d.cursor++;
      if(d.cursor>=d.route.length){dismiss(d);return;}
    }
    const nearest=s.cells.filter(c=>c.plane===s.plane).sort((a,b)=>dist(h,a)-dist(h,b))[0];
    const fork=d.model==='corridor'?{x:13,y:12,plane:d.startPlane}:d.landing||{x:Math.max(10,Math.min(16,h.x)),y:7,plane:d.startPlane};
    const targets={virage:fork,forge:null,retour:s.flightGate,plan:{...h,plane:1-d.startPlane},cellule:nearest,porte:s.flightGate,
      anneau:s.flight?.rings[s.flight.passed],croissance:nearest,boucle:d.route?.[d.cursor]};
    d.at=targets[d.stage]||null;
    if(d.stage==='virage' && d.model==='facultatif' && !d.landing){
      d.marks=Array.from({length:8},(_,i)=>({x:9+i,y:8,plane:d.startPlane}));return;
    }
    d.marks=d.stage==='boucle'&&d.model==='corridor'?d.route.slice(d.cursor):[d.at].filter(Boolean);
  }
  function cue(d,s){
    if(d.stage==='libre'||s.status!=='playing'||(d.stage==='virage'&&s.flight))return null;
    const knot=s.knot?.preview;
    if(d.stage==='boucle' && knot)return {shape:'loop',text:'Fermer · 28 % de nova',at:knot.crossing,plane:knot.plane,marks:knot.points};
    const hints={virage:['corner',''],forge:['orbit',s.forge?.core==='orbit'?'Satellites déployés':'Arme en action'],
      plan:['layers','Passe sur l’autre plan'],retour:['layers','Porte sur l’autre plan'],
      cellule:['diamond',''],porte:['gate',''],anneau:['ring',''],croissance:['diamond',''],
      boucle:['stitch','Dessine la boucle']};
    const [shape,text]=hints[d.stage];return {shape,text,at:d.at,marks:d.marks};
  }
  function drawFork(ctx,signal,project,ink='#fff4bd'){
    if(signal?.shape!=='corner'||!signal.marks?.length)return;
    const marks=signal.marks;
    const stroke=(a,b)=>{const p=project(a),q=project(b);ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);};
    ctx.save();ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();
    if(marks.length>1){
      stroke(marks[0],marks[marks.length-1]);
      for(const p of marks)stroke(p,{...p,y:p.y+.36});
    }else{
      const p=marks[0];stroke({...p,x:p.x-.4},p);stroke(p,{...p,y:p.y+.4});
    }
    ctx.stroke();ctx.restore();
  }
  return {models,create,prepare,update,cue,drawFork,dismiss};
});

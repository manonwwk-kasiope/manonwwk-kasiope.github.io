/* La borne d'attraction illustre les combats avec le dessinateur du jeu.
   Aucun appel au moteur, au stockage, au lecteur ni aux commandes de la partie. */
(() => {
  'use strict';

  const YEARS = [1976, 1985, 2185, 2985];
  const INK = {
    1976: ['#bbffbf', '#e8c982', '#347c69'],
    1985: ['#ffc5d1', '#ff947d', '#9d62c5'],
    2185: ['#b9fff4', '#77bedf', '#657aa8'],
    2985: ['#f5cff6', '#d898ed', '#9276d4']
  };
  const SPAN = 6.8;
  const TAU = Math.PI * 2;
  const sessions = new WeakMap();
  const limit = x => Math.min(1, Math.max(0, x));
  const screen = value => 20*(value+.5);

  function readRoute(corners) {
    const path = [];
    corners.forEach(([x,y], i) => {
      const [tx,ty] = corners[(i+1)%corners.length];
      const dx = Math.sign(tx-x), dy = Math.sign(ty-y);
      const length = Math.abs(tx-x)+Math.abs(ty-y);
      for(let k=0;k<length;k++) path.push({x:x+dx*k,y:y+dy*k});
    });
    return path;
  }

  // Le serpent contourne la coque de trois cases ; sa trajectoire reste cardinale.
  const routes = [
    readRoute([[2,6],[13,6],[13,4],[21,4],[21,2],[30,2],[30,7],[9,7],[9,8],[2,8]]),
    readRoute([[2,6],[12,6],[12,3],[21,3],[21,1],[30,1],[30,8],[6,8],[6,7],[2,7]]),
    readRoute([[2,5],[12,5],[12,4],[22,4],[22,1],[31,1],[31,8],[7,8],[7,7],[2,7]]),
    readRoute([[3,7],[14,7],[14,3],[22,3],[22,1],[31,1],[31,8],[8,8],[8,9],[3,9]])
  ];

  function ray(a,b,kind,life) {
    return {x:a.x,y:a.y,toX:b.x,toY:b.y,kind,life,maxLife:1};
  }

  function drone(x,y,id) {
    return {x,y,next:{x,y},id,warmup:0,moveIn:1,moveEvery:1};
  }

  function illustration(era, t) {
    const year = YEARS[era], route=routes[era];
    const speed=era===0?6:6.7+era*.42;
    const travelled=3+t*speed, step=Math.floor(travelled), progress=travelled-step;
    const index=k=>(k%route.length+route.length)%route.length;
    const at=k=>route[index(k)];
    const head=at(step), prev=at(step-1);
    const count=era===0?9:11+era;
    const snake=Array.from({length:count},(_,i)=>at(step-i));
    const previousSnake=Array.from({length:count},(_,i)=>at(step-i-1));
    const direction={x:head.x-prev.x,y:head.y-prev.y};
    const foes=[drone(32,4,1),drone(33,8,2),drone(12,11,3)];
    const boss={x:26,y:4,next:{x:26,y:4},kind:era%2===0?'mid':'final',
      hp:Math.max(1,Math.ceil(42*(1-t/SPAN))),maxHp:42,weak:t>3.7,stun:0,attack:null};
    const shots=[],effects=[];
    // Salve frontale, rebond sur le flanc du gardien puis sur deux drones.
    const cadence=(t+.32)%1.65, puissance=limit(1-cadence/.52);
    if(puissance>0){
      const portee=era===0?5:10;
      const bout={x:Math.min(35,Math.max(0,head.x+direction.x*portee)),y:Math.min(17,Math.max(0,head.y+direction.y*portee))};
      shots.push(ray(head,bout,'rail',puissance));
    }
    const chaine=(t+.05)%2.55;
    if(chaine>.45 && chaine<1.05){
      const pts=[head,boss,foes[0],foes[1]];
      for(let k=0;k<3;k++){
        const age=chaine-.45-k*.075;
        if(age>=0 && age<.39) shots.push(ray(pts[k],pts[k+1],'arc',1-age/.39));
      }
    }
    let impact=null;
    if(t>3.35 && t<5.1){
      const p=(t-3.35)/1.75;
      effects.push({x:boss.x,y:boss.y,kind:'nova',radius:3.3+era*.52,life:1-p,maxLife:1});
      effects.push({x:boss.x,y:boss.y,kind:'bossHit',radius:1,life:1-p,maxLife:1});
      impact=p;
    }
    return {state:{width:36,height:18,year,sector:era+1,nearBoss:0,boss,snake,previousSnake,
      progress,direction,cells:[{x:5,y:2},{x:32,y:10}],drones:foes,shots,effects,levels:{rail:2,arc:2,nova:2},
      turbo:t>2&&t<4.5,status:'attraction',elapsed:t},impact};
  }

  function brush(canvas) {
    const c=canvas.getContext('2d');
    c.save();c.setTransform(canvas.width/720,0,0,canvas.height/360,0,0);
    c.lineCap='round';c.lineJoin='round';return c;
  }

  function blowout(c,boss,p,year) {
    if(p===null)return;
    const palette=INK[year], originX=screen(boss.x),originY=screen(boss.y);
    c.save();c.translate(originX,originY);
    const expansion=1-Math.pow(1-p,2),r=28+69*expansion;
    // Des filaments de plasma roulent autour de la cuirasse et se détachent.
    c.globalAlpha=Math.sin(Math.PI*p)*.8;
    for(let i=0;i<10;i++){
      const a=TAU*i/10+(i%2?.18:-.09), n=a+.26*(1-p), z=a+.47*p;
      c.beginPath();c.moveTo(Math.cos(a)*24,Math.sin(a)*16);
      c.bezierCurveTo(Math.cos(n)*r*.6,Math.sin(n)*r*.5,Math.cos(z)*r,Math.sin(z)*r*.71,
        Math.cos(z+.09)*(r+11),Math.sin(z+.09)*(r*.70+7));
      c.strokeStyle=palette[i%2];c.lineWidth=i%3===0?2.15:1.1;c.stroke();
      c.fillStyle=palette[0];
      c.fillRect(Math.cos(z+.09)*(r+12)-1,Math.sin(z+.09)*(r*.70+8)-1,2.4,2.4);
    }
    c.restore();
  }

  function plaque(c,year) {
    c.save();c.translate(13,13);
    c.fillStyle='#0b1126ce';c.fillRect(0,0,105,29);
    c.fillStyle=INK[year][1];c.fillRect(0,3,2,20);
    c.fillStyle='#c3ced5';c.font='bold 8px monospace';c.fillText('DÉMO',10,18);
    c.fillStyle=INK[year][0];c.font='bold 19px monospace';c.fillText(String(year),47,21);
    c.restore();
  }

  function corridor(c,p,from,to,mini=false) {
    const centreX=mini?530:360, centreY=mini?90:168;
    const scale=mini?.65:1;
    c.save();c.translate(centreX,centreY);c.scale(scale,scale);
    const fade=Math.min(1,p*8,(1-p)*6);
    const depart=INK[from] || INK[1976], arrivee=INK[to] || INK[2985];
    // Chaque ellipse s’évase autour d’un point de fuite décentré.
    for(let i=0;i<6;i++){
      const q=limit((p*1.55)-i*.115);
      if(q<=0 || q>=1)continue;
      const r=9+144*q*q, y=(1-q)*-15, x=(1-q)*25;
      c.save();c.translate(x,y);c.rotate(-.39+.1*q);
      c.globalAlpha=Math.sin(q*Math.PI)*fade*.82;
      c.strokeStyle=i%2?arrivee[0]:depart[1];c.lineWidth=1.1+q*2;
      c.beginPath();c.ellipse(0,0,r,r*.59,0,.16+i*.2,4.8+i*.2);c.stroke();
      c.globalAlpha*=.55;c.strokeStyle=arrivee[2];c.lineWidth=1;
      c.beginPath();c.ellipse(0,0,r+5,r*.59+2,0,4.9+i*.2,6.2+i*.2);c.stroke();
      c.restore();
    }
    for(let j=0;j<18;j++){
      const a=j*TAU/18+.11*Math.sin(j*7.4),s=(j*.073+p*.85)%1;
      const radius=28+124*s*s,length=(3+14*p)*s;
      const ox=Math.cos(a),oy=Math.sin(a)*.74;
      c.globalAlpha=Math.sin(Math.PI*s)*fade*.72;
      c.strokeStyle=j%3?arrivee[1]:depart[0];c.lineWidth=.85+s;
      c.beginPath();c.moveTo(ox*radius,oy*radius);c.lineTo(ox*(radius+length),oy*(radius+length));c.stroke();
    }
    c.restore();
  }

  function routeLabel(c,from,to) {
    const y=233;
    c.save();c.font='bold 14px monospace';c.textAlign='center';
    c.fillStyle='#101121d9';c.fillRect(304,y-16,112,23);
    c.fillStyle=(INK[to] || INK[2985])[0];c.fillText(String(from)+' › '+String(to),360,y);
    c.restore();
  }

  function jump(canvas,progress,fromYear,toYear,reducedMotion=false) {
    if(!canvas || !Number.isFinite(progress) || progress<0 || progress>=1)return;
    const c=brush(canvas);
    if(!reducedMotion)corridor(c,progress,fromYear,toYear);
    routeLabel(c,fromYear,toYear);
    c.restore();
  }

  function draw(canvas,timeSec=0,reducedMotion=false) {
    if(!canvas || !window.SnakeRendu)return;
    let origine=sessions.get(canvas);
    if(origine===undefined || timeSec<origine){origine=timeSec;sessions.set(canvas,origine)}
    const horloge=reducedMotion?.68:Math.max(0,timeSec-origine);
    const ere=Math.floor(horloge/SPAN)%YEARS.length,t=horloge%SPAN;
    const scene=illustration(ere,t);
    window.SnakeRendu.draw(canvas,scene.state,t,reducedMotion);
    const c=brush(canvas);
    blowout(c,scene.state.boss,scene.impact,YEARS[ere]);plaque(c,YEARS[ere]);
    if(!reducedMotion && t>SPAN-.92)corridor(c,(t-SPAN+.92)/.92,YEARS[ere],YEARS[(ere+1)%YEARS.length],true);
    c.restore();
  }

  window.SnakeAttract=Object.freeze({draw,jump});
})();

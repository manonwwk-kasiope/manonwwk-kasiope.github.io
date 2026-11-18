/* Signes d'approche du gardien, peints dans le décor avant les deux plans. */
(() => {
  'use strict';
  const tau=2*Math.PI,clamp=x=>Math.max(0,Math.min(1,x));
  const wrap=x=>x-Math.floor(x);
  function line(c,pts,color,width){
    c.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i];if(i)c.lineTo(...p);else c.moveTo(...p);}
    c.lineWidth=width;c.strokeStyle=color;c.stroke();
  }
  function polygon(c,pts,ink){
    c.beginPath();c.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)c.lineTo(...pts[i]);c.closePath();c.fillStyle=ink;c.fill();
  }
  function phosphor(c,p,q,bar,s,cam,reduced){
    // La première voie du tube perd son verrou horizontal dans une fenêtre.
    const x=343+bar*23,w=33+p*117,delta=3+p*(8+q*14);
    c.save();c.beginPath();c.rect(x,49,w,35);c.clip();
    c.fillStyle='rgba(19,34,31,.88)';c.fillRect(x,49,w,35);
    for(let y=52;y<84;y+=12)line(c,[[x,y],[x+w,y]],'#3a5040',.8);
    const pts=[];
    for(let i=0;i<=w+2;i+=2){
      const phase=wrap((x+i-270+delta)*.014-(reduced?0:cam.time||0)*(.8+(s.nearBoss||0)*.6));
      const shock=Math.exp(-(((phase-.46)/.075)**2));
      pts.push([x+i,71+(5+8*p)*Math.sin(phase*tau)+shock*(15+9*q)*Math.sin(phase*tau*4)]);
    }
    line(c,pts,'#9bac80',2.1);line(c,[[x,54],[x,79]],'#bdc397',1.6);c.restore();
  }
  const facades=[
    [[143,75],[143,66],[151,66],[151,57],[158,57],[158,76]],
    [[163,76],[163,62],[172,62],[172,55],[177,55],[177,76]],
    [[181,78],[181,62],[187,62],[187,65],[194,65],[194,78]],
    [[198,81],[198,58],[205,58],[205,67],[210,67],[210,81]],
    [[213,84],[213,74],[220,74],[220,63],[226,63],[226,84]]];
  function blackout(c,p,q,bar){
    // Les fenêtres s'éteignent dans l'ordre du relais central vers les quartiers.
    for(let i=0;i<facades.length;i++){
      const dim=clamp((p*5.8+q*.85-i)*.84);
      if(dim===0)continue;
      c.save();c.globalAlpha*=dim*.90;polygon(c,facades[i],'#171b31');c.restore();
    }
    const y=8+p*(12+12*q);
    // Le courant quitte une bande des anneaux émetteurs, puis gagne la ville.
    c.save();c.globalAlpha*=.88*p;const band=12+(1-q)*29;
    polygon(c,[[162,band],[194,band],[197,band+4+p*5],[160,band+4+p*5]],'#192139');c.restore();
    line(c,[[179,y],[171,y+9],[187,y+9],[179,y]],'#629788',1.7);
    line(c,[[173,y+13],[185,y+13]],'#8d9e8e',1.1);
  }
  function signals(c,p,q,bar){
    // Trois palettes articulées suspendues à la traverse du quai.
    line(c,[[247,41],[247,46],[342,46],[342,41]],'#364353',3);
    for(let i=0;i<3;i++){
      const x=260+i*31,y=52,drop=clamp(p*1.42-i*.26),angle=.12+drop*(.72+.49*q);
      line(c,[[x,46],[x,y]],'#525765',2);
      c.save();c.translate(x,y);c.rotate(angle);
      polygon(c,[[-2,-4],[16,-4],[22,0],[17,4],[-2,4]],'#382c42');
      line(c,[[2,-1],[15,-1]],i===bar%3?'#ffda91':'#db935d',3);
      line(c,[[11,0],[15,0]],'#d4c4a0',2.2);c.restore();
    }
  }
  const panels=[[286,-8,44,9,4,24],[332,2,37,9,4,23],[417,21,32,10,5,21],[452,32,38,11,5,21]];
  function shutters(c,p,q,bar){
    // Obturateurs de modules sur l'arc d'assemblage. Les lames restent sur leur cadre.
    for(let i=0;i<panels.length;i++){
      const [x,y,w,rise,slant,h]=panels[i],amount=clamp(p*1.34-i*.1)*(.62+q*.36);
      if(amount<=0)continue;
      const point=(u,v)=>[x+u*w-v*slant,y+u*rise+v*h];
      for(let k=0;k<4;k++){
        const a=k/4,b=a+amount*.23;
        polygon(c,[point(0,a),point(1,a),point(1,b),point(0,b)],'#253543');
        line(c,[point(0,b),point(1,b)],'#93876e',1);
      }
    }
  }
  function lens(c,p,q,bar,s,cam){
    const painted=window.SnakeMatieres?.ready(2985);
    const cx=painted?602:570,cy=painted?92:79;
    c.translate(cx,cy);c.rotate(-.15);
    const rx=(painted?66:49)*(1-.18*p),ry=(painted?59:49)*(1-.14*p),swell=q*p*4;
    // Deux images tangentielles du bord supérieur de l'horizon des événements.
    for(let i=0;i<2;i++){
      c.beginPath();c.ellipse(0,1,rx+i*7+swell,ry+i*4+swell*.7,0,Math.PI*(1.03+i*.11),Math.PI*(1.86-i*.05));
      c.strokeStyle=i?'#bd7e92':'#eab08b';c.lineWidth=i?1.15:1.5+p*1.6;c.stroke();
    }
  }
  const signs={1976:phosphor,1985:blackout,1995:signals,2185:shutters,2985:lens};
  function draw(c,s,cam,reduced=false){
    const near=s.nearBoss;
    if(!(near>.38)||s.status!=='playing'||!signs[s.year]||s.flight||s.boss?.attack||s.ecologie?.wave||s.director?.offer)return;
    const t=clamp((near-.38)/.62),p=t*t*(3-2*t)*(s.boss ? .55 : 1);
    const sampled=!reduced&&s.beat?.playing!==false&&Number.isFinite(s.beat?.phase);
    const phase=sampled?clamp(s.beat.phase):.5,beat=sampled?(s.beat.beat||0):0;
    // Mouvement continu à chaque noire, même quand l'horloge musicale est muette.
    const q=.5+.5*Math.cos(tau*phase),ink=(.20+.8*p)*(reduced?.78:1);
    const project=window.SnakeSpectacle?.project;
    let y=83;
    if(project)for(const z of [0,1])for(const x of [-.5,35.5])y=Math.min(y,project(cam,x,-.5,z).y-30);
    if(y<4)return;
    c.save();c.beginPath();c.rect(0,0,960,y);c.clip();c.globalAlpha*=ink;
    signs[s.year](c,p,q,beat,s,cam,reduced);c.restore();
  }
  window.SnakePresage=Object.freeze({draw});
})();

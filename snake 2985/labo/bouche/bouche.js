/* Empreinte brève à la bouche au départ réel d'un tir de forge. */
(() => {
  'use strict';
  const shots=new WeakMap(),duration=.19;
  function event(s,e){
    if(e?.type!=='forgeShot')return;
    const {x,y,plane=0,core,mod}=e;
    if(!Number.isFinite(x)||!Number.isFinite(y)||!['echo','chain','blast'].includes(mod))return;
    const previous=shots.get(s);
    // L’écho différé repart de l’ancien point de tir et possède déjà son propre effet.
    if(mod==='echo'&&previous?.mod===mod&&previous.core===core&&previous.x===x&&previous.y===y&&previous.plane===plane&&s.elapsed-previous.start<.6)return;
    const d=s.direction;if(!d)return;
    shots.set(s,{x,y,plane,core,mod,dx:d.x,dy:d.y,start:s.elapsed});
  }
  function draw(c,s,cam,z,reduced,project){
    const hit=shots.get(s);if(!hit||hit.plane!==z||hit.core!==s.forge?.core||hit.mod!==s.forge?.mod||s.status!=='playing')return;
    const age=s.elapsed-hit.start;
    if(age<0||age>=duration||s.boss?.attack||s.ecologie?.wave)return;
    const a=project(cam,hit.x,hit.y,z),b=project(cam,hit.x+hit.dx,hit.y+hit.dy,z);
    const vx=b.x-a.x,vy=b.y-a.y,n=Math.hypot(vx,vy);if(n<1)return;
    const k=Math.max(.85,Math.min(1.25,a.k*cam.zoom)),dx=vx/n,dy=vy/n;
    // Hors du noyau du projectile, juste au-dessus de sa bouche projetée.
    const x=a.x+k*(18*dx+8*dy),y=a.y+k*(18*dy-8*dx);
    c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.scale(k,k);
    c.lineJoin='round';c.lineCap='round';c.beginPath();
    if(hit.mod==='echo'){
      for(const offset of [-3.5,2.8]){c.moveTo(offset-2,-4.6);c.quadraticCurveTo(offset+4,0,offset-2,4.6);}
    }else if(hit.mod==='chain'){
      c.moveTo(-6.2,2.8);c.lineTo(-2.1,-3.9);c.lineTo(.4,2.1);c.lineTo(5.9,-3.4);
    }else{
      for(const [ex,ey] of [[3.7,-4.9],[6.4,0],[3.7,4.9]]){c.moveTo(-4.3,0);c.lineTo(ex,ey);}
    }
    c.strokeStyle='#15222b';c.lineWidth=4.6;c.stroke();c.strokeStyle=s.year===1976?'#dcf1ab':'#fff0c6';c.lineWidth=2.35;c.stroke();
    c.restore();
  }
  window.SnakeBouche=Object.freeze({event,draw});
})();

// La dernière image de l'époque quittée se défait devant la nouvelle chambre.
(() => {
  'use strict';
  const colors={1976:'#c6e89c',1985:'#ffaab7',1995:'#ffbf77',2185:'#9be0df',2985:'#d8b3f3'};
  let departure=null;
  function stop(canvas){
    departure=null;canvas.hidden=true;
  }
  function start(canvas,arena,from,to,reduced){
    stop(canvas);
    if(reduced||from===to||!arena.width||!arena.height)return;
    const still=document.createElement('canvas');
    still.width=Math.min(900,arena.width);
    still.height=Math.max(1,Math.round(still.width*arena.height/arena.width));
    still.getContext('2d').drawImage(arena,0,0,still.width,still.height);
    canvas.width=still.width;canvas.height=still.height;canvas.hidden=false;
    departure={still,from,to,start:performance.now()};
    draw(canvas,departure.start);
  }
  function draw(canvas,now){
    if(!departure)return;
    const {still,start,from,to}=departure;
    const f=Math.min(1,Math.max(0,(now-start)/740));
    if(f>=1){stop(canvas);return;}
    const w=canvas.width,h=canvas.height,c=canvas.getContext('2d');
    c.clearRect(0,0,w,h);
    const strips=16,step=Math.ceil(h/strips);
    for(let i=0;i<strips;i++){
      const y=i*step,sh=Math.min(step,h-y);if(sh<=0)break;
      const jitter=((i*7+from)%13)/13;
      const p=Math.max(0,Math.min(1,(f-jitter*.22)/.78));
      const dx=w*.75*p*p;
      c.globalAlpha=(1-p)*.89;
      c.drawImage(still,0,y,w,sh,dx,y,w,sh);
      c.fillStyle=i%2?colors[from]:colors[to];
      c.globalAlpha=4*p*(1-p)*.6;
      c.fillRect(dx,y,2+w*.014*(1-p),sh);
    }
    c.globalAlpha=1;
  }
  window.SnakePassage={start,draw,stop};
})();

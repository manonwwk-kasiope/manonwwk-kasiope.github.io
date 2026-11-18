'use strict';
const host=document.getElementById('host'),query=new URLSearchParams(location.search);
const variant=query.get('v')==='B'?'wheel':'cards';
const year=[1976,1985,1995,2185,2985].includes(+query.get('year'))?+query.get('year'):1976;
const status=['cleared','won'].includes(query.get('status'))?query.get('status'):'dead';
const start=SnakeArcade.create(()=>.25,SnakeArcade.eras.findIndex(e=>e.year===year));
start.drones=[];start.cells=[];start.spawnClock=start.gunClock=99;
const movie=SnakeReprise.create();movie.capture(start,0);
while(start.status==='playing'){SnakeArcade.tick(start,1/60);movie.capture(start,start.elapsed*1000);}
const range=movie.bounds(), reduced=matchMedia('(prefers-reduced-motion:reduce)');
let handle,request=0,position=range.start;
function paint(canvas,t){
  if(!canvas)return;
  const ctx=canvas.getContext('2d'),f=movie.frameAt(t);
  ctx.fillStyle='#0c1a28';ctx.fillRect(0,0,320,60);
  const anchor=movie.frameAt(range.end),offX=anchor.x-13;
  const x=p=>(p.x-offX)*14+20,y=p=>30+(p.y-anchor.y)*9;
  ctx.beginPath();ctx.moveTo(x(movie.frameAt(range.start)),y(movie.frameAt(range.start)));
  for(let time=range.start;time<=t;time+=45){const p=movie.frameAt(time);ctx.lineTo(x(p),y(p));}
  ctx.lineWidth=4;ctx.strokeStyle='#69b6a5';ctx.stroke();
  ctx.fillStyle='#d7fff0';ctx.fillRect(x(f)-3,y(f)-3,6,6);
  ctx.fillStyle='#ff9f83';ctx.fillRect(x(anchor)+7,2,3,56);
}
const records={1976:1920,1985:3250,1995:4520,2185:8700,2985:12540};
function stop(){cancelAnimationFrame(request);request=0;}
function demonstration(){
  host.replaceChildren();position=range.start;stop();
  handle=SnakeBifurcation.mount(host,{year,status,score:1470,records,
    cause:status==='dead'?'Impact contre le mur':'',boss:status!=='dead'?SnakeArcade.eras.find(e=>e.year===year).bosses[1]:'',
    durationMs:status==='dead'?range.end-range.start:0,drawReview:c=>paint(c,range.end)},
    {onReview({canvas}){
      stop();if(reduced.matches){position=position>=range.end?range.start:Math.min(range.end,position+250);paint(canvas,position);return;}
      const begin=performance.now();
      function play(now){position=Math.min(range.end,range.start+now-begin);paint(canvas,position);if(position<range.end)request=requestAnimationFrame(play);}
      request=requestAnimationFrame(play);
    },onJump:({year,cycle})=>done((cycle?'Nouveau cycle':'Destination')+' · '+year),onRetry:({year})=>done('Nouvel essai · '+year)},{variant});
}
function done(msg){
  stop();handle.destroy();const box=document.createElement('div');box.className='demo-end';
  const p=document.createElement('p');p.textContent=msg;
  const b=document.createElement('button');b.className='demo-return';b.textContent='Revoir le bilan';b.onclick=demonstration;
  box.append(p,b);host.append(box);
}
demonstration();

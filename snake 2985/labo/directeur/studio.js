const { initial,step,decor }=Directeur;
const canvas=document.querySelector('canvas'),g=canvas.getContext('2d');
const choix=document.querySelector('#prise'),keys=new Set();
const colors=['#72ffe4','#ff83db'], red='#ff745f',gold='#ffe19b';
const desc={gare:'L’ombre rouge annonce le convoi sur la grille rose. Décalez-vous ou montez sur la grille verte, puis revenez cueillir le losange dans son sillage.',mue:'Quittez le socle vert en y laissant votre mue. Atteignez la serrure rose pendant que le double alimente encore son tir.',colosse:'Sur le plan vert, sautez au passage du front circulaire. Suivez la diagonale sur le plan rose pour atteindre la sortie.'};
let s,drag=null,pulse=false,tape=null,idx=0,left=0,history=[];
function reset(scene,record) {
  s=initial(scene); tape=record?.trace; idx=0;left=tape?.[0][0]||0;history=[];drag=null;pulse=false;keys.clear();
  document.querySelector('#aide').textContent=desc[scene];
  for(const b of document.querySelectorAll('[data-s]')) b.setAttribute('aria-pressed',String(b.dataset.s===scene));
  draw();
}
function select(scene) {
  choix.replaceChildren(new Option('Je joue',''));
  for(const r of Prises.filter(r=>r.scene===scene)) choix.add(new Option(r.choix,r.choix));
  reset(scene);
}
for(const b of document.querySelectorAll('[data-s]')) b.onclick=()=>select(b.dataset.s);
function restart(){reset(s.scene,Prises.find(r=>r.scene===s.scene && r.choix===choix.value));}
choix.onchange=restart;document.querySelector('#reset').onclick=restart;
document.querySelector('#action').onclick=()=>pulse=true;
addEventListener('keydown',e=>{if(e.target.matches('select,summary')||!['ArrowUp','ArrowRight','ArrowDown','ArrowLeft',' '].includes(e.key))return;e.preventDefault();keys.add(e.key);if(e.key===' '&&!e.repeat)pulse=true;});
addEventListener('keyup',e=>keys.delete(e.key));addEventListener('blur',()=>{keys.clear();drag=null;});
function pos(x,y,z){const drift=s?Math.sin(s.t/90):0;return [58+x*540+y*66+drift*(z?14:-7),40+143*y+z*208+drift*(z?3:-2)];}
function finger(e){const b=canvas.getBoundingClientRect();return [(e.clientX-b.left)*720/b.width,(e.clientY-b.top)*460/b.height];}
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);const [x,y]=finger(e);drag={x,y,dx:0,dy:0};};
canvas.onpointermove=e=>{if(!drag)return;const [x,y]=finger(e);drag.dx=(x-drag.x)/48;drag.dy=(y-drag.y)/48;};
canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
function tick(){
  let a;
  if(tape){ if(!tape[idx])return;const [,dx,dy,action]=tape[idx];a={dx,dy,action};if(!--left)left=tape[++idx]?.[0]||0; }
  else a={dx:drag?.dx||(+keys.has('ArrowRight')-keys.has('ArrowLeft')),dy:drag?.dy||(+keys.has('ArrowDown')-keys.has('ArrowUp')),action:pulse};
  pulse=false;history.unshift([s.x,s.y,s.z]);history.length=Math.min(history.length,22);s=step(s,a);
}
function path(points,c,width=2,close=false,fill=false) {
  g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(close)g.closePath();g.strokeStyle=g.fillStyle=c;g.lineWidth=width;fill?g.fill():g.stroke();
}
function ring([x,y],r,c,width=2){g.beginPath();g.ellipse(x,y,r,r*.66,0,0,Math.PI*2);g.strokeStyle=c;g.lineWidth=width;g.stroke();}
function diamond([x,y],r,c,fill){path([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],c,2,true,fill);}
function draw(){
  const d=decor(s);g.fillStyle='#10091f';g.fillRect(0,0,720,460);
  for(let z=0;z<2;z++){
    const p=(x,y)=>pos(x,y,z), ink=colors[z];
    path([p(0,0),p(1,0),p(1,1),p(0,1)],z?'#2b1337':'#102b30',1,true,true);
    for(let i=0;i<=10;i++){path([p(i/10,0),p(i/10,1)],ink+'44',1);path([p(0,i/10),p(1,i/10)],ink+'44',1);}
    if(s.scene==='gare'){
      if(z===1 || d.f<60) {
        const yy=d.voie;
        for(const v of [-.1,.1])path([p(0,yy+v),p(1,yy+v)],red+(z?'bb':'65'),2);
        for(let i=0;i<8;i++){const x=(i/8+d.phase*.07)%1;path([p(x,yy-.04),p(x+.023,yy),p(x,yy+.04)],red+'99');}
      }
      if(z===1){g.save();g.beginPath();[p(0,0),p(1,0),p(1,1),p(0,1)].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();
        for(let i=0;i<4;i++){const x=d.train-i*.09;path([p(x-.05,d.voie-.07),p(x+.039,d.voie-.07),p(x+.06,d.voie),p(x+.04,d.voie+.07),p(x-.05,d.voie+.07)],red,2,true,true);}
        if(s.prix!==d.manche && d.f>60)diamond(p(d.train-.46,d.voie),11,gold,true);g.restore();}
    } else if(s.scene==='mue'){
      ring(p(z?.72:.32,d.voie),23,z?gold:ink,4);
      if(s.double && s.double.z===z){
        diamond(p(s.double.x,s.double.y),12,ink,false);
      }
    } else if(z===0){
      const c=p(.12,.8);ring(c,24,red,5);
      if(d.f>=60)path(Array.from({length:97},(_,i)=>p(.12+Math.cos(i*Math.PI/48)*d.rayon,.8+Math.sin(i*Math.PI/48)*d.rayon)),red,3);
    } else {
      path([p(.12,.722),p(.88,.228)],s.ride?gold:ink+'88',s.ride?9:3);diamond(p(.80,.28),13,gold,false);
    }
    const head=p(s.x,s.y);
    if(z===s.z){history.filter((_,i)=>i%3===0).reverse().forEach(([x,y,h],i)=>{if(h===z)ring(p(x,y),4+i,ink,3);});
      diamond(head,12,s.protection?red:'#fff',true);ring(head,17+8*(1-d.phase),s.attente?gold:'#fff9');}
    else diamond(head,9,'#ffffff70',false);
  }
  if(s.scene==='mue' && s.double?.z===0 && Math.hypot(s.double.x-.32,s.double.y-d.voie)<.115)
    path([pos(s.double.x,s.double.y,0),pos(.72,d.voie,1)],gold+'bb',2+3*(1-d.phase));
  if(s.scene==='gare' && d.f<60){
    const a=pos(.02,d.voie,0), b=pos(.02,d.voie,1), k=d.f/60;
    path([a,b],red+'77',2);diamond([a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k],6+4*k,red,true);
  }
  document.querySelector('#score').textContent=s.score+' pts · '+s.coups+' impacts';
  document.querySelector('#status').textContent=tape?(tape[idx]?'Lecture':'Prise terminée'):'';
}
select('gare');let last=0,acc=0;
function frame(t){acc+=Math.min(60,t-last);last=t;while(acc>=1000/60){tick();acc-=1000/60;}draw();requestAnimationFrame(frame);}
requestAnimationFrame(frame);

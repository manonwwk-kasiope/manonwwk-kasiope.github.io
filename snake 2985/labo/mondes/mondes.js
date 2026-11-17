/* Les quatre arrière-plans du laboratoire. Coordonnées logiques 960 × 440,
   secondes de simulation, cam.nearBoss de 0 à 1. Aucune dépendance ni média. */
(() => {
  'use strict';
  const W=960,H=440,TAU=2*Math.PI,wrap=(n,max)=>(n%max+max)%max;
  const tiles=new Map();
  function line(c,p,color,w=1,closed=false){
    c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    if(closed)c.closePath();c.strokeStyle=color;c.lineWidth=w;c.stroke();
  }
  function poly(c,p,fill,color,w=1){
    c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.closePath();c.fillStyle=fill;c.fill();if(color){c.strokeStyle=color;c.lineWidth=w;c.stroke();}
  }
  function ellipse(c,x,y,rx,ry,rotation,fill,color,w=1,a=0,b=TAU){
    c.beginPath();c.ellipse(x,y,rx,ry,rotation,a,b);
    if(fill){c.fillStyle=fill;c.fill();}if(color){c.strokeStyle=color;c.lineWidth=w;c.stroke();}
  }
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
  function sky(c,colors){
    const grad=c.createLinearGradient(0,0,0,H);for(const [p,v] of colors)grad.addColorStop(p,v);
    c.fillStyle=grad;c.fillRect(0,0,W,H);
  }
  function halo(c,x,y,r,stops){
    const g=c.createRadialGradient(x,y,0,x,y,r);for(const [p,col] of stops)g.addColorStop(p,col);
    rect(c,x-r,y-r,r*2,r*2,g);
  }
  function rnd(seed){return ()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);}
  function layer(key,w,h,fn){
    if(!tiles.has(key)){const el=document.createElement('canvas');el.width=w;el.height=h;fn(el.getContext('2d'));tiles.set(key,el);}
    return tiles.get(key);
  }
  function repeat(c,img,t,y=0){
    const x=-wrap(t,img.width);c.drawImage(img,x,y);c.drawImage(img,x+img.width,y);
  }
  function dots(c,t,count,limit,color,seed=7){
    const rand=rnd(seed);
    c.fillStyle=color;
    for(let i=0;i<count;i++){const x=rand()*W,y=rand()*limit,k=rand();c.fillRect(wrap(x-t*(.3+k),W),y,k>.92?1.8:.85,k>.92?1.5:.85);}
  }
  function terminal(c,t,cam,boss){
    c.drawImage(layer('rack',W,H,g=>{
      sky(g,[[0,'#131b1d'],[.24,'#2d3434'],[.46,'#233536'],[1,'#0a1319']]);
      for(let n=-1;n<7;n++){
        const x=n*180+22;
        poly(g,[[x,10],[x+159,10],[x+163,14],[x+163,152],[x+2,152],[x-2,148],[x-2,14]],'#2c3534','#63716a',1);
        rect(g,x+4,15,150,5,'#141e21');
        for(const dx of [6,153])for(const y of [14,146]){ellipse(g,x+dx,y,1.7,1.7,0,'#afafa0');line(g,[[x+dx-1,y],[x+dx+1,y]],'#343a39',.7);}
        for(let j=0;j<5;j++){rect(g,x+9,25+j*7,110,3,'#172123');rect(g,x+9,28+j*7,111,1,'#51645c');}
        for(let j=0;j<3;j++){
          const k=x+23+j*47;ellipse(g,k,94,12,12,0,'#171f21','#747766',1.8);
          ellipse(g,k,94,8.5,8.5,0,'#333c38','#596159',.8);
          line(g,[[k,94],[k+(j-1)*4,87]],'#d4c197',1.3);
        }
        for(let j=0;j<14;j++){rect(g,x+8+j*10,117,6,6,'#101a1b');rect(g,x+8+j*10,132,6,4,'#67745c');}
      }
      poly(g,[[266,17],[670,17],[696,37],[696,115],[674,134],[262,134],[243,117],[243,37]],'#4b5448','#a59d79',2.3);
      poly(g,[[269,25],[666,25],[683,41],[683,109],[668,125],[264,125],[255,112],[255,41]],'#101c1d','#282e28',4);
      halo(g,472,75,214,[[0,'#487044a6'],[1,'#18251d00']]);
      for(let x=267;x<679;x+=16)line(g,[[x,37],[x,114]],'#6f8c622c',.75);
      for(let y=40;y<115;y+=12)line(g,[[264,y],[674,y]],'#758e653a',.75);
      for(let j=0;j<9;j++){const y=180+j*24;line(g,[[0,y],[W,y]],'#43534a50');}
    }),0,0);
    const wave=[];
    for(let i=0;i<=402;i+=2){
      const phase=wrap(i*.014-t*(.8+boss*.6),1);
      const peak=Math.exp(-Math.pow((phase-.46)/.075,2));
      const y=77+(5+boss*9)*Math.sin(phase*TAU)+peak*(Math.sin(phase*TAU*4)*(16+boss*12));
      wave.push([270+i,y]);
    }
    line(c,wave,'#9cd57630',4);line(c,wave,boss>.62?'#f7cc83':'#badf93',1.4);
    const sweep=wrap(t*56,398);line(c,[[270+sweep,37],[270+sweep,113]],'#d6f49c4a',1.3);
    for(let n=0;n<7;n++)for(let i=0;i<14;i++){
      const k=wrap(i+n*3-Math.floor(t*3),14);
      if(k<(boss>.6?6:2))rect(c,n*180+30+i*10,117,6,5,boss>.6?'#eaa76c':'#becf8b');
    }
    // Papier enregistreur et galets synchronisés sous la baie.
    rect(c,0,154,W,14,'#242c29');line(c,[[0,157],[W,157]],'#818773',1.2);
    for(let i=-1;i<39;i++){const x=i*26+wrap(t*15+cam.look*3,26);rect(c,x,162,6,2,'#9b9879');}
  }
  function city(c,t,cam,boss){
    c.drawImage(layer('rain-sky',W,H,g=>{
      sky(g,[[0,'#181b37'],[.19,'#50405c'],[.32,'#a46679'],[.48,'#393250'],[1,'#10162b']]);
      halo(g,700,78,167,[[0,'#ef997eaa'],[1,'#db618800']]);
      g.save();g.beginPath();g.arc(698,76,46,0,TAU);g.clip();
      const disc=g.createLinearGradient(0,25,0,125);disc.addColorStop(0,'#fff0b3');disc.addColorStop(1,'#e99184');rect(g,647,26,103,59,disc);
      for(let y=87;y<124;y+=6)rect(g,647,y,103,Math.max(1,4.5-(y-87)*.09),disc);g.restore();
    }),0,0);
    const skyline=layer('tours',W,168,g=>{
      const r=rnd(2108);
      for(let pass=0;pass<2;pass++)for(let x=0;x<W;){
        const w=9+r()*24,h=(pass?17:6)+r()*(pass?92:70),y=164-h;
        poly(g,[[x,169],[x,y+6],[x+3,y+6],[x+3,y],[x+w-4,y],[x+w-4,y+4],[x+w,y+4],[x+w,169]],pass?'#302c48':'#65506b');
        if(h>77){line(g,[[x+w*.45,y],[x+w*.45,y-10]],'#997073');rect(g,x+w*.45,y-11,1.3,1.3,'#f2a788');}
        for(let yy=y+7;yy<157;yy+=4.5)for(let dx=2;dx<w-2;dx+=4)if(r()>.55)rect(g,x+dx,yy,2,1,r()>.49?'#bc8d99':'#8296b2');
        if(pass&&h>60&&r()>.5)rect(g,x+4,y+9,1,h*.57,'#cd7d9c');
        x+=w-2;
      }
    });
    repeat(c,skyline,t*3+cam.look*4);
    line(c,[[0,132],[W,146]],'#29263b',6);line(c,[[0,130],[W,144]],'#cf96a0',1);
    for(let i=-1;i<6;i++){
      const x=i*203-wrap(t*7+cam.look*6,203),y=130+x*.0145;
      poly(c,[[x-4,170],[x-1,y-17],[x+2,y-20],[x+5,170]],'#3d3248','#976f82',.85);
      for(const span of [27,45])for(const d of [-1,1])line(c,[[x,y-16],[x+d*span,y+d*span*.0145]],'#9e7b896e',.85);
    }
    const x=wrap(278+t*(8+boss*2),W+535)-130;
    // Trois porteurs géants marchent derrière le viaduc. Chaque genou suit sa
    // propre foulée ; le poste de pilotage domine les tours à l'avant du convoi.
    for(let j=2;j>=0;j--){
      const k=j===0?1.5:j===1?.99:.74,cx=x-j*72,cy=141+cx*.0145;
      c.save();c.translate(cx,cy);c.scale(k,k);
      for(let leg=0;leg<4;leg++){
        const hip=-20+leg*13,phase=t*1.6+leg*1.58+j,swing=Math.sin(phase);
        const knee=hip-7+swing*4,foot=hip-13+swing*7,ground=-2-Math.max(0,Math.cos(phase))*3;
        line(c,[[hip,-30],[knee,-17],[foot,ground]],leg%2?'#292a40':'#42415a',leg%2?4:3.3);
        line(c,[[hip-1,-29],[knee-1,-17],[foot-1,ground]],'#a47f93',.85);
        ellipse(c,knee,-17,2.2,2.2,0,'#676079','#b68b99',.75);
        line(c,[[foot-4,ground],[foot+4,ground]],'#493d52',2.6);
      }
      poly(c,[[-35,-41],[-28,-47],[-16,-47],[-13,-54],[0,-54],[4,-48],[21,-47],[33,-40],[30,-34],[15,-34],[7,-27],[-13,-27],[-19,-33],[-33,-33]],'#343245','#bd8d9a',1.15);
      for(let j=0;j<5;j++)rect(c,-25+j*5,-42,3,1.6,'#c99b9e');
      poly(c,[[11,-44],[22,-51],[35,-52],[40,-49],[36,-44],[24,-41]],'#534656','#c4969b',1);
      line(c,[[27,-49],[36,-50]],'#ffe3af',1.6);line(c,[[-15,-49],[-14,-58],[-8,-60]],'#c2949b',1.1);
      c.restore();
    }
    for(let i=0;i<42;i++){
      const xx=wrap(i*331-t*31,W), yy=wrap(i*57+t*95,171);
      line(c,[[xx,yy],[xx-2,yy+6]],'#baadc04d',.7);
    }
    // Signaux rouges successifs précédant la machine de tête.
    for(let i=0;i<8;i++){const xx=i*130+22,yy=138+xx*.0145;rect(c,xx,yy,5,1.5,boss>.25&&wrap(t*2-i,8)<boss*6?'#ffb090':'#aa8698');}
    for(let i=0;i<21;i++){const xx=wrap(i*99-t*11,W),yy=187+i%6*9;line(c,[[xx,yy],[xx+8+i%5*3,yy]],'#ba8b9633',1);}
  }
  function orbit(c,t,cam,boss){
    c.drawImage(layer('saturn',W,H,g=>{
      sky(g,[[0,'#08182b'],[.31,'#23394f'],[.54,'#283445'],[1,'#0b1726']]);
      halo(g,201,72,174,[[0,'#a6bcb461'],[1,'#75b9bd00']]);
      g.save();g.beginPath();g.arc(180,109,91,0,TAU);g.clip();
      const gas=g.createLinearGradient(90,40,263,160);gas.addColorStop(0,'#ddc6a5');gas.addColorStop(.38,'#af9c93');gas.addColorStop(.69,'#787a88');gas.addColorStop(1,'#35394e');rect(g,80,15,200,195,gas);
      const r=rnd(121);
      for(let i=0;i<48;i++){
        const yy=12+i*3.8,arr=[];
        for(let x=70;x<=287;x+=4)arr.push([x,yy+(x-179)*.095+Math.sin(x*.035+i*.11)*2.2]);
        line(g,arr,r()>.5?'#f4d5a93b':'#594e6755',1+r()*3);
      }
      g.restore();
      ellipse(g,180,109,91,91,0,null,'#eebd918f',1.15,Math.PI,Math.PI*1.65);
      const hills=[];for(let x=-4;x<=968;x+=8)hills.push([x,185+12*Math.sin(x*.019)+5*Math.sin(x*.057)+r()*7]);
      poly(g,[...hills,[W,H],[0,H]],'#1c293a','#495060',.9);
    }),0,0);
    dots(c,t,115,137,'#bdc6ca91',101);
    // Anneau interrompu : segments en titane parallèles et treillis de charpente
    // dans le repère local incliné. Les grues circulent sur le rail construit.
    c.save();c.translate(634+cam.look*3,102);c.rotate(-.17);
    const arc=(a,r=1)=>[255*r*Math.cos(a),54*r*Math.sin(a)];
    for(let j=0;j<60;j++){
      const a=j*TAU/60,b=a+TAU/60;
      if(j>=45&&j<=50)continue;
      const front=Math.sin(a)>0;
      const p=arc(a),q=arc(b),p2=arc(a,.94),q2=arc(b,.94);
      poly(c,[p,q,[q[0],q[1]+6],[p[0],p[1]+6]],front?'#495765':'#36485e',front?'#9e9b97':'#627b88',.8);
      poly(c,[p,q,q2,p2],front?'#81929a':'#617384',front?'#d0c4a3':'#9da9a9',.7);
      line(c,[[p[0],p[1]+6],q],front?'#85969a':'#496271',.8);
      if(j%3===0)rect(c,p[0],p[1],2,1.8,'#f4c98d');
    }
    for(let j=0;j<6;j++){
      const a=wrap(.33+j*1.04+t*.031,TAU),[x,y]=arc(a);
      if(a>4.7&&a<5.34)continue;
      c.save();c.translate(x,y);
      poly(c,[[-7,1],[-5,-4],[4,-4],[8,1]],'#435468','#cbb79b',.9);
      line(c,[[-3,-3],[-7,-18],[6,-24],[17,-19]],'#d0b29b',1.5);
      line(c,[[-3,-3],[0,-16],[6,-24]],'#788792',1.2);
      line(c,[[15,-19],[15,-10]],'#b0a59b',.8);rect(c,13,-10,4,2,'#d3c1a4');c.restore();
    }
    c.restore();
    // Les barges convergent vers le segment manquant à l'approche du gardien.
    for(let i=0;i<5;i++){
      const xx=wrap(290+i*142+t*(9+i),W+90)-40,yy=34+Math.sin(t*.19+i)*10+i%2*9;
      const y=yy+(64-yy)*boss*.65;
      poly(c,[[xx-9,y],[xx-5,y-3],[xx+4,y-3],[xx+9,y],[xx+4,y+1.8],[xx-7,y+1.8]],'#425466','#d2bd9f',.8);
      line(c,[[xx-10,y],[xx-14,y]],'#9cd6de',1);
    }
  }
  function abyss(c,t,cam,boss){
    c.drawImage(layer('void',W,H,g=>{
      sky(g,[[0,'#100e25'],[.28,'#33203e'],[.55,'#2d2036'],[1,'#120f21']]);
      halo(g,571,77,211,[[0,'#ffbb838a'],[.28,'#d472768a'],[.65,'#af48634d'],[1,'#72365100']]);
      for(let k=0;k<3;k++){
        const points=[];
        for(let x=-2;x<=963;x+=6)points.push([x,158+8*k+6*Math.sin(x*.015+2*k)+4*Math.cos(x*.027+k)]);
        poly(g,[...points,[W,H],[0,H]],['#52334d','#412b42','#2b2537'][k]);
      }
    }),0,0);
    dots(c,t,96,149,'#d6c0c4ad',2985);
    c.save();c.translate(570+cam.look*2,79);
    const r=36-boss*5;
    for(let j=0;j<6;j++){
      const rx=r+10+j*6,ry=r*.87+j*1.06;
      ellipse(c,0,0,rx,ry,-.13,null,['#ffd8a4','#ffc08d','#ea967c','#bb7977','#965a69','#86516b'][j],j===0?2.7:1.3,Math.PI*.95,TAU*1.02);
    }
    ellipse(c,0,0,r+3,r+3,0,'#1d142a','#c98079',1.5);
    ellipse(c,0,0,r,r,0,'#100e20','#ffbd8c',2.5);
    c.rotate(-.12);
    for(let j=0;j<11;j++){
      const rx=68+j*8.4,ry=4+j*1.08;
      ellipse(c,0,2,rx,ry,0,null,j%3===0?'#fbbc93':'#c48384',j<4?1.7:1,0,Math.PI);
      ellipse(c,0,2,rx,ry,0,null,'#af6d7c',.8,Math.PI,Math.PI*1.3);
      ellipse(c,0,2,rx,ry,0,null,'#c88581',.8,TAU-.86,TAU);
    }
    for(let j=0;j<18;j++){
      const a=wrap(t*(.24+boss*.31)+j*.849,TAU);
      if(Math.sin(a)<0&&Math.abs(Math.cos(a))<.5)continue;
      const rx=73+j%6*10;
      ellipse(c,0,2,rx,4+j%6*1.8,0,null,j%2?'#ffddac':'#e5a589',1.3,a,a+.17);
    }
    c.restore();
    // Colonnes de matière érodées, avec filaments orbitant vers la singularité.
    for(let j=0;j<4;j++){
      const x=[92,279,772,915][j]+Math.sin(t*.18+j)*2,h=[73,48,62,98][j],y=172,side=j<2?1:-1;
      c.save();c.translate(x,y);c.scale(side,1);
      poly(c,[[-22,1],[-15,-14],[-13,-h*.72],[-8,-h],[-1,-h-4],[-3,-h*.64],[5,-h*.46],[10,-13],[23,1]],'#30233d','#946575',1.1);
      poly(c,[[-13,-h*.72],[-8,-h],[-5,-h],[-6,-h*.58],[-1,-22],[-6,-12]],'#705067');
      const curl=[];
      for(let i=0;i<=32;i++){
        const f=i/32;curl.push([f*(60+j*7),-h-4-22*Math.sin(f*Math.PI)-f*8+2*Math.sin(t*.9+f*9+j)]);
      }
      line(c,curl,'#bd7c8480',1);
      const f=wrap(t*(.11+boss*.14)+j*.28,1),index=Math.floor(f*31);
      line(c,curl.slice(index,index+3),'#ffd1a6',1.45);
      for(let i=0;i<3;i++){
        const yy=-h-7-i*6+Math.sin(t*.55+i)*2,xx=i*3-2;poly(c,[[xx-2,yy],[xx+1,yy-3],[xx+2,yy],[xx,yy+1.5]],'#926676');
      }c.restore();
    }
  }
  function railway(c,t,cam,boss){
    c.drawImage(layer('gare',W,H,g=>{
      sky(g,[[0,'#28324c'],[.2,'#705670'],[.43,'#cb846e'],[.66,'#534459'],[1,'#172634']]);
      const r=rnd(1995);
      for(let j=0;j<27;j++){
        const x=Math.floor(r()*W/4)*4,y=20+Math.floor(r()*60/4)*4,w=16+Math.floor(r()*49/4)*4;
        rect(g,x,y,w,4,'#d18d806e');rect(g,x+8,y-4,w*.45,4,'#b5838480');
      }
      for(let x=0;x<W;x+=16){
        const y=130+Math.floor(15*Math.sin(x*.017)/4)*4;
        rect(g,x,y,16,80,'#6c6371');rect(g,x,y+4,12,3,'#96868a');
      }
      for(const [x,y] of [[46,75],[322,64],[647,74],[893,69]]){
        rect(g,x,y,6,73,'#414654');rect(g,x-7,y+6,21,4,'#444452');
        rect(g,x-18,y-4,48,6,'#4b4756');rect(g,x-14,y-7,40,3,'#ceaa87');
        for(const d of [1,12,24])rect(g,x-14+d,y,5,2,'#ffe5ad');
      }
      for(let j=-1;j<9;j++){
        const x=j*126;
        poly(g,[[x,98],[x+14,82],[x+86,82],[x+111,97],[x+111,103],[x,103]],'#4a4c59','#b6a39b',1);
        rect(g,x,99,112,4,'#d0ac80');rect(g,x+16,103,4,37,'#5e5359');
        for(let k=0;k<7;k++)rect(g,x+15+k*11,88,8,3,'#849299');
      }
      rect(g,0,133,W,11,'#303b48');rect(g,0,144,W,4,'#cfaa85');rect(g,0,148,W,12,'#453e49');
      for(let x=0;x<W;x+=23){rect(g,x,151,11,2,'#827479');rect(g,x+3,156,7,1,'#a29386');}
      for(let y=185;y<440;y+=22){rect(g,0,y,W,2,'#403646');}
    }),0,0);
    for(let j=-1;j<4;j++){
      const x=j*300-wrap(t*9+cam.look*4,300);
      rect(c,x+4,35,3,101,'#424251');rect(c,x,35,64,4,'#615461');rect(c,x+58,39,2,8,'#655764');
      line(c,[[x+5,62],[x+42,39]],'#675968',2);
      line(c,[[x-240,46],[x-95,51],[x+60,46]],'#534c60',1);
    }
    const off=wrap(260+t*(48+boss*10),W+550)-310;
    for(let j=0;j<3;j++){
      const x=Math.floor((off+j*96)/2)*2,y=108;
      poly(c,[[x,y+17],[x,y+3],[x+4,y],[x+88,y],[x+95,y+5],[x+95,y+18]],'#c1cbd0','#394859',1.8);
      rect(c,x+2,y+10,91,4,'#ce655d');rect(c,x+2,y+15,91,3,'#737e8a');
      for(let k=0;k<8;k++){rect(c,x+7+k*10,y+3,7,5,'#345467');rect(c,x+8+k*10,y+3,5,1,'#8bb8be');}
      for(const d of [15,66]){rect(c,x+d,y+18,13,4,'#393842');rect(c,x+d+3,y+21,6,2,'#262b34');}
    }
    const x=Math.floor((off+287)/2)*2;
    poly(c,[[x,108],[x+14,108],[x+29,112],[x+36,118],[x+43,121],[x+43,125],[x,126]],'#cbd5d0','#3e4a56',1.6);
    poly(c,[[x+10,110],[x+18,111],[x+29,116],[x+15,116]],'#426277');
    rect(c,x+5,120,30,3,'#ce625f');rect(c,x+35,120,6,2,'#ffe9a8');
    // Portique de signalisation à palettes ; alerte avant l'arrivée de la locomotive.
    const gx=705;
    rect(c,gx,75,6,80,'#484756');rect(c,gx-80,74,100,5,'#504957');line(c,[[gx-29,79],[gx,100]],'#605565',3);
    rect(c,gx-76,79,56,14,'#353443');rect(c,gx-70,82,43,2,'#85777b');
    for(let n=0;n<5;n++)rect(c,gx-68+n*8,86,4,3,n>3-boss*4?'#f3a478':'#b7d596');
  }
  // Palettes et cadence spatiale propres au matériel de chaque époque. La passe
  // agit sur les pixels composites déjà peints, y compris projectiles et gardiens.
  const formats={
    1976:{bits:2,width:384,palette:['#111c22','#304a43','#70946b','#dcf1ab']},
    1985:{bits:4,width:480,palette:['#101324','#1c2239','#28364b','#403551','#664565','#915a7a','#be7885','#e9a491','#ffdfaa','#ffefc7','#36516b','#507b89','#60a4a5','#96d9c6','#ccf5e0','#d86967']},
    1995:{bits:8,width:568},
    2185:{bits:16,width:768},
    2985:{bits:32,width:Infinity}
  };
  const palettesRGB=new Map(),stages=new WeakMap();
  function lut(year){
    if(palettesRGB.has(year))return palettesRGB.get(year);
    const rgb=formats[year].palette.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
    const table=new Uint32Array(32768);
    const pack=(r,g,b)=>(255<<24)|(b<<16)|(g<<8)|r;
    for(let n=0;n<table.length;n++){
      const r=(n>>10)*255/31,g=((n>>5)&31)*255/31,b=(n&31)*255/31;
      let closest=0,d0=Infinity;
      if(year===1976){
        const lum=.23*r+.62*g+.15*b;
        closest=lum<43?0:lum<86?1:lum<156?2:3;
      }else for(let j=0;j<rgb.length;j++){
        const p=rgb[j],d=.32*(p[0]-r)**2+.51*(p[1]-g)**2+.17*(p[2]-b)**2;
        if(d<d0){d0=d;closest=j;}
      }
      table[n]=pack(...rgb[closest]);
    }
    palettesRGB.set(year,table);return table;
  }
  const bayer=[-6,2,-4,4,6,-2,8,0,-3,5,-5,3,9,1,7,-1];
  function finish(canvas,year){
    const f=formats[year];if(!f||f.bits===32)return;
    const w=Math.min(canvas.width,f.width),h=Math.max(1,Math.round(w*canvas.height/canvas.width));
    let stage=stages.get(canvas);
    if(!stage){const el=document.createElement('canvas');stage={el,ctx:el.getContext('2d',{willReadFrequently:true})};stages.set(canvas,stage);}
    if(stage.el.width!==w||stage.el.height!==h){stage.el.width=w;stage.el.height=h;}
    const c=stage.ctx;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='low';
    c.drawImage(canvas,0,0,w,h);
    const img=c.getImageData(0,0,w,h),buf=img.data,packed=new Uint32Array(buf.buffer,buf.byteOffset,w*h);
    const table=f.palette?lut(year):null;
    for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i++){
      const j=i*4,d=bayer[(y%4)*4+x%4]*(f.bits===8?.75:.55),r=buf[j],g=buf[j+1],b=buf[j+2];
      if(table){
        const rr=Math.min(255,Math.max(0,r+d))>>3,gg=Math.min(255,Math.max(0,g+d))>>3,bb=Math.min(255,Math.max(0,b+d))>>3;
        packed[i]=table[rr*1024+gg*32+bb];
      }else if(f.bits===8){
        // RGB332 exact, arrondi au niveau le plus proche avec trame ordonnée.
        const ri=Math.min(7,Math.max(0,Math.round((r+d)*7/255))),gi=Math.min(7,Math.max(0,Math.round((g+d)*7/255))),bi=Math.min(3,Math.max(0,Math.round((b+d*1.6)*3/255)));
        buf[j]=ri*255/7;buf[j+1]=gi*255/7;buf[j+2]=bi*85;
      }else{
        const ri=r>>3,gi=g>>2,bi=b>>3;
        buf[j]=(ri<<3)|(ri>>2);buf[j+1]=(gi<<2)|(gi>>4);buf[j+2]=(bi<<3)|(bi>>2);
      }
    }
    c.putImageData(img,0,0);
    const out=canvas.getContext('2d');out.save();out.setTransform(1,0,0,1,0,0);out.imageSmoothingEnabled=false;
    out.drawImage(stage.el,0,0,canvas.width,canvas.height);out.restore();
  }
  function draw(c,year,t=0,cam={},reduce=false){
    const fn={1976:terminal,1985:city,1995:railway,2185:orbit,2985:abyss}[year]||city;
    const boss=Math.max(0,Math.min(1,cam.nearBoss||0));
    c.save();c.lineCap='round';c.lineJoin='round';fn(c,reduce?0:t,{look:reduce?0:cam.look||0},boss);c.restore();
  }
  window.SnakeMondes=Object.freeze({draw,finish,formats});
})();

(() => {
  'use strict';
  const width=960,height=520;
  const titles={1976:'Ticket thermique',1985:'Crédit néon',1995:'Billet de la Gare de verre',2185:'Accréditation orbitale',2985:'Passe de la Singularité'};
  const base=typeof document==='undefined'?null:document.currentScript?.src||document.baseURI;
  const fmt=new Intl.NumberFormat('fr-FR');
  function draw(c,row,img,sprites){
    const year=Number(row.year);
    if(!titles[year])throw new RangeError('Époque inconnue');
    const name=row.name||'PILOTE',score=fmt.format(row.score),level='CRAN '+row.difficulty+' / 10',metrics=[];
    const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
    function path(points,col,fill=false,weight=2){
      c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      if(fill){c.closePath();c.fillStyle=col;c.fill();}else{c.lineWidth=weight;c.strokeStyle=col;c.stroke();}
    }
    function type(str,x,y,w,size,color,face='sans-serif',weight=700){
      face={'sans-serif':'Arial, sans-serif',serif:'Georgia, serif',monospace:'"Courier New", monospace'}[face]||face;
      let px=size;c.font=weight+' '+px+'px '+face;
      while(c.measureText(str).width>w-6&&px>12){px--;c.font=weight+' '+px+'px '+face;}
      c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(str,x,y);
      const m=c.measureText(str);
      metrics.push({str,x,y,w,size:px,left:x-m.actualBoundingBoxLeft,right:x+m.actualBoundingBoxRight,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});
    }
    function art(x,y,w,h){
      const scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale;
      c.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);
    }
    const emblem=(role,x,y,unit)=>sprites.draw(c,role,year,{x,y,unit,viewportWidth:960,reduced:true,kind:'final'});
    c.save();
    if(year===1976){
      const ink='#233a27',paper='#def0c8';
      rect(0,0,960,520,'#17241d');rect(30,13,900,494,paper);
      for(let x=30;x<930;x+=20)path([[x,507],[x+10,497],[x+20,507]],'#17241d',true);
      type('SNAKE / 1976',61,62,440,33,ink,'monospace');
      type('TICKET THERMIQUE',592,58,305,24,ink,'monospace');
      art(60,84,840,123);for(let y=86;y<207;y+=5)rect(60,y,840,1,'#132d1950');
      type(name,61,264,800,40,ink,'monospace');type('POINTS',61,324,180,23,ink,'monospace');
      type(score,59,402,823,78,ink,'monospace');
      for(let x=60;x<900;x+=18)rect(x,429,10,2,ink);
      type(level,61,472,340,25,ink,'monospace');emblem('head',858,458,2.9);
    }else if(year===1985){
      rect(0,0,960,520,'#130e2d');art(345,0,615,210);
      path([[0,0],[426,0],[305,217],[0,217]],'#130e2d',true);
      for(let i=0;i<3;i++)path([[456+i*18,0],[332+i*18,218],[960,218]],['#ff60af','#fcaa87','#57e3ed'][i],false,4);
      type('1985',43,108,300,93,'#ff77be');type('CRÉDIT NÉON',48,163,294,30,'#83f6fe');
      type(score,43,358,863,96,'#fff3fb');type('POINTS',49,262,260,23,'#ff77be','monospace');
      rect(48,390,864,2,'#ca76c7');type(name,48,445,650,39,'#b8ffff');type(level,692,446,220,24,'#ffb9e4','monospace');
      emblem('head',879,104,3.6);
    }else if(year===1995){
      rect(0,0,960,520,'#f5db9c');rect(677,0,283,520,'#272238');
      type('Gare de verre',40,85,625,64,'#35283e','serif');type('BILLET DE PASSAGE',44,125,580,22,'#503849','monospace');
      art(41,151,593,116);type(name,41,332,595,39,'#282239');
      type(score,40,423,597,62,'#282239');type('POINTS',45,467,330,22,'#503849','monospace');
      for(let y=8;y<520;y+=20)rect(661,y,2,10,'#785f68');
      type('1995',702,94,239,64,'#ffcb82');type(level,705,159,225,24,'#ffe2a7','monospace');
      emblem('boss',817,267,3.15);
      for(let i=0,x=705;x<922;i++){const w=[2,4,1,3,5,2,1][i%7];rect(x,365,w,77,'#fcdf9e');x+=w+3;}
    }else if(year===2185){
      rect(0,0,960,520,'#d8e8e8');rect(0,0,960,86,'#173541');
      type('ACCRÉDITATION ORBITALE',42,56,675,32,'#e3fffb');type('2185',779,62,150,47,'#a8e8e6');
      c.save();c.beginPath();c.arc(155,223,112,0,Math.PI*2);c.clip();art(41,109,228,228);c.restore();
      c.strokeStyle='#287074';c.lineWidth=5;c.beginPath();c.arc(155,223,114,0,Math.PI*2);c.stroke();emblem('head',155,225,3.2);
      type('PILOTE ACCRÉDITÉ',303,158,600,23,'#315858','monospace');type(name,300,233,615,46,'#112e39');
      type(level,304,309,550,30,'#23545a','monospace');
      rect(31,361,898,128,'#173541');type('POINTS',54,405,240,24,'#a8e8e6','monospace');
      type(score,51,464,850,66,'#ecfffa');
    }else{
      rect(0,0,960,520,'#100d24');
      c.save();c.beginPath();c.moveTo(447,0);c.lineTo(960,0);c.lineTo(960,520);c.lineTo(670,520);c.closePath();c.clip();art(442,0,518,520);c.restore();
      path([[448,0],[670,520]],'#cfb0ff',false,3);
      type('2985',40,99,410,82,'#ead9ff','serif');type('PASSE DE LA',46,150,395,25,'#d3a8ff');
      type('Singularité',40,222,459,65,'#fff0ff','serif');
      rect(31,251,897,117,'#241b38');type('POINTS',48,282,200,20,'#dbc0fa','monospace');type(score,46,350,854,72,'#fff1ff');
      rect(31,383,897,101,'#171126');type(name,47,448,632,43,'#f7eaff');type(level,709,448,210,24,'#dbc0fa','monospace');
      emblem('boss',776,135,3.6);
    }
    c.restore();return metrics;
  }
  const compatible=r=>r&&Object.hasOwn(titles,r.year)&&Number.isSafeInteger(r.score)&&r.score>=0&&Number.isInteger(r.difficulty);
  async function open(row,trigger){
    if(!compatible(row))return;
    const dialog=document.createElement('dialog');dialog.className='snake-archives snake-cartouche';
    const heading=document.createElement('h2');heading.id='cartouche-titre';heading.textContent=titles[row.year];
    dialog.setAttribute('aria-labelledby',heading.id);
    const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.onclick=()=>dialog.close();
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    const header=document.createElement('header');header.append(heading,close);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',titles[row.year]+' · '+row.year+' · '+row.name+' · cran '+row.difficulty+' · '+fmt.format(row.score)+' points.');
    const download=document.createElement('a');download.textContent='Télécharger le PNG';download.hidden=true;
    const message=document.createElement('p');message.setAttribute('role','status');message.textContent='Préparation de la carte…';
    let url=null,closed=false;
    dialog.addEventListener('close',()=>{closed=true;if(url)URL.revokeObjectURL(url);dialog.remove();trigger?.focus();},{once:true});
    dialog.append(header,canvas,message,download);document.body.append(dialog);dialog.showModal();close.focus();
    try{
      let img=null;
      if(/^https?:$/.test(location.protocol)){
        const src=new URL('../bifurcation/paysage-'+row.year+'.webp',base);
        if(src.origin===location.origin){
          const image=new Image();image.src=src.href;
          try{await image.decode();img=image;}catch{}
        }
      }
      if(!img){
        img=document.createElement('canvas');img.width=960;img.height=220;
        window.SnakeMondes.draw(img.getContext('2d'),Number(row.year),0,{},true);
      }
      if(closed)return;
      draw(canvas.getContext('2d'),row,img,window.SnakeSprites);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(closed)return;
      if(!blob)throw new Error('PNG');
      url=URL.createObjectURL(blob);download.href=url;download.download='snake-'+row.year+'-'+row.score+'.png';
      download.hidden=false;message.hidden=true;
    }catch{if(!closed)message.textContent='La carte souvenir est indisponible.';}
  }
  const api={draw,open,compatible,width,height};
  if(typeof window!=='undefined')window.SnakeCartouches=api;
  if(typeof module!=='undefined')module.exports=api;
})();

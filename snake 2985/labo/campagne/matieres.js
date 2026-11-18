// Horizons du studio. Le décor procédural reste disponible dès la première image.
(() => {
  'use strict';
  const base=document.currentScript?.src||document.baseURI;
  const files={1985:'circuit-antenne.webp',1995:'quai-verriere.webp',2185:'chantier-orbital.webp',2985:'etoile-effondree.webp'};
  const loaded=new Map();
  function load(year){
    if(!files[year])return Promise.resolve(false);
    const url=new URL('decors/'+files[year],base);
    // Un document file:// peut avoir une origine opaque, même pour un voisin.
    if(!['https:','http:'].includes(url.protocol)||new URL(document.baseURI).protocol==='file:')return Promise.resolve(false);
    if(loaded.has(year))return loaded.get(year).pending;
    const img=new Image(),item={img,ready:false,pending:null};
    img.crossOrigin='anonymous';img.decoding='async';
    item.pending=new Promise(resolve=>{
      img.onload=()=>{
        try{
          const probe=document.createElement('canvas');probe.width=1;probe.height=1;
          const c=probe.getContext('2d');c.drawImage(img,0,0,1,1);c.getImageData(0,0,1,1);
          item.ready=true;resolve(true);
        }catch{resolve(false);}
      };
      img.onerror=()=>resolve(false);
    });
    loaded.set(year,item);img.src=url.href;
    return item.pending;
  }
  function horizon(c,img,year,time,cam,reduce){
    // Repères mesurés sur les planches studio 1859/1860 × 846 :
    // pieds de la ville à la ligne 421 et sommet du rail à la ligne 356.
    const railway=year===1995,sourceY=img.height*(railway?356:421)/846;
    const railY=railway?131:152;
    const shift=reduce?0:Math.sin(time*.10)*(railway?1.4:2.2)+(cam.look||0)*(railway?1.6:2.6);
    const left=-6+shift;
    c.fillStyle=railway?'#18132f':'#24132b';c.fillRect(0,0,960,440);
    c.drawImage(img,0,0,img.width,sourceY,left,0,972,railY);
    c.drawImage(img,0,sourceY,img.width,img.height-sourceY,left,railY,972,440-railY);
    c.fillStyle=railway?'rgba(17,24,45,.20)':'rgba(18,17,38,.14)';
    c.fillRect(0,0,960,440);
  }
  function draw(c,year,t,cam,reduce){
    const item=loaded.get(year);if(!item?.ready)return false;
    const time=reduce?0:t,pressure=cam.nearBoss||0,look=reduce?0:(cam.look||0);
    const slide=reduce?0:Math.sin(time*.105)*3+look*4+(cam.transition||0)*3;
    const lift=reduce?0:1.7*Math.cos(time*.16);
    if(year===1985||year===1995){
      if(!window.SnakeMondes?.traffic)return false;
      c.save();horizon(c,item.img,year,time,cam,reduce);
      window.SnakeMondes.traffic(c,year,time,cam,reduce);c.restore();return true;
    }
    c.save();
    c.drawImage(item.img,-13+slide,-6+lift,986,452);
    if(year===2185){
      // Navettes de service sur des trajectoires distinctes devant l'anneau.
      for(let i=0;i<8;i++){
        const x=((i*141+time*(7+i%3*5))%1020)-24;
        const y=25+((i*31)%104)+Math.sin(i+.25*time)*3;
        const l=3+i%4;
        c.fillStyle='#071627';c.fillRect(Math.round(x-l),Math.round(y),l*2,3);
        c.fillStyle=i%2?'#a3c1c4':'#ffbe7c';c.fillRect(Math.round(x-l+2),Math.round(y),l,1);
        c.fillStyle='#7fe6db';c.fillRect(Math.round(x+l),Math.round(y+1),2,1);
        if(pressure>.35){c.fillStyle='#ffc07a';c.fillRect(Math.round(x-l-4),Math.round(y+1),3,1);}
      }
    }else{
      // Les débris décrivent des orbites elliptiques. L'approche du gardien resserre les rayons.
      c.translate(578+slide*.55,96+lift*.55);c.rotate(-.15);
      for(let i=0;i<24;i++){
        const a=i*2.39996+time*(.075+.017*(i%5))*(1+pressure*.7);
        const r=(76+(i*29)%173)*(1-.16*pressure),x=Math.cos(a)*r,y=Math.sin(a)*r*.18;
        c.fillStyle=i%4?'#e5a17b9c':'#e9c4dfcc';
        c.fillRect(x,y,1+(i%3),1.15);
      }
    }
    c.restore();return true;
  }
  window.SnakeMatieres={load,draw,ready:year=>Boolean(loaded.get(year)?.ready)};
})();

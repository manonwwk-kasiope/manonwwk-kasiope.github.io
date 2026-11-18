'use strict';
// Extrait figé de mondes/mondes.js avant optimisation, y compris la table des palettes.
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
function convert(buf,w,h,year){
    const f=formats[year];if(!f||f.bits===32)return;
    const packed=new Uint32Array(buf.buffer,buf.byteOffset,w*h);
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
}
  function finish(canvas,year,destination=canvas){
    const f=formats[year];if(!f||f.bits===32)return;
    const w=Math.min(canvas.width,f.width),h=Math.max(1,Math.round(w*canvas.height/canvas.width));
    const direct=canvas!==destination;
    let stage=direct?{el:canvas,ctx:canvas.getContext('2d')}:stages.get(canvas);
    if(!stage){
      const el=document.createElement('canvas');
      stage={el,ctx:el.getContext('2d',{willReadFrequently:true})};
      stages.set(canvas,stage);
    }
    const c=stage.ctx;
    if(!direct){
      if(stage.el.width!==w||stage.el.height!==h){stage.el.width=w;stage.el.height=h;}
      c.imageSmoothingEnabled=true;c.imageSmoothingQuality='low';
      c.drawImage(canvas,0,0,w,h);
    }
    c.save();c.setTransform(1,0,0,1,0,0);
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
    c.putImageData(img,0,0);c.restore();
    const out=destination.getContext('2d');out.save();out.setTransform(1,0,0,1,0,0);out.imageSmoothingEnabled=false;
    out.drawImage(stage.el,0,0,destination.width,destination.height);out.restore();
  }
module.exports={convert,lut,formats,finish};

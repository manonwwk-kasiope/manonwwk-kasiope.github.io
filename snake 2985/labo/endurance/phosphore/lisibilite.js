// Masque phosphore à quatre niveaux. Les coordonnées viennent du masque de
// collision de l'attaque ; le motif est ancré aux cases et au plan physique.
(() => {
  'use strict';
  const {abs,min,max,floor,ceil,hypot}=Math;
  const targets=new WeakMap(),baseInk=[17,28,34],light=[220,241,171],middle=[112,148,107];
  const pack=([r,g,b])=>((255<<24)|(b<<16)|(g<<8)|r)>>>0;
  const dark=pack(baseInk),bright=pack(light),soft=pack(middle);
  function cells(s,z){
    const width=s.width||36,height=s.height||18,mask=new Map();
    for(const a of [s.ecologie?.wave,s.boss?.attack]){
      if(!a||a.plane!==z)continue;
      const danger=a.danger||a.mask;
      const keys=danger||Array.from(a.tiles||[],p=>p.y*width+p.x);
      for(const k of keys)if(Number.isInteger(k)&&k>=0&&k<width*height)mask.set(k,a.phase==='active'||mask.get(k)||false);
    }
    return mask;
  }
  function sheet(c,z){
    const screen=c.canvas,w=min(384,screen.width),h=Math.round(w*screen.height/screen.width);
    let pair=targets.get(screen);if(!pair){pair=[];targets.set(screen,pair);}
    let b=pair[z];
    if(!b||b.w!==w||b.h!==h){
      const el=document.createElement('canvas');el.width=w;el.height=h;
      const ctx=el.getContext('2d'),img=ctx.createImageData(w,h);
      b={el,ctx,img,w,h,words:new Uint32Array(img.data.buffer)};pair[z]=b;
    }
    return b;
  }
  function projectCell(project,cam,x,y,z,w,h){
    const P=(a,b)=>{const p=project(cam,a,b,z);return [p.x*w/960,p.y*h/440];};
    const a=P(x-.5,y-.5),b=P(x+.5,y-.5),c=P(x+.5,y+.5),d=P(x-.5,y+.5);
    return [a,b,c,d];
  }
  function walk(q,w,h,visit){
    const [a,b,c,d]=q;
    const minX=max(0,floor(min(a[0],b[0],c[0],d[0]))),maxX=min(w-1,ceil(max(a[0],b[0],c[0],d[0])));
    const minY=max(0,floor(min(a[1],b[1],c[1],d[1]))),maxY=min(h-1,ceil(max(a[1],b[1],c[1],d[1])));
    const ax=b[0]-a[0],ay=b[1]-a[1],bx=d[0]-a[0],by=d[1]-a[1],cx=c[0]-b[0]-d[0]+a[0],cy=c[1]-b[1]-d[1]+a[1];
    const det=ax*by-ay*bx,rx=hypot(ax,ay),ry=hypot(bx,by);
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const px=x+.5-a[0],py=y+.5-a[1];
      let u=(px*by-py*bx)/det,v=(ax*py-ay*px)/det;
      // Inverse bilinéaire : deux itérations suffisent sur cette case convexe.
      for(let i=0;i<2;i++){
        const dx=ax*u+bx*v+cx*u*v-px,dy=ay*u+by*v+cy*u*v-py;
        const ux=ax+cx*v,uy=ay+cy*v,vx=bx+cx*u,vy=by+cy*u,disc=ux*vy-uy*vx;
        u-=(dx*vy-dy*vx)/disc;v-=(ux*dy-uy*dx)/disc;
      }
      if(u>=0&&v>=0&&u<1&&v<1)visit(x,y,u,v,rx,ry);
    }
  }
  function ink(strategy,u,v,rx,ry,neighbors,active,selected){
    const intensity=selected?bright:soft;
    const d=(u+v-1)*min(rx,ry);
    if(strategy==='double'){
      if(abs(d)<.66)return intensity;
      return abs(d)<1.6?dark:0;
    }
    if(strategy==='adaptative'){
      const cycles=max(1,Math.round(min(rx,ry)/3));
      const phase=((u+v)*cycles+.19)%1;
      if(phase<.23+(active?.08:0))return intensity;
      return phase<.59?dark:0;
    }
    const [left,top,right,bottom]=neighbors;
    const near=min(left?999:u*rx,top?999:v*ry,right?999:(1-u)*rx,bottom?999:(1-v)*ry);
    const centerX=(u-.5)*rx, centerY=(v-.5)*ry;
    const diagonal=centerY+centerX*(active?-.55:.55);
    // Un tiret oblique et sa contreforme au centre de chaque case. Les côtés
    // partagés laissent respirer les salves étendues, leurs entrées sont ponctuées.
    if(abs(centerX)<max(1.6,rx*.27)&&abs(centerY)<max(1.15,ry*.34)){
      if(abs(diagonal)<.67)return intensity;
      if(abs(diagonal)<1.65)return dark;
    }
    const dash=((u*rx+v*ry)*(active?.90:.62))%3;
    if(near<1.45)return dash<1.6?intensity:dark;
    const dx=min(u,1-u)*rx,dy=min(v,1-v)*ry;
    if(dx<.95&&dy<1.25)return intensity;
    return 0;
  }
  function balance(words,indices,lightInk,share){
    if(indices.length<2)return;
    const wanted=max(1,min(floor(indices.length/2),ceil(indices.length*share)));
    let lights=0,darks=0;
    for(const at of indices){if(words[at]===lightInk)lights++;if(words[at]===dark)darks++;}
    // Priorité au milieu de l'entrée, en alternant les deux côtés de son milieu.
    // Des encres déjà posées restent en place ; on complète le motif transparent.
    for(const [color,number] of [[lightInk,wanted-lights],[dark,wanted-darks]]){
      let left=number;
      if(left<=0)continue;
      const count=indices.length,mid=floor(count/2);
      for(let pass=0;pass<2&&left>0;pass++)for(let j=0;j<count&&left>0;j++){
        const k=mid+(j%2?-(j+1)/2:j/2);if(k<0||k>=count)continue;
        const at=indices[k],previous=words[at];
        if(previous===color||(!pass&&previous!==0))continue;
        if(previous===lightInk&&lights<=wanted||previous===dark&&darks<=wanted)continue;
        if(previous===lightInk)lights--;if(previous===dark)darks--;
        words[at]=color;if(color===dark)darks++;else lights++;
        left--;
      }
    }
  }
  function draw(c,s,cam,project,z,strategy='groupe'){
    if(s.year!==1976)return false;
    const attack=s.boss?.attack, wave=s.ecologie?.wave;
    if(attack?.plane!==z&&wave?.plane!==z)return true;
    const b=sheet(c,z),width=s.width||36,selected=z===(s.plane??0);
    const key=[cam.yaw,cam.tilt,selected,attack?.phase,wave?.phase,strategy].join('|');
    if(b.key!==key||b.attack!==(attack?.danger||attack?.tiles)||b.wave!==(wave?.mask||wave?.tiles)){
      const mask=cells(s,z);b.words.fill(0);
    for(const [key,isActive] of mask){
      const x=key%width,y=floor(key/width),neighbors=[x>0&&mask.has(key-1),mask.has(key-width),x<width-1&&mask.has(key+1),mask.has(key+width)];
      const q=projectCell(project,cam,x,y,z,b.w,b.h);
      const zones=strategy==='groupe'?[[],[],[],[],[]]:null;
      walk(q,b.w,b.h,(ix,iy,u,v,rx,ry)=>{
        const at=iy*b.w+ix;b.words[at]=ink(strategy,u,v,rx,ry,neighbors,isActive,selected);
        if(!zones)return;
        if(abs(u-.5)<=.3&&abs(v-.5)<=.32)zones[0].push(at);
        if(u<.24)zones[1].push(at);
        if(v<.24)zones[2].push(at);
        if(u>.76)zones[3].push(at);
        if(v>.76)zones[4].push(at);
      });
      if(zones){
        for(let j=1;j<zones.length;j++)balance(b.words,zones[j],selected?bright:soft,.30);
        balance(b.words,zones[0],selected?bright:soft,.30);
      }
    }
      b.ctx.putImageData(b.img,0,0);
      b.base={...cam};b.key=key;b.attack=attack?.danger||attack?.tiles;b.wave=wave?.mask||wave?.tiles;
    }
    c.save();c.globalAlpha=1;c.imageSmoothingEnabled=false;
    const base=b.base,scale=cam.zoom/base.zoom/(1+base.bank*base.bank);
    const a=(1+cam.bank*base.bank)*scale,rot=(cam.bank-base.bank)*scale;
    const px=480+(base.dx||0),py=254+(base.dy||0)+base.zoom*8*base.level;
    const tx=480+(cam.dx||0)-a*px+rot*py,ty=254+(cam.dy||0)+cam.zoom*8*cam.level-rot*px-a*py;
    c.transform(a,rot,-rot,a,tx,ty);
    c.drawImage(b.el,0,0,960,440);c.restore();
    return true;
  }
  let halo;
  function headHalo(c,p,angle,unit){
    if(!window.SnakeSprites?.raster)return;
    if(!halo){
      const g=SnakeSprites.raster(1976,'head'),pad=1,el=document.createElement('canvas');
      el.width=g.w+2*pad;el.height=g.h+2*pad;
      const layer=el.getContext('2d'),img=layer.createImageData(el.width,el.height),pixels=new Uint32Array(img.data.buffer);
      for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.data[y*g.w+x]){
        for(let dy=-pad;dy<=pad;dy++)for(let dx=-pad;dx<=pad;dx++)if(dx*dx+dy*dy<=pad*pad)
          pixels[(y+pad+dy)*el.width+x+dx+pad]=dark;
      }
      layer.putImageData(img,0,0);
      halo={el,w:el.width/g.density,h:el.height/g.density,scale:g.scale};
    }
    const width=c.canvas?.clientWidth||960,scale=halo.scale*max(.78,390/width,unit);
    c.save();c.translate(p.x,p.y);c.rotate(angle);c.scale(scale,scale);c.imageSmoothingEnabled=false;
    c.drawImage(halo.el,-halo.w/2,-halo.h/2,halo.w,halo.h);c.restore();
  }
  window.SnakePhosphore=Object.freeze({draw,cells,projectCell,walk,headHalo});
})();

(function(){
  'use strict';
  // All drawings face east. A shared 32 × 26 design grid anchors the actor to its collision centre.
  // Each shape is a filled polygon, ellipse or rectangle, hand-drawn for its family.
  const years=[1976,1985,1995,2185,2985];
  function vector(draw){
    const shapes=[];
    const p=(color,points)=>shapes.push({color,points:points.trim().split(/\s+/).map(pair=>pair.split(',').map(Number))});
    const r=(color,x,y,w,h)=>p(color,`${x},${y} ${x+w},${y} ${x+w},${y+h} ${x},${y+h}`);
    const e=(color,x,y,rx,ry)=>shapes.push({color,x,y,rx,ry});
    // Mirrored painting about the heading axis, retaining continuous rotation in flight.
    function pair(color,points){p(color,points);p(color,points.split(' ').map(q=>{const [x,y]=q.split(',');return x+','+(-Number(y));}).join(' '));}
    draw({p,e,r,pair});return shapes;
  }
  // Palette indices: 1 dark edge, 2 rim, 3 primary, 4 shade, 5 highlight, 6 secondary, 7 heading beacon.
  const atlas={
    1976:{
      head:({r})=>{r(3,-12,-7,14,14);r(3,2,-5,7,10);r(5,7,-5,6,3);r(5,7,2,6,3);r(7,6,-5,4,3);r(7,6,2,4,3);r(4,-10,-2,6,4);},
      body:({r})=>{r(3,-10,-7,20,14);r(4,-7,-4,4,8);r(5,3,-4,4,8);},
      drone:({r})=>{r(3,-5,-6,10,12);r(3,-9,-8,3,7);r(3,6,-8,3,7);r(3,-10,1,20,3);r(3,-10,4,3,5);r(3,7,4,3,5);r(5,-3,-3,6,3);},
      cell:({r})=>{r(3,-3,-8,6,16);r(3,-8,-3,16,6);r(5,-2,-2,4,4);},
      mid:({r})=>{r(3,-9,-11,3,22);r(3,6,-11,3,22);for(const [y,x] of [[-7,-4],[0,1],[7,-3]]){r(3,-7,y-1,14,2);r(5,x-2,y-3,5,6);}r(6,-11,9,22,3);},
      final:({r})=>{r(3,-14,-7,10,17);r(3,4,-7,10,17);r(3,-6,-11,12,19);r(4,-11,-3,5,6);r(4,6,-3,5,6);for(const y of [-7,-2,3])r(5,-4,y,8,2);r(6,-16,8,32,3);}
    },
    1985:{
      head:({p,pair})=>{pair(6,'-12,-10 -2,-8 8,-3 1,-1 -8,-3');p(3,'-10,-3 -5,-6 3,-5 15,0 3,5 -5,6 -10,3');p(5,'-7,-3 0,-4 7,-1 -3,-1');p(4,'-6,2 7,1 1,4 -4,4');p(7,'6,-2 13,0 6,2');},
      body:({p,pair})=>{p(3,'-10,0 -5,-7 8,-5 11,0 8,5 -5,7');pair(6,'-9,0 -4,-8 0,-8 -3,-2');p(5,'-2,-4 6,-3 8,-1 -1,-1');},
      drone:({p,e})=>{p(3,'-14,-5 -4,-2 0,-9 4,-2 14,-5 8,3 1,8 -1,8 -8,3');e(5,0,1,3.5,2.5);},
      cell:({p})=>{p(3,'0,-10 8,0 0,10 -8,0');p(5,'0,-7 4,0 0,3 -3,0');p(4,'0,3 5,0 0,8');},
      mid:({p,r})=>{p(3,'-14,-9 -6,-9 -6,2 -3,5 3,5 6,2 6,-9 14,-9 14,4 8,10 -8,10 -14,4');r(5,-14,-10,8,5);r(6,6,-10,8,5);p(5,'-12,3 -6,8 6,8 10,4 7,9 -7,9');},
      final:({p,e})=>{p(6,'-16,0 -10,-3 -5,-4 0,-11 5,-4 10,-3 16,0 9,4 4,5 0,10 -4,5 -9,4');e(3,0,0,10,5);e(5,0,-.2,5,4);e(4,1,-.2,2.1,3);}
    },
    1995:{
      head:({p,r,e})=>{p(3,'-12,-7 -5,-7 -5,-4 6,-4 9,-2 14,5 6,6 -12,6');r(6,-13,-9,9,3);r(5,-10,-6,4,4);r(3,2,-8,4,5);r(6,1,-9,6,2);e(4,-7,6,3,3);e(4,3,6,3,3);r(7,7,-2,3,4);},
      body:({r,e})=>{r(3,-10,-6,19,11);r(6,-11,-7,21,3);for(const x of [-7,0]){r(5,x,-3,4,4);e(4,x+1,5,3,3);}},
      drone:({p,r})=>{p(3,'-10,-8 -3,-5 0,-1 3,-5 10,-8 7,0 2,4 2,9 -2,9 -2,4 -7,0');r(5,-3,-2,6,5);},
      cell:({p,r})=>{p(3,'-9,-6 9,-6 9,-2 6,0 9,2 9,6 -9,6 -9,2 -6,0 -9,-2');r(5,-4,-3,2,6);r(5,1,-3,3,6);},
      mid:({r,p,e})=>{r(3,-2,-7,4,17);r(3,-11,-8,23,3);r(4,-11,-9,6,10);r(4,5,-9,6,10);e(5,-8,-6,2,2);e(6,8,-3,2,2);p(3,'-4,7 4,7 8,11 -8,11');},
      final:({p,r,e})=>{p(3,'-14,-7 -5,-7 -5,-4 7,-4 10,-2 16,7 -14,7');r(6,-15,-9,11,3);r(5,-12,-6,5,5);r(3,2,-10,5,7);r(6,0,-11,9,3);for(const x of [-9,-1,7]){e(4,x,7,3.5,3.5);e(5,x,7,1.5,1.5);}p(5,'9,-1 12,2 8,2');}
    },
    2185:{
      head:({p,pair,e})=>{pair(3,'-13,-7 -7,-10 2,-9 6,-5 -5,-4');p(4,'-13,-3 -3,-5 3,-4 13,0 3,4 -3,5 -13,3');e(3,1,0,8,4);pair(5,'-9,-7 -6,-9 -1,-8 -4,-7');e(7,7,0,3.6,1.7);},
      body:({e,pair})=>{e(4,0,0,9,5);pair(3,'-7,-3 -5,-7 3,-8 7,-5 8,-3');pair(5,'-4,-5 -2,-7 3,-7 0,-5');e(3,4,0,1.5,2.5);},
      drone:({p,e})=>{p(6,'-13,0 -6,-3 0,-10 6,-3 13,0 6,3 0,9 -6,3');e(3,0,0,7,5);e(5,1,-1,3.2,2);},
      cell:({e,p})=>{p(6,'-9,3 -3,-4 8,-5 3,3 -7,5');e(3,0,0,5.5,7.5);e(5,-1,-2,2,3);},
      mid:({e,p})=>{p(6,'-15,0 -6,-4 0,-12 4,-4 15,0 5,4 0,12 -5,4');e(3,0,0,9,8);e(4,0,1,6,5);e(5,-2,-2,3,2);},
      final:({p,e})=>{p(6,'-9,-4 -3,-2 2,3 9,3 9,6 0,7 -5,2 -10,1');e(3,-7,-3,7.5,7.5);e(3,7,4,7,6.7);e(4,-6,-2,4,4);e(5,-8,-5,2,2);e(5,6,2,2.5,2);}
    },
    2985:{
      head:({p,pair,e})=>{pair(6,'-12,-4 -9,-8 -3,-11 5,-11 10,-8 4,-8 -1,-6 -4,-3');p(3,'-13,0 -5,-3 0,-5 6,-5 11,-3 14,0 11,3 6,5 0,5 -5,3');pair(4,'-4,-2 1,-4 7,-3 5,-1');e(7,8,0,3.2,2);},
      body:({p,pair,e})=>{p(3,'-10,0 -4,-5 3,-5 10,0 3,5 -4,5');pair(6,'-10,-8 -4,-7 3,-3 0,-1 -5,-3');e(5,2,0,2.2,2);},
      drone:({p,e})=>{p(3,'0,-10 2,-4 10,-7 6,0 12,6 3,5 0,10 -3,3 -12,6 -7,0 -10,-7 -2,-4');e(5,0,0,3,3);},
      cell:({p,e})=>{p(3,'0,-11 2,-4 7,-3 4,1 5,8 0,5 -5,8 -4,1 -7,-3 -2,-4');e(5,0,0,2,3);},
      mid:({p,e})=>{p(3,'-15,-10 -6,-7 -2,-4 2,-4 6,-7 15,-10 11,-1 5,4 7,11 1,8 0,4 -2,9 -8,11 -5,4 -11,-1');p(6,'-12,-7 -6,-5 -3,-1 -8,-3');p(6,'12,-7 6,-5 3,-1 8,-3');e(5,0,0,2.6,4);},
      final:({p,e})=>{p(6,'-1,-12 2,-7 8,-10 7,-5 14,-4 11,0 16,4 8,5 9,10 3,8 0,12 -3,7 -9,10 -8,4 -15,4 -11,0 -14,-5 -7,-5 -8,-10 -2,-7');e(3,0,0,7.3,7.3);e(4,0,0,4.7,5);e(5,-1,-1,2,2.5);}
    }
  };
  const inks={
    1976:['#09180e','#d7ffaf','#7ed649','#285b29','#eeffba','#4fa950','#ffffd2'],
    1985:['#130c25','#f0deff','#6dacc9','#334268','#fff1fa','#e66ac9','#ffffbc'],
    1995:['#161525','#e8eced','#4189a7','#343947','#c3eeed','#e68c51','#fff7ad'],
    2185:['#111326','#e2edff','#8497b5','#333a63','#e5fdff','#86c9e8','#fff1a0'],
    2985:['#1c102b','#fee1ff','#a284bc','#51346f','#ffebb9','#6ad4ba','#ffffb8']
  };
  const scales={head:1.25,body:.94,drone:.92,cell:.86,boss:1.67};
  const resolution={1976:.75,1985:1,1995:1,2185:2,2985:3};
  const cache=new Map(),surfaces=new Map();
  function contains(s,x,y){
    if(!s.points)return ((x-s.x)/s.rx)**2+((y-s.y)/s.ry)**2<=1;
    let inside=false;
    for(let i=0,j=s.points.length-1;i<s.points.length;j=i++){
      const a=s.points[i],b=s.points[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function geometry(year,role,kind){
    const key=[year,role,kind].join('-');
    if(cache.has(key))return cache.get(key);
    const shapes=vector(atlas[year][role==='boss'?kind:role]),density=resolution[year];
    const w=Math.ceil(39*density),h=Math.ceil(31*density),data=new Uint8Array(w*h);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const x=(i+.5-w/2)/density,y=(j+.5-h/2)/density;
      for(const s of shapes)if(contains(s,x,y))data[j*w+i]=s.color;
    }
    const core=data.slice(),outer=Math.max(2,Math.round(2.1*density)),inner=Math.max(1,Math.round(.85*density));
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      if(core[j*w+i])continue;
      let min=Infinity;
      for(let dy=-outer;dy<=outer;dy++)for(let dx=-outer;dx<=outer;dx++){
        const k=i+dx,l=j+dy;
        if(k>=0&&k<w&&l>=0&&l<h&&core[l*w+k])min=Math.min(min,dx*dx+dy*dy);
      }
      if(min<=outer**2)data[j*w+i]=min<=inner**2?2:1;
    }
    const result={w,h,data,density};cache.set(key,result);return result;
  }
  function palette(year,role,options){
    const colors=['',...inks[year]];
    if(role==='drone'||role==='boss'){
      colors[3]=({1976:'#94b965',1985:'#d66594',1995:'#ca614b',2185:'#a06f90',2985:'#ad6c9b'})[year];
      colors[5]=year===1976?'#edffd0':'#ffe2c3';
      if(year!==1976)colors[6]='#e69a71';
    }
    if(role==='cell'){colors[3]=options.bonus?'#7cc6ec':'#e5bf6f';colors[5]=options.bonus?'#eaffff':'#fff3be';}
    if(options.plane===1)colors[2]=year===1976?'#b5efa9':'#97eaff';
    // The sparkle runs in the material; the collision anchor and headings stay put.
    if(!options.reduced&&Math.floor((options.time||0)*3)%4===1)colors[5]='#fffdee';
    if(year===1976){
      // The CRT material uses exactly four phosphor levels for every role.
      const phosphor=['#09180e','#385d31','#87ca5c','#e5ffbf'];
      const slots=[0,3,2,1,3,2,3];
      for(let i=1;i<=7;i++)colors[i]=phosphor[slots[i-1]];
      if(options.plane===1)colors[2]=phosphor[2];
      if(role==='cell'&&options.bonus)colors[3]=phosphor[3];
    }
    return colors;
  }
  function normalize(year,role,o={}){
    year=years.includes(+year)?+year:1976;
    const kind=role==='boss'&&o.kind==='final'?'final':'mid';
    if(!(role in scales))throw new RangeError('Rôle de sprite inconnu : '+role);
    return {year,role,kind};
  }
  function raster(year,role,options={}){
    const spec=normalize(year,role,options);
    return {...geometry(spec.year,role,spec.kind),colors:palette(spec.year,role,options),scale:scales[role]};
  }
  function draw(c,role,year,o={}){
    const spec=normalize(year,role,o),colors=palette(spec.year,role,o);
    const key=[spec.year,role,spec.kind,colors[2],colors[3],colors[5]].join('|');
    let img=surfaces.get(key);
    if(!img){
      const a=geometry(spec.year,role,spec.kind);
      const source=typeof OffscreenCanvas==='function'?new OffscreenCanvas(a.w,a.h):document.createElement('canvas');
      source.width=a.w;source.height=a.h;
      const ctx=source.getContext('2d'),pixels=ctx.createImageData(a.w,a.h);
      const rgb=colors.map(k=>Number.parseInt(k.slice(1),16)||0);
      for(let i=0;i<a.data.length;i++)if(a.data[i]){
        const color=rgb[a.data[i]];pixels.data[4*i]=color>>16;pixels.data[4*i+1]=color>>8&255;pixels.data[4*i+2]=color&255;pixels.data[4*i+3]=255;
      }
      ctx.putImageData(pixels,0,0);
      img={source,width:a.w/a.density,height:a.h/a.density};surfaces.set(key,img);
    }
    const width=o.viewportWidth || c.canvas?.clientWidth || 960;
    const minimum=role==='head'?390:role==='boss'?290:250;
    const scale=scales[role]*Math.max(.78,minimum/width,o.unit??1);
    c.save();c.translate(o.x??0,o.y??0);c.rotate(o.angle||0);c.scale(scale,scale);
    c.imageSmoothingEnabled=spec.year>=2185;
    c.drawImage(img.source,-img.width/2,-img.height/2,img.width,img.height);c.restore();
  }
  function link(c,year,a,b,unit=1){
    const colors=inks[year]||inks[1976];
    c.save();c.lineCap=+year===1995?'square':'round';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
    for(const [width,color] of [[9.5,colors[0]],[6.2,colors[2]],[2,colors[4]]]){c.lineWidth=width*unit;c.strokeStyle=color;c.stroke();}
    c.restore();
  }
  const api=Object.freeze({draw,link,raster,years});
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeSprites=api;
})();

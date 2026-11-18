"""Produit un correctif hors ligne, sans toucher au moteur partagé."""
from pathlib import Path
from difflib import unified_diff
import sys
here=Path(__file__).resolve().parent;lab=here.parent.parent
def one(text,a,b):
    assert text.count(a)==1,a
    return text.replace(a,b)
out=''
for name in ['spectacle.js','mondes/mondes.js']:
    raw=(lab/name).read_text();s=raw
    if name=='spectacle.js':
        s=one(s,"  function draw(canvas,s,t=0,reduced=false,method='direct'){","  const logicalBuffers=new WeakMap();\n  function draw(canvas,s,t=0,reduced=false,method='direct'){")
        s=one(s,"    const c=canvas.getContext('2d');c.setTransform(w/W,0,0,h/H,0,0);","""    let surface=canvas;
    if(window.SnakeMondes&&(s.year===1985||s.year===2185)){
      surface=logicalBuffers.get(canvas);
      if(!surface){
        surface=document.createElement('canvas');
        surface.getContext('2d',{willReadFrequently:true});
        logicalBuffers.set(canvas,surface);
      }
      const lw=Math.min(w,SnakeMondes.formats[s.year].width),lh=Math.max(1,Math.round(lw*h/w));
      if(surface.width!==lw)surface.width=lw;
      if(surface.height!==lh)surface.height=lh;
    }
    const c=surface.getContext('2d');c.setTransform(surface.width/W,0,0,surface.height/H,0,0);""")
        # Le corps peint sa liaison vers la tête mais délègue le seul sprite de tête au premier plan.
        s=one(s,'      const angle=Math.atan2(next.y-origin.y,next.x-origin.x);','      const angle=Math.atan2(next.y-origin.y,next.x-origin.x);\n      if(i===0&&s.year===1976)window.SnakePhosphore?.headHalo(c,p,angle,unit);')
        s=one(s,'      const h=s.snake[i];','      if(i===0&&!headOnly)continue;\n      const h=s.snake[i];')
        s=one(s,'      if(s.ecologie?.wave)mask(c,cam,s.ecologie.wave,z);\n      if(s.boss?.attack)mask(c,cam,s.boss.attack,z);',"""      if(s.year!==1976||!window.SnakePhosphore){
        if(s.ecologie?.wave)mask(c,cam,s.ecologie.wave,z);
        if(s.boss?.attack)mask(c,cam,s.boss.attack,z);
      }""")
        s=one(s,'      window.SnakeIndices?.draw(c,s,cam,z,selected);',"""      if(s.year===1976&&!selected)window.SnakePhosphore?.draw(c,s,cam,project,z);
      if(s.year!==1976||!selected)window.SnakeIndices?.draw(c,s,cam,z,selected);""")
        s=one(s,'    window.SnakeArchives?.draw(canvas,s,reduced);',"""    if(s.year===1976){
      window.SnakePhosphore?.draw(c,s,cam,project,s.plane??0);
      c.save();
      if(s.boss?.attack||s.ecologie?.wave)c.globalAlpha=.48;
      window.SnakeIndices?.draw(c,s,cam,s.plane??0,true);c.restore();
    }
    window.SnakeArchives?.draw(surface,s,reduced);""")
        s=one(s,'    if(s.plane===0)serpent(c,s,cam,points,0,true);','    if(points.length)serpent(c,s,cam,points,points[0].plane,true);')
        s=one(s,'window.SnakeMondes?.finish?.(canvas,s.year);','window.SnakeMondes?.finish?.(surface,s.year,canvas);')
    else:
        s=one(s,'function finish(canvas,year){','function finish(canvas,year,destination=canvas){')
        a=s.index('    let stage=stages.get(canvas);');b=s.index('    const img=c.getImageData',a)
        s=s[:a]+"""    const direct=canvas!==destination;
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
"""+s[b:]
        s=one(s,'    const img=c.getImageData(0,0,w,h),','    c.save();c.setTransform(1,0,0,1,0,0);\n    const img=c.getImageData(0,0,w,h),')
        s=one(s,'    c.putImageData(img,0,0);','    c.putImageData(img,0,0);c.restore();')
        s=one(s,"const out=canvas.getContext('2d');","const out=destination.getContext('2d');")
        s=one(s,'out.drawImage(stage.el,0,0,canvas.width,canvas.height);','out.drawImage(stage.el,0,0,destination.width,destination.height);')
    out+=''.join(unified_diff(raw.splitlines(True),s.splitlines(True),fromfile='a/snake 2985/labo/'+name,tofile='b/snake 2985/labo/'+name))
    if '--export' in sys.argv:
        d=here/'recette';d.mkdir(exist_ok=True);(d/Path(name).name).write_text(s)
name='campagne/index.html'
raw=(lab/name).read_text()
tag='<script src="../spectacle.js" defer></script>'
html=one(raw,tag,'<script src="../endurance/phosphore/lisibilite.js" defer></script>\n'+tag)
out+=''.join(unified_diff(raw.splitlines(True),html.splitlines(True),fromfile='a/snake 2985/labo/'+name,tofile='b/snake 2985/labo/'+name))
(here/'raccord.patch').write_text(out)

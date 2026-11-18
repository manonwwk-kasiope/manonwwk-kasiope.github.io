"""Construit le correctif de raccord à partir des sources utilisées dans la recette."""
from pathlib import Path
from difflib import unified_diff
here=Path(__file__).resolve().parent
lab=here.parent
files={}
def once(source,old,new):
    assert source.count(old)==1,old
    return source.replace(old,new)
old=(lab/'spectacle.js').read_text()
s=once(old,'  function draw(canvas,s,t=0,reduced=false,method=\'direct\'){',"""  const logicalBuffers=new WeakMap();
  function draw(canvas,s,t=0,reduced=false,method='direct'){""")
s=once(s,"    const c=canvas.getContext('2d');c.setTransform(w/W,0,0,h/H,0,0);", """    const format=window.SnakeMondes?.formats[s.year];
    let surface=canvas;
    if(format&&format.bits<32){
      surface=logicalBuffers.get(canvas);
      if(!surface){
        surface=document.createElement('canvas');
        surface.getContext('2d',{willReadFrequently:true});
        logicalBuffers.set(canvas,surface);
      }
      const lw=Math.min(w,format.width),lh=Math.max(1,Math.round(lw*h/w));
      if(surface.width!==lw)surface.width=lw;
      if(surface.height!==lh)surface.height=lh;
    }
    const c=surface.getContext('2d');c.setTransform(surface.width/W,0,0,surface.height/H,0,0);""")
s=once(s,"window.SnakeMondes?.finish?.(canvas,s.year);","window.SnakeMondes?.finish?.(surface,s.year,canvas);")
if 'window.SnakeArchives?.draw(canvas,s,reduced);' in s:
    s=once(s,'window.SnakeArchives?.draw(canvas,s,reduced);','window.SnakeArchives?.draw(surface,s,reduced);')
files['snake 2985/labo/spectacle.js']=(old,s)
old=(lab/'mondes/mondes.js').read_text()
s=once(old,"function finish(canvas,year){","function finish(canvas,year,destination=canvas){")
a=s.index('    let stage=stages.get(canvas);')
b=s.index('    const img=c.getImageData',a)
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
s=once(s,"const out=canvas.getContext('2d');","const out=destination.getContext('2d');")
s=once(s,"out.drawImage(stage.el,0,0,canvas.width,canvas.height);","out.drawImage(stage.el,0,0,destination.width,destination.height);")
files['snake 2985/labo/mondes/mondes.js']=(old,s)
patch=''.join(''.join(unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+name,tofile='b/'+name)) for name,(before,after) in files.items())
(here/'rendu-logique.patch').write_text(patch)

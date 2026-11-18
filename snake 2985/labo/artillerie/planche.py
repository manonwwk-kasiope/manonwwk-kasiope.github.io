"""Rejoue les chemins Canvas issus du moteur via Pillow, sans navigateur."""
from pathlib import Path
import json, subprocess, itertools, math
from PIL import Image, ImageDraw, ImageFont, ImageChops
root=Path(__file__).resolve().parent
capt=json.loads(subprocess.check_output(['node',str(root/'captures.cjs')]))
years=[1976,1985,1995,2185,2985]
kinds=['orbit','prism','shard','well','echo','chain','blast','rail','arc','nova']
names=['Satellites','Prisme','Éclats','Singularité','Écho','Chaîne','Détonation','Rail','Arc','Nova']
def font(n,b=False):
    return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial'+(' Bold' if b else '')+'.ttf',n)
def render(paths,w,h,fit=True,mask=False):
    flat=[p for row in paths for p in row['points']]
    xs,ys=zip(*flat);mx=(min(xs)+max(xs))/2;my=(min(ys)+max(ys))/2
    scale=min((w-14)/max(1,max(xs)-min(xs)),(h-12)/max(1,max(ys)-min(ys)),1.9) if fit else .41
    ss=4
    im=Image.new('RGBA',(w*ss,h*ss))
    d=ImageDraw.Draw(im)
    for row in paths:
        pts=[((w/2+(x-mx)*scale)*ss,(h/2+(y-my)*scale)*ss) for x,y in row['points']]
        col='white' if mask else row['color']
        if row.get('fill'):d.polygon(pts,fill=col)
        else:d.line(pts,fill=col,width=max(1,round(row['width']*ss*scale)),joint='curve')
    return im.resize((w,h),Image.Resampling.LANCZOS)
board=Image.new('RGB',(1360,648),'#101720')
d=ImageDraw.Draw(board)
d.text((30,19),'SNAKE 2985  /  LABORATOIRE VISUEL',font=font(16,True),fill='#8ce3d7')
d.text((28,43),'Armes et signatures de tir',font=font(33,True),fill='#f2f0e4')
d.text((30,88),'États du moteur · détails agrandis pour lecture',font=font(15),fill='#b2bdca')
left=136;col=120
for i,name in enumerate(names):d.text((left+(i+.5)*col,128),name,font=font(16,True),anchor='mm',fill='#e1e8e7')
for i,year in enumerate(years):
    y=150+i*96
    d.rounded_rectangle((18,y,1342,y+87),radius=12,fill=['#192420','#232337','#1c2938','#202a38','#252037'][i])
    d.text((32,y+22),str(year),font=font(24,True),fill='#f0f1e9')
    d.text((34,y+51),f'{2**(i+1)} bits',font=font(15),fill='#b0c1c3')
    for j,kind in enumerate(kinds):
        obj=render(capt[f'{year}:{kind}'],112,75)
        board.paste(obj,(left+j*col+4,y+6),obj)
board.save(root/'planche.png')
metrics=[]
for year in years:
    masks={k:render(capt[f'{year}:{k}'],260,90,False,True).getchannel('A').point(lambda a:255 if a>=75 else 0) for k in kinds}
    counts={k:im.histogram()[255] for k,im in masks.items()}
    pairs=[]
    for a,b in itertools.combinations(kinds,2):
        both=ImageChops.darker(masks[a],masks[b]).histogram()[255]
        union=counts[a]+counts[b]-both
        pairs.append((both/union,a,b))
    coefficient,a,b=max(pairs)
    metrics.append({'année':year,'pixels_allumés':counts,'intersection_union_max':round(coefficient,3),'paire':[a,b]})
assert all(row['intersection_union_max']<.8 and min(row['pixels_allumés'].values())>2 for row in metrics)
(root/'mesures.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')

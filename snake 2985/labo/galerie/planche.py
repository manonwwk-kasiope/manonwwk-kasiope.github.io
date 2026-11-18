"""Compose only the unmodified game captures and their external captions."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
W=1680; margin=48; gap=24; half=(W-2*margin-gap)//2
scenes=[
 (1976,2,'Le Terminal','La tête phosphorescente approche de la cellule.'),
 (1985,4,'Le Circuit néon','Le serpent monte sur le second plan.'),
 (1995,8,'La Gare autoroutière','L’express passe au-dessus de l’aiguillage.'),
 (2185,16,'La Ceinture orbitale','Le vaisseau quitte la grille et vise le premier anneau.'),
 (2985,32,'Le Cœur galactique','Face à La Singularité, le puits de gravité et la nova se déploient.')]
fontdir=Path('/System/Library/Fonts/Supplemental')
def font(size,bold=False):return ImageFont.truetype(str(fontdir/('Arial Bold.ttf' if bold else 'Arial.ttf')),size)
def height(w):return round(440*w/960)
small=height(half);large=height(2*half+gap)
row=102+small
top=111
H=top+row*2+26+102+large+margin
im=Image.new('RGB',(W,H),'#101720');d=ImageDraw.Draw(im)
d.text((margin,24),'Snake 2985',font=font(51,True),fill='#f4f1e8')
d.text((W-margin,50),'Les cinq époques',font=font(24),fill='#b6c6ca',anchor='rm')
d.line((margin,93,W-margin,93),fill='#3b4b55',width=2)
for i,(year,bits,place,caption) in enumerate(scenes):
    x=margin+(i%2)*(half+gap) if i<4 else margin
    y=top+(i//2)*row if i<4 else top+row*2+12
    w=half if i<4 else half*2+gap
    color=['#ceeeaa','#efaccb','#f4b988','#acd9f0','#d9b8eb'][i]
    d.text((x,y),str(year),font=font(36,True),fill=color)
    d.text((x+106,y+8),place,font=font(25,True),fill='#f3f1e9')
    d.text((x+w,y+11),f'{bits} bits',font=font(20),fill='#b5c8cb',anchor='ra')
    d.text((x,y+47),caption,font=font(20),fill='#bacbd0')
    shot=Image.open(ROOT/f'scene-{year}.png').convert('RGB')
    im.paste(shot.resize((w,height(w)),Image.Resampling.LANCZOS),(x,y+78))
im.save(ROOT/'cinq-epoques.png',optimize=True)

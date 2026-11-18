"""Compose le déroulé avec les sprites indexés et les poses projetées du moteur."""
import base64,json,math,subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent
poses=json.loads((root/'poses.json').read_text())
atlas=json.loads(subprocess.check_output(['node',str(root.parent/'sprites/catalogue.cjs')]))
def font(n,b=False):
    return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial'+(' Bold' if b else '')+'.ttf',n)
def sprite(role,point,scale):
    tile=atlas[f'2985:{role}:{point["z"]}']
    palette=[(0,0,0,0)]+[tuple(bytes.fromhex(c[1:]))+(255,) for c in tile['colors'][1:]]
    im=Image.new('RGBA',(tile['w'],tile['h']))
    im.putdata([palette[i] for i in base64.b64decode(tile['data'])])
    k=tile['scale']/tile['density']*point['k']*point['scale']*scale
    im=im.resize((max(1,round(im.width*k)),max(1,round(im.height*k))),Image.Resampling.LANCZOS)
    return im.rotate(-math.degrees(point['angle']),Image.Resampling.BICUBIC,expand=True)
out=Image.new('RGBA',(1280,840),'#101725');d=ImageDraw.Draw(out)
d.text((28,20),'SNAKE 2985   /   LABORATOIRE DU MOUVEMENT',fill='#92dcce',font=font(17,True))
d.text((26,47),'Du virage à la dernière vertèbre',fill='#f4f0e6',font=font(38,True))
labels={'virage':'Virage et absorption','bascule':'Passage entre les plans','queue':'Queue longue','vol':'Slalom en vol libre'}
for i,name in enumerate(labels):
    seq=poses[name][:4]; y=106+i*176
    d.text((29,y),labels[name],fill='#e8e9eb',font=font(19,True))
    for j,fr in enumerate(seq):
        x=26+j*311;top=y+31
        d.rounded_rectangle((x,top,x+300,top+129),radius=11,fill='#202a38')
        pts=fr['points'];xs=[p['x'] for p in pts];ys=[p['y'] for p in pts]
        k=min(1.99,265/(max(xs)-min(xs)+20),91/(max(ys)-min(ys)+18))
        if name=='queue':k*=.93
        cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2
        def proj(a,b):return x+150+(a-cx)*k,top+54+(b-cy)*k
        for n in reversed(range(1,len(pts))):
            a,b=pts[n],pts[n-1]
            if a['z']==b['z']:
                d.line([proj(a['x'],a['y']),proj(b['x'],b['y'])],fill='#71a3ac',width=max(1,round(4*k)))
        for path in fr['lines']:
            if path['ink']=='#ffdc8c':continue
            d.line([proj(a,b) for a,b in path['pts']],fill=path['ink'],width=max(1,round(path['w']*k)))
        for n in reversed(range(len(pts))):
            p=pts[n];im=sprite('body' if n else 'head',p,k);sx,sy=proj(p['x'],p['y'])
            out.alpha_composite(im,(round(sx-im.width/2),round(sy-im.height/2)))
        for path in fr['lines']:
            if path['ink']=='#ffdc8c':
                d.line([proj(a,b) for a,b in path['pts']],fill=path['ink'],width=max(1,round(path['w']*k)))
        d.text((x+11,top+105),f'{fr["time"]:.2f} s   ·   {len(pts)} segments'.replace('.',','),fill='#bccee0',font=font(14))
out.convert('RGB').save(root/'filmstrip.png')

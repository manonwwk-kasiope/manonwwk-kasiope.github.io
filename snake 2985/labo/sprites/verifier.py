"""Render the original indexed artwork; measure its spatial cues without a browser."""
import base64
import itertools
import json
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT=Path(__file__).resolve().parent
assets=json.loads(subprocess.check_output(['node',str(ROOT/'catalogue.cjs')]))
years=[1976,1985,1995,2185,2985]
boss_names=[('Le Registre','Le Mainframe'),('Le Magnétron','Le Cyclope'),('Le Signal fantôme','La Locomotive Spectre'),('Le Pulsar','L’Éclipse'),('Le Dévoreur','La Singularité')]
backgrounds=['#111b2b','#503364','#748b99','#e7bb91']
def asset(year,kind,plane=0):
    ent=assets[f'{year}:{kind}:{plane}']
    data=np.frombuffer(base64.b64decode(ent['data']),dtype='uint8').reshape(ent['h'],ent['w'])
    colors=np.zeros((8,4),dtype='uint8')
    for i,c in enumerate(ent['colors'][1:],1):colors[i]=[*bytes.fromhex(c[1:]),255]
    return ent,data,colors
def layer(year,kind,plane,scale,angle=0,marker=False):
    ent,data,colors=asset(year,kind,plane)
    rgba=colors[data].copy()
    if marker:rgba[:,:,3]=np.where(data==7,255,0)
    img=Image.fromarray(rgba);q=scale*ent['scale']/ent['density']
    size=(max(1,round(img.width*q)),max(1,round(img.height*q)))
    img=img.resize(size,Image.Resampling.NEAREST if year<2185 else Image.Resampling.BILINEAR)
    if angle:img=img.rotate(-angle,Image.Resampling.BICUBIC,expand=True)
    return img
def put(base,img,x,y):
    base.alpha_composite(img,(round(x-img.width/2),round(y-img.height/2)))
def font(size,bold=False):
    path='/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf'
    return ImageFont.truetype(path,size)
def plate():
    im=Image.new('RGBA',(1344,1080),'#0b121c');d=ImageDraw.Draw(im)
    d.text((34,20),'SNAKE 2985',font=font(22,True),fill='#a3e9d0')
    d.text((32,52),'Cinq époques, dix gardiens',font=font(47,True),fill='#f7f3eb')
    for x,title in [(44,'ÉPOQUE'),(206,'SERPENT'),(416,'DRONE'),(535,'CELLULE'),(698,'GARDIEN INTERMÉDIAIRE'),(1040,'GARDIEN FINAL')]:
        d.text((x,131),title,font=font(15,True),fill='#b0c3cf')
    for i,y in enumerate(years):
        top=162+174*i;mid=top+71
        d.rounded_rectangle((24,top,1320,top+162),18,fill=['#14202a','#1a1e30','#172731','#192536','#261e32'][i])
        d.text((44,mid-19),str(y),font=font(33,True),fill='#f0f5ed')
        d.text((47,mid+23),['2 bits','4 bits','8 bits','16 bits','32 bits'][i],font=font(18),fill='#acc2c7')
        for x in [186,222,258]:put(im,layer(y,'body',0,1.9),x,mid)
        put(im,layer(y,'head',0,2.2),292,mid)
        for x,k in [(443,'drone'),(570,'cell')]:put(im,layer(y,k,0,2.75),x,mid)
        for j,(x,k) in enumerate([(811,'mid'),(1113,'final')]):
            put(im,layer(y,k,0,2.0),x,mid)
            d.text((x,top+130),boss_names[i][j],font=font(19,True),fill='#f0f1ee',anchor='mm')
    im.convert('RGB').save(ROOT/'planche.png')
def normalmask(year,role):
    ent,data,_=asset(year,role)
    norm=Image.fromarray(np.where(data>=3,255,0).astype('uint8')).resize((120,96),Image.Resampling.NEAREST)
    return np.array(norm)>0
def separation(roles):
    pairs=[]
    for a,b in itertools.combinations(roles,2):
        x=normalmask(*a);y=normalmask(*b);overlap=(x&y).sum()/(x|y).sum()
        pairs.append((round(float(overlap),3),str(a),str(b)))
    return max(pairs)
results={'maxDroneCellIoU':max((separation([(y,'drone'),(y,'cell')]) for y in years)), 'bossMaximumIoU':separation(list(itertools.product(years,['mid','final']))),'headMaximumIoU':separation([(y,'head') for y in years])}
def lum(arr):
    rgb=np.asarray(arr,dtype=float)[...,:3]/255
    v=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
    return v@np.array([.2126,.7152,.0722])
def run():
    min_bright=1000;min_direction=1000;max_error=0;min_active_pixels=10000;count=0
    for year,width,plane,angle,bg in itertools.product(years,[320,568,852],[0,1],[i*22.5 for i in range(16)],backgrounds):
        # 78% projected distance clamp used at the back of the arena; rasterise at 4× for antialiasing.
        k=4*width/960*max(.78,390/width);bounds=(128,128);base=Image.new('RGBA',bounds,bg)
        # Other plan/drone and neck are drawn first, 8 and 12 design units behind the centre.
        vec=np.array([math.cos(math.radians(angle)),math.sin(math.radians(angle))])
        center=np.array([64.,64.])
        for distance,role in [(8,'drone'),(12,'body')]:
            unit=4*width/960*.78
            xy=center-vec*distance*unit
            enemy=layer(year,role,1-plane,4*width/960*max(.78,250/width),angle)
            if role=='drone':enemy.putalpha(enemy.getchannel('A').point(lambda a:round(a*.47)))
            put(base,enemy,*xy)
        previous=np.asarray(base.resize((32,32),Image.Resampling.LANCZOS),dtype=float).copy()
        head=layer(year,'head',plane,k,angle)
        put(base,head,*center)
        visible=np.asarray(base.resize((32,32),Image.Resampling.LANCZOS),dtype=float)
        a,b=lum(previous),lum(visible)
        contrast=(np.maximum(a,b)+.05)/(np.minimum(a,b)+.05)
        min_bright=min(min_bright,float(contrast.max()))
        min_active_pixels=min(min_active_pixels,int((contrast>=3).sum()))
        mask=Image.new('RGBA',bounds);put(mask,layer(year,'head',plane,k,angle,True),*center)
        indices=np.asarray(mask.getchannel('A').resize((32,32),Image.Resampling.BOX),dtype=float)
        m=indices.sum(); yy,xx=np.indices((32,32));mx=((xx+.5-16)*indices).sum()/m;my=((yy+.5-16)*indices).sum()/m
        v=np.array([mx,my])
        min_direction=min(min_direction,float(v@vec))
        err=math.degrees(math.acos(np.clip((v@vec)/np.linalg.norm(v),-1,1)));max_error=max(max_error,err);count+=1
    return dict(cases=count,backgrounds=backgrounds,minimumProjectedNoseOffsetCssPx=round(min_direction,2),maximumDirectionErrorDegrees=round(max_error,2),minimumPeakContrast=round(min_bright,2),minimumPixelsWithContrast3= min_active_pixels)
plate();results.update(run())
assert results['minimumProjectedNoseOffsetCssPx']>2 and results['maximumDirectionErrorDegrees']<18
assert results['minimumPixelsWithContrast3']>=1 and results['bossMaximumIoU'][0]<.88
print(json.dumps(results,ensure_ascii=False,indent=2))

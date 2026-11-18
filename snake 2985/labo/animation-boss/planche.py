"""Compose les sprites réels et leurs pièces avec Pillow, sans navigateur."""
import base64, json, math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
ROOT=Path(__file__).resolve().parent
atlas=json.loads(subprocess.check_output(['node',str(ROOT/'eprouver.cjs'),'--atlas']))
def render(v,phase,factor=3):
    base=v['base']; p=v[phase]; ink=p['pal']; dim=round(64*factor); center=dim/2
    image=Image.new('RGBA',(dim,dim)); pen=ImageDraw.Draw(image)
    def layer(shapes):
        for shape in shapes:
            pen.polygon([(center+x*factor,center+y*factor) for x,y in shape['points']],fill=ink[shape['color']])
    layer(p['layers']['rear'])
    indices=np.frombuffer(base64.b64decode(base['data']),dtype=np.uint8).reshape(base['h'],base['w'])
    colors=np.array([[0,0,0,0]]+[[*bytes.fromhex(c[1:]),255] for c in base['colors'][1:]],dtype=np.uint8)
    frame=Image.fromarray(colors[indices]);frame=frame.resize((round(frame.width*factor/base['density']),round(frame.height*factor/base['density'])),Image.Resampling.NEAREST if p['year']<2185 else Image.Resampling.BILINEAR)
    image.alpha_composite(frame,((dim-frame.width)//2,(dim-frame.height)//2))
    layer(p['layers']['front'])
    t=p['transform'];ca,si=math.cos(t['angle']),math.sin(t['angle'])
    a,b,d,e=ca/t['sx'],si/t['sx'],-si/t['sy'],ca/t['sy']
    return image.transform(image.size,Image.Transform.AFFINE,(a,b,center*(1-a-b),d,e,center*(1-d-e)),Image.Resampling.NEAREST if p['year']<2185 else Image.Resampling.BILINEAR)
def font(size,bold=False):
    return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial'+(' Bold' if bold else '')+'.ttf',size)
sheet=Image.new('RGB',(1024,1310),'#0d1019');d=ImageDraw.Draw(sheet)
d.text((32,25),'Dix gardiens en mouvement',font=font(39,True),fill='#fcf5e7')
d.text((34,79),'Préavis du moteur, salve active et fenêtre de riposte',font=font(20),fill='#abbacd')
for j,text in enumerate(['Anticipation','Frappe','Cœur ouvert']):
    d.text((435+j*224,130),text,anchor='mm',font=font(23,True),fill='#f7eacb')
metrics={}
def contrast(c1,c2):
    def Y(col):
        v=np.array(list(bytes.fromhex(col[1:])),dtype=float)/255
        return np.where(v<=.04045,v/12.92,((v+.055)/1.055)**2.4)@np.array([.2126,.7152,.0722])
    a,b=Y(c1),Y(c2);return round((max(a,b)+.05)/(min(a,b)+.05),2)
for i,(key,v) in enumerate(atlas.items()):
    top=159+114*i;mid=top+53;p=v['wind'];year=p['year'];name=p['name'];bg=['#14221c','#201c2a','#282127','#192630','#251e30'][i//2]
    d.rounded_rectangle((20,top,1004,top+106),10,fill=bg)
    d.text((36,mid-20),str(year),font=font(17),fill='#b1bfcb')
    d.text((35,mid+5),name,font=font(23,True),fill='#fcf5e7')
    for j,phase in enumerate(['wind','strike','open']):
        p=v[phase];f=5;img=render(v,phase,f)
        thumb=img.resize((202,202),Image.Resampling.LANCZOS)
        x=435+j*224;sheet.paste(thumb,(x-101,mid-101),thumb)
        at=p['tile']; tw=max(t[0] for t in at)-min(t[0] for t in at);th=max(t[1] for t in at)-min(t[1] for t in at)
        area=img.getchannel('A').point(lambda val:255 if val>127 else 0)
        l,t,r,b=area.getbbox()
        for width in [320,568,852]:
            u=p['fits'][str(width)]*1.67*max(.78,290/width,p['unit']); mask=Image.new('L',img.size)
            ImageDraw.Draw(mask).polygon([(img.width/2+xx/u*f,img.height/2+yy/u*f) for xx,yy in at],fill=255)
            inside=np.asarray(area)>0;outside=inside & ~(np.asarray(mask)>0)
            m=metrics.setdefault(key,{'maxWidthPct':0,'maxHeightPct':0,'maxInkOutsideTilePct':0})
            for k,val in [('maxWidthPct',(r-l)/f*u/tw*100),('maxHeightPct',(b-t)/f*u/th*100),('maxInkOutsideTilePct',outside.sum()/inside.sum()*100)]:
                m[k]=max(m[k],round(float(val),2))
            if phase=='open':
                m['coreContrast']=contrast(p['pal'][0],p['pal'][3])
                size=11*u*width/960*abs(math.cos(p['transform']['angle']))*p['transform']['sx']
                m['minCoreWidthCss']=min(m.get('minCoreWidthCss',999),round(size,2))
                # Capture du cœur et de son joint noir à taille CSS, après sous-échantillonnage.
                css=max(5,round(img.width*u/f*width/960))
                stamp=Image.new('RGBA',img.size,'#1c2531');stamp.alpha_composite(img)
                pixels=np.asarray(stamp.resize((css,css),Image.Resampling.LANCZOS).convert('RGB'),dtype=float)/255
                yy,xx=np.indices((css,css));diamond=abs(xx+.5-css/2)+abs(yy+.5-css/2)
                light=diamond<=size*.48;edge=(diamond>size*.48)&(diamond<=size*.83)
                lum=np.where(pixels<=.04045,pixels/12.92,((pixels+.055)/1.055)**2.4)@np.array([.2126,.7152,.0722])
                local=(lum[light].max()+.05)/(lum[edge].min()+.05)
                m['minCoreRenderedContrast']=min(m.get('minCoreRenderedContrast',999),round(float(local),2))
sheet.save(ROOT/'planche.png')
(ROOT/'emprises.json').write_text(json.dumps(metrics,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(metrics,ensure_ascii=False))
assert all(x['maxInkOutsideTilePct']==0 for x in metrics.values())
assert min(metrics[k]['minCoreRenderedContrast'] for k in ['1976:mid','1976:final'])>=4.5
# Relecture silencieuse du premier préavis de chaque boss ; un poste vide signifie la fin de sa prise.
def film():
    frames=[];sample=json.loads(subprocess.check_output(['node',str(ROOT/'eprouver.cjs'),'--animer']))
    heads={k:0 for k in atlas}
    for n in range(80):
        sec=n/12;page=Image.new('RGB',(790,425),'#11141c');pen=ImageDraw.Draw(page)
        pen.text((16,9),f'Gardiens   •   {sec:.1f} s après le premier préavis',font=font(19,True),fill='#faf5df')
        for i,(k,v) in enumerate(atlas.items()):
            row=sample[k];local=row[0]['t']+sec
            while heads[k]+1<len(row) and row[heads[k]+1]['t']<=local:heads[k]+=1
            pose=row[heads[k]]; col=i//2;level=i%2;x=80+col*157;y=140+level*177
            pen.text((x,y-71),str(v['wind']['year']),font=font(14),fill='#b7c0ca',anchor='mm')
            if local<=row[-1]['t']+.08:
                img=render({'base':v['base'],'live':pose},'live',2).resize((166,166),Image.Resampling.LANCZOS)
                page.paste(img,(x-83,y-83),img)
                desc={'open':'Cœur ouvert','wind':'Anticipation','strike':'Frappe','idle':'En veille'}[pose['phase']]
            else:desc='Fin de la prise'
            pen.text((x,y+53),v['wind']['name'],font=font(14,True),fill='#f6eddd',anchor='mm')
            pen.text((x,y+71),desc,font=font(13),fill='#aaefc9',anchor='mm')
        frames.append(page)
    frames[0].save(ROOT/'relecture.gif',save_all=True,append_images=frames[1:],duration=[80,80,90]*26+[80,80],loop=0,disposal=2)
if '--film' in __import__('sys').argv:film()

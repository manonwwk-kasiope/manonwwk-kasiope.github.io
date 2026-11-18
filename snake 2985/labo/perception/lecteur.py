"""Pixel-only decoder. This module has no access to renderer, labels or filenames."""
import base64
import json
import math
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter

HERE=Path(__file__).resolve().parent
ART=json.loads((HERE/'modeles.json').read_text())
W,H=384,176
Y,X=np.indices((H,W))
GATE=(Y>H*.28)&(Y<H*.98)&(X>W*.04)&(X<W*.97)
PALETTES={
 1976:['111c22','304a43','70946b','dcf1ab'],
 1985:['101324','1c2239','28364b','403551','664565','915a7a','be7885','e9a491','ffdfaa','ffefc7','36516b','507b89','60a4a5','96d9c6','ccf5e0','d86967']}
def linear(a):
    return a[...,0]*.24+a[...,1]*.58+a[...,2]*.18
def era(rgb):
    # Scan the original integer samples before resizing, preserving RGB332/RGB565 quantisation.
    arr=rgb[::7,::7]; rr,gg,bb=arr.transpose(2,0,1)
    if np.mean((rr==17)&(gg==28)&(bb==34))>.03:return 1976
    if np.mean((rr==16)&(gg==19)&(bb==36))>.025:return 1985
    if np.mean(np.isin(bb,[0,85,170,255]))>.92:return 1995
    if np.mean((rr==(rr&248)+(rr>>5))&(gg==(gg&252)+(gg>>6))&(bb==(bb&248)+(bb>>5)))>.94:return 2185
    # An unquantised CRT still has recognisable phosphor across the background.
    if np.mean((gg.astype(float)>rr*1.14)&(gg.astype(float)>bb*1.05))>.32:return 1976
    return 2985
def prepare(rgb):
    g=np.asarray(Image.fromarray(rgb).resize((W,H),Image.Resampling.BILINEAR)).astype('float32')/255
    return g,linear(g)
def box(a,h,w):
    # Centered sum, zero-padded outside the image.
    p=np.pad(a,((h//2,h-1-h//2),(w//2,w-1-w//2)))
    u=np.pad(p,((1,0),(1,0))).cumsum(0,dtype=float).cumsum(1,dtype=float)
    return u[h:,w:]-u[:-h,w:]-u[h:,:-w]+u[:-h,:-w]
def raster(year,role,angle,unit):
    ref=ART[f'{year}:{role}:0']
    arr=np.frombuffer(base64.b64decode(ref['data']),'uint8').reshape(ref['h'],ref['w'])
    color=np.zeros((8,4),dtype='uint8')
    for i,hexcolor in enumerate(ref['colors'][1:],1):color[i]=[*bytes.fromhex(hexcolor[1:]),255]
    img=Image.fromarray(color[arr]);q=4*W/960*ref['scale']*unit/ref['density']
    img=img.resize((max(1,round(img.width*q)),max(1,round(img.height*q))),Image.Resampling.NEAREST)
    img=img.rotate(-angle,resample=Image.Resampling.BILINEAR,expand=True)
    side=25 if role=='head' else 13
    # Synthetic dark local ground, rasterised at four times canonical resolution.
    plane=Image.new('RGBA',(4*side,4*side),(28,36,48,255))
    plane.alpha_composite(img,((plane.width-img.width)//2,(plane.height-img.height)//2))
    gray=linear(np.asarray(plane.convert('RGB').resize((side,side),Image.Resampling.BOX))/255)
    # Use one common weighted square per role to normalise local contrast.
    return (gray-gray.mean())/(np.linalg.norm(gray-gray.mean())+1e-8)
@lru_cache(maxsize=2)
def bank(year):
    result={}
    for role in ['head','cell']:
        kernels=[];labels=[]
        for angle in ([i*22.5 for i in range(16)] if role=='head' else [0]):
            for scale in ([.78,1.,1.25] if role=='head' else [.78,1.,1.22]):
                a=raster(year,role,angle,scale);h,w=a.shape
                full=np.zeros((H,W),'float32');full[:h,:w]=a
                full=np.roll(full,(-int(h//2),-int(w//2)),(0,1))
                kernels.append(np.conj(np.fft.rfft2(full)).astype('complex64'));labels.append((angle,scale))
        result[role]=(kernels,labels)
    return result
def peaks(scores,n,dist):
    s=scores.copy();out=[]
    for i in range(n):
        y,x=np.unravel_index(np.argmax(s),s.shape);out.append((int(x),int(y),float(s[y,x])))
        s[max(0,y-dist):y+dist+1,max(0,x-dist):x+dist+1]=-100
    return out
def corr(gray,ft,year,role):
    size=25 if role=='head' else 13
    energy=box(gray**2,size,size)-box(gray,size,size)**2/size**2
    denominator=np.sqrt(np.maximum(.015,energy))
    kernels,labels=bank(year)[role]
    best=np.full((H,W),-2,'float32');angle=np.zeros((H,W),'float32')
    for k,(degree,scale) in zip(kernels,labels):
        score=np.fft.irfft2(ft*k,s=(H,W)).real/denominator
        mask=score>best;best[mask]=score[mask];angle[mask]=degree
    return np.where(GATE,best,-2),angle
def baseline(g,yr):
    src=ART[f'{yr}:head:0']['colors']
    def closest(colors):
        distance=np.stack([np.sqrt(((g-np.array(list(bytes.fromhex(c[1:])))/255)**2).sum(2)) for c in colors]).min(0)
        return np.exp(-distance*8)
    head=box(closest([src[3],src[7]]),7,7)/49
    hp=peaks(np.where(GATE,head,-2),1,4)[0]
    tgt=box(closest(ART[f'{yr}:cell:0']['colors'][3:4]),3,3)/9
    dist=np.hypot(X-hp[0],Y-hp[1]);tp=peaks(np.where(GATE&(dist>7),tgt*np.exp(-dist/135),-2),1,4)[0]
    return hp,tp,head,tgt
def positions(rgb):
    yr=era(rgb);g,gray=prepare(rgb);ft=np.fft.rfft2(gray)
    heads,ang=corr(gray,ft,yr,'head');cells,_=corr(gray,ft,yr,'cell')
    bh,bt,headcolor,cellcolor=baseline(g,yr)
    # Fuse low-frequency material evidence with local zero-mean shape matching.
    # Confidence remains the shape score used for abstention.
    hp=peaks(heads+.60*headcolor,1,6)[0]
    hp=(hp[0],hp[1],float(heads[hp[1],hp[0]]))
    candidates=peaks(cells+.28*cellcolor,36,4)
    # Head/neck and several pieces of ammunition share pickup highlights.
    best=max(candidates,key=lambda t: t[2]-.0055*math.hypot(t[0]-hp[0],t[1]-hp[1])-(.41 if math.hypot(t[0]-hp[0],t[1]-hp[1])<8 else 0))
    best=(best[0],best[1],float(cells[best[1],best[0]]))
    return dict(year=yr,head=hp,target=best,angle=float(ang[hp[1],hp[0]]),basehead=bh,basetarget=bt)
def dangerfeat(rgb,center,dir):
    # No camera or pose supplied. Estimate visible step size only from screen height.
    g,_=prepare(rgb);x,y=center
    dx=(6.8+3.7*y/H)*dir[0];dy=(3.5+3.2*y/H)*dir[1]
    cx,cy=round(x+dx),round(y+dy)
    xx=np.clip(np.arange(cx-3,cx+4),0,W-1);yy=np.clip(np.arange(cy-2,cy+3),0,H-1)
    patch=g[yy[:,None],xx[None,:]]
    left=g[yy[:,None],np.clip(xx-8,0,W-1)[None,:]];right=g[yy[:,None],np.clip(xx+8,0,W-1)[None,:]]
    v=linear(patch)
    return np.r_[patch.mean((0,1)),patch.max((0,1)),patch.mean((0,1))-(right+left).mean((0,1))*.5,
      np.percentile(v,[20,50,80]),np.mean(np.abs(np.diff(v,axis=1))),np.mean(np.abs(np.diff(v,axis=0)))]

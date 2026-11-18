"""Matched-image footprint and local contrast, with engine ground truth only for evaluation."""
from pathlib import Path
import json,collections
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parent
rows=json.loads((ROOT/'annotations-paires.json').read_text());groups=collections.defaultdict(dict)
for a in rows:groups[a['seed']][a['marked']]=a
fractions=[];headOverlap=[];S=[]
def rgb(a):return np.asarray(Image.open(ROOT/'paires'/(a['id']+'.png')).convert('RGB'))
def contrast(image,c,w):
    x,y=c;R=max(3,round(w/100));Y,X=np.indices((2*R+1,2*R+1))
    u=image[round(y)-R:round(y)+R+1,round(x)-R:round(x)+R+1]/255
    lum=(np.where(u<.04045,u/12.92,((u+.055)/1.055)**2.4)@np.array([.2126,.7152,.0722]))
    return (np.percentile(lum,90)+.05)/(np.percentile(lum,10)+.05)
for p in groups.values():
    a,b=p[False],p[True];before,after=rgb(a),rgb(b);change=np.any(before!=after,axis=2)
    fractions.append(change.mean())
    if a['head']:
        x,y=a['head'];r=max(2,round(a['width']/190));headOverlap.append(bool(change[round(y)-r:round(y)+r+1,round(x)-r:round(x)+r+1].any()))
    if b['cue']['cell']:
        S.append([contrast(im,b['target'],b['width']) for im in [before,after]])
S=np.asarray(S);report={'pairs':len(groups),'maxModifiedPixelPercent':round(max(fractions)*100,3),
 'headCenterROIsChanged':sum(headOverlap),'headCenterROIs':len(headOverlap),
 'cellsMarked':len(S),'cellContrastBetter':int((S[:,1]>S[:,0]).sum()),'cellContrastWorse':int((S[:,1]<S[:,0]).sum()),
 'medianLocalContrastBefore':round(float(np.median(S[:,0])),2),'medianLocalContrastAfter':round(float(np.median(S[:,1])),2)}
(ROOT/'impact-pixels.json').write_text(json.dumps(report,indent=2)+'\n');print(report)

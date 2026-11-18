"""Runnable reader: one RGB image + frozen calibration learned on separate frames."""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image
from lecteur import W,H,positions,dangerfeat
ROOT=Path(__file__).resolve().parent
def lire(rgb):
    model=json.loads((ROOT/'calibration.json').read_text());cuts=model['thresholds']
    p=positions(rgb);h,w=rgb.shape[:2];dirs=('droite','bas','gauche','haut')
    def location(key):
        x,y,score=p[key]
        return [round(x*w/W,2),round(y*h/H,2)] if score>=cuts[key] else None
    def report(naive):
        head='basehead' if naive else 'head';cell='basetarget' if naive else 'target'
        ds=[]
        if location(head) is not None:
            f=np.array([dangerfeat(rgb,p[head][:2],d) for d in [(1,0),(0,1),(-1,0),(0,-1)]])
            if naive:risk=f[:,0]-f[:,1];cut=cuts['basezone']
            else:
                z=(f-np.array(model['mean']))/np.array(model['sd'])
                risk=np.c_[np.ones(4),z]@np.array(model['coef']);cut=cuts['zone']
            ds=[d for d,score in zip(dirs,risk) if score>=cut]
        return {'tete':location(head),'angleDeg':None if naive or location(head) is None else p['angle'],'cellule':location(cell),'directionsDanger':ds}
    return {'largeur':w,'hauteur':h,'epoqueInferee':p['year'],'gabarits':report(False),'couleur':report(True)}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('image');args=parser.parse_args()
    print(json.dumps(lire(np.asarray(Image.open(args.image).convert('RGB'))),ensure_ascii=False,indent=2))

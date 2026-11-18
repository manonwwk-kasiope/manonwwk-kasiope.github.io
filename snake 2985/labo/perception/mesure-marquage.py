from pathlib import Path
import json,math,collections,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from lire import lire
ROOT=Path(__file__).resolve().parent
labels=json.loads((ROOT/'annotations-paires.json').read_text());pairs=collections.defaultdict(dict)
hash_model=hashlib.sha256((ROOT/'calibration.json').read_bytes()).hexdigest()
for a in labels:
    p=lire(np.asarray(Image.open(ROOT/'paires'/(a['id']+'.png')).convert('RGB')))
    pairs[a['seed']][a['marked']]=(a,p)
def correct(q,xy,p):
    return xy is not None and q is not None and math.hypot((q[0]-xy[0])*384/p['width'],(q[1]-xy[1])*176/p['height'])<=4
def matched(a,b,m,key):
    v=b[m]
    if key=='zone':return set(v['directionsDanger'])==set(np.array(['droite','bas','gauche','haut'])[np.array(a['directions'])])
    q={'head':'tete','target':'cellule'}[key]
    return correct(v[q],a[key],a) if a[key] else v[q] is None
def score(data,m,key,on):
    tp=fp=fn=0
    for pair in data:
        a,p=pair[on];v=p[m]
        if key=='zone':
            ref=set(np.array(['droite','bas','gauche','haut'])[np.array(a['directions'])]);test=set(v['directionsDanger']);tp+=len(ref&test);fp+=len(test-ref);fn+=len(ref-test)
        else:
            q={'head':'tete','target':'cellule'}[key];ok=correct(v[q],a[key],a);tp+=ok;fp+=(v[q] is not None and not ok);fn+=(a[key] is not None and not ok)
    return {'tp':int(tp),'fp':int(fp),'fn':int(fn)}
def measure(data):
    report={'n':len(data)}
    for m in ['gabarits','couleur']:
        report[m]={}
        for key in ['head','target','zone']:
            subset=[p for p in data if key!='zone' or p[False][0]['head'] is not None]
            out=[(matched(*p[False],m,key),matched(*p[True],m,key)) for p in subset]
            report[m][key]={'avant':score(subset,m,key,False),'apres':score(subset,m,key,True),
              'corriges':sum(not x and y for x,y in out),'degrades':sum(x and not y for x,y in out)}
    return report
allrows=list(pairs.values())
def tag(p,k):return p[True][0]['cue'][k]
groups={
 'toutes':allrows,'cellule_marquee':[p for p in allrows if tag(p,'cell')],
 'cellule_collectable':[p for p in allrows if p[False][0]['mode']!='vol'],
 'frontiere_2bits':[p for p in allrows if tag(p,'walls')],
 '2bits':[p for p in allrows if p[False][0]['year']==1976],
 'sans_marque':[p for p in allrows if not tag(p,'cell') and not tag(p,'walls')]}
different=[p for p in groups['sans_marque'] if p[False][0]['sha']!=p[True][0]['sha']]
assert not different
result={k:measure(v) for k,v in groups.items()}
result['calibrationSHA256']=hash_model;result['sans_marque_images_identiques']=len(groups['sans_marque'])
(ROOT/'resultats-marquage.json').write_text(json.dumps(result,indent=2)+'\n')
def unique(xs):
    ids=set();ret=[]
    for v in xs:
        k=v[False][0]['seed']
        if k not in ids:ids.add(k);ret.append(v)
    return ret
examples=unique([groups['frontiere_2bits'][0],*groups['cellule_marquee']])
other=next((p for p in examples if p[True][0]['year']!=1976),examples[-1])
samples=[examples[0],other]
sheet=Image.new('RGB',(1100,565),'#101a24');d=ImageDraw.Draw(sheet);F=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',19)
for j,text in enumerate(['Rendu du jeu','Marquage conditionnel']):d.text((12+j*546,5),text,font=F,fill='white')
for i,pair in enumerate(samples):
    for j in [False,True]:
        a,_=pair[j];im=Image.open(ROOT/'paires'/(a['id']+'.png')).convert('RGB').resize((534,245))
        x=12+j*546;y=36+i*263
        d.text((x,y),str(a['year']),font=F,fill='#c7e6d6');sheet.paste(im,(x,y+24))
sheet.save(ROOT/'marquage-compare.png')
print(json.dumps({k:{'n':v['n'],'cellule':v['gabarits']['target'],'zone':v['gabarits']['zone']} for k,v in result.items() if isinstance(v,dict)},indent=2))

"""Calibrate only on the labelled calibration split and apply its frozen settings."""
import json,math,collections
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parent
W,H=384,176;TOL=4
rows=json.loads((ROOT/'annotations.json').read_text());obs=json.loads((ROOT/'observations.json').read_text())
train=[a for a in rows if a['split']=='calibration'];test=[a for a in rows if a['split']=='holdout']
def error(a,name,role):
    point=a[role]
    if point is None:return math.inf
    x,y=obs[a['id']][name][:2]
    return math.hypot(x-point[0]*W/a['width'],y-point[1]*H/a['height'])
def pr(tp,fp,fn):
    return dict(tp=int(tp),fp=int(fp),fn=int(fn),precision=round(tp/max(1,tp+fp),3),recall=round(tp/max(1,tp+fn),3),f1=round(2*tp/max(1,2*tp+fp+fn),3))
def stats(usable,emitted,correct):
    pos=np.array(usable,bool);detect=np.array(emitted,bool);ok=np.array(correct,bool)&pos&detect
    out=pr(ok.sum(),(detect&~ok).sum(),(pos&~ok).sum())
    out.update(absents=int((~pos).sum()),fausses_alertes_sur_absents=int((detect&~pos).sum()))
    return out
def posstats(sample,name,role,cut,tolerance=TOL):
    return stats([a[role] is not None for a in sample],[obs[a['id']][name][2]>=cut for a in sample],
        [error(a,name,role)<=tolerance for a in sample])
thresholds={}
for name,role in [('head','head'),('target','target'),('basehead','head'),('basetarget','target')]:
    scores=[obs[a['id']][name][2] for a in train]+[-1]
    thresholds[name]=max(scores,key=lambda cut:(posstats(train,name,role,cut)['f1'],-cut))
def features(a):return np.array(obs[a['id']]['features'])
zone_train=[a for a in train if a['head'] is not None]
features0=np.vstack([features(a) for a in zone_train]);labels=np.array([b for a in zone_train for b in a['directions']],float)
mean=features0.mean(0);sd=np.maximum(.015,features0.std(0))
def transform(matrix):
    z=(matrix-mean)/sd
    return np.c_[np.ones(len(z)),z]
F=transform(features0);weights=np.where(labels>0,.5/labels.sum(),.5/(len(labels)-labels.sum()))
coef=np.linalg.solve((F.T*weights)@F+np.diag([.00001]+[.14]*(F.shape[1]-1)),(F.T*weights)@labels)
def risk(a):return transform(features(a))@coef
def colorrisk(a):
    f=np.array(obs[a['id']]['basefeatures'])
    return f[:,0]-f[:,1] # warm red region versus green
def dangerMetrics(sample,cut,baseline=False):
    sample=[a for a in sample if a['head'] is not None]
    refs=[];hits=[];actual=[];wrong=0
    for a in sample:
        scores=colorrisk(a) if baseline else risk(a)
        key='basehead' if baseline else 'head'
        live=obs[a['id']][key][2]>=thresholds[key]
        est=(scores>=cut)&live;ref=np.asarray(a['directions']);refs.extend(ref);hits.extend(est)
        actual.append((ref.any(),est.any()));wrong+=int(np.any(ref!=est))
    refs=np.array(refs);hits=np.array(hits)
    ret=pr(np.sum(refs&hits),np.sum(hits&~refs),np.sum(~hits&refs))
    ret['n_scenes']=len(sample);ret['scenes_exactes']=len(sample)-wrong
    ret['presence']=stats([x[0] for x in actual],[x[1] for x in actual],[True]*len(sample))
    return ret
for label,func in [('zone',risk),('basezone',colorrisk)]:
    scores=np.concatenate([func(a) for a in train])
    thresholds[label]=float(max(np.unique(scores),key=lambda cut:dangerMetrics(train,cut,label=='basezone')['f1']))
def report(sample,details=False):
    h=posstats(sample,'head','head',thresholds['head'])
    t=posstats(sample,'target','target',thresholds['target'])
    degs=[abs((obs[a['id']]['angle']-a['angle']+180)%360-180) for a in sample if a['head'] and error(a,'head','head')<=TOL and obs[a['id']]['head'][2]>=thresholds['head']]
    ret={'n':len(sample),'head':h,'angle':{'n':len(degs),'median':round(float(np.median(degs)),1) if degs else None,'under30':int(np.sum(np.array(degs)<=30))},
      'cell':t,'zone':dangerMetrics(sample,thresholds['zone'])}
    if details:
      ret.update(naive={'head':posstats(sample,'basehead','head',thresholds['basehead']),
        'cell':posstats(sample,'basetarget','target',thresholds['basetarget']),'zone':dangerMetrics(sample,thresholds['basezone'],True)},
        tol8={'head':posstats(sample,'head','head',thresholds['head'],8),'cell':posstats(sample,'target','target',thresholds['target'],8)})
    return ret
normal=[a for a in test if a['ablation']=='normal']
pairs=collections.defaultdict(dict)
for a in test:pairs[a['seed']][a['ablation']]=a
ablations={}
for ab in ['sans-palette','sans-fx','sans-corps','sans-hors-plan']:
    match=[(d['normal'],d[ab]) for d in pairs.values() if ab in d]
    out={}
    for role,name in [('head','head'),('target','target')]:
        def good(a):
            pred=obs[a['id']][name][2]>=thresholds[name]
            return pred and error(a,name,role)<=TOL if a[role] is not None else not pred
        for key,subset in [('all',match),('2bits',[m for m in match if m[0]['year']==1976])]:
            out[role+'_'+key]={'n':len(subset),'rescues':sum(not good(a) and good(b) for a,b in subset),
              'regressions':sum(good(a) and not good(b) for a,b in subset)}
    def danger_good(a):
        v=obs[a['id']]['head'][2]>=thresholds['head']
        return np.array_equal((risk(a)>=thresholds['zone'])&v,a['directions'])
    for key,subset in [('all',match),('2bits',[m for m in match if m[0]['year']==1976])]:
        subset=[(a,b) for a,b in subset if a['head'] is not None]
        out['zone_'+key]={'n':len(subset),'rescues':sum(not danger_good(a) and danger_good(b) for a,b in subset),
          'regressions':sum(danger_good(a) and not danger_good(b) for a,b in subset)}
    ablations[ab]=out
result={'calibration':len(train),'holdout':report(normal,True),'byYear':{y:report([a for a in normal if a['year']==y]) for y in sorted({a['year'] for a in normal})},
  'byMode':{m:report([a for a in normal if a['mode']==m]) for m in ['grille','vol','bascule']},
  'byPlane':{p:report([a for a in normal if a['plane']==p]) for p in [0,1]},'ablations':ablations,'thresholds':thresholds,
  'eraCorrect':sum(a['year']==obs[a['id']]['year'] for a in normal)}
(ROOT/'calibration.json').write_text(json.dumps({'thresholds':thresholds,'mean':mean.tolist(),'sd':sd.tolist(),'coef':coef.tolist()},indent=2)+'\n')
(ROOT/'resultats.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['holdout'],indent=2))

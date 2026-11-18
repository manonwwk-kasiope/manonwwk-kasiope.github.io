"""Détecte hors sortie audio les attaques accentuées proches du premier temps de chaque mesure."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
here=Path(__file__).resolve().parent
rows=json.loads((here.parent/'audio/pouls.json').read_text())
out=[]
for row in rows:
    mp3=here.parents[1]/'audio'/row['track']
    raw=subprocess.check_output(['ffmpeg','-nostdin','-v','error','-i',str(mp3),'-t',str(row['loopEnd']+.5),'-ac','1','-ar','12000','-f','f32le','pipe:1'])
    data=np.frombuffer(raw,dtype='<f4')
    windows=np.lib.stride_tricks.sliding_window_view(data,360)[::48]
    times=(np.arange(len(windows))*48+180)/12000
    spec=np.abs(np.fft.rfft(windows*np.hanning(360),axis=1))
    bands=np.stack([np.log1p(5*spec[:,a:b].mean(axis=1)) for a,b in [(1,5),(5,13),(13,30),(30,75),(75,150)]])
    flux=np.maximum(0,np.diff(bands,axis=1,prepend=bands[:,:1])).mean(axis=0)
    lo=row['loopStart'];hi=row['loopEnd'];hits=[]
    for t in row['bars'][:-1]:
        anchor=t+row['attackOffset']
        within=np.flatnonzero((abs(times-anchor)<=.075)&(times>=lo)&(times<hi))
        local=flux[abs(times-anchor)<=.35]
        if not len(within):continue
        peak=within[flux[within].argmax()]
        if flux[peak]>=np.percentile(local,75) and flux[peak]>.003:hits.append(round(float(times[peak]),4))
    assert hits
    out.append({'year':row['year'],'lo':lo,'hi':hi,'rate':row['rate'],'accents':hits,'bars':len(row['bars'])-1,
                'source':row['track'],'sha256':hashlib.sha256(mp3.read_bytes()).hexdigest()})
(here/'accents.js').write_text('/* Repères PCM mesurés par accents.py ; horodatage dans le fichier source. */\n'+
    'globalThis.SnakeNovaAccents='+json.dumps(out,separators=(',',':'),ensure_ascii=False)+';\n')
print([(r['year'],len(r['accents']),r['bars']) for r in out])

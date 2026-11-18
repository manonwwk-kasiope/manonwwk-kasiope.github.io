"""Contrôle hors sortie, PCM FFmpeg et instant de la première image de chaque noire."""
import json
import subprocess
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
rows=json.loads((HERE/'pouls.json').read_text())
RATE=12000
HOP=48
# Délai de compensation mesuré entre signal décodé et musique à la destination.
native= json.loads((HERE/'hors-sortie.webkit.json').read_text())
native_lag={r['year']:-np.median([c['musicMatch']['lagMs'] for c in r['channels']])/1000 for r in native['checks']}

def metrics(visual,targets,rate,latency):
    errors=[]
    for hz in [60,120]:
        for phase in np.arange(8)/(8*hz):
            first=np.ceil((visual/rate-phase)*hz-1e-9)/hz+phase
            errors.extend((first-targets/rate-latency)*1000)
    a=np.asarray(errors)
    return dict(medianAbsMs=round(float(np.median(abs(a))),3),p90AbsMs=round(float(np.percentile(abs(a),90)),3),
                signedMedianMs=round(float(np.median(a)),3))

def measure(row):
    year=row['year'];rate=row['rate'];latency=native_lag[year]
    raw=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(HERE.parents[1]/'audio'/row['track']),
        '-t',str(row['loopEnd']+.4),'-ar',str(RATE),'-ac','1','-f','f32le','-'])
    pcm=np.frombuffer(raw,'<f4')
    # Détecteur séparé de celui qui a construit pouls.json : fenêtre Hann de 40 ms,
    # pas de 4 ms, flux positif sur 5 bandes, lissage triangulaire sur 3 pas.
    nfft=480
    frames=np.lib.stride_tricks.sliding_window_view(pcm,nfft)[::HOP]
    freq=np.fft.rfftfreq(nfft,1/RATE)
    ft=np.abs(np.fft.rfft(frames*np.hanning(nfft)))
    bands=np.vstack([np.log1p(5*np.mean(ft[:,(freq>=a)&(freq<b)],axis=1)) for a,b in
        [(45,180),(180,480),(480,1100),(1100,2400),(2400,5500)]])
    flux=np.maximum(0,np.diff(bands,axis=1,prepend=bands[:,:1])).mean(axis=0)
    flux=np.convolve(flux,[.25,.5,.25],mode='same')
    times=(np.arange(len(frames))*HOP+nfft/2)/RATE
    bars=row['bars']; grid=np.concatenate([np.linspace(a,b,5)[:-1] for a,b in zip(bars,bars[1:])])+row['attackOffset']
    grid=grid[(grid>row['loopStart']+.1)&(grid<row['loopEnd']-.1)]
    positions=[]
    for t in grid:
        idx=np.flatnonzero(abs(times-t)<=.065)
        positions.append(times[idx[np.argmax(flux[idx])]])
    targets=np.asarray(positions);count=len(grid)
    train=np.arange(count)<count//2
    validation=(np.arange(count)>=count//2)&(np.arange(count)<count*3//4)
    test=np.arange(count)>=count*3//4
    baseline=lambda mask:metrics(grid[mask],targets[mask],rate,latency)
    # La grille est calée dans le MP3 ; limiter le déplacement à 12 ms de lecture.
    choices=np.arange(-12,13)/1000*rate
    pick=min(choices,key=lambda n:(metrics(grid[train]+n,targets[train],rate,latency)['medianAbsMs'],abs(n)))
    candidate=lambda mask:metrics(grid[mask]+pick,targets[mask],rate,latency)
    before,after=baseline(validation),candidate(validation)
    selected=after['medianAbsMs']<before['medianAbsMs']-1 and after['p90AbsMs']<=before['p90AbsMs']+1
    return dict(year=year,latencySeconds=float(latency),candidateSourceSeconds=round(float(pick),6),selected=selected,
        trainBeats=int(sum(train)),validationBeats=int(sum(validation)),testBeats=int(sum(test)),
        validationBefore=before,validationCandidate=after,testBefore=baseline(test),testCandidate=candidate(test),
        selectedTest=candidate(test) if selected else baseline(test))
out=[measure(r) for r in rows]
(HERE/'calage-visuel.json').write_text(json.dumps(out,indent=2)+'\n')
for r in out:print(r['year'],r['latencySeconds'],r['candidateSourceSeconds'],r['selected'],r['testBefore'],r['testCandidate'])

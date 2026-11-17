"""Analyse PCM en mémoire. Dépend de NumPy et FFmpeg disponibles localement."""
from pathlib import Path
import json
import re
import subprocess
import numpy as np
HERE=Path(__file__).resolve().parent
# Fenêtres de boucles jouables et vitesse de lecture de bande-son.js.
CONFIG=[
    (1976,'neonvelocity-2',.00978,16.70448,1),
    (1985,'electro-tension-t106',46.573264,93.102453,1.18),
    (1995,'electro-titan-t112',20.856536,61.280214,1.055),
    (2185,'voix-machine-t106',29.398906,72.861226,1.09),
    (2985,'voix-plus-vite-t108',30.411815,72.629350,1.08)]
SR=12000
HOP=60
WINDOW=360

def measure(year,name,lo,hi,rate):
    mp3=HERE.parents[1]/'audio'/(name+'.mp3')
    if year==1976: hi=.00978+42*1.66947
    raw=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(mp3),'-t',str(hi+1),
        '-ac','1','-ar',str(SR),'-f','f32le','-'])
    pcm=np.frombuffer(raw,'<f4')
    blocks=np.lib.stride_tricks.sliding_window_view(pcm,WINDOW)[::HOP]
    times=(np.arange(len(blocks))*HOP+WINDOW/2)/SR
    rms=np.sqrt(np.mean(blocks**2,axis=1))
    # Première fenêtre de 30 ms au-dessus de -50 dBFS, résolution 5 ms.
    start=max(0,times[np.flatnonzero(rms>10**(-50/20))[0]]-WINDOW/(2*SR))
    mag=np.abs(np.fft.rfft(blocks*np.hanning(WINDOW),axis=1))
    # Égalisation des bandes avant flux pour ne pas suivre seulement le grave.
    bands=np.stack([np.log1p(np.mean(mag[:,a:b],axis=1)*5) for a,b in
                    [(1,5),(5,13),(13,30),(30,75),(75,150)]])
    flux=np.maximum(0,np.diff(bands,axis=1,prepend=bands[:,:1])).mean(axis=0)
    if year==1976:
        # Plateau instrumenté : les dix mesures d’intro ont un pouls moins marqué.
        bars=.00978+np.arange(10,43)*1.66947
    else:
        js=(HERE.parents[1]/'bande-son.js').read_text()
        m=re.search(re.escape(name+'.mp3')+r'.*?mesures: \[([^\]]+)\]',js,re.S)
        bars=np.array([float(x) for x in m[1].split(',') if x.strip()])
    lo,hi=bars[0],bars[-1]
    beats=np.concatenate([np.linspace(a,b,5)[:-1] for a,b in zip(bars,bars[1:])])
    mid=(lo+hi)/2
    train=beats[(beats>=lo+.12)&(beats<mid-.12)]
    # Les bornes de mesure existantes évitent de cumuler les fluctuations de tempo.
    # Calage des attaques à moins de 90 ms sur la première moitié seulement.
    shifts=np.arange(-.09,.091,.0025)
    fit=[np.interp(train+off,times,flux).mean() for off in shifts]
    offset=shifts[np.argmax(fit)]
    period=np.median(np.diff(bars))/4
    anchor=lo+offset
    held=beats[(beats>mid+.12)&(beats<hi-.12)]+offset
    offsets=[]
    for b in held:
        indexes=np.flatnonzero(abs(times-b)<=.065)
        offsets.append(times[indexes[np.argmax(flux[indexes])]]-b)
    grid_strength=np.interp(held,times,flux).mean()
    off_strength=np.median([np.interp(held+phi*period,times,flux).mean()
                            for phi in [.2,.3,.4,.5,.6,.7,.8]])
    return dict(year=year,track=name+'.mp3',loopStart=lo,loopEnd=hi,rate=rate,
                firstSignalSeconds=round(start,5),anchor=round(anchor,6),attackOffset=round(offset,6),bars=bars.tolist(),period=round(period,8),
                bpmSource=round(60/period,2),bpmPlayback=round(60/period*rate,2),
                heldOutBeats=len(held),medianNearestAttackMs=round(float(np.median(abs(np.array(offsets))))*1000,1),
                gridOverOffset=round(float(grid_strength/off_strength),2))
rows=[measure(*x) for x in CONFIG]
(HERE/'pouls.json').write_text(json.dumps(rows,indent=2)+'\n')
# Données chargées par script classique : pas de requête JSON au démarrage.
(HERE/'pouls-data.js').write_text(
    '/* Généré par analyse-pouls.py depuis les données PCM et les repères du jeu. */\n'
    +'globalThis.SnakeCampagnePulseData = '+json.dumps(rows,separators=(',',':'))+';\n')
print(json.dumps(rows,indent=2))

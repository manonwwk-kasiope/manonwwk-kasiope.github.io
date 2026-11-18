"""PCM des sources réelles, rabattu par le banc Node. Aucun fichier sonore."""
import hashlib
import itertools
import json
import sys
import numpy as np

catalog = json.loads(sys.stdin.buffer.readline())
rate = 12000
audio = np.frombuffer(sys.stdin.buffer.read(), '<f4').reshape(len(catalog), 2, 2*rate)
window = np.hanning(256)
freq = np.fft.rfftfreq(256, 1/rate)

def describe(signal):
    x = signal.astype(float)
    rms = np.sqrt(np.mean(x*x))
    assert rms > 0
    unit = x / rms
    fingerprint = hashlib.sha256(np.rint(unit * 65536).astype('<i4').tobytes()).hexdigest()[:20]
    frames = np.lib.stride_tricks.sliding_window_view(x, 256)[::128]
    spectrum = np.sum(abs(np.fft.rfft(frames * window))**2, axis=0)
    centroid = np.average(freq, weights=spectrum)
    energy = np.cumsum(x*x)
    q10, q90 = np.searchsorted(energy, energy[-1]*np.array([.1,.9]))
    return {'sha':fingerprint,'shaRaw':hashlib.sha256(signal.tobytes()).hexdigest()[:20],
            'centroidHz':round(centroid,1),'energy10to90ms':round(1000*(q90-q10)/rate,1),
            'peakDbFS':round(20*np.log10(max(abs(x))),2)}

for row,(sequence,launch) in zip(catalog,audio):
    row.update(describe(sequence))
    row['firstShot'] = describe(launch)['sha']

def energy_profile(signal):
    x = signal.astype(float)
    frames = np.lib.stride_tricks.sliding_window_view(x, 256)[::128]
    power = abs(np.fft.rfft(frames * window))**2
    # Distance de Hellinger sur l’énergie répartie en temps et en fréquence.
    return np.sqrt(power / power.sum())

profiles = {id(r): energy_profile(a[0]) for r, a in zip(catalog, audio)}
summary = []
for year,group in itertools.groupby(catalog,key=lambda r:r['year']):
    cases = list(group)
    line = {'year':year}
    for target,key in [(False,'miss'),(True,'hit')]:
        subset = [c for c in cases if c['target']==target]
        line[key] = {k:len({c[k] for c in subset}) for k in ('sha','shaRaw','firstShot')}
        pairs = [(float(np.linalg.norm(profiles[id(a)]-profiles[id(b)]) / np.sqrt(2)),
                  a['core']+'/'+a['mod'], b['core']+'/'+b['mod'])
                 for a,b in itertools.combinations(subset,2)]
        nearest = min(p for p in pairs if p[0]>1e-8)
        line[key]['identicalPairs'] = sum(p[0]<1e-8 for p in pairs)
        line[key]['nearestDifferent'] = [round(nearest[0],4),*nearest[1:]]
        for k in ('centroidHz','energy10to90ms'):
            v=[c[k] for c in subset]
            line[key][k]=[min(v),max(v)]
    subset = [c for c in cases if not c['target']]
    starts = [energy_profile(audio[catalog.index(c), 1, :int(.12*rate)]) for c in subset]
    line['minLaunch120ms'] = round(min(np.linalg.norm(a-b)/np.sqrt(2)
                       for a,b in itertools.combinations(starts,2)),4)
    assert all(line[key][k] == 9 for key in ['miss','hit'] for k in ['sha','shaRaw','firstShot'])
    summary.append(line)
print(json.dumps({'sampleRate':rate,'ticksPerSecond':120,'summary':summary,'cases':catalog},separators=(',',':')))

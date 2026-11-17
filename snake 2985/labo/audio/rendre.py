"""Banc hors ligne. Python 3, NumPy et ffmpeg. Aucun périphérique audio."""
from pathlib import Path
import hashlib
import json
import subprocess
import wave
import numpy as np

HERE = Path(__file__).resolve().parent
AUDIO = HERE.parents[1] / 'audio'
SR = 24000
TAU = 2 * np.pi
SOURCES = {
    'neonvelocity-2': (16.7, 1), 'electro-tension-t106': (46.57, 1.18),
    'electro-titan-t112': (20.86, 1.055), 'voix-machine-t106': (29.4, 1.09),
    'voix-plus-vite-t108': (30.42, 1.08)}
CORES = ['orbit', 'prism', 'well']
MODS = ['echo', 'chain', 'blast']


def db(x):
    return float(20 * np.log10(max(x, 1e-12)))


def rms(x):
    return np.sqrt(np.mean(x*x))


def time(duration):
    return np.arange(round(SR * duration)) / SR


def shape(t, decay=2):
    return np.minimum(t / .007, 1) * np.minimum((t[-1]-t) / .014, 1) * np.exp(-decay*t/t[-1])


def chirp(t, start, end):
    return np.sin(TAU * (start*t + .5*(end-start)*t*t/t[-1]))


def stereo(x, pan=0):
    return np.column_stack((x*np.sqrt((1-pan)/2), x*np.sqrt((1+pan)/2)))


def put(buf, pos, sig, gain=1):
    i = round(pos*SR)
    n = min(len(buf)-i, len(sig))
    if n > 0:
        buf[i:i+n] += sig[:n]*gain


def blank(d):
    return np.zeros((round(SR*d), 2))


def sweep(start, end, duration, level, pan=0, decay=2):
    t = time(duration)
    return stereo(level*shape(t, decay)*chirp(t, start, end), pan)


def core_shot(core):
    out = blank(.42)
    if core == 'orbit':
        t = time(.38)
        beat = chirp(t, 510, 620) + .62*chirp(t, 524, 611)
        put(out, 0, stereo(.27 * shape(t)*beat, .72*np.sin(TAU*3*t)))
    if core == 'prism':
        for i, end in enumerate([1030, 1450, 1920]):
            put(out, .036*i, sweep(730, end, .16, .33, (i-1)*.65))
    if core == 'well':
        put(out, 0, sweep(870, 205, .39, .55, decay=1.4))
        put(out, .026, sweep(432, 310, .28, .24))
    return out


def hit(mod):
    out = blank(.23)
    if mod == 'echo':
        put(out, 0, sweep(940, 645, .085, .31))
    if mod == 'chain':
        for i, f in enumerate([1180, 1550, 1910]):
            put(out, .041*i, sweep(f, f*.82, .072, .36, .45*(-1)**i))
    if mod == 'blast':
        put(out, 0, sweep(780, 130, .18, .57))
        put(out, .008, sweep(1860, 490, .062, .36))
    return out


def depth(variant, far):
    t = time(.36)
    if variant == 'A':
        # Un timbre à huit partiels ; la coupure descend à l'éloignement.
        u = t/t[-1] if far else 1-t/t[-1]
        cutoff = 3200*(510/3200)**u
        x = sum(chirp(t, 340*n, 340*n) * n**(-.32) /
                (1+(340*n/cutoff)**6) for n in range(1, 9))
        return stereo(.27 * shape(t, .45)*x, .62*(2*u-1))
    out = blank(.36)
    # Trois notes descendantes espacées ou deux frappes montantes rapprochées.
    notes = [(0, 1460), (.112, 1050), (.226, 740)] if far else [(0, 740), (.077, 1460)]
    for i, (at, freq) in enumerate(notes):
        put(out, at, sweep(freq, freq*.99, .103, .41, .22*(-1)**i, decay=.95))
    return out


def environment(era, duration):
    out = blank(duration)
    # Pulses attachés au défilement supposé de la scène, ici à vitesse constante.
    freq, interval = [(420, 1.45), (615, 1.12), (380, .89), (935, 1.28)][era]
    for i, pos in enumerate(np.arange(.15, duration, interval)):
        direction = (-1)**i
        t = time(.165)
        tone = chirp(t, freq*1.08, freq*.92) + [.25, .13, .42, .3][era]*chirp(t, freq*3, freq*2.8)
        put(out, pos, stereo(.12*shape(t)*tone, direction*.7*(1-2*t/t[-1])))
    return out


def flight():
    out = blank(.27)
    put(out, 0, sweep(280, 925, .24, .48, decay=.65))
    put(out, .04, sweep(410, 660, .18, .25))
    return out


def throat(duration):
    t = time(duration)
    pressure = np.sin(np.pi*t/t[-1])**2
    phase = TAU*np.cumsum(1.4+4.6*pressure)/SR
    return stereo(.22*pressure*(.52+.48*np.cos(phase))*chirp(t, 310, 475))


def read_track(name):
    start, rate = SOURCES[name]
    raw = subprocess.check_output(['ffmpeg','-v','error','-nostdin','-ss',str(start),
        '-i',str(AUDIO/(name+'.mp3')),'-t','13','-af',f'aresample=48000,asetrate=48000*{rate},aresample={SR}',
        '-ac','2','-ar',str(SR),'-f','f32le','-'])
    return np.frombuffer(raw, '<f4').reshape(-1,2).astype(float)


def filter_band(x, low, high):
    f = np.fft.rfftfreq(len(x), 1/SR)
    transfer = 1/np.sqrt(1+(low/np.maximum(f,.01))**8)/np.sqrt(1+(f/high)**8)
    return np.fft.irfft(np.fft.rfft(x, axis=0)*transfer[:,None], n=len(x), axis=0)


def profile(x, name):
    if name == 'stereo':
        return x
    mono = np.mean(x, axis=1, keepdims=True)
    return filter_band(mono, *({'mono_mobile':(320,5300), 'mono_etroit':(580,3500)}[name]))


def evidence(x, variant):
    # Mesure du signal mélangé seul ; horodatage de traversée connu.
    if variant == 'A':
        def bright(part):
            return db(rms(filter_band(part,1450,3300))) - db(rms(filter_band(part,300,900)))
        return bright(x[220:1800])-bright(x[5700:7350])
    def energy(pos, freq):
        v = x[round(pos*SR):round((pos+.064)*SR)]
        t = time(len(v)/SR)
        z = (np.hanning(len(t))*np.exp(-1j*TAU*freq*.995*t)) @ v
        return np.sqrt(np.mean(abs(z)**2))
    return db(energy(.012,1460)+energy(.235,740))-db(energy(.012,740)+energy(.087,1460))


def write_wav(file, sig):
    # Gain identique pour tous les exemples et fondu seulement aux bords.
    sig = sig.copy()*.4
    fade = np.linspace(0,1,round(.035*SR))[:,None]
    sig[:len(fade)] *= fade
    sig[-len(fade):] *= fade[::-1]
    assert abs(sig).max() < 1
    with wave.open(str(HERE/file),'wb') as w:
        w.setparams((sig.shape[1],2,SR,0,'NONE',''))
        w.writeframes(np.rint(sig*32767).astype('<i2').tobytes())
    return {'duration_s':len(sig)/SR,'sample_peak_dbfs':db(abs(sig).max()),'rms_dbfs':db(rms(sig))}


def main():
    tracks = {k:read_track(k) for k in SOURCES}
    report = {'sources':{k: {'start_s':v[0],'rate':v[1],
        'sha256':hashlib.sha256((AUDIO/(k+'.mp3')).read_bytes()).hexdigest()} for k,v in SOURCES.items()},
        'tests':{}, 'files':{}, 'catalogue':[]}
    gain = .79*.82
    for variant in ['A','B']:
        for mode in ['stereo','mono_mobile','mono_etroit']:
            margins, masks, peaks, clips = [],[],[],0
            for track in tracks.values():
                for i in range(18):
                    start = round((.21+i*.64)*SR)
                    m = track[start:start+len(time(.36))]*gain
                    for far in [True,False]:
                        fx = depth(variant,far)*.72
                        mixed = m+fx
                        y = profile(mixed,mode)
                        margins.append(evidence(y,variant)*(1 if far else -1))
                        masks.append(db(rms(filter_band(profile(fx,mode),650,3000))) -
                                     db(rms(filter_band(profile(m,mode),650,3000))))
                        peaks.append(db(np.max(abs(mixed))))
                        clips += int(np.sum(abs(mixed)>=1))
            report['tests'][variant+'_'+mode] = {'correct':int(np.sum(np.array(margins)>0)), 'n':len(margins),
                'feature_margin_min_db':min(margins),'feature_margin_median_db':float(np.median(margins)),
                'fx_over_music_650_3000_p10_db':float(np.percentile(masks,10)),
                'peak_raw_dbfs':max(peaks),'clipping_raw_samples':clips}
        excerpt = tracks['voix-plus-vite-t108'][:SR*6]*gain
        for i in range(4):
            put(excerpt,.55+i*1.28,depth(variant,i%2==0),.72)
        for mode in ['stereo','mono_mobile']:
            file=f'plans-{variant}-{mode}.wav'
            report['files'][file]=write_wav(file,profile(excerpt,mode))

    # Classification des gestes de forge à horaire connu, sans accès à la musique seule.
    # Les gabarits sont des maquettes isolées et normalisées. Aucune étiquette humaine.
    report['forge_mono'] = {}
    for family, names, render in [('tir',CORES,core_shot),('impact',MODS,hit)]:
        refs = [profile(render(name),'mono_mobile').ravel() for name in names]
        refs = np.array([ref/np.linalg.norm(ref) for ref in refs])
        tally = np.zeros((3,3),dtype=int)
        bands = []
        for track in tracks.values():
            for i in range(18):
                start = round((.21+i*.64)*SR)
                for n,name in enumerate(names):
                    fx = .72*render(name)
                    bed = track[start:start+len(fx)]*gain
                    mixed = profile(fx+bed,'mono_mobile').ravel()
                    tally[n,np.argmax(refs @ mixed)] += 1
                    bands.append(db(rms(filter_band(profile(fx,'mono_mobile'),350,3200))) -
                                 db(rms(filter_band(profile(bed,'mono_mobile'),350,3200))))
        report['forge_mono'][family]={'labels':names,'confusion':tally.tolist(),
                                      'fx_over_music_p10_db':float(np.percentile(bands,10))}
    catalog = blank(12)
    for i, core in enumerate(CORES):
        for j, mod in enumerate(MODS):
            pos = (i*3+j)*1.28+.15
            put(catalog,pos,core_shot(core),.72)
            put(catalog,pos+.26,hit(mod),.72)
            if mod == 'echo':
                put(catalog,pos+.38,core_shot(core),.72)
            report['catalogue'].append([round(pos,2),core,mod])
    file = 'forge-neuf-recettes.wav'
    report['files'][file] = write_wav(file,catalog+tracks['electro-titan-t112'][:len(catalog)]*gain)

    scene = blank(12)
    for era, name in enumerate(['neonvelocity-2','neonvelocity-2','electro-tension-t106','voix-plus-vite-t108']):
        bed = tracks[name][:SR*3].copy()*((.39 if era==0 else .79)*.82)
        if era==0:
            # Même motif de défilement, extrait MP3 d'ouverture du terminal.
            raw = subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(AUDIO/(name+'.mp3')),
                                          '-t','3','-ac','2','-ar',str(SR),'-f','f32le','-'])
            bed = np.frombuffer(raw,'<f4').reshape(-1,2).copy()*(.39*.82)
        bed += .72*environment(era,3)
        put(bed,.42,flight(),.72)
        put(bed,1.0,throat(1.8),.72)
        fade = np.linspace(0,1,round(.05*SR))[:,None]
        bed[:len(fade)] *= fade
        bed[-len(fade):] *= fade[::-1]
        put(scene,3*era,bed)
    file='vol-gorge-quatre-epoques.wav'
    report['files'][file]=write_wav(file,scene)

    # Rafale déterministe, impacts groupés par fenêtre depuis le premier accepté.
    arrivals = [base+j*.008 for base in np.arange(.20,5.9,.31) for j in range(8)]
    stress = blank(6.3)
    accepted = []
    for at in arrivals:
        if not accepted or at-accepted[-1] >= .080:
            accepted.append(at)
            put(stress,at,hit('blast'),.72)
    for at in [.2,.58,2,2.38,3.8,4.18,5.6,5.98]:
        put(stress,at,core_shot('prism'),.72)
    put(stress,.21,depth('B',True),.72)
    put(stress,.2,flight(),.72)
    mixed = stress + tracks['electro-titan-t112'][:len(stress)]*gain
    report['stress']={'raw_hits':len(arrivals),'audible_hits':len(accepted),
        'shots':8,'window_s':6.3,'raw_peak_dbfs':db(abs(mixed).max()),
        'clipping_raw_samples':int(np.sum(abs(mixed)>=1)), 'duty_fx_over_minus45_dbfs':
        float(np.mean([db(rms(frame))>-45 for frame in np.array_split(stress,315)]))}
    (HERE/'mesures.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')


if __name__=='__main__':
    main()

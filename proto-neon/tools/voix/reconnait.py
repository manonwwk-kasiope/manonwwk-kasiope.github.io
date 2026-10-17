"""tools/voix/reconnait.py : contre-épreuve d'intelligibilité de la voix de la machine.

Un reconnaisseur vocal (PocketSphinx, modèle anglais américain, livré dans le paquet PyPI) écoute les WAV
produits par `node tools/voix/mesure.mjs --wav <dossier>` et dit ce qu'il entend :

  1. ÉPREUVE FERMÉE : le mot doit sortir parmi les 12 mots de la voix ET une soixantaine de mots pièges qui
     lui ressemblent (READY / steady, red, rainy ; WARNING / morning, warming ; DANGER / ranger, stranger...).
  2. TRANSCRIPTION LIBRE : modèle de langue général (des dizaines de milliers de mots), sans aide.
  3. Chaque épreuve est passée sur trois versions du son : brut ; « téléphone » (passe-haut 350 Hz d'ordre 4,
     passe-bas 7 kHz) ; « musique » (bruit rose 9 dB sous la voix, en RMS, qui masque comme la piste).

Un reconnaisseur entraîné sur des voix humaines est un juge sévère pour une voix de robot : s'il reconnaît le
mot, une oreille humaine, qui lit en plus le mot à l'écran, le reconnaîtra.

Usage : python3 reconnait.py <dossier des WAV> [sortie.json]
Dépendances : pip install pocketsphinx numpy scipy (hors du jeu : outil de mesure seulement)."""
import json
import os
import sys
import wave

import numpy as np
from scipy import signal
from pocketsphinx import Decoder, get_model_path

MOTS = {
    'READY': 'ready', 'GO': 'go', 'WARNING': 'warning', 'DANGER': 'danger', 'EXCELLENT': 'excellent',
    'GAMEOVER': 'game over', 'CHAIN': 'chain', 'PERFECT': 'perfect', 'NEWRECORD': 'new record',
    'BOSS': 'boss', 'LEVEL': 'level', 'CLEAR': 'clear',
}
PIEGES = [
    'steady', 'red', 'rainy', 'read', 'already', 'heady',
    'no', 'low', 'toe', 'goal', 'show', 'call', 'though',
    'morning', 'warming', 'mourning', 'learning', 'burning', 'warring',
    'ranger', 'changer', 'stranger', 'major', 'manger', 'danger zone',
    'excellence', 'elephant', 'accident', 'eloquent', 'relevant',
    'game', 'came over', 'same over', 'game of', 'gay', 'over',
    'change', 'train', 'cane', 'chair', 'shame',
    'prefect', 'project', 'person', 'effect', 'affect',
    'new', 'record', 'reckon', 'nuke', 'new rector',
    'loss', 'moss', 'bus', 'bath', 'bossy',
    'devil', 'label', 'lethal', 'revel', 'lever', 'novel',
    'clean', 'near', 'here', 'career', 'queer', 'glare',
]
MODELE = get_model_path()
HMM = os.path.join(MODELE, 'en-us', 'en-us')
DICO = os.path.join(MODELE, 'en-us', 'cmudict-en-us.dict')
LM = os.path.join(MODELE, 'en-us', 'en-us.lm.bin')


def lire(chemin):
    with wave.open(chemin, 'rb') as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    if sr != 16000:
        x = signal.resample_poly(x, 16000, sr)
    pad = np.zeros(int(0.3 * 16000))
    x = np.concatenate([pad, x, pad])
    # un souffle de fond à −60 dB : un silence numérique pur fausse les cepstres du reconnaisseur
    return x + np.random.default_rng(1).standard_normal(len(x)) * 0.001


def telephone(x):
    sos = signal.butter(4, 350, 'highpass', fs=16000, output='sos')
    sos2 = signal.butter(2, 7000, 'lowpass', fs=16000, output='sos')
    return signal.sosfilt(sos2, signal.sosfilt(sos, x))


def musique(x, snr_db=9.0):
    rng = np.random.default_rng(2975)
    b = rng.standard_normal(len(x))
    f = np.fft.rfft(b)
    f[1:] /= np.sqrt(np.arange(1, len(f)))  # bruit rose
    rose = np.fft.irfft(f, len(x))
    actif = np.abs(x) > 0.01 * np.max(np.abs(x))
    rv = np.sqrt(np.mean(x[actif] ** 2))
    rr = np.sqrt(np.mean(rose ** 2))
    return x + rose * rv / rr * 10 ** (-snr_db / 20)


def pcm(x):
    m = np.max(np.abs(x))
    if m > 0.99:
        x = x * 0.99 / m
    return (x * 32767).astype(np.int16).tobytes()


def decodeur_ferme():
    choix = sorted(set(MOTS.values()) | set(PIEGES))
    gram = '#JSGF V1.0;\ngrammar voix;\npublic <mot> = ' + ' | '.join(choix) + ' ;\n'
    d = Decoder(hmm=HMM, dict=DICO, lm=None, logfn=os.devnull)
    d.add_jsgf_string('voix', gram)
    d.activate_search('voix')
    return d


def decodeur_libre():
    return Decoder(hmm=HMM, dict=DICO, lm=LM, logfn=os.devnull)


def ecouter(d, x):
    d.start_utt()
    d.process_raw(pcm(x), full_utt=True)
    d.end_utt()
    h = d.hyp()
    return (h.hypstr if h else '').strip()


def main():
    dossier = sys.argv[1]
    sortie = sys.argv[2] if len(sys.argv) > 2 else None
    df, dl = decodeur_ferme(), decodeur_libre()
    res, score = {}, {'ferme': {}, 'libre': {}}
    versions = {'brut': lambda x: x, 'telephone': telephone, 'musique': musique}
    for mot, attendu in MOTS.items():
        chemin = os.path.join(dossier, mot + '.wav')
        if not os.path.exists(chemin):
            continue
        x = lire(chemin)
        r = {}
        for nom, fn in versions.items():
            y = fn(x)
            f = ecouter(df, y)
            l = ecouter(dl, y)
            r[nom] = {'ferme': f, 'ferme_ok': f == attendu, 'libre': l, 'libre_ok': attendu in l}
            score['ferme'].setdefault(nom, 0)
            score['libre'].setdefault(nom, 0)
            score['ferme'][nom] += f == attendu
            score['libre'][nom] += attendu in l
        res[mot] = r
        print(f"{mot:10s} " + '  '.join(
            f"{n}: {'OK' if v['ferme_ok'] else 'xx'} {v['ferme']!r:14s} libre {'OK' if v['libre_ok'] else 'xx'} {v['libre']!r}"
            for n, v in r.items()))
    n = len(res)
    print('épreuve fermée :', {k: f'{v}/{n}' for k, v in score['ferme'].items()},
          ' transcription libre :', {k: f'{v}/{n}' for k, v in score['libre'].items()})
    if sortie:
        with open(sortie, 'w', encoding='utf-8') as fo:
            json.dump({'mots': res, 'score': score, 'n': n, 'pieges': len(PIEGES)}, fo, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()

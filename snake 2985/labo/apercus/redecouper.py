"""Recrée les cinq aperçus à partir du film silencieux et des reçus du tournage.

Depuis le dossier du jeu :
  python3 labo/apercus/redecouper.py /tmp/apercus-nouveau-film
  python3 labo/apercus/redecouper.py /tmp/apercus-controle --comparer labo/apercus

Utilise FFmpeg, ffprobe et Pillow avec prise en charge de WebP. --film permet de
sélectionner un autre MP4 ; ses reçus provenance.json et ffprobe.json sont attendus
dans le même dossier. Les cinq fichiers sont vérifiés avant leur mise en place.
"""

import argparse
import hashlib
from io import BytesIO
import json
import math
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from xml.sax.saxutils import escape

from PIL import Image, ImageChops, ImageStat


FIRST_OFFSETS = {1976: 39, 1985: 0, 1995: 0, 2185: 0, 2985: 15}
FRAME_COUNT = 40
STEP = 3
FPS = 30
COLUMNS, ROWS = 8, 5
WIDTH, HEIGHT = 336, 154
CROP = (20, 0, 960, 440)


def check(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def takes(source):
    provenance = json.loads(source.with_name('provenance.json').read_text())
    receipt = json.loads(source.with_name('ffprobe.json').read_text())
    digest = sha(source)
    check(receipt['sha256'] == digest, 'Le SHA-256 du film diffère du reçu ffprobe.json.')
    streams = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(source),
    ]))['streams']
    check(len(streams) == 1 and streams[0]['codec_type'] == 'video', 'Le film doit contenir une seule piste vidéo silencieuse.')
    video = streams[0]
    check((video['width'], video['height'], video['avg_frame_rate']) == (1000, 460, '30/1'),
          'Le cadrage source ou la cadence a changé ; vérifier les limites de la caméra.')
    check(provenance['fps'] == FPS and provenance['frames'] == int(video['nb_frames']),
          'Le nombre d’images ou la cadence diffère de provenance.json.')
    clips = provenance['clips']
    check(sorted(c['year'] for c in clips) == sorted(FIRST_OFFSETS), 'Les cinq prises par époque sont nécessaires.')
    start = 0
    cuts = []
    for clip in clips:
        year, length = clip['year'], clip['frames']
        check(length >= STEP * FRAME_COUNT, f'La prise {year} dure moins de quatre secondes.')
        # L'ordre et les limites des prises viennent du nouveau tournage.
        offset = min(FIRST_OFFSETS[year], length - STEP * FRAME_COUNT)
        cuts.append((year, start + offset))
        start += length
    check(start == provenance['frames'], 'La durée cumulée des prises diffère de celle du film.')
    return digest, cuts


def extract(source, start):
    crop = CROP
    filters = (
        f'trim=start_frame={start}:end_frame={start+FRAME_COUNT*STEP},'
        f'select=not(mod(n\\,{STEP})),setpts=N/(10*TB),'
        f'crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]},scale={WIDTH}:{HEIGHT}:flags=lanczos'
    )
    raw = subprocess.check_output([
        'ffmpeg', '-nostdin', '-v', 'error', '-threads', '2', '-i', str(source),
        '-map', '0:v:0', '-an', '-vf', filters, '-fps_mode', 'passthrough',
        '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1',
    ])
    stride = WIDTH * HEIGHT * 3
    check(len(raw) == FRAME_COUNT * stride, 'Extrait incomplet.')
    return [Image.frombytes('RGB', (WIDTH, HEIGHT), raw[i:i+stride]) for i in range(0, len(raw), stride)]


def encode(source, year, start, digest, out):
    frames = extract(source, start)
    animated = BytesIO()
    frames[0].save(animated, format='WEBP', quality=64, method=4, save_all=True,
                   append_images=frames[1:], duration=100, loop=0, minimize_size=True)
    animated.seek(0)
    with Image.open(animated) as comparison:
        check(comparison.n_frames == FRAME_COUNT, f'La prise {year} comprend des images figées ou manquantes.')
    # Ordre stable des champs, identique aux premières planches publiées.
    info = {'source': source.name, 'sha256': digest, 'year': year, 'sourceFirstFrame': start,
            'sourceLastFrame': start + (FRAME_COUNT-1)*STEP, 'sourceFPS': FPS, 'cropXYWH': list(CROP),
            'frameWH': [WIDTH, HEIGHT], 'columns': COLUMNS, 'rows': ROWS, 'frames': FRAME_COUNT,
            'durationMs': 4000, 'sampleEveryFrames': STEP, 'webpAnimatedBytesSameQuality': len(animated.getvalue()),
            'encoder': 'Pillow WebP quality 64 method 4'}
    xml = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
           '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description>'
           + escape(json.dumps(info, separators=(',', ':')))
           + '</dc:description></rdf:Description></rdf:RDF></x:xmpmeta>')
    board = Image.new('RGB', (WIDTH*COLUMNS, HEIGHT*ROWS))
    for i, frame in enumerate(frames):
        board.paste(frame, (i%COLUMNS*WIDTH, i//COLUMNS*HEIGHT))
    board.save(out, quality=64, method=4, xmp=xml.encode())
    with Image.open(out) as decoded:
        check(decoded.n_frames == 1 and decoded.size == board.size and digest.encode() in decoded.info['xmp'],
              'La géométrie de la planche ou sa provenance est incorrecte.')
        for i, original in enumerate(frames):
            x, y = i%COLUMNS*WIDTH, i//COLUMNS*HEIGHT
            crop = decoded.crop((x, y, x+WIDTH, y+HEIGHT))
            rms = ImageStat.Stat(ImageChops.difference(crop, original)).rms
            mse = sum(v*v for v in rms)/3
            check(mse == 0 or 10*math.log10(255**2/mse) > 25, f'{year} image {i} : erreur de découpage ou de compression.')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('sortie', type=Path, help='Dossier où placer les cinq images.')
    parser.add_argument('--film', type=Path, default=Path(__file__).resolve().parents[1]/'film'/'Snake-2985-cinq-epoques.mp4')
    parser.add_argument('--comparer', type=Path, help='Vérifie l’identité binaire avec cinq planches précédentes.')
    args = parser.parse_args()
    source = args.film.resolve()
    digest, cuts = takes(source)
    args.sortie.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=args.sortie) as tmp:
        outputs = []
        for year, start in cuts:
            path = Path(tmp)/f'apercu-{year}.webp'
            encode(source, year, start, digest, path)
            checksum = sha(path)
            if args.comparer:
                check(checksum == sha(args.comparer/path.name), f'{year} : le WebP diffère de la référence.')
            outputs.append(path)
            print(f'{year}  {start/FPS:5.2f} s  {path.stat().st_size:7d} octets  {checksum}', flush=True)
        for path in outputs:
            path.replace(args.sortie/path.name)


if __name__ == '__main__':
    main()

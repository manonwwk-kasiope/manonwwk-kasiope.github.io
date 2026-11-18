"""Encode the five chronological takes, leaving their timing and pictures intact."""
import hashlib,json,subprocess,sys
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
root=Path(__file__).resolve().parent
images=Path(sys.argv[1]);assert (images/'SUCCES').is_file()
takes=json.loads((root/'provenance.json').read_text())
assert len(list(images.glob('*.jpg')))==takes['frames']==900
assert all(c['frames']==180 and c['beatFrames']==180 and c['decorReady'] for c in takes['clips'])
assert any(e['type']=='novaOverload' for c in takes['clips'] for e in c['events'])
assert any(e['type']=='win' for e in takes['clips'][-1]['events'])
out=root/'Snake-2985-cinq-epoques.mp4'
subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-framerate','30','-start_number','0','-i',str(images/'%04d.jpg'),
 '-map','0:v:0','-an','-c:v','libx264','-preset','medium','-crf','18','-threads','3','-pix_fmt','yuv420p',
 '-vf','scale=in_range=pc:out_range=tv:out_color_matrix=bt709','-colorspace','bt709','-color_primaries','bt709',
 '-color_trc','bt709','-movflags','+faststart',str(out)],check=True)
proof=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(out)]))
s,=proof['streams']
assert (s['codec_type'],s['codec_name'],s['width'],s['height'],s['avg_frame_rate'],int(s['nb_read_frames']))==('video','h264',1000,460,'30/1',900)
assert float(proof['format']['duration'])==30
proof['sha256']=hashlib.sha256(out.read_bytes()).hexdigest()
(root/'ffprobe.json').write_text(json.dumps(proof,indent=2)+'\n')
(root/'affiche.jpg').write_bytes((images/'0396.jpg').read_bytes())
facts={1976:'Le serpent récolte les premières cellules du terminal.',1985:'Bascule entre plans, surcharge à ricochet et destruction du Magnétron.',1995:'Feux de triage, surcharge du train et destruction du Signal fantôme.',2185:'Entrée en vol, sortie, puis changement de plan.',2985:'Surcharge à écho pendant l’effondrement fractal, destruction de la Singularité et victoire.'}
rows=['# SNAKE 2985 · cinq époques','',datetime.now(ZoneInfo('Europe/Paris')).strftime('%d/%m/%Y · %H h %M')+' · Paris','','Film panoramique de 30 secondes, 1000 × 460, 30 images par seconde. Une seule piste H.264, zéro piste audio. Taille : '+f'{out.stat().st_size/1e6:.2f}'+' Mo.','',
'| Temps dans le film | Époque | Temps dans la partie | Événements |','|---|---|---|---|']
for i,c in enumerate(takes['clips']):
 rows.append(f"| {i*6}–{i*6+6} s | {c['year']} | {c['from']:.2f}–{c['to']:.2f} s | {facts[c['year']]} |")
rows+=['','Les prises proviennent de cinq parties terminées dans la chambre intégrée depuis un profil WebKit vierge, joué au clavier et à la souris Playwright. Le pilote lit la position des entités et vise les anneaux de vol ; les dégâts et la progression suivent les règles du jeu. Chaque image utilise le moteur de rendu de la chambre sur une toile de 960 × 440. Le cartouche est placé en dessous, hors de l’arène. La caméra musicale suit la pulsation silencieuse du jeu. Les décors peints ont été chargés depuis leurs fichiers du projet ; le terminal 1976 utilise son rendu procédural.','',
'La caméra avance en pas de 1/30 seconde et conserve l’ordre des images. Les cinq prises sont montées sans transition ni changement de vitesse. L’interface de commande reste hors cadre. Les images JPEG intermédiaires sont écrites dans un dossier temporaire. Aucune vidéo n’a été ouverte ou écoutée.','',
'Reproduction depuis ce dossier, avec créneau navigateur : `node tourner.cjs`, puis `python3 encoder.py CHEMIN_TEMPORAIRE_IMPRIMÉ`. Le journal provenance.json conserve les empreintes des assets et les événements du moteur ; ffprobe.json contient le contrôle de la piste unique, du nombre d’images et de la durée.']
(root/'rapport.md').write_text('\n'.join(rows)+'\n')
print(out.name,out.stat().st_size,s['nb_read_frames'],'images ; une piste vidéo, zéro audio')

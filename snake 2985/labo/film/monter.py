"""Monte et contrôle le film et ses cinq atlas avant de remplacer les fichiers locaux."""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

root=Path(__file__).resolve().parent
rushes=Path(sys.argv[1]).resolve()
previews=root.parent/'apercus'
with tempfile.TemporaryDirectory(prefix='snake-montage-') as stage:
    stage=Path(stage)
    subprocess.run([sys.executable,str(root/'encoder.py'),str(rushes),str(stage)],check=True)
    film=stage/'Snake-2985-cinq-epoques.mp4'
    subprocess.run([sys.executable,str(previews/'redecouper.py'),str(stage/'atlas'),'--film',str(film)],check=True)
    assert len(list((stage/'atlas').glob('apercu-*.webp')))==5
    for f in stage.iterdir():
        if f.is_file():shutil.copy2(f,root/f.name)
    for f in (stage/'atlas').iterdir():shutil.copy2(f,previews/f.name)
    proof=json.loads((stage/'ffprobe.json').read_text())
    print('Film et cinq atlas contrôlés · '+proof['sha256'])

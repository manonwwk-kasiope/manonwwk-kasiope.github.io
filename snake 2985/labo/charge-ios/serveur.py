"""Serve an immutable allowlist and accept bounded observation rows over loopback."""
import argparse, hashlib, json, mimetypes, secrets, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
HERE=Path(__file__).resolve().parent
LAB=HERE.parent
GAME=LAB.parent
SCRIPTS=['game/forge.js','game/vol-libre.js','lab/moteur.js','lab/gardiens/gardiens.js',
         'lab/mondes/mondes.js','lab/sprites/sprites.js','lab/animation-boss/animation.js',
         'lab/campagne/impact.js','lab/campagne/indices.js','lab/campagne/matieres.js',
         'lab/artillerie/artillerie.js','lab/endurance/phosphore/lisibilite.js',
         'lab/locomotion/locomotion.js','lab/initiation/initiation.js','lab/spectacle.js','reference.js','mesure.js']
def assets():
    pages={}
    for name in SCRIPTS+['silence.js','lab/campagne/decors/chantier-orbital.webp','lab/campagne/decors/etoile-effondree.webp']:
        if name=='reference.js':continue
        parts=name.split('/',1)
        source=(GAME if parts[0]=='game' else LAB)/parts[1] if len(parts)==2 else HERE/name
        pages['/'+name]=source.read_bytes()
    renderer=pages['/lab/spectacle.js'].decode()
    condition="if(window.SnakeMondes?.formats?.[s.year]&&(s.year===1985||s.year===2185)){"
    assert renderer.count(condition)==1, 'vérifier le choix de surface dans le nouveau rendu'
    pages['/reference.js']=renderer.replace(condition,'if(false){').replace('window.SnakeSpectacle=','window.SnakeReference=').encode()
    return pages
def main():
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=0);p.add_argument('--paysage',action='store_true');p.add_argument('--reprise',type=int,default=0);p.add_argument('--frozen-from');p.add_argument('--out',type=Path);p.add_argument('--check',action='store_true')
    a=p.parse_args();pages=assets()
    if a.frozen_from:
        from urllib.request import urlopen
        src=urlparse(a.frozen_from)
        assert src.scheme=='http' and src.hostname=='127.0.0.1' and src.port
        for name in pages:
            if name!='/mesure.js':
                pages[name]=urlopen(a.frozen_from.rstrip('/')+name,timeout=5).read()
    if a.check:print(len(pages),'sources gelées');return
    assert a.out and not a.out.exists(),'fichier de sortie neuf requis'
    token=secrets.token_urlsafe(20)
    meta={'sources':{n:hashlib.sha256(b).hexdigest() for n,b in pages.items()},'started':time.time()}
    out=a.out.open('x',encoding='utf8',buffering=1)
    out.write(json.dumps({'kind':'server',**meta})+'\n')
    html=('''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Charge Safari · SNAKE</title><style>html,body{margin:0;height:100%;background:#10131b;color:white;font:14px system-ui}body{display:grid;align-content:center;justify-items:center;gap:10px}canvas{display:block;aspect-ratio:2/1}</style><canvas></canvas><output>Mesure Safari</output><script src="/silence.js"></script>'''+''.join('<script src="/'+n+'"></script>' for n in SCRIPTS)+'</html>').encode()
    if a.paysage:
        html=html.replace(b'<html lang="fr">',b'<html lang="fr" data-landscape-only>')
    if a.reprise:html=html.replace(b'data-landscape-only',f'data-landscape-only data-resume-at="{a.reprise}"'.encode())
    seen=set()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def reply(self,status,data=b'',mime='text/plain'):
            self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(data)))
            self.send_header('Cache-Control','no-store');self.send_header('Content-Security-Policy',"default-src 'self'; media-src 'none'; style-src 'unsafe-inline'; object-src 'none'; frame-src 'none'; worker-src 'none'; connect-src 'self'")
            self.end_headers();self.wfile.write(data)
        def do_GET(self):
            path=urlparse(self.path).path
            if path=='/'+token:return self.reply(200,html,'text/html; charset=utf-8')
            if path in pages:return self.reply(200,pages[path],mimetypes.guess_type(path)[0] or 'application/octet-stream')
            self.reply(404)
        def do_POST(self):
            if self.path!='/record/'+token:return self.reply(404)
            if self.headers.get('Origin')!='http://127.0.0.1:'+str(self.server.server_port):return self.reply(403)
            size=int(self.headers.get('Content-Length','0'))
            if size<=0 or size>20000:return self.reply(413)
            try:r=json.loads(self.rfile.read(size));identity=r['id'];kind=r['kind']
            except (ValueError,KeyError,TypeError):return self.reply(400)
            if not isinstance(identity,str) or len(identity)>80 or len(seen)>200:return self.reply(400)
            if identity not in seen:
                seen.add(identity);out.write(json.dumps({**r,'received':time.time()},ensure_ascii=False)+'\n')
            self.reply(200,b'ok')
    server=ThreadingHTTPServer(('127.0.0.1',a.port),Handler)
    print('http://127.0.0.1:'+str(server.server_port)+'/'+token,flush=True)
    server.serve_forever()
if __name__=='__main__':main()

import hashlib, json, secrets, mimetypes, sys
from pathlib import Path
from urllib.parse import urlsplit
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
ROOT=Path(__file__).resolve().parent
LAB=ROOT.parent
GAME=LAB.parent
scripts=['../forge.js','../vol-libre.js','evolution/evolution.js','moteur.js','gardiens/gardiens.js',
         'surf-boss/surf.js','rythme/directeur.js','quantification/quantification.js','mondes/mondes.js',
         'sprites/sprites.js','campagne/impact.js','campagne/indices.js','artillerie/artillerie.js',
         'surcharges/surcharges.js','surcharges/effets.js','animation-boss/animation.js','monde-vivant/monde.js',
         'campagne/matieres.js','endurance/phosphore/lisibilite.js','locomotion/locomotion.js','camera/camera.js',
         'perception/marquage.js','noeud/noeud.js','spectacle.js']
def assets():
    pages={'/silence.js':(LAB/'charge-ios/silence.js').read_bytes(),'/mesure.js':(ROOT/'mesure.js').read_bytes()}
    tags=['/silence.js']
    for key in scripts:
        url='/'+str((LAB/key).resolve().relative_to(GAME));tags.append(url)
        data=(LAB/key).read_bytes()
        if key=='mondes/mondes.js':
            # Chronomètres identiques autour des deux branches natives, sans modifier les opérations.
            a=b'    if(window.SnakeQuantification){';b=b'    c.putImageData(img,0,0);'
            assert data.count(a)==1 and data.count(b)==1
            data=data.replace(a,b'    const quantStart=performance.now();\n'+a).replace(b,b'    window.quantMs=performance.now()-quantStart;\n'+b)
        pages[url]=data
    for p in (LAB/'campagne/decors').glob('*.webp'):pages['/'+str(p.relative_to(GAME))]=p.read_bytes()
    tags.append('/mesure.js')
    pages['/index.html']=('''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Mesure locale</title><style>*{box-sizing:border-box}html,body{margin:0;overflow:hidden;background:#10151d}canvas{display:block}output{position:fixed;top:0;left:0;color:#fff;background:#18232f;font:12px system-ui;pointer-events:none}</style><canvas></canvas><output>Mesure en cours</output>'''+''.join('<script src="'+u+'"></script>' for u in tags)+'</html>').encode()
    return pages
def main():
    pages=assets()
    if '--check' in sys.argv:print('fichiers figés',len(pages));return
    token=secrets.token_urlsafe(16);out=Path(sys.argv[1]).open('x',encoding='utf-8',buffering=1)
    def record(obj):out.write(json.dumps(obj,ensure_ascii=False)+'\n')
    record({'kind':'manifest','sha256':{k:hashlib.sha256(b).hexdigest() for k,b in pages.items()}})
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def send(self,code,blob=b'',mime='text/plain'):
            self.send_response(code);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(blob)));self.send_header('Cache-Control','no-store');self.send_header('Cross-Origin-Opener-Policy','same-origin');self.send_header('Cross-Origin-Embedder-Policy','require-corp')
            self.send_header('Content-Security-Policy',"default-src 'self'; media-src 'none'; style-src 'unsafe-inline'; object-src 'none'; frame-src 'none'; connect-src 'self'");self.end_headers();self.wfile.write(blob)
        def do_GET(self):
            p=urlsplit(self.path).path
            if p=='/'+token:p='/index.html'
            elif p=='/index.html':return self.send(404)
            if p not in pages:return self.send(404)
            self.send(200,pages[p],mimetypes.guess_type(p)[0] or 'application/octet-stream')
        def do_POST(self):
            if self.path!='/result/'+token or self.headers.get('Origin')!=origin:return self.send(403)
            n=int(self.headers.get('Content-Length',0))
            if not 0<n<64000:return self.send(413)
            row=json.loads(self.rfile.read(n));record(row);self.send(200,b'ok')
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);origin='http://127.0.0.1:'+str(server.server_port)
    print(origin+'/'+token,flush=True);server.serve_forever()
if __name__=='__main__':main()

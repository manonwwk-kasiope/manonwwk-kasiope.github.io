"""Origine de test exclusivement locale. L'édition fournie reste intacte."""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import re

def serve(directory, name):
    guard = (Path(__file__).resolve().parent.parent/'charge-ios'/'silence.js').read_text()
    observer = """
const collect = () => {
 const arena = document.querySelector('#monde'), box = arena?.getBoundingClientRect();
 const local = Object.keys(localStorage).filter(k => k.startsWith('snake2985'));
 navigator.sendBeacon('/preuve', JSON.stringify({
   page: document.body?.dataset.screen, standalone: navigator.standalone === true,
   display: matchMedia('(display-mode: standalone)').matches, mute: location.search,
   size:[innerWidth,innerHeight], screen:[screen.width,screen.height],
   arena:box && [box.x,box.y,box.width,box.height], sound:window.silence, keys:local,
   session:sessionStorage.getItem('qa-contexte'), local:localStorage.getItem('qa-contexte')
 }));
};
collect();
sessionStorage.setItem('qa-contexte', navigator.standalone?'accueil':'safari');
localStorage.setItem('qa-contexte', navigator.standalone?'accueil':'safari');
addEventListener('load',()=>{collect();new MutationObserver(collect).observe(document.body,{attributes:true,attributeFilter:['data-screen']});});
addEventListener('resize',collect);
"""
    class QA(SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Content-Security-Policy', "media-src 'none'; object-src 'none'")
            super().end_headers()
        def resource(self, data, mime):
            self.send_response(200); self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(data))); self.end_headers()
            self.wfile.write(data)
        def do_POST(self):
            if self.path != '/preuve':
                return self.send_error(404)
            size=int(self.headers.get('Content-Length', 0))
            if size>8192: return self.send_error(413)
            print(json.dumps(json.loads(self.rfile.read(size))),flush=True)
            self.send_response(204); self.end_headers()
        def do_GET(self):
            request = urlsplit(self.path)
            # Servir également le start_url nu sans invalider les navigations du service worker.
            if request.path in ('/','/index.html'):
                html=(directory/'index.html').read_text()
                html=html.replace('<head>', '''<head><script>if(location.search!=='?muet=1')history.replaceState(null,'',location.pathname+'?muet=1');</script><script>'''+guard+'\n'+observer+'</script>'
                    +'<meta name="apple-mobile-web-app-title" content="'+name+'">',1)
                return self.resource(html.encode(),'text/html; charset=utf-8')
            if request.path=='/app.webmanifest':
                manifest=json.loads((directory/'app.webmanifest').read_text())
                manifest.update(name=name,short_name=name)
                return self.resource(json.dumps(manifest).encode(),'application/manifest+json')
            if request.path.endswith(('.mp3','.wav','.ogg')): return self.send_error(403)
            super().do_GET()
    return ThreadingHTTPServer(('127.0.0.1',0),partial(QA,directory=str(directory)))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('distribution',type=Path);parser.add_argument('name')
    args=parser.parse_args()
    if not re.fullmatch(r'S2985QA[0-9A-F]{4}',args.name):parser.error('Nom QA unique attendu.')
    folder=args.distribution.resolve(strict=True)
    for file in ('index.html','arcade.js','app.webmanifest'): (folder/file).resolve(strict=True)
    server=serve(folder,args.name)
    print('http://127.0.0.1:'+str(server.server_port)+'/?muet=1',flush=True)
    server.serve_forever()

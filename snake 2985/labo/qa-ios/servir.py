"""Sert une distribution de recette sur loopback. Verrouille le son avant son premier script."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse

GUARD = """<script>
Object.defineProperty(HTMLMediaElement.prototype,'muted',{get:()=>true,set(){}});
Object.defineProperty(HTMLMediaElement.prototype,'volume',{get:()=>0,set(){}});
HTMLMediaElement.prototype.play=()=>Promise.resolve();
for(const key of ['AudioContext','webkitAudioContext'])Object.defineProperty(window,key,{value:undefined,configurable:false});
</script>"""

class LocalQA(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path in ("/","/index.html"):
            html=(Path(self.directory)/"index.html").read_text().replace("<head>","<head>"+GUARD,1).encode()
            self.send_response(200)
            self.send_header("Content-Type","text/html; charset=utf-8")
            self.send_header("Content-Length",str(len(html)))
            self.end_headers()
            self.wfile.write(html)
        else:
            super().do_GET()

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("dossier",type=Path)
    parser.add_argument("--port",type=int,default=0)
    args=parser.parse_args()
    dossier=args.dossier.resolve(strict=True)
    if not (dossier/"arcade.js").is_file():
        parser.error("Distribution de test introuvable.")
    server=ThreadingHTTPServer(("127.0.0.1",args.port),partial(LocalQA,directory=str(dossier)))
    print(f"http://127.0.0.1:{server.server_port}/",flush=True)
    server.serve_forever()

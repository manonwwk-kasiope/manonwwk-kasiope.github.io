import json,sys
from functools import partial
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlsplit
here=Path(__file__).resolve().parent
folder=Path(sys.argv[1]).resolve(strict=True)
guard=(here.parent/'silence.js').read_text()
observer=(here/'mesure.js').read_text()
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):
    self.send_header('Content-Security-Policy',"media-src 'none'; worker-src 'none'; object-src 'none'")
    super().end_headers()
 def do_GET(self):
    p=urlsplit(self.path)
    if p.path in ('/','/index.html'):
        if p.query!='muet=1':return self.send_error(403)
        content=(folder/'index.html').read_text().replace('<head>','<head><script>'+guard+'\n'+observer+'</script>',1).encode()
        self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
    elif p.path.endswith(('.mp3','.wav','.ogg')) or p.path=='/sw.js':self.send_error(403)
    else:super().do_GET()
 def do_POST(self):
    if self.path!='/mesure':return self.send_error(404)
    size=int(self.headers.get('Content-Length',0))
    if not 0<size<32768:return self.send_error(413)
    print(json.dumps(json.loads(self.rfile.read(size))),flush=True);self.send_response(204);self.end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(folder)))
print('http://127.0.0.1:'+str(server.server_port)+'/?muet=1',flush=True)
server.serve_forever()

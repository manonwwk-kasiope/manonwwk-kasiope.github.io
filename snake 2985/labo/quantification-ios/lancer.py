"""Utiliser uniquement après réservation explicite du simulateur iPhone 17 iOS 27.2."""
import datetime,json,os,pathlib,plistlib,signal,subprocess,sys,tempfile,time
ROOT=pathlib.Path(__file__).resolve().parent
UDID='8404D92B-CC77-44FD-991A-AAC29B5A9640'
def status():
    devices=json.loads(subprocess.check_output(['xcrun','simctl','list','devices','-j']))['devices']
    for runtime,group in devices.items():
        for d in group:
            if d['udid']==UDID:
                assert d['name']=='iPhone 17' and runtime.endswith('iOS-27-2')
                return d['state']
    raise RuntimeError('iPhone de test absent')
def configure(raw,url,dest):
    doc=plistlib.loads(raw.read_bytes());bundles=[]
    def walk(o):
        if isinstance(o,list):return [walk(v) for v in o]
        if isinstance(o,dict):
            if o.get('IsUITestBundle'):
                assert o['UseUITargetAppProvidedByTests'] and not o.get('UITargetAppPath')
                o.setdefault('EnvironmentVariables',{})['SNAKE_PUBLIC_URL']=url;bundles.append(True)
            return {k:walk(v) for k,v in o.items()}
        return o.replace('__TESTROOT__',str(raw.parent)) if isinstance(o,str) else o
    data=walk(doc);assert len(bundles)==1;dest.write_bytes(plistlib.dumps(data))
def main():
    assert sys.argv[1:] and sys.argv[1]=='--creneau-accorde'
    sizes=[874]
    raw=pathlib.Path(os.environ['SNAKE_QUANT_XCTEST']);assert raw.exists()
    assert status()=='Shutdown','autre session en cours'
    tmp=pathlib.Path(tempfile.mkdtemp(prefix='snake-quant-ios-'));files=ROOT/('safari-'+datetime.datetime.now().strftime('%H%M%S')+'.jsonl')
    server=subprocess.Popen([sys.executable,'-u',str(ROOT/'serveur.py'),str(files)],stdout=subprocess.PIPE,text=True)
    didBoot=False
    try:
        base=server.stdout.readline().strip();assert base.startswith('http://127.0.0.1:')
        subprocess.run(['xcrun','simctl','boot',UDID],check=True);didBoot=True
        subprocess.run(['xcrun','simctl','bootstatus',UDID,'-b'],check=True,stdout=subprocess.DEVNULL)
        for w in sizes:
            dest=tmp/(str(w)+'.xctestrun');configure(raw,base+'?w='+str(w)+'&suite=1',dest)
            with (tmp/(str(w)+'.log')).open('w') as log:
                proc=subprocess.Popen(['xcodebuild','test-without-building','-xctestrun',str(dest),'-destination','id='+UDID,'-parallel-testing-enabled','NO','-disable-concurrent-destination-testing','-resultBundlePath',str(tmp/(str(w)+'.xcresult'))],stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
                try:
                    while proc.poll() is None:
                        rows=[json.loads(l) for l in files.read_text().splitlines() if l.endswith('}')]
                        err=next((r for r in rows if r.get('kind')=='error'),None)
                        if err:raise RuntimeError(str(err))
                        time.sleep(2)
                    if proc.returncode:raise RuntimeError((tmp/(str(w)+'.log')).read_text()[-2400:])
                    assert {r['css'] for r in rows if r.get('kind')=='done'}=={568,874}
                finally:
                    if proc.poll() is None:
                        os.killpg(proc.pid,signal.SIGTERM);proc.wait(timeout=30)
    finally:
        if didBoot:subprocess.run(['xcrun','simctl','shutdown',UDID],check=True)
        server.terminate();server.wait(timeout=15)
        print(json.dumps({'state':status(),'serverStopped':server.poll() is not None,'report':str(files),'logs':str(tmp)}),flush=True)
if __name__=='__main__':main()

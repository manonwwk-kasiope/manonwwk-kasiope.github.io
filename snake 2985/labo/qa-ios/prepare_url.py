"""Paramètre une future exécution XCUITest. Ce script ne démarre ni simulateur ni test."""
import pathlib,plistlib,sys,urllib.parse
products=pathlib.Path(__file__).parent/'build/Build/Products'
p=next(products.glob('MobileSafariArcadeTests_*.xctestrun'))
run=plistlib.loads(p.read_bytes())
url=urllib.parse.urlparse(sys.argv[1])
if not (url.scheme=='https' or (url.scheme=='http' and url.hostname in ['localhost','127.0.0.1'])):
    raise SystemExit("L’URL doit être HTTPS ou locale.")
stream=[run]
while stream:
    obj=stream.pop()
    if isinstance(obj,dict):
        if obj.get('IsUITestBundle'):
            obj.setdefault('EnvironmentVariables',{})['SNAKE_PUBLIC_URL']=sys.argv[1]
            assert obj.get('UseUITargetAppProvidedByTests')
            assert not obj.get('UITargetAppPath')  # Aucun exécutable UIKit de test.
        stream.extend(obj.values())
    elif isinstance(obj,list):stream.extend(obj)
dest=products/'SafariSansHote.xctestrun'
dest.write_bytes(plistlib.dumps(run));print(dest)

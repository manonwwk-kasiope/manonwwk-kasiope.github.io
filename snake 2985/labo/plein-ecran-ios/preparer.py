"""Paramètre le bundle XCTest générique à partir de la première ligne du serveur QA."""
import argparse, plistlib, re
from pathlib import Path
from urllib.parse import urlsplit
p=argparse.ArgumentParser()
p.add_argument('build',type=Path);p.add_argument('url');p.add_argument('name')
a=p.parse_args();url=urlsplit(a.url)
assert url.scheme=='http' and url.hostname=='127.0.0.1' and url.port and url.query=='muet=1'
assert re.fullmatch(r'S2985QA[0-9A-F]{4}',a.name)
products=a.build/'Build/Products'
source,=products.glob('AccueilArcadeTests_*.xctestrun')
run=plistlib.loads(source.read_bytes());todo=[run];targets=0
while todo:
    item=todo.pop()
    if isinstance(item,dict):
        if item.get('IsUITestBundle'):
            assert item.get('UseUITargetAppProvidedByTests') and not item.get('UITargetAppPath')
            item.setdefault('EnvironmentVariables',{}).update(SNAKE_PUBLIC_URL=a.url,SNAKE_QA_NAME=a.name)
            targets+=1
        todo.extend(item.values())
    elif isinstance(item,list):todo.extend(item)
assert targets==1
dest=products/'AccueilQA.xctestrun';dest.write_bytes(plistlib.dumps(run));print(dest)

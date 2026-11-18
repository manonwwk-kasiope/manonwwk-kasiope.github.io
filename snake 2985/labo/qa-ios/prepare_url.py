"""Paramètre un .xctestrun MobileSafari compilé, sans ouvrir le simulateur ni le réseau."""
import argparse
import pathlib
import plistlib
import urllib.parse

parser = argparse.ArgumentParser()
parser.add_argument("url")
parser.add_argument("--products", type=pathlib.Path, default=pathlib.Path(__file__).parent/"build/Build/Products")
parser.add_argument("--name", default="SafariSansHote", help="Nom du fichier paramétré dans Products")
args = parser.parse_args()
url = urllib.parse.urlsplit(args.url)
if not url.hostname or url.username or url.password or not (
    url.scheme == "https" or (url.scheme == "http" and url.hostname in ["127.0.0.1", "localhost", "::1"])
):
    parser.error("L’URL doit être HTTPS ou locale et dépourvue d’identifiants.")
flags = urllib.parse.parse_qs(url.query, keep_blank_values=True).get("muet", [])
if not flags or any(value != "1" for value in flags):
    parser.error("Ce test requiert le paramètre muet=1.")
if not args.name or not all(c.isalnum() or c in "-_" for c in args.name):
    parser.error("Nom de fichier invalide.")
products = args.products.resolve()
candidates = list(products.glob("MobileSafariArcadeTests_*.xctestrun"))
if len(candidates) != 1:
    parser.error(f"Un seul produit MobileSafariArcadeTests est attendu dans {products}.")
run = plistlib.loads(candidates[0].read_bytes())
stream = [run]
configured = 0
while stream:
    obj = stream.pop()
    if isinstance(obj, dict):
        if obj.get("IsUITestBundle"):
            if not obj.get("UseUITargetAppProvidedByTests") or obj.get("UITargetAppPath"):
                parser.error("Le bundle doit piloter le Safari fourni par Apple.")
            obj.setdefault("EnvironmentVariables", {})["SNAKE_PUBLIC_URL"] = args.url
            configured += 1
        stream.extend(obj.values())
    elif isinstance(obj, list):
        stream.extend(obj)
if configured != 1:
    parser.error(f"Le plan contient {configured} bundles UI configurables.")
dest = products / (args.name + ".xctestrun")
dest.write_bytes(plistlib.dumps(run))
print(dest)

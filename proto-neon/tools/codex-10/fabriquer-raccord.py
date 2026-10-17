"""Génère le patch79 et un candidat en mémoire ; ne modifie jamais src/79-jeu.js."""
from pathlib import Path
import difflib, json, hashlib
root=Path(__file__).resolve().parents[2]
a=Path('/tmp/snake-codex10-79-avant.js').read_text(); b=a
changes=[
("if (nom === 'demarrage' || nom === 'titre' || nom === 'cartes' || nom === 'pause') u.ouvrir(nom);", "if (nom === 'demarrage' || nom === 'titre' || nom === 'cartes' || nom === 'pause') u.ouvrir(nom, nom === 'cartes' && N.defile ? { rareGarantie: N.defile.prendreRare() } : undefined);"),
("N.butin.reset(); N.ennemis.reset(); N.arsenal.reset(); N.score.reset(); N.dir.reset(0, {}); N.hud.reset();", "N.butin.reset(); N.ennemis.reset(); N.arsenal.reset(); N.score.reset(); N.dir.reset(0, {}); N.hud.reset();\n    if (N.defile) N.defile.reset();"),
("function apresVol() { lancerVague(N.dir.vague() + 1); }", "function apresVol() {\n    if (N.dir.vague() === 3 && N.defile && !N.defile.joue()) { N.defile.demarrer(); aller('defile'); }\n    else lancerVague(N.dir.vague() + 1);\n  }"),
("var r = reprise, s = S_();", "var r = reprise, s = S_();\n    if (N.defile && r.vague <= 3) N.defile.reset();"),
("if (et === 'nettoyage' && etT >= CFG.nettoyage", "if (et === 'defile' && N.defile && N.defile.fini()) vol();\n      else if (et === 'nettoyage' && etT >= CFG.nettoyage"),
("var sansApparition = et === 'nettoyage' || et === 'alerte';", "var sansApparition = et === 'nettoyage' || et === 'alerte' || et === 'defile';\n    if (et === 'defile' && N.defile) N.defile.update(dt);"),
("    ecranVieux();\n  }\n  /* l'interface", "    if (et === 'defile' && N.defile) N.defile.draw();\n    ecranVieux();\n  }\n  /* l'interface")]
for src,dst in changes:
 assert b.count(src)==1, ('source changée, régénération à relire',src[:60],b.count(src))
 b=b.replace(src,dst)
Path('/tmp/snake-codex10-79-apres.js').write_text(b)
p=root/'tools/codex-10/raccord-jeu.patch'
p.write_text(''.join(difflib.unified_diff(a.splitlines(keepends=True),b.splitlines(keepends=True),fromfile='a/proto-neon/src/79-jeu.js',tofile='b/proto-neon/src/79-jeu.js')))
h=(root/'index.html').read_text(); start='/* ===== 79-jeu.js ===== */\n';end='/* ===== 79-scene.js ===== */'
i=h.index(start)+len(start);j=h.index(end,i);h=h[:i]+b+'\n'+h[j:]
Path('/tmp/snake-codex10-apres.html').write_text(h)
p.with_name('raccord-manifest.json').write_text(json.dumps({'fichierSource':'src/79-jeu.js','sourceAvantSha256':hashlib.sha256(a.encode()).hexdigest(),'sourceApresSha256':hashlib.sha256(b.encode()).hexdigest(),'bundleCandidatSha256':hashlib.sha256(h.encode()).hexdigest(),'sourcePartageeModifiee':False,'limite':'patch candidat sur la base avant intégration09 ; Claude applique et requalifie après09'},ensure_ascii=False,indent=2)+'\n')
print('patch généré ; src/79-jeu.js intact')

/* Reconstitue exactement le candidat chargé au départ des 80 parties, puis exige
   que seul finResumeModele (chemin de dessin) diffère du rendu final. */
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {sources} from './vm.mjs';
const src=sources(),courant=src.find(([f])=>f==='80-ecrans.js')[1];let ancien=courant.replace('q.y < Math.min(a.continuer.y, a.rejouer.y)', 'q.y < a.rejouer.y');
ancien=ancien.replace(/      if \(ls.length > 1 && ls\[ls.length - 1\]\.split\(' '\)\.length === 1\) \{[\s\S]*?\n      \}\n      return ls;/,"      return ls;");
ancien=ancien.replace(/    var debutY = y, cause =[\s\S]*?    var bilan = bloc\(\), statistiques = \{ lignes: \[\], barre: null \};/,"    var bilan = bloc();");
ancien=ancien.replace("if (cause) texte(bilan, cause, O.OS);","if (r.cause) texte(bilan, N.ids.texte(r.cause, r.auteur).replace(/ INSTABLE$/, ''), O.OS);");
ancien=ancien.replace(/      if \(r.ecart !== null\) texte\(statistiques,[\s\S]*?      if \(r.build\) texte\(statistiques, r.build.nom, O.AMBRE\);/,`      texte(bilan, 'RECORD ' + r.record + (r.nouveauRecord ? ' +' : ''), O.JAUNE);
      if (r.ecart !== null) texte(bilan, 'ÉCART ' + (r.ecart >= 0 ? '+' : '') + r.ecart, O.OS);
      if (r.build) texte(bilan, r.build.nom, O.AMBRE);`);
ancien=ancien.replace('    blocs.push(statistiques);\n','');
ancien=ancien.replace(/    blocs.forEach\(function \(b\) \{\n      b.rangs =[\s\S]*?    var pas = C.ligne;/,`    blocs.forEach(function (b) { b.rangs = b.lignes.reduce(function (n, l, i) { if (l.rang === undefined) l.rang = i; return Math.max(n, l.rang + 1); }, 0); });
    var colonnes = port ? [blocs] : [[bilan], [defis]], charges = [bilan.rangs, defis.rangs];
    if (!port) blocs.slice(C.colonnes).forEach(function (b) { var k = charges[0] <= charges[1] ? 0 : 1; colonnes[k].push(b); charges[k] += b.rangs; });
    var pas = C.ligne;`);
ancien=ancien.replace(/    while \(pas > C.texteH[\s\S]*?    var prefixe = '';/,`    colonnes.forEach(function (bs) {
      var n = bs.reduce(function (s, b) { return s + b.rangs; }, 0);
      var extras = bs.reduce(function (s, b) { return s + (b.barre ? C.barreH : 0); }, 0);
      pas = Math.min(pas, Math.floor((basCorps - y - extras) / n));
    });
    pas = Math.max(C.texteH, pas);
    colonnes.forEach(function (bs, k) {
      var yy = y, xx = x + k * (col + C.ecart);
      var n = bs.reduce(function (s, b) { return s + b.rangs; }, 0);
      var extras = bs.reduce(function (s, b) { return s + (b.barre ? C.barreH : 0); }, 0);
      var ecart = bs.length > 1 ? Math.max(0, Math.min(C.ecart, Math.floor((basCorps - y - n * pas - extras) / (bs.length - 1)))) : 0;
      bs.forEach(function (b) {
        b.lignes.forEach(function (l) { l.x += xx; l.y = yy + l.rang * pas; lignes.push(l); });
        yy += b.rangs * pas;
        if (b.barre) { b.barre.x = xx; b.barre.y = yy; barres.push(b.barre); yy += C.barreH; }
        yy += ecart;
      });
    });
    var prefixe = '';`);
ancien=ancien.replace("nom: 'fin', x: x, y: debutY,", "nom: 'fin', x: x, y: y,");
const lire=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url))),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const snap=src.map(([f,c])=>[f,f==='80-ecrans.js'?ancien:c]),attendu=lire('apres.json').sourcesSha256,obtenu=hash(JSON.stringify(snap));
fs.writeFileSync(new URL('candidat-parties-80-ecrans.js',import.meta.url),ancien);
const neutraliser=c=>c.replace('q.y < Math.min(a.continuer.y, a.rejouer.y)', 'q.y < a.rejouer.y').replace(/  function finResumeModele\(\) \{[\s\S]*?\n  function retourModele\(nom\)/,'  function retourModele(nom)');
const preuve={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),attendu,obtenu,candidatExact:attendu===obtenu,horsDessinIdentique:neutraliser(ancien)===neutraliser(courant),sourcesFinalesSha256:hash(JSON.stringify(src)),limite:'Après le départ des parties : finResumeModele (dessin) et seule borne tactile de pagination BILAN pour les boutons empilés. Le protocole ne dessine pas et se termine au premier état fin, avant toute entrée dans ce bilan. Autres sources et autres chemins inchangés.'};
fs.writeFileSync(new URL('reutilisation-parties.json',import.meta.url),JSON.stringify(preuve,null,2));console.log(preuve);assert.ok(preuve.candidatExact&&preuve.horsDessinIdentique);

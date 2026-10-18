// Sans serveur, Chromium ni réseau. Le dessin VM mesure le tampon indexé, pas Canvas/CRT.
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {sources, monde, partie} from './vm-bundle-natif.mjs';
import {installerRAF, amorcerPartie, jouerControle} from './raf-controle.mjs';
import {cle, comparer} from '../mesure/criteres/R-30-rejouabilite.mjs';
import {cameraSimulation} from './raccords.mjs';
const lire=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url)));
const save=(n,r)=>fs.writeFileSync(new URL(n,import.meta.url),JSON.stringify(r,null,2)+'\n');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const dateParis=()=>new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
const final=sources(), recu=lire('sources-recues-p16c.json'), initial=lire('sources-avant.json');
const out={dateParis:dateParis(),sources:{recu:sha(JSON.stringify(recu)),final:sha(JSON.stringify(final))},calibration:[],r30:{}};
if(process.argv.includes('--reutiliser-calibration')) out.calibration=lire('diagnostic-p16c.json').calibration;
// Calibration de la fermeture réellement utilisée, sur l'ancien commit demandé.
for(const ref of (out.calibration.length ? [] : lire('../pilotes/sortie.json').cas.filter(c=>c.graine<=2&&['inerte','tourneur','maladroit','kamikaze','humain'].includes(c.pilote)))) {
  const r=partie(monde(sources('e1bdc6f')),ref.pilote,ref.graine);
  const attendu=Object.fromEntries(Object.keys(r).map(k=>[k,ref[k]]));
  out.calibration.push({attendu,obtenu:r,identique:JSON.stringify(r)===JSON.stringify(attendu)});
}
save('diagnostic-p16c.json',out);
assert.equal(out.calibration.length,10);assert.ok(out.calibration.every(c=>c.identique),'VM non calibrée : arrêt');
function jouer(src, preimages=0, simulation=false, nodraw=false) {
  // Seule la branche nodraw que boot pose depuis la query est reproduite sans DOM.
  src={...src,'02-regles.js':final['02-regles.js'],'90-boot.js':src['90-boot.js'].replace('SANS_DESSIN = false','SANS_DESSIN = '+nodraw)};
  const m=monde(src), {c,N}=m;c.__DT=1/60;
  vm.runInContext('('+installerRAF.toString()+')()',c);
  c.requestAnimationFrame(c.frame);N.reseed(7);N.game.reset(7);
  for(let i=0;i<preimages;i++)c.__R30RAF.avancer(i*1000/60);
  c.cfg={graine:7};const debut=vm.runInContext('('+amorcerPartie.toString()+')(cfg)',c);
  c.cfg={T:60,simulation,dessiner:!nodraw};const r=vm.runInContext('('+jouerControle.toString()+')(cfg)',c);
  return {...JSON.parse(JSON.stringify(r)),debut,console:m.erreurs,pixelsSha256:sha(N.gfx.buf()),camera:JSON.parse(JSON.stringify(N.S.vue))};
}
for(const [phase,src] of Object.entries({avant:recu,apres:final})) {
  const a=jouer(src),b=jouer(src),decale=jouer(src,1),nd=jouer(src,0,false,true),sim=jouer(src,0,true);
  const corrige={...src,'79-jeu.js':cameraSimulation(src['79-jeu.js'])}, sc=jouer(corrige,0,true),dc=jouer(corrige);
  const sp=l=>l.map(s=>s.replace(/^\[\d+,/,'['));
  out.r30[phase]={dessineRepete:comparer(cle(a.journal,60),cle(b.journal,60)),
    preimageDifferente:comparer(cle(a.journal,60),cle(decale.journal,60)),
    framesSansDessin:comparer(cle(a.journal,60,true),cle(nd.journal,60,true)),
    dessineSimule:comparer(sp(cle(a.journal,60,true)),sp(cle(sim.journal,60,true))),
    raccordCameraEnMemoire:comparer(sp(cle(dc.journal,60,true)),sp(cle(sc.journal,60,true))),
    essais:{dessine:a,repete:b,decale,sansDessin:nd,simule:sim,simuleRaccord:sc,dessineRaccord:dc}};
  save('diagnostic-p16c.json',out);
}
out.r30.avantApres= comparer(cle(out.r30.avant.essais.dessine.journal,60),cle(out.r30.apres.essais.dessine.journal,60));
// Les sources finales restaurent exactement la candidate AVANT des 80 parties déjà vérifiées.
// Les seuls ajouts N.R concernent le banc et ne sont lus par aucun module de simulation.
function retirerBlocs(src,noms) {
  const r={...src};
  for(const n of noms) r['02-regles.js']=r['02-regles.js'].replace(new RegExp('  /\\* codex-p16[^\\n]*\\*/\\n  R\\.perf\\.'+n+' = [^\\n]+\\n\\n'), '');
  return r;
}
const sansNouveaux=retirerBlocs(final,['imageP16','attenteP16','rejeuP16']);
const recuSansAttente=retirerBlocs(recu,['attenteP16']);
const av=lire('parties-avant.json'),ap=lire('parties-apres.json');
out.preuve80={methode:'réemploi des reçus, équivalence exacte des sources hors ajouts N.R du banc ; aucune nouvelle partie annoncée',
  sourcesFinalesEgalesReferenceAvant:JSON.stringify(sansNouveaux)===JSON.stringify(initial),
  hashReferenceAvant:sha(JSON.stringify(sansNouveaux)), hashRecuAvant:av.sourcesSha256,
  hashRecuOptimise:sha(JSON.stringify(recuSansAttente)),hashRecuApres:ap.sourcesSha256,
  total:av.cas.length, identiques:av.cas.filter((r,i)=>JSON.stringify(r)===JSON.stringify(ap.cas[i])).length,
  finiesSansErreur:[...av.cas,...ap.cas].every(c=>c.raison==='fin'&&!c.err&&!c.erreursConsole.length)};
assert.ok(out.preuve80.sourcesFinalesEgalesReferenceAvant);assert.equal(out.preuve80.hashReferenceAvant,av.sourcesSha256);
assert.equal(out.preuve80.hashRecuOptimise,ap.sourcesSha256);assert.equal(out.preuve80.total,80);assert.equal(out.preuve80.identiques,80);
out.conforme=Object.values(out.r30).filter(r=>r.essais).every(r=>r.dessineRepete.egaux&&r.framesSansDessin.egaux&&Object.values(r.essais).every(x=>!x.err.count&&!x.console.length))&&out.r30.avantApres.egaux&&out.preuve80.finiesSansErreur;
save('diagnostic-p16c.json',out);
console.log(JSON.stringify({calibration:out.calibration.filter(c=>c.identique).length,r30:Object.fromEntries(Object.entries(out.r30).map(([k,v])=>[k,v.essais?{...v,essais:undefined}:v])),preuve80:out.preuve80,conforme:out.conforme},null,2));
if(!out.conforme)process.exitCode=1;

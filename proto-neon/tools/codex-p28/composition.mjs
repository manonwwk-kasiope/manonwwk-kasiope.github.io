import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';
import {installerTrace,observerFin} from './scenarios.mjs';
import {scenario} from '../codex-p17/scenarios.mjs';
import {encodeIndex} from '../mesure/png.mjs';
const cas=[];
for(const phase of ['avant','apres'])for(const [profil,viewport] of [['paysage',[844,390]],['portrait',[390,844]],['bureau',[1440,900]]])for(const nom of ['briefing','pause','fin'])for(const stade of ['zero','encours','faits','tout']){
 const src=sources();if(phase==='avant')src.find(([f])=>f==='80-ecrans.js')[1]=fs.readFileSync(new URL('avant/80-ecrans.js',import.meta.url),'utf8');
 const w=monde(src,new Map(),viewport);vm.runInContext('('+installerTrace.toString()+')()',w.c);w.c.opts={nom,stade,profil};
 const r=JSON.parse(JSON.stringify(vm.runInContext('('+scenario.toString()+')({N:N,S:__S,...opts})',w.c)));
 fs.mkdirSync(new URL('tampon-vm/',import.meta.url),{recursive:true});
 if(nom==='fin'&&stade==='encours')fs.writeFileSync(new URL('tampon-vm/'+phase+'-'+profil+'-fin.png',import.meta.url),encodeIndex(w.N.gfx.W,w.N.gfx.H,w.N.gfx.buf(),w.N.pal.C.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16))),w.N.gfx.PX));
 delete r.tampon.data;
 const right=r.lignes.filter(l=>/^\d+\/\d+$/.test(l.texte)).map(l=>l.x+l.w);
 r.compteursAlignes=right.length===4&&right.every(x=>x===right[0]);
 r.sansNon=r.lignes.every(l=>!/(^| )NON( |$)/.test(l.texte));
 r.groupesEntiers=r.lignes.every(l=>!['PROCHAIN','JOUR','SECTEUR','>'].includes(l.texte)&&!(/\b(DU|LE)$/.test(l.texte)));
 r.phase=phase;r.ok=r.groupesEntiers&&r.compteursAlignes&&r.sansNon&&!r.err.count&&!r.collisions.length&&r.horsPalette===0&&r.cyan===0&&r.lignes.every(l=>l.echelle>=2&&l.dansZone&&l.pixels>0)&&r.boutons.every(b=>b.wPt>=44&&b.hPt>=44);
 if(nom==='fin'&&phase==='apres'){r.glyphes=JSON.parse(JSON.stringify(vm.runInContext('('+observerFin.toString()+')()',w.c)));r.glyphesIntacts=r.glyphes.lignes.every(l=>l.intact&&l.dansZone);r.ok=r.ok&&r.glyphesIntacts;}
 r.barresSures=r.modele.barres.every(b=>b.y>=r.modele.y&&b.y+b.h<=r.modele.bas);r.ok=r.ok&&r.barresSures;
 cas.push(r);
}
fs.writeFileSync(new URL('composition.json',import.meta.url),JSON.stringify({limite:'VM sans DOM : géométrie et pixels du tampon seulement, aucune capture navigateur.',cas},null,2));
for(const phase of ['avant','apres'])console.log(phase,cas.filter(c=>c.phase===phase&&c.ok).length,'/',cas.filter(c=>c.phase===phase).length);
console.log(cas.filter(c=>c.phase==='apres'&&!c.ok).map(c=>({profil:c.profil,nom:c.nom,stade:c.stade,err:c.err,collisions:c.collisions,lignes:c.lignes.filter(l=>!l.dansZone||!l.pixels)})));
assert.ok(cas.filter(c=>c.phase==='apres').every(c=>c.ok));

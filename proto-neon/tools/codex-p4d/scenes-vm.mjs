import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {encodeIndex} from '../mesure/png.mjs';
import { sources, monde } from './vm.mjs';
import { scenarios } from './scenarios.mjs';
if(!JSON.parse(fs.readFileSync(new URL('./calibration.json',import.meta.url))).valide) throw new Error('Calibration absente');
const resultats=[];fs.mkdirSync(new URL('./pixels-vm/',import.meta.url),{recursive:true});
for(const mode of ['avant','apres']) {
  const src=sources();
  if(mode==='avant') for(const f of ['02-regles.js','70-joueuse.js','73-colosse.js']) src[f]=fs.readFileSync(new URL('./avant-'+f,import.meta.url),'utf8');
  for(const [profil,dim] of Object.entries({paysage:[844,390],portrait:[390,844],bureau:[1440,900]})) {
    const m=monde(src,...dim);m.N.reseed(7);m.N.game.reset(7);
    const r=vm.runInContext('('+scenarios.toString()+')()',m.c);
    for(const c of r.captures) {const fichier='pixels-vm/'+mode+'-'+profil+'-'+c.nom;fs.writeFileSync(new URL('./'+fichier+'.bin',import.meta.url),Buffer.from(c.buf));fs.writeFileSync(new URL('./'+fichier+'.png',import.meta.url),encodeIndex(c.w,c.h,c.buf,m.N.pal.C.map(h=>h.slice(1).match(/../g).map(n=>parseInt(n,16))),2));c.fichier=fichier;c.sha256=crypto.createHash('sha256').update(Buffer.from(c.buf)).digest('hex');c.cyan=c.buf.filter(x=>x===m.N.pal.i('cyan')||x===m.N.pal.i('cyanPale')).length;delete c.buf;}
    resultats.push({mode,profil,...r,console:m.erreurs});
  }
}
fs.writeFileSync(new URL('./scenes-vm.json',import.meta.url),JSON.stringify(resultats,null,2));
console.log(JSON.stringify(resultats.map(r=>({mode:r.mode,profil:r.profil,err:r.err.count,morts:r.collision.morts,entrees:r.boss.naissances,mouvements:r.boss.mouvements.map(m=>({phase:m.phase,delai:m.delai})),phase:r.boss.phase,captures:r.captures.map(c=>({nom:c.nom,nonVide:c.nonVide}))})),null,2));

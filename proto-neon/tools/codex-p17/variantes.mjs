import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';
import {scenario} from './scenarios.mjs';
const cas=[];
for(const [profil,viewport] of [['paysage',[844,390]],['portrait',[390,844]],['bureau',[1440,900]]]){
 const w=monde(sources(),new Map(),viewport),{N,S}=w;w.c.opts={nom:'fin',stade:'encours',profil};vm.runInContext('('+scenario.toString()+')({N:N,S:__S,...opts})',w.c);
 const r=N.score.resume();
 for(const cause of N.ids.causes)for(const auteur of N.ids.auteurs){
  r.cause=cause;r.auteur=auteur;r.temps=359.99;r.score=9999999;r.marque='C';
  for(const id of N.R.defis.partie.reserve){
   r.defis[1]={id,nom:N.R.defis.reserve[id].nom,but:25,prog:24,fait:false};
   const m=N.ui.retourModele('fin');
   const hors=m.lignes.filter(l=>l.x<m.x||l.x+l.w>m.x+m.w||l.y<m.y||l.y+l.h>m.bas);
   if(hors.length)cas.push({profil,cause,auteur,id,hors});
  }
 }
}
fs.writeFileSync(new URL('variantes.json',import.meta.url),JSON.stringify({casFautifs:cas},null,2));console.log('Variantes hors zone',cas.length);assert.equal(cas.length,0);

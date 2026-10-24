import fs from 'node:fs';import assert from 'node:assert/strict';import {ICI,sources,compiler,monde,dateParis}from './vm.mjs';import{raccorder}from './raccords.mjs';
assert(JSON.parse(fs.readFileSync(ICI+'/calibration.json')).conforme);
const cas=[];const script=compiler(raccorder(sources()));
for(const[profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const{N,S,c,erreurs}=monde(script,2975,w,h);const marge=Math.ceil(N.R.gestes.bordPt/N.gfx.PX);
 // Marge construite issue de la règle de bord, pas une prétendue mesure de l'encoche Safari.
 S.view.safe={l:marge,r:marge,t:marge,b:marge};N.outils.geom();
 for(const[cause,auteur]of [['mur',null],['morsure',null],['convoi',null],['traine',null],...['fleche','dard','tourelle','lame','mine','sentinelle','traqueur'].map(e=>['ennemi',e])]){
  N.score.reset();S.death={cause,auteur,vague:2};N.score.terminer(false);N.ui.ouvrir('fin');N.outils.taps.length=0;N.ui.update(1);N.gfx.clear(0);N.ui.draw();
  const m=N.ui.retourModele('fin'),boites=m.lignes.map(l=>{const s=N.spr.text(l.texte,{ci:l.encre,echelle:l.echelle,contour:false,ombre:false});return{t:l.texte,x:l.x,y:l.y-s.top,w:s.w,h:s.h};});
  const overlap=[];for(let i=0;i<boites.length;i++)for(let j=i+1;j<boites.length;j++){const a=boites[i],b=boites[j];if(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h)overlap.push([i,j]);}
  const deborde=boites.filter(b=>b.x<S.view.safe.l||b.x+b.w>N.gfx.W-S.view.safe.r||b.y<S.view.safe.t||b.y+b.h>m.bas);
  cas.push({profil,cause,auteur,conseil:N.score.resume().conseil,boites,overlap,deborde,err:c.__ERR.count,console:erreurs});
 }
}
const conforme=cas.every(c=>!c.overlap.length&&!c.deborde.length&&!c.err&&!c.console.length);fs.writeFileSync(ICI+'/conseils.json',JSON.stringify({dateParis:dateParis(),conforme,cas},null,2)+'\n');console.log(conforme,cas.filter(c=>c.deborde.length||c.overlap.length));if(!conforme)process.exitCode=1;

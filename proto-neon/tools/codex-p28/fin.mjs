import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {sources,monde} from './vm.mjs';import {installerTrace,observerFin} from './scenarios.mjs';import {encodeIndex} from '../mesure/png.mjs';
const cas=[];
for(const [profil,viewport]of [['paysage',[844,390]],['portrait',[390,844]],['bureau',[1440,900]]]){
 const {N,S,c}=monde(sources(),new Map(),viewport);vm.runInContext('('+installerTrace.toString()+')()',c);
 S.view.safe=profil==='paysage'?{l:24,r:24,t:0,b:10}:profil==='portrait'?{l:0,r:0,t:23,b:17}:{l:0,r:0,t:0,b:0};N.outils.geom();
 function paint(){N.gfx.origin(0,0);N.gfx.clear(0);N.ui.draw();}
 function mesure(nom){paint();const p=JSON.parse(JSON.stringify(vm.runInContext('('+observerFin.toString()+')()',c)));cas.push({profil,nom,p});fs.writeFileSync(new URL('fin.json',import.meta.url),JSON.stringify({cas},null,2));assert.ok(p.ok,profil+' '+nom);return p;}
 N.intro.skip();N.game.dbg.scene('fin');N.ui.ouvrir('fin',{});N.ui.update(N.R.ecrans.fin.garde);
 // Mesurer au milieu de chaque seconde, loin des arrondis binaires de T-garde.
 N.ui.update(.5);const t0=N.ui.finActions().restant;assert.equal(t0,9);
 for(let i=0;i<=10;i++){
  if(i)N.ui.update(1);const p=mesure('decompte-'+i),a=N.ui.finActions();assert.equal(a.restant,Math.max(0,9-i));assert.equal(a.disponible,i<=9);assert.ok(p.lignes.some(l=>l.texte==='CONTINUER ? '+a.restant&&l.intact));
 }
 // Aucun premier doigt posé pendant la garde ne peut payer une continuation.
 N.ui.ouvrir('fin',{});N.ui.update(N.R.ecrans.fin.garde);let a=N.ui.finActions();
 N.outils.taps.push({key:null,x:a.continuer.x+1,y:a.continuer.y+1,t0:0,t1:1000});N.ui.update(0);N.outils.taps.length=0;assert.equal(N.ui.sortie(),null);
 // Entrée garde REJOUER ; le doigt valide CONTINUER dans sa seule cible.
 N.outils.taps.push({key:'Enter'});N.ui.update(0);N.outils.taps.length=0;assert.equal(N.ui.sortie().action,'rejouer');
 N.ui.ouvrir('fin',{});N.ui.update(N.R.ecrans.fin.garde);N.outils.taps.push({key:'Tab'});N.ui.update(0);N.outils.taps.length=0;paint();assert.ok(S.ecran.retour.bilan);
 const pages=S.ecran.retour.pages;for(let page=0;page<pages;page++){paint();const m=S.ecran.retour;assert.ok(m.lignes.every(l=>l.x>=m.x&&l.x+l.w<=m.x+m.w&&l.y>=m.y&&l.y+l.h<=m.bas));N.outils.taps.push({key:'ArrowRight'});N.ui.update(0);N.outils.taps.length=0;}
 a=N.ui.finActions();N.outils.taps.push({key:null,x:a.continuer.x+1,y:a.continuer.y+1});N.ui.update(0);N.outils.taps.length=0;assert.equal(N.ui.sortie().action,'continuer');
 N.game.reset(1,{depart:'plongee'});N.score.terminer(true);N.game.dbg.etat('fin');N.ui.ouvrir('fin',{victoire:true});N.ui.update(N.R.ecrans.fin.garde);mesure('gagne');assert.equal(N.ui.finActions().propose,false);
 fs.writeFileSync(new URL('tampon-vm/apres-'+profil+'-gagne.png',import.meta.url),encodeIndex(N.gfx.W,N.gfx.H,N.gfx.buf(),N.pal.C.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16))),N.gfx.PX));
 // L'écart non nul est issu du bilan public ; seul le profil de test est construit.
 const stockage={v:1,profil:{energie:0,deblocages:[],defisFaits:[],parties:1,dernier:100,codex:[],gestesVus:[]},records:[100],reglages:{musique:false,effets:false}};
 c.localStorage.setItem('snake2975.v1',JSON.stringify(stockage));N.score.profil.charger();N.game.reset(1,{depart:'plongee'});N.game.dbg.scene('fin');N.ui.ouvrir('fin',{});N.ui.update(N.R.ecrans.fin.garde);const p=mesure('ecart');assert.ok(p.lignes.some(l=>l.texte==='ÉCART -100'&&l.intact));
}
console.log(cas.length+' fins contrôlées : décompte, victoire, écart, cibles, pixels et erreurs.');

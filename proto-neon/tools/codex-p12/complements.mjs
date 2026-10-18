import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sources,monde,ROOT} from './vm.mjs';
const w=monde(sources()),{N,S}=w, resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),jours:[],profils:[],controles:[]};
for(const jour of [20261017,20261018,20261019]){
 S.jour=jour;N.game.reset(1,{depart:'plongee'});const selection=N.score.defis.map(d=>d.id);
 N.game.reset(77,{depart:'plongee'});assert.deepEqual(N.score.defis.map(d=>d.id),selection);
 resultat.jours.push({jour,selection,journal:N.journal.dump().filter(e=>e.type==='defi'&&e.d.evt==='selection'&&e.d.portee==='partie').slice(-3)});
}
assert.notDeepEqual(resultat.jours[0].selection,resultat.jours[1].selection);resultat.controles.push('même jour, graines 1 et 77 : même sélection ; jours différents : sélections différentes');
S.jour=20261017;N.game.reset(1,{depart:'plongee'});const fluxAvant=N.rng('defis').etat(),apercu=N.score.apercuVague();assert.equal(N.rng('defis').etat(),fluxAvant);N.game.dbg.god(true);N.ev.verifier(true);N.game.dbg.simuler(1);
assert.equal(N.score.defis.length,3);assert.ok(N.score.defiVague);assert.equal(N.score.defiVague.id,apercu.id);resultat.controles.push('aperçu de vague identique au défi réel, sans avancer le flux');resultat.controles.push('trois défis et un défi de vague après la plongée ; bus en vérification');
// Bilan déterministe de présentation : une récompense franchit le premier seuil.
N.score.stats.energie=N.R.defis.retour.seuils[0];S.death={cause:'tir',auteur:'tourelle',vague:3};N.score.terminer(false);
const e=N.score.energie,sc=N.score.score;N.score.terminer(false);assert.equal(N.score.energie,e);assert.equal(N.score.score,sc);resultat.controles.push('terminer est idempotent (énergie et score)');
for(const [nom,viewport,safe] of [['paysage',[844,390],{l:24,r:24,t:0,b:10}],['portrait',[390,844],{l:0,r:0,t:23,b:17}],['bureau',[1440,900],{l:0,r:0,t:0,b:0}]]){
 N.gfx.resize(...viewport);S.view.safe=safe;N.outils.geom();
 for(const ecran of ['briefing','pause','fin']){
  N.ui.ouvrir(ecran);N.ui.update(N.R.ecrans.fin.garde);N.gfx.origin(0,0);N.gfx.clear(0);N.ui.draw();
  const m=S.ecran.retour,b=N.gfx.buf(),pixels=m.lignes.map(l=>{let n=0;for(let y=l.y;y<l.y+l.h;y++)for(let x=l.x;x<l.x+l.w;x++)if(b[y*N.gfx.W+x]===l.encre)n++;return {texte:l.texte,n};});
  const hors=m.lignes.filter(l=>l.x<m.x||l.x+l.w>m.x+m.w||l.y+l.h>m.bas||l.echelle<2);
  const boutons=ecran==='fin'?['continuer','rejouer','bilan'].map(k=>({nom:k,w:m.actions[k].w*N.gfx.PX,h:m.actions[k].h*N.gfx.PX})):[];
  const entree={nom,ecran,hors:hors.map(l=>l.texte),pixels,boutons};resultat.profils.push(entree);
  assert.equal(hors.length,0,JSON.stringify(entree));assert.ok(pixels.every(l=>l.n>0));assert.ok(boutons.every(b=>b.w>=44&&b.h>=44));
  assert.ok(!b.includes(N.pal.i('cyan'))&&!b.includes(N.pal.i('cyanPale')));
  if(ecran==='fin'){
   const cb=m.actions.bilan;N.outils.taps.push({key:null,x:cb.x+1,y:cb.y+1});N.ui.update(0);N.outils.taps.length=0;N.ui.draw();assert.ok(S.ecran.retour.bilan);
   const pages=S.ecran.retour.pages;
   for(let page=0;page<pages;page++){
    const d=S.ecran.retour;assert.ok(d.lignes.every(l=>l.y+l.h<=d.bas));
    N.outils.taps.push({key:'ArrowRight'});N.ui.update(0);N.outils.taps.length=0;N.ui.draw();
   }
   entree.pagesBilan=pages;
  }
 }
}
N.score.reset();N.score.stats.energie=N.R.defis.retour.seuils.at(-1);N.score.terminer(false);N.ui.ouvrir('fin');N.ui.draw();
assert.equal(N.score.prochain(),null);assert.equal(N.score.deblocages.length,N.R.deblocages.length);assert.ok(S.ecran.retour.lignes.some(l=>l.texte==='TOUT DÉBLOQUÉ'));
resultat.controles.push('toutes les options acquises : prochain null et TOUT DÉBLOQUÉ réellement dessiné');
resultat.erreurs=w.c.__ERR;assert.equal(resultat.erreurs.count,0);assert.equal(w.erreurs.length,0);
fs.writeFileSync(ROOT+'/tools/codex-p12/complements.json',JSON.stringify(resultat,null,2));console.log('Compléments VM : jours, idempotence, interface et tampon logique sur trois formats. Aucun verdict Safari.');

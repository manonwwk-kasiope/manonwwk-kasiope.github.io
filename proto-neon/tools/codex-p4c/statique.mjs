import fs from 'node:fs';
import assert from 'node:assert/strict';
const r=JSON.parse(fs.readFileSync(new URL('./scenes-vm.json',import.meta.url))),controles=[];
function controle(nom,f) {try {f();controles.push({nom,ok:true});} catch(e) {controles.push({nom,ok:false,erreur:String(e.message)});}}
const dans=j=>{const d=j.d,v=d.vue;return v&&d.x>=v.x&&d.x<=v.x+v.w&&d.y>=v.y&&d.y<=v.y+v.h;};
for(const s of r.filter(r=>r.mode==='apres')) {
  controle(s.profil+' — naissances physiques et fin des portails hors vue',()=>{
    assert.equal(s.ennemis.length,11);
    for(const e of s.ennemis) {assert.equal(e.debut.dansVue,false,e.type);assert.equal(e.apparitions.length,1,e.type);assert.equal(e.apparitions.some(dans),false,e.type);}
  });
  controle(s.profil+' — caméra sur portail : aucun ennemi actif ni déplacement du marqueur',()=>{
    assert.equal(s.cameraPortail.fin.etat,'portail');assert.equal(s.cameraPortail.apparitions.length,0);
    assert.equal(s.cameraPortail.fin.x,s.cameraPortail.pos.x);assert.equal(s.cameraPortail.fin.y,s.cameraPortail.pos.y);
  });
  controle(s.profil+' — annonce avant le mouvement et frontière encore mortelle',()=>{
    assert.ok(s.murs[0].premier.delai>=2);assert.ok(s.murs[0].premier.tele.some(t=>t.par.type==='murMobile'));
    const mort=s.collision.morts.find(m=>m.d.auteur==='murMobile');assert.ok(mort);
    assert.ok(s.collision.annonces.some(a=>a.d.evt==='travellingAnnonce'&&mort.t-a.t>=2));
  });
  controle(s.profil+' — pose : protections et véritables morts par contact/souffle',()=>{
    for(const m of s.minesPosees) {assert.equal(m.naissance.dansVue,false);assert.ok(m.zonePose.length);assert.ok(m.mort);assert.ok(m.delaiVisible>=0.8);assert.ok(m.armements.every(a=>a.d.shown));assert.ok(m.apparitions.every(a=>!dans(a)));}
  });
  controle(s.profil+' — pixels réels des annonces, palette, cyan, erreurs',()=>{
    assert.equal(s.err.count,0);assert.equal(s.console.length,0);
    for(const c of s.captures) {assert.ok(c.nonVide>0,c.nom);assert.equal(c.horsPalette,0);assert.equal(c.cyan,0);}
  });
}
const externes=r.filter(s=>s.mode==='apres').map(s=>({profil:s.profil,cyclopeDansVue:s.cyclope.filter(dans).length}));
const R31Instrument=r.map(s=>({mode:s.mode,profil:s.profil,sansAnnonceHistorique:s.collision.morts.filter(m=>m.d.auteur==='murMobile'&&!(m.d.teleDuree>=2-1e-6||s.collision.annonces.some(a=>['travelling','convoiAnnonce'].includes(a.d.evt)&&a.t<=m.t-2))).length}));
const bilan={controles,externes,R31Instrument,perimetrePropreConforme:controles.every(c=>c.ok),R06GlobalConforme:externes.every(e=>!e.cyclopeDansVue),navigateur:'non exécuté, interdit dans le bac'};
fs.writeFileSync(new URL('./statique.json',import.meta.url),JSON.stringify(bilan,null,2));
console.log(JSON.stringify(bilan,null,2));
if(!bilan.perimetrePropreConforme)process.exitCode=1;

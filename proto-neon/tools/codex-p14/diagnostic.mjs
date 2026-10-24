import vm from 'node:vm';
import fs from 'node:fs';
import { monde, sources, chargerAvant, partie, sauver, dateParis } from './vm.mjs';
if (!JSON.parse(fs.readFileSync(new URL('./validation-vm.json',import.meta.url))).conformite) throw Error('VM non validée');
const label = process.argv[2] || 'avant', m = monde(label === 'avant' ? chargerAvant() : sources(), 1);
m.c.protocole = partie.toString();
const r = vm.runInContext(`(function(){
  const N=window.__N,S=window.__S, original=N.journal, update=N.game.update, essais=[];
  let courant=null;
  function point(){if(courant&&S.player)courant.trace.push({t:N.horloge.t(),x:S.player.x,y:S.player.y,ang:S.player.ang,len:S.player.len,vit:S.player.vit});}
  N.journal=function(type,d){
    if(type==='pilote'&&d.evt==='lassoTente') {courant={debut:N.horloge.t(),decision:{...d},trace:[],lassos:[],fermeturesDebut:N.joueuse.lassos(),ciblesDebut:S.enemies.filter(e=>e.etat!=='mort').map(e=>({id:e.id,x:e.x,y:e.y,pv:e.pv}))};essais.push(courant);point();}
    if(type==='lasso'&&courant)courant.lassos.push({...d});
    if(type==='pilote'&&d.evt==='lassoFin'&&courant){point();courant.fin=N.horloge.t();courant.raison=d.raison;courant.fermeturesFin=N.joueuse.lassos();courant.ciblesFin=S.enemies.filter(e=>e.etat!=='mort').map(e=>({id:e.id,x:e.x,y:e.y,pv:e.pv}));courant=null;}
    return original.apply(this,arguments);
  }; Object.assign(N.journal,original);
  N.game.update=function(){const r=update.apply(this,arguments);point();return r;};
  const r=eval('('+protocole+')')({pilote:'humain',graine:1});
  N.game.update=update;N.journal=original;
  return {temps:r.tempsJeu,score:r.score,err:r.err,lassos:r.journal.filter(e=>e.type==="lasso"),essais};
})()`, m.c);
for (const e of r.essais) {
  e.lassos = r.lassos.filter(x => x.t >= e.debut && x.t <= (e.fin ?? Infinity));
  const p = e.trace, start = p[0], last = p.at(-1); let parcours = 0, virageAbsolu = 0;
  for (let i = 1; i < p.length; i++) { parcours += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); const a = p[i].ang - p[i - 1].ang; virageAbsolu += Math.abs(Math.atan2(Math.sin(a), Math.cos(a))); }
  e.geometrie = { parcours, virageAbsolu, retourDepart: Math.hypot(last.x - start.x, last.y - start.y), perimetreVise: 2 * Math.PI * e.decision.rayon,
    corps: start.len * m.N.R.longueur.espacement, fenetreMax: start.len * m.N.R.longueur.espacement + start.vit * m.N.R.f.traine(start.len) };
}
sauver('diagnostic-' + label + '.json', { dateParis: dateParis(), ...r });
console.log(r.essais.slice(0, 5).map(e => ({ d: e.decision, raison: e.raison, ...e.geometrie })));

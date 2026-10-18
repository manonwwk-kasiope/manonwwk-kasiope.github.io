import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sources,monde,ROOT } from './vm.mjs';
function appliquer(code,patch){
 const lignes=code.split('\n'),diff=patch.trimEnd().split('\n'),sortie=[];let pos=0;
 for(let i=0;i<diff.length;i++){
  const h=/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(diff[i]);if(!h)continue;
  const debut=+h[1]-1;sortie.push(...lignes.slice(pos,debut));pos=debut;
  for(i++;i<diff.length&&!diff[i].startsWith('@@');i++){
   const l=diff[i],type=l[0],texte=l.slice(1);
   if(type===' '||type==='-'){assert.equal(lignes[pos],texte,'contexte du patch');pos++;}
   if(type===' '||type==='+')sortie.push(texte);
  }i--;
 }
 sortie.push(...lignes.slice(pos));return sortie.join('\n');
}
const patches={'79-jeu.js':'raccord-jeu.patch','90-boot.js':'raccord-date.patch','03-socle.js':'raccord-schemas.patch'};
const src=sources().map(([f,s])=>patches[f]?[f,appliquer(s,fs.readFileSync(ROOT+'/tools/codex-p12/'+patches[f],'utf8'))]:[f,s]);
const w=monde(src),{N,S,c}=w;S.jour=20261017;N.game.reset(1,{depart:'briefing'});
assert.equal(N.ui.ecran(),'briefing');N.ui.draw();assert.equal(S.ecran.retour.lignes.filter(l=>l.texte.startsWith('V1 ')).length,1);
N.horloge.avancer();N.game.dbg.simuler(1.75);assert.equal(N.game.etat(),'briefing');N.game.dbg.simuler(.5);assert.equal(N.game.etat(),'plongee');assert.equal(N.ui.actif(),false);
const heure=c.Date;c.Date=class extends Date{constructor(){super('2026-10-17T22:30:00Z');}};c.actualiserJourParis();assert.equal(S.jour,20261018);c.Date=heure;
N.ui.ouvrir('briefing');N.ui.draw();assert.equal(N.ids.valider('ecran',S.ecran).length,0);
for(const e of N.journal.dump().filter(e=>e.type==='defi'))assert.equal(N.ids.valider('journal:defi',e).length,0);
assert.equal(c.__ERR.count,0);
fs.writeFileSync(ROOT+'/tools/codex-p12/raccords.json',JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),patchesAppliquesUniquementEnVM:true,briefing:'affiche les défis, puis plonge après 2 s, UI fermée',dateParisDepuisUTC:'2026-10-17T22:30:00Z → 20261018',erreurs:c.__ERR},null,2));
console.log('Raccords vérifiés en VM ; aucun fichier réservé modifié.');

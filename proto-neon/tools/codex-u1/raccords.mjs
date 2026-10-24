import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ICI, sources } from './vm.mjs';
function remplacer(s,a,b) { if(!s.includes(a))throw Error('Ancre de raccord absente : '+a.slice(0,100));return s.replace(a,b); }
export function raccorder(src) {
 return src.map(([f,s])=>{
  if(f==='79-jeu.js') {
   s=remplacer(s,"return rg ? !(rg.musique && rg.effets) : false;","return rg ? !(rg.musique || rg.effets) : false;");
   s=remplacer(s,'muted = !muted;', 'muted = !reglagesSon();');
   s=remplacer(s,"N.music.mute('musique', coupe); N.music.mute('effets', coupe);", "var rg = N.score.profil.reglages(); N.music.mute(false); N.music.mute('musique', coupe || !rg.musique); N.music.mute('effets', coupe || !rg.effets);");
   s=remplacer(s,'y: inp.taps[i].y, key: null,','y: inp.taps[i].y, key: inp.taps[i].key || null,');
   s=remplacer(s,"var q = T[i], b = (q.key === null", "var q = T[i];\n      if (N.ui && N.ui.ecran && N.ui.ecran() === 'reglages') continue;\n      var b = (q.key === null");
   s=remplacer(s,"else if (etT >= R.ecrans.attraction.attente) commencerAttraction();", "else if (N.ui.ecran() !== 'reglages' && etT >= R.ecrans.attraction.attente) commencerAttraction();");
  }
  if(f==='78-hud.js') {
   s=remplacer(s,'var k = Math.min(plafond || Infinity, O.geo.portrait ? B.echellePortrait : B.echellePaysage);',
    'var demandeTexte = N.S && N.S.reglages && N.S.reglages.texte;\n    var k = Math.min(plafond || Infinity, (demandeTexte || R.reglages.texte) * (O.geo.portrait ? B.echellePortrait : B.echellePaysage));');
  }
  if(f==='64-aventure.js') {
   s=remplacer(s,'A.i = i;\n      if (e.si',"A.i = i;\n      if (A.opts.retour && N.R.accueilU1.retourEpoques.indexOf(e.id) >= 0) { ajournal('déjà traversé ' + e.id); continue; }\n      if (e.si");
   s=remplacer(s,"if (e.type === 'jeu') {\n        if (e.sauf", "if (e.type === 'jeu') {\n        if (e.id === N.R.accueilU1.retourEtape && N.score && N.score.profil.epoquesVues) N.score.profil.epoquesVues(true);\n        if (e.sauf");
   s=remplacer(s,'A.opts = { qui: A.qui,', 'A.opts = { retour: !!(N.score && N.score.profil.epoquesVues && N.score.profil.epoquesVues()), qui: A.qui,');
  }
  return [f,s];
 });
}
if(process.argv[1]===new URL(import.meta.url).pathname) {
 const avant=sources(),apres=raccorder(avant);
 for(const f of ['79-jeu.js','64-aventure.js','78-hud.js']) {
  const a=ICI+'/'+f+'.avant',b=ICI+'/'+f+'.apres';
  fs.writeFileSync(a,avant.find(x=>x[0]===f)[1]);fs.writeFileSync(b,apres.find(x=>x[0]===f)[1]);
  let diff='';try{execFileSync('diff',['-u','--label','a/proto-neon/src/'+f,'--label','b/proto-neon/src/'+f,a,b]);}catch(e){if(e.status!==1)throw e;diff=e.stdout.toString();}
  fs.writeFileSync(path.join(ICI,'raccord-'+f.replace('.js','')+'.patch'),diff);fs.unlinkSync(a);fs.unlinkSync(b);
 }
}

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT,ICI} from './vm.mjs';
function remplacer(s,a,b){if(!s.includes(a))throw Error('Raccord absent : '+a);return s.replace(a,b);}
export function raccorder(src){return src.map(([f,s])=>{
 if(f==='79-jeu.js'){
  s=remplacer(s,'  function update(dt) {',`  /* codex-v0d : le panneau est un masque de l'état suspendu, sans transition
     ni remise à zéro de son chronomètre. L'horloge publique le voit arrêté. */
  function filmAmiral() { return !!(N.cosmos && N.cosmos.filmActif && N.cosmos.filmActif()); }
  function update(dt) {`);
  s=remplacer(s,'    O.geom();\n    redimensionne();',`    if (filmAmiral()) {
      QT.length = 0; O.taps.length = 0;
      appel('cosmos.film', function () { N.cosmos.update(dt); });
      return;
    }
    O.geom();
    redimensionne();`);
  s=remplacer(s,'  function reset(graine, opts) {',`  function reset(graine, opts) {
    if (filmAmiral()) N.cosmos.stop();`);
  s=remplacer(s,'  function draw() {','  function draw() {\n    if (filmAmiral()) { N.cosmos.draw(); return; }');
  s=remplacer(s,'  function drawTop() {','  function drawTop() {\n    if (filmAmiral()) return;');
  s=remplacer(s,'  function etatCourant() { return et; }',"  function etatCourant() { return filmAmiral() ? 'panneau' : et; }");
  // Comme le boot : les effets reçoivent le zéro du monde pendant le film,
  // y compris le pas qui vient de le terminer, jamais le pas réel d'interface.
  s=remplacer(s,'      N.game.update(dt);\n      if (N.fx && N.fx.update) N.fx.update(dt);','      var gelAmiral = filmAmiral();\n      N.game.update(dt);\n      if (N.fx && N.fx.update && !gelAmiral) N.fx.update(dt);');
 }
 if(f==='50-fx.js'){
  s=remplacer(s,'  function update(dt) {',`  function filmAmiral() { return !!(N.cosmos && N.cosmos.filmActif && N.cosmos.filmActif()); }
  function update(dt) {
    if (filmAmiral()) return;`);
  for(const fn of ['draw','drawEcran'])s=remplacer(s,`  function ${fn}() {`,`  function ${fn}() {\n    if (filmAmiral()) return;`);
 }
 return [f,s];});}
if(process.argv.includes('--ecrire')){
 const src=['79-jeu.js','50-fx.js'].map(f=>[f,fs.readFileSync(path.join(ROOT,'src',f),'utf8')]);
 for(const [f,s] of raccorder(src)){
  const a=path.join(ICI,'temp-avant'),b=path.join(ICI,'temp-apres');fs.writeFileSync(a,src.find(x=>x[0]===f)[1]);fs.writeFileSync(b,s);
  let diff;try{diff=execFileSync('diff',['-u','--label','a/proto-neon/src/'+f,'--label','b/proto-neon/src/'+f,a,b],{encoding:'utf8'});}catch(e){if(e.status!==1)throw e;diff=e.stdout;}
  fs.writeFileSync(path.join(ICI,'raccord-'+f+'.patch'),diff);fs.unlinkSync(a);fs.unlinkSync(b);
 }
}

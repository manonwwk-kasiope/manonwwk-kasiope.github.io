// Aucun DOM, serveur ni navigateur. Les coûts excluent composition Canvas/CRT et ne qualifient pas R-20.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { sources, monde, partie } from './vm.mjs';
const here = new URL('./', import.meta.url), phase = process.argv[2] || 'avant';
const lire = n => JSON.parse(fs.readFileSync(new URL(n, here)));
const save = (n, x) => fs.writeFileSync(new URL(n, here), JSON.stringify(x, null, 2) + '\n');
if (!lire('calibration.json').valide) throw Error('VM non calibrée');
if (phase === 'avant' && !fs.existsSync(new URL('sources-avant.json', here))) save('sources-avant.json', sources());
const src = phase === 'avant' ? lire('sources-avant.json') : sources();
const out = { dateParis: new Date().toLocaleString('fr-FR', {timeZone:'Europe/Paris'}), phase, sourcesSha256: crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'), cas: [] };
if (!process.argv.includes('--profil-seul')) {
  for (const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu']) for (let graine=1;graine<=10;graine++) {
    const m=monde(src), r=partie(m,pilote,graine);
    r.tempsCombat=m.N.game.dbg().t; r.journalSha256=crypto.createHash('sha256').update(JSON.stringify(m.N.journal.dump())).digest('hex');
    r.erreursConsole=m.erreurs; out.cas.push(r); save('parties-'+phase+'.json',out);
    console.log(pilote,graine,r.tempsJeu,r.score,r.raison);
  }
  if (phase === 'apres') {
    const a=lire('parties-avant.json');
    const cas=out.cas.map((r,i)=>({pilote:r.pilote,graine:r.graine,identique:JSON.stringify(r)===JSON.stringify(a.cas[i])}));
    save('comparaison80.json',{cas,total:cas.length,identiques:cas.filter(c=>c.identique).length});
    if (cas.some(c=>!c.identique)) process.exitCode=1;
  }
}
const profils=[];
for (const scene of ['charge','v5','vol','boss3']) {
  const {c,N,S,erreurs}=monde(src); c.performance=performance;
  vm.runInContext(`var __couts = {}, __s0 = step;
    step = function(n,f) { var t=performance.now(); try {return __s0(n,f);} finally {n='step/'+n;(__couts[n] || (__couts[n]=[])).push(performance.now()-t);} };
    for (var mod of ['decor','ennemis','joueuse','hud','scene','score','fx']) if(N[mod]) for(var nom of Object.keys(N[mod])) if(/^draw/.test(nom)&&typeof N[mod][nom]==='function') {
      (function(o,k,label){var f=o[k];o[k]=function(){var t=performance.now();try{return f.apply(this,arguments);}finally{(__couts[label]||(__couts[label]=[])).push(performance.now()-t);}};})(N[mod],nom,mod+'.'+nom);
    }`, c);
  N.reseed(7); N.game.reset(7); const ok=N.game.dbg.scene(scene); N.game.dbg.god(true); N.crt.auto(false);
  const couts=[]; for(let i=0;i<720;i++) {const t=performance.now();c.frame(i*1000/60);if(i===119)c.__couts={};if(i>=120)couts.push(performance.now()-t);}
  const stat = x => {x=[...x].sort((a,b)=>a-b); return {n:x.length,total:x.reduce((a,b)=>a+b,0),p50:x[Math.floor(x.length*.5)],p95:x[Math.min(x.length-1,Math.floor(x.length*.95))]};};
  profils.push({scene,ok,etat:N.game.etat(),phase:N.colosse.phase(),tamponSha256:crypto.createHash('sha256').update(N.gfx.buf()).digest('hex'),journalSha256:crypto.createHash('sha256').update(JSON.stringify(N.journal.dump())).digest('hex'),erreurs:c.__ERR,console:erreurs,frame:stat(couts),classement:Object.entries(c.__couts).map(([module,v])=>({module,...stat(v)})).sort((a,b)=>b.total-a.total)});
  console.log(scene,profils.at(-1).frame,profils.at(-1).classement.slice(0,6));
}
save('profil-vm-'+phase+'.json',{limite:'Vraie frame, aucun DOM : gfx.present et CRT sans Canvas, coûts VM non transposables au navigateur. Classement inclusif, étapes et sous-modules ne se somment pas.',profils});

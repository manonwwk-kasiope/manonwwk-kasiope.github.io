/* node tools/codex-p43/vm.mjs : aucune écoute HTTP ni Chromium.
   Valide d'abord le transport VM sur dix parties historiques EXACTES. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compiler, jouer, monde, sources } from '../codex-p21/vm.mjs';
import { ecartAng, latence, contratEvenements, horlogeReelle } from '../mesure/tactile.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), reference: 'e1bdc6f', validation: [], calculs: [], gestes: [], limite: 'VM sans DOM : ni CDP, ni horloge navigateur, ni verdict R-22/R-33.' };
const save = () => fs.writeFileSync(path.join(HERE, 'vm.json'), JSON.stringify(out, null, 2)+'\n');
try {
  const ref = JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json', import.meta.url))).cas;
  const historique = compiler(sources('e1bdc6f'));
  const selection = ref.filter(r => r.graine === 1 || r.graine === 2 && ['bon', 'expert'].includes(r.pilote));
  for (const a of selection) {
    const r = jouer(historique, a.pilote, a.graine), champs = ['tempsJeu','tempsCombat','tempsSimule','score','vague'];
    const attendu = Object.fromEntries(champs.map(k=>[k,a[k]])), obtenu=Object.fromEntries(champs.map(k=>[k,r[k]]));
    const journalSha256=crypto.createHash('sha256').update(JSON.stringify(r.journal)).digest('hex');
    // Contrat demandé : temps de jeu, vague, score exacts ; trois autres sorties renforcent ce contrôle.
    // L'empreinte du journal, sensible aux derniers bits des trigonométries Node/Chromium, est publiée séparément.
    const identique=champs.every(k=>a[k]===r[k])&&r.etat==='fin'&&!r.err&&!r.erreursConsole.length;
    out.validation.push({pilote:a.pilote,graine:a.graine,attendu,obtenu,err:r.err,journalSha256,attenduJournal:a.journalSha256,journalIdentique:journalSha256===a.journalSha256,identique});save();
    console.log('historique',a.pilote,a.graine,identique);
  }
  out.vmValide=out.validation.length>=10&&out.validation.every(c=>c.identique); save();
  assert.ok(out.vmValide,'VM divergente : aucune conclusion avec ses sorties');
  function cas(nom, fn) { const valeur=fn();out.calculs.push({nom,ok:true,valeur}); }
  const E={f:10,r:100}, before={f:10,r:95,vise:0,ang:0}, after={f:11,r:112,vise:-Math.PI/2,ang:-Math.PI/2};
  cas('réponse connue à 1 image / 12 ms',()=>{const r=latence(E,[before,after],-Math.PI/2,0.01);assert.equal(r.images,1);assert.equal(r.ms,12);assert.equal(r.virageMs,12);return r;});
  cas('geste ignoré refusé',()=>{const r=latence(E,[before,{...after,vise:0,ang:0}],-Math.PI/2,0.01);assert.equal(r.ok,false);assert.equal(r.images,null);return r;});
  cas('retard réel de 2 images conservé',()=>{const r=latence(E,[before,{...after,f:12}],-Math.PI/2,0.01);assert.equal(r.images,2);assert.ok(r.images>1);return r;});
  cas('horloges différentes / cap déjà atteint / événement absent refusés',()=>{
    for(const r of [latence(null,[before,after],0,0.01),latence(E,[before,after],0,0.01),latence(E,[before,{...after,r:99}],-Math.PI/2,0.01)])assert.equal(r.ok,false);
    assert.ok(ecartAng(Math.PI-0.01,-Math.PI+0.01)<0.03);return true;
  });
  cas('contrat DOM : relâchement du second seul puis pouce',()=>{
    const e=(type,ids,changes)=>({type,ids,changes:changes.map(id=>({id})),fiable:true});
    const trace=[e('touchstart',[1],[1]),e('touchmove',[1],[1]),e('touchstart',[1,2],[2]),e('touchend',[1],[2]),e('touchend',[],[1])];
    assert.ok(contratEvenements(trace,1,2).ok);
    assert.equal(contratEvenements(trace.filter(x=>!(x.type==='touchend'&&x.ids.length)),1,2).ok,false);
    assert.equal(contratEvenements(trace.map(x=>({...x,fiable:false})),1,2).ok,false);return trace;
  });
  cas('compteur seul et mouvement avec __DT forcé refusés',()=>{
    assert.equal(horlogeReelle([{f:1,r:1,t:1,x:1,y:1},{f:2,r:2,t:2,x:1,y:1}]).ok,false);
    assert.equal(horlogeReelle([{f:1,r:1,t:1,x:1,y:1,dtForce:true},{f:2,r:2,t:2,x:2,y:1,dtForce:true}]).ok,false);return true;
  });
  const actuelles=compiler(sources());
  for(const [width,height] of [[844,390],[390,844],[1440,900]]) {
    for(const genre of ['toucher','glisse','tenu','ignore']) {
      const {c,N,S,erreurs}=monde(actuelles,2975,width,height),B=c.__BOOT_TEST;
      c.__now=0;N.intro.skip();N.intro.stop();N.game.reset(2975);N.game.dbg.scene('calme');N.game.dbg.god(true);S.reglages.actions='doigts';S.jour=20261017;
      const A=N.outils.A;N.joueuse.force({x:(A.x0+A.x1)/2,y:(A.y0+A.y1)/2,ang:0,trace:true});N.joueuse.apogeeAjouter(N.R.apogee.max);N.journal.actif(true);N.journal.vider();
      const doigts=new Map(),trace=[];
      function touch(type,id,x,y) {const p={identifier:id,clientX:x,clientY:y};if(type==='end')doigts.delete(id);else doigts.set(id,p);B[type]({type:type==='end'?'touchend':'touch'+type,changedTouches:[p],touches:[...doigts.values()],cancelable:true,preventDefault(){}});}
      function avancer(ms){const fin=c.__now+ms;while(c.__now<fin){c.__now=Math.min(fin,c.__now+1000/60);B.frame(c.__now);trace.push({f:c.__FRAME,r:c.__now,ang:S.player.ang,vise:S.player.angVise,x:S.player.x,y:S.player.y,boost:S.player.boost});}}
      touch('start',1,100,180);touch('move',1,130,180);avancer(genre==='ignore'?40:260);touch('start',2,250,200);
      if(genre==='glisse'){avancer(60);touch('move',2,285,200);avancer(17);}else avancer(genre==='tenu'?500:70);
      touch('end',2,genre==='glisse'?285:250,200);avancer(17);
      const journal=JSON.parse(JSON.stringify(N.journal.dump())),action=genre==='toucher'?'pouvoir':genre==='glisse'?'apogee':'boost';
      const actual=journal.filter(e=>e.type===action&&e.d.evt===(action==='boost'?'on':'debut')).length;
      const etat={pouvoir:N.joueuse.pouvoir.etat,apogee:N.joueuse.apogee,reserve:N.joueuse.reserve(),boost:!!S.player.boost};
      const effet=genre==='ignore'?!journal.some(e=>['geste','pouvoir','apogee','boost'].includes(e.type)):
        actual===1&&(genre==='toucher'?etat.pouvoir==='actif':genre==='glisse'?etat.apogee<N.R.apogee.max:trace.some(i=>i.boost)&&!etat.boost);
      out.gestes.push({profil:[width,height],genre,ok:effet&&!c.__ERR.count&&!erreurs.length,actual,etat,journal,trace,err:c.__ERR.count,erreurs});
    }
  }
  out.conforme=out.vmValide&&out.calculs.every(c=>c.ok)&&out.gestes.every(c=>c.ok);save();
  console.log('calculs',out.calculs.length,'gestes',out.gestes.filter(c=>c.ok).length+'/'+out.gestes.length);
  if(!out.conforme)process.exitCode=1;
} catch(e){out.exception=String(e.stack||e);save();console.error(out.exception);process.exitCode=1;}

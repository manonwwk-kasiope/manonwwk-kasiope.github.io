import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { P,paris } from './protocole.mjs';
import { grilleBundle,ecartGrille,ecartNoire,recalculerEvenements } from './grille-sync.mjs';
import { tapisRythmique } from './tapis.mjs';
import { sync } from './analyse.mjs';
import { observations } from './observations.mjs';
import { construirePaquet } from './jure.mjs';
import { discriminant,comparer } from './discriminant.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const REELS=path.resolve(process.env.JURY2_DISCRIMINANT_REELS||path.join(HERE,'../../../../jury-etal/proto-neon/tools/jury2'));
const CODES=['J-897bbde4','J-5ea97f8e'];
const lire=f=>JSON.parse(fs.readFileSync(f,'utf8'));
export async function testsDiscriminant({test,preuve}){
  const tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'snake-di7-')));
  const recu=preuve.discriminant={dateParis:paris(),avant:[],apres:[],limites:[]};
  try{
    await test('DI7 : croche réellement lue dans N.R ; ±40 ms et 95 % inchangés',()=>{
      assert.equal(P.syncMs,40);assert.equal(P.syncPart,.95);
      for(const subdivisions of [2,3,4]){
        const e={bpm:120,beat:{phase:1/subdivisions}},g={subdivisions};
        assert(Math.abs(ecartNoire(e))>P.syncMs);assert.equal(ecartGrille(e,g),0);
      }
      assert.equal(ecartGrille({bpm:120,beat:{phase:.5}}),null);
      return {avant:'écart noire de 250 ms sur une croche exacte : échec',apres:'0 ms ; absence de N.R = inconnu'};
    });
    await test('DI7 : musique coupée explicitement visible en passe 1, sans faux vert géométrique',()=>{
      const e={w:1,type:'apparition',bpm:120,beat:{phase:.5},audioRunning:true,musiqueMuette:true,rmsMusique:1};
      const t=tapisRythmique({frames:[],evenements:[e],debut:0,fin:2,regles:{subdivisions:2}});
      assert.equal(t.evenements[0].ecartGeometriqueMs,0);assert.equal(t.evenements[0].dansLaTolerance,null);
      assert.equal(t.resume.musiqueMuette,1);assert.equal(t.resume.mesurables,0);
      assert.equal(t.evenements[0].musiqueMuette,true);
    });
    await test('DI7 : doublons jugés sur identifiants apparus après rendu, aucun compteur seul',()=>{
      function paquet(nom,double){
        const root=path.join(tmp,nom);fs.mkdirSync(path.join(root,'S01'),{recursive:true});fs.mkdirSync(path.join(root,'annexe'));
        const ev=[{type:'reservation',w:0,d:{type:'poursuivant',demande:{},objets:[{id:1,type:'poursuivant'},{id:2,type:'poursuivant'}]}}];
        ev.push({type:'apparition',w:1,d:{id:1},preuve:{apresRendu:true}});
        if(double)ev.push({type:'apparition',w:1,d:{id:2},preuve:{apresRendu:true}});
        const o=observations({frames:[],evenements:ev},{subdivisions:2});
        fs.writeFileSync(path.join(root,'S01/observations.json'),JSON.stringify(o));
        fs.writeFileSync(path.join(root,'annexe/annexe.json'),JSON.stringify({sequences:{S01:{observations:{reservations:o.reservations}}}}));
        fs.writeFileSync(path.join(root,'paquet.json'),JSON.stringify({parRegard:{tous:['S01/observations.json']},fichiers:[{chemin:'S01/observations.json',categorie:'observations'}]}));return root;
      }
      const simple=paquet('simple',false),double=paquet('double',true);
      const a=discriminant(simple,{passe:2}),b=discriminant(double,{passe:2});
      assert.equal(a.resultats['game design'].score,10);assert.equal(b.resultats['game design'].score,5);
      assert.equal(comparer(a,b)['game design'].conforme,true);
      return {synthetique:true,unSeulApparu:10,deuxObjetsApparus:5};
    });
    await test('DI7 : juge-code strictement enfermé dans le paquet ; clé empoisonnée et annexe passe 1 jamais lues',()=>{
      fs.writeFileSync(path.join(tmp,'cle-secrete.json'),'INTERDIT');
      const lectures=[],root=path.join(tmp,'simple');
      const lireGarde=(f,...args)=>{assert(f.startsWith(root+path.sep));assert(!/cle-secrete|cles/.test(f));lectures.push(f);return fs.readFileSync(f,...args);};
      discriminant(root,{passe:1,lire:lireGarde});assert(!lectures.some(f=>f.includes('/annexe/')));
      discriminant(root,{passe:2,lire:lireGarde});
      const code=fs.readFileSync(path.join(HERE,'discriminant.mjs'),'utf8');
      assert(!/from ['"]\.\/(jure|oracle|etalonnage|temoin)\.mjs/.test(code));
      // Un chemin injecté dans le manifeste et un symlink ne donnent aucun accès au parent.
      const p=lire(path.join(root,'paquet.json')),ancien=JSON.stringify(p);
      p.fichiers.push({chemin:'../cle-secrete.json',categorie:'observations'});p.parRegard.tous.push('../cle-secrete.json');
      fs.writeFileSync(path.join(root,'paquet.json'),JSON.stringify(p));assert.throws(()=>discriminant(root),/hors paquet/);
      fs.writeFileSync(path.join(root,'paquet.json'),ancien);fs.symlinkSync(path.join(tmp,'cle-secrete.json'),path.join(root,'S01/fuite.json'));
      p.fichiers=[{chemin:'S01/fuite.json',categorie:'observations'}];p.parRegard.tous=['S01/fuite.json'];
      fs.writeFileSync(path.join(root,'paquet.json'),JSON.stringify(p));assert.throws(()=>discriminant(root),/hors paquet/);
      return {lectures:lectures.map(f=>path.relative(root,f)),cleLue:false};
    });
    await test('DI7 : bruts réels recalculés, paquets reconstruits sans navigateur, rythme discriminé',async()=>{
      const montages=[];
      for(const code of CODES){
        const k=lire(path.join(REELS,'cles',code+'.json'));
        const dossier=k.dossierBrutChemin,grille=grilleBundle(dossier),events=[];
        assert(grille?.subdivisions>0);
        for(const dir of Object.values(k.ordre).filter(d=>d.startsWith('partie'))){const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dossier,dir,'brut.json.gz'))));events.push(...recalculerEvenements(d,grille));}
        if(code===CODES[1]){
          const m=lire(path.join(dossier,'manifeste.json'));
          recu.sondes=[];
          for(const c of m.cas.filter(c=>c.genre==='sync-probe')){
            const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dossier,c.dossier,'brut.json.gz'))));
            const ev=recalculerEvenements(d,grille).filter(e=>e.type==='apparition'&&e.audioRunning&&e.preuve?.apresRendu&&Number.isFinite(e.ecartAudioMs));
            recu.sondes.push({mode:c.modeTemoin,n:ev.length,part:ev.length?ev.filter(e=>e.ecartAudioMs<=P.syncMs).length/ev.length:null});
          }
          const pos=recu.sondes.find(s=>s.mode==='synchro'),neg=recu.sondes.find(s=>s.mode==='desync');
          assert(pos&&pos.n>=P.sensibilite.evenementsMin&&pos.part>=P.sensibilite.positifPartMin);
          recu.perteHistorique=pos.part-neg.part;
          recu.instrumentHistoriqueValide=recu.perteHistorique>=P.sensibilite.perteSyncMin;
          recu.limites.push('Le témoin positif historique passe, mais la perte temporelle du témoin dégradé est nulle : validation physique historique en échec.');
        }
        const avant=discriminant(path.join(REELS,'paquets',code),{passe:2});
        recu.avant.push({code,resultat:avant.resultats,annexe:lire(path.join(REELS,'paquets',code,'annexe/annexe.json')).synchronisationAgregee});
        const r=await construirePaquet({dossier,code,role:k.role,graineTirage:k.graineTirage,sortie:path.join(tmp,'paquets'),cles:path.join(tmp,'cles')});
        const apres=discriminant(r.racine,{passe:2}),p1=discriminant(r.racine,{passe:1});
        assert.equal(p1.resultats['rythme et musique'].score,apres.resultats['rythme et musique'].score);
        recu.apres.push({code,synchronisation:sync(events),resultat:apres.resultats});montages.push(apres);
      }
      recu.comparaison=comparer(...montages);recu.pretPourJury=false;assert.equal(recu.comparaison['rythme et musique'].conforme,true);
      assert.equal(recu.avant[0].resultat['rythme et musique'].score,null,'Échec avant attendu : statut absent en passe 1');
      assert(recu.apres[0].synchronisation.apparition.part>=P.syncPart);
      assert.equal(recu.apres[1].synchronisation.apparition.mesurables,0);
      // On publie l'échec restant, sans inventer une note ou une preuve depuis la clé.
      assert.equal(recu.comparaison['game design'].conforme,null);
      recu.limites.push('Game design : pas de réservations dans les bruts historiques ; nouveau Chrome nécessaire. Trois regards visuels : aucune baisse de qualité prouvée par les seuls sabotages.');
      return recu.comparaison;
    });
  }finally{
    fs.writeFileSync(path.join(HERE,'discriminant-di7.json'),JSON.stringify(recu,null,2)+'\n');
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}

/* Hors bac : cd proto-neon && node tools/codex-p19/verifier.mjs
   Ici seulement : node tools/codex-p19/verifier.mjs --statique
   Les deux builds figés sont écrits dans NOTRE dossier ; la copie p15 reste en
   lecture seule. Un serveur Node sur port libre, un seul Chromium muet, profils
   iPhone 13 paysage/portrait et bureau en série. Ne jamais lancer ici sans option. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {Banc,options,Resultat,PROFILS} from '../mesure/commun.mjs';
import {meta,mesurer} from '../mesure/criteres/R-12-explosion.mjs';
const ICI=path.dirname(fileURLToPath(import.meta.url)),PROTO=path.resolve(ICI,'../..');
if(process.argv.includes('--statique')){
  await import('./statique.mjs');
}else{
  const arg=(nom,repli)=>{const i=process.argv.indexOf(nom);return i<0?repli:process.argv[i+1];};
  const p15=path.resolve(arg('--p15',path.resolve(PROTO,'../../codex-p15/proto-neon')));
  const SHA=b=>crypto.createHash('sha256').update(b).digest('hex');
  const dossier=path.join(ICI,'navigateur');fs.mkdirSync(path.join(dossier,'bundles'),{recursive:true});
  const bundles=[];
  for(const [nom,racine] of [['codex-p15',p15],['integre',PROTO]]){
    const fichier=path.join(dossier,'bundles',nom+'.html');
    const log=execFileSync(process.execPath,['build.mjs',fichier],{cwd:racine,encoding:'utf8'});
    fs.writeFileSync(path.join(dossier,nom+'-build.log'),log);
    bundles.push({nom,racine,fichier,sha256:SHA(fs.readFileSync(fichier)),sha256IndexRecu:SHA(fs.readFileSync(path.join(racine,'index.html')))});
  }
  const autorises=[PROTO,p15].map(p=>fs.realpathSync(p));
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg'};
  const serveur=http.createServer((req,res)=>{
    try{
      // L'URL reflète le chemin du bundle figé : ses chemins art/cine/musique
      // relatifs pointent vers la bonne copie, sans réécrire les octets du build.
      const u=decodeURIComponent(new URL(req.url,'http://local').pathname);
      if(!u.startsWith('/f/')){res.writeHead(404);return res.end();}
      const f=fs.realpathSync(u.slice(2));
      if(!autorises.some(p=>f.startsWith(p+path.sep))||!fs.statSync(f).isFile()){res.writeHead(403);return res.end();}
      const size=fs.statSync(f).size,range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
      const headers={'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
      if(range){const start=+range[1],end=range[2]?Math.min(+range[2],size-1):size-1;
        if(start>=size||end<start){res.writeHead(416);return res.end();}
        res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
        fs.createReadStream(f,{start,end}).pipe(res);
      }else{res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(f).pipe(res);}
    }catch{res.writeHead(404);res.end('absent');}
  });
  let navigateur;
  const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundles,
    instrumentSha256:SHA(fs.readFileSync(new URL('../mesure/criteres/R-12-explosion.mjs',import.meta.url))),
    profils:{paysage:[844,390],portrait:[390,844],bureau:[1440,900]},mesures:[],environnement:null};
  const sauver=()=>fs.writeFileSync(path.join(dossier,'resultats.json'),JSON.stringify(resultat,null,2)+'\n');
  try{
    if(!devices['iPhone 13']||!devices['iPhone 13 landscape'])throw Error('profils iPhone absents');
    await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
    navigateur=await chromium.launch({headless:true,args:['--mute-audio']});
    resultat.navigateur=navigateur.version();
    for(const bundle of bundles)for(const profil of ['paysage','portrait','bureau']){
      const sortie=path.join(dossier,bundle.nom,profil);
      const url=`http://127.0.0.1:${serveur.address().port}/f${bundle.fichier}`;
      const banc=new Banc({...options(['--sans-cache']),url,sortie});banc.nav=navigateur;
      const res=new Resultat(meta);
      try{
        await mesurer(banc,res,{profil});
        // Tampon, journal et état finaux en plus des 2 × 30 valeurs par cible.
        for(const s of banc.sessions){
          const tampon=await s.tampon();
          const trace={etat:await s.etat(),journal:await s.journal(),erreurs:await s.bilanErreurs(),
            tampon:{W:tampon.W,H:tampon.H,PX:tampon.PX,sha256:SHA(tampon.buf)},profil:PROFILS[profil].viewport};
          fs.writeFileSync(path.join(sortie,'etat-journal.json'),JSON.stringify(trace,null,2)+'\n');
          await s.captureTampon('R-12-final');
        }
      }catch(e){res.erreur(e);}
      finally{for(const s of [...banc.sessions])await s.fermer();}
      const bilan=res.bilan();resultat.mesures.push({bundle:bundle.nom,profil,...bilan});sauver();
      console.log(bundle.nom,profil,bilan.statut,bilan.resume);
    }
    if(resultat.mesures.some(m=>m.statut!=='ok'))process.exitCode=1;
  }catch(e){resultat.environnement=String(e.stack||e);process.exitCode=1;}
  finally{if(navigateur)await navigateur.close();if(serveur.listening)await new Promise(r=>serveur.close(r));sauver();}
}

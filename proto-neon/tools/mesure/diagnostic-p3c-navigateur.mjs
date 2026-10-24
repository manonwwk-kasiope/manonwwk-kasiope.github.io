/* Hors bac uniquement : node tools/mesure/verifier.mjs --diagnostic-p3c [--rapide]
   Trois profils, un seul Chromium muet, onze critères séquentiels, reçus historiques préservés. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium, devices } from 'playwright';
import { investiguer } from './diagnostic-p3c-sondes.mjs';
import { Banc, ICI, PROTO, PROFILS, options, mesurerCritere, dateParis } from './commun.mjs';
if (!chromium || !devices['iPhone 13'] || Object.keys(PROFILS).length !== 3) throw new Error('Profils Playwright manquants');
const sortie = path.join(ICI, 'diagnostic', 'p3c-navigateur');
fs.mkdirSync(sortie, {recursive:true});
const types = {'.html':'text/html','.js':'text/javascript','.json':'application/json','.mp3':'audio/mpeg','.mp4':'video/mp4','.png':'image/png'};
const serveur = http.createServer((req,res) => {
  // Racine du dépôt pour conserver la comparaison autorisée avec ../snake2030/ de R-11.
  const racine = path.dirname(PROTO), rel = decodeURIComponent(new URL(req.url,'http://local').pathname);
  const fichier = path.resolve(racine,'.'+rel);
  if (!fichier.startsWith(racine+path.sep)) {res.writeHead(403);return res.end();}
  if (!fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) {res.writeHead(404);return res.end();}
  const taille = fs.statSync(fichier).size, r = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  const entetes = {'Content-Type':types[path.extname(fichier)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
  if (r) {
    const a = Number(r[1]), z = r[2] ? Number(r[2]) : taille-1;
    if(a>z || z>=taille){res.writeHead(416);return res.end();}
    res.writeHead(206,{...entetes,'Content-Length':z-a+1,'Content-Range':`bytes ${a}-${z}/${taille}`});
    return fs.createReadStream(fichier,{start:a,end:z}).pipe(res);
  }
  res.writeHead(200,{...entetes,'Content-Length':taille});fs.createReadStream(fichier).pipe(res);
});
const bilan = {dateParis:dateParis(), execute:true, criteres:[], profils:[], limite: "Chromium avec profils iPhone ; aucune qualification du moteur Safari ni du mode écran d’accueil. Les parties figées restent du ressort de codex-05b."};
let banc;
try {
  await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
  const o = {...options(process.argv.slice(2)), url:`http://127.0.0.1:${serveur.address().port}/proto-neon/index.html`, sortie, parallele:1, profils:['paysage','portrait','bureau']};
  banc = new Banc(o); await banc.demarrer();
  // Mesure des vrais états, pixels et journal sur les trois profils avant les critères.
  for(const profil of Object.keys(PROFILS)){
    const s=await banc.ouvrir(profil,{dt:1/60,graine:7});
    try {
      const scene=await s.scene('calme');
      const analyse=await s.analyse({masque:false}), journal=await s.journal(), erreurs=await s.bilanErreurs();
      const capture=await s.captureTampon('p3c-calme');
      bilan.profils.push({profil,scene,analyse,journal,erreurs,capture});
    } finally {await s.fermer();}
  }
  // D'abord les critères de sécurité, ensuite les investigations dans une page indépendante.
  for(const id of ['R-13','R-33','R-03','R-37','R-20','R-22','R-12','R-05','R-11','R-28','R-19']){
    const fichier=fs.readdirSync(path.join(ICI,'criteres')).find(n=>n.startsWith(id+'-'));
    const mod=await import(new URL('./criteres/'+fichier,import.meta.url));
    const r=await mesurerCritere(banc,mod);bilan.criteres.push(r);
    fs.writeFileSync(path.join(sortie,'rapport.json'),JSON.stringify(bilan,null,2)+'\n');
    console.log(r.id,r.statut,r.resume);
  }
  bilan.investigations=await investiguer(banc);
  // Portrait tactile : reprendre les critères de gestes, mêmes seuils, sans ouvrir un autre Chromium.
  for (const id of ['R-33','R-22']) {
    const fichier=fs.readdirSync(path.join(ICI,'criteres')).find(n=>n.startsWith(id+'-'));
    const mod=await import(new URL('./criteres/'+fichier,import.meta.url));
    const portrait=banc.enfant(), enfant=portrait.enfant;
    // mesurerCritere crée son propre enfant : appliquer le profil à cet enfant effectif.
    portrait.enfant=function(){const b=enfant.call(this),ouvrir=b.ouvrir.bind(b);
      b.ouvrir=(profil,opts)=>ouvrir(profil==='paysage'?'portrait':profil,opts);return b;};
    portrait.sortie=path.join(sortie,'portrait');fs.mkdirSync(path.join(portrait.sortie,'captures'),{recursive:true});
    const r=await mesurerCritere(portrait,mod);bilan.criteres.push({...r,profil:'portrait'});
    fs.writeFileSync(path.join(sortie,'rapport.json'),JSON.stringify(bilan,null,2)+'\n');
  }
  if(bilan.criteres.some(r=>r.statut!=='ok') || bilan.profils.some(p=>!p.erreurs.zero)) process.exitCode=1;
} catch(e) {bilan.environnement=String(e.stack||e);process.exitCode=1;}
finally {
  if(banc) await banc.fermer();
  await new Promise(ok=>serveur.close(ok));
  fs.writeFileSync(path.join(sortie,'rapport.json'),JSON.stringify(bilan,null,2)+'\n');
}

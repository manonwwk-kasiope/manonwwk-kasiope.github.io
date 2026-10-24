/* Hors bac uniquement. Depuis proto-neon :
   node tools/jury2/banc.mjs --serie etalonnage --valider-instrument --carte ../CHEMIN/structure.json
   node tools/jury2/banc.mjs --serie alpha --carte CHEMIN        (graines tirées et scellées au premier usage)
   Importer ce module ne démarre ni serveur ni navigateur. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { P, paris } from './protocole.mjs';
import { installer } from './sonde.mjs';
import { bilan, difficulte, sensibilite, repereCarte, quantile, alignerSources, carteAlignee } from './analyse.mjs';
import { tampon, planche, lireTampon } from './images.mjs';
import { construireTemoin } from './temoin.mjs';
import { conduireAventure } from './aventure.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');
const dormir=ms=>new Promise(r=>setTimeout(r,ms));
const safe=s=>{if(!/^[a-zA-Z0-9_-]+$/.test(s))throw Error('Identifiant invalide : '+s);return s;};
/* Séries de graines : étalonnage (liste écrite dans protocole.mjs, hors réglage) ; alpha et beta tirées au
   hasard au premier usage (crypto), scellées dans sceaux/<série>.json créé sans écrasement, disjointes entre
   elles et des graines de réglage. n > longueur de la liste de l'étalonnage : la liste est prolongée. */
export function resoudreSerie(nom,{dir=HERE,n=null,tirer=(min,max)=>crypto.randomInt(min,max+1)}={}) {
  const spec=P.series[nom];if(!spec)throw Error('Série inconnue : '+nom+' ('+Object.keys(P.series).join(', ')+')');
  if(Array.isArray(spec.graines)) {
    const g=spec.graines.slice(),k=n??g.length;while(g.length<k)g.push(g.at(-1)+1);
    return{nom,spec,graines:g.slice(0,k),sceau:null,scelle:false};
  }
  const fichier=path.join(dir,'sceaux',nom+'.json');
  if(fs.existsSync(fichier)) {
    const s=JSON.parse(fs.readFileSync(fichier,'utf8')),attendu=sha(Buffer.from(JSON.stringify({serie:s.serie,graines:s.graines,nonce:s.nonce})));
    if(attendu!==s.sceauSha256)throw Error('Sceau altéré : '+fichier);
    if(n!==null&&n!==s.graines.length)throw Error(`Série ${nom} déjà scellée avec ${s.graines.length} graines ; refus d'en retirer ${n} (une série scellée est lue telle quelle).`);
    return{nom,spec,graines:s.graines,sceau:s.sceauSha256,scelle:true,fichier};
  }
  const autres=Object.keys(P.series).filter(x=>x!==nom&&!Array.isArray(P.series[x].graines)),exclues=new Set();
  for(let g=P.grainesReglage.min;g<=P.grainesReglage.max;g++)exclues.add(g);
  for(const a of autres){const f=path.join(dir,'sceaux',a+'.json');if(fs.existsSync(f))for(const g of JSON.parse(fs.readFileSync(f,'utf8')).graines)exclues.add(g);}
  const k=n??spec.graines.n,graines=[];
  while(graines.length<k){const g=tirer(spec.graines.min,spec.graines.max);if(!exclues.has(g)&&!graines.includes(g))graines.push(g);}
  const nonce=crypto.randomBytes(16).toString('hex'),sceauSha256=sha(Buffer.from(JSON.stringify({serie:nom,graines,nonce})));
  fs.mkdirSync(path.dirname(fichier),{recursive:true});
  fs.writeFileSync(fichier,JSON.stringify({serie:nom,graines,nonce,sceauSha256,dateParis:paris(),note:'Série scellée : à ne pas lire ni committer avant la fin du jury ; jamais régénérée.'},null,2)+'\n',{flag:'wx'});
  return{nom,spec,graines,sceau:sceauSha256,scelle:true,fichier};
}
export function fichierStatique(root,req,res,bundle,actifs,out) {
  try {
    const u=new URL(req.url,'http://local'),p=decodeURIComponent(u.pathname);
    if(p==='/index.html'||p==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(bundle);return;}
    const file=path.resolve(root,'.'+p);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    const mime={'.mp4':'video/mp4','.mp3':'audio/mpeg','.png':'image/png','.json':'application/json','.html':'text/html'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    /* Les lecteurs MP3/MP4 font des Range : sans 206, le banc peut créer ses propres pannes. */
    if(!actifs.has(file)){
      const buf=fs.readFileSync(file);actifs.set(file,buf);
      const rel=path.relative(root,file);fs.mkdirSync(path.dirname(path.join(out,rel)),{recursive:true});fs.writeFileSync(path.join(out,rel),buf);
    }
    const contenu=actifs.get(file),size=contenu.length,m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    res.setHeader('Accept-Ranges','bytes');
    if(m){const start=+m[1],end=m[2]?Math.min(+m[2],size-1):size-1;
      if(start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
      res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});res.end(contenu.subarray(start,end+1));
    }else{res.setHeader('Content-Length',size);res.end(contenu);}
  }catch(e){res.writeHead(400);res.end(String(e.message));}
}
function outil(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',x=>{err+=x;if(err.length>20000)err=err.slice(-20000);});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(`${cmd} code ${code}: ${err}`)));});}
export async function audioPhysique(file) {
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',file],{encoding:'utf8'});
  if(probe.status!==0)throw Error('Audio illisible : '+file+' : '+probe.stderr);
  const recu=JSON.parse(probe.stdout);
  return new Promise((resolve,reject)=>{
    const p=spawn('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar','8000','-f','f32le','pipe:1'],{stdio:['ignore','pipe','pipe']});
    let n=0,somme=0,peak=0,reste=Buffer.alloc(0),stderr='';
    p.stdout.on('data',b=>{const x=Buffer.concat([reste,b]),m=x.length-x.length%4;
      for(let i=0;i<m;i+=4){const v=x.readFloatLE(i);if(!Number.isFinite(v)){reject(Error('PCM non fini'));p.kill();return;}n++;somme+=v*v;peak=Math.max(peak,Math.abs(v));}reste=x.subarray(m);
    });
    p.stderr.on('data',x=>stderr+=x);p.on('error',reject);p.on('exit',code=>code===0&&n?resolve({...recu,echantillons:n,rms:Math.sqrt(somme/n),peak,
      methode:'Décodage du fichier effectivement capté en PCM mono 8000 Hz ; métrique de sensibilité, pas mesure LUFS.'}):reject(Error('Décodage audio code '+code+':'+stderr)));
  });
}
function courbeAdapte(dir,data) {
  const serie=data.adapte;
  if(!data.final.adapteExiste){json(path.join(dir,'adapte.json'),{existe:false,raison:'N.adapte absent de cette build'});return;}
  const flatten=(o,p='',a={})=>{for(const [k,v]of Object.entries(o||{})){if(typeof v==='number'&&Number.isFinite(v))a[p+k]=v;else if(v&&typeof v==='object'&&!Array.isArray(v))flatten(v,p+k+'.',a);}return a;};
  const lignes=serie.map(s=>({w:s.w,vague:s.vague,...flatten(s.valeur)})),keys=[...new Set(lignes.flatMap(x=>Object.keys(x)))];
  fs.writeFileSync(path.join(dir,'adapte.csv'),keys.join(',')+'\n'+lignes.map(x=>keys.map(k=>x[k]??'').join(',')).join('\n')+'\n');
  json(path.join(dir,'adapte.json'),{existe:true,serie,limite:'Valeurs publiques, sans interprétation d’un coefficient dont le contrat est inconnu.'});
  const champs=keys.filter(k=>!['w','vague'].includes(k)),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const panneaux=champs.map((k,i)=>{const points=lignes.filter(x=>Number.isFinite(x[k])),v=points.map(x=>x[k]),min=Math.min(...v),max=Math.max(...v),dt=Math.max(1,data.duree);
    const pts=points.map(x=>`${60+x.w/dt*800},${i*160+130-(x[k]-min)/(max-min||1)*90}`).join(' ');
    return `<text x="20" y="${i*160+20}">${esc(k)} — min ${min}, max ${max}</text><path d="M60 ${i*160+35}V${i*160+130}H860" fill="none" stroke="black"/><polyline points="${pts}" fill="none" stroke="black"/><text x="60" y="${i*160+150}">0 → ${dt.toFixed(2)} secondes réelles ; échelle propre à chaque panneau</text>`;
  });
  fs.writeFileSync(path.join(dir,'adapte.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="920" height="${Math.max(160,champs.length*160)}" viewBox="0 0 920 ${Math.max(160,champs.length*160)}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" font-size="13">${panneaux.join('')||'<text x="20" y="30">Aucun état numérique public disponible ; voir adapte.json.</text>'}</g></svg>`);
}
function scenesMoments(data,carte) {
  const moments=[],vu=new Set();
  const add=(nom,f,preuve)=>{if(!vu.has(nom)){vu.add(nom);moments.push({nom,w:f.w,t:f.tempsJeu,etat:f.etat,preuve});}};
  if(data.frames.length)add('debut',data.frames[0],'première image mesurée');
  let prev=null;
  for(const f of data.frames) {
    if(f.vague===1&&['jeu','plongee'].includes(f.etat))add('premiere-vague',f,'vague 1 et état '+f.etat);
    if(f.etat==='vol')add('vol',f,'état vol');
    if(f.warp&&f.warp.phase!=='repos')add('warp',f,'N.warp.state().phase='+f.warp.phase);
    if(f.etat==='boss')add('cyclope',f,'état boss');
    if(['2975','espace','jeu-2975'].includes(f.aventure?.etape))add('espace',f,'étape aventure '+f.aventure.etape);
    if(f.etat==='fin')add('fin',f,'état fin');
    if(f.aventure?.enCours&&['1976','1982','1993','fin','retrouvailles','teaser'].includes(f.aventure.etape))add('aventure-'+f.aventure.etape,f,'étape aventure '+f.aventure.etape);
    const r=repereCarte(carte,f.sourceCarte),avant=prev&&repereCarte(carte,prev.sourceCarte);
    if(r&&avant&&r.id===avant.id&&r.t>=avant.t) {
      for(const d of r.drops)if(d.t>avant.t&&d.t<=r.t)add('drop',f,{morceau:r.id,tFichier:d.t,mesure:d.mesure});
      for(const b of r.breaks)if(b.t>avant.t&&b.t<=r.t)add('break',f,{morceau:r.id,tFichier:b.t,de:b.de,a:b.a});
    }
    prev=f;
  }
  return moments;
}
export { carteAlignee };
/* Revalidation ciblée : deux prises audio et les sondes temporelles du témoin.
   Le dossier reste réduit et ne peut jamais devenir une qualification pour le jury. */
export function optionsInstrumentSeul(opts) {
  return {...opts,instrumentSeul:true,profils:[],pilotes:[],sansAventures:true,sansPerformance:true};
}
async function medias(dir,data,cdpFrames,carte) {
  const out={clips:[],planches:[],manques:[],carte:carteAlignee(data.frames,carte)};
  json(path.join(dir,'carte-alignee.json'),out.carte);
  const I=data.images;
  json(path.join(dir,'tampons','index.json'),I);
  const charger=a=>a.map(i=>lireTampon(i,path.join(dir,i.fichier)));
  for(const m of data.moments) {
    const debut=Math.max(0,m.w-P.avant),fin=Math.min(data.duree,debut+P.clip),duree=fin-debut;
    const ff=cdpFrames.filter(f=>f.w>=debut&&f.w<=fin);
    const avant=cdpFrames.findLast(f=>f.w<debut);if(avant)ff.unshift({...avant,w:debut});
    if(!ff.length||duree<20||duree>40){out.manques.push({moment:m.nom,raison:'fenêtre vidéo hors 20–40 s ou sans image CDP',duree,images:ff.length});continue;}
    const gaps=ff.slice(1).map((f,i)=>({de:ff[i].w,a:f.w,sec:f.w-ff[i].w})).filter(g=>g.sec>P.maxTrouVideo&&data.frames.some(x=>x.w>g.de&&x.w<g.a&&x.changes>0));
    const gravesTrous=gaps.filter(g=>g.sec>P.maxTrouVideoTolere);
    const liste=path.join(dir,`${m.nom}.concat.txt`);
    let texte='';for(let i=0;i<ff.length;i++){
      const dureeImage=(i+1<ff.length?ff[i+1].w:fin)-ff[i].w;
      if(dureeImage>0)texte+=`file '${ff[i].fichier}'\nduration ${dureeImage.toFixed(6)}\n`;
    }texte+=`file '${ff.at(-1).fichier}'\n`;fs.writeFileSync(liste,texte);
    const video=`${m.nom}.mp4`;
    await outil('ffmpeg',['-y','-v','error','-safe','0','-f','concat','-i',liste,'-t',String(duree),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-pix_fmt','yuv420p','-fps_mode','vfr','-an',path.join(dir,video)]);
    const sonde=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',path.join(dir,video)],{encoding:'utf8'});
    const dureeEncodee=sonde.status===0?+JSON.parse(sonde.stdout).format.duration:null;
    const entree={moment:m.nom,video,debut,fin,dureeEncodee,instantMomentDansVideo:m.w-debut,
      trousAvecMouvement:gaps,sansTrou:!gaps.length,trousAuDelaDuSeuilTolere:gravesTrous.length,
      conforme:dureeEncodee>=20&&dureeEncodee<=40&&!gravesTrous.length,
      carte:out.carte.filter(x=>x.w>=debut&&x.w<=fin).map(x=>({...x,tVideo:x.w-debut})),
      audio:data.audio.map(a=>({...a,debutDansAudio:debut-a.w})),
      tempsAudio:data.frames.filter(f=>f.w>=debut&&f.w<=fin).filter((f,i,a)=>i===0||f.beat?.bar!==a[i-1].beat?.bar||f.beat?.beat!==a[i-1].beat?.beat).map(f=>({tVideo:f.w-debut,w:f.w,tempsJeu:f.tempsJeu,audioCtx:f.audioCtx,latence:f.latence,bpm:f.bpm,beat:f.beat,source:f.sourceCarte})),
      note:'Vidéo muette à cadence CDP variable. Les images immobiles sont tenues ; index CDP brut conservé.'};
    out.clips.push(entree);json(path.join(dir,`${m.nom}.alignement.json`),entree);
    const selection=I.filter(i=>i.w>=m.w-P.autourDrop&&i.w<=m.w+P.autourDrop);
    if(selection.length){const file=`planche-${m.nom}.png`,p=planche(charger(selection),path.join(dir,file));p.fichier=file;out.planches.push(p);json(path.join(dir,`planche-${m.nom}.json`),p);}
  }
  /* Tous les drops observés, pas seulement celui choisi pour la courte vidéo. */
  for(const [k,d]of out.carte.filter(x=>x.type==='drop').entries()) {
    const demandes=[];for(let t=d.w-P.autourDrop;t<=d.w+P.autourDrop+.001;t+=.5){
      const image=I.reduce((a,x)=>!a||Math.abs(x.w-t)<Math.abs(a.w-t)?x:a,null);
      demandes.push({demande:t,observe:image?.w??null,erreur:image?Math.abs(image.w-t):null,
        conforme:!!image&&Math.abs(image.w-t)<=P.tolerancePlanche,fichier:image?.fichier??null});
    }
    const selection=demandes.filter(x=>x.conforme).map(x=>I.find(i=>i.fichier===x.fichier));
    const file=`drop-${k+1}.png`,p=planche(charger(selection),path.join(dir,file));
    const recu={drop:d,echantillons:demandes,planche:p?{...p,fichier:file}:null,complet:demandes.every(x=>x.conforme)};
    json(path.join(dir,`drop-${k+1}.json`),recu);out.planches.push(recu);
  }
  return out;
}
function installerNV(data,piste) {
  for(const f of data.frames)if(!f.morceau&&f.blocAudio) {
    const it=f.blocAudio,b=piste.blocs[it.bloc];
    if(f.bpm!==piste.bpm){f.sourceNV=null;f.sourceNVAbsente='Tempo des blocs modifié : curseur de fichier public requis, pas de conversion supposée à vitesse 1.';continue;}
    if(b)f.sourceNV={id:'neon-velocity',t:piste.premiereMesure+b.temps[0]*piste.dureeMesure/4+(f.audioCtx-it.tCore+it.from)};
  }
}
/* Préparation sérialisée commune au navigateur et aux contrôles VM. */
export function preparerCas(cas) {
  const N=window.__N,S=window.__S;
  if(!cas.conserverProfil)localStorage.clear();S.jour=20261017;
  // Isoler durablement la musique, même après applyMute() et reset().
  if(cas.genre==='audio-probe')N.score.profil.reglages({effets:false,musique:true});
  if(S.reglages)S.reglages.actions=cas.pilote==='humain'?'auto':'doigts';
  N.intro.skip();N.game.reset(cas.graine,{depart:cas.genre==='aventure'?'titre':'plongee'});
  if(cas.genre!=='aventure'&&N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
  N.journal.actif(true);N.journal.vider();
  if(cas.genre==='performance'||cas.genre==='charge'){
    if(!N.game.dbg.scene(cas.scene))throw Error('Scène absente : '+cas.scene);
    N.game.dbg.god(true);N.pilote.lancer('bon');
  }else if(cas.genre==='sync-probe'){
    N.game.dbg.god(true);N.pilote.lancer('bon');
  }else if(cas.genre==='audio-probe'){
    N.game.dbg.god(true);N.pilote.lancer('inerte');
  }else if(cas.genre!=='aventure')N.pilote.lancer(cas.pilote);
}
async function run(browser,origin,opts,cas,carte,piste,context=null) {
  const dir=path.join(opts.out,`${cas.genre}-${cas.profil}-${cas.pilote}-${cas.graine}${cas.qui?'-'+cas.qui:''}${cas.genre==='sync-probe'?'-'+safe(cas.modeTemoin):''}`);
  fs.mkdirSync(path.join(dir,'tampons'),{recursive:true});fs.mkdirSync(path.join(dir,'cdp'),{recursive:true});
  const profils={paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900}}};
  const ctx=context||await browser.newContext({...profils[cas.profil],serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[],requetesEchouees=[],cdpFrames=[];let cdp,clock,acceptCDP=false,frameNo=0;
  const data={...cas,frames:[],evenements:[],images:[],adapte:[],journal:[],epoques:[],erreurs:errors,requetesEchouees,audio:[],raison:'borne',duree:0};
  const media=cas.media;
  await page.route('**/*',r=>{const u=r.request().url();return u.startsWith(origin+'/')||u.startsWith('data:')||u.startsWith('blob:')?r.continue():r.abort('blockedbyclient');});
  page.on('pageerror',e=>errors.push('page:'+e.stack));page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text());});
  page.on('requestfailed',r=>{const e={url:r.url(),cause:r.failure()?.errorText};requetesEchouees.push(e);
    /* Une requête annulée lors d'un changement de clip reste dans le reçu réseau.
       Une annulation n'est pas une exception JS ; page/console/__ERR restent stricts. */
    if(e.cause!=='net::ERR_ABORTED')errors.push('requête:'+e.url+':'+e.cause);
  });
  await page.exposeBinding('__juryAudio',(_,x)=>{fs.appendFileSync(path.join(dir,`audio-sortie-${x.id}.webm`),Buffer.from(x.data,'base64'));});
  await page.addInitScript(({graine,modeTemoin})=>{window.__SEED=graine;if(modeTemoin)window.__JURY_TEMOIN_MODE=modeTemoin;},cas);
  const drops=media&&carte?Object.fromEntries(Object.entries(carte.morceaux).map(([id,m])=>[id,m.drops.map(d=>d.t)])):null;
  await page.addInitScript(installer,{...P,media,pixels:!['performance','sync-probe'].includes(cas.genre),performance:cas.genre==='performance',denses:media?{...P.denses,drops}:null});
  async function drain() {
    const part=await page.evaluate(genre=>{
      const N=window.__N,x=window.__jury.vider(),J=N.journal;x.journalN=J.compte();x.journalTaille=J.taille();x.journal=J.dump({vider:true});
      if(genre==='aventure'){
        const nom=N.aventure.etape(),m=({'1976':N.terminal,'1982':N.arcade,'1993':N.grille,'2975':N.cosmos})[nom];
        x.epoque={w:window.__jury.horloge().w,nom,aventure:N.aventure.state(),etat:m?.state?.()||null};
      }return x;
    },cas.genre);
    for(const i of part.images){const fichier=`tampons/${String(i.w.toFixed(3)).padStart(9,'0')}.png`;
      const {rgb,buf,...recu}=tampon(i,path.join(dir,fichier));data.images.push({...recu,fichier});}
    for(const key of ['frames','evenements','adapte','journal'])data[key].push(...part[key]);
    if(part.epoque)data.epoques.push(part.epoque);
    errors.push(...part.erreurs);
    if(part.journalN>part.journalTaille)errors.push('Journal tronqué : '+part.journalN+' écritures pour '+part.journalTaille+' places');
    fs.appendFileSync(path.join(dir,'collecte.ndjson.gz'),zlib.gzipSync(JSON.stringify({...part,images:part.images.map(({buf,...i})=>i)})+'\n'));
  }
  try {
    await page.goto(origin+'/index.html?journal=1&auto=0',{waitUntil:'load'});
    await page.waitForFunction(()=>window.__N?.game&&window.__S&&window.__jury);
    await page.evaluate(preparerCas,cas);
    /* Le premier vrai geste déverrouille Web Audio. Hors aventure il ne change
       aucune direction : touche M interdite car elle couperait la musique. */
    await page.keyboard.press('Shift');
    await page.evaluate(async()=>{const N=window.__N;N.music.init();await N.music.context()?.resume();N.music.start();});
    if(media) {
      cdp=await ctx.newCDPSession(page);
      let premiere;const pret=new Promise(resolve=>{premiere=resolve;});
      cdp.on('Page.screencastFrame',f=>{
        const w=clock?f.metadata.timestamp-(clock.performanceTimeOrigin+clock.originePerformanceMs)/1000:null;
        try{if(acceptCDP){if(!Number.isFinite(f.metadata.timestamp))throw Error('Image CDP sans timestamp réel');const fichier=`cdp/${String(frameNo++).padStart(7,'0')}.jpg`;fs.writeFileSync(path.join(dir,fichier),Buffer.from(f.data,'base64'));cdpFrames.push({w,fichier,metadata:f.metadata});}}
        catch(e){errors.push('CDP-écriture:'+String(e));}
        void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(e=>errors.push('CDP-ack:'+String(e)));
        premiere();
      });
      acceptCDP=true;await cdp.send('Page.startScreencast',{format:'jpeg',quality:P.jpegQualite,everyNthFrame:P.screencastNth,maxWidth:profils[cas.profil].viewport.width,maxHeight:profils[cas.profil].viewport.height});
      let timer;try{await Promise.race([pret,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Aucune image CDP initiale')),10000);})]);}finally{clearTimeout(timer);}
    }
    clock=await page.evaluate(()=>window.__jury.commencer());data.regles=clock.regles;data.rythmeRegles=clock.rythmeRegles;data.origine=clock;
    for(const f of cdpFrames)f.w=f.metadata.timestamp-(clock.performanceTimeOrigin+clock.originePerformanceMs)/1000;
    if(cas.genre==='aventure') {
      await page.waitForFunction(()=>window.__jury.horloge().w>=.3);
      if(await page.evaluate(()=>window.__N.game.etat()==='titre'))await page.keyboard.press('Enter');
      await page.waitForFunction(()=>window.__N.choix.actif(),null,{timeout:10000});
      await page.waitForFunction(()=>window.__N.choix.state().t>=window.__N.choix.CFG.garde);
      const cible=await page.evaluate(qui=>{const N=window.__N,z=N.choix.state().zones[qui];return{x:(z.x+z.w/2)*N.gfx.PX,y:(z.y+z.h/2)*N.gfx.PX};},cas.qui);
      if(cas.profil==='bureau')await page.mouse.click(cible.x,cible.y);else await page.touchscreen.tap(cible.x,cible.y);
      await page.waitForFunction(qui=>window.__N.choix.personnage()===qui&&!window.__N.choix.actif(),cas.qui,{timeout:10000});
      await page.evaluate(()=>{window.__N.pilote.lancer('dieu');window.__N.game.dbg.god(true);});
      await page.evaluate(conduireAventure);
      data.interventions=['choix réel par toucher/clic','pilote dieu et god(true) pour visite des contenus ; exclu des statistiques de difficulté','conducteur des époques : chemins sur les états publics, écrit S.input seulement','aucun saut d’époque ou de film'];
    }
    if(cas.genre==='charge')await page.evaluate(()=>{let n=0;const timer=setInterval(()=>{
      const N=window.__N,e=N.ennemis.list.find(e=>e.etat!=='mort'&&!e.boss);
      if(!e||n>=30){clearInterval(timer);return;}n++;N.ennemis.hit(e,1e6,{genre:'arme',type:'canon',id:0});
    },66);});
    const t0=performance.now(),max=cas.max;
    let finW=null,dernierFrame=null,dernierMouvement=performance.now();
    while((performance.now()-t0)/1000<max) {
      await dormir(P.pollMs);await drain();
      if(opts.signal?.aborted)throw Error('Collecte interrompue par signal ; bruts partiels conservés');
      if(errors.length){data.raison='erreur navigateur';break;}
      const f=data.frames.at(-1);
      if(f?.f!==dernierFrame){dernierFrame=f?.f;dernierMouvement=performance.now();}
      if(performance.now()-dernierMouvement>10000){data.raison='aucune nouvelle image réelle depuis 10 s';break;}
      if(!f)continue;
      if(f.etat==='fin'&&finW===null)finW=f.w;
      if(finW!==null&&(!media||f.w-finW>=P.queueFin)){data.raison='fin';break;}
      const err=await page.evaluate(()=>window.__ERR.count);if(err){data.raison='erreur jeu';break;}
    }
    if(['performance','audio-probe','charge','sync-probe'].includes(cas.genre)&&data.raison==='borne')data.raison='fenêtre complète';
    const final=await page.evaluate(()=>window.__jury.finir());data.audio=final.audio;data.final=final.final;
    await drain();data.duree=data.frames.at(-1)?.w||0;
    if(cdp){await cdp.send('Page.stopScreencast');acceptCDP=false;}
    installerNV(data,piste);alignerSources(data.frames);data.moments=scenesMoments(data,carte);
    for(const c of carteAlignee(data.frames,carte))if(!data.moments.some(x=>x.nom===c.type)){
      const f=data.frames.find(f=>f.w>=c.w);if(f)data.moments.push({nom:c.type,w:c.w,t:f.tempsJeu,etat:f.etat,preuve:c});
    }
    json(path.join(dir,'cdp','index.json'),cdpFrames);
    const mesures=bilan(data);
    for(const a of data.audio)a.decoder=await audioPhysique(path.join(dir,a.fichier));
    mesures.audio.captureRms=data.audio.length?Math.sqrt(data.audio.reduce((s,a)=>s+a.decoder.rms**2,0)):null;
    mesures.audio.captures=data.audio;
    courbeAdapte(dir,data);
    if(cas.genre==='performance'){
      mesures.coutImage.condition='Fenêtre dédiée sans screencast, sans analyse de pixels, auto tube coupé ; rAF réel ; instrumentation après callback exclue.';
      mesures.R13={conforme:null,raison:'Pixels non analysés dans cette fenêtre de performance'};
      mesures.coutImage.conforme=data.duree>=P.performanceSec&&mesures.coutImage.n>0&&mesures.coutImage.p95Ms<=data.regles.R20.x1;
    }
    let mediaResult=null;if(media)mediaResult=await medias(dir,data,cdpFrames,carte);
    const resultat={...cas,dossier:path.basename(dir),mesures,moments:data.moments,
      manques:P.moments.filter(n=>!data.moments.some(m=>m.nom===n)),medias:mediaResult,
      aventureComplete:cas.genre==='aventure'?!!(data.final.profil?.[cas.qui]?.fini&&data.final.aventure?.joues?.includes('fin-'+cas.qui)):null,
      syncGeometrique:data.evenements.filter(e=>e.audioRunning&&Number.isFinite(e.ecartAudioMs)&&e.type==='apparition'&&e.preuve?.apresRendu).map(e=>e.ecartAudioMs)};
    json(path.join(dir,'mesures.json'),resultat);
    fs.writeFileSync(path.join(dir,'brut.json.gz'),zlib.gzipSync(JSON.stringify({...data,images:data.images.map(({buf,...x})=>x)})));
    fs.writeFileSync(path.join(dir,'fiche.md'),fiche(resultat,data));
    return resultat;
  }catch(e){json(path.join(dir,'echec.json'),{dateParis:paris(),cas,erreur:String(e.stack||e),errors});
    fs.writeFileSync(path.join(dir,'brut-partiel.json.gz'),zlib.gzipSync(JSON.stringify(data)));throw e;}
  finally{if(cdp)await cdp.detach().catch(()=>{});await page.close();if(!context)await ctx.close();}
}
function fiche(r,data) {
  return `# Séquence ${r.dossier}\n\n${paris()}\n\nBuild fournie au banc ; profil ${r.profil}, graine ${r.graine}, pilote ${r.pilote}, genre ${r.genre}.\n${(data.interventions||['Départ plongée par le crochet officiel ; aucun saut pendant la partie.']).join(' ; ')}.\n\nDurée réelle ${data.duree.toFixed(3)} s ; temps de jeu ${data.final.tempsJeu} s ; arrêt ${data.raison} ; état ${data.final.etat}.\n\n| Moment observé | Temps réel (s) | Temps jeu (s) | État | Preuve |\n|---|---:|---:|---|---|\n${r.moments.map(m=>`| ${m.nom} | ${m.w.toFixed(3)} | ${m.t} | ${m.etat} | ${JSON.stringify(m.preuve)} |`).join('\n')}\n\nAbsents de cette séquence : ${r.manques.join(', ')||'aucun'}.\n\nLes vidéos .mp4 sont muettes. Chaque fichier .alignement.json donne le début dans la sortie audio captée, les repères r1 et leur temps vidéo. Les fichiers audio-sortie sont le mix réellement calculé (musique et effets). Les MP3 musicaux sources sont exportés dans ../audio-sources avec leur empreinte ; leur carte ne vaut que pour le fichier réellement audible, pas pour un temps de piste inventé.\n\nLes planches contiennent les pixels exacts du tampon, sans mise à l’échelle ; l’ordre et les temps de leurs cases sont dans le JSON homonyme. Les séries drop-*.json demandent une image toutes les 0,5 s dans ±${P.autourDrop} s ; toute image absente ou trop éloignée est marquée.\n\nMesures : mesures.json ; séries image par image, événements horodatés, journal complet et difficulté adaptative : brut.json.gz. Cadence CDP brute : cdp/index.json.\n\nLimites : émulation Chrome tactile, pas Safari ni l’iPhone physique ; pilotes automatiques, pas jugement humain de la maniabilité. R-13 agrégé, pas certification WCAG. Les tirs sont horodatés lors de leur insertion réelle dans le tableau public des projectiles ; leurs positions et vitesses sont conservées. La résolution de currentTime de Web Audio et celle de la carte limitent la précision audio. Aucune note n’est attribuée ici.\n`;
}
function exporterAudio(out) {
  const dest=path.join(out,'audio-sources');fs.mkdirSync(dest,{recursive:true});const index=[];
  for(const sub of ['','morceaux','themes']) {
    const from=path.join(ROOT,'musique',sub);if(!fs.existsSync(from))continue;
    fs.mkdirSync(path.join(dest,sub),{recursive:true});
    for(const n of fs.readdirSync(from).filter(n=>/\.(mp3|json)$/.test(n))) {
      const buf=fs.readFileSync(path.join(from,n));fs.writeFileSync(path.join(dest,sub,n),buf);index.push({fichier:path.posix.join(sub,n),sha256:sha(buf),octets:buf.length});
    }
  }
  const originale=path.resolve(ROOT,'../snake2030/neonvelocity-2.mp3');
  if(fs.existsSync(originale)){const buf=fs.readFileSync(originale);fs.writeFileSync(path.join(dest,'neon-velocity-original.mp3'),buf);index.push({fichier:'neon-velocity-original.mp3',sha256:sha(buf),octets:buf.length,nature:'Référence de la carte r1 ; le jeu recombine les blocs nv-*.mp3, la prise audio-sortie reste la preuve de ce qui a sonné.'});}
  json(path.join(dest,'index.json'),index);
}
export async function produire(browser,opts) {
  const bundle=fs.readFileSync(opts.bundle),id=safe(opts.build||sha(bundle).slice(0,16));
  const serie=opts.serieResolue||resoudreSerie(opts.serie||'etalonnage',{n:opts.graines??null}),spec=serie.spec;
  const profils=opts.profils||spec.profils,pilotes=opts.pilotes||P.pilotes,graineListe=serie.graines;
  const aventures=opts.sansAventures?[]:(spec.aventures||[]).filter(a=>profils.includes(a.profil)&&(!opts.profilsAventure||opts.profilsAventure.includes(a.profil)));
  const perfProfils=(spec.performance||[]).filter(x=>profils.includes(x)),g0=graineListe[0];
  const nSerie=Array.isArray(spec.graines)?spec.graines.length:spec.graines.n;
  const reduit=!!opts.sansAventures||!!opts.sansPerformance||!!opts.profils||!!opts.pilotes||!!opts.profilsAventure||!!opts.max||graineListe.length<nSerie;
  const nom=`${serie.nom}-${id}`,out=path.join(HERE,'dossiers',nom);
  if(fs.existsSync(out))throw Error('Dossier déjà présent, refus d’écraser : '+out);
  fs.mkdirSync(out,{recursive:true});opts={...opts,out};
  const carte=opts.carte?JSON.parse(fs.readFileSync(opts.carte)):null,piste=JSON.parse(fs.readFileSync(path.join(ROOT,'musique','piste.json')));
  const files=['banc.mjs','analyse.mjs','sonde.mjs','images.mjs','protocole.mjs','aventure.mjs','temoin.mjs'];
  const manifest={dateParis:paris(),dossier:nom,build:id,serie:serie.nom,graineListe,sceauSha256:serie.sceau,spec,reduit,
    bundleSha256:sha(bundle),protocoleSha256:sha(Buffer.concat(files.map(f=>fs.readFileSync(path.join(HERE,f))))),
    navigateur:browser.version(),plateforme:'Chrome émulé ; Safari et iPhone physique à vérifier',
    protocole:P,graines:graineListe.length,carte:opts.carte?{sha256:sha(fs.readFileSync(opts.carte)),fichier:'structure-r1.json'}:null,
    cas:[],performance:[],complet:false};
  const save=()=>json(path.join(out,'manifeste.json'),manifest);
  fs.writeFileSync(path.join(out,'build.html'),bundle);if(carte)json(path.join(out,'structure-r1.json'),carte);
  for(const f of ['grille.md','consigne-jure.md'])fs.copyFileSync(path.join(HERE,f),path.join(out,f));
  exporterAudio(out);save();
  const actifs=new Map(),server=http.createServer((req,res)=>fichierStatique(ROOT,req,res,bundle,actifs,out));
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const origin=`http://127.0.0.1:${server.address().port}`;
    for(const profil of profils)for(const pilote of pilotes)for(const graine of graineListe) {
      const r=await run(browser,origin,opts,{genre:'partie',profil,pilote,graine,max:opts.max||P.maxPartie,media:graine===g0},carte,piste);
      manifest.cas.push(r);save();console.log(JSON.stringify({build:id,cas:r.dossier,tempsJeu:r.mesures.tempsJeu,fin:r.mesures.fin,zeroErreur:r.mesures.zeroErreur}));
    }
    /* Test physique de coupure musicale, effets coupés dans LES DEUX builds,
       uniquement dans cette fenêtre, pour que rmsOut mesure la musique seule. */
    manifest.cas.push(await run(browser,origin,opts,{genre:'audio-probe',profil:'paysage',pilote:'inerte',graine:g0,max:P.performanceSec,media:true},carte,piste));save();
    /* Sondes de synchronisation du bundle témoin : positif (apparitions calées) puis négatif (dégradé), mêmes graines. */
    if(opts.sondesSync)for(const modeTemoin of ['synchro','desync'])for(const graine of graineListe.slice(0,2))
      {manifest.cas.push(await run(browser,origin,opts,{genre:'sync-probe',profil:'paysage',pilote:'bon',graine,modeTemoin,max:P.probeSyncSec,media:false},carte,piste));save();}
    for(const {profil,qui} of aventures) {
      const options=profil==='bureau'?{viewport:{width:1440,height:900}}:{...devices[profil==='paysage'?'iPhone 13 landscape':'iPhone 13'],viewport:profil==='paysage'?{width:844,height:390}:{width:390,height:844}};
      const ctx=await browser.newContext({...options,serviceWorkers:'block'});
      try{for(const q of qui){manifest.cas.push(await run(browser,origin,opts,{genre:'aventure',profil,pilote:'dieu',graine:g0,qui:q,conserverProfil:q==='lui',media:true,max:P.maxAventure},carte,piste,ctx));save();}}finally{await ctx.close();}
    }
    if(!opts.sansPerformance)for(const profil of perfProfils)for(const scene of ['charge','v5','vol']) {
      const r=await run(browser,origin,opts,{genre:'performance',profil,pilote:'bon',graine:g0,scene,media:false,max:P.performanceSec},carte,piste);
      manifest.performance.push(r);save();
    }
    /* Stress R-13 distinct des parties naturelles. */
    if(!opts.sansPerformance)for(const profil of perfProfils){manifest.cas.push(await run(browser,origin,opts,{genre:'charge',profil,pilote:'bon',graine:g0,scene:'charge',media:false,max:P.chargeSec},carte,piste));save();}
    manifest.difficulte=difficulte(manifest.cas);
    manifest.actifs=[...actifs.entries()].map(([f,b])=>({fichier:path.relative(ROOT,f),octets:b.length,sha256:sha(b)}));
    manifest.manques=P.moments.filter(m=>!manifest.cas.some(c=>c.medias?.clips.some(x=>x.moment===m&&x.conforme)));
    manifest.collecteTerminee=true;
    /* « complet » est relatif à la série : toutes ses graines, tous ses profils, toutes ses aventures. */
    manifest.complet=!!carte&&!reduit&&manifest.manques.length===0&&manifest.cas.every(c=>c.mesures.zeroErreur&&
        (c.genre!=='partie'||c.mesures.fin)&&(c.genre!=='aventure'||c.aventureComplete)&&
        (!c.medias||(c.medias.clips.every(x=>x.conforme)&&c.medias.manques.length===0&&c.medias.planches.every(x=>x.complet!==false)&&c.mesures.audio.captures.length>0)));
    manifest.validationInstrument='À vérifier par la paire pointe/témoin ; aucun jury ne doit utiliser un dossier incomplet.';
    save();
    fs.writeFileSync(path.join(out,'fiche.md'),`# Dossier ${nom}\n\n${paris()}\n\nSHA-256 build : ${manifest.bundleSha256}.\nSérie ${serie.nom}${serie.scelle?' (scellée '+serie.sceau.slice(0,12)+')':''}, graines ${graineListe.join(', ')}. Navigateur ${manifest.navigateur}. Dossier complet : **${manifest.complet}**${reduit?' (essai réduit : jamais une qualification complète)':''}. Validation de l’instrument : ${manifest.validationInstrument}\n\n${manifest.cas.length} séquences ; ${manifest.performance.length} fenêtres de performance séparées. Carte r1 ${carte?'copiée et empreintée':'ABSENTE : drops et breaks non qualifiables'}. Moments absents : ${manifest.manques.join(', ')||'aucun'}.\n\n| Séquence | Durée jeu s | Fin | Zéro erreur |\n|---|---:|---|---|\n${manifest.cas.map(c=>`| [${c.dossier}](${c.dossier}/fiche.md) | ${c.mesures.tempsJeu} | ${c.mesures.fin} | ${c.mesures.zeroErreur} |`).join('\n')}\n\nCe dossier est BRUT : il porte l’identité de la build. Les jurés ne le reçoivent jamais ; ils reçoivent un paquet neutre monté par jure.mjs. Les dossiers aventure sont des visites au pilote dieu avec invulnérabilité principale, sans saut : ils montrent du contenu ; la difficulté se lit exclusivement dans les parties ordinaires. Les valeurs de difficulté, la courbe N.adapte et les journaux sont dans manifeste.json et les bruts. Les portes manquantes ou échouées restent publiées ; aucune note constructeur.\n`);
    return{out,manifest};
  }finally{await new Promise(r=>server.close(r));}
}
export async function main(args=process.argv.slice(2)) {
  if(args.includes('--help')){console.log(`node tools/jury2/banc.mjs [--serie etalonnage|alpha|beta] [--bundle index.html] [--build ID] [--carte structure.json] [--graines N] [--profils paysage,portrait] [--pilotes humain,bon] [--aventures-profils paysage] [--max 720] [--valider-instrument] [--instrument-seul] [--sans-aventures] [--sans-performance]
Exécution réelle hors bac seulement. Verrou Chef exclusif ; aucune requête externe.
--serie : liste de graines (étalonnage : 101… hors réglage ; alpha et beta : tirées et scellées au premier usage, jamais relues par l’orchestratrice).
--valider-instrument : bâtit le témoin sur src/ (le bundle doit être l’index.html de cette copie), rejoue la même série dessus, puis les sondes de synchronisation positive et dégradée.
--instrument-seul : avec --valider-instrument, collecte seulement les sondes audio et temporelles ; dossier réduit, jamais prêt pour jury.
Toute option qui réduit la série rend le dossier « réduit » : jamais une qualification complète.`);return;}
  const arg=(k,d)=>{const i=args.indexOf(k);if(i>=0&&!args[i+1])throw Error('Valeur manquante '+k);return i<0?d:args[i+1];};
  const liste=(k,permis)=>{const v=arg(k,null);if(v===null)return null;const l=v.split(',').filter(Boolean);for(const x of l)if(!permis.includes(x))throw Error(k+' : valeur inconnue '+x);return l;};
  const grainesArg=arg('--graines',null),maxArg=arg('--max',null);
  let opts={bundle:path.resolve(arg('--bundle',path.join(ROOT,'index.html'))),build:arg('--build',null),serie:arg('--serie','etalonnage'),
    carte:arg('--carte',fs.existsSync(path.join(ROOT,'musique/morceaux/structure.json'))?path.join(ROOT,'musique/morceaux/structure.json'):null),
    graines:grainesArg===null?null:Number(grainesArg),max:maxArg===null?null:Number(maxArg),
    profils:liste('--profils',P.profils),pilotes:liste('--pilotes',P.pilotes),profilsAventure:liste('--aventures-profils',P.profils),
    sansAventures:args.includes('--sans-aventures'),sansPerformance:args.includes('--sans-performance')};
  if(args.includes('--instrument-seul')){
    if(!args.includes('--valider-instrument'))throw Error('--instrument-seul exige --valider-instrument ; aucun navigateur lancé.');
    opts=optionsInstrumentSeul(opts);
  }
  if(opts.graines!==null&&(!Number.isInteger(opts.graines)||opts.graines<1)||opts.max!==null&&!(opts.max>0))throw Error('Bornes invalides');
  if(!P.series[opts.serie])throw Error('Série inconnue : '+opts.serie);
  if(!opts.carte)throw Error('Carte r1 absente : préciser --carte /chemin/structure.json ; aucun navigateur lancé.');
  const carte=JSON.parse(fs.readFileSync(opts.carte));
  if(!carte.morceaux||!Object.keys(carte.morceaux).length)throw Error('Carte r1 sans morceaux ; aucun navigateur lancé.');
  for(const [id,m]of Object.entries(carte.morceaux)){
    if(!Array.isArray(m.barres)||m.barres.length<2||m.barres.some((t,i)=>!Number.isFinite(t)||(i>0&&t<=m.barres[i-1])))throw Error('Barres r1 invalides pour '+id);
    if(!Array.isArray(m.drops)||!Array.isArray(m.breaks))throw Error('Drops/breaks r1 absents pour '+id);
  }
  for(const cmd of ['ffmpeg','ffprobe'])if(spawnSync(cmd,['-version'],{stdio:'ignore'}).status!==0)throw Error(cmd+' absent ; aucun navigateur lancé');
  if(args.includes('--valider-instrument')&&sha(fs.readFileSync(opts.bundle))!==sha(fs.readFileSync(path.join(ROOT,'index.html'))))
    throw Error('--valider-instrument : le témoin est bâti sur src/ de cette copie ; --bundle doit être son index.html (sinon le témoin ne serait pas celui de la pointe). Aucun navigateur lancé.');
  /* Les graines (et le sceau éventuel) sont fixées avant tout lancement : pointe et témoin partagent la même série. */
  const serie=resoudreSerie(opts.serie,{n:opts.graines});opts.serieResolue=serie;
  let lock=false,browser;const marque=path.join(P.verrou,'jury2.pid'),controller=new AbortController();
  const interrompre=()=>controller.abort();process.once('SIGINT',interrompre);process.once('SIGTERM',interrompre);opts.signal=controller.signal;
  try {
    /* mkdir atomique, format du verrou Chef existant. Aucun verrou ancien n'est supprimé. */
    try{fs.mkdirSync(P.verrou);lock=true;fs.writeFileSync(marque,String(process.pid)+'\n',{flag:'wx'});}catch(e){if(e.code==='EEXIST')throw Error('Chromium réservé par la cheffe : '+P.verrou+' ; relancer après libération.');throw e;}
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--autoplay-policy=no-user-gesture-required','--disable-background-networking']});
    const pointe=await produire(browser,opts);
    if(args.includes('--valider-instrument')) {
      const temoin=construireTemoin(),b=await produire(browser,{...opts,bundle:temoin.fichier,build:pointe.manifest.build+'-temoin',sondesSync:true});
      const validation=sensibilite(pointe.manifest,b.manifest,b.manifest);json(path.join(pointe.out,'validation-instrument.json'),validation);json(path.join(b.out,'validation-instrument.json'),validation);
      for(const d of [pointe,b]){
        d.manifest.validationInstrument=validation.valide?'validé par les deux sorties physiques (témoin positif / dégradé ; audio pointe / témoin)':'échec de sensibilité ; voir validation-instrument.json';
        d.manifest.pretPourJury=d.manifest.complet&&validation.valide;
        json(path.join(d.out,'manifeste.json'),d.manifest);
        fs.appendFileSync(path.join(d.out,'fiche.md'),`\nMis à jour à ${paris()} : instrument ${validation.valide?'validé':'non validé'} ; dossier prêt pour jury : **${d.manifest.pretPourJury}**. Voir validation-instrument.json (valeurs physiques et seuils figés).\n`);
      }
      if(!validation.valide)process.exitCode=1;
      console.log(JSON.stringify({validationInstrument:validation}));
    }
    if(!pointe.manifest.complet&&!opts.instrumentSeul)process.exitCode=1;
  }finally{process.off('SIGINT',interrompre);process.off('SIGTERM',interrompre);if(browser)await browser.close();if(lock&&fs.existsSync(marque)&&fs.readFileSync(marque,'utf8').trim()===String(process.pid)){fs.unlinkSync(marque);fs.rmdirSync(P.verrou);}}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

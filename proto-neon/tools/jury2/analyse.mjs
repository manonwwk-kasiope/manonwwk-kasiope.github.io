import { P } from './protocole.mjs';
export const quantile = (a, p) => a.length ? [...a].sort((x,y)=>x-y)[Math.min(a.length-1, Math.floor(a.length*p))] : null;
export const moyenne = a => a.length ? a.reduce((a,b)=>a+b,0)/a.length : null;
export const mediane = a => {if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),k=Math.floor(b.length/2);return b.length%2?b[k]:(b[k-1]+b[k])/2;};
export function flashs(images, aire) {
  const dernier = {}, fl = [];
  for (const x of images) {
    for (const [cle,opp] of [['up','dn'],['dn','up'],['rin','rout'],['rout','rin']]) {
      if (!(x[cle] > aire)) continue;
      if (dernier[opp] !== undefined) {
        if (fl.at(-1) !== x.w) fl.push(x.w);
        delete dernier[opp];
      } else dernier[cle] = x.w;
    }
  }
  let max = 0, a = null;
  for (let i=0,j=0;i<fl.length;i++) { while(fl[i]-fl[j]>=1)j++; if(i-j+1>max){max=i-j+1;a=fl[i];} }
  return { flashs: fl.length, maxParSeconde: max, a, instants: fl,
    limite: 'Transitions agrégées du tampon, sans preuve de recouvrement spatial. Pas une certification WCAG.' };
}
export function sync(evenements) {
  const categories = {};
  for(const type of ['apparition','tir-ennemi','vague']) {
    const all = evenements.filter(e=>e.type===type && (type!=='vague'||e.d?.evt==='entree'));
    const mes = all.filter(e=>Number.isFinite(e.ecartAudioMs) && e.audioRunning && !e.musiqueMuette && e.rmsMusique>0);
    const ok = mes.filter(e=>e.ecartAudioMs<=P.syncMs);
    categories[type] = { total:all.length, mesurables:mes.length, inconnus:all.length-mes.length,
      dans40ms:ok.length, part:mes.length?ok.length/mes.length:null,
      p50Ms:quantile(mes.map(e=>e.ecartAudioMs),.5), p95Ms:quantile(mes.map(e=>e.ecartAudioMs),.95),
      conforme:all.length>0 && mes.length===all.length && ok.length/all.length>=P.syncPart };
  }
  return categories;
}
export function bilan(d) {
  const f=d.frames, R=d.regles, J=d.journal;
  const R13=flashs(f,R.R13.aire), secouees=f.filter(x=>x.shake>0).length;
  const bannieres=J.filter(x=>x.type==='hudBanniereAdmise'&&!['alerte','panneau','boss','victoire'].includes(x.d?.etat));
  const rapprochees=bannieres.slice(1).filter((x,i)=>x.t-bannieres[i].t<R.R14.banniere);
  const couts=f.map(x=>x.coutMs).filter(Number.isFinite);
  const erreurs=d.erreurs||[];
  return { frames:f.length, dureeReelle:d.duree, tempsJeu:d.final?.tempsJeu,
    etatFinal:d.final?.etat, fin:d.final?.etat==='fin',
    issue:d.final?.etat!=='fin'?'censure':d.final?.bilanScore?.victoire===true?'victoire':d.final?.bilanScore?.victoire===false?'defaite':'inconnue',
    morts:J.filter(x=>x.type==='mort').map(x=>({t:x.t,...x.d})),
    synchronisation:sync(d.evenements),
    R13:{...R13,seuil:R.R13.flashsParSeconde, conforme:!!f.length&&R13.maxParSeconde<=R.R13.flashsParSeconde},
    R14:{secouees,part:f.length?secouees/f.length:null,seuil:R.R14.secouees,
      conforme:!!f.length&&secouees/f.length<=R.R14.secouees,
      bannieres:bannieres.length, rapprochees, bannieresMesurables:bannieres.length>0},
    coutImage:{p50Ms:quantile(couts,.5),p95Ms:quantile(couts,.95),n:couts.length,
      condition:'rAF réel ; coût du callback du jeu, instrumentation après callback exclue ; collecte vidéo peut perturber la cadence'},
    cadence:{p50Ms:quantile(f.map(x=>x.intervalleMs).filter(Number.isFinite),.5),
      p95Ms:quantile(f.map(x=>x.intervalleMs).filter(Number.isFinite),.95)},
    audio:{rmsMusique:moyenne(f.map(x=>x.rmsMusique).filter(Number.isFinite)),
      rmsSortie:moyenne(f.map(x=>x.rmsSortie).filter(Number.isFinite)),
      running:f.filter(x=>x.audioRunning).length, fichier:d.audio||null},
    palette:{horsPalette:f.reduce((a,x)=>a+x.horsPalette,0)},
    zeroErreur:d.final?.err?.count===0&&erreurs.length===0, err:d.final?.err, erreurs,
    adapte:{existe:d.final?.adapteExiste??null,serie:d.adapte}, raison:d.raison };
}
export function difficulte(cas) {
  return P.profils.flatMap(profil=>P.pilotes.map(pilote=>{
    const a=cas.filter(c=>c.profil===profil&&c.pilote===pilote&&c.genre==='partie');
    const finis=a.filter(c=>c.mesures.fin),defaites=finis.filter(c=>c.mesures.issue==='defaite'), med=mediane(defaites.map(c=>c.mesures.tempsJeu));
    const cyclope=a.filter(c=>c.moments.some(m=>m.nom==='cyclope')).length;
    return {profil,pilote,n:a.length,finis:finis.length,defaites:defaites.length,victoires:finis.filter(c=>c.mesures.issue==='victoire').length,medianeDefaite:med,
      atteignantCyclope:a.length?cyclope/a.length:null,
      conforme:a.length>=P.graines&&finis.length===a.length&&med>=P.difficulte.min&&med<=P.difficulte.max&&
        cyclope/a.length>=P.difficulte.cyclopeMin&&cyclope/a.length<=P.difficulte.cyclopeMax,
      limite:'Temps de jeu ; fins censurées conservées. Réduction de l’écart à difficulté fixe non mesurée ici.'};
  }));
}
export function sensibilite(a,b) {
  const r=(d)=>d.cas.filter(c=>c.genre==='partie');
  const A=r(a),B=r(b),pairs=A.map(x=>[x,B.find(y=>y.profil===x.profil&&y.pilote===x.pilote&&y.graine===x.graine)]).filter(x=>x[1]);
  const rms=d=>moyenne(d.cas.filter(c=>c.genre==='audio-probe').map(c=>c.mesures.audio.captureRms).filter(Number.isFinite));
  const stats=x=>{const v=x.flatMap(c=>Object.values(c.mesures.synchronisation));const n=v.reduce((a,c)=>a+c.mesurables,0);return{n,part:n?v.reduce((a,c)=>a+c.dans40ms,0)/n:null};};
  const aa=pairs.map(x=>x[0]),bb=pairs.map(x=>x[1]);
  const ra=rms(a), rb=rms(b), sa=stats(aa),sb=stats(bb);
  /* La musique du témoin est coupée : pour l'axe temporel utiliser les écarts
     géométriques à la grille audio en marche même quand le niveau est nul. */
  const geom=x=>{const E=x.flatMap(c=>c.syncGeometrique||[]);return {n:E.length,part:E.length?E.filter(v=>v<=P.syncMs).length/E.length:null};};
  const ga=geom(aa),gb=geom(bb),ratio=ra>0&&rb!==null?rb/ra:null;
  const perte=ga.part!==null&&gb.part!==null?ga.part-gb.part:null;
  const comparable=pairs.length===A.length&&pairs.length===B.length&&pairs.length>0&&a.protocoleSha256===b.protocoleSha256;
  return {dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),pairs:pairs.length,
    comparable,rmsPointe:ra,rmsTemoin:rb,ratioAudio:ratio,syncAudible:{pointe:sa,temoin:sb},
    syncGeometrique:{pointe:ga,temoin:gb},perteSync:perte,seuils:P.sensibilite,
    valide:comparable&&ratio!==null&&ratio<=P.sensibilite.ratioAudioMax&&perte!==null&&perte>=P.sensibilite.perteSyncMin&&ga.n>=P.sensibilite.evenementsMin&&gb.n>=P.sensibilite.evenementsMin,
    limite:'Deux axes physiques requis : RMS de sortie musicale (fenêtre audio-probe, effets coupés dans les deux builds) et phase des sorties réelles. Le RMS public music est avant la porte de mute : il ne prouve pas la coupure. Un patch ou un compteur d’appels ne valide jamais l’instrument.'};
}
export function repereCarte(carte,horloge) {
  if(!carte||!horloge?.id||!Number.isFinite(horloge.t))return null;
  const m=carte.morceaux?.[horloge.id]; if(!m)return null;
  const i=m.barres.findLastIndex(t=>t<=horloge.t);
  return {id:horloge.id,t:horloge.t,mesure:i+1,
    drops:m.drops||[],breaks:(m.breaks||[]).map(x=>({...x,t:m.barres[x.de-1],fin:m.barres[x.a]??null}))};
}
/* Relie le temps de fichier au temps réellement audible. L'interpolation suit
   le curseur observé : elle accepte donc les variations de tempo et les boucles. */
export function alignerSources(frames) {
  let j=0;
  for(const f of frames) {
    const cible=f.w-(f.latence||0);while(j+1<frames.length&&frames[j+1].w<=cible)j++;
    const a=frames[j],b=frames[j+1],A=a.morceau||a.sourceNV,B=b&&(b.morceau||b.sourceNV);
    f.sourceCarte=null;
    if(A&&B&&A.id===B.id&&B.t>=A.t&&cible>=a.w&&cible<=b.w&&b.w-a.w<=P.maxTrouVideo){
      f.sourceCarte={id:A.id,t:A.t+(B.t-A.t)*(cible-a.w)/(b.w-a.w||1),
        encadrement:[a.w,b.w],latenceRetiree:f.latence||0};
    }
  }
  return frames;
}

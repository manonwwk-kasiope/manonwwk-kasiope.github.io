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
/* Intervalle de Wilson à 95 % : une fenêtre de 30 points de large ne se tranche pas à n = 10
   (demi-largeur ± 25 points, autotest.md F3). */
export function wilson(k, n, z = 1.96) {
  if (!n) return null;
  const p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return { part: p, bas: Math.max(0, c - h), haut: Math.min(1, c + h), demiLargeur: h };
}
/* Médiane de survie de Kaplan–Meier ; un jeu terminé par une victoire ou une borne est censuré à son temps
   (au plus censure s). null si la survie ne descend jamais à 0,5 : la médiane est alors « au-delà de la censure ». */
export function kaplanMeierMediane(obs, censure = 540) {
  const a = obs.map(o => ({ t: Math.min(o.t, censure), mort: !!o.mort && o.t <= censure })).sort((x, y) => x.t - y.t || (y.mort - x.mort));
  let aRisque = a.length, S = 1;
  for (let i = 0; i < a.length;) {
    const t = a[i].t; let d = 0, c = 0;
    while (i < a.length && a[i].t === t) { if (a[i].mort) d++; else c++; i++; }
    if (d) { S *= 1 - d / aRisque; if (S <= 0.5) return t; }
    aRisque -= d + c;
  }
  return null;
}
export function difficulte(cas) {
  return P.profils.flatMap(profil=>P.pilotes.map(pilote=>{
    const a=cas.filter(c=>c.profil===profil&&c.pilote===pilote&&c.genre==='partie');
    const finis=a.filter(c=>c.mesures.fin),defaites=finis.filter(c=>c.mesures.issue==='defaite'), med=mediane(defaites.map(c=>c.mesures.tempsJeu));
    const cyclope=a.filter(c=>c.moments.some(m=>m.nom==='cyclope')).length, n=a.length, D=P.difficulte;
    const dansFenetre=n>0&&finis.length===n&&med!==null&&med>=D.min&&med<=D.max&&cyclope/n>=D.cyclopeMin&&cyclope/n<=D.cyclopeMax;
    const ic=wilson(cyclope,n), concluant=n>=D.nMin;
    const km=kaplanMeierMediane(a.map(c=>({t:c.mesures.tempsJeu??0,mort:c.mesures.issue==='defaite'})));
    return {profil,pilote,n,finis:finis.length,defaites:defaites.length,victoires:finis.filter(c=>c.mesures.issue==='victoire').length,medianeDefaite:med,
      medianeSurvieKM:km,atteignantCyclope:n?cyclope/n:null,cyclopeIC95:ic,
      /* conforme n'est affirmé qu'avec assez de parties : avant, la fenêtre reste indicative. */
      conforme:concluant?dansFenetre:null,dansFenetreIndicatif:dansFenetre,
      statut:concluant?(dansFenetre?'conforme':'non conforme'):`indéterminé : n = ${n} < ${D.nMin}${ic?` (part CYCLOPE ${(100*ic.part).toFixed(0)} %, demi-largeur de Wilson ± ${(100*ic.demiLargeur).toFixed(0)} points)`:''}`,
      limite:'Temps de jeu ; fins censurées conservées ; médiane de survie de Kaplan–Meier censurée à 540 s. Réduction de l’écart à difficulté fixe non mesurée ici ; la porte 5 se tranche sur les séries de parties simulées (n = 100).'};
  }));
}
/* sensibilite(pointe, temoin, controle) : deux axes physiques indépendants.
   Audio : RMS du fichier capté dans la fenêtre audio-probe (effets coupés dans les deux builds).
   Temps : écart des apparitions réellement présentes à la grille audio, mesuré dans les fenêtres sync-probe
   du bundle témoin (« controle » : manifeste du témoin, qui porte les deux modes) : mode synchro (positif connu)
   contre mode desync (négatif connu). La pointe n'intervient pas : une version dont les apparitions ne sont pas
   calées ne doit pas faire échouer la validation de l'instrument. Sans « controle » (anciens dossiers),
   repli sur l'ancienne comparaison pointe / témoin par partie. */
export function sensibilite(a,b,controle=null) {
  const r=(d)=>d.cas.filter(c=>c.genre==='partie');
  const A=r(a),B=r(b),pairs=A.map(x=>[x,B.find(y=>y.profil===x.profil&&y.pilote===x.pilote&&y.graine===x.graine)]).filter(x=>x[1]);
  const rms=d=>moyenne(d.cas.filter(c=>c.genre==='audio-probe').map(c=>c.mesures.audio.captureRms).filter(Number.isFinite));
  const stats=x=>{const v=x.flatMap(c=>Object.values(c.mesures.synchronisation));const n=v.reduce((a,c)=>a+c.mesurables,0);return{n,part:n?v.reduce((a,c)=>a+c.dans40ms,0)/n:null};};
  const aa=pairs.map(x=>x[0]),bb=pairs.map(x=>x[1]);
  const ra=rms(a), rb=rms(b), sa=stats(aa),sb=stats(bb);
  const geom=x=>{const E=x.flatMap(c=>c.syncGeometrique||[]);return {n:E.length,part:E.length?E.filter(v=>v<=P.syncMs).length/E.length:null};};
  const ratio=ra>0&&rb!==null?rb/ra:null;
  let ga,gb,comparable,positif=null;
  if(controle) {
    const pos=controle.cas.filter(c=>c.genre==='sync-probe'&&c.modeTemoin==='synchro'),neg=controle.cas.filter(c=>c.genre==='sync-probe'&&c.modeTemoin==='desync');
    ga=geom(pos);gb=geom(neg);
    const cle=c=>c.profil+'|'+c.graine;
    comparable=pos.length>0&&pos.length===neg.length&&pos.every(c=>neg.some(d=>cle(d)===cle(c)))&&a.protocoleSha256===b.protocoleSha256;
    positif={part:ga.part,seuilMin:P.sensibilite.positifPartMin,pointeDesynchronisee:geom(aa),note:'La pointe est donnée pour information : l’axe temporel compare le témoin positif et le témoin dégradé.'};
  } else {
    ga=geom(aa);gb=geom(bb);
    comparable=pairs.length===A.length&&pairs.length===B.length&&pairs.length>0&&a.protocoleSha256===b.protocoleSha256;
  }
  const perte=ga.part!==null&&gb.part!==null?ga.part-gb.part:null;
  const positifVu=controle?(ga.part!==null&&ga.part>=P.sensibilite.positifPartMin):true;
  return {dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),pairs:pairs.length,protocoleSha256:a.protocoleSha256??null,
    comparable,rmsPointe:ra,rmsTemoin:rb,ratioAudio:ratio,syncAudible:{pointe:sa,temoin:sb},
    syncGeometrique:{[controle?'positif':'pointe']:ga,[controle?'degrade':'temoin']:gb},perteSync:perte,positif,seuils:P.sensibilite,
    valide:comparable&&ratio!==null&&ratio<=P.sensibilite.ratioAudioMax&&perte!==null&&perte>=P.sensibilite.perteSyncMin&&positifVu&&ga.n>=P.sensibilite.evenementsMin&&gb.n>=P.sensibilite.evenementsMin,
    limite:'Deux axes physiques requis : RMS de sortie musicale (fenêtre audio-probe, effets coupés dans les deux builds) et phase des sorties réelles (apparitions présentes, témoin positif contre témoin dégradé). Le RMS public music est avant la porte de mute : il ne prouve pas la coupure. Un patch ou un compteur d’appels ne valide jamais l’instrument.'};
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
/* Carte r1 associée à chaque image, jamais avancée depuis le début de la partie.
   Les blocs NV demandent le trackState public du moteur : voir sonde. */
export function carteAlignee(frames,carte) {
  let prev=null;const crossings=[];
  for(const f of frames) {
    const r=repereCarte(carte,f.sourceCarte);
    if(r&&prev&&r.id===prev.r.id&&r.t>=prev.r.t) {
      for(const [type,items]of [['drop',r.drops],['break',r.breaks]])for(const d of items) {
        if(d.t>prev.r.t&&d.t<=r.t) {
          const alpha=(d.t-prev.r.t)/(r.t-prev.r.t||1);
          crossings.push({type,id:r.id,tFichier:d.t,w:prev.w+(f.w-prev.w)*alpha,
            encadrement:[prev.w,f.w],incertitudeSec:f.w-prev.w,repere:d});
        }
      }
    }
    prev=r?{r,w:f.w}:null;
  }
  return crossings;
}

/* Juge-code d'observabilité, pas un juré esthétique ni une note de qualité.
   Seul argument : racine d'un paquet public ; aucune importation du monteur,
   de l'oracle, du témoin ou de l'étalonnage. Pas de clé, pas de chemin de brut.
   Scores 0..10 = fractions de sorties observées satisfaisant l'axe annoncé.
   Un axe absent rend null, jamais une bonne note par défaut. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { P, REGARDS } from './protocole.mjs';
export function discriminant(racine,{passe=1,lire=fs.readFileSync}={}) {
  if(![1,2].includes(passe))throw Error('Passe inconnue');
  const root=fs.realpathSync(racine),lectures=[];
  function json(rel){
    if(path.isAbsolute(rel)||rel.split(/[\\/]/).some(x=>x==='..'))throw Error('Chemin hors paquet');
    const f=fs.realpathSync(path.join(root,rel));
    if(!f.startsWith(root+path.sep))throw Error('Lien hors paquet');
    if(passe===1&&rel.startsWith('annexe/'))throw Error('Annexe interdite en passe 1');
    lectures.push(rel);return JSON.parse(lire(f,'utf8'));
  }
  const paquet=json('paquet.json');
  const autorises=new Set(Object.values(paquet.parRegard).flat());
  const fichiers=paquet.fichiers.filter(f=>f.categorie==='observations'&&autorises.has(f.chemin));
  const obs=fichiers.map(f=>({fichier:f.chemin,o:json(f.chemin)}));
  const resultats=Object.fromEntries(REGARDS.map(r=>[r,{score:null,statut:'non mesurable',preuves:[],limite:'Aucun lien causal établi entre ces sabotages et la lisibilité, l’ergonomie ou la composition. Ne pas convertir une densité en défaut visuel.'}]));
  let total=0,mesurables=0,ok=0,muettes=0,connus=0;
  for(const {o}of obs){
    for(const e of o.evenements||[]){
      total++;connus+=typeof e.musiqueMuette==='boolean';muettes+=e.musiqueMuette===true;
      const mes=Number.isFinite(e.ecartAudioMs)&&e.audioRunning===true&&e.musiqueMuette===false&&e.rmsMusique>0;
      if(mes){mesurables++;ok+=Math.abs(e.ecartAudioMs)<=P.syncMs;}
    }
  }
  // Les inconnus restent au dénominateur. Une porte explicitement muette n'est pas
  // « non mesurable donc bonne » : la liaison audible est absente.
  if(total>0&&connus>0){resultats['rythme et musique']={score:10*ok/total,statut:'mesuré',axe:'fraction des sorties reliées à une grille musicale non muette, à ± '+P.syncMs+' ms',
    total,mesurables,inconnus:total-mesurables,dans40ms:ok,evenementsMuets:muettes,
    preuves:obs.map(x=>({fichier:x.fichier,champ:'/evenements'})),limite:'Indice physique de liaison ; aucun jugement du timbre, du plaisir ni de la qualité globale.'};}
  else resultats['rythme et musique'].limite='Porte musicale et grille N.R absentes des pièces de passe 1 : le silence ne peut pas être distingué d’une inconnue.';
  if(passe===2){
    // Autorisé uniquement après la note 1. L'annexe doit republier les réservations
    // et leurs sorties, pas une assertion du patch ni les durées de survie.
    const a=json('annexe/annexe.json');let demandes=0,objets=0,disponibles=0;const parType={};
    const preuves=[];
    for(const [id,s]of Object.entries(a.sequences||{})){
      const r=s.observations?.reservations;if(!r?.disponibles)continue;
      disponibles++;demandes+=r.demandesAvecSortie;objets+=r.objetsApparusApresRendu;
      for(const d of r.details||[]){const n=d.objets.filter(o=>o.apparition?.apresRendu).length;if(!n)continue;
        const t=parType[d.type]??={demandes:0,objets:0};t.demandes++;t.objets+=n;}
      preuves.push({fichier:'annexe/annexe.json',champ:`/sequences/${id}/observations/reservations`});
    }
    resultats['game design']=objets>0?{score:Object.keys(parType).length?Math.min(...Object.values(parType).map(t=>10*t.demandes/t.objets)):null,statut:'mesuré',axe:'une sortie apparue après rendu par réservation publique, classe la plus altérée (toutes les classes publiées)',demandes,objets,parType,disponibles,preuves,
      limite:'Indice de densité ajoutée ; ne prouve ni difficulté excessive ni mort injuste. Comparaison avant/après nécessaire.'}:
      {score:null,statut:'non mesurable',preuves:[],limite:'Doublons non attribuables : les bruts ne contiennent pas les réservations et identifiants des objets réellement apparus.'};
  }else resultats['game design']={score:null,statut:'passe 2 requise',preuves:[],limite:'Réservations et sorties à lire dans l’annexe après la passe 1.'};
  return {version:1,passe,resultats,lectures,limite:'Test discriminant des preuves, distinct de la qualification des jurés et du jeu.'};
}
export function comparer(a,b){return Object.fromEntries(REGARDS.map(r=>{const x=a.resultats[r].score,y=b.resultats[r].score;return[r,{avant:x,temoin:y,ecart:x===null||y===null?null:x-y,
  conforme:x===null||y===null?null:x-y>=P.jury.ecartTemoinMin&&y<P.jury.temoinMax}];}));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),passe=args.includes('--passe2')?2:1;
  if(!args[0])throw Error('node tools/jury2/discriminant.mjs CHEMIN_PAQUET [--passe2]');
  console.log(JSON.stringify(discriminant(args[0],{passe}),null,2));
}

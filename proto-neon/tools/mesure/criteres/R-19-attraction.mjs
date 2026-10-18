/* R-19 : état réel et pixels réellement peints ; aucun compteur d'appels de texte.
   Le départ explicite titre ferme l'ouverture et vide les entrées du geste d'accès. */
import { executer, principal, seuils, exiger } from '../commun.mjs';
export const meta = { id: 'R-19', titre: 'Attraction (P3)', seuil: 'démo après 15 s d’inaction, galerie, records, invitation', bloquant: false, exclusif: true };

export function observerAttraction(N, S) {
  const m=S.ecran && S.ecran.retour && S.ecran.retour.nom==='attraction' ? S.ecran.retour : null, g=N.gfx, b=g.buf();
  const lignes=(m && m.lignes || []).map(l=>{
    let pixels=0;
    for(let y=Math.max(0,l.y);y<Math.min(g.H,l.y+l.h);y++)for(let x=Math.max(0,l.x);x<Math.min(g.W,l.x+l.w);x++)if(b[y*g.W+x]===l.encre)pixels++;
    return {texte:l.texte,pixels,dansZone:l.x>=0&&l.y>=0&&l.x+l.w<=g.W&&l.y+l.h<=g.H};
  });
  return {etat:N.game.etat(),volet:m && m.volet,lignes,err:window.__ERR.count};
}

export async function mesurer(banc, res, maintenant = Date.now) {
  const s=await banc.ouvrir('paysage',{}),{s:S}=await seuils(s,'R19');
  if(!await exiger(s,res,'titre',['N.game.reset','N.game.etat','N.game.dbg.input']))return;
  const depart=await s.eval(()=>{
    const N=window.__N,S=window.__S;
    N.pilote?.arreter();N.game.reset(N.R.ecrans.attraction.graine,{depart:'titre'});N.entree?.annuler();S.input.any=false;
    return {etat:N.game.etat(),phase:S.phase};
  });
  if(depart.etat!=='titre'||depart.phase==='intro')return res.nonMesurable('titre','départ titre effectif absent : '+JSON.stringify(depart));
  const t0=maintenant();
  const vu=await s.attendre(()=>window.__N.game.etat()==='attraction',null,(S.attente+10)*1000);
  const d=vu?(maintenant()-t0)/1000:null;
  res.verifie('attraction après '+S.attente+' s d’inaction',d,S.attente+' ± 1 s',d!==null&&Math.abs(d-S.attente)<=1,{raison:vu?'état attraction observé':'jamais atteinte en '+(S.attente+10)+' s'});
  if(!vu)return;
  const observations=[];
  for(let i=0;i<72;i++){
    observations.push(await s.eval('('+observerAttraction.toString()+')(window.__N,window.__S)'));
    await s.page.waitForTimeout(500);
  }
  const visible=t=>observations.some(o=>o.lignes.some(l=>t.test(l.texte)&&l.pixels>0&&l.dansZone));
  res.capture(await s.capture('R-19-attraction'));
  res.verifie('bandeau DÉMO peint',visible(/DÉMO/),'présent',visible(/DÉMO/));
  res.verifie('galerie peinte',visible(/GALERIE/) && visible(/SENTINELLE/),'vue',visible(/GALERIE/) && visible(/SENTINELLE/));
  res.verifie('tableau des records peint',visible(/RECORDS/),'vu',visible(/RECORDS/));
  res.verifie('invitation peinte',visible(/TOUCHE/),'vue',visible(/TOUCHE/));
  res.verifie('zéro erreur',Math.max(...observations.map(o=>o.err)),0,observations.every(o=>o.err===0));
  await s.eval(()=>{window.__N.game.dbg.input({any:true});});
  const sorti=await s.attendre(()=>window.__N.game.etat()==='titre',null,1000);
  res.verifie('premier geste rend le titre',sorti,true,sorti);
  res.note('volets observés sur leurs pixels : '+[...new Set(observations.map(o=>o.volet))].join(', '));
}
if(principal(import.meta.url))executer({meta,mesurer});

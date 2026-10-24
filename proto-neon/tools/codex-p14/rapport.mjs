import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ICI, ROOT, hash, sources, dateParis, sauver } from './vm.mjs';
import { bilan } from './mesurer.mjs';
const lire = n => JSON.parse(fs.readFileSync(path.join(ICI,n+'.json')));
const donnees = n => lire(n).recus.map(f=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,'recus',f)))));
const avant = donnees('avant'), final = donnees('final'), variantes = ['passe1','passe2','passe3','passe4'].map(donnees);
if (avant.length!==40 || final.length!==40 || variantes.some(v=>v.length!==40)) throw Error('Série incomplète');
const A=bilan(avant), F=bilan(final), V=variantes.map(bilan), calibration=lire('validation-vm'), controle=lire('controle-source'), regression=lire('regression'), bon=lire('bon');
const f = x => x === null ? 'à vérifier' : x.toFixed(2).replace('.',','), pct=x=>x===null?'à vérifier':f(x*100)+' %';
const ratio=t=>`${t.ok}/${t.n} (${pct(t.reussite)})`;
const rows=[];
for(const p of ['humain','expert']) for(const t of ['8-20','21-29','30-40'])rows.push(`| ${p} | ${t} | ${ratio(A[p].tranches[t])} | ${ratio(F[p].tranches[t])} |`);
const vr = V.map((v,i)=>`| ${i+1} | ${ratio(v.humain.tranches['8-20'])} | ${ratio(v.humain.tranches['30-40'])} | ${f(v.expert.lassosMediane)} | ${f(v.expert.apogeesMediane)} |`);
const cr = ['avant','apres'].map(n=>({n,cas:lire('cas-'+n).cas}));
const gr = ['avant','apres'].map(n=>({n,cas:lire('gestes-'+n).cas}));
const gest=[];
for(const p of ['humain','expert'])for(const L of [8,20,40])for(const mobile of [false,true]){
  const vals=gr.map(g=>{const c=g.cas.filter(r=>r.pilote===p&&r.longueur===L&&r.mobile===mobile);return `${c.filter(r=>r.pvApres<r.pvAvant&&r.lassos.length).length}/${c.length}`;});
  gest.push(`| ${p} | ${L} | ${mobile?'mobile':'fixe'} | ${vals.join(' | ')} |`);
}
const signatures=r=>hash([r.raison,r.tempsJeu,r.tempsCombat,r.tempsSimule,r.pas,r.vague,r.score,r.journal]);
const identiques=final.filter(r=>signatures(r)===signatures(variantes[1].find(x=>x.pilote===r.pilote&&x.graine===r.graine))).length;
const casPrincipaux=[avant,...variantes,final].flat(), tousFin=casPrincipaux.filter(r=>r.etat==='fin').length, erreurs=casPrincipaux.reduce((s,r)=>s+r.err+r.erreursConsole.length,0);
const official = jeux => {let n=0,ok=0;for(const r of jeux.filter(r=>r.pilote==='humain'))for(let i=0;i<r.journal.length;i++){const e=r.journal[i];if(e.type!=='pilote'||e.d.evt!=='lassoTente'||e.d.longueur>20)continue;n++;for(let j=i+1;j<r.journal.length;j++){const y=r.journal[j];if(y.type==='lasso'){ok++;break;}if(y.type==='pilote'&&y.d.evt==='lassoFin')break;}}return {n,ok,reussite:n?ok/n:null};};
const date = dateParis();
const seuils={humainCourt:F.humain.tranches['8-20'].reussite>=0.5,humainLong:F.humain.tranches['30-40'].reussite>=0.4,expertLassos:F.expert.lassosMediane>=10,expertApogees:F.expert.apogeesMediane>=2};
sauver('synthese.json',{dateParis:date,source:hash(sources()),bundle:hash(fs.readFileSync(path.join(ROOT,'index.html'),'utf8')),avant:A,apres:F,variantes:V,seuils,finalIdentiqueCandidate2:identiques,partiesPrincipales:casPrincipaux.length,tousFin,erreurs,courtOfficiel:{avant:official(avant),apres:official(final)}});
const texte=`Commande hors bac : \`cd proto-neon && node tools/codex-p14/verifier.mjs\` (ne pas lancer dans cette sandbox).

# codex-p14 — LASSO et APOGÉE

${date} (Paris), mis à jour à ${date}.

**Lot arrêté au budget de quatre variantes ; R-34 non validé, cible LASSO expert non atteinte.** Candidate 2 retenue : amélioration réelle de l'usage en partie ; les retours sur traînée des variantes 3/4 font moins bien sur les longs LASSO humains et la médiane de l'expert. Aucun seuil d'acceptation abaissé. Le chantier global n'est pas annoncé achevé. La VM valide la logique ; navigateur, pixels et Safari restent à vérifier hors bac.

## Livré

\`src/85-pilote.js\` : humain/bon/expert choisissent une boucle latérale traçable, gardent son centre fixe, dimensionnent son rayon entre corps et traînée, anticipent leur délai de réaction et achèvent le geste même si sa cible initiale meurt. La prédiction de morsure tient compte du déplacement du corps vers la queue. TRAVERSÉE est demandée par une impulsion du second doigt face au danger ; l'APOGÉE pleine est utilisée avec des cibles accessibles. L'humain garde 120 ms et le bruit uniforme ±10° toutes les 0,25 s, plus ACTIONS AUTO du protocole ; il peut maintenant demander ces actions comme une joueuse. L'expert garde 50 ms. Le pilote n'écrit que S.input : aucune charge, aucun kill, aucun LASSO imposé, aucun champ privé lu.

\`src/02-regles.js\` : seul ajout pilotageLasso, chiffres et raisons dans la section codex-p14 de \`refonte/lots/demandes.md\`. Toutes les anciennes règles N.R et tous les seuils d'acceptation sont inchangés. \`70-joueuse.js\` reste identique à l'état reçu : aucun correctif de détection démontré nécessaire, donc aucun raccord-joueuse.patch produit. \`index.html\` reconstruit, build sortie 0 ([journal](build.log)). Aucun commit.

## Cause établie, fichier:ligne

La vraie référence est [REFONTE.md:535](../../REFONTE.md#212-le-lasso-verbe-central) : le chemin doit se fermer sur la queue ou sur une traînée encore allumée. La morsure qui coupe, explicitement imposée par la propriétaire et N.R, prévaut sur l'ancienne phrase « donc une mort » de cette section.

- Ancien pilote : [avant-src/85-pilote.js:173](avant-src/85-pilote.js), groupe d'au moins quatre et rayon minimal de 26 px ; au début, 2π×26 = 163,36 px, alors que corps + traînée = 8×5 + 68×1,36 = 132,48 px. Ce cercle ne rentre pas dans la fenêtre. Le rayon expert calculé à cette longueur reste sous son plancher de 20 px ; il ne tente donc pas cette boucle. Sources : lignes 171–181 de l'instantané et N.R.longueur/traine/vitesse.
- Ancien pilote : [avant-src/85-pilote.js:192](avant-src/85-pilote.js), somme absolue des virages de la tête ; ligne 194, centre recalculé depuis des ennemis mobiles. Tourner de 2π ne garantit pas le retour sur la trace. La graine humaine 1 finit deux essais par « boucle » avec des distances au départ de **81,76 et 81,29 px** et des périmètres visés de **519,40 et 467,36 px** pour des fenêtres de **138,84 et 145,20 px**. Ce ne sont pas des boucles fermées manquées par le détecteur. [Trace réelle](diagnostic-avant.json), sans changement des entrées.
- Ancien pilote : [avant-src/85-pilote.js:82](avant-src/85-pilote.js), corps traité comme obstacle statique sur 0,7 s ; ligne 198, abandon au danger prédit. Cette prédiction ne retire pas les segments qui auront quitté le corps pendant cet horizon. La candidate utilise le déplacement public des segments et une prévision courbe : [85-pilote.js:232](../../src/85-pilote.js).
- Détecteur : [70-joueuse.js:578](../../src/70-joueuse.js), derniers segments et traînée ; âge minimal, tolérances puis aire minimale, [ligne 603](../../src/70-joueuse.js). L'indice TT décalé de m mesure une approximation de l'âge depuis le passage de la queue à vitesse constante ; le remplacer par l'âge depuis le passage de la tête raccourcirait la fenêtre. Les fixtures ci-dessous ne montrent aucun raté de boucle conforme. Aucune généralisation à tous les boosts, coupes ou changements de vitesse.

## Détection, puis geste : deux bancs séparés

Calibration [validation-vm.json](validation-vm.json) : **${calibration.cas.filter(c=>c.identique).length}/10 références e1bdc6f identiques**, temps de jeu, vague, score, combat et simulation. L'écart avec cette ancienne version ne sert jamais de comparaison du lot : avant/après utilisent l'instantané reçu e47f22f, conservé dans sources-avant.json.gz.

Cas construits [avant](cas-avant.json) / [après](cas-apres.json) : ${cr[0].cas.length} cas par état. Cercles parfaits et carrés sur cible fixe puis mobile, longueurs 8/20/40. Les fermetures à 0/1/3/6 px affectent réellement la cible et produisent un événement LASSO : **${cr[0].cas.filter(c=>c.lassos.length&&c.pvApres<c.pvAvant).length} avant, ${cr[1].cas.filter(c=>c.lassos.length&&c.pvApres<c.pvAvant).length} après**. Les six cas à 10 px et les deux témoins (aire trop petite ; périmètre hors fenêtre) restent sans dégâts ni LASSO : **${cr[0].cas.filter(c=>!c.lassos.length&&c.pvApres===c.pvAvant).length}/8 avant, ${cr[1].cas.filter(c=>!c.lassos.length&&c.pvApres===c.pvAvant).length}/8 après**. Zéro erreur. force() ne sert qu'à la fixture géométrique, jamais au pilote.

Geste via les vraies entrées du pilote, groupe contrôlé de quatre larves, vingt graines par case ; cible fixe ou mouvement prescrit dans la boucle. Pas de mise à jour de l'arsenal dans ce banc isolé : il teste le tracé, pas la survie face à une vraie formation. Succès = dégâts réels et événement LASSO. Traces/journaux complets dans gestes-avant.json.gz et gestes-apres.json.gz ; résumés JSON homonymes.

| Pilote | Longueur | Cible | Avant | Après |
|---|---:|---|---:|---:|
${gest.join('\n')}

## Parties complètes : mêmes vingt graines 1–20

Protocole exact de tools/pilotes/parties.mjs : contexte vierge, localStorage vide, jour 20261017, actions auto pour humain et doigts pour expert, plongée, horloge initialisée une fois puis simulation officielle par 0,25 s jusqu'à fin. Aucun interlude sauté. Borne inchangée de 540 s de jeu. Réussite = vrai LASSO affectant au moins un ennemi dans la fenêtre lassoTente→lassoFin ; un cercle vide reste un échec. [Avant](avant.json), [final](final.json), reçus complets compressés dans recus/.

| Pilote | Segments | Avant : réussis/tentés | Après : réussis/tentés |
|---|---|---:|---:|
${rows.join('\n')}

Humain : seuil court ≥50 %, long ≥40 % : **échecs conservés**. Cadence par minute : court ${f(A.humain.tranches['8-20'].parMinute)}→${f(F.humain.tranches['8-20'].parMinute)}, long ${f(A.humain.tranches['30-40'].parMinute)}→${f(F.humain.tranches['30-40'].parMinute)} ; rapport final ${f(F.humain.tranches['30-40'].parMinute/F.humain.tranches['8-20'].parMinute)} pour ≥0,8. Le taux avant court nul interdit un rapport avant significatif. Le critère officiel compte aussi les tentatives sous huit segments dans « jusqu'à vingt » : ${ratio(official(avant))}→${ratio(official(final))}, échec également ; aucune tentative hors tranche n'est transformée en succès.

Expert, **médianes du critère R-04**, et non moyennes : LASSO **${f(A.expert.lassosMediane)}→${f(F.expert.lassosMediane)}**, cible ≥10 : **${seuils.expertLassos?'atteinte sur ce lot exploratoire':'non atteinte'}** ; APOGÉE **${f(A.expert.apogeesMediane)}→${f(F.expert.apogeesMediane)}**, cible ≥2 : **${seuils.expertApogees?'atteinte sur ce lot exploratoire':'non atteinte'}**. Moyennes LASSO ${f(A.expert.lassosMoyens)}→${f(F.expert.lassosMoyens)}, APOGÉE ${f(A.expert.apogeesMoyennes)}→${f(F.expert.apogeesMoyennes)}. Résultats graine par graine dans final.json. Cela ne valide pas le reste de R-04.

Un cas réel distingue fermeture et capture : dans la première tentative humaine finale, graine 1, la tête revient à **6,31 px** du départ et le nombre de fermetures du module augmente de un, sans événement LASSO affectant un ennemi. La cible 27 reste vivante (20→10 PV) et passe de (405,99 ; 144,45) à (368,13 ; 151,61) pendant le geste. Le tracé et les états sont dans [diagnostic-apres.json](diagnostic-apres.json) ; temps et score sont identiques au reçu non instrumenté. Ce cas ne donne pas une proportion des causes sur les vingt graines.

## Variantes et contrôle de la candidate

| Variante | Humain court | Humain long | Expert LASSO médiane | Expert APOGÉE médiane |
|---|---:|---:|---:|---:|
${vr.join('\n')}

1 : cercle latéral fixe et anticipation du retard. 2 : finir le geste malgré les tirs alliés et employer TRAVERSÉE/ancien réglage auto avec soutien manuel ; candidate retenue. 3 : retour vers une traînée mémorisée, rejeté. 4 : suivi de la courbe prévue, sortie au-delà de la fermeture et contrôle de morsure, rejeté. Leurs politiques sont archivées dans pilote-passe1.js à pilote-passe4.js, leurs configurations dans configurations-variantes.json. Chaque série compile un instantané immuable ; les éditions de la variante suivante ne changent pas son exécution. Les champs de configuration inutilisés des essais sont retirés de la candidate finale. Aucune cinquième variante.

Contrôle final sur les fichiers réellement écrits : **${identiques}/40 identiques à la candidate 2 jusqu'au journal complet**. Les six séries principales font ${tousFin}/${casPrincipaux.length} fins, ${erreurs} erreur de jeu/console VM ; ce ne sont pas ${casPrincipaux.length} parties indépendantes. Régression des cinq politiques non modifiées, deux graines chacune : **${regression.cas.filter(c=>c.identique).length}/${regression.cas.length} avant/après identiques**, journal compris ([preuve](regression.json)). Bon : cinq graines appariées avant/après, **${bon.cas.filter(c=>Object.values(c.versions).every(v=>v.raison==='fin'&&!v.err&&!v.console.length)).length}/5 finies sans erreur** ([preuve](bon.json)). Aucun maintien des 80 anciennes parties n'est prétendu.

[Contrôle de source](controle-source.json) : N.R en ajout seul, joueuse intacte, aucune lecture privée/interdite, bruit et réaction conservés. Bundle SHA-256 : \`${hash(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'))}\`. Source SHA-256 : \`${hash(sources())}\`.

## Ce qui reste

**R-34 reste à résoudre en partie complète**, ainsi que la médiane de dix LASSO de l'expert. Les cercles isolés réussis ne prouvent pas que les formations réelles resteront dedans jusqu'à la fermeture. Les abandons face aux menaces, le déplacement des cibles et les destructions pendant le tour restent les limites de cette politique ; leurs causes respectives ne sont pas quantifiées sur vingt graines. Les essais 3/4 ne constituent pas une solution livrée. Un nouveau lot doit partir de ces reçus et préciser une nouvelle hypothèse structurelle, sans continuer à régler des chiffres de fermeture.

**Navigateur en attente de la cheffe** : verifier.mjs complet, import Playwright vérifié et syntaxe contrôlée ; aucun listen, aucun Chromium lancé ici. Le script sert l'avant et le bundle final sur port libre, un Chromium --mute-audio, profils 844×390 tactile, 390×844 et 1440×900 en série ; cas géométriques, parties humain/bon/expert, état/journal/dégâts, vrais indices du tampon, histogrammes, PNG et erreurs. Il refuse un bundle périmé ou un module tiers modifié depuis l'instantané. Résultats attendus dans playwright/resultats.json. Les pixels, l'ergonomie Safari, le budget de flash réel et le verdict des critères officiels restent **à vérifier** ; aucune mesure de navigateur inventée.
`;
fs.writeFileSync(path.join(ICI,'rapport.md'),texte);
console.log('Rapport écrit ; seuils',seuils);

import fs from 'node:fs';
const H=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,H))),b=read('bilan.json'),c=read('construits.json'),avant=read('mesures-avant.json');
const date=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace(' ', ' · ').replace(':',' h ');
const fmt=x=>(x*100).toFixed(2).replace('.',',')+' %';
const rows=['paysage','portrait','bureau'].map(profil=>{const a=b.r11.find(x=>x.version==='avant'&&x.profil===profil),p=b.r11.find(x=>x.version==='apres'&&x.profil===profil);return `| ${profil} | ${a.gaine.gaine}/${a.gaine.bord} (${fmt(a.gaine.part)}) | ${p.gaine.gaine}/${p.gaine.bord} (100 %) | ${fmt(a.decorLumineux)} → ${fmt(p.decorLumineux)} |`;});
const photos=b.r13.map(p=>{const a=avant.r13.find(x=>x.profil===p.profil&&x.scene===p.scene);return `| ${p.profil} / ${p.scene} | ${a.pixels.maxParSeconde} → ${p.max} | ≤ 3 : passe |`;});
const raw=c.versions[1].cas.map(x=>x.compose.analyse.gaine.part),rng=fmt(Math.min(...raw))+'–'+fmt(Math.max(...raw));
const rapport=`# codex-p32 — ${date} (Paris) — mis à jour à ${date}

**Commande hors bac, depuis la racine :** \`node proto-neon/tools/codex-p32/verifier.mjs --criteres\`.
Sans \`--criteres\`, le script exécute les trois profils, les cas construits et les neuf séquences photosensibles. Avec cette option, il ajoute les critères officiels inchangés R-11/R-06/R-13, avant et après. Un seul Chromium muet à la fois, tous les profils en série ; serveur HTTP local sur port libre. **Script écrit et imports vérifiés, jamais exécuté ici.** Aucun serveur, Chromium ni réseau sortant tenté. Chromium émulé ne qualifiera pas Safari réel.

**Sous-tâche de dessin livrée et vérifiée en VM ; palier global non validé.** La gaine de la scène colosse et les 63 cas CYCLOPE isolé passent. La composition dense conserve des échecs détaillés ci-dessous. La qualification navigateur reste à vérifier hors bac. Aucun commit. Build final : sortie 0, [build.log](build.log).

## Modification

Dans [73-colosse.js](../../src/73-colosse.js), le corps, l’œil, les mains orientées, les plaques, la carcasse et les télégraphes passent par une couche locale d’index. La gaine d’un pixel est complétée après rotation, Bayer et flash : extrémités, trous de trame et découpage au cadre compris. Elle utilise \`lisibiliteP10.teteGaine\` déjà défini ; aucune couleur ni cadence nouvelle. Les primitives gardent les opérations entières de gfx.

Les repères de murs sont projetés sous le HUD, sans déplacer les vrais murs ni leurs annonces. La jauge et son libellé sont attribués au HUD, comme le radar. La protection sous la jauge assombrit uniquement la couche du CYCLOPE déjà dessinée ; elle ne relit ni le décor ni le masque du banc. Une plaque opaque expérimentale a été rejetée parce qu’elle faisait tomber le décor paysage à 17,72 %. Les nouveaux réglages \`hautPortrait=40\`, \`plaqueMarge=4\`, \`plaqueHauteur=24\` sont dans N.R et expliqués dans [demandes.md](../../refonte/lots/demandes.md).

La logique entre l’état neuf et la fin de update, hors fonction de dessin des repères, est identique octet pour octet. Tirs, attribution des morts, journal, naissances hors champ et temporisations sont intacts pour p31. [verification-sources.json](verification-sources.json) ; seuls modules modifiés : 02 et 73. L’index est la reconstruction demandée.

## Mesures avant/après

La VM charge les vraies sources dans l’ordre de build.mjs, sans DOM. [calibration.json](calibration.json) reproduit **10 parties e1bdc6f à l’identique**, temps, vague, score et empreinte du journal inclus. Cette référence historique ne sert pas à comparer le candidat ; l’avant est bien l’état reçu, enregistré dans [avant/sources.json](avant/sources.json). Empreinte finale : \`${b.sourceSha256}\`.

La séquence de scènes et les flèches dirigées reprennent R-11. Les parties de comparaison utilisent exactement le protocole imposé : stockage vierge, jour 20261017, réglage actions, intro.skip, reset plongée, seul éventuel demarrage → plongee, pilote, journal actif, un avancer initial, simuler(0.25) jusqu’à fin. Les dessins isolés remettent l’origine monde après le décor, qui dessine en espace écran.

| Vue, scène colosse dans la séquence R-11 | Bord gainé avant | Bord gainé après | Décor lumineux avant → après |
|---|---:|---:|---:|
${rows.join('\n')}

Source : [r11-sequence.json](r11-sequence.json). Seuil de gaine strictement 1 ; décor 18–28 % inchangé. **Le décor portrait reste hors de cet intervalle dans cette VM, avant comme après.** La valeur navigateur p23 fournie (0,713) n’est pas le résultat numérique de notre VM : nos valeurs ne la remplacent pas et ne préjugent pas du nouveau reçu navigateur.

**63/63 cas isolés valides** : trois phases × sept quartiers × trois profils, mains réellement entrées depuis le hors-champ. Bord gainé = 100 %, zéro cyan dans les menaces, zéro index hors palette et zéro erreur JS/console. Avant, gaine isolée de 51,06 à 71,53 %. [construits.json](construits.json), vrais buffers/masques et PNG VM dans [pixels-vm/](pixels-vm/). Ces images ne sont pas des captures navigateur.

**${b.parties.identiques}/80 parties identiques**, dont ${b.parties.journauxIdentiques}/80 journaux complets de même SHA-256 ; mêmes temps, vague, score et raison d’arrêt. ${b.parties.fin} fins, ${b.parties.erreurs} erreur. [parties-avant.json](parties-avant.json), [parties-apres.json](parties-apres.json), journaux finaux gzip dans [journaux/](journaux/). Candidat final figé avant ce dernier passage ; les essais intermédiaires restent séparés.

**R-06, portée des 80 parties paysage** : ${b.r06.apparitions} apparitions, **${b.r06.dansVue} dans la vue**, ${b.r06.sansVue} sans champ vue ; ${b.r06.armements} armements, **${b.r06.horsVue} hors vue**. Les journaux avant/après étant identiques, ces valeurs sont inchangées. Ce lot ne prétend pas avoir exécuté la campagne officielle de 50 graines × trois pilotes. [bilan.json](bilan.json).

R-13 : 600 vrais tampons successifs par cas, seuils conservés, **neuf cas valides avant et après** ; le maximum reste 3/s. Les comptes peuvent baisser après ajout de gaine.

| Vue / séquence | Maximum de flashs/s avant → après | Verdict |
|---|---:|---|
${photos.join('\n')}

Sources : [mesures-avant.json](mesures-avant.json), [photos-finales.json](photos-finales.json). Le limiteur et les séquences de charge/mort sont ceux du banc p10, sans seuil modifié.

## Réserves et reprise

- **La composition dense échoue encore dans 63/63 cas supplémentaires** : gaine globale des pixels code 5 ${rng}, seuil 100 %. Elle inclut les autres menaces, les effets et les bords créés par leurs recouvrements et ceux du HUD. Aucune attribution précise sans ablation : le dessin isolé du CYCLOPE passant, ces échecs ne sont pas effacés ni présentés comme réussis. Demande inter-lots écrite ; aucun autre fichier corrigé. Le vérifieur navigateur conserve ces mesures et sortira 1 si elles subsistent.
- Vérification navigateur et résultat des critères officiels à fournir par la cheffe hors bac ; performance Safari/iPhone non mesurée. Pas de verdict global R-11/R-13 sur Safari.
- Deux essais VM groupés ont quitté avec le code **139**, sans diagnostic. Les neuf mesures finales de photosensibilité et les six séquences R-11 ont ensuite terminé dans des processus isolés ; aucune conclusion tirée des sorties interrompues. Les défauts des premiers essais sont dans [essais.json](essais.json). Un premier protocole de dessin isolé utilisait la mauvaise origine : il a été corrigé, sans refaire les parties ni affaiblir le seuil.

Reçus de synthèse : [bilan.json](bilan.json). Reprise : [REPRISE.json](REPRISE.json). Pour recalculer seulement les pixels finaux : \`node proto-neon/tools/codex-p32/sequence-finales.mjs\`, \`node proto-neon/tools/codex-p32/construits-vm.mjs\`, \`node proto-neon/tools/codex-p32/photos-finales.mjs\`. Le banc groupé \`mesurer-vm.mjs\` est conservé comme essai historique, à éviter après ses sorties 139.
`;
fs.writeFileSync(new URL('rapport.md',H),rapport);

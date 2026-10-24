// Les 80 parties ne dessinent jamais. Le dernier ajustement déplace seulement leur modèle de dessin
// vers le champ public déjà prévu par le schéma ; les fonctions du chemin simulé sont identiques.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import{sources}from './vm.mjs';
const lire=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url))),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const src=sources(),courant=src.find(([n])=>n==='80-ecrans.js')[1],teste=fs.readFileSync(new URL('candidat-parties-80-ecrans.js',import.meta.url),'utf8');
assert.equal(courant.replace("N.S.ecran.retour = { nom: 'attraction', volet: volet, t: T, lignes: lignes }","N.S.ecran.attraction = { volet: volet, t: T, lignes: lignes }"),teste,'seul le champ du modèle peint a changé');
const avant=lire('avant.json'),apres=lire('apres.json'),comparaison=lire('comparaison.json');assert.equal(avant.cas.length,80);assert.equal(apres.cas.length,80);assert.equal(comparaison.identiques,80);
const candidat=src.map(([n,s])=>[n,n==='80-ecrans.js'?teste:n==='79-jeu.js'?fs.readFileSync(new URL('79-jeu-candidat.js',import.meta.url),'utf8'):s]);assert.equal(hash(JSON.stringify(candidat)),apres.sourcesSha256);
const temoin=src.map(([n,s])=>{const url=new URL('avant/'+n,import.meta.url);return[n,fs.existsSync(url)?fs.readFileSync(url,'utf8'):s];});assert.equal(hash(JSON.stringify(temoin)),avant.sourcesSha256);
const preuve={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),identiques:80,sourcesPartiesApres:apres.sourcesSha256,sourcesTemoin:avant.sourcesSha256,sourceEcransTestee:hash(teste),sourceEcransFinale:hash(courant),differenceUnique:"affectation du modèle dans attraction() : S.ecran.attraction → S.ecran.retour, nom:'attraction'",cheminSimuleInchange:true,preuveModeleFinal:'modele.json et instrument.json, mesures ciblées rejouées',limite:'pas un nouveau rejeu des 80 parties après ce seul déplacement de métadonnées de dessin'};
fs.writeFileSync(new URL('reutilisation-parties.json',import.meta.url),JSON.stringify(preuve,null,2));console.log(preuve);

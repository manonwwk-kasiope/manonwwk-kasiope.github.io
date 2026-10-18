import fs from 'node:fs';
import {murMobileAnnonce} from '../mesure/criteres/R-31-plateau.mjs';
const a=(evt,t,vx=12)=>({evt,t,vx});
const tests=[
 ['durée complète',{}, {t:3,teleDuree:2},true],
 ['durée insuffisante',{}, {t:3,teleDuree:1.999},false],
 ['vraie annonce, seuil exact',{arene:[a('travellingAnnonce',1)]},{t:3,teleDuree:0},true],
 ['vraie annonce trop récente',{arene:[a('travellingAnnonce',1)]},{t:2.999,teleDuree:0},false],
 ['départ seul',{arene:[a('travelling',1)]},{t:4,teleDuree:0},false],
 ['convoi ne vaut pas annonce du mur',{arene:[a('convoiAnnonce',1)]},{t:4,teleDuree:0},false],
 ['annonce finie',{arene:[a('travellingAnnonce',1),a('fin',2)]},{t:5,teleDuree:0},false],
 ['autre vague',{arene:[a('travellingAnnonce',1)],vagues:[{evt:'entree',n:3,t:3}]},{t:5,teleDuree:0},false],
 ['ancien travelling puis boss',{arene:[a('travellingAnnonce',1)],phases:[{evt:'arrivee',n:1,t:3}]},{t:5,teleDuree:0},false],
 ['nouvelle annonce remplace ancienne',{arene:[a('travellingAnnonce',1),a('travellingAnnonce',4)]},{t:5,teleDuree:0},false],
 ['annonce puis départ',{arene:[a('travellingAnnonce',1),a('travelling',3)]},{t:4,teleDuree:0},true],
 ['deuxième départ sans annonce',{arene:[a('travellingAnnonce',1),a('travelling',3),a('travelling',4)]},{t:6,teleDuree:0},false],
 ['sens différent',{arene:[a('travellingAnnonce',1),a('travelling',3,-12)]},{t:4,teleDuree:0},false]
].map(([nom,r,m,attendu])=>({nom,attendu,obtenu:murMobileAnnonce(r,m,2)}));
fs.writeFileSync(new URL('./criteres.json',import.meta.url),JSON.stringify(tests,null,2));
console.log(tests);if(tests.some(t=>t.attendu!==t.obtenu))process.exitCode=1;

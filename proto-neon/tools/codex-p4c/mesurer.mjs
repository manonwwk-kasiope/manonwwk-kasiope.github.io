import fs from 'node:fs';
import zlib from 'node:zlib';
import { sources, monde, partie } from './vm.mjs';
const mode = process.argv[2] || 'avant';
const src = sources();
if (mode === 'avant') for (const f of ['02-regles.js', '72-ennemis.js', '73-arene.js']) src[f] = fs.readFileSync(new URL('./avant-' + f, import.meta.url), 'utf8');
const calibration = JSON.parse(fs.readFileSync(new URL('./calibration.json', import.meta.url)));
if (!calibration.valide) throw new Error('VM non calibrée');
const profils = { paysage: [844,390], portrait: [390,844], bureau: [1440,900] };
const cas = [];
fs.mkdirSync(new URL('./journaux/', import.meta.url), {recursive:true});
for (const [profil, dim] of Object.entries(profils)) for (const pilote of ['bon','humain']) for (let graine=1; graine<=10; graine++) {
  const m = monde(src, ...dim), {N,S} = m, mortsEtat = [], naissances = [];
  N.ev.on('mort', 1, d => { if(d.auteur === 'murMobile') mortsEtat.push({t:N.horloge.t(), d:JSON.parse(JSON.stringify(d)), arene:N.arene.etat(), monde:{...S.monde}, tele:JSON.parse(JSON.stringify(S.tele))}); }, 'banc-p4c');
  const spawn = N.ennemis.spawn;
  N.ennemis.spawn = function(...a) {
    const e = spawn.apply(this,a), v = N.outils.VUE;
    if(e) naissances.push({id:e.id,type:e.type,x:e.x,y:e.y,etat:e.etat,vue:{...v},dans:e.x>=v.x&&e.x<=v.x+v.w&&e.y>=v.y&&e.y<=v.y+v.h});
    return e;
  };
  const r = partie(m,pilote,graine), j = N.journal.dump();
  const app = j.filter(e=>e.type==='apparition').map(e=>({t:e.t,...e.d}));
  const dans = app.filter(d=>d.vue && d.x>=d.vue.x&&d.x<=d.vue.x+d.vue.w&&d.y>=d.vue.y&&d.y<=d.vue.y+d.vue.h);
  const arm = j.filter(e=>e.type==='armement'), morts = j.filter(e=>e.type==='mort'&&e.d.auteur==='murMobile');
  const sans = morts.filter(m=>!(m.d.teleDuree >= N.R.arene.travelling.annonce-1e-6 || j.some(a=>a.type==='arene'&&['travelling','convoiAnnonce'].includes(a.d.evt)&&a.t<=m.t-N.R.arene.travelling.annonce)));
  const log = `journaux/${mode}-${profil}-${pilote}-${graine}.json.gz`;
  fs.writeFileSync(new URL('./'+log, import.meta.url), zlib.gzipSync(JSON.stringify({journal:j,naissances,mortsEtat})));
  const c = {...r,profil,vue:{w:N.gfx.W,h:N.gfx.H},apparitions:app.length,dansVue:dans.length,exemples:dans.slice(0,5),naissancesVue:naissances.filter(n=>n.dans).length,armements:arm.length,armementsHorsVue:arm.filter(e=>e.d.shown===false).length,mortsMurMobile:morts.length,sansAnnonce:sans.length,mortsEtat,console:m.erreurs,log};
  cas.push(c);
  fs.writeFileSync(new URL('./'+mode+'.json',import.meta.url), JSON.stringify({mode,cas},null,2));
  console.log(JSON.stringify({mode,profil,pilote,graine,raison:r.raison,dansVue:c.dansVue,naissancesVue:c.naissancesVue,sansAnnonce:c.sansAnnonce,err:r.err}));
}

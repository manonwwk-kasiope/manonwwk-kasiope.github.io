import fs from 'node:fs';
for(const mode of ['avant','apres']) {
 const url=f=>new URL('./'+f,import.meta.url),base=JSON.parse(fs.readFileSync(url(mode+'.json'))),cas=new Map(base.cas.map(c=>[[c.profil,c.pilote,c.graine].join('/'),c]));
 for(const profil of ['paysage','portrait','bureau']){const p=url(mode+'-'+profil+'.json');if(!fs.existsSync(p))continue;for(const c of JSON.parse(fs.readFileSync(p)).cas){if(c.profil!==profil)throw new Error('Profil incohérent');cas.set([c.profil,c.pilote,c.graine].join('/'),c);}}
 base.cas=[...cas.values()].sort((a,b)=>['paysage','portrait','bureau'].indexOf(a.profil)-['paysage','portrait','bureau'].indexOf(b.profil)||['bon','humain'].indexOf(a.pilote)-['bon','humain'].indexOf(b.pilote)||a.graine-b.graine);
 fs.writeFileSync(url(mode+'.json'),JSON.stringify(base,null,2));console.log(mode,base.cas.length,'/60');
}

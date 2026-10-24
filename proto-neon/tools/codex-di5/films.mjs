/* Décodage vidéo MUET : ffmpeg -an ; rendu par les vraies fonctions du jeu dans la VM validée.
   Pas de DOM matériel, pas de navigateur, pas de port, pas de réseau. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chargerVM} from '../jury2/vm-temoins.mjs';
import {transitions,compteur,flashs} from './r13.mjs';
import {png} from '../jury2/images.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..');
const valid=JSON.parse(fs.readFileSync(path.join(HERE,'validation-vm.json')));assert(valid.valide&&valid.cas.length>=10);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const src=n=>fs.readFileSync(path.join(ROOT,'src',n),'utf8');
const files=fs.readdirSync(path.join(ROOT,'cine')).filter(f=>f.endsWith('.mp4')).sort();
// Exécuter 05-art tel quel, avec les seuls ports de décodage injectés. Aucun play matériel.
let rgba=null;const videos=new Map();
const document={addEventListener(){},body:{appendChild(){}},createElement(type){
 if(type==='video'){const v={muted:true,volume:0,readyState:2,currentTime:0,style:{},setAttribute(){},addEventListener(){},play(){return Promise.resolve();},pause(){}};Object.defineProperty(v,'src',{set(s){videos.set(path.basename(s,'.mp4'),v);}});return v;}
 if(type==='canvas')return{getContext(){return{drawImage(){},getImageData(){return{data:rgba};}};}};
 throw Error('Port non fourni '+type);
}};
const a={N:{},document,CINE_DISPO:files.map(f=>f.slice(0,-4)),ART_SRC:{},Uint8Array,console};a.window={__N:a.N};vm.createContext(a);vm.runInContext(src('00-pal.js')+'\n'+src('05-art.js'),a);
const CLIPS=vm.runInNewContext('('+src('05-art.js').match(/var CLIPS = ([\s\S]*?);\n  var OUVERTURE/)[1]+')');
const T=a.N.pal.C.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
const COMPLEMENTS=process.argv.includes('--complements');
const ouvrirSeulement=process.argv.includes('--ouvertures'),queues=process.argv.includes('--queues');
const sortie=COMPLEMENTS?JSON.parse(fs.readFileSync(path.join(HERE,'films.json'))):{dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),validationVM:valid.valide,
 seuils:{...a.N.pal.L},sources:Object.fromEntries(fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')).sort().map(f=>[f,sha(src(f))])),films:[],
 methode:'ffmpeg RGBA sans audio, 384×216 natif ; N.art.play/get réels (frameOf/lut/qtab, Bayer), puis N.film/N.intro/N.choix/N.ui réels. w=k/hz. 60 Hz est une cadence contractuelle de présentation, pas une cadence Safari mesurée.',
 taille:{masquesJSON:0,masquesGzip:0,rendus:0,paletteBrute:0},erreurs:[]};
const outdir=path.join(HERE,'films');fs.mkdirSync(outdir,{recursive:true});
const save=()=>fs.writeFileSync(path.join(HERE,'films.json'),JSON.stringify(sortie,null,2)+'\n');
const converted=new Map();
const PROFILS={paysage:[844,390],portrait:[390,844],bureau:[1440,900]};
const stills=new Map();
function panneau(nom){
 if(stills.has(nom))return stills.get(nom);
 const file=path.join(ROOT,'art',nom+'.png');if(!fs.existsSync(file))return null;
 const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',file])).streams[0];
 const raw=execFileSync('ffmpeg',['-v','error','-i',file,'-an','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:16000000});
 const data=new Uint8Array(meta.width*meta.height);
 for(let i=0;i<data.length;i++){if(raw[i*4+3]<128)continue;let bd=Infinity,b=0;for(let k=0;k<16;k++){const d=T[k].reduce((s,c,j)=>s+(raw[i*4+j]-c)**2,0);if(d<bd){bd=d;b=k;}}data[i]=b||15;}
 const r={w:meta.width,h:meta.height,data};stills.set(nom,r);return r;
}
function reference(raw,cy){
 const bay=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],out=new Uint8Array(384*216),memo=new Map();
 for(let y=0,i=0;y<216;y++)for(let x=0;x<384;x++,i++){
  const off=((bay[(y&3)*4+(x&3)]+.5)/16-.5)*40;
  const rgb=[0,1,2].map(j=>Math.min(255,Math.max(0,raw[i*4+j]+off))>>3);
  const key=(rgb[0]<<10)|(rgb[1]<<5)|rgb[2];let b=memo.get(key);
  if(b===undefined){const [r,g,bl]=rgb.map(v=>v*8+4);let bd=Infinity;b=0;for(let k=0;k<16;k++){if(!cy&&(k===7||k===8))continue;const rm=(r+T[k][0])/2,d=(2+rm/256)*(r-T[k][0])**2+4*(g-T[k][1])**2+(2+(255-rm)/256)*(bl-T[k][2])**2;if(d<bd){bd=d;b=k;}}b=b||15;memo.set(key,b);}out[i]=b;
 }
 return out;
}
function decoderAutre(name){
 if(!CLIPS[name])return null;
 const raw=execFileSync('ffmpeg',['-v','error','-i',path.join(ROOT,'cine',name+'.mp4'),'-an','-sn','-dn','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:64000000});
 const result=[];a.N.art.play(name);for(let k=0;k<raw.length/(384*216*4);k++){rgba=raw.subarray(k*384*216*4,(k+1)*384*216*4);videos.get(name).currentTime=k/12;result.push(new Uint8Array(a.N.art.get(name).data));}a.N.art.stop(name);converted.set(name,result);return result;
}
function mesurer(nom,frames,meta,profil,hz,route){
 const {N,c,erreurs}=chargerVM(ROOT);const S=N.S,[w,h]=PROFILS[profil];const dim=N.gfx.resize(w,h);
 Object.assign(S.view,{w:dim.w,h:dim.h,safe:{l:0,t:0,r:0,b:0}});N.intro.skip();N.gfx.clear(N.pal.i('nuitProfonde'));
 let time=0;const started=new Map();
 const frameAt=(name)=>{const f=name===nom?frames:started.has(name)?(converted.get(name)||decoderAutre(name)):null;if(f){const t=Math.max(0,time-(started.get(name)??0));let k=Math.floor(t*12+1e-3);if(CLIPS[name][0])k%=f.length;else k=Math.min(k,f.length-1);return{w:384,h:216,data:f[k]};}return panneau(name);};
 N.art={get:frameAt,names:()=>files.map(f=>f.slice(0,-4)),pour:base=>base===nom.replace(/-(elle|lui)$/,'')?nom:base,ready:()=>true,
 play(name){started.set(name,time);return true;},stop(name){started.delete(name);},prepare(){},ended:()=>false};
 // L'audio n'est jamais initialisé. Ces fonctions n'émettent rien sans AudioContext.
 const base=nom.replace(/-(elle|lui)$/,'');
 let duree=meta.duration*(CLIPS[nom][0]?2:1),details={};
 if(route==='film'||route==='film-usage-rendu'){
  const e=N.aventure.ETAPES.find(e=>e.type==='film'&&(e.base===base||e.base===nom));
  if(route==='film-usage-rendu')duree=e?.duree||4.5;
  let opts=e?{...e,legende:typeof e.legende==='object'?e.legende[nom.endsWith('-lui')?'lui':'elle']:e.legende}:{};
  // Lecture complète supplémentaire : les plages réellement jouées sont aussi données séparément.
  opts.duree=duree+1;opts.sautable=false;N.film.jouer(nom,opts);details={legende:opts.legende,carte:opts.carte,portee:'clip intégral dans le lecteur N.film'};
 }else if(route==='ouverture'){
  N.intro.reset();duree=base==='briefing'?11.5:base==='exterieur'?2:base==='connexion'?3.5:5.5;details={portee:'ouverture réelle N.intro, depuis exterieur'};
 }else if(route==='intro-complet'){
  N.intro.transition('boss');duree=3;details={portee:'enchaînement réel alerte puis boss, deux clips animés'};
 }else if(route==='invitation'){
  N.film.jouer(nom,{duree:3.5,legende:nom.endsWith('-lui')?"LE PILOTE T'ATTEND":"LA PILOTE T'ATTEND"});duree=3.5;details={portee:'invitation réelle à jouer avec l’autre pilote'};
 }else if(route==='intro'){
  if(N.intro.FILMS[base])duree=N.intro.FILMS[base].d;
  else if(base==='alerte'||base==='boss')duree=3;
  else duree=meta.duration*(CLIPS[nom][0]?2:1);
  N.intro.transition(base==='alerte'?'boss':base);details={portee:'interlude réel N.intro, durée publique'};
 }else if(route==='choix'){N.choix.start({focus:nom.endsWith('-lui')?'lui':'elle'});details={portee:'sélecteur réel N.choix, focus maintenu'};}
 else if(route==='titre'){N.ui.ouvrir('titre');details={portee:'écran réel N.ui titre'};}
 const R=N.R.criteres.R13,r=N.R.lisibiliteP10.mesure,C=compteur(R.aire,{hzFixe:hz}),trace=[],hash=crypto.createHash('sha256');let old=null,totalJSON=0;
 const count=Math.ceil(duree*hz);
 for(let k=0;k<count;k++){
  time=k/hz;S.frame++;S.dt=k?1/hz:0;
  if(k){if(route==='film'||route==='film-usage-rendu'||route==='invitation')N.film.update(1/hz);else if(['intro','ouverture','intro-complet'].includes(route))N.intro.update(1/hz);else if(route==='choix')N.choix.update(1/hz);else N.ui.update(1/hz);}
  if(route==='film'||route==='film-usage-rendu'||route==='invitation')N.film.draw();else if(['intro','ouverture','intro-complet'].includes(route))N.intro.draw();else if(route==='choix')N.choix.draw();else N.ui.draw();
  const B=N.gfx.buf();assert(B.every(v=>v<16));hash.update(B);
  const x={w:time,W:N.gfx.W,H:N.gfx.H,...transitions(old,B,N.pal.L,r.luminanceDelta,r.luminanceSombre)};
  C.ajouter(x);old=new Uint8Array(B);trace.push({...x,segment:route==='ouverture'?N.intro.state().etape:route==='intro-complet'?(N.intro.state().t<1.2?'alerte':'boss'):null});totalJSON+=Buffer.byteLength(JSON.stringify(x));
  assert.equal(c.__ERR.count,0,JSON.stringify(c.__ERR));assert.equal(erreurs.length,0,erreurs.join('\n'));
 }
 const selectionSegment=route==='ouverture'?base:route==='intro-complet'?'boss':null;
 const selected=selectionSegment?trace.filter(x=>x.segment===selectionSegment):trace;
 const offset=selectionSegment?selected[0]?.w:0;
 const result=selectionSegment?flashs(selected.map((x,i)=>({...x,w:i/hz})),R.aire,undefined,{hzFixe:hz}):C.resultat();assert(result.qualifiable);
 const raw=Buffer.from(JSON.stringify(trace)),gz=zlib.gzipSync(raw),file=`${nom}-${route}-${profil}-${hz}.json.gz`;
 fs.writeFileSync(path.join(outdir,file),gz);
 sortie.taille.masquesJSON+=raw.length;sortie.taille.masquesGzip+=gz.length;sortie.taille.rendus+=count;sortie.taille.paletteBrute+=count*N.gfx.W*N.gfx.H;
 return{route,profil,hz,...details,selectionSegment,decalagePresentation:offset,duree,rendus:count,rendusMesures:selected.length,W:N.gfx.W,H:N.gfx.H,sha256SuitePalette:hash.digest('hex'),masques:file,octetsJSON:raw.length,octetsGzip:gz.length,
  flashs:result.flashs,maxParSeconde:result.maxParSeconde,surface:result.surface,instant:result.a,surfaceMax:result.surfaceMax,evenements:result.evenements,conforme:result.maxParSeconde<=R.flashsParSeconde,err:c.__ERR.count};
}
for(const file of files.filter(f=>!COMPLEMENTS||(queues?['teaser-3019']:ouvrirSeulement?['exterieur','connexion','eveil','briefing','boss']:['exterieur','connexion','eveil','briefing','alerte','boss','pilote-elle','pilote-lui']).includes(f.slice(0,-4)))){
 const nom=file.slice(0,-4),f=path.join(ROOT,'cine',file),m=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height,r_frame_rate,nb_frames','-show_entries','format=duration','-of','json',f]));
 const meta={...m.streams[0],duration:+m.format.duration};assert.equal(meta.width,384,nom);assert.equal(meta.height,216,nom);assert.equal(meta.r_frame_rate,'12/1',nom);
 const raw=execFileSync('ffmpeg',['-v','error','-i',f,'-an','-sn','-dn','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:64000000});assert.equal(raw.length%(384*216*4),0);
 const frames=[];a.N.art.play(nom);for(let k=0;k<raw.length/(384*216*4);k++){rgba=raw.subarray(k*384*216*4,(k+1)*384*216*4);videos.get(nom).currentTime=k/12;frames.push(new Uint8Array(a.N.art.get(nom).data));}
 if(!sortie.equivalence){rgba=raw.subarray(0,384*216*4);const direct=reference(rgba,CLIPS[nom][1]);assert.deepEqual(frames[0],direct);const px=Buffer.alloc(384*216*3);frames[0].forEach((v,i)=>T[v].forEach((c,j)=>px[i*3+j]=c));fs.writeFileSync(path.join(HERE,'reference.png'),png(384,216,px));sortie.equivalence={film:nom,image:0,sourceRGBA:sha(rgba),publicNArt:sha(frames[0]),calculIndependant:sha(direct),pixelsDifferents:0,fonction:'05-art.js frameOf appelée par N.art.get ; calcul indépendant redmean + qtab + Bayer',limite:'RGBA décodé par ffmpeg ; aucune comparaison colorimétrique avec le décodeur matériel Safari.'};}
 converted.set(nom,frames);a.N.art.stop(nom);
 const item=COMPLEMENTS?sortie.films.find(f=>f.nom===nom):{nom,meta,sha256Source:sha(fs.readFileSync(f)),imagesDecodees:frames.length,boucle:!!CLIPS[nom][0],cas:[]};if(!COMPLEMENTS)sortie.films.push(item);
 const base=nom.replace(/-(elle|lui)$/,'');
 const routes=COMPLEMENTS?(queues?['film-usage-rendu']:(['exterieur','connexion','eveil','briefing'].includes(nom)?['ouverture']:nom==='boss'?['intro-complet']:base==='pilote'?['invitation']:[])):['film'];if(!COMPLEMENTS&&(['chasse','retournement','rival','plongee','reveil','apotheose','defaite','victoire','boss','alerte'].includes(base)))routes.push('intro');if(!COMPLEMENTS&&base==='pilote')routes.push('choix');if(!COMPLEMENTS&&nom==='affiche-duo')routes.push('titre');
 if(COMPLEMENTS)item.cas=item.cas.filter(c=>!routes.includes(c.route));
 for(const route of routes)for(const profil of Object.keys(PROFILS))for(const hz of [12,60]){item.cas.push(mesurer(nom,frames,meta,profil,hz,route));save();}
 console.log(JSON.stringify({nom,cas:item.cas.length,max:Math.max(...item.cas.map(c=>c.maxParSeconde)),octets:sortie.taille.masquesGzip}));
}
sortie.termine=true;save();

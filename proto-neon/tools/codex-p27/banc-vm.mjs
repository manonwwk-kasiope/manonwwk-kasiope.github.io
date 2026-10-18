// Rejoue les assertions LOGIQUES du banc cloud dans la VM calibrée.
// Adaptateur sans DOM : les captures/boîtes CSS et les temporisations de rendu ne sont pas qualifiées.
import fs from 'node:fs';
import {monde,sources,ICI} from './vm.mjs';
import {raccorder,schemas} from './raccords.mjs';
const mode=process.argv.includes('--avant')?'avant':'apres',raccord=process.argv.includes('--raccords');
if(!JSON.parse(fs.readFileSync(ICI+'/calibrer.json')).cas.every(x=>x.identique))throw Error('Calibration requise');
let src=mode==='avant'?JSON.parse(fs.readFileSync(ICI+'/recu-sources.json')):sources();if(raccord)src=raccorder(src);else if(process.argv.includes("--schemas"))src=schemas(src);
const profils=process.argv.includes('--paysage')?'paysage':'paysage,portrait,bureau',mesures={};
let m,opts,init=[],verdicts=[];
const draw=()=>m.run('N.game.draw();N.fx.draw();N.game.drawTop();');
const page={
 viewportSize:()=>opts.viewport,on(){},
 async waitForFunction(fn){if(!await page.evaluate(fn))throw Error("Crochet absent");},
 async addInitScript(fn){init.push(fn);},
 async goto(){m=monde(src,{w:opts.viewport.width,h:opts.viewport.height});m.N.horloge.avancer();m.N.ev.verifier(true);for(const fn of init)await page.evaluate(fn);},
 async evaluate(fn,arg){m.c.__arg=arg;return m.run('('+fn.toString()+')(__arg)');},
 async waitForTimeout(ms){m.N.game.dbg.simuler(ms/1000);draw();},
 async screenshot(){draw();},
 touchscreen:{async tap(x,y){m.c.__tap={x:x/m.N.gfx.PX,y:y/m.N.gfx.PX,t0:0,t1:0};m.run('N.S.input.taps.push(__tap);N.game.dbg.simuler(0.025);N.S.input.taps.length=0;');}},
 mouse:{async click(x,y){await page.touchscreen.tap(x,y);}}
};
const chromium={async launch(){init=[];return {async newContext(o){opts=o;return {async newPage(){return page;}}},async close(){}}}};
const devices={'iPhone 13':{}},echecs=[];
let code=fs.readFileSync(ICI+'/../serpents/banc.mjs','utf8');
code=code.replace(/^import .*;\n/gm,'');
code=code.slice(code.indexOf('const arg ='));
code=code.replace("const PROFILS = arg('--profils', 'paysage,portrait,bureau').split(',');",'const PROFILS = profils.split(",");');
// Les dimensions contractuelles de la mission remplacent seulement le profil bureau du banc cloud.
code=code.replace('width: 1280, height: 800','width: 1440, height: 900');
code=code.replace(/const SORTIE = .*;/, 'const SORTIE = ICI+"/cloud-"+mode;');
code=code.replace('const echecs = [], mesures = {};','');
code=code.replace(/function verifie\(ok, quoi\) \{[^\n]+\}/, 'function verifie(ok,quoi){verdicts.push({ok:!!ok,quoi});if(!ok)echecs.push(quoi);console.log((ok?"ok ":"ECHEC ")+quoi);}');
const a=code.indexOf('async function capture('),b=code.indexOf('async function profil(',a);
code=code.slice(0,a)+`async function capture(){draw();}\n`+code.slice(b);
code=code.replace(/fs.writeFileSync\(`\$\{SORTIE\}\/mesures.json`, JSON.stringify\(mesures, null, 2\)\);/, '');
code=code.replace(/process.exit\(echecs.length \? 1 : 0\);/, '');
// Journal brut des verdicts et états, sans jamais annoncer une capture navigateur.
await new (Object.getPrototypeOf(async function(){}).constructor)('fs','chromium','devices','profils','mesures','ICI','mode','draw','verdicts','echecs',code)(fs,chromium,devices,profils,mesures,ICI,mode,draw,verdicts,echecs);
fs.writeFileSync(ICI+'/cloud-'+mode+(raccord?'-raccords':process.argv.includes('--schemas')?'-schemas':'')+'.json',JSON.stringify({limite:'VM sans DOM ; assertions cloud, pas de captures ni de validation Safari',verdicts,mesures,erreursConsole:m.erreurs},null,2));
if(echecs.length||m.erreurs.length)process.exitCode=1;

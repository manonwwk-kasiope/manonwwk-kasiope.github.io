'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{webkit}=require('playwright');
const rows=require('./pouls.json'),base=__dirname,rate=24000;
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
function oracle(row){
  const file=path.join(base,'../../audio',row.track);
  const raw=execFileSync('ffmpeg',['-v','error','-nostdin','-i',file,'-ss',String(row.loopStart-.065),'-t','0.36',
    '-ac','2','-ar',String(rate),'-f','f32le','-']);
  const samples=new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length));
  assert.equal(samples.length,Math.round(.36*rate)*2);
  const channels=[0,1].map(ch=>{
    let sum=0,peak=0,n=0;for(let i=Math.round(.065*rate);i<Math.round(.225*rate);i++){
      const x=samples[2*i+ch];sum+=x*x;n++;peak=Math.max(peak,Math.abs(x));}
    return {rms:Math.sqrt(sum/n),peak};
  });
  assert(channels.every(c=>c.rms>.005 && c.peak>.02));
  return {raw,report:{year:row.year,mp3Sha256:sha(fs.readFileSync(file)),pcmSha256:sha(raw),channels}};
}
function actualForgeShot(core,mod){
  const forge=require('../../forge.js'),s={status:'playing',width:30,height:20,snake:[{x:8,y:8}],direction:{x:1,y:0}};
  forge.init(s,{core,mod});const events=[];
  forge.update(s,1/120,{plane:()=>0,targets:()=>[],emit:(type,info)=>events.push({type,...info})});
  const shot=events.find(e=>e.type==='forgeShot');assert(shot && shot.mod===mod);return shot;
}
function guards(){
  const forbidden=[];
  const deny=name=>function(){forbidden.push(name);throw Error(name+' désactivé');};
  for(const key of ['Audio','AudioContext','webkitAudioContext'])Object.defineProperty(globalThis,key,{value:deny(key),configurable:false});
  Object.defineProperty(HTMLMediaElement.prototype,'play',{value:deny('HTMLMediaElement.play'),configurable:false});
  for(const property of ['src','srcObject','autoplay'])Object.defineProperty(HTMLMediaElement.prototype,property,
    {get:()=>property==='autoplay'?false:null,set:deny('HTMLMediaElement.'+property),configurable:false});
  Object.defineProperty(HTMLMediaElement.prototype,'load',{value:deny('HTMLMediaElement.load'),configurable:false});
  const create=document.createElement.bind(document);
  document.createElement=(name,...args)=>/^(audio|video)$/i.test(name)?deny('mediaElement')():create(name,...args);
  globalThis.__offlineGuards={forbidden};
}
function guardSelfTest(){
  const vm=require('node:vm'),env={document:{createElement:name=>({name})},HTMLMediaElement:class {},
    OfflineAudioContext:class OfflineAudioContext {}};
  vm.runInNewContext('('+guards.toString()+')()',env);
  const attacks=['new AudioContext()','new webkitAudioContext()','new Audio()',
    'new HTMLMediaElement().play()','new HTMLMediaElement().load()',
    'new HTMLMediaElement().src="silence.mp3"','new HTMLMediaElement().autoplay=true',
    'document.createElement("audio")','document.createElement("video")'];
  for(const expression of attacks)assert.throws(()=>vm.runInNewContext(expression,env),/désactivé/);
  assert.equal(vm.runInNewContext('new OfflineAudioContext().constructor.name',env),'OfflineAudioContext');
  return {blocked:attacks.length,offlineConstructorIntact:true};
}
const tolerances={decoderCorrelationMin:.75,decoderAlignmentSearchMs:55,decoderRmsDeltaMaxDb:2,
  playerCorrelationMin:.85,playerRmsDeltaMaxDb:2,musicRmsMin:.002,fxDifferenceRmsMin:.0008,
  baselineDifferenceRmsMax:.00001,postStopRmsMax:.00001,tailMaxMs:40,peakLimit:1};
function validate(r){
  const errors=[];
  function ok(value,text){if(!value)errors.push(text);}
  ok(r.nativeType==='AudioBuffer'&&r.decodes===1&&r.channelsDecoded===2&&r.rate===rate,'Décodage stéréo natif');
  ok(r.sourceCount===6&&r.musicSources.length===1,'Une musique et cinq effets après regroupement');
  ok(r.status.paused===true&&r.status.playingMusic===false,'Transport arrêté');
  r.channels.forEach((c,i)=>{
    const label=' canal '+i;
    ok(c.oracle.correlation>=tolerances.decoderCorrelationMin && Math.abs(c.oracle.rmsDeltaDb)<=2,'Oracle PCM'+label);
    ok(c.musicMatch.correlation>=.85&&Math.abs(c.musicMatch.rmsDeltaDb)<=2&&c.music.rms>.002,'Passage MP3 dans le graphe'+label);
    ok(c.windows.before.rms<1e-5,'Silence du résidu avant évènement'+label);
    for(const k of ['boss','surge','hits','volley'])ok(c.windows[k].rms>.0008,'Énergie différentielle '+k+label);
    ok(c.catalyst.rms>.0008,'Catalyseur vs même noyau historique'+label);
    ok(c.afterStop.rms<1e-5&&c.tailMs<=40,'Interruption'+label);
    ok(c.output.peak<1 && !c.output.clipped,'Marge de crête'+label);
  });
  return errors;
}
async function main(){
  const mode=process.argv[2];if(!['--oracle','--webkit'].includes(mode)) throw Error('Choisir --oracle ou --webkit');
  const refs=rows.map(oracle);
  const metadata={rate,guardSelfTest:guardSelfTest(),ffmpeg:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],
    playwright:require('playwright/package.json').version,available:fs.existsSync(webkit.executablePath()),tolerances,files:refs.map(x=>x.report)};
  fs.writeFileSync(path.join(base,'hors-sortie.oracle.json'),JSON.stringify(metadata,null,2)+'\n');
  if(mode==='--oracle'){console.log(metadata.files.map(x=>[x.year,x.channels.map(y=>y.rms.toFixed(4))]));return;}
  const browser=await webkit.launch({headless:true});
  const blocked=[],result={status:'en cours',engine:browser.version(),checks:[],blocked,forbidden:[],thresholds:tolerances};
  let browserContext;
  try{
    browserContext=await browser.newContext({offline:true,serviceWorkers:'block',permissions:[]});
    await browserContext.route('**/*',route=>{blocked.push(route.request().url());return route.abort('blockedbyclient');});
    await browserContext.addInitScript(guards);
    for(let i=0;i<rows.length;i++){
      const row=rows[i],page=await browserContext.newPage();
      try{
        await page.goto('about:blank');await page.evaluate(()=>{if(!window.__offlineGuards)throw Error('Garde non installée');});
        for(const f of ['horloge.js','priorites.js'])await page.addScriptTag({content:fs.readFileSync(path.join(base,f),'utf8')});
        const player=fs.readFileSync(path.join(base,'bande-campagne.js'),'utf8');
        await page.addScriptTag({content:'{const module={exports:{}};\n'+player+'\nwindow.__playerFactory=module.exports;}'});
        await page.addScriptTag({content:fs.readFileSync(path.join(base,'hors-sortie.js'),'utf8')});
        const data={row,shot:actualForgeShot(['orbit','prism','well','well','orbit'][i],['echo','chain','blast','chain','blast'][i]),signature:['comb','ricochet','train','moons','echo'][i],reference:refs[i].raw.toString('base64'),
          mp3:fs.readFileSync(path.join(base,'../../audio',row.track)).toString('base64')};
        const actual=await page.evaluate(async data=>{
          let timer;
          try{return await Promise.race([horsSortie.evaluateTrack(data),new Promise((_,reject)=>{
            timer=setTimeout(()=>reject(Error('Délai hors ligne dépassé')),45000);})]);}
          finally{clearTimeout(timer);}
        },data);
        actual.errors=validate(actual);result.checks.push(actual);
        console.log(row.year,actual.mode,JSON.stringify(actual.errors));
        result.forbidden.push(...await page.evaluate(()=>window.__offlineGuards.forbidden));
      }finally{await page.close();}
    }
    result.status=result.checks.length===5&&result.checks.every(c=>!c.errors.length)&&!blocked.length&&!result.forbidden.length?'validé':'à corriger';
  }catch(err){result.status='erreur';result.error=String(err);throw err;}
  finally{
    await browserContext?.close();await browser.close();
    fs.writeFileSync(path.join(base,'hors-sortie.webkit.json'),JSON.stringify(result,null,2)+'\n');
  }
  assert.equal(result.status,'validé');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

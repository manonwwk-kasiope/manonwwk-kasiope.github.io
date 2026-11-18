'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),root=__dirname,out=path.join(root,'corpus');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
  const cache=path.join(os.homedir(),'Library/Caches/ms-playwright');
  const name=fs.readdirSync(cache).filter(n=>/^chromium_headless_shell-\d+$/.test(n)).sort().at(-1);
  const executablePath=path.join(cache,name,'chrome-mac','headless_shell');
  const browser=await chromium.launch({headless:true,executablePath,args:['--mute-audio','--disable-background-networking']});
  try{
    fs.mkdirSync(out,{recursive:true});
    const ctx=await browser.newContext({viewport:{width:568,height:260},deviceScaleFactor:1});
    const origin='http://perception.test',game=path.resolve(root,'../..');
    await ctx.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==origin)return route.abort();
      const local=path.resolve(game,'.'+decodeURIComponent(url.pathname));
      if(!local.startsWith(game+path.sep)||!fs.existsSync(local))return route.abort();
      return route.fulfill({path:local});
    });
    await ctx.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};window.AudioContext=window.webkitAudioContext=undefined;});
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const inputs=['../../forge.js','../moteur.js','../mondes/mondes.js','../sprites/sprites.js','../artillerie/artillerie.js','../spectacle.js','../animation-boss/animation.js','../campagne/matieres.js','../endurance/phosphore/lisibilite.js','../locomotion/locomotion.js','../surcharges/surcharges.js','../surcharges/effets.js',...fs.readdirSync(path.join(root,'../campagne/decors')).filter(f=>f.endsWith('.webp')).map(f=>'../campagne/decors/'+f),'source.html','corpus.js'];
    const hashes=()=>Object.fromEntries(inputs.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));
    const sources=hashes(),rows=[];
    await page.goto(origin+'/labo/perception/source.html');
    const ready=await page.evaluate(()=>Promise.all([1985,1995,2185,2985].map(y=>SnakeMatieres.load(y))));
    if(!ready.every(Boolean))throw Error('Décors peints incomplets');
    for(const test of [false,true])for(const year of [1976,1985,1995,2185,2985])for(let i=0;i<(test?15:11);i++){
      const width=test?[568,852][i%2]:[540,700][i%2];await page.setViewportSize({width,height:Math.round(width*440/960)});
      const variants=test&&[0,1,2,5,6].includes(i)?['normal','sans-palette','sans-fx','sans-corps','sans-hors-plan']:['normal'];
      for(const a of variants){
        const {png,label}=await page.evaluate(args=>perceptionRender(...args),[year,i,test,a]);
        const id=sha(Buffer.from([test?'hold':'cal',year,i,a].join('#'))).slice(0,16);
        fs.writeFileSync(path.join(out,id+'.png'),Buffer.from(png,'base64'));
        rows.push({id,...label});
      }
    }
    if(errors.length)throw Error(errors.join('\n'));
    if(JSON.stringify(hashes())!==JSON.stringify(sources))throw Error('Sources modifiées pendant la capture');
    fs.writeFileSync(path.join(root,'annotations.json'),JSON.stringify(rows)+'\n');
    fs.writeFileSync(path.join(root,'sources.json'),JSON.stringify(sources,null,2)+'\n');
    console.log('Images du jeu :',rows.length);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

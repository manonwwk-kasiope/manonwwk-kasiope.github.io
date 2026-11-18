'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const dir=__dirname,lab=path.dirname(dir),game=path.dirname(lab),assets=new Map(),hashes={};
const archive=path.join(dir,'releves','sources-mesurees.json.gz');
const frozen=!process.argv.includes('--actuel')&&fs.existsSync(archive)?JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(archive))):null;
function read(name,file){const src=frozen?.[name]??fs.readFileSync(file,'utf8');hashes[name]=crypto.createHash('sha256').update(src).digest('hex');assets.set(name,src);return src;}
const source=read('spectacle.js',path.join(lab,'spectacle.js')),mondes=read('mondes.js',path.join(lab,'mondes/mondes.js'));
function change(text,from,to){assert(text.includes(from),from);return text.replace(from,to);}
let low=change(source,'const w=Math.round((canvas.clientWidth||W)*dpr),h=Math.round((canvas.clientHeight||H)*dpr);','const w=canvas.width,h=canvas.height;');
low=change(low,'window.SnakeSpectacle=','window.LogicalSpectacle=');
low=change(low,'window.SnakeMondes?.finish?.(canvas,s.year);','');
assets.set('logical.js',low);
const start=mondes.indexOf('    let stage=stages.get(canvas);'),end=mondes.indexOf('    const img=c.getImageData',start);
assert(start>0&&end>start);
let m=mondes.slice(0,start)+"    const stage={el:canvas,ctx:canvas.getContext('2d')}, c=stage.ctx;\n"+mondes.slice(end);
m=change(m,'function finish(canvas,year)','function finish(canvas,year,destination)');
m=change(m,"const out=canvas.getContext('2d');","const out=destination.getContext('2d');");
m=change(m,'out.drawImage(stage.el,0,0,canvas.width,canvas.height);','out.drawImage(stage.el,0,0,destination.width,destination.height);');
m=change(m,'window.SnakeMondes=','window.LogicalMondes=');
assets.set('logical-mondes.js',m);
for(const [name,file] of Object.entries({'moteur.js':path.join(lab,'moteur.js'),'forge.js':path.join(game,'forge.js'),'vol.js':path.join(game,'vol-libre.js'),'indices.js':path.join(lab,'lecture/arbitre.js'),'gardiens.js':path.join(lab,'gardiens/gardiens.js'),'essai.js':path.join(dir,'essai.js')}))read(name,file);
const names=['mondes.js','spectacle.js','logical-mondes.js','logical.js','vol.js','forge.js','gardiens.js','indices.js','moteur.js','essai.js'];
assets.set('index.html','<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#111321}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'+names.map(n=>'<script src="'+n+'"></script>').join(''));
(async()=>{
 const short=process.argv.includes('--smoke'),folder=path.join(dir,short?'smoke':'releves');
 fs.mkdirSync(folder,{recursive:true});const log=path.join(folder,'blocs.jsonl');fs.writeFileSync(log,'');fs.writeFileSync(path.join(folder,'gc.jsonl'),'');
 const browser=await chromium.launch({headless:true,args:['--mute-audio','--disable-background-timer-throttling','--enable-precise-memory-info']});
 try{
  const ctx=await browser.newContext({viewport:{width:740,height:328},deviceScaleFactor:2,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();
  await page.addInitScript(()=>{
    window.audioAttempts=0;
    for(const k of ['AudioContext','webkitAudioContext','OfflineAudioContext','webkitOfflineAudioContext','Audio'])Object.defineProperty(window,k,{value:function(){window.audioAttempts++;throw Error('Audio neutralisé');},configurable:false});
    HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;window.audioAttempts++;return Promise.resolve();};
  });
  await page.route('**/*',r=>{const {origin,pathname}=new URL(r.request().url()),name=pathname.slice(1);if(origin==='http://endurance.invalid'&&assets.has(name))return r.fulfill({contentType:name.endsWith('.js')?'text/javascript':'text/html',body:assets.get(name)});return r.abort();});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://endurance.invalid/index.html');const cdp=await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const env={start:new Date().toISOString(),platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0].model,browser:browser.version(),hashes,secondsPerBlock:short?2.4:24,passes:short?1:4,screenDPR:2,errors};
  fs.writeFileSync(path.join(folder,'session.json'),JSON.stringify(env,null,2));
  const years=[1976,1985,1995,2185,2985];
  for(let pass=0;pass<env.passes;pass++){
   const size=pass%2?{width:568,height:284}:{width:740,height:328};await page.setViewportSize(size);
   for(const [k,year] of years.entries()){
    const order=(pass+k)%2?['logique','dpr2']:['dpr2','logique'];
    for(const mode of order){
      const res=await page.evaluate(o=>window.trial(o),{year,mode,seconds:env.secondsPerBlock,pass});
      const heap=await cdp.send('Runtime.getHeapUsage'), mem=await cdp.send('Memory.getDOMCounters');
      const line={pass,year,mode,size,ended:new Date().toISOString(),...res,heap,mem};
      fs.appendFileSync(log,JSON.stringify(line)+'\n');console.log([line.ended,pass,year,mode,res.totalFrames,Math.round(heap.usedSize/1048576)+' MiB'].join(' '));
      assert(!errors.length,errors.join('\n'));assert.equal(res.audioAttempts,0);
    }
   }
   const gcBefore=await cdp.send('Runtime.getHeapUsage');await cdp.send('HeapProfiler.collectGarbage');const gcAfter=await cdp.send('Runtime.getHeapUsage');
   fs.appendFileSync(path.join(folder,'gc.jsonl'),JSON.stringify({pass,gcBefore,gcAfter,date:new Date().toISOString()})+'\n');
  }
  for(const width of [568,740]){
   await page.setViewportSize({width,height:width===568?284:328});
   for(const year of years)for(const mode of ['dpr2','logique']){
    const data=await page.evaluate(o=>window.photo(o),{year,mode});
    fs.writeFileSync(path.join(folder,width+'-'+year+'-'+mode+'.png'),Buffer.from(data.split(',')[1],'base64'));
  }
  }
  env.end=new Date().toISOString();fs.writeFileSync(path.join(folder,'session.json'),JSON.stringify(env,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=__dirname,game=path.resolve(root,'../..'),origin='http://perception.test',out=path.join(root,'paires');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const originalHashes=require('./sources.json');
const inputs=[...Object.keys(originalHashes),'marquage.js','comparer-marquage.cjs'];
const captureHashes=()=>Object.fromEntries(inputs.map(f=>[f,sha(fs.readFileSync(path.resolve(root,f)))]));
(async()=>{
  const hashes=captureHashes();
  const cache=path.join(os.homedir(),'Library/Caches/ms-playwright');
  const rel=fs.readdirSync(cache).filter(n=>/^chromium_headless_shell-\d+$/.test(n)).sort().at(-1);
  const browser=await chromium.launch({headless:true,executablePath:path.join(cache,rel,'chrome-mac','headless_shell'),args:['--mute-audio','--disable-background-networking']});
  try{
    fs.mkdirSync(out,{recursive:true});
    const ctx=await browser.newContext({viewport:{width:568,height:260},deviceScaleFactor:1});
    await ctx.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){this.volume=0;this.muted=true;return Promise.resolve();};window.AudioContext=window.webkitAudioContext=undefined;});
    await ctx.route('**/*',route=>{
      const url=new URL(route.request().url()),p=path.resolve(game,'.'+decodeURIComponent(url.pathname));
      if(url.origin!==origin||!p.startsWith(game+path.sep)||!fs.existsSync(p))return route.abort();
      if(p===path.join(root,'source.html'))return route.fulfill({contentType:'text/html',body:fs.readFileSync(p,'utf8').replace('<script src="corpus.js">','<script src="marquage.js"></script><script src="corpus.js">')});
      if(p===path.resolve(root,'../spectacle.js')){
        const code=fs.readFileSync(p,'utf8'),anchor='if(points.length)serpent(c,s,cam,points,points[0].plane,true);';
        if(!code.includes(anchor))throw Error('Ancrage réel de la tête introuvable');
        return route.fulfill({contentType:'text/javascript',body:code.replace(anchor,`
          const cue=SnakeMarquage.choose(s);
          window.lastCue={cell:!!cue.cell,walls:cue.walls.length};
          if(window.perceptionMark)SnakeMarquage.draw(c,s,cam,project,{time,reduced});
          `+anchor)});
      }
      if(p===path.join(root,'corpus.js')){
        // A legitimate campaign cell cannot spawn inside the same-plane body.
        const needle='const headAbsent=i%11===10;';
        const code=fs.readFileSync(p,'utf8');if(!code.includes(needle))throw Error('État source introuvable');
        const repair=`for(const c of s.cells.filter(c=>c.plane===s.plane)){
          if(!s.snake.some(p=>p.plane===c.plane&&Math.hypot(p.x-c.x,p.y-c.y)<.9))continue;
          const room=dirs.map(([a,b])=>pt(head.x+a*3,head.y+b*3,c.plane)).find(q=>!s.snake.some(p=>p.plane===q.plane&&Math.hypot(p.x-q.x,p.y-q.y)<1.1)&&!s.cells.some(p=>p!==c&&p.plane===q.plane&&p.x===q.x&&p.y===q.y));
          if(room){c.x=room.x;c.y=room.y;}
        }`;
        return route.fulfill({contentType:'text/javascript',body:code.replace(needle,repair+needle)});
      }
      return route.fulfill({path:p});
    });
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/labo/perception/source.html');
    const ready=await page.evaluate(()=>Promise.all([1985,1995,2185,2985].map(y=>SnakeMatieres.load(y))));
    if(!ready.every(Boolean))throw Error('Peintures absentes');
    const rows=[];
    for(const year of [1976,1985,1995,2185,2985]){
      const cases=year===1976?[15,20,25,30,40,45,50,55,16,23,28,29]:[16,17,20,24,28,30];
      for(const i of cases){
        const width=[568,852][i%2];await page.setViewportSize({width,height:Math.round(width*440/960)});
        for(const marked of [false,true]){
          const {png,label,cue}=await page.evaluate(([y,n,on])=>{window.perceptionMark=on;return {...perceptionRender(y,n,true),cue:window.lastCue};},[year,i,marked]);
          const id=sha(Buffer.from([year,i,marked,'marquage'].join('#'))).slice(0,16);
          const data=Buffer.from(png,'base64');fs.writeFileSync(path.join(out,id+'.png'),data);
          rows.push({id,marked,sha:sha(data),cue,...label});
        }
      }
    }
    if(errors.length)throw Error(errors.join('\n'));if(JSON.stringify(hashes)!==JSON.stringify(captureHashes()))throw Error('Sources changées pendant la collecte');
    fs.writeFileSync(path.join(root,'annotations-paires.json'),JSON.stringify(rows)+'\n');fs.writeFileSync(path.join(root,'sources-paires.json'),JSON.stringify(hashes,null,2)+'\n');
    console.log('Paires :',rows.length/2);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

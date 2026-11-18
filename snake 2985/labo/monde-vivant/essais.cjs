'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Monde');
const lab=path.resolve(__dirname,'..'),ctx=vm.createContext({URL,Image:class extends Image{set src(url){super.src=fs.readFileSync(path.join(lab,'campagne/decors',url.split('/').pop()));}},document:{baseURI:'https://fixture.local/',createElement:()=>createCanvas(300,150)},devicePixelRatio:1});
ctx.window=ctx;function load(f){vm.runInContext(fs.readFileSync(path.join(lab,f),'utf8'),ctx,{filename:f});}
for(const f of ['../forge.js','../vol-libre.js','moteur.js','rythme/directeur.js','mondes/mondes.js','campagne/matieres.js','spectacle.js','monde-vivant/monde.js'])load(f);
const {SnakeMondeVivant:live,SnakeMondes:world,SnakeMatieres:paint,SnakeSpectacle:scene,SnakeDirector:director,SnakeArcade:game,SnakeFlight:flight}=ctx;
function setup(year){
  const s=game.create(()=>.31,year);s.drones=[];s.spawnClock=99;s.director=director.create();live.observe(s);
  const record=()=>{for(const e of s.events.splice(0))live.observe(s,e);live.observe(s);};
  if(year===1976){
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[1,0],[0,1]]){
      assert(game.turn(s,dx,dy));
      for(let i=0;i<20&&s.turns.length;i++){game.tick(s,1/60);record();}
      assert.equal(s.turns.length,0);
    }
  }else if(year===1985||year===1995){
    for(let i=0;i<200&&s.director.phase!=='active';i++){s.elapsed+=1/60;director.tick(s.director,s,1/60);}
    assert.equal(s.director.phase,'active');
    if(year===1985){
      const o=s.director.offer;assert.equal(o.kind,'mue');
      s.snake[0]={...o.anchors[0]};director.tick(s.director,s,.02);
      s.plane=1-s.plane;s.snake[0]={...o.anchors[1]};director.tick(s.director,s,.02);
      assert.equal(s.director.chain,1);
    }else{
      const o=s.director.offer;assert.equal(o.kind,'aiguillage');
      s.snake[0]={...o.anchors[0]};director.tick(s.director,s,.02);
      s.snake[0]={...o.anchors[1]};director.tick(s.director,s,.02);
      assert.equal(o.step,2);
    }
  }else if(year===2185){
    s.flightGate={...s.snake[0]};assert(flight.enter(s));let passed=0;
    for(let i=0;i<450&&passed<3;i++){
      const ring=s.flight.rings[s.flight.passed],h=s.snake[0];
      flight.aim(s,ring.x-h.x,ring.y-h.y);flight.step(s,1/60);s.elapsed+=1/60;
      for(const e of s.events.splice(0)){if(e.type==='flightRing')passed++;live.observe(s,e);}
    }
    assert.equal(passed,3);s.elapsed+=.2;
  }else{assert(game.fire(s));assert(s.events.some(e=>e.type==='nova'));record();s.elapsed+=.18;}
  return s;
}
function render(s,t,reduced,enabled){
  const cv=createCanvas(960,440),c=cv.getContext('2d'),cam=scene.camera(s,t,reduced);cam.nearBoss=s.nearBoss||0;
  if(!paint.draw(c,s.year,t,cam,reduced))world.draw(c,s.year,t,cam,reduced);
  if(enabled)live.draw(c,s,cam,t,reduced);
  world.finish(cv,s.year);return cv;
}
const pixels=cv=>cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
function difference(a,b){
  const pa=pixels(a),pb=pixels(b);let count=0,minX=a.width,maxX=-1,minY=a.height,maxY=-1;
  for(let i=0;i<pa.length;i+=4)if(pa[i]!==pb[i]||pa[i+1]!==pb[i+1]||pa[i+2]!==pb[i+2]){
    count++;const x=i/4%a.width,y=Math.floor(i/4/a.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
  return {count,minX,maxX,minY,maxY};
}
async function main(){
  const sheet=createCanvas(990,724),c=sheet.getContext('2d'),results=[];
  c.fillStyle='#10151a';c.fillRect(0,0,990,724);c.fillStyle='#f4e7cc';c.font='bold 19px Monde';c.fillText('Les horizons répondent aux commandes',14,26);
  c.font='15px Monde';c.fillText('A   Horizon témoin',18,52);c.fillText('B   Réponse du décor',510,52);
  const specs=[
    [1976,'Virages enregistrés sur la seconde voie du tube',[482,67,192,43]],
    [1985,'Une liaison réussie, une bande au relais du convoi',[0,49,193,44]],
    [1995,'Aiguille enclenchée, branche franchie et position du train',[589,62,148,34]],
    [2185,'Troisième anneau franchi, module en cours de pose',[508,49,153,36]],
    [2985,'Nova émise, bord lumineux du disque d’accrétion',[497,36,280,65]]];
  for(const [i,[year,label,crop]] of specs.entries()){
    if(year!==1976)assert(await paint.load(year));
    const s=setup(year),t=s.elapsed,resultsEra=[];
    for(const reduced of [false,true]){
      const a=render(s,t,reduced,false),b=render(s,t,reduced,true),diff=difference(a,b);
      assert(diff.count>8);assert(diff.maxY<=114);assert(diff.count<3900);
      if(reduced)assert.equal(difference(b,render(s,t+3,true,true)).count,0);
      if(!reduced){
        const y=62+i*131;c.fillStyle='#e2e6e5';c.font='16px Monde';c.fillText(year+'   '+label,18,y+18);
        c.imageSmoothingEnabled=false;
        for(const [col,src] of [a,b].entries())c.drawImage(src,...crop,16+col*491,y+27,468,100);
      }
      resultsEra.push({reduced,...diff});
    }
    const isolated={};
    const snapshot=()=>render(s,s.elapsed,true,true);
    if(year===1995){
      const offer=s.director.offer,before=snapshot();
      [offer.anchors[1],offer.anchors[3]]=[offer.anchors[3],offer.anchors[1]];
      isolated.brancheInversee=difference(before,snapshot()).count;
      s.director.offer=null;
      assert.equal(difference(snapshot(),render(s,s.elapsed,true,false)).count,0);
    }
    if(year===2185){
      const pose=snapshot();s.elapsed+=2;
      assert.equal(difference(pose,snapshot()).count,0);
      s.elapsed-=2;
      const cam=scene.camera(s,s.elapsed,false);
      const layer=()=>{const cv=createCanvas(960,440);live.draw(cv.getContext('2d'),s,cam,0,false);return cv;};
      const suspended=layer();s.elapsed+=1;
      isolated.deplacementDuCrochet=difference(suspended,layer()).count;
    }
    if(year===2985){
      s.elapsed+=2;assert.equal(difference(snapshot(),render(s,s.elapsed,true,false)).count,0);
      s.boss={hp:20,maxHp:20};const full=snapshot();s.boss.hp=5;
      isolated.forceGardien=difference(full,snapshot()).count;
    }
    for(const count of Object.values(isolated))assert(count>8);
    results.push({year,afterPalette:resultsEra,isolated});
  }
  fs.writeFileSync(path.join(__dirname,'planche.png'),sheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify(results,null,2)+'\n');
  console.log(results.map(r=>[r.year,...r.afterPalette.map(m=>m.count)]));
}
main().catch(e=>{console.error(e);process.exitCode=1;});

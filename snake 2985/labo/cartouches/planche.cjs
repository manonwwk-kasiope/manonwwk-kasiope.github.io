'use strict';
const path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createCanvas,loadImage,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
for(const family of ['Arial','Georgia','Courier New']){
  const file='/System/Library/Fonts/Supplemental/'+family+' Bold.ttf';
  if(fs.existsSync(file))GlobalFonts.registerFromPath(file,family);
}
global.OffscreenCanvas=function(w,h){return createCanvas(w,h);};
const sprites=require('../sprites/sprites.js'),cards=require('./cartouches.js'),years=[1976,1985,1995,2185,2985];
const names=['ÉLÈNE DES ÉTOILES XX','WWWWWWWWWWWWWWWWWWWW','ÎLE AUX CYGNES N° 27','ÀÉÎÖÙ'.repeat(4)];
async function main(){
  const proof=[],board=createCanvas(1200,996),b=board.getContext('2d');b.fillStyle='#111827';b.fillRect(0,0,1200,996);
  for(const [i,year] of years.entries()){
    const img=await loadImage(path.join(__dirname,'../bifurcation/paysage-'+year+'.webp'));
    for(const [j,name] of names.entries()){
      assert.equal(Array.from(name).length,20);
      const row={name,year,difficulty:10,score:Number.MAX_SAFE_INTEGER,cleared:true};
      assert(cards.compatible(row));
      const cv=createCanvas(cards.width,cards.height),c=cv.getContext('2d');
      const metrics=cards.draw(c,row,img,sprites);
      for(const m of metrics){
        assert(m.left>=0&&m.right<=cards.width&&m.bottom<=cards.height&&m.top>=0,m.str);
        assert(m.right<=m.x+m.w && m.left>=m.x-5,m.str);
      }
      const overlaps=metrics.flatMap((a,i)=>metrics.slice(i+1).filter(b=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom));
      assert.equal(overlaps.length,0);
      proof.push({year,name,score:row.score,minFont:Math.min(...metrics.map(m=>m.size)),pilotFont:metrics.find(m=>m.str===name).size,scoreFont:metrics.find(m=>m.str===new Intl.NumberFormat('fr-FR').format(row.score)).size,textOverlap:overlaps.length});
      if(j===0){
        const x=i===4?306:(i%2)*600+6,y=Math.floor(i/2)*332+7;
        b.drawImage(cv,x,y,588,318.5);
      }
    }
  }
  fs.writeFileSync(path.join(__dirname,'planche.png'),board.toBuffer('image/png'));
  fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(proof.length+' cartes ; tailles minimales (pilote, points)',Math.min(...proof.map(r=>r.pilotFont)),Math.min(...proof.map(r=>r.scoreFont)));
}
main().catch(e=>{console.error(e);process.exitCode=1;});

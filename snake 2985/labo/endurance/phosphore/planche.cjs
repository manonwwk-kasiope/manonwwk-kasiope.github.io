'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),__dirname]}));
(async()=>{
 const shots=[['double','Double encre'],['adaptative','Hachures adaptatives'],['groupe','Bord de groupe et repères']];const w=1260,h=658,cv=createCanvas(w,h),c=cv.getContext('2d');
 c.fillStyle='#101722';c.fillRect(0,0,w,h);c.font='bold 34px Helvetica';c.fillStyle='#edf1e9';c.fillText('1976 · trois télégraphes en quatre teintes',28,54);
 c.fillStyle='#b1c1c5';c.font='19px Helvetica';c.fillText('Même salve de banques de mémoire, même tête, mêmes armes et marqueurs de mission.',28,90);
 for(const [i,[key,label]] of shots.entries()){
   const x=18+i*414,img=await loadImage(path.join(__dirname,key+'.png'));c.fillStyle='#dbeeb4';c.font='bold 21px Helvetica';c.fillText(label,x,137);
   c.imageSmoothingEnabled=false;c.drawImage(img,0,0,img.width,img.height,x,154,406,180);
   c.drawImage(img,392,290,525,286,x,351,406,222);
 }
 c.fillStyle='#b1c1c5';c.font='18px Helvetica';c.fillText('En haut, le plateau. En bas, agrandissement du passage entre la tête et le gardien.',28,619);
 fs.writeFileSync(path.join(__dirname,'comparaison.png'),cv.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1;});

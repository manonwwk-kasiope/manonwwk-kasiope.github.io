'use strict';
// Assemble une distribution panoramique isolée à partir des modules utilisés par la chambre.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),lab=path.join(root,'labo/campagne');
const dest=process.argv[2];
if(!dest||!path.isAbsolute(dest))throw new Error('Indiquer un dossier absolu de sortie.');
fs.mkdirSync(dest,{recursive:true});
if(fs.readdirSync(dest).length)throw new Error('Employer un dossier de sortie vide pour isoler chaque édition.');
const read=(dir,name)=>fs.readFileSync(path.join(dir,name),'utf8');
const store=(name,s)=>fs.writeFileSync(path.join(dest,name),s);
const hash=files=>{
  const h=crypto.createHash('sha256');
  for(const file of files)h.update(file).update(fs.readFileSync(path.join(dest,file)));
  return h.digest('hex').slice(0,16);
};
let html=read(lab,'index.html');
const js=[],styles=[];
html=html.replace(/<script src="([^"]+)" defer><\/script>\n?/g,(_,name)=>{js.push(name);return '';});
html=html.replace(/<link rel="stylesheet" href="([^"]+)">\n?/g,(_,name)=>{styles.push(name);return '';});
if(!js.length||!styles.length)throw new Error('Chambre sans scripts ou styles.');
const audio=fs.readdirSync(path.join(root,'audio')).filter(n=>n.endsWith('.mp3')).sort().map(n=>'audio/'+n);
const bundle=js.map(name=>read(lab,name)).join('\n;\n');
store('arcade.js',bundle);
store('arcade.css',styles.map(name=>read(lab,name)).join('\n'));
const stamp=hash(['arcade.js','arcade.css']);
html=html.replace('Snake 2985 · Chambre des deux mondes','SNAKE 2985 · Arcade synthwave').replace('</head>',`
<link rel="manifest" href="./app.webmanifest">
<link rel="icon" href="icone.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="stylesheet" href="arcade.css?v=${stamp}">
<script defer src="arcade.js?v=${stamp}" data-music-root="audio/"></script>
</head>`).replace('</body>',`<script>
if(window.isSecureContext && location.protocol!=='file:' && 'serviceWorker' in navigator){
  const replacing=Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(replacing && document.body.dataset.screen==='prep' && !document.querySelector('dialog[open]'))location.reload();
  },{once:true});
  addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{}));
}
</script>
</body>`);
store('index.html',html);
const originals=['app.webmanifest','apple-touch-icon.png','icone.svg','icone-192.png','icone-512.png',...audio];
for(const n of originals){fs.mkdirSync(path.dirname(path.join(dest,n)),{recursive:true});fs.copyFileSync(path.join(root,n),path.join(dest,n));}
fs.copyFileSync(path.join(lab,'jaquette.webp'),path.join(dest,'jaquette.webp'));
const files=['index.html','arcade.js','arcade.css','jaquette.webp',...originals];
const edition=hash(files);
const worker=read(root,'sw.js').replace(/const version = prefix \+ "[^"]+";/,'const version = prefix + "'+edition+'";')
 .replace(/const gameFiles = \[[\s\S]*?\n\];/,'const gameFiles = '+JSON.stringify(files,null,2)+';');
if(!worker.includes(edition)||!worker.includes('"jaquette.webp"'))throw new Error('Gabarit du worker incompatible.');
store('sw.js',worker);
console.log(JSON.stringify({edition,files:files.length+1,scripts:js.length,audio:audio.length,dest}));

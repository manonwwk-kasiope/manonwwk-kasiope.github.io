'use strict';
// Parcours volontaire de la carte, de la pause et du téléchargement sur la vraie distribution.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const {webkit,devices}=require('playwright');
const root=path.resolve(process.argv[2]),prefix='/borne/',assetNames=new Set();
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const route=new URL(req.url,'http://localhost').pathname;
  if(!route.startsWith(prefix)){res.writeHead(404).end();return;}
  const file=path.resolve(root,decodeURIComponent(route.slice(prefix.length))||'index.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  res.setHeader('Content-Security-Policy',"media-src 'none';object-src 'none'");assetNames.add(path.basename(file));
  fs.createReadStream(file).pipe(res);
});
async function run(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port+prefix,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cartouche-png-'));
  let browser;
  try{
    browser=await webkit.launch({headless:true});
    const ctx=await browser.newContext({...devices['iPhone 13 landscape'],viewport:{width:874,height:292},serviceWorkers:'block',acceptDownloads:true});
    await ctx.addInitScript({content:fs.readFileSync(path.resolve(__dirname,'../charge-ios/silence.js'),'utf8')});
    await ctx.route('**/*',r=>r.request().url().startsWith(base)&&!r.request().url().includes('.mp3')?r.continue():r.abort());
    const p=await ctx.newPage(),errors=[];
    p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?muet=1');
    const button=name=>p.getByRole('button',{name,exact:true});
    await button('Carte des époques').tap();
    const carte=p.locator('dialog.voyage-carte[open]'),tabs=carte.getByRole('tab'),evidence=[];
    for(const [i,y] of [1976,1985,1995,2185,2985].entries()){
      await tabs.nth(i).tap();
      const play=carte.locator('.vc-apercu'),screen=carte.locator('.vc-extrait');
      await play.tap();await screen.waitFor({state:'visible'});
      const first=await screen.evaluate(c=>c.toDataURL());
      await p.waitForFunction(first=>document.querySelector('.vc-extrait').toDataURL()!==first,first,{polling:90,timeout:3000});
      await play.tap();assert.match(await play.innerText(),/Revoir/);
      assert.equal(await carte.locator('.vc-depart').isDisabled(),i>0);
      assert(assetNames.has('apercu-'+y+'.webp'));evidence.push(y);
    }
    await carte.getByRole('button',{name:'Fermer'}).tap();
    await button('Jouer en silence').tap();await button('Pause').tap();
    await button('Reprendre').tap();
    await button('Signer · Palmarès').waitFor({timeout:65000});
    await button('Signer · Palmarès').tap();
    const hall=p.locator('dialog.snake-archives[open]'),signature=hall.locator('form input');
    await signature.fill('PILOTE ÉCHO');await hall.getByRole('button',{name:'Signer',exact:true}).tap();
    assert(await hall.getByText('Signé PILOTE ÉCHO').isVisible());
    const souvenir=hall.getByRole('button',{name:'Carte souvenir',exact:true});await souvenir.tap();
    const link=p.getByRole('link',{name:'Télécharger le PNG'});await link.waitFor({timeout:10000});
    const [download]=await Promise.all([p.waitForEvent('download'),link.tap()]);
    const file=path.join(tmp,download.suggestedFilename());await download.saveAs(file);
    const bytes=fs.readFileSync(file);
    assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),960);assert.equal(bytes.readUInt32BE(20),520);
    await p.locator('dialog[open]').last().getByRole('button',{name:'Fermer'}).tap();
    assert(await souvenir.evaluate(b=>document.activeElement===b));
    const muted=await p.evaluate(()=>({...silence}));assert.equal(muted.media+muted.context,0);assert.deepEqual(errors,[]);
    await ctx.close();
    const desk=await browser.newContext({viewport:{width:480,height:760},serviceWorkers:'block'});
    await desk.addInitScript({content:fs.readFileSync(path.resolve(__dirname,'../charge-ios/silence.js'),'utf8')});
    const wide=await desk.newPage();
    wide.on('pageerror',e=>errors.push(e.message));await wide.goto(base+'?muet=1');
    const rotation=wide.locator('#vertical[open]');
    await rotation.waitFor();assert.equal(await wide.evaluate(()=>matchMedia('(any-pointer:coarse)').matches),false);
    await wide.setViewportSize({width:900,height:480});await rotation.waitFor({state:'hidden'});
    await wide.getByRole('button',{name:'Jouer en silence',exact:true}).click();
    await wide.setViewportSize({width:560,height:560});await rotation.waitFor();
    await wide.setViewportSize({width:900,height:480});await rotation.waitFor({state:'hidden'});
    assert.equal(await wide.evaluate(()=>document.body.dataset.screen),'pause');
    await wide.getByRole('button',{name:'Reprendre',exact:true}).click();
    assert.equal(await wide.evaluate(()=>document.body.dataset.screen),'play');
    assert.deepEqual(await wide.evaluate(()=>({...silence})),{media:0,context:0});assert.deepEqual(errors,[]);
    await desk.close();
    console.log(JSON.stringify({epochs:evidence,lockedPreviews:true,desktopPanorama:true,download:download.suggestedFilename(),dimensions:[960,520],
      pngBytes:bytes.length,pngSha256:crypto.createHash('sha256').update(bytes).digest('hex'),restoredFocus:true,muted,errors},null,2));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});

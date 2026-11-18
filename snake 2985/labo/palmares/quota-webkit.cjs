'use strict';
const {webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function verify(){
  const dist=path.resolve(process.env.CAMPAGNE_DIST);
  const edition=fs.readFileSync(path.join(dist,'sw.js'),'utf8').match(/const version = prefix \+ "([a-f0-9]{16})"/)[1];
  const origin='https://quota.test',browser=await webkit.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:854,height:393},reducedMotion:'reduce',serviceWorkers:'block'});
    await context.route('**/*',r=>{
      const u=new URL(r.request().url()),file=path.resolve(dist,'.'+u.pathname);
      if(u.origin!==origin||!file.startsWith(dist+path.sep)||u.pathname.endsWith('.mp3')||!fs.existsSync(file))return r.abort();
      return r.fulfill({path:file});
    });
    await context.addInitScript({path:path.resolve(__dirname,'../charge-ios/silence.js')});
    await context.addInitScript(()=>{
      window.refus=[];
      const write=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(this!==localStorage)return write.call(this,key,value);
        const err=new DOMException('Quota de test épuisé','QuotaExceededError');
        refus.push({key,name:err.name});throw err;
      };
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    const btn=name=>page.getByRole('button',{name,exact:true});
    const lignes=()=>page.locator('dialog[open] tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.cells,c=>c.textContent)));
    await page.goto(origin+'/index.html?muet=1');
    assert.equal(await page.evaluate(()=>localStorage.length),0);
    await btn('Jouer en silence').click();
    await page.waitForFunction(()=>document.body.dataset.screen==='end',null,{timeout:45000});
    await btn('Signer · Palmarès').click();
    const pilote='PILOTE QUOTA QA';
    await page.locator('dialog[open] input').fill(pilote);
    await btn('Signer').click();
    const signed=await lignes();
    assert.equal(signed.length,1);assert.equal(signed[0][1],pilote);assert.equal(signed[0][2],'1976');
    await btn('Fermer').click();
    await page.getByRole('radio',{name:/^1995,/}).click();await btn('Sauter en 1995').click();
    await page.waitForFunction(()=>document.body.dataset.screen==='prep'&&document.querySelector('#rang').textContent.includes('1995'));
    await btn('Carte des époques').click();await page.getByRole('tab',{name:/1995/}).click();
    const depart=page.locator('dialog[open] .vc-depart');
    assert.equal(await depart.isEnabled(),true);await depart.click();
    await btn('Palmarès').click();
    assert.deepEqual(await lignes(),signed);
    const before=await page.evaluate(()=>({refus,keys:localStorage.length,sound:silence}));
    assert(before.refus.some(e=>e.key.startsWith('snake2985.hall.tentative.')));
    assert(before.refus.some(e=>e.key==='snake2985.hall.pilote'));
    assert.equal(before.keys,0);
    await page.reload();await btn('Palmarès').click();
    const apres=await lignes();
    assert.deepEqual(apres,[]);assert.deepEqual(errors,[]);
    const after=await page.evaluate(()=>({keys:localStorage.length,sound:silence}));
    for(const snap of [before,after]){assert.equal(snap.keys,0);assert.deepEqual(snap.sound,{media:0,context:0});}
    console.log(JSON.stringify({edition,signed,apresCarte:signed,afterReload:apres,before,after,errors},null,2));
  }finally{await browser.close();}
}
verify().catch(e=>{console.error(e);process.exitCode=1;});

// Échantillonne le RSS des seuls processus du navigateur créé par cette campagne.
// Le RSS agrégé double-compte les pages partagées et n'est pas l'empreinte privée.
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const dir=__dirname,folder=path.join(dir,'releves'),out=path.join(folder,'rss.jsonl');
const sample=()=>{
 const raw=cp.execFileSync('/bin/ps',['-axo','pid=,ppid=,rss=,command='],{encoding:'utf8'});
 const procs=raw.trim().split('\n').map(row=>row.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)).filter(Boolean).map(m=>({pid:+m[1],parent:+m[2],rss:+m[3],cmd:m[4]}));
 const owner=procs.find(p=>/(^|\/)node campagne\.cjs$/.test(p.cmd.trim())||p.cmd.trim()==='node campagne.cjs');
 if(!owner)return false;
 const browser=procs.find(p=>p.parent===owner.pid&&p.cmd.includes('/headless_shell '));if(!browser)return false;
 const tree=new Set([browser.pid]);for(let i=0;i<5;i++)for(const p of procs)if(tree.has(p.parent))tree.add(p.pid);
 let rssKiB=0;const byRole={};
 for(const p of procs.filter(p=>tree.has(p.pid))){const role=p.pid===browser.pid?'browser':p.cmd.match(/--type=([a-z-]+)/)?.[1]||'auxiliaire';byRole[role]=(byRole[role]||0)+p.rss;rssKiB+=p.rss;}
 fs.appendFileSync(out,JSON.stringify({time:new Date().toISOString(),rssKiB,byRole,count:tree.size})+'\n');return true;
};
if(!sample())process.exit(1);const id=setInterval(()=>{if(!sample())clearInterval(id);},12000);

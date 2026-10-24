// Même chargeur que le jury, reçu écrit dans la mission uniquement.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync(new URL('../jury2/valider-vm.mjs',import.meta.url),'utf8')
 .replace("from './vm-temoins.mjs'","from '../jury2/vm-temoins.mjs'")
 .replace("path.join(HERE,'vm-temoins.mjs')","path.join(HERE,'../jury2/vm-temoins.mjs')");
fs.writeFileSync(new URL('./validation-execution.mjs',import.meta.url),source);
execFileSync(process.execPath,[fileURLToPath(new URL('./validation-execution.mjs',import.meta.url))],{stdio:'inherit'});

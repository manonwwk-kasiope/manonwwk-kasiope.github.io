// G1 test 5 — le bundle snake2030/index.html ne contient rien de tools/test/ et pèse ≤ 470 Ko.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finish } from '../lib.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');            // snake2030/
const file = path.join(ROOT, 'index.html');
const MAX = 470 * 1000;                                      // 470 Ko (décimal, lecture stricte)
if (!fs.existsSync(file)) finish(5, { pass: false, measured: { file, exists: false }, threshold: 'index.html présent', code: 2 });
const html = fs.readFileSync(file, 'utf8');
const bytes = Buffer.byteLength(html);
const hits = (html.match(/tools\/test/g) || []).length;
const srcOk = fs.existsSync(path.join(ROOT, 'build.mjs')) && fs.existsSync(path.join(ROOT, 'src'));
const measured = { bytes, ko: +(bytes / 1000).toFixed(1), kib: +(bytes / 1024).toFixed(1), toolsTestHits: hits, buildPresent: srcOk };
const pass = hits === 0 && bytes <= MAX;
finish(5, { pass, measured, threshold: "grep 'tools/test' vide et taille ≤ 470 000 octets", code: pass ? 0 : 1 });

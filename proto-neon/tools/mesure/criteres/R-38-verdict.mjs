/* R-38 — Verdict de la propriétaire : aux JALONS A et B, ses réponses sont recopiées dans
   refonte/RETOURS-PROPRIETAIRE.md (titres « Jalon A », « Jalon B ») et chaque « non » a reçu une correction
   ou une raison écrite avant la phase suivante. Le banc vérifie la présence des sections et des six réponses ;
   le suivi de chaque « non » se relit à la main (gardien du contrat). */
import fs from 'node:fs';
import path from 'node:path';
import { executer, principal, PROTO } from '../commun.mjs';

export const meta = { id: 'R-38', titre: 'Verdict de la propriétaire', seuil: 'réponses recopiées aux jalons A et B ; chaque « non » suivi d’une correction ou d’une raison', bloquant: true };

export async function mesurer(banc, res) {
  const f = path.join(PROTO, 'refonte', 'RETOURS-PROPRIETAIRE.md');
  if (!fs.existsSync(f)) return res.nonMesurable('retours de la propriétaire', 'refonte/RETOURS-PROPRIETAIRE.md absent');
  const t = fs.readFileSync(f, 'utf8');
  for (const j of ['A', 'B']) {
    const m = t.match(new RegExp('^#+\\s*Jalon\\s+' + j + '\\b[^\\n]*\\n([\\s\\S]*?)(?=^#+\\s|$(?![\\s\\S]))', 'mi'));
    if (!m) { res.horsBanc(`jalon ${j}`, `section « Jalon ${j} » absente : le jalon n’a pas encore eu lieu (REFONTE.md § 8.4)`); continue; }
    const items = (m[1].match(/^\s*(\d+[.)]|[-*])\s+/gm) || []).length;
    res.verifie(`jalon ${j} : réponses recopiées (items)`, items, '≥ 6 (les six questions)', items >= 6);
    const nons = (m[1].match(/\bnon\b/gi) || []).length;
    res.horsBanc(`jalon ${j} : suivi des « non »`, `${nons} « non » relevés : chaque correction ou raison écrite se relit à la main`);
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });

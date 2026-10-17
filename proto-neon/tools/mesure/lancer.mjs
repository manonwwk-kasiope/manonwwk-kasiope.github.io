/* tools/mesure/lancer.mjs — le lanceur : passe les critères R-01 à R-38 (REFONTE.md § 8.5) sur un bundle et
   écrit le rapport.
     node tools/mesure/lancer.mjs [--url URL] [--rapide] [--long] [--seulement R-01,R-02] [--sans R-20]
                                  [--parallele N] [--profil paysage,portrait] [--graines 1-50] [--strict]
                                  [--sortie DOSSIER] [--sans-cache] [--bavard]
   Ordre : R-04 d'abord (il joue les parties des 8 pilotes, mises en cache pour les autres), puis les critères
   ordinaires (N à la fois avec --parallele N), puis, seuls, les critères sensibles au temps réel (meta.exclusif :
   gestes, performance, son, pause, attraction).
   Sorties : <sortie>/R-xx.json, <sortie>/rapport.json, <sortie>/rapport.md, <sortie>/captures/.
   Code de sortie : 1 si un critère bloquant est en échec ou en erreur (avec --strict : aussi s'il est non
   mesurable ou partiel), 0 sinon. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { options, Banc, mesurerCritere, ligneBilan, ICI } from './commun.mjs';

const o = options();
const n = (() => { const i = process.argv.indexOf('--parallele'); return i > 0 ? Math.max(1, +process.argv[i + 1] || 1) : 1; })();
const strict = process.argv.includes('--strict');
const dossier = path.join(ICI, 'criteres');
const fichiers = fs.readdirSync(dossier).filter(f => /^R-\d\d-.*\.mjs$/.test(f)).sort();
const mods = [];
for (const f of fichiers) {
  const m = await import(pathToFileURL(path.join(dossier, f)).href);
  if (o.seulement && !o.seulement.includes(m.meta.id)) continue;
  if (o.sans.map(s => s.toUpperCase()).includes(m.meta.id)) continue;
  mods.push({ f, ...m });
}
const banc = await new Banc(o).demarrer();
const t0 = Date.now(), bilans = [];
const passer = async m => { const b = await mesurerCritere(banc, m); b.fichier = 'tools/mesure/criteres/' + m.f; bilans.push(b); console.log(ligneBilan(b)); };
try {
  const d = mods.filter(m => m.meta.id === 'R-04'), ex = mods.filter(m => m.meta.exclusif), ord = mods.filter(m => !m.meta.exclusif && m.meta.id !== 'R-04');
  for (const m of d) await passer(m);
  const file = ord.slice();
  await Promise.all(Array.from({ length: Math.min(n, file.length) }, async () => { while (file.length) await passer(file.shift()); }));
  for (const m of ex) await passer(m);
} finally { await banc.fermer(); }
bilans.sort((a, b) => a.id.localeCompare(b.id));
const compte = k => bilans.filter(b => b.statut === k).length;
const rapport = {
  date: new Date().toISOString(), url: o.url, empreinte: banc.empreinte, options: { rapide: o.rapide, long: o.long, graines: o.graines, profils: o.profils, parallele: n },
  duree: +((Date.now() - t0) / 1000).toFixed(1),
  totaux: { ok: compte('ok'), echec: compte('echec'), partiel: compte('partiel'), nonMesurable: compte('non-mesurable'), horsBanc: compte('hors-banc'), erreur: compte('erreur') },
  criteres: bilans
};
fs.writeFileSync(path.join(o.sortie, 'rapport.json'), JSON.stringify(rapport, null, 1));
const STAT = { ok: 'OK', echec: 'ÉCHEC', partiel: 'partiel', 'non-mesurable': 'non mesurable', 'hors-banc': 'hors banc', erreur: 'ERREUR' };
const md = [
  `# Rapport des critères R-01 à R-38`, '',
  `Bundle : \`${o.url}\` (empreinte ${banc.empreinte}) — ${rapport.date} — ${rapport.duree} s${o.rapide ? ' — **mode rapide** (graines et durées réduites : proportions indicatives)' : ''}.`, '',
  `**${rapport.totaux.ok} ok, ${rapport.totaux.echec} en échec, ${rapport.totaux.partiel} partiels, ${rapport.totaux.nonMesurable} non mesurables, ${rapport.totaux.horsBanc} hors banc, ${rapport.totaux.erreur} en erreur.**`, '',
  '| Critère | Statut | Bloquant | Résumé |', '|---|---|---|---|',
  ...bilans.map(b => `| ${b.id} ${b.titre} | ${STAT[b.statut]} | ${b.bloquant ? 'oui' : 'non (P3)'} | ${String(b.resume).replace(/\|/g, '\\|')} |`), ''
];
for (const b of bilans) {
  md.push(`## ${b.id} — ${b.titre} : ${STAT[b.statut]}`, '', `Seuil : ${b.seuil}. Script : \`${b.fichier}\` (${b.duree} s).`, '');
  for (const m of b.mesures) md.push(`- ${m.statut === 'ok' ? '✓' : m.statut === 'echec' ? '✗' : m.statut === 'hors-cible' ? '(i) ✗' : '·'} ${m.nom}${m.valeur !== undefined ? ' : ' + JSON.stringify(m.valeur) : ''}${m.seuil !== undefined ? ' (seuil ' + JSON.stringify(m.seuil) + ')' : ''}${m.raison ? ' — ' + m.raison : ''}`);
  for (const n2 of b.notes) md.push(`- note : ${n2}`);
  if (b.captures.length) md.push(`- captures : ${b.captures.map(c => '`' + c + '`').join(', ')}`);
  if (b.exception) md.push('', '```', b.exception, '```');
  md.push('');
}
fs.writeFileSync(path.join(o.sortie, 'rapport.md'), md.join('\n'));
console.log(`\n${rapport.totaux.ok} ok, ${rapport.totaux.echec} en échec, ${rapport.totaux.partiel} partiels, ${rapport.totaux.nonMesurable} non mesurables, ${rapport.totaux.horsBanc} hors banc, ${rapport.totaux.erreur} en erreur — ${rapport.duree} s`);
console.log('→ ' + path.relative(process.cwd(), path.join(o.sortie, 'rapport.md')));
const bloque = bilans.some(b => b.bloquant && (b.statut === 'echec' || b.statut === 'erreur' || (strict && (b.statut === 'non-mesurable' || b.statut === 'partiel'))));
process.exit(bloque ? 1 : 0);

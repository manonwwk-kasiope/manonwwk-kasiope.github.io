/* Contrôle des verdicts des jurés et lecture de la porte 7 (INCROYABLE.md amendé ; autotest.md § 3.4).
   Tout ce qui se vérifie par script est vérifié ici : schéma du JSON, preuves (fichier, temps, champ), défauts
   plantés retrouvés, plafonds de note imposés par la grille, étalonnage (témoin saboté, version 0, doublon),
   platitude, stabilité, ancrage par les chiffres, accord de rang, accord entre familles, lecture de « 9,5 ».
     node tools/jury2/etalonnage.mjs --verdicts <dossier> [--paquets paquets] [--cles cles] [--mode etalonnage|porte]
   Aucun réseau. Les constats « cite-t-il un fait vérifiable ? » hors des cas évidents sont rendus dans aJuger[],
   à passer à Jev (code d'abord, puis Jev sur la zone grise). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { P, REGARDS, FAMILLES, paris } from './protocole.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = P.jury;
export const UNITES = ['s_video', 's_reel', 's_jeu', 's_fichier_audio'];
const lireJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const moyenne = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

export function cheminSur(rel) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || rel.includes('\\')) return null;
  const n = path.posix.normalize(rel);
  return n.startsWith('..') || n.startsWith('/') ? null : n;
}
export function pointeur(obj, ptr) {
  if (ptr === '' || ptr === '/') return obj;
  let cur = obj;
  for (const brut of ptr.split('/').slice(1)) {
    const k = brut.replaceAll('~1', '/').replaceAll('~0', '~');
    if (cur === null || typeof cur !== 'object' || !(k in cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}
const sequenceDe = rel => (/^(S\d\d)\//.exec(rel) || [])[1] || null;
/* Contexte d'un paquet : paquet.json, annexe (si la passe est 2) et lecture paresseuse des sidecars. */
export function contextePaquet(racine) {
  const paquet = lireJSON(path.join(racine, 'paquet.json')), fichiers = new Set(paquet.fichiers.map(f => f.chemin));
  const cache = new Map(), json = rel => { if (!cache.has(rel)) cache.set(rel, fs.existsSync(path.join(racine, rel)) ? lireJSON(path.join(racine, rel)) : null); return cache.get(rel); };
  return { racine, paquet, fichiers, json };
}
/* Une preuve est « résolue » si son fichier existe dans le paquet et si son temps ou son champ désigne quelque chose de réel. */
export function verifierPreuve(p, ctx, { passe }) {
  const rel = cheminSur(p?.fichier);
  if (!rel) return { ok: false, raison: 'chemin invalide ou hors paquet' };
  const annexe = rel === 'annexe/annexe.json';
  if (annexe && passe === 1) return { ok: false, raison: 'annexe citée avant la note de la passe 1' };
  if (!annexe && !ctx.fichiers.has(rel) && !['paquet.json', 'grille.md', 'consigne-jure.md'].includes(rel)) return { ok: false, raison: 'fichier absent du paquet' };
  if (!fs.existsSync(path.join(ctx.racine, rel))) return { ok: false, raison: 'fichier absent du disque' };
  if (typeof p.observation !== 'string' || p.observation.trim().length < 8) return { ok: false, raison: 'observation absente ou trop courte' };
  const ext = path.posix.extname(rel), side = ['.png', '.mp4'].includes(ext) ? rel.slice(0, -ext.length) + '.json' : rel;
  const sc = ext === '.json' ? ctx.json(rel) : ['.png', '.mp4'].includes(ext) ? ctx.json(side) : null, seq = sequenceDe(rel);
  const s = seq ? ctx.paquet.sequences.find(x => x.id === seq) : null;
  if (p.temps === null || p.temps === undefined) {
    if (typeof p.champ === 'string' && ext === '.json') return pointeur(ctx.json(rel), p.champ) === undefined ? { ok: false, raison: 'champ introuvable : ' + p.champ } : { ok: true };
    if (Number.isInteger(p.ligne) && ['.md', '.json'].includes(ext)) { const n = fs.readFileSync(path.join(ctx.racine, rel), 'utf8').split('\n').length; return p.ligne >= 1 && p.ligne <= n ? { ok: true } : { ok: false, raison: 'ligne hors fichier' }; }
    if (Number.isInteger(p.case) && ext === '.png' && sc?.images) return p.case >= 0 && p.case < sc.images.length ? { ok: true } : { ok: false, raison: 'case hors planche' };
    return { ok: false, raison: 'ni temps, ni champ, ni ligne, ni case' };
  }
  const { valeur, unite } = p.temps;
  if (!Number.isFinite(valeur) || !UNITES.includes(unite)) return { ok: false, raison: 'temps ou unité invalide' };
  const tol = 0.6;
  const fenetre = (() => {
    if (/clip-/.test(rel) && sc?.dureeEncodee !== undefined) return { s_video: [0, sc.dureeEncodee + 0.5], s_reel: [sc.debut - tol, sc.fin + tol], s_fichier_audio: (sc.carte || []).map(c => c.tFichier) };
    if (/tapis-/.test(rel) && sc?.fenetre) return { s_video: [0, sc.fenetre.fin - sc.fenetre.debut + 0.5], s_reel: [sc.fenetre.debut - tol, sc.fenetre.fin + tol], s_fichier_audio: (sc.reperes || []).map(c => c.tFichier) };
    if (/planche-/.test(rel) && sc?.images?.length) { const ws = sc.images.map(i => i.w); return { s_reel: [Math.min(...ws) - tol, Math.max(...ws) + tol], s_jeu: [0, s?.tempsJeu ?? Infinity] }; }
    if (/fiche\.md$/.test(rel) && s) return { s_reel: [0, s.dureeReelle + tol], s_jeu: [0, (s.tempsJeu ?? 0) + tol] };
    if (annexe && p.champ) { const m = /^\/sequences\/(S\d\d)\//.exec(p.champ), q = m && ctx.paquet.sequences.find(x => x.id === m[1]); return q ? { s_reel: [0, q.dureeReelle + tol], s_jeu: [0, (q.tempsJeu ?? 0) + tol] } : null; }
    return null;
  })();
  if (!fenetre) return { ok: false, raison: 'ce fichier ne porte aucun repère de temps' };
  if (unite === 's_fichier_audio') return fenetre.s_fichier_audio?.some(t => Math.abs(t - valeur) <= P.canaris.toleranceTemps) ? { ok: true } : { ok: false, raison: 's_fichier_audio : aucun repère de la carte à ± ' + P.canaris.toleranceTemps + ' s' };
  const w = fenetre[unite];
  if (!w) return { ok: false, raison: 'unité ' + unite + ' sans objet pour ce fichier' };
  return valeur >= w[0] && valeur <= w[1] ? { ok: true } : { ok: false, raison: `temps hors fenêtre (${valeur} ${unite} pour [${w[0].toFixed(2)}, ${w[1].toFixed(2)}])` };
}
const LISTES = ['forces', 'défauts graves', 'défauts mineurs', 'anomaliesDossier'];
export function validerVerdict(v, ctx, { passe, verdict1 = null }) {
  const erreurs = [], avert = [];
  const E = m => erreurs.push(m);
  if (!v || typeof v !== 'object') return { valide: false, erreurs: ['JSON absent'], preuves: { total: 0, resolues: 0, introuvables: [] } };
  if (v.passe !== passe) E(`passe attendue ${passe}`);
  if (v.code !== ctx.paquet.code) E('code du paquet différent');
  if (!REGARDS.includes(v.regard)) E('regard inconnu : ' + v.regard);
  if (!FAMILLES.includes(v.famille)) E('famille inconnue : ' + v.famille);
  if (!v.jure || typeof v.jure !== 'string') E('identifiant de juré absent');
  if (!['evalue', 'dossier_insuffisant'].includes(v.statut)) E('statut inconnu');
  if (v.statut === 'evalue' && !(typeof v.note === 'number' && v.note >= 0 && v.note <= 10)) E('note hors de 0–10');
  if (v.statut === 'dossier_insuffisant' && v.note !== null) E('note non nulle pour un dossier insuffisant');
  const attendue = passe === 1 ? ctx.paquet.empreinte : ctx.paquet.empreinteAnnexe;
  if (v.empreinte !== attendue) E('empreinte lue différente de celle du paquet (passe ' + passe + ')');
  if (passe === 2) { if (!verdict1) E('verdict de la passe 1 absent'); else if (v.note_passe1 !== verdict1.note) E('note_passe1 différente de la note remise à la passe 1'); }
  for (const l of LISTES) if (v[l] !== undefined && !Array.isArray(v[l])) E(l + ' doit être une liste');
  const preuves = Array.isArray(v.preuves) ? v.preuves : [], ids = new Set();
  for (const p of preuves) { if (!p?.id || ids.has(p.id)) E('identifiant de preuve absent ou doublon : ' + p?.id); ids.add(p?.id); }
  const res = new Map(), introuvables = [];
  for (const p of preuves) { const r = verifierPreuve(p, ctx, { passe }); res.set(p.id, r); if (!r.ok) introuvables.push({ id: p.id, fichier: p.fichier, raison: r.raison }); }
  const cite = it => (it?.preuves || []);
  for (const l of LISTES) for (const it of v[l] || []) {
    if (typeof it?.constat !== 'string' || !it.constat.trim()) E(l + ' : constat vide');
    for (const id of cite(it)) if (!ids.has(id)) E(`${l} : preuve ${id} inconnue`);
  }
  if (passe === 1) for (const f of v.fichiersInspectes || []) if (String(f).startsWith('annexe/')) E('annexe/ inspectée avant la note de la passe 1 : ' + f);
  const horsPaquet = (v.fichiersInspectes || []).filter(f => { const r = cheminSur(f); return !r || (!ctx.fichiers.has(r) && !['annexe/annexe.json', 'paquet.json', 'grille.md', 'consigne-jure.md'].includes(r)); });
  if (horsPaquet.length) avert.push('fichiers inspectés hors paquet : ' + horsPaquet.join(', '));
  const gr = v['défauts graves'] || [], mi = v['défauts mineurs'] || [], fo = v.forces || [];
  const resolu = it => cite(it).some(id => res.get(id)?.ok);
  const sequencesDe = it => new Set(cite(it).map(id => preuves.find(p => p.id === id)).map(p => sequenceDe(cheminSur(p?.fichier) || '')).filter(Boolean));
  const recurrents = mi.filter(it => sequencesDe(it).size >= 2).length;
  const defauts = { graves: gr.length, mineurs: mi.length, limites: (v.limites || []).length, total: gr.length + mi.length + (v.limites || []).length, avecPreuve: [...gr, ...mi].filter(resolu).length, mineursRecurrents: recurrents };
  const momentsForts = fo.filter(resolu).length;
  return { valide: erreurs.length === 0, erreurs, avertissements: avert, preuves: { total: preuves.length, resolues: preuves.length - introuvables.length, introuvables, part: preuves.length ? introuvables.length / preuves.length : null }, defauts, momentsForts, resolu: Object.fromEntries(res) };
}
/* Plafonds imposés par la grille : une note au-dessus de son plafond est ramenée à celui-ci (l'écart est publié). */
export function plafond(v, analyse) {
  if (v.statut !== 'evalue' || typeof v.note !== 'number') return { plafond: null, note: null, raisons: [] };
  const d = analyse.defauts, raisons = []; let pl = 10;
  const borne = (x, r) => { raisons.push(r + ' → ≤ ' + x + (x > pl ? ' (non contraignant : un plafond plus bas s’applique déjà)' : '')); if (x < pl) pl = x; };
  if (d.graves >= 2) borne(J.plafondDeuxGraves, 'deux défauts graves ou plus');
  else if (d.graves === 1) borne(J.plafondSansPreuves, 'un défaut grave');
  if (analyse.momentsForts < J.momentsFortsPourPlus9) borne(J.plafondSansPreuves, 'moins de ' + J.momentsFortsPourPlus9 + ' moments forts prouvés');
  if (d.mineursRecurrents >= 4) borne(J.plafondDeuxGraves, 'quatre défauts mineurs récurrents ou plus');
  else if (d.mineursRecurrents >= 2) borne(J.plafondSansPreuves, 'deux défauts mineurs récurrents ou plus');
  if (d.total < J.defautsMin) borne(J.plafondSansPreuves, 'moins de ' + J.defautsMin + ' éléments listés (graves, mineurs, limites)');
  if (d.avecPreuve < J.defautsAvecPreuveMin) borne(J.plafondSansPreuves, 'moins de ' + J.defautsAvecPreuveMin + ' défauts avec preuve résolue');
  if (v.regard === 'avocat du diable') borne(Math.max(0, 10 - J.avocat.penaliteGrave * d.graves - J.avocat.penaliteMineur * d.mineurs), 'avocat du diable : 10 − pénalités');
  const note = Math.min(v.note, pl);
  return { plafond: pl, note, plafonnee: note < v.note, raisons };
}
/* Défauts plantés retrouvés : une preuve rangée parmi les défauts ou les anomalies désigne le fichier planté. */
export function retrouverCanaris(verdicts, cle) {
  const trouves = [];
  for (const c of cle.canaris || []) {
    const ok = verdicts.some(v => {
      const preuves = new Map((v.preuves || []).map(p => [p.id, p]));
      return ['défauts graves', 'défauts mineurs', 'anomaliesDossier'].some(l => (v[l] || []).some(it => (it.preuves || []).some(id => {
        const p = preuves.get(id); if (!p) return false;
        const f = cheminSur(p.fichier); if (!f) return false;
        if (c.champ) return f === c.fichier && typeof p.champ === 'string' && p.champ.startsWith(c.champ.split('/').slice(0, 5).join('/'));
        if (f !== c.fichier && f !== c.fichierJson) return false;
        if (!p.temps || p.temps.unite !== 's_reel' || !c.fenetre) return true;
        return p.temps.valeur >= c.fenetre[0] - P.canaris.toleranceTemps && p.temps.valeur <= c.fenetre[1] + P.canaris.toleranceTemps;
      })));
    });
    trouves.push({ type: c.id, fichier: c.fichier, retrouve: ok });
  }
  return { plantes: trouves.length, retrouves: trouves.filter(x => x.retrouve).length, part: trouves.length ? trouves.filter(x => x.retrouve).length / trouves.length : null, detail: trouves };
}
export function spearman(a, b) {
  const rang = x => { const idx = x.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = Array(x.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
  if (a.length !== b.length || a.length < 3) return null;
  const ra = rang(a), rb = rang(b), ma = moyenne(ra), mb = moyenne(rb);
  const num = ra.reduce((s, x, i) => s + (x - ma) * (rb[i] - mb), 0), den = Math.sqrt(ra.reduce((s, x) => s + (x - ma) ** 2, 0) * rb.reduce((s, x) => s + (x - mb) ** 2, 0));
  return den === 0 ? null : num / den;
}
/* Constat « factuel » reconnu par le code : un nombre, une séquence, un fichier ou une unité de temps. Le reste va à Jev. */
export function constatVerifiable(t) { return /\d/.test(t || '') || /\bS\d\d\b/.test(t || '') || /\.(png|json|mp4|md)\b/.test(t || ''); }

/* ---- chargement d'un dossier de verdicts : verdicts/<juré>/<code>.p1.json et .p2.json (ou tout *.json à plat) ---- */
export function chargerVerdicts(dir) {
  const out = [], parcours = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) parcours(p); else if (e.name.endsWith('.json')) { try { out.push({ fichier: p, v: lireJSON(p) }); } catch (err) { out.push({ fichier: p, v: null, erreur: String(err.message) }); } } } };
  parcours(dir); return out;
}
/* Consolide : pour chaque (juré, paquet), valide les deux passes, applique les plafonds, retrouve les canaris. */
export function consolider({ verdicts, paquets, cles }) {
  const groupes = new Map(), rejets = [];
  for (const { fichier, v, erreur } of verdicts) {
    if (!v) { rejets.push({ fichier, raison: erreur || 'JSON illisible' }); continue; }
    const k = `${v.jure}|${v.code}`; if (!groupes.has(k)) groupes.set(k, { jure: v.jure, code: v.code, famille: v.famille, regard: v.regard, p: {} });
    groupes.get(k).p[v.passe] = { fichier, v };
  }
  const lignes = [];
  for (const g of groupes.values()) {
    const racine = path.join(paquets, g.code), clePath = path.join(cles, g.code + '.json');
    if (!fs.existsSync(path.join(racine, 'paquet.json')) || !fs.existsSync(clePath)) { rejets.push({ jure: g.jure, code: g.code, raison: 'paquet ou clé introuvable' }); continue; }
    const ctx = contextePaquet(racine), cle = lireJSON(clePath);
    const a1 = g.p[1] ? validerVerdict(g.p[1].v, ctx, { passe: 1 }) : null, a2 = g.p[2] ? validerVerdict(g.p[2].v, ctx, { passe: 2, verdict1: g.p[1]?.v }) : null;
    const pl1 = a1 && g.p[1].v ? plafond(g.p[1].v, a1) : null, pl2 = a2 && g.p[2].v ? plafond(g.p[2].v, a2) : null;
    const aJuger = [];
    for (const [pas, verdict] of [[1, g.p[1]?.v], [2, g.p[2]?.v]]) for (const l of LISTES) for (const it of verdict?.[l] || []) if (!constatVerifiable(it.constat)) aJuger.push({ passe: pas, liste: l, constat: it.constat });
    lignes.push({ ...g, cle, role: cle.role, doublonDe: cle.doublonDe, serie: cle.serie, bundleSha256: cle.bundleSha256, graineListe: cle.graineListe,
      note1: pl1?.note ?? null, note2: pl2?.note ?? null, brute1: g.p[1]?.v.note ?? null, brute2: g.p[2]?.v.note ?? null, plafonnee: !!(pl1?.plafonnee || pl2?.plafonnee), plafonds: { p1: pl1?.raisons || [], p2: pl2?.raisons || [] },
      valide1: a1?.valide ?? null, valide2: a2?.valide ?? null, erreurs: [...(a1?.erreurs || []), ...(a2?.erreurs || [])], preuves: { total: (a1?.preuves.total || 0) + (a2?.preuves.total || 0), introuvables: (a1?.preuves.introuvables.length || 0) + (a2?.preuves.introuvables.length || 0) },
      canaris: retrouverCanaris([g.p[1]?.v, g.p[2]?.v].filter(Boolean), cle), aJuger, statut: g.p[2]?.v.statut ?? g.p[1]?.v.statut });
  }
  return { lignes, rejets };
}
/* Note retenue d'un juré sur un paquet : passe 2 pour les regards qui lisent les chiffres, passe 1 sinon ; repli sur l'autre. */
export const noteRetenue = l => { const p2 = J.regardsPass2.includes(l.regard); return (p2 ? (l.note2 ?? l.note1) : (l.note1 ?? l.note2)); };
export const noteFinale = l => l.note2 ?? l.note1;

/* ---- étalonnage : V0, pointe, témoin saboté, doublon renommé ---- */
export function analyserEtalonnage(lignes) {
  const parJure = new Map(); for (const l of lignes) { if (!parJure.has(l.jure)) parJure.set(l.jure, []); parJure.get(l.jure).push(l); }
  const roleDe = l => l.doublonDe ? 'doublon' : l.role.replace('etalonnage-', '');
  const jures = [];
  for (const [jure, ls] of parJure) {
    const notes = {}, ancrages = [];
    for (const l of ls) { const r = roleDe(l); notes[r] = notes[r] ?? {}; notes[r].final = noteFinale(l); notes[r].p1 = l.note1; notes[r].code = l.code; if (l.note1 !== null && l.note2 !== null) ancrages.push(Math.abs(l.note2 - l.note1)); if (l.doublonDe) notes.doublon.de = ls.find(x => x.code === l.doublonDe)?.role ?? null; }
    const t = {}, raisons = [];
    const f = r => notes[r]?.final ?? null;
    if (f('v0') !== null && f('temoin') !== null) { t.discrimination = { v0: f('v0'), temoin: f('temoin'), ecart: f('v0') - f('temoin'), ok: f('temoin') < J.temoinMax && f('v0') - f('temoin') >= J.ecartTemoinMin }; if (!t.discrimination.ok) raisons.push(`discrimination : V0 ${f('v0')} / témoin ${f('temoin')}`); }
    else { t.discrimination = { ok: false, absent: true }; raisons.push('discrimination non mesurable : V0 ou témoin non noté'); }
    const finales = ['v0', 'pointe', 'temoin'].map(r => f(r)).filter(x => x !== null);
    if (finales.length >= 2) { const plat = finales.every(x => x >= J.platitude.noteMin) && Math.max(...finales) - Math.min(...finales) < J.platitude.etendueMax; t.platitude = { notes: finales, ok: !plat }; if (plat) raisons.push('platitude : toutes les notes ≥ 9 à moins d’un point'); }
    if (notes.doublon && notes.doublon.de) { const base = notes[notes.doublon.de.replace('etalonnage-', '')]; if (base) { const ecart = Math.abs(base.final - notes.doublon.final); t.stabilite = { ecart, ok: ecart <= J.stabiliteMax }; if (!t.stabilite.ok) raisons.push('stabilité : écart ' + ecart.toFixed(2)); } }
    if (ancrages.length) { const m = moyenne(ancrages); t.ancrage = { moyenne: m, ok: m <= J.ancrageMax }; if (!t.ancrage.ok) raisons.push('ancrage par les chiffres : ' + m.toFixed(2)); }
    const tot = ls.reduce((s, l) => s + l.preuves.total, 0), intr = ls.reduce((s, l) => s + l.preuves.introuvables, 0);
    t.preuves = { total: tot, introuvables: intr, part: tot ? intr / tot : null, ok: tot > 0 && intr / tot <= J.preuvesIntrouvablesMax }; if (!t.preuves.ok) raisons.push('preuves introuvables : ' + intr + '/' + tot);
    const pl = ls.reduce((s, l) => s + l.canaris.plantes, 0), re = ls.reduce((s, l) => s + l.canaris.retrouves, 0);
    t.canaris = { plantes: pl, retrouves: re, part: pl ? re / pl : null, ok: pl > 0 && re / pl >= J.canarisMin }; if (!t.canaris.ok) raisons.push('défauts plantés : ' + re + '/' + pl);
    const invalides = ls.filter(l => l.erreurs.length); if (invalides.length) raisons.push('verdicts non conformes au schéma : ' + invalides.map(l => l.code).join(', '));
    jures.push({ jure, famille: ls[0].famille, regard: ls[0].regard, notes, tests: t, raisons, ecarte: raisons.length > 0 });
  }
  /* accord de rang : Spearman avec la moyenne des autres jurés sur les dossiers communs (≥ 3 dossiers distincts) */
  const roles = ['v0', 'pointe', 'temoin'];
  for (const j of jures) {
    const autres = jures.filter(x => x !== j), commun = roles.filter(r => j.notes[r] && autres.some(a => a.notes[r]));
    if (commun.length >= 3) { const rho = spearman(commun.map(r => j.notes[r].final), commun.map(r => moyenne(autres.filter(a => a.notes[r]).map(a => a.notes[r].final)))); j.tests.accordRang = { rho, ok: rho === null ? true : rho >= 0 }; if (rho !== null && rho < 0) { j.raisons.push('accord de rang négatif : ' + rho.toFixed(2)); j.ecarte = true; } }
    else j.tests.accordRang = { ok: true, nonMesurable: 'moins de 3 dossiers distincts notés' };
  }
  const conserves = jures.filter(j => !j.ecarte), cellules = {};
  for (const r of REGARDS) for (const fam of FAMILLES) { const c = jures.filter(j => j.regard === r && j.famille === fam); cellules[`${fam}/${r}`] = { jures: c.length, conserves: c.filter(j => !j.ecarte).length }; }
  const manquantes = Object.entries(cellules).filter(([, v]) => v.conserves === 0).map(([k]) => k);
  const ecartVersion = (() => { const a = conserves.map(j => j.notes.pointe?.final).filter(x => x !== undefined && x !== null), b = conserves.map(j => j.notes.v0?.final).filter(x => x !== undefined && x !== null); return a.length && b.length ? moyenne(a) - moyenne(b) : null; })();
  return { dateParis: paris(), jures, cellules, cellulesSansJureValide: manquantes, valide: manquantes.length === 0 && jures.length > 0, ecartPointeV0: ecartVersion,
    note: 'Un juré écarté n’entre dans aucune moyenne. L’étalonnage est valide si chaque cellule (famille × regard) garde au moins un juré qui discrimine le témoin saboté de la version 0, retrouve ≥ 70 % des défauts plantés et cite des preuves vérifiables.' };
}
/* Un juré de verdict n'a pas été étalonné lui-même (sessions distinctes) : l'étalonnage valide la méthode, cellule par
   cellule ; chaque juré de verdict est contrôlé sur ses propres verdicts (schéma, preuves, défauts plantés, ancrage). */
export function controleJure(l) {
  const raisons = [];
  if (l.erreurs.length) raisons.push('verdict non conforme : ' + l.erreurs[0]);
  if (l.preuves.total === 0) raisons.push('aucune preuve');
  else if (l.preuves.introuvables / l.preuves.total > J.preuvesIntrouvablesMax) raisons.push(`preuves introuvables ${l.preuves.introuvables}/${l.preuves.total}`);
  if (l.canaris.plantes && l.canaris.retrouves / l.canaris.plantes < J.canarisMin) raisons.push(`défauts plantés ${l.canaris.retrouves}/${l.canaris.plantes}`);
  if (l.note1 !== null && l.note2 !== null && Math.abs(l.note2 - l.note1) > J.ancrageMax) raisons.push('ancrage par les chiffres : ' + Math.abs(l.note2 - l.note1).toFixed(2));
  return { ok: raisons.length === 0, raisons };
}
/* ---- lecture de la porte 7 sur les deux jurys A (alpha) et B (beta) d'une même build ---- */
export function lecture95({ lignes, etalonnage }) {
  const raisons = [], detail = { jurys: {} };
  const verdicts = lignes.filter(l => (l.role === 'verdict-A' || l.role === 'verdict-B') && !l.doublonDe);
  const sha = new Set(verdicts.map(l => l.bundleSha256)); if (sha.size > 1) raisons.push('les deux jurys ne portent pas sur la même build');
  const codes = { A: new Set(verdicts.filter(l => l.role === 'verdict-A').map(l => l.code)), B: new Set(verdicts.filter(l => l.role === 'verdict-B').map(l => l.code)) };
  if (codes.A.size !== 1 || codes.B.size !== 1) raisons.push(`il faut exactement un paquet A et un paquet B (trouvés ${codes.A.size} et ${codes.B.size}) : jamais de troisième jury`);
  const gA = verdicts.find(l => l.role === 'verdict-A')?.graineListe ?? [], gB = verdicts.find(l => l.role === 'verdict-B')?.graineListe ?? [];
  if (gA.some(g => gB.includes(g))) raisons.push('les dossiers alpha et beta partagent des graines'); if (!gA.length || !gB.length) raisons.push('graines des dossiers de verdict inconnues');
  if (!etalonnage?.valide) raisons.push('étalonnage non valide : ' + ((etalonnage?.cellulesSansJureValide || []).join(', ') || 'aucun juré étalonné'));
  let echec = false; const exclus = [];
  for (const jury of ['A', 'B']) {
    const tous = verdicts.filter(l => l.role === 'verdict-' + jury), insuffisants = tous.filter(l => l.statut === 'dossier_insuffisant').length;
    if (insuffisants) raisons.push(`jury ${jury} : ${insuffisants} juré(s) rendent « dossier_insuffisant »`);
    const ls = [];
    for (const l of tous.filter(l => l.statut === 'evalue')) { const c = controleJure(l); if (c.ok) ls.push(l); else exclus.push({ jury, jure: l.jure, raisons: c.raisons }); }
    const parFamille = {}, parRegard = {}, ecartFamilles = {};
    for (const fam of FAMILLES) { const n = ls.filter(l => l.famille === fam).map(noteRetenue).filter(x => x !== null); parFamille[fam] = { n: n.length, moyenne: moyenne(n) }; }
    for (const r of REGARDS) {
      const c = {}; for (const fam of FAMILLES) { const n = ls.filter(l => l.regard === r && l.famille === fam).map(noteRetenue).filter(x => x !== null); c[fam] = moyenne(n); }
      parRegard[r] = { ...c, moyenne: moyenne(FAMILLES.map(f => c[f]).filter(x => x !== null)) };
      if (c.claude === null || c.codex === null) raisons.push(`jury ${jury} : regard « ${r} » sans juré valide dans une des deux familles`);
      else { ecartFamilles[r] = Math.abs(c.claude - c.codex); if (ecartFamilles[r] > J.accordFamilles) raisons.push(`jury ${jury} : familles en désaccord sur « ${r} » (${ecartFamilles[r].toFixed(2)} point)` + (ecartFamilles[r] > J.desaccordArbitrage ? ' : arbitrage sur les faits requis' : '')); }
    }
    const plantes = ls.reduce((s, l) => s + l.canaris.plantes, 0), retrouves = ls.reduce((s, l) => s + l.canaris.retrouves, 0);
    if (plantes && retrouves / plantes < J.canarisMin) raisons.push(`jury ${jury} : défauts plantés retrouvés ${retrouves}/${plantes}`);
    const sousSeuil = [];
    for (const fam of FAMILLES) if (parFamille[fam].moyenne === null || parFamille[fam].moyenne < J.moyenneFamille) sousSeuil.push(`moyenne ${fam} ${parFamille[fam].moyenne?.toFixed(2) ?? '—'} < ${J.moyenneFamille}`);
    for (const r of REGARDS) if (parRegard[r].moyenne === null || parRegard[r].moyenne < J.moyenneRegardMin) sousSeuil.push(`regard « ${r} » ${parRegard[r].moyenne?.toFixed(2) ?? '—'} < ${J.moyenneRegardMin}`);
    if (sousSeuil.length) echec = true;
    detail.jurys[jury] = { jures: ls.length, parFamille, parRegard, ecartFamilles, canaris: { plantes, retrouves }, sousSeuil, passe: sousSeuil.length === 0 };
  }
  detail.exclus = exclus;
  const retenues = verdicts.filter(l => l.statut === 'evalue' && controleJure(l).ok).map(noteRetenue).filter(x => x !== null);
  const noteVerdict = moyenne(retenues), v0 = moyenne((etalonnage?.jures || []).filter(j => !j.ecarte).map(j => j.notes.v0?.final).filter(x => x !== undefined && x !== null));
  if (noteVerdict !== null && v0 !== null) { detail.ecartVersionV0 = noteVerdict - v0; if (noteVerdict - v0 < J.ecartVersionMin) raisons.push(`écart version 0 → build ${(noteVerdict - v0).toFixed(2)} < ${J.ecartVersionMin}`); }
  else raisons.push('écart avec la version 0 non mesurable');
  const statut = raisons.length ? 'non_interpretable' : echec ? 'echec' : 'reussite';
  return { dateParis: paris(), statut, raisons, detail,
    lecture: statut === 'reussite' ? 'Porte 7 franchie sur les deux jurys A et B : moyenne ≥ 9,5 dans chaque famille, aucune moyenne de regard < 9. Le dernier mot reste l’iPhone de la propriétaire.' : statut === 'echec' ? 'Notes interprétables et sous le seuil.' : 'Note non interprétable : les notes brutes sont publiées, la porte n’est pas fermée.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), arg = (k, d = null) => { const i = a.indexOf(k); return i < 0 ? d : a[i + 1]; };
  const dir = arg('--verdicts'), paquets = arg('--paquets', path.join(HERE, 'paquets')), cles = arg('--cles', path.join(HERE, 'cles')), mode = arg('--mode', 'etalonnage');
  if (!dir) { console.log('node tools/jury2/etalonnage.mjs --verdicts <dossier> [--paquets paquets] [--cles cles] [--mode etalonnage|porte]'); process.exit(0); }
  const { lignes, rejets } = consolider({ verdicts: chargerVerdicts(dir), paquets, cles });
  const etal = analyserEtalonnage(lignes.filter(l => l.role.startsWith('etalonnage') || l.doublonDe));
  const sortie = { rejets, etalonnage: etal, ...(mode === 'porte' ? { porte7: lecture95({ lignes, etalonnage: etal }) } : {}) };
  console.log(JSON.stringify(sortie, null, 2));
}

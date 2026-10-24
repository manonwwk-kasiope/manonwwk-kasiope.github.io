#!/usr/bin/env node
/* Analyse locale seulement. Importable sans écriture ni exécution du jeu.
   Les liens dynamiques sont explicités, jamais assimilés à une observation de lecture. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const paris = () => new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour12: false });
export const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const audio = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i;
const image = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
export function walk(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]).sort() : [];
}
// Lexer minimal : ignore commentaires ; conserve offsets/lignes, chaînes et ponctuation.
// L'analyse de données ne lance ni boot(), ni simulation du jeu.
function lex(s) {
  const re = /\s+|\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s]/gy;
  let m, line = 1; const out = [];
  while ((m = re.exec(s))) {
    const v = m[0], l = line; line += (v.match(/\n/g) || []).length;
    if (!/^\s|^\/\*|^\/\//.test(v)) out.push({ v, at: m.index, end: re.lastIndex, line: l });
  }
  return out;
}
function close(t, i) {
  const pairs = { '{': '}', '[': ']', '(': ')' }, stack = [pairs[t[i].v]];
  for (let j = i + 1; j < t.length; j++) {
    if (pairs[t[j].v]) stack.push(pairs[t[j].v]);
    else if (t[j].v === stack.at(-1)) { stack.pop(); if (!stack.length) return j; }
  }
  throw new Error('Délimiteur non fermé ligne ' + t[i].line);
}
function table(src, name) {
  const t = lex(src), i = t.findIndex((x, k) => x.v === name && t[k + 1]?.v === '=' && ['{', '['].includes(t[k + 2]?.v));
  if (i < 0) throw new Error('Table introuvable : ' + name);
  const a = i + 2, b = close(t, a);
  return { t, a, b, text: src.slice(t[a].at, t[b].end), line: t[i].line };
}
function data(src, name) {
  const o = table(src, name);
  return { value: vm.runInNewContext('(' + o.text + ')', Object.create(null), { timeout: 1000 }), line: o.line };
}
function keys(src, name) {
  const { t, a, b } = table(src, name), out = [];
  for (let i = a + 1; i < b; i++) {
    if (t[i + 1]?.v === ':') out.push({ name: literal(t[i].v) ?? t[i].v, line: t[i].line });
    if (['{', '[', '('].includes(t[i].v)) i = close(t, i);
  }
  return out;
}
function literal(s) {
  if (!/^['"]/.test(s || '')) return null;
  try { return vm.runInNewContext(s, Object.create(null), { timeout: 1000 }); } catch { return null; }
}
function calls(src, file) {
  const t = lex(src), out = [];
  for (let i = 0; i < t.length; i++) {
    let kind, open;
    if (t[i].v === 'N' && t[i + 1]?.v === '.' && t[i + 2]?.v === 'art' && t[i + 3]?.v === '.' && ['play', 'prepare', 'get'].includes(t[i + 4]?.v) && t[i + 5]?.v === '(') {
      kind = t[i + 4].v; open = i + 5;
    } else if (['clipOn', 'clipPrep', 'art', 'sfx', 'voix'].includes(t[i].v) && t[i + 1]?.v === '(' && t[i - 1]?.v !== 'function') {
      kind = { clipOn: 'play', clipPrep: 'prepare', art: 'get', sfx: 'sfx', voix: 'voix' }[t[i].v]; open = i + 1;
    } else if (t[i].v === 'sfx' && t[i - 1]?.v === '.' && t[i + 1]?.v === '(') { kind = 'sfx'; open = i + 1; }
    if (!kind) continue;
    const end = close(t, open), first = t[open + 1], next = t[open + 2];
    const nom = [',', ')'].includes(next?.v) ? literal(first?.v) : null;
    let a = open + 1; while (a < end && t[a].v !== ',') a++;
    const alternatives = nom === null && kind === 'sfx' ? t.slice(open + 1, a).map(x => literal(x.v)).filter(x => x !== null) : [];
    out.push({ fichier: file, ligne: t[i].line, appel: src.slice(t[i].at, t[end].end), operation: kind, nom, ...(alternatives.length ? { alternatives } : {}) });
  }
  return out;
}

export function inventorier(repo = REPO) {
  repo = path.resolve(repo); const root = path.join(repo, 'proto-neon');
  const relative = p => path.relative(root, p).split(path.sep).join('/');
  const sources = walk(path.join(root, 'src')).filter(f => f.endsWith('.js')).map(f => ({ file: relative(f), src: fs.readFileSync(f, 'utf8') }));
  const source = n => sources.find(s => s.file === 'src/' + n).src;
  const clips = data(source('05-art.js'), 'CLIPS');
  const routes = sources.flatMap(s => calls(s.src, s.file));
  const media = [];
  for (const dir of ['cine', 'art', 'musique', 'sons']) for (const abs of walk(path.join(root, dir))) {
    const fichier = relative(abs), ext = path.extname(abs), type = dir === 'cine' && ext === '.mp4' ? 'video' : image.test(abs) ? 'image' : audio.test(abs) ? 'audio' : null;
    if (type) media.push({ fichier, type, nom: path.basename(abs, ext), octets: fs.statSync(abs).size, sha256: sha(fs.readFileSync(abs)), declenchements: [], chargements: [], declarations: [] });
  }
  const add = (m, r, via) => { const ref = { ...r, ...(via ? { via } : {}) }; if (!m.declenchements.some(x => JSON.stringify(x) === JSON.stringify(ref))) m.declenchements.push(ref); };
  const anchors = (file, operation) => routes.filter(r => r.fichier === 'src/' + file && r.operation === operation && r.nom === null);
  const link = (nom, rs, via) => media.filter(m => m.nom === nom && ['image', 'video'].includes(m.type) && !m.fichier.slice(m.fichier.indexOf('/') + 1).includes('/')).forEach(m => rs.forEach(r => add(m, r, via)));
  for (const m of media) if (['image', 'video'].includes(m.type)) {
    for (const r of routes.filter(r => r.nom === m.nom && (m.type === 'video' ? ['play', 'prepare'] : ['play', 'prepare', 'get']).includes(r.operation))) add(m, r, 'appel littéral');
  }
  // Tables déclaratives reliées aux vrais lecteurs et à leurs appels publics.
  const av = data(source('64-aventure.js'), 'ETAPES');
  for (const e of av.value.filter(e => e.type === 'film')) {
    for (const base of typeof e.base === 'object' && e.base ? Object.values(e.base) : [e.base]) {
      if (!base) continue;
      for (const nom of [base, base + '-elle', base + '-lui']) link(nom, anchors('64-aventure.js', 'play').concat(anchors('64-aventure.js', 'prepare')), 'ETAPES ' + e.id + ' → nomFilm(base) → N.art.pour (src/64-aventure.js:' + av.line + ') ; selon disponibilité/personnage');
    }
  }
  const intro = data(source('60-intro.js'), 'ETAPES'), films = data(source('60-intro.js'), 'FILMS');
  for (const e of intro.value.filter(e => !['titre', 'invite'].includes(e.nom))) link(e.nom, anchors('60-intro.js', 'play').concat(anchors('60-intro.js', 'prepare')), 'ETAPES ouverture (src/60-intro.js:' + intro.line + ')');
  for (const nom of [...Object.keys(films.value), 'defaite', 'victoire']) for (const n of [nom, nom + '-elle', nom + '-lui']) link(n, anchors('60-intro.js', 'play').concat(anchors('60-intro.js', 'prepare')), 'transition(nom) → pour(nom), FILMS src/60-intro.js:' + films.line + ' ; selon disponibilité/personnage');
  for (const qui of ['elle', 'lui']) link('pilote-' + qui, anchors('62-choix.js', 'play').concat(anchors('62-choix.js', 'prepare')), 'INFO[' + qui + '].art → clipOn/clipPrep');
  const piste = JSON.parse(fs.readFileSync(path.join(root, 'musique/piste.json'))), catalogue = JSON.parse(fs.readFileSync(path.join(root, 'musique/morceaux/morceaux.json')));
  const at = (file, needle) => { const s = source(file), p = s.indexOf(needle); if (p < 0) throw new Error('Ancre absente : ' + file + ' ' + needle); return { fichier: 'src/' + file, ligne: s.slice(0, p).split('\n').length, appel: s.slice(p, s.indexOf('\n', p)), operation: 'chargement audio' }; };
  const blocLoader = at('30-music.js', 'src = fetch(LD.base + b.fichier)'), longLoader = at('30-music.js', 'fetch(m.url)');
  const imageLoader = at('05-art.js', "var jobs = Object.keys(SRC).map");
  for (const m of media.filter(m => m.type === 'image' && !m.fichier.slice(4).includes('/') && m.fichier.endsWith('.png'))) m.chargements.push({ ...imageLoader, operation: 'chargement image', via: 'build.mjs ART_SRC (PNG de premier niveau seulement) → decode(n, SRC[n]) ; une image chargée n’est pas forcément affichée' });
  const manque = [];
  for (const b of piste.blocs) {
    const fichier = 'musique/' + b.fichier, m = media.find(m => m.fichier === fichier);
    if (m) { add(m, blocLoader, 'piste.json → blocs, section ' + b.section); m.chargements.push(blocLoader); } else manque.push({ fichier, depuis: 'musique/piste.json', raison: 'bloc référencé sans fichier' });
  }
  const prog = data(source('30-music.js'), 'PROG');
  for (const b of catalogue.morceaux) {
    const fichier = 'musique/morceaux/' + b.fichier, m = media.find(m => m.fichier === fichier);
    const usages = Object.entries(prog.value).filter(([, ids]) => ids.some(id => id.replace('!', '') === b.id)).map(([k]) => k);
    if (m && usages.length) { add(m, longLoader, 'morceaux.json → PROG ' + usages.join(', ') + ' (src/30-music.js:' + prog.line + ')'); m.chargements.push(longLoader); }
    if (!m) manque.push({ fichier, depuis: 'musique/morceaux/morceaux.json', raison: 'morceau référencé sans fichier' });
  }
  for (const [nom, params] of Object.entries(clips.value)) {
    const m = media.find(m => m.fichier === 'cine/' + nom + '.mp4');
    if (m) { m.declarations.push({ fichier: 'src/05-art.js', ligne: keys(source('05-art.js'), 'CLIPS').find(k => k.name === nom).line, table: 'CLIPS', boucle: !!params[0] }); m.chargements.push(at('05-art.js', "v.src = ((typeof CINE_BASE")); }
    else manque.push({ fichier: 'cine/' + nom + '.mp4', depuis: 'src/05-art.js:' + clips.line, raison: 'CLIPS sans fichier (repli silencieux possible)' });
  }
  // Références littérales aux panneaux/clips : seuls les appels comptent, pas les commentaires.
  for (const r of routes.filter(r => r.nom && ['get', 'play', 'prepare'].includes(r.operation))) {
    if (r.operation === 'get' && !media.some(m => m.fichier === 'art/' + r.nom + '.png')) manque.push({ fichier: 'art/' + r.nom + '.png', depuis: r.fichier + ':' + r.ligne, raison: 'panneau demandé sans PNG' });
    if (r.operation !== 'get' && !media.some(m => m.fichier === 'cine/' + r.nom + '.mp4')) manque.push({ fichier: 'cine/' + r.nom + '.mp4', depuis: r.fichier + ':' + r.ligne, raison: 'clip demandé sans fichier' });
  }
  // Les sons sont synthétisés : inventorier aussi chaque recette et son site d'appel.
  const sons = keys(source('30-music.js'), 'SFX').map(k => ({ nom: k.name, definition: 'src/30-music.js:' + k.line, type: 'synthese Web Audio', declenchements: routes.filter(r => r.operation === 'sfx' && (r.nom === k.name || r.alternatives?.includes(k.name))) }));
  for (const nom of ['traversee', 'ralenti', 'repli']) {
    const r = routes.find(r => r.fichier === 'src/79-scene.js' && r.appel === 'sfx(id)');
    if (r) sons.find(s => s.nom === nom)?.declenchements.push({ ...r, via: "onPouvoir : garde id === 'traversee' || id === 'ralenti' || id === 'repli'" });
  }
  const voix = keys(source('30-music.js'), 'MOTS').map(k => ({ nom: k.name, definition: 'src/30-music.js:' + k.line, type: 'voix synthétisée', declenchements: routes.filter(r => r.operation === 'voix' && r.nom === k.name) }));
  const bank = fs.readFileSync(path.join(root, 'sons/banque.js'), 'utf8');
  const sandbox = { module: { exports: {} } }; vm.runInNewContext(bank, sandbox, { timeout: 1000 });
  const banque = Object.keys(sandbox.module.exports.sons).map(nom => ({ nom, definition: 'sons/banque.js:' + (bank.slice(0, bank.indexOf('S.' + nom + ' =')).split('\n').length), declenchements: [], statut: 'bibliothèque hors bundle ; aucune référence SONS_2975 dans src/' }));
  const contexteVoix = { module: { exports: {} } };
  const voixSrc = fs.readFileSync(path.join(root, 'sons/voix.js'), 'utf8');
  vm.runInNewContext(voixSrc, contexteVoix, { timeout: 1000 });
  const voixDefs = keys(voixSrc, 'MOTS');
  const voixHorsBundle = contexteVoix.module.exports.mots.map(nom => ({ nom, definition: 'sons/voix.js:' + voixDefs.find(k => k.name === nom).line, statut: 'bibliothèque hors bundle ; aucune référence VOIX_2975 dans src/' }));
  for (const m of media) {
    m.statut = (m.type === 'video' ? m.declenchements.some(r => r.operation === 'play') : m.declenchements.length) ? 'chemin statique retrouvé, lecture à vérifier' : 'aucun déclenchement retrouvé';
    if (m.fichier.startsWith('musique/brut/')) m.note = 'source de fabrication ; non chargée par le jeu';
    if (/^art\/[^/]+\//.test(m.fichier)) m.note = 'hors injection ART_SRC de build.mjs ; aucune lecture de ce fichier retrouvée (dessin procédural distinct)';
  }
  const horsClips = media.filter(m => m.type === 'video' && !Object.hasOwn(clips.value, m.nom)).map(m => m.fichier);
  const unresolved = routes.filter(r => r.nom === null);
  const nonDeclenches = media.filter(m => m.statut === 'aucun déclenchement retrouvé').map(m => m.fichier);
  const sansSon = sons.filter(s => !s.declenchements.length).map(s => s.nom);
  const summary = { videos: media.filter(m => m.type === 'video').length, clips: Object.keys(clips.value).length, images: media.filter(m => m.type === 'image').length, audio: media.filter(m => m.type === 'audio').length, sonsSynthese: sons.length, voixSynthese: voix.length, recettesHorsBundle: banque.length, voixHorsBundle: voixHorsBundle.length, fichiersSansDeclenchement: nonDeclenches.length, referencesSansFichier: manque.length, videosHorsClips: horsClips.length };
  return { dateParis: paris(), methode: 'Analyse statique des appels et tables de routage ; aucune preuve de lecture navigateur. Les wrappers dynamiques restent publiés pour audit. Les assets de fabrication non raccordés sont signalés sans les déclarer joués.', bundleSha256: fs.existsSync(path.join(root, 'index.html')) ? sha(fs.readFileSync(path.join(root, 'index.html'))) : null, sourcesSha256: sha(sources.map(s => s.file + '\n' + s.src).join('\n')), resume: summary, clips: Object.entries(clips.value).map(([nom, p]) => ({ nom, boucle: !!p[0], cyan: !!p[1] })), medias: media, sons, voix, banqueHorsBundle: banque, voixHorsBundle, fichiersSansDeclenchement: nonDeclenches, sonsSansAppelRetrouve: sansSon, referencesSansFichier: manque, videosHorsClips: horsClips, appelsDynamiques: unresolved, portee: 'Un chemin de dispatch peut être conditionnel ou ancien ; la joignabilité de tous les chemins depuis le titre n’est pas prouvée par cet inventaire.' };
}

export function sauverInventaire(repo = REPO, out = path.join(repo, 'proto-neon/tools/v0/inventaire.json')) {
  const r = inventorier(repo); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(r, null, 2) + '\n');
  console.log(JSON.stringify(r.resume)); console.log('Inventaire : ' + out); return r;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--racine'), j = process.argv.indexOf('--sortie');
  sauverInventaire(i < 0 ? REPO : process.argv[i + 1], j < 0 ? undefined : process.argv[j + 1]);
}

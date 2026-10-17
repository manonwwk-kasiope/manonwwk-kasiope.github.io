/* R-26 — Mixage (§ 5.7, N.R.son) : rendu hors ligne (N.music.renderOffline) ; musique au calme ≥ −20 dBFS RMS
   après un passe-haut de 350 Hz (haut-parleur de téléphone) ; au chaos ≈ −14 dBFS ; écart calme → chaos
   ≥ 6 dB ; corrélation tension ↔ niveau ≥ 0,5 ; crête ≤ −1 dBFS ; sons kill, coupe et mort 3 à 6 dB au-dessus
   de la musique ; tir au moins 6 dB sous le kill ; au moins 25 % de l'énergie au-dessus de 400 Hz pour
   chaque son de la banque (§ 5.8). */
import { executer, principal, seuils, exiger, stats } from '../commun.mjs';

export const meta = { id: 'R-26', titre: 'Mixage', seuil: 'calme ≥ −20 dBFS ; écart ≥ 6 dB ; corrélation ≥ 0,5 ; crête ≤ −1 dBFS ; sons 3-6 dB au-dessus ; ≥ 25 % au-dessus de 400 Hz', bloquant: true };
const SONS = ['tir', 'salve', 'kill', 'bigkill', 'coupe', 'mort', 'impact', 'butin', 'noyau', 'pastille', 'lasso', 'portail', 'arme', 'convoi', 'warning', 'carte', 'defi', 'bip'];

/* dans la page : rendu, passe-haut, RMS par fenêtres, énergie au-dessus d'une fréquence */
const OUTILS = `
window.__R26 = {
  async rendu(sec, tension, events, mute) { const rng = window.__N.rng; if (rng && rng.reset && rng.graine) rng.reset(rng.graine()); const b = await window.__N.music.renderOffline(sec, typeof tension === 'function' ? tension : () => tension, events || null, 44100, mute, { sections: [{ t: 0, nom: 'jeu' }] }); if (!b) return null; const L = b.getChannelData(0), R = b.getChannelData(1), m = new Float32Array(L.length); let crete = 0; for (let i = 0; i < L.length; i++) { m[i] = (L[i] + R[i]) / 2; crete = Math.max(crete, Math.abs(L[i]), Math.abs(R[i])); } return { m, sr: b.sampleRate, crete }; },
  passeHaut(x, sr, fc) { const w = 2 * Math.PI * fc / sr, c = Math.cos(w), s = Math.sin(w), al = s / Math.SQRT2, a0 = 1 + al; const b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, b2 = b0, a1 = -2 * c / a0, a2 = (1 - al) / a0; const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; },
  db(x, a, b) { a = a || 0; b = b || x.length; let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return 10 * Math.log10(s / Math.max(1, b - a) + 1e-20); },
  fenetres(x, sr, sec) { const n = Math.floor(sr * sec), out = []; for (let i = 0; i + n <= x.length; i += n) out.push(this.db(x, i, i + n)); return out; },
  /* Énergie du transitoire entier, sans fenêtre qui efface son attaque ; bourrage de zéros seulement. */
  aigus(x, sr, f) { let n = 1; while (n < x.length) n <<= 1; const re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < Math.min(n, x.length); i++) re[i] = x[i];
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
    let tot = 0, haut = 0; const kf = Math.round(f * n / sr); for (let k = 1; k < n / 2; k++) { const e = re[k] * re[k] + im[k] * im[k]; tot += e; if (k >= kf) haut += e; } return tot ? haut / tot : null; }
};`;

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('bureau', {});
  const { R } = await seuils(s, 'R26');
  const M = (R.son && R.son.mix) || { calmeDbfs: -20, passeHautTel: 350, chaosDbfs: -14, ecartDb: 6, correlation: 0.5, sonsAuDessus: [3, 6], tirSousKill: 6, creteDbfs: -1 };
  const aigus = (R.son && R.son.energieAigus) || 0.25, fA = (R.son && R.son.seuilAigus) || 400;
  if (!await exiger(s, res, 'rendu hors ligne', ['N.music.renderOffline'])) return;
  await s.page.addScriptTag({ content: OUTILS });
  res.note('Repli génératif en section jeu explicite, même graine remise avant chaque rendu ; la piste MP3 non fournie à renderOffline reste non mesurée. Les anciens reçus rendaient la section titre (tension effective 0,12).');
  const sec = banc.o.rapide ? 8 : 16;
  const r = await s.eval(async o => {
    const T = window.__R26, out = {};
    const calme = await T.rendu(o.sec, 0, null, 'sfx'), chaos = await T.rendu(o.sec, 1, null, 'sfx');
    if (!calme || !chaos) return null;
    out.calme = T.db(T.passeHaut(calme.m, calme.sr, o.fc)); out.chaos = T.db(T.passeHaut(chaos.m, chaos.sr, o.fc));
    const dur = o.sec * 3, ten = t => 0.5 - 0.5 * Math.cos(2 * Math.PI * t / dur);
    const rampe = await T.rendu(dur, ten, null, 'sfx'), niv = T.fenetres(T.passeHaut(rampe.m, rampe.sr, o.fc), rampe.sr, 1);
    out.niveaux = niv; out.tensions = niv.map((_, i) => ten(i + 0.5));
    const ev = []; for (let k = 0; k < o.sec * 4; k++) ev.push({ t: 0.25 * k + 0.1, name: k % 3 ? 'kill' : 'bigkill', opts: { pitch: k % 9 } });
    const plein = await T.rendu(o.sec, 1, ev, null); out.crete = 20 * Math.log10(plein.crete + 1e-20);
    /* chaque son seul (musique coupée), et la musique seule au même instant, à mi-tension */
    const mus = await T.rendu(4, 0.5, null, 'sfx'); out.musique = T.db(mus.m, Math.floor(0.5 * mus.sr), Math.floor(0.8 * mus.sr));
    out.sons = {};
    for (const nom of o.sons) {
      const b = await T.rendu(2, 0.5, [{ t: 0.5, name: nom, opts: {} }], 'music'); if (!b) continue;
      const a = Math.floor(0.5 * b.sr), z = a + Math.floor(0.3 * b.sr);
      out.sons[nom] = { db: T.db(b.m, a, z), aigus: T.aigus(b.m.subarray(a), b.sr, o.fA) };
    }
    return out;
  }, { sec, fc: M.passeHautTel, sons: SONS, fA });
  if (!r) return res.nonMesurable('rendu hors ligne', 'N.music.renderOffline a rendu null (OfflineAudioContext absent)');
  res.note('Sortie audio brute, section jeu : ' + JSON.stringify(r));
  res.nonMesurable('mixage de la piste principale', 'renderOffline sans piste ni buffers ne rend que le repli génératif ; fournir piste.json et les blocs décodés pour qualifier Neon Velocity');
  res.verifie('musique au calme, passe-haut 350 Hz (dBFS RMS)', r.calme, '≥ ' + M.calmeDbfs, r.calme >= M.calmeDbfs);
  res.indicatif('musique au chaos, passe-haut 350 Hz (dBFS RMS)', r.chaos, M.chaosDbfs + ' ± 2', Math.abs(r.chaos - M.chaosDbfs) <= 2);
  res.verifie('écart calme → chaos (dB)', r.chaos - r.calme, '≥ ' + M.ecartDb, r.chaos - r.calme >= M.ecartDb);
  const c = stats.correlation(r.tensions, r.niveaux);
  res.verifie('corrélation tension ↔ niveau (fenêtres de 1 s)', c, '≥ ' + M.correlation, c !== null && c >= M.correlation);
  res.verifie('crête au chaos, kills compris (dBFS)', r.crete, '≤ ' + M.creteDbfs, r.crete <= M.creteDbfs);
  const S = r.sons;
  for (const nom of ['kill', 'coupe', 'mort']) {
    if (!S[nom]) { res.nonMesurable(`${nom} au-dessus de la musique`, 'son absent du rendu'); continue; }
    const e = S[nom].db - r.musique;
    res.verifie(`${nom} au-dessus de la musique (dB)`, e, M.sonsAuDessus, e >= M.sonsAuDessus[0] && e <= M.sonsAuDessus[1]);
  }
  if (S.tir && S.kill) res.verifie('tir sous le kill (dB)', S.kill.db - S.tir.db, '≥ ' + M.tirSousKill, S.kill.db - S.tir.db >= M.tirSousKill);
  for (const [nom, v] of Object.entries(S)) {
    if (v.db < -80) { res.nonMesurable(`${nom} : énergie au-dessus de ${fA} Hz`, 'son muet dans le rendu hors ligne'); continue; }
    res.verifie(`${nom} : énergie au-dessus de ${fA} Hz`, v.aigus, '≥ ' + aigus, v.aigus !== null && v.aigus >= aigus);
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });

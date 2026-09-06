// Outils de cycle de vie (G2, réutilisables) : visibilité simulée, espions navigator.wakeLock.request et
// AudioContext.prototype.resume (état simulé), vue « au repos », scrutation chronométrée côté page.
// Les espions sont des scripts d'initialisation : à passer dans opts.init de launchDesktop/launchPhone/launchTablet
// (lib.mjs), donc posés AVANT le chargement du jeu.

/** Compte les appels du jeu à navigator.wakeLock.request et garde les sentinelles : window.__WL =
 *  { calls, api, stub, resolved, rejected, sentinels[] }. Si le navigateur de test n'expose pas l'API, une doublure
 *  minimale est posée (stub: true) : la grandeur mesurée est le nombre d'appels faits par le jeu. */
export const INIT_WAKE_SPY = `(() => {
  const W = window.__WL = { calls: 0, api: !!navigator.wakeLock, stub: false, resolved: 0, rejected: 0, sentinels: [] };
  const mkSentinel = () => { const s = { released: false, type: 'screen', _l: [],
    addEventListener(t, f) { if (t === 'release') s._l.push(f); }, removeEventListener() {},
    async release() { if (!s.released) { s.released = true; s._l.forEach(f => { try { f({ type: 'release' }); } catch (e) {} }); } } }; return s; };
  if (W.api) {
    const wl = navigator.wakeLock; const orig = wl.request.bind(wl);
    Object.defineProperty(wl, 'request', { configurable: true, writable: true, value: function (t) {
      W.calls++; let p;
      try { p = orig(t); } catch (e) { W.rejected++; return Promise.reject(e); }
      return p.then(s => { W.resolved++; W.sentinels.push(s); return s; }, e => { W.rejected++; throw e; });
    } });
  } else {
    W.stub = true;
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async function () { W.calls++; W.resolved++; const s = mkSentinel(); W.sentinels.push(s); return s; } } });
  }
})();`;

/** Compte AudioContext.prototype.resume (window.__AR = { calls, ok }) et permet de simuler l'état du contexte :
 *  window.__AUD_FAKE_STATE = 'interrupted' → la propriété state de tout contexte rend cette valeur (null : état réel). */
export const INIT_AUDIO_SPY = `(() => {
  const A = window.__AR = { calls: 0, ok: false, states: [] };
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const proto = C.prototype, base = window.BaseAudioContext ? window.BaseAudioContext.prototype : proto;
  const origResume = proto.resume;
  proto.resume = function () { A.calls++; A.states.push(this.state); return origResume.apply(this, arguments); };
  const d = Object.getOwnPropertyDescriptor(base, 'state');
  if (d && d.get) Object.defineProperty(base, 'state', { configurable: true, get: function () { return window.__AUD_FAKE_STATE || d.get.call(this); } });
  A.ok = true;
})();`;

/** Simule document.hidden / visibilityState puis émet visibilitychange (même procédé que son-ios.mjs).
 *  opts.releaseWake : à la mise en arrière-plan, libère les sentinelles de verrou d'écran encore actives — c'est ce
 *  que fait le navigateur dès que l'onglet est caché (release() réel sur les vraies sentinelles). */
export async function setVisibility(page, hidden, opts = {}) {
  return page.evaluate(async ([hidden, releaseWake]) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
    let released = 0;
    if (hidden && releaseWake && window.__WL) for (const s of window.__WL.sentinels) { if (!s.released) { try { await s.release(); released++; } catch (e) {} } }
    document.dispatchEvent(new Event('visibilitychange'));
    return { hidden, released };
  }, [hidden, !!opts.releaseWake]);
}

/** Vue « au repos » : S.view.w / S.view.h tels que les écrit le rendu (ils intègrent le zoom de caméra), échantillonnés
 *  image par image jusqu'à maxMs, retenus quand zc.mode === 0 (zmode), perspective < 0,5°, zoom caméra à sa cible
 *  (|zoom − zoomT| < 0,005) et S.phase === 'play'. Rend la médiane de ≥ 20 images au repos, sinon rest:false. */
export async function viewAtRest(page, maxMs = 5000) {
  return page.evaluate(async (maxMs) => {
    const S = window.__S, M = window.__M;
    if (!(M.phases && typeof M.phases.state === 'function')) return { rest: false, why: 'phases.state absent' };
    const t0 = performance.now(), samples = [];
    while (performance.now() - t0 < maxMs) {
      await new Promise(r => requestAnimationFrame(r));
      const st = M.phases.state();
      const rest = st.zmode === 0 && st.perspDeg < 0.5 && Math.abs(st.zoom - st.zoomT) < 0.005 && S.phase === 'play';
      samples.push({ w: S.view.w, h: S.view.h, zoom: st.zoom, zoomT: st.zoomT, zmode: st.zmode, persp: st.perspDeg, kind: st.phase, rest });
      if (samples.filter(s => s.rest).length >= 20) break;
    }
    const r = samples.filter(s => s.rest);
    const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
    const last = samples[samples.length - 1] || null;
    if (!r.length) return { rest: false, n: 0, sampled: samples.length, last, innerW: innerWidth, innerH: innerHeight };
    return { rest: true, n: r.length, w: +med(r.map(s => s.w)).toFixed(1), h: +med(r.map(s => s.h)).toFixed(1), zoom: +med(r.map(s => s.zoom)).toFixed(3),
      ratio: +(med(r.map(s => s.w)) / med(r.map(s => s.h))).toFixed(3), kind: r[0].kind, innerW: innerWidth, innerH: innerHeight, paused: S.paused };
  }, maxMs);
}

/** Émet un événement (target 'window' | 'document', nom, init) puis scrute le prédicat (source JS sur S, M) toutes les
 *  stepMs jusqu'à maxMs, le tout côté page : { ok, ms } avec ms = délai jusqu'à la première vérification vraie. */
export async function dispatchAndPoll(page, target, name, predSrc, maxMs = 100, stepMs = 4, init = {}) {
  return page.evaluate(([target, name, src, maxMs, stepMs, init]) => new Promise(res => {
    const f = new Function('S', 'M', 'return (' + src + ')');
    const tgt = target === 'document' ? document : window;
    const t0 = performance.now();
    tgt.dispatchEvent(new Event(name, init));
    (function p() {
      let ok = false; try { ok = !!f(window.__S, window.__M); } catch (e) {}
      const ms = performance.now() - t0;
      if (ok) return res({ ok: true, ms: +ms.toFixed(1) });
      if (ms >= maxMs) return res({ ok: false, ms: +ms.toFixed(1) });
      setTimeout(p, stepMs);
    })();
  }), [target, name, predSrc, maxMs, stepMs, init]);
}

/** Scrute un prédicat (source JS sur S, M) côté page : { ok, ms }. */
export async function pollInPage(page, predSrc, maxMs = 1000, stepMs = 4) {
  return page.evaluate(([src, maxMs, stepMs]) => new Promise(res => {
    const f = new Function('S', 'M', 'return (' + src + ')');
    const t0 = performance.now();
    (function p() {
      let ok = false; try { ok = !!f(window.__S, window.__M); } catch (e) {}
      const ms = performance.now() - t0;
      if (ok) return res({ ok: true, ms: +ms.toFixed(1) });
      if (ms >= maxMs) return res({ ok: false, ms: +ms.toFixed(1) });
      setTimeout(p, stepMs);
    })();
  }), [predSrc, maxMs, stepMs]);
}

/** Vue synthétique de S.input / S.snake pour les tests de perte de focus. */
export async function inputState(page) {
  return page.evaluate(() => { const S = window.__S, i = S.input, s = S.snake || {};
    return { paused: S.paused, phase: S.phase, screen: window.__M.ui.screen(), jactive: i.jactive, jmag: i.jmag, jx: i.jx, jy: i.jy, boost: i.boost, special: i.special, ult: i.ult,
      boosting: s.boosting, ang: s.ang, speed: s.speed, t: S.t }; });
}

/* Prototype hors production. Le contexte et la sortie appartiennent à l'appelant. */
(() => {
  'use strict';
  const note = (at, start, end, length, level, pan = 0) => ({at, start, end, length, level, pan});
  const timbres = {
    rail: [note(0,960,460,.105,.32)],
    arc: [note(0,1210,840,.083,.27),note(.048,1570,1050,.077,.22)],
    nova: [note(0,680,190,.22,.43),note(.028,1160,580,.11,.25)],
    orbit: [note(0,510,620,.36,.23,-.48),note(0,524,611,.36,.18,.48)],
    prism: [note(0,730,1030,.16,.25,-.6),note(.036,730,1450,.16,.25),note(.072,730,1920,.16,.25,.6)],
    well: [note(0,870,205,.39,.41),note(.026,432,310,.28,.19)],
    echo: [note(0,940,645,.085,.28)],
    chain: [note(0,1180,970,.072,.27,-.4),note(.041,1550,1270,.072,.27,.4),note(.082,1910,1570,.072,.27,-.4)],
    blast: [note(0,780,130,.18,.46),note(.008,1860,490,.062,.25)],
    far: [note(0,1460,1450,.103,.33),note(.112,1050,1040,.103,.33),note(.226,740,733,.103,.33)],
    near: [note(0,740,733,.103,.33),note(.077,1460,1450,.103,.33)],
    bossFinal: [note(0,320,465,.28,.37),note(.095,495,755,.22,.26),note(.24,590,980,.14,.23)],
    prizeMid: [note(0,530,640,.13,.31),note(.12,740,850,.16,.32)],
    prizeFinal: [note(0,530,640,.13,.31),note(.12,740,850,.16,.32),note(.245,900,1390,.26,.32)],
    cell: [note(0,554,831,.10,.22)], upgrade: [note(0,415,831,.22,.25)],
    clear: [note(0,440,880,.27,.26)], death: [note(0,470,155,.29,.30)],
    win: [note(0,440,880,.30,.25), note(.2,660,1320,.26,.25)],
    boss: [note(0,410,540,.25,.37),note(.14,615,820,.24,.27)],
    bossAttack: [note(0,680,950,.11,.44),note(.135,680,1120,.15,.44)],
    bossVolley: [note(0,1110,620,.14,.43)],
    flightGate: [note(0,560,700,.10,.20)],
    flightStart: [note(0,280,925,.24,.38),note(.04,410,660,.18,.19)],
    flightRing: [note(0,880,1190,.10,.24)],
    flightEnd: [note(0,860,710,.18,.23)],
    flightCrash: [note(0,580,215,.14,.29)]
  };
  function timbre(info) {
    switch (info.type) {
      case 'boss': return info.kind==='final'?'bossFinal':'boss';
      case 'bossDefeated': return info.kind==='final'?'prizeFinal':'prizeMid';
      case 'win': case 'clear': case 'death': case 'cell': case 'upgrade': return info.type;
      case 'shot': return info.kind==='arc'?'arc':'rail';
      case 'nova': return 'nova';
      case 'forgeShot': return ['orbit','prism','well'].includes(info.core) && info.core;
      case 'forgeHit': return ['chain','echo','blast'].includes(info.mod) && info.mod;
      case 'planeShift': return info.to === 1 ? 'far' : 'near';
      default: return Object.hasOwn(timbres,info.type) && /^(flight|boss)/.test(info.type) && info.type;
    }
  }
  const years=[1976,1985,1995,2185,2985];
  function makeBuffer(context, notes, year, level=1) {
    const rate=context.sampleRate, length=Math.ceil(rate*Math.max(...notes.map(n=>n.at+n.length)));
    const buffer=context.createBuffer(2,length,rate);
    const left=buffer.getChannelData(0), right=buffer.getChannelData(1);
    for (const n of notes) {
      const gainL=Math.sqrt((1-n.pan)/2), gainR=Math.sqrt((1+n.pan)/2);
      const count=Math.floor(n.length*rate), offset=Math.round(n.at*rate);
      let seed=13487, arpPhase=0;
      for (let i=0; i<count && offset+i<length; i++) {
        const t=i/rate;
        const phase=2*Math.PI*(n.start*t+(n.end-n.start)*t*t/(2*n.length));
        const env=Math.min(1,t/.006,(n.length-t)/.013)*Math.exp(-1.4*t/n.length);
        const fundamental=Math.sin(phase), hz=n.start+(n.end-n.start)*t/n.length;
        let l=fundamental,r=l;
        switch(year) {
          case 1976: {
            // Carré monophonique adouci, construit avec ses partiels impairs disponibles.
            let square=fundamental;
            for(let k=3;k<=9 && k*hz<.46*rate;k+=2) square+=Math.sin(k*phase)/k;
            l=r=.89*square;
            break;
          }
          case 1985: {
            seed=(Math.imul(seed,1664525)+1013904223)>>>0;
            const grit=(seed/2**31-1)*.24*Math.exp(-35*t);
            l=r=.86*fundamental+.28*Math.sin(3*phase)+grit;
            break;
          }
          case 1995: {
            const arp=[1,1.25,1.5,1][Math.floor(t/.042)%4];
            arpPhase+=2*Math.PI*hz*arp/rate;
            l=r=.85*(Math.sin(arpPhase)-Math.sin(3*arpPhase)/9)+.16*fundamental;
            break;
          }
          case 2185: {
            const fm=Math.sin(phase+.76*Math.exp(-13*t)*Math.sin(1.5*phase));
            const strike=Math.round(31*Math.sin(2.12*phase))/31*Math.exp(-75*t);
            l=r=.89*fm+.16*strike;
            break;
          }
          case 2985:
            l=.78*fundamental+.20*Math.sin(phase*1.006)+.12*Math.sin(2*phase);
            r=.78*fundamental+.20*Math.sin(phase*.994)+.12*Math.sin(2*phase);
            break;
        }
        const volume=n.level*env*level;
        left[offset+i]+=volume*l*gainL;right[offset+i]+=volume*r*gainR;
      }
    }
    return buffer;
  }

  function create(context, output, {limit=8, mode='priority',year=null}={}) {
    if (!Number.isInteger(limit) || limit<4 || !['priority','fifo','raw'].includes(mode))
      throw new RangeError('Budget minimal de quatre voix et mode de mix valide requis');
    if (year!==null && !years.includes(year)) throw new RangeError('Époque inconnue');
    const buffers=new Map(), voices=new Set(), lastHit=new Map();
    const foreground=context.createGain(), action=context.createGain();
    foreground.connect(output); action.connect(output);
    let closed=false, duckEnd=0;
    const stats={accepted:0,coalesced:0,rejected:0,peakVoices:0};
    function play(info) {
      if (closed || !info) return false;
      const key=timbre(info);
      if (!key) return false;
      const now=context.currentTime;
      for (const voice of voices) if (voice.end<=now) voices.delete(voice);
      const group=info.type==='planeShift'?'plane':info.type.startsWith('boss')?'boss':'action';
      const bucket=[info.core,info.mod,info.plane].join('/');
      if (mode==='priority' && info.type==='forgeHit' && now-(lastHit.get(bucket)??-1)<.08) {
        stats.coalesced++; return false;
      }
      // Deux places pour chacun des deux signaux critiques, même au milieu d'une salve.
      const groupLimit=group==='action'?limit-4:2;
      if ((mode!=='raw' && voices.size>=limit) ||
          (mode==='priority' && [...voices].filter(v=>v.group===group).length>=groupLimit)) {
        stats.rejected++; return false;
      }
      const paletteKey=(year??'reference')+'/'+key;
      if (!buffers.has(paletteKey)) buffers.set(paletteKey,makeBuffer(context,timbres[key],year,year && group!=='action'?1.8:1));
      const source=context.createBufferSource();
      source.buffer=buffers.get(paletteKey);
      source.connect(group==='action'?action:foreground);
      const end=now+source.buffer.duration, voice={source,end,group};
      source.onended=()=>{voices.delete(voice);source.disconnect();};
      if (mode==='priority' && group!=='action') {
        duckEnd=Math.max(duckEnd,end+.018);
        action.gain.cancelScheduledValues(now);
        action.gain.setTargetAtTime(.32,now,.007);
        action.gain.setTargetAtTime(1,duckEnd,.040);
      }
      if (info.type==='forgeHit') lastHit.set(bucket,now);
      voices.add(voice); source.start(now);
      stats.accepted++; stats.peakVoices=Math.max(stats.peakVoices,voices.size);
      return true;
    }
    function stop() {
      for (const {source} of voices) { source.stop(); source.disconnect(); }
      voices.clear();lastHit.clear();duckEnd=0;
      action.gain.cancelScheduledValues(context.currentTime);
      action.gain.setValueAtTime(1,context.currentTime);
    }
    function dispose() {
      if (closed) return;
      stop(); action.disconnect(); foreground.disconnect(); buffers.clear(); closed=true;
    }
    function setYear(next) {
      if (!years.includes(next)) throw new RangeError('Époque inconnue');
      year=next;
    }
    return {setYear,handles:info=>Boolean(info && timbre(info)),play,stop,dispose,stats};
  }
  const api={create,years:Object.freeze(years)};
  if (typeof module==='object' && module.exports) module.exports=api;
  else globalThis.SnakeAudioPriority=api;
})();

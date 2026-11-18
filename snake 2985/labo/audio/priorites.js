/* Prototype hors production. Le contexte et la sortie appartiennent à l'appelant. */
(() => {
  'use strict';
  const note = (at, start, end, length, level, pan = 0) => ({at, start, end, length, level, pan});
  const timbres = {
    // Deux dents, un vide, puis trois dents : motif asymétrique en créneaux.
    overloadComb: [0,.060,.180,.24,.30].map((at,i)=>note(at,i%2?880:440,i%2?880:440,.041,.35)),
    // Chaque rebond inverse le panoramique et perd de la hauteur et de l'énergie.
    overloadRicochet: [note(0,1420,580,.082,.36,-.58),note(.24,1180,510,.075,.31,.64),
      note(.48,975,420,.069,.27,-.66),note(.72,790,370,.059,.22,.60)],
    // Bogies de plus en plus rapprochés ; le sifflet traverse les essieux.
    overloadTrain: [note(0,300,190,.062,.31,-.65),note(.074,300,185,.045,.23,-.57),
      note(.25,335,195,.061,.31,-.34),note(.31,335,190,.041,.22,-.24),
      note(.46,390,205,.054,.31),note(.515,390,195,.041,.22,.1),
      note(.65,435,215,.049,.31,.30),note(.70,435,205,.041,.22,.4),
      note(.81,475,220,.045,.30,.62),note(.855,475,210,.041,.21,.67),note(.07,1160,620,.41,.23,.05)],
    // Deux arcs en sens contraires, graves et aigus simultanément sur le médium mobile.
    overloadMoons: [note(0,355,720,.38,.28,-.55),note(0,1065,610,.38,.24,.55),
      note(.40,720,600,.45,.27,.15),note(.40,610,600,.45,.22,-.15)],
    // Un appel clair devant, la réponse plus grave derrière, une réplique par plan.
    overloadEcho: [note(0,780,1410,.09,.32,-.32),note(.087,1210,1570,.08,.27,-.25),
      note(.28,780,1410,.08,.16,-.32),
      note(.55,920,580,.105,.29,.46),note(.66,670,455,.092,.23,.42),note(.83,920,580,.10,.14,.46)],
    overloadHit: [note(0,1190,745,.061,.20)],
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
    ecoSight: [note(0,820,820,.09,.27),note(.13,820,1010,.12,.30)],
    ecoCut: [note(0,1130,670,.08,.29),note(.10,1010,515,.11,.28)],
    ecoWake: [note(0,510,780,.13,.27,-.30),note(.095,705,980,.14,.26,.30)],
    ecoPort: [note(0,610,610,.17,.24),note(.070,910,910,.14,.24)],
    ecoActive: [note(0,930,420,.09,.28)], ecoEvade: [note(0,585,775,.12,.23)],
    ecoKill: [note(0,1350,720,.09,.28),note(.09,420,280,.13,.19)],
    ecoAbsorb: [note(0,660,300,.15,.33),note(.13,500,240,.18,.30)],
    knotClosed: [note(0,470,710,.11,.28),note(.085,710,1065,.11,.30),note(.17,1065,470,.17,.30)],
    evolutionTrigger: [note(0,330,670,.14,.26),note(.085,540,1090,.16,.22)],
    evolutionHit: [note(0,1390,980,.095,.22)],
    surfGate: [note(0,635,805,.14,.23),note(.16,805,805,.07,.22)],
    surfStart: [note(0,220,580,.29,.30),note(.10,420,880,.18,.24)],
    surfPulse: [note(0,590,1280,.18,.35),note(.10,1180,1580,.11,.25)],
    surfLanded: [note(0,960,720,.13,.27),note(.12,720,840,.15,.23)],
    surfMiss: [note(0,680,310,.23,.25)],
    hitShield: [note(0,780,495,.048,.25),note(0,1620,1210,.039,.15)],
    hitHeart: [note(0,370,210,.12,.39),note(.04,1210,1390,.105,.25)],
    hitSurf: [note(0,420,160,.19,.39),note(.065,820,1540,.12,.29)],
    guardianWarning: [note(0,840,965,.10,.37),note(.125,840,1160,.12,.35)],
    guardianBeat: [note(0,1010,1310,.095,.35),note(.11,1120,1490,.12,.30)],
    guardianCounter: [note(0,520,840,.095,.34),note(.10,840,1260,.15,.32)],
    contractTrain: [note(0,540,625,.10,.22),note(.115,540,625,.10,.22)],
    contractMolt: [note(0,645,810,.09,.21,-.3),note(.11,810,645,.09,.21,.3)],
    contractSwitch: [note(0,710,635,.065,.22),note(.08,885,790,.065,.22),note(.16,1010,915,.07,.22)],
    contractSurf: [note(0,510,990,.22,.22)],
    contractRelay: [note(0,700,700,.07,.22),note(.095,1050,1050,.07,.22),note(.19,700,700,.07,.22)],
    contractOpen: [note(0,640,745,.12,.21)], contractStep: [note(0,745,920,.09,.21)],
    contractScore: [note(0,745,920,.10,.23),note(.105,920,1110,.13,.25)],
    riftOpen: [note(0,260,820,.22,.25)],riftPickup: [note(0,830,415,.17,.25)],
    bonus: [note(0,610,910,.12,.22)],
    flightGate: [note(0,560,700,.10,.20)],
    flightStart: [note(0,280,925,.24,.38),note(.04,410,660,.18,.19)],
    flightRing: [note(0,880,1190,.10,.24)],
    flightEnd: [note(0,860,710,.18,.23)],
    flightCrash: [note(0,580,215,.14,.29)]
  };
  // Prime du gardien et résolution chantent dans une même source à la fin de campagne.
  for(const outcome of ['clear','win']) {
    const cadence=timbres[outcome].map(n=>({...n,at:n.at+.40}));
    timbres['prize-'+outcome]=[...timbres.prizeFinal,...cadence];
  }
  function timbre(info) {
    switch (info.type) {
      case 'contractOpen': return ({convoi:'contractTrain',mue:'contractMolt',aiguillage:'contractSwitch',surf:'contractSurf',relais:'contractRelay'})[info.kind] || 'contractOpen';
      case 'ecoWarning': return ({sentinelle:'ecoSight',equarrisseur:'ecoCut',sillage:'ecoWake',portier:'ecoPort'})[info.role];
      case 'surfEnd': return info.success?'surfLanded':'surfMiss';
      case 'bossHit': return info.weapon==='surf'?'hitSurf':info.heart?'hitHeart':'hitShield';
      case 'guardianWarning': return info.beat>1?'guardianBeat':'guardianWarning';
      case 'ecoAbsorb': case 'ecoActive': case 'ecoKill': case 'ecoEvade':
      case 'knotClosed': case 'evolutionHit': case 'evolutionTrigger': case 'surfGate':
      case 'surfStart': case 'surfPulse': case 'guardianCounter': case 'riftOpen':
      case 'riftPickup': case 'bonus': case 'contractStep': case 'contractScore': return info.type;
      case 'boss': return info.kind==='final'?'bossFinal':'boss';
      case 'bossDefeated': return info.kind==='final'?'prizeFinal':'prizeMid';
      case 'win': case 'clear': return info.withPrize?'prize-'+info.type:info.type;
      case 'death': case 'cell': case 'upgrade': return info.type;
      case 'shot': return info.kind==='arc'?'arc':'rail';
      case 'nova': return 'nova';
      case 'novaOverload': return ({1976:'overloadComb',1985:'overloadRicochet',1995:'overloadTrain',
        2185:'overloadMoons',2985:'overloadEcho'})[info.year];
      case 'novaOverloadHit': return 'overloadHit';
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
    const buffers=new Map(), placements=new Map(), voices=new Set(), lastHit=new Map();
    const localWeapons=new Set(['shot','nova','forgeShot','forgeHit','evolutionHit','evolutionTrigger',
      'novaOverload','novaOverloadHit','bossHit']);
    const centeredCues=new Set(['boss','bossAttack','bossVolley','guardianWarning','guardianCounter','planeShift','ecoWarning','ecoActive']);
    const foreground=context.createGain(), action=context.createGain();
    foreground.connect(output); action.connect(output);
    let closed=false, duckEnd=0;
    const stats={accepted:0,coalesced:0,rejected:0,peakVoices:0,
      get activeVoices(){return voices.size;},get cachedPlacements(){return placements.size;}};
    const rank={novaOverload:2,guardianWarning:4,guardianCounter:4,bossDefeated:4,ecoWarning:3,ecoAbsorb:4,ecoActive:2,
      knotClosed:3,surfPulse:4,surfStart:3,surfEnd:3,bossHit:2,contractScore:2,evolutionTrigger:2};
    function overloadCeiling(buffer) {
      const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
      let peak=0;
      for(let i=0;i<left.length;i++) peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
      if(peak>.34) {
        const attenuation=.34/peak;
        for(let i=0;i<left.length;i++) {left[i]*=attenuation;right[i]*=attenuation;}
      }
    }
    // Pour chaque échantillon : M=(G+D)/2 reste identique ; seule la composante latérale varie.
    // Les tampons déplacés sont partagés entre voix et bornés à douze entrées.
    function place(original,key,info,arena,strength) {
      if(!arena || !Number.isFinite(arena.width) || arena.width<=1) return original;
      const centered=centeredCues.has(info.type);
      if(!centered && (!strength || !localWeapons.has(info.type))) return original;
      let x=info.x;
      if(!Number.isFinite(x)) {
        if(info.type==='bossHit') x=arena.boss?.x ??
          (info.hp===0?arena.effects?.findLast(e=>e.kind==='bossHit' && e.maxLife-e.life<.10)?.x:undefined);
        else if(info.type==='shot' || info.type==='nova' || info.type==='novaOverload') x=arena.snake?.[0]?.x;
      }
      if(centered) x=(arena.width-1)*.5;
      if(!Number.isFinite(x)) return original;
      const position=Math.max(-1,Math.min(1,2*x/(arena.width-1)-1));
      const amount=Number.isFinite(strength)?Math.max(0,Math.min(1,strength)):0;
      const step=Math.round(position*amount*12);
      if(!step && !centered) return original;
      const cacheKey=key+'/'+(centered?'center':step);
      if(placements.has(cacheKey)) {
        const hit=placements.get(cacheKey);placements.delete(cacheKey);placements.set(cacheKey,hit);return hit;
      }
      const left=original.getChannelData(0),right=original.getChannelData(1);
      const result=context.createBuffer(2,left.length,context.sampleRate);
      const outL=result.getChannelData(0),outR=result.getChannelData(1),p=step/12;
      const width=centered?0:1-.5*Math.abs(p),offset=.36*p,ceiling=info.type==='novaOverload'?.34:.95;
      for(let i=0;i<left.length;i++) {
        const mid=(left[i]+right[i])*.5;
        const side=(left[i]-right[i])*.5*width - offset*mid;
        const room=Math.max(0,ceiling-Math.abs(mid)),limited=Math.max(-room,Math.min(room,side));
        outL[i]=mid+limited;outR[i]=mid-limited;
      }
      if(placements.size>=12) placements.delete(placements.keys().next().value);
      placements.set(cacheKey,result);return result;
    }
    function play(info,onEnded,arena,spatialStrength=1) {
      if (closed || !info) return false;
      const key=timbre(info);
      if (!key) return false;
      const now=context.currentTime;
      for (const voice of voices) if (voice.end<=now) voices.delete(voice);
      const group=info.type==='planeShift'?'plane':
        (info.type.startsWith('boss') && info.type!=='bossHit') || info.type.startsWith('guardian')?'boss':'action';
      const priority=rank[info.type]??0;
      const lead=group!=='action' || priority>=3;
      const bucket=info.type==='forgeHit'?[info.core,info.mod,info.plane].join('/'):key;
      const hold=info.type==='forgeHit'?.08:info.type==='novaOverloadHit'?.11:['bossHit','evolutionHit'].includes(info.type)?.065:0;
      if (mode==='priority' && hold && now-(lastHit.get(bucket)??-1)<hold) {
        stats.coalesced++; return false;
      }
      // Deux places pour chacun des deux signaux critiques, même au milieu d'une salve.
      const groupLimit=group==='action'?limit-4:2;
      const siblings=[...voices].filter(v=>v.group===group);
      if ((mode!=='raw' && voices.size>=limit) || (mode==='priority' && siblings.length>=groupLimit)) {
        const victim=mode==='priority' && siblings.filter(v=>v.priority<priority)
          .sort((a,b)=>a.priority-b.priority || a.end-b.end)[0];
        if (!victim) {stats.rejected++;return false;}
        voices.delete(victim);victim.source.stop();victim.source.disconnect();
      }
      const paletteKey=(year??'reference')+'/'+key;
      if(!buffers.has(paletteKey)) {
        const buffer=makeBuffer(context,timbres[key],year,year && lead?1.8:1);
        if(info.type==='novaOverload') overloadCeiling(buffer);
        buffers.set(paletteKey,buffer);
      }
      const source=context.createBufferSource();
      source.buffer=place(buffers.get(paletteKey),paletteKey,info,arena,spatialStrength);
      source.connect(lead?foreground:action);
      const end=now+source.buffer.duration, voice={source,end,group,priority};
      source.onended=()=>{voices.delete(voice);source.disconnect();onEnded?.();};
      if (mode==='priority' && lead) {
        duckEnd=Math.max(duckEnd,end+.018);
        action.gain.cancelScheduledValues(now);
        action.gain.setTargetAtTime(.32,now,.007);
        action.gain.setTargetAtTime(1,duckEnd,.040);
      }
      if (hold) lastHit.set(bucket,now);
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
      stop(); action.disconnect(); foreground.disconnect(); buffers.clear(); placements.clear(); closed=true;
    }
    function setYear(next) {
      if (!years.includes(next)) throw new RangeError('Époque inconnue');
      if(year!==next) placements.clear();
      year=next;
    }
    return {setYear,handles:info=>Boolean(info && timbre(info)),play,stop,dispose,stats};
  }
  const api={create,years:Object.freeze(years)};
  if (typeof module==='object' && module.exports) module.exports=api;
  else globalThis.SnakeAudioPriority=api;
})();

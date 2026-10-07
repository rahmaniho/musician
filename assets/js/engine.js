/* ════════════════════════════════════════════════════════════════
   آوا — موتور صوتی واقعی
   • پخش‌کننده‌ی سراسری تولیدات (فایل MP3 واقعی + Media Session)
   • دمو A/B میکس با زنجیره‌ی مسترینگ واقعی (EQ/Comp/Limiter)
   • سمپلر پیانو (Salamander، pitch-shift کروماتیک)
   • وان‌شات سازها، درام‌پد، باران محیطی، بلیپ‌های رابط کاربری
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ───────── ابزار کوچک رویداد ───────── */
  function Emitter() {
    const map = {};
    return {
      on(ev, fn) { (map[ev] = map[ev] || []).push(fn); },
      emit(ev, data) { (map[ev] || []).forEach(fn => { try { fn(data); } catch (e) {} }); }
    };
  }

  /* ═════════ هسته: کانتکست و باس‌ها ═════════ */
  let ctx = null, master = null, musicBus = null, sfxBus = null, verb = null, masterAn = null;

  function ensureCtx() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 22;
    comp.ratio.value = 2.5; comp.attack.value = 0.004; comp.release.value = 0.24;

    master = ctx.createGain(); master.gain.value = 0.9;
    masterAn = ctx.createAnalyser(); masterAn.fftSize = 2048; masterAn.smoothingTimeConstant = 0.82;

    musicBus = ctx.createGain(); musicBus.gain.value = 1;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1;

    musicBus.connect(master); sfxBus.connect(master);
    master.connect(masterAn); master.connect(comp); comp.connect(ctx.destination);

    // ریورب مصنوعی سبک برای پیانو و وان‌شات‌ها
    try {
      verb = ctx.createConvolver();
      verb.buffer = makeImpulse(2.2, 2.8);
      const vg = ctx.createGain(); vg.gain.value = 0.22;
      verb.connect(vg); vg.connect(master);
    } catch (e) { verb = null; }
    return ctx;
  }

  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function analyserSnapshot(an, bins) {
    if (!an) return null;
    const data = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(data);
    const out = new Float32Array(bins);
    const per = Math.floor(data.length / bins);
    for (let i = 0; i < bins; i++) {
      let s = 0;
      for (let j = 0; j < per; j++) s += data[i * per + j];
      out[i] = s / per / 255;
    }
    return out;
  }

  /* ═════════ بافرها و وان‌شات‌ها ═════════ */
  const bufCache = new Map();
  const liveVoices = new Set();

  async function loadBuffer(url) {
    if (bufCache.has(url)) return bufCache.get(url);
    const p = (async () => {
      ensureCtx();
      const res = await fetch(url);
      if (!res.ok) throw new Error('audio 404: ' + url);
      const ab = await res.arrayBuffer();
      return await ctx.decodeAudioData(ab);
    })();
    bufCache.set(url, p);
    try { return await p; } catch (e) { bufCache.delete(url); throw e; }
  }

  function prefetch(urls) {
    if (!('requestIdleCallback' in window)) { urls.forEach(u => loadBuffer(u).catch(() => {})); return; }
    let i = 0;
    const step = dl => {
      ensureCtx();
      while (i < urls.length && dl.timeRemaining() > 20) loadBuffer(urls[i++]).catch(() => {});
      if (i < urls.length) requestIdleCallback(step, { timeout: 2500 });
    };
    requestIdleCallback(step, { timeout: 3000 });
  }

  function stealIfNeeded(cap) {
    if (liveVoices.size < cap) return;
    const oldest = liveVoices.values().next().value;
    try { oldest.stop(0); } catch (e) {}
    liveVoices.delete(oldest);
  }

  /** پخش یک فایل کوتاه (پیش‌نمایش ساز، پد، ...) */
  async function oneShot(url, o) {
    o = o || {};
    try {
      const buf = await loadBuffer(url);
      const c = ensureCtx(); if (!c) return;
      stealIfNeeded(o.cap || 24);
      const src = c.createBufferSource(); src.buffer = buf;
      if (o.rate) src.playbackRate.value = o.rate;
      if (o.detune) src.detune.value = o.detune;
      const g = c.createGain();
      const v = o.gain != null ? o.gain : 0.9;
      const t = c.currentTime + (o.when || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + (o.attack || 0.008));
      const hold = Math.min(buf.duration, o.hold || buf.duration);
      g.gain.setValueAtTime(v, t + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + hold + (o.release || 0.25));
      src.connect(g); g.connect(sfxBus);
      if (verb && o.rev !== false) { const send = c.createGain(); send.gain.value = o.revSend || 0.25; g.connect(send); send.connect(verb); }
      liveVoices.add(src);
      src.onended = () => { liveVoices.delete(src); try { src.disconnect(); g.disconnect(); } catch (e) {} };
      src.start(t, o.offset || 0, o.dur);
      src.stop(t + hold + (o.release || 0.25) + 0.1);
    } catch (e) { /* سکوت: فایل در دسترس نیست */ }
  }

  /* ═════════ سمپلر پیانو ═════════ */
  const Piano = (() => {
    const D = () => window.AVA_DATA.PIANO_SAMPLES;
    let ready = false;

    function preload() {
      if (ready) return Promise.resolve();
      const urls = D().map(s => s.file);
      urls.forEach(u => loadBuffer(u).catch(() => {}));
      return Promise.all(urls.map(u => loadBuffer(u).then(() => true).catch(() => false)))
        .then(rs => { ready = rs.some(Boolean); });
    }

    function nearest(midi) {
      let best = D()[0], bd = 999;
      D().forEach(s => { const d = Math.abs(s.midi - midi); if (d < bd) { bd = d; best = s; } });
      return best;
    }

    async function play(midi, vel) {
      vel = vel == null ? 1 : vel;
      try {
        const s = nearest(midi);
        const buf = await loadBuffer(s.file);
        const c = ensureCtx(); if (!c) return;
        stealIfNeeded(16);
        const src = c.createBufferSource(); src.buffer = buf;
        src.detune.value = (midi - s.midi) * 100;
        const g = c.createGain();
        const t = c.currentTime, peak = 0.5 * vel;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.004);
        g.gain.setTargetAtTime(0.0001, t + 0.02, 1.6); // دم طبیعی پیانو
        src.connect(g); g.connect(sfxBus);
        if (verb) { const send = c.createGain(); send.gain.value = 0.18; g.connect(send); send.connect(verb); }
        liveVoices.add(src);
        src.onended = () => { liveVoices.delete(src); };
        src.start(t);
        src.stop(t + 7);
      } catch (e) { blip(220 * Math.pow(2, (midi - 57) / 12), 0.5, 0.15, 'triangle'); }
    }

    return { preload, play };
  })();

  /* ═════════ پخش‌کننده‌ی سراسری تولیدات ═════════ */
  const Player = (() => {
    const ev = Emitter();
    const el = new Audio();
    el.preload = 'metadata';
    el.crossOrigin = 'anonymous';
    let idx = 0, hooked = false, pGain = null, pAn = null, mediaSrc = null;
    let volume = parseFloat(localStorage.getItem('ava-vol') || '0.9');

    const list = () => window.AVA_DATA.TRACKS;
    const cur = () => list()[idx];

    function hook() {
      if (hooked) return;
      const c = ensureCtx(); if (!c) return;
      try {
        mediaSrc = c.createMediaElementSource(el);
        pGain = c.createGain(); pGain.gain.value = volume;
        pAn = c.createAnalyser(); pAn.fftSize = 1024; pAn.smoothingTimeConstant = 0.8;
        mediaSrc.connect(pGain); pGain.connect(pAn); pAn.connect(musicBus);
        hooked = true;
      } catch (e) { /* قبلاً هوک شده */ hooked = true; }
    }

    function setMediaSession() {
      if (!('mediaSession' in navigator)) return;
      try {
        const t = cur();
        navigator.mediaSession.metadata = new MediaMetadata({
          title: t.title, artist: t.artistFa + ' • استودیو آوا', album: 'تولیدات آوا'
        });
      } catch (e) {}
    }

    function load(i, autoplay) {
      idx = (i + list().length) % list().length;
      const t = cur();
      const wasPlaying = !el.paused;
      el.src = t.file;
      el.load();
      setMediaSession();
      ev.emit('track', { index: idx, track: t });
      if (autoplay || wasPlaying) play();
    }

    async function play(i) {
      hook();
      AB.pause();
      if (typeof i === 'number' && i !== idx) { load(i, true); return; }
      if (!el.src) load(idx, false);
      setMediaSession();
      try { await el.play(); } catch (e) { ev.emit('blocked', {}); }
    }

    function pause() { el.pause(); }
    function toggle(i) {
      if (typeof i === 'number' && i !== idx) { play(i); return; }
      el.paused ? play() : pause();
    }
    function next() { load(idx + 1, true); }
    function prev() { load(idx - 1, true); }
    function seek01(f) {
      if (!isFinite(el.duration)) return;
      el.currentTime = Math.max(0, Math.min(0.999, f)) * el.duration;
    }
    function setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      el.volume = 1; // بلندی از طریق گین وب‌آدیو کنترل می‌شود
      if (pGain) pGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.03);
      else el.volume = volume;
      localStorage.setItem('ava-vol', String(volume));
      ev.emit('volume', { volume });
    }

    el.addEventListener('play', () => ev.emit('play', { index: idx }));
    el.addEventListener('pause', () => ev.emit('pause', { index: idx }));
    el.addEventListener('timeupdate', () => {
      if (isFinite(el.duration) && el.duration > 0) ev.emit('time', { t: el.currentTime, d: el.duration });
    });
    el.addEventListener('loadedmetadata', () => {
      if (isFinite(el.duration)) ev.emit('meta', { d: el.duration, index: idx });
    });
    el.addEventListener('ended', () => next(true));
    el.addEventListener('error', () => ev.emit('error', { index: idx }));

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => play());
        navigator.mediaSession.setActionHandler('pause', () => pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => next());
      } catch (e) {}
    }

    /* قله‌های شکل‌موج واقعی هر ترک (کش‌شده) */
    const peakCache = new Map();
    async function peaks(i, n) {
      n = n || 160;
      const key = i + ':' + n;
      if (peakCache.has(key)) return peakCache.get(key);
      const p = (async () => {
        const c = ensureCtx();
        const res = await fetch(list()[i].file);
        const ab = await res.arrayBuffer();
        const buf = await c.decodeAudioData(ab);
        const ch = buf.getChannelData(0);
        const out = new Float32Array(n);
        const step = Math.floor(ch.length / n);
        for (let k = 0; k < n; k++) {
          let m = 0;
          const s = k * step;
          for (let j = 0; j < step; j += 7) { const v = Math.abs(ch[s + j]); if (v > m) m = v; }
          out[k] = m;
        }
        // نرمال‌سازی نرم
        let mx = 0.01;
        for (let k = 0; k < n; k++) if (out[k] > mx) mx = out[k];
        for (let k = 0; k < n; k++) out[k] = Math.pow(out[k] / mx, 0.75);
        return out;
      })();
      peakCache.set(key, p);
      try { return await p; } catch (e) { peakCache.delete(key); return null; }
    }

    function spectrum(bins) { return analyserSnapshot(pAn, bins || 48); }
    function state() {
      return { index: idx, track: cur(), playing: !el.paused, t: el.currentTime || 0, d: el.duration || 0, volume };
    }

    el.volume = volume;
    return { on: ev.on, play, pause, toggle, next, prev, load, seek01, setVolume, peaks, spectrum, state, el };
  })();

  /* ═════════ دمو A/B: زنجیره‌ی مسترینگ واقعی ═════════ */
  const AB = (() => {
    const ev = Emitter();
    const el = new Audio();
    el.preload = 'metadata';
    el.crossOrigin = 'anonymous';
    const LOOP_A = 25, LOOP_B = 65; // حلقه‌ی ۴۰ ثانیه‌ای از میانه‌ی قطعه
    let hooked = false, dry = null, wet = null, abAn = null, mix = 0.5, started = false;

    function file() {
      const t = window.AVA_DATA.TRACKS.find(t => t.ab) || window.AVA_DATA.TRACKS[0];
      return t.file;
    }

    function hook() {
      if (hooked) return;
      const c = ensureCtx(); if (!c) return;
      const src = c.createMediaElementSource(el);

      // مسیر RAW: شبیه‌سازی نسخه‌ی خام (تیره‌تر، کم‌جان‌تر، کم‌صداتر)
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8200; lp.Q.value = 0.5;
      const mud = c.createBiquadFilter(); mud.type = 'peaking'; mud.frequency.value = 220; mud.Q.value = 1; mud.gain.value = 2.5;
      dry = c.createGain(); dry.gain.value = 0.72;
      src.connect(lp); lp.connect(mud); mud.connect(dry);

      // مسیر MASTERED: زنجیره‌ی مسترینگ واقعی
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30;
      const cut = c.createBiquadFilter(); cut.type = 'peaking'; cut.frequency.value = 260; cut.Q.value = 1.1; cut.gain.value = -1.6;
      const pres = c.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3200; pres.Q.value = 0.9; pres.gain.value = 1.8;
      const air = c.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 9500; air.gain.value = 2.6;
      const glue = c.createDynamicsCompressor();
      glue.threshold.value = -18; glue.knee.value = 18; glue.ratio.value = 2.4;
      glue.attack.value = 0.008; glue.release.value = 0.22;
      const limit = c.createDynamicsCompressor(); // لیمیتر ساده
      limit.threshold.value = -6; limit.knee.value = 0; limit.ratio.value = 20;
      limit.attack.value = 0.002; limit.release.value = 0.1;
      const makeup = c.createGain(); makeup.gain.value = 1.5;
      wet = c.createGain(); wet.gain.value = 0.72;

      src.connect(hp); hp.connect(cut); cut.connect(pres); pres.connect(air);
      air.connect(glue); glue.connect(limit); limit.connect(makeup); makeup.connect(wet);

      const out = c.createGain();
      abAn = c.createAnalyser(); abAn.fftSize = 1024; abAn.smoothingTimeConstant = 0.8;
      dry.connect(out); wet.connect(out); out.connect(abAn); abAn.connect(musicBus);
      hooked = true;
      setMix(mix);
    }

    function setMix(x) {
      mix = Math.max(0, Math.min(1, x));
      if (!hooked) return;
      // کراس‌فید توان‌ثابت بین خام و مستر
      const d = Math.cos(mix * Math.PI / 2), w = Math.sin(mix * Math.PI / 2);
      dry.gain.setTargetAtTime(d * 0.72, ctx.currentTime, 0.03);
      wet.gain.setTargetAtTime(w, ctx.currentTime, 0.03);
      ev.emit('mix', { mix });
    }

    async function play() {
      hook();
      Player.pause();
      if (!started) { el.src = file(); el.load(); started = true; }
      try { el.currentTime = LOOP_A; } catch (e) {}
      try { await el.play(); } catch (e) {}
    }
    function pause() { el.pause(); }
    function toggle() { el.paused ? play() : pause(); }

    el.addEventListener('play', () => ev.emit('play', {}));
    el.addEventListener('pause', () => ev.emit('pause', {}));
    el.addEventListener('timeupdate', () => {
      if (el.currentTime > LOOP_B || el.currentTime < LOOP_A - 2) {
        try { el.currentTime = LOOP_A; } catch (e) {}
      }
      ev.emit('time', { t: el.currentTime - LOOP_A, d: LOOP_B - LOOP_A });
    });

    function spectrum(bins) { return analyserSnapshot(abAn, bins || 64); }
    function playing() { return !el.paused; }

    return { on: ev.on, play, pause, toggle, setMix, spectrum, playing, el };
  })();

  /* ═════════ باران محیطی (حالت تمرکز) ═════════ */
  const Rain = (() => {
    let node = null;
    function toggle() {
      const c = ensureCtx(); if (!c) return false;
      if (node) {
        node.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.5);
        const n = node; node = null;
        setTimeout(() => { try { n.src.stop(); n.lfo.stop(); } catch (e) {} }, 1600);
        return false;
      }
      const len = c.sampleRate * 4;
      const buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + w * 0.0990460;
          b1 = 0.96300 * b1 + w * 0.2965164;
          b2 = 0.57000 * b2 + w * 1.0526913;
          d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.09;
        }
      }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.6;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.setTargetAtTime(0.5, c.currentTime, 1.2);
      const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
      const lg = c.createGain(); lg.gain.value = 420;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
      src.start();
      node = { src, g, lfo };
      return true;
    }
    return { toggle };
  })();

  /* ═════════ بلیپ رابط کاربری + آرپژ گیت ═════════ */
  function blip(freq, dur, gain, type) {
    try {
      const c = ensureCtx(); if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = type || 'sine';
      o.frequency.setValueAtTime(freq || 660, t);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain || 0.06, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.14));
      o.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + (dur || 0.14) + 0.05);
    } catch (e) {}
  }

  /** آرپژ ورودی با پیانوی واقعی (سقوط به سینث در صورت قطعی) */
  async function gateArp() {
    const seq = [57, 60, 64, 69, 72, 76, 79, 81, 84]; // لا مینور تا دو
    try {
      await Promise.race([Piano.preload(), new Promise(r => setTimeout(r, 4500))]);
      seq.forEach((m, i) => setTimeout(() => Piano.play(m, 0.9), i * 290));
      setTimeout(() => [57, 60, 64].forEach(m => Piano.play(m, 0.7)), seq.length * 290 + 150);
    } catch (e) {
      seq.forEach((m, i) => setTimeout(() => blip(220 * Math.pow(2, (m - 57) / 12), 0.5, 0.1, 'triangle'), i * 290));
    }
  }

  function masterSpectrum(bins) { return analyserSnapshot(masterAn, bins || 64); }

  window.AVA_AUDIO = {
    ensureCtx, oneShot, prefetch, loadBuffer,
    Piano, Player, AB, Rain, blip, gateArp, masterSpectrum,
    get ctx() { return ctx; }
  };
})();

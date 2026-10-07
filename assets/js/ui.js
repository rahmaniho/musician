/* ════════════════════════════════════════════════════════════════
   آوا — لایه‌ی تعاملی (UI)
   سیم‌کشی همه‌ی بخش‌ها به موتور صوتی واقعی + افکت‌های بصری
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const fmt = sec => {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return fa(m + ':' + String(s).padStart(2, '0'));
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const D = window.AVA_DATA, AU = window.AVA_AUDIO;
  const Player = AU.Player, AB = AU.AB;

  /* ───────── اسکرول امن با فالبک ───────── */
  function goTo(el, block) {
    if (!el) return;
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: block || 'start' });
    } else {
      try {
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo(0, Math.max(0, y));
      } catch (e) {}
    }
  }

  /* ───────── Toast ───────── */
  let toastT = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ───────── کاور ژنراتیو هر قطعه (SVG درون‌خطی) ───────── */
  function coverHTML(track, bars) {
    const h = track.hue, n = bars || 18;
    let rects = '';
    let seed = track.id.length * 7919 + h * 131;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n; i++) {
      const bh = 12 + rnd() * 76, x = 6 + i * ((188 - 12) / n), w = (188 - 12) / n - 3;
      rects += `<rect x="${x.toFixed(1)}" y="${(100 - bh).toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" rx="2"/>`;
    }
    return `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="g${track.id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${h},65%,22%)"/><stop offset=".55" stop-color="hsl(${(h + 30) % 360},70%,14%)"/>
        <stop offset="1" stop-color="hsl(${(h + 60) % 360},75%,26%)"/>
      </linearGradient></defs>
      <rect width="200" height="120" fill="url(#g${track.id})"/>
      <circle cx="${150 + (h % 30)}" cy="18" r="46" fill="hsl(${h},80%,55%,.28)"/>
      <circle cx="20" cy="105" r="34" fill="hsl(${(h + 50) % 360},80%,60%,.2)"/>
      <g fill="hsl(${h},90%,68%,.85)">${rects}</g>
      <text x="12" y="24" font-size="11" fill="rgba(255,255,255,.75)" font-family="serif" font-style="italic">${track.latin}</text>
    </svg>`;
  }

  /* ═════════ ۱) گیت ورود ═════════ */
  let gateOpened = false;
  (function gateModule() {
    const gate = $('#gate'), tuner = $('#tuner'), wrap = $('#enterWrap'), btn = $('#enterBtn');
    const notesBox = $('#gateNotes');
    const glyphs = ['♪', '♫', '♬', '♩', '𝄞', '♭'];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('span');
      s.textContent = glyphs[i % glyphs.length];
      s.style.insetInlineStart = (Math.random() * 100) + '%';
      s.style.fontSize = (0.9 + Math.random() * 2.1) + 'rem';
      s.style.animationDuration = (11 + Math.random() * 16) + 's';
      s.style.animationDelay = (-Math.random() * 20) + 's';
      s.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);
      notesBox.appendChild(s);
    }
    setTimeout(() => { tuner.classList.add('gone'); wrap.classList.add('show'); btn.focus(); }, reduced ? 400 : 2100);

    function openSite() {
      if (gateOpened) return;
      gateOpened = true;
      AU.ensureCtx();
      AU.gateArp();
      gate.classList.add('hide');
      document.body.classList.remove('gate-open');
      setTimeout(() => { gate.remove(); }, 1300);
      setTimeout(() => { $('#player').classList.add('up'); initWaves(); }, 900);
      toast('خوش آمدی ♪ برای شنیدن، دکمه‌ی پخش را بزن');
      // پیش‌بارگذاری هوشمند سمپل‌ها در زمان بیکاری
      AU.Piano.preload();
      const urls = [];
      Object.values(D.INSTRUMENTS).flat().forEach(i => urls.push(i.sample));
      D.PADS.forEach(p => urls.push(p.file));
      setTimeout(() => AU.prefetch(urls), 2500);
      try { document.activeElement.blur(); } catch (e) {}
    }
    btn.addEventListener('click', openSite);
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSite(); } });
  })();

  /* ═════════ ۲) هدر، تم، منوی موبایل ═════════ */
  (function navModule() {
    const header = $('#header'), toTop = $('#toTop'), prog = $('#progress');
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 40);
      toTop.classList.toggle('show', y > 700);
      const h = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    toTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); AU.blip(880, 0.15, 0.07); });

    const burger = $('#burger'), mob = $('#mobileMenu');
    burger.addEventListener('click', () => {
      const open = mob.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    mob.addEventListener('click', e => {
      if (e.target.closest('a')) { mob.classList.remove('open'); burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    });

    const themeBtn = $('#themeBtn'), root = document.documentElement;
    const saved = localStorage.getItem('ava-theme');
    if (saved === 'light') { root.dataset.theme = 'light'; themeBtn.textContent = '☀'; }
    themeBtn.addEventListener('click', () => {
      const light = root.dataset.theme !== 'light';
      if (light) { root.dataset.theme = 'light'; themeBtn.textContent = '☀'; }
      else { delete root.dataset.theme; themeBtn.textContent = '☾'; }
      localStorage.setItem('ava-theme', light ? 'light' : 'dark');
      AU.blip(light ? 880 : 440, 0.14, 0.07);
    });

    const focusBtn = $('#focusBtn');
    focusBtn.addEventListener('click', () => {
      const on = AU.Rain.toggle();
      focusBtn.classList.toggle('on', on);
      toast(on ? 'حالت تمرکز فعال شد ☂ صدای باران' : 'حالت تمرکز خاموش شد');
    });
  })();

  /* ═════════ ۳) نوار متحرک ═════════ */
  (function marqueeModule() {
    const rows = [
      ['PRODUCTION', 'ARRANGEMENT', 'MIXING', 'MASTERING', 'RECORDING', 'ACOUSTIC'],
      ['تولید موسیقی', 'تنظیم', 'میکس', 'مسترینگ', 'ضبط', 'آموزش']
    ];
    [$('#mq1'), $('#mq2')].forEach((row, r) => {
      const seq = rows[r].map(w => `<span>${w}</span><i>♪</i>`).join('');
      row.innerHTML = `<div class="mq-track">${seq}${seq}</div>`;
    });
  })();

  /* ═════════ ۴) موج زنده‌ی هیرو + EQ ═════════ */
  (function heroVizModule() {
    const cv = $('#waveCanvas'), cx = cv.getContext('2d');
    let W = 0, H = 0, t = 0, visible = true;
    function size() {
      const r = cv.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size);
    new IntersectionObserver(es => visible = es[0].isIntersecting).observe($('#hero'));

    const eq = $('#heroEq');
    const bars = [];
    for (let i = 0; i < 26; i++) { const b = document.createElement('span'); eq.appendChild(b); bars.push(b); }

    let raf = null;
    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      t += 0.016;
      const spec = AU.masterSpectrum(48);
      const energy = spec ? spec.reduce((a, b) => a + b, 0) / spec.length : 0;

      cx.clearRect(0, 0, W, H);
      const layers = [
        { y: .62, amp: 26 + energy * 90, col: '233,185,73', a: .5, sp: 1.1 },
        { y: .68, amp: 34 + energy * 120, col: '139,92,246', a: .4, sp: .8 },
        { y: .74, amp: 20 + energy * 70, col: '45,212,191', a: .35, sp: 1.4 }
      ];
      layers.forEach((L, li) => {
        cx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const p = x / W;
          const bi = spec ? spec[Math.floor(p * 47)] : 0;
          const y = H * L.y
            + Math.sin(p * 6.28 * 2 + t * L.sp * 2 + li) * L.amp * .4
            + Math.sin(p * 6.28 * 5 - t * L.sp * 3) * L.amp * .25 * (0.4 + bi * 2)
            + bi * L.amp * 1.1;
          x === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
        }
        cx.strokeStyle = `rgba(${L.col},${L.a})`;
        cx.lineWidth = 1.6;
        cx.stroke();
      });

      // میله‌های EQ کارت هیرو
      bars.forEach((b, i) => {
        const v = spec ? spec[Math.floor(i / 26 * 40)] : (0.12 + 0.1 * Math.sin(t * 2 + i));
        b.style.transform = `scaleY(${clamp(0.08 + v * 1.4, 0.06, 1)})`;
      });
    }
    if (!reduced) frame();
  })();

  /* ═════════ ۵) بخش تولیدات ═════════ */
  const cardWaves = []; // {canvas, idx, peaks}
  (function worksModule() {
    const grid = $('#worksGrid');
    D.TRACKS.forEach((tr, i) => {
      const el = document.createElement('article');
      el.className = 'track-card spot reveal';
      el.dataset.tag = tr.tag;
      el.dataset.idx = i;
      el.innerHTML = `
        <div class="tc-cover">${coverHTML(tr)}
          <button class="tc-play" aria-label="پخش ${tr.title}">▶</button>
          <span class="tc-dur">${tr.dur}</span>
        </div>
        <div class="tc-body">
          <div class="tc-tags"><span class="tc-tag">${tr.tagFa}</span><span class="tc-artist">${tr.artistFa}</span></div>
          <h3>${tr.title}</h3>
          <p class="tc-latin pf-i" dir="ltr">${tr.latin} — ${tr.artist}</p>
          <p class="tc-desc">${tr.desc}</p>
          <canvas class="tc-wave" dir="ltr" aria-hidden="true"></canvas>
        </div>`;
      grid.appendChild(el);
      cardWaves.push({ canvas: $('.tc-wave', el), idx: i, peaks: null, card: el });
      $('.tc-play', el).addEventListener('click', ev => { ev.stopPropagation(); Player.toggle(i); });
      el.addEventListener('click', () => Player.toggle(i));
    });

    // فیلتر ژانر
    $('#filterChips').addEventListener('click', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      $$('#filterChips .chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected', 'false'); });
      chip.classList.add('active'); chip.setAttribute('aria-selected', 'true');
      const tag = chip.dataset.tag;
      $$('#worksGrid .track-card').forEach(card => {
        const show = tag === 'all' || card.dataset.tag === tag;
        card.classList.toggle('hide', !show);
      });
      AU.blip(520, 0.1, 0.05);
    });

    $('#playAllBtn').addEventListener('click', () => {
      Player.play(0);
      toast('پخش پیاپی هر ۹ قطعه شروع شد ♫');
      goTo($('#player'), 'nearest');
    });

    // وضعیت دکمه‌ها با رویدادهای پلیر
    function syncCards() {
      const st = Player.state();
      $$('#worksGrid .track-card').forEach(card => {
        const i = +card.dataset.idx;
        const active = i === st.index;
        card.classList.toggle('now', active);
        $('.tc-play', card).textContent = active && st.playing ? '❚❚' : '▶';
        $('.tc-play', card).setAttribute('aria-label', (active && st.playing ? 'توقف ' : 'پخش ') + D.TRACKS[i].title);
      });
      drawCardWaves();
    }
    Player.on('track', syncCards);
    Player.on('play', syncCards);
    Player.on('pause', syncCards);
    Player.on('time', () => drawCardWaves(true));
    Player.on('meta', ({ d, index }) => {
      const card = $(`#worksGrid .track-card[data-idx="${index}"] .tc-dur`);
      if (card && d) card.textContent = fmt(d);
    });
  })();

  function drawCardWaves(progressOnly) {
    const st = Player.state();
    cardWaves.forEach(w => {
      if (!w.peaks) return;
      if (progressOnly && w.idx !== st.index) return;
      const cv = w.canvas, cx = cv.getContext('2d');
      const W = cv.clientWidth || 260, H = cv.clientHeight || 44;
      if (!W) return;
      if (cv.width !== W * 2) { cv.width = W * 2; cv.height = H * 2; }
      cx.setTransform(2, 0, 0, 2, 0, 0);
      cx.clearRect(0, 0, W, H);
      const n = w.peaks.length, bw = W / n;
      const frac = w.idx === st.index && st.d > 0 ? st.t / st.d : 0;
      for (let i = 0; i < n; i++) {
        const h = Math.max(2, w.peaks[i] * (H - 6));
        cx.fillStyle = (i / n) <= frac && w.idx === st.index ? '#e9b949' : 'rgba(155,150,181,.4)';
        cx.fillRect(i * bw, (H - h) / 2, Math.max(1, bw - 1), h);
      }
    });
  }

  /** بارگذاری تنبل شکل‌موج‌ها — فقط پس از ورود کاربر */
  function initWaves() {
    const io = new IntersectionObserver(es => {
      es.forEach(en => {
        if (!en.isIntersecting) return;
        const w = cardWaves.find(w => w.canvas === en.target);
        io.unobserve(en.target);
        if (w && !w.peaks) Player.peaks(w.idx, 110).then(p => { w.peaks = p; drawCardWaves(); });
      });
    }, { rootMargin: '200px' });
    cardWaves.forEach(w => io.observe(w.canvas));
    addEventListener('resize', () => drawCardWaves());
    // موج هیرو
    const hc = $('#heroWave');
    Player.peaks(0, 90).then(p => {
      if (!p) return;
      const cx = hc.getContext('2d');
      const W = hc.clientWidth || 300, H = hc.clientHeight || 40;
      hc.width = W * 2; hc.height = H * 2; cx.setTransform(2, 0, 0, 2, 0, 0);
      const bw = W / p.length;
      for (let i = 0; i < p.length; i++) {
        const h = Math.max(2, p[i] * (H - 6));
        cx.fillStyle = 'rgba(233,185,73,.55)';
        cx.fillRect(i * bw, (H - h) / 2, Math.max(1, bw - 1), h);
      }
    });
  }

  /* ═════════ ۶) پلیر سراسری ═════════ */
  (function playerModule() {
    const bar = $('#player');
    const btn = $('#pPlay'), title = $('#pTitle'), artist = $('#pArtist'), cover = $('#pCover');
    const cur = $('#pCur'), dur = $('#pDur'), seek = $('#pSeek'), viz = $('#pViz');
    const vol = $('#pVol'), mute = $('#pMute');
    const listBtn = $('#pListBtn'), list = $('#playlist');

    cover.innerHTML = coverHTML(D.TRACKS[0], 12);
    let peaks = null, frac = 0;

    function drawSeek() {
      const cx = seek.getContext('2d');
      const W = seek.clientWidth || 200, H = seek.clientHeight || 34;
      if (!W) return;
      if (seek.width !== W * 2) { seek.width = W * 2; seek.height = H * 2; }
      cx.setTransform(2, 0, 0, 2, 0, 0);
      cx.clearRect(0, 0, W, H);
      if (!peaks) {
        cx.fillStyle = 'rgba(155,150,181,.3)';
        cx.fillRect(0, H / 2 - 1, W, 2);
        return;
      }
      const n = peaks.length, bw = W / n;
      for (let i = 0; i < n; i++) {
        const h = Math.max(2, peaks[i] * (H - 6));
        cx.fillStyle = (i / n) <= frac ? '#e9b949' : 'rgba(155,150,181,.4)';
        cx.fillRect(i * bw, (H - h) / 2, Math.max(1, bw - 0.6), h);
      }
      // نشانگر موقعیت
      cx.fillStyle = '#f8dc8a';
      cx.beginPath(); cx.arc(frac * W, H / 2, 3.4, 0, 7); cx.fill();
    }

    async function refreshTrack() {
      const st = Player.state(), tr = st.track;
      title.textContent = tr.title;
      artist.textContent = tr.artistFa + ' • ' + tr.tagFa;
      cover.innerHTML = coverHTML(tr, 12);
      $('#heroCover').innerHTML = coverHTML(tr, 16);
      $('#heroTrackTitle').textContent = tr.title;
      peaks = null; frac = 0; drawSeek();
      peaks = await Player.peaks(st.index, 160);
      drawSeek();
      $$('#playlist .pl-item').forEach((el, i) => el.classList.toggle('now', i === st.index));
    }

    btn.addEventListener('click', () => Player.toggle());
    $('#pNext').addEventListener('click', () => Player.next());
    $('#pPrev').addEventListener('click', () => Player.prev());
    Player.on('track', refreshTrack);
    Player.on('play', () => { btn.textContent = '❚❚'; $('#heroPlay').textContent = 'توقف ❚❚'; });
    Player.on('pause', () => { btn.textContent = '▶'; $('#heroPlay').textContent = 'پخش ♪'; });
    Player.on('time', ({ t, d }) => { cur.textContent = fmt(t); dur.textContent = fmt(d); frac = d > 0 ? t / d : 0; drawSeek(); });
    Player.on('meta', ({ d }) => { dur.textContent = fmt(d); });
    Player.on('error', () => toast('خطا در پخش قطعه — اتصال را بررسی کن'));

    seek.addEventListener('click', e => {
      const r = seek.getBoundingClientRect();
      if (!Player.el.src) { Player.play(); return; }
      Player.seek01(clamp((e.clientX - r.left) / r.width, 0, 1));
    });

    // بلندی صدا
    vol.value = Math.round(Player.state().volume * 100);
    vol.addEventListener('input', () => { Player.setVolume(vol.value / 100); mute.classList.toggle('off', vol.value == 0); });
    let lastVol = 0.9;
    mute.addEventListener('click', () => {
      const v = Player.state().volume;
      if (v > 0) { lastVol = v; Player.setVolume(0); vol.value = 0; }
      else { Player.setVolume(lastVol); vol.value = lastVol * 100; }
      mute.classList.toggle('off', Player.state().volume === 0);
    });

    // فهرست پخش
    D.TRACKS.forEach((tr, i) => {
      const el = document.createElement('button');
      el.className = 'pl-item' + (i === 0 ? ' now' : '');
      el.innerHTML = `<span class="pl-cover">${coverHTML(tr, 8)}</span>
        <span class="pl-meta"><b>${tr.title}</b><small>${tr.artistFa} • ${tr.dur}</small></span>
        <span class="pl-eq" aria-hidden="true"><span></span><span></span><span></span></span>`;
      el.addEventListener('click', () => Player.play(i));
      list.appendChild(el);
    });
    listBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = list.hidden;
      list.hidden = !open;
      listBtn.setAttribute('aria-expanded', String(open));
      if (open && !list.dataset.built) { list.dataset.built = '1'; }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#playlist') && !e.target.closest('#pListBtn')) { list.hidden = true; listBtn.setAttribute('aria-expanded', 'false'); }
    });

    // ویژوالایزر پلیر
    const vcx = viz.getContext('2d');
    (function vizLoop() {
      requestAnimationFrame(vizLoop);
      if (document.hidden || !bar.classList.contains('up')) return;
      const W = viz.clientWidth || 90, H = viz.clientHeight || 30;
      if (viz.width !== W * 2) { viz.width = W * 2; viz.height = H * 2; }
      vcx.setTransform(2, 0, 0, 2, 0, 0);
      vcx.clearRect(0, 0, W, H);
      const st = Player.state();
      const spec = st.playing ? Player.spectrum(28) : null;
      const n = 28, bw = W / n;
      for (let i = 0; i < n; i++) {
        const v = spec ? spec[i] : 0.06;
        const h = Math.max(2, v * H);
        vcx.fillStyle = st.playing ? 'rgba(233,185,73,.9)' : 'rgba(155,150,181,.4)';
        vcx.fillRect(i * bw, H - h, Math.max(1, bw - 1.5), h);
      }
    })();

    // دکمه‌های هیرو
    $('#heroPlay').addEventListener('click', () => Player.toggle(0));
    $('#ctaListen').addEventListener('click', () => {
      goTo(document.querySelector('#works'));
      Player.play(0);
    });
    $('#heroCover').innerHTML = coverHTML(D.TRACKS[0], 16);
    addEventListener('resize', drawSeek);
    drawSeek();
  })();

  /* ═════════ ۷) دمو A/B ═════════ */
  (function abModule() {
    const stage = $('#abStage'), handle = $('#abHandle'), top = $('#abMaster');
    const playBtn = $('#abPlay'), timeEl = $('#abTime'), fill = $('#abProgFill');
    let pos = 0.5, dragging = false;

    function render() {
      handle.style.left = (pos * 100) + '%';
      top.style.clipPath = `inset(0 ${(1 - pos) * 100}% 0 0)`;
      stage.setAttribute('aria-valuenow', String(Math.round(pos * 100)));
    }
    function setPos(p) { pos = clamp(p, 0, 1); render(); AB.setMix(pos); }

    stage.addEventListener('pointerdown', e => {
      dragging = true; stage.setPointerCapture(e.pointerId);
      const r = stage.getBoundingClientRect();
      setPos((e.clientX - r.left) / r.width);
    });
    stage.addEventListener('pointermove', e => {
      if (!dragging) return;
      const r = stage.getBoundingClientRect();
      setPos((e.clientX - r.left) / r.width);
    });
    stage.addEventListener('pointerup', () => dragging = false);
    stage.addEventListener('pointercancel', () => dragging = false);
    stage.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { setPos(pos + 0.05); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(pos - 0.05); e.preventDefault(); }
    });
    render();

    playBtn.addEventListener('click', () => AB.toggle());
    AB.on('play', () => { playBtn.textContent = 'توقف ❚❚'; });
    AB.on('pause', () => { playBtn.textContent = 'پخش نمونه'; });
    AB.on('time', ({ t, d }) => {
      timeEl.textContent = fmt(t) + ' / ' + fmt(d);
      fill.style.transform = `scaleX(${d > 0 ? t / d : 0})`;
    });

    // ویژوالایزر دوطرفه
    const cM = $('#abMaster'), cR = $('#abRaw');
    const xM = cM.getContext('2d'), xR = cR.getContext('2d');
    function sizeCanvas(c) {
      const r = stage.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = r.width * dpr; c.height = r.height * dpr;
      return { w: r.width, h: r.height, dpr };
    }
    let geo = null;
    addEventListener('resize', () => geo = null);

    (function loop() {
      requestAnimationFrame(loop);
      if (document.hidden || !AB.playing()) return;
      if (!geo) geo = { m: sizeCanvas(cM), r: sizeCanvas(cR) };
      const spec = AB.spectrum(64) || new Float32Array(64);
      drawSide(xM, geo.m, spec, 1, '#e9b949');   // مستر: پرانرژی و روشن
      drawSide(xR, geo.r, spec, 0.45, '#6b6584'); // خام: کم‌جان و تیره
    })();
    function drawSide(cx, g, spec, k, col) {
      cx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      cx.clearRect(0, 0, g.w, g.h);
      const n = 64, bw = g.w / n;
      for (let i = 0; i < n; i++) {
        const v = clamp(spec[i] * k + 0.03, 0.02, 1);
        const h = v * g.h * 0.9;
        cx.fillStyle = col;
        cx.globalAlpha = 0.85;
        cx.fillRect(i * bw, (g.h - h) / 2, Math.max(1, bw - 1.5), h);
      }
      cx.globalAlpha = 1;
    }
  })();

  /* ═════════ ۸) سازها + تب‌ها ═════════ */
  (function instrumentsModule() {
    const names = { keys: 'کیبوردی', strings: 'زهی', wind: 'بادی', perc: 'ضربی' };
    Object.entries(D.INSTRUMENTS).forEach(([cat, arr]) => {
      const box = $(`#p-${cat} .cards`);
      arr.forEach((ins, i) => {
        const el = document.createElement('article');
        el.className = `inst-card cat-${cat} spot reveal d${Math.min(i, 3)}`;
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `پخش صدای ${ins.name}`);
        el.innerHTML = `
          <div class="ic-badge" aria-hidden="true">${ins.icon}</div>
          <h3>${ins.name}</h3>
          <p class="latin pf-i" dir="ltr">${ins.latin}</p>
          <p class="desc">${ins.desc}</p>
          <div class="meta"><span>${ins.level}</span><span>${ins.term}</span></div>
          <span class="play-hint" aria-hidden="true">♪ شنیدن صدای واقعی</span>`;
        box.appendChild(el);

        let last = 0;
        const trigger = () => {
          const now = Date.now();
          if (now - last < 900) return;
          last = now;
          AU.oneShot(ins.sample, { gain: 0.95 });
          el.classList.add('playing');
          clearTimeout(el._t);
          el._t = setTimeout(() => el.classList.remove('playing'), 1600);
        };
        if (finePointer) el.addEventListener('pointerenter', trigger);
        el.addEventListener('click', e => { ripple(el, e); trigger(); });
        el.addEventListener('keydown', e => { if (e.key === 'Enter') trigger(); });
      });
    });

    // تب‌های آموزش
    $$('.tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tabs .tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
        $$('.panel').forEach(p => p.classList.remove('active'));
        $('#' + tab.dataset.panel).classList.add('active');
        AU.blip(660, 0.1, 0.05);
      });
    });

    // تب‌های بنواز
    $$('.ptab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.ptab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
        $$('.play-pane').forEach(p => { p.classList.remove('active'); p.hidden = true; });
        const pane = $('#' + tab.dataset.ptab);
        pane.classList.add('active'); pane.hidden = false;
        AU.blip(660, 0.1, 0.05);
      });
    });
  })();

  function ripple(host, e) {
    const r = host.getBoundingClientRect();
    const d = document.createElement('span');
    d.className = 'ripple';
    d.style.left = (e.clientX - r.left) + 'px';
    d.style.top = (e.clientY - r.top) + 'px';
    host.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }

  /* ═════════ ۹) پیانو (دو اکتاو واقعی) ═════════ */
  (function pianoModule() {
    const box = $('#pianoKeys');
    const C4 = 60, WHITE = [0, 2, 4, 5, 7, 9, 11];
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const keyEls = {};
    const WHITE_IDX = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
    const WHITE_W = 100 / 15; // ۱۵ کلید سفید در دو اکتاو

    for (let m = C4; m <= C4 + 24; m++) {
      const pc = m % 12, black = !(pc in WHITE_IDX);
      const k = document.createElement('button');
      k.className = 'key ' + (black ? 'black' : 'white');
      k.dataset.midi = m;
      k.setAttribute('aria-label', 'نت ' + NAMES[pc] + Math.floor(m / 12 - 1));
      if (!black) {
        const lb = document.createElement('span'); lb.className = 'klab'; lb.textContent = NAMES[pc]; k.appendChild(lb);
      } else {
        // موقعیت افقی کلید سیاه: مرز بین دو سفید مجاور
        const oct = Math.floor((m - C4) / 12), prevWhite = WHITE_IDX[pc - 1] + oct * 7;
        k.style.left = `calc(${(prevWhite + 1) * WHITE_W}% - 2.6%)`;
      }
      box.appendChild(k);
      keyEls[m] = k;
      k.addEventListener('pointerdown', e => { e.preventDefault(); strike(m); });
    }

    function strike(m, vel) {
      AU.Piano.play(m, vel || 1);
      const k = keyEls[m];
      if (k) { k.classList.add('hit'); setTimeout(() => k.classList.remove('hit'), 220); }
    }

    const KEYMAP = {
      KeyZ: 60, KeyS: 61, KeyX: 62, KeyD: 63, KeyC: 64, KeyV: 65, KeyG: 66,
      KeyB: 67, KeyH: 68, KeyN: 69, KeyJ: 70, KeyM: 71,
      KeyQ: 72, Digit2: 73, KeyW: 74, Digit3: 75, KeyE: 76, KeyR: 77, Digit5: 78,
      KeyT: 79, Digit6: 80, KeyY: 81, Digit7: 82, KeyU: 83
    };
    document.addEventListener('keydown', e => {
      if (e.repeat || !gateOpened) return;
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      const m = KEYMAP[e.code];
      if (m) { strike(m); flashPadKey(e.code); }
      const pad = D.PADS.find(p => p.code === e.code);
      if (pad) hitPad(pad.id);
    });

    function flashPadKey() {}
    // پیش‌بارگذاری با نزدیک شدن به بخش
    new IntersectionObserver((es, io) => {
      if (es[0].isIntersecting) { AU.Piano.preload(); io.disconnect(); }
    }).observe($('#play'));

    window.AVA_strike = strike;
  })();

  /* ═════════ ۱۰) درام‌پد ═════════ */
  function hitPad(id) {
    const pad = D.PADS.find(p => p.id === id);
    if (!pad) return;
    AU.oneShot(pad.file, { gain: 1, rev: false });
    const el = $(`.pad[data-pad="${id}"]`);
    if (el) {
      el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
      setTimeout(() => el.classList.remove('hit'), 200);
    }
  }
  (function padsModule() {
    const grid = $('#padGrid');
    D.PADS.forEach(p => {
      const b = document.createElement('button');
      b.className = 'pad';
      b.dataset.pad = p.id;
      b.style.setProperty('--pc', p.c);
      b.setAttribute('aria-label', `پد ${p.name} — کلید ${p.key}`);
      b.innerHTML = `<b>${p.name}</b><small>کلید ${fa(p.key)}</small>`;
      b.addEventListener('pointerdown', e => { e.preventDefault(); hitPad(p.id); });
      grid.appendChild(b);
    });
  })();

  /* ═════════ ۱۱) اساتید و گالری ═════════ */
  (function peopleModule() {
    const grid = $('#teachersGrid');
    D.TEACHERS.forEach((t, i) => {
      const el = document.createElement('article');
      el.className = 'teacher reveal d' + Math.min(i, 3);
      el.innerHTML = `
        <div class="t-ava"><div class="inner" style="background:${t.g}">
          <img loading="lazy" decoding="async" width="104" height="104" alt="پرتره ${t.n}"
               src="https://images.unsplash.com/${t.img}?auto=format&fit=crop&w=220&h=220&q=60" onerror="this.remove()" />
        </div></div>
        <h3 class="t-name">${t.n}</h3>
        <p class="t-role">${t.r}</p>
        <p class="t-quote">«${t.q}»</p>
        <p class="stars" aria-label="امتیاز ${fa(t.s)} از ۵">${'★'.repeat(t.s)}${'☆'.repeat(5 - t.s)}<small>${fa(t.s)}.۰</small></p>`;
      grid.appendChild(el);
    });

    const g = $('#galleryGrid');
    D.GALLERY.forEach(c => {
      const el = document.createElement('figure');
      el.className = 'gcell ' + c.c;
      el.style.background = c.g;
      el.innerHTML = `
        <img loading="lazy" decoding="async" alt="${c.l} — استودیو آوا"
             src="https://images.unsplash.com/${c.img}?auto=format&fit=crop&w=900&q=60" onerror="this.remove()" />
        <span class="ic" aria-hidden="true">${c.ic}</span>
        <figcaption class="lbl">${c.l} <span>${c.s}</span></figcaption>`;
      g.appendChild(el);
    });
    g.addEventListener('click', e => {
      const cell = e.target.closest('.gcell'); if (!cell) return;
      ripple(cell, e);
      AU.oneShot(D.PADS[1].file, { gain: 0.5, rev: false });
    });
  })();

  /* ═════════ ۱۲) سوالات، سفارش پلن، فرم‌ها ═════════ */
  (function formsModule() {
    $$('#faqList .faq-q').forEach(q => {
      q.addEventListener('click', () => {
        const item = q.parentElement, open = item.classList.contains('open');
        $$('#faqList .faq').forEach(f => { f.classList.remove('open'); $('.faq-q', f).setAttribute('aria-expanded', 'false'); });
        if (!open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
        AU.blip(520, 0.09, 0.05);
      });
    });

    const planMap = { 'تنظیم': 'arrange', 'میکس حرفه‌ای': 'mix', 'مسترینگ': 'master', 'تولید صفر': 'produce', 'میکس تک': 'mix', 'میکس + مستر': 'mix', 'تولید کامل': 'produce' };
    $$('.plan-cta').forEach(btn => {
      btn.addEventListener('click', () => {
        const plan = btn.dataset.plan || '';
        const sel = $('#typeI');
        for (const k in planMap) if (plan.includes(k)) { sel.value = planMap[k]; break; }
        $('#msgI').value = `سلام، برای «${plan}» درخواست مشاوره دارم. `;
        goTo($('#contact'));
        setTimeout(() => $('#nameI').focus({ preventScroll: true }), 700);
        toast(`«${plan}» انتخاب شد — فرم را کامل کن ♪`);
        AU.blip(740, 0.12, 0.07);
      });
    });

    const form = $('#contactForm'), msg = $('#formMsg');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#nameI').value.trim(), mail = $('#mailI').value.trim(), txt = $('#msgI').value.trim();
      const fail = m => { msg.textContent = m; msg.className = 'form-msg err'; AU.blip(180, 0.2, 0.1, 'triangle'); };
      if (name.length < 2) return fail('لطفاً نامت را کامل بنویس.');
      if (mail.length < 5) return fail('راه ارتباطی (ایمیل یا شماره) معتبر نیست.');
      if (txt.length < 5) return fail('کمی درباره‌ی پروژه‌ات بنویس.');
      const btn = $('button[type="submit"]', form);
      btn.disabled = true; btn.textContent = 'در حال ارسال…';
      setTimeout(() => {
        btn.disabled = false; btn.textContent = 'ارسال درخواست ♪';
        msg.textContent = `ممنون ${name} عزیز! درخواستت ثبت شد؛ کمتر از ۲۴ ساعت دیگر با تو تماس می‌گیریم.`;
        msg.className = 'form-msg ok';
        [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => AU.blip(f, 0.3, 0.08, 'triangle'), i * 110));
        form.querySelectorAll('input, textarea').forEach(i => i.value = '');
      }, 1000);
    });

    $('#newsForm').addEventListener('submit', e => {
      e.preventDefault();
      const i = $('#newsI');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value.trim())) { i.focus(); AU.blip(180, 0.2, 0.1, 'triangle'); return; }
      i.value = ''; i.placeholder = 'عضو شدید ♪';
      toast('عضویت در خبرنامه‌ی صدا ثبت شد');
      AU.blip(880, 0.18, 0.08);
    });
  })();

  /* ═════════ ۱۳) Reveal، شمارنده، جلوه‌ها ═════════ */
  (function fxModule() {
    const io = new IntersectionObserver(es => {
      es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach(el => io.observe(el));

    const cio = new IntersectionObserver(es => {
      es.forEach(en => {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        const el = en.target, target = +el.dataset.count, t0 = performance.now();
        (function tick(t) {
          const p = clamp((t - t0) / 1400, 0, 1), e = 1 - Math.pow(1 - p, 3);
          el.textContent = fa(Math.round(target * e));
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.5 });
    $$('[data-count]').forEach(el => cio.observe(el));

    // نورافکن کارت‌ها
    document.addEventListener('pointermove', e => {
      const card = e.target.closest && e.target.closest('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    // دکمه‌های مغناطیسی
    if (finePointer && !reduced) $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.12}px,${(e.clientY - r.top - r.height / 2) * 0.18}px)`;
      });
      b.addEventListener('pointerleave', () => b.style.transform = '');
    });

    // کرسر سفارشی
    if (finePointer) {
      const cur = $('#cursor');
      let x = -100, y = -100, tx = x, ty = y;
      addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      (function follow() {
        requestAnimationFrame(follow);
        x = lerp(x, tx, 0.2); y = lerp(y, ty, 0.2);
        cur.style.transform = `translate(${x}px,${y}px)`;
      })();
      document.addEventListener('mouseover', e => {
        document.body.classList.toggle('cur-hover', !!e.target.closest('a,button,.track-card,.inst-card,.key,.pad,#abStage,input,select,textarea'));
      });
    }

    // پارالاکس ملایم هیرو
    if (finePointer && !reduced) {
      const hero = $('#hero');
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
        $('#heroCard').style.transform = `perspective(900px) rotateY(${dx * -6}deg) rotateX(${dy * 6}deg)`;
      });
      hero.addEventListener('pointerleave', () => $('#heroCard').style.transform = '');
    }
  })();
})();

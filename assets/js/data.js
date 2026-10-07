/* ════════════════════════════════════════════════════════════════
   آوا — داده‌های سایت (ترک‌ها، سازها، اساتید، گالری)
   همه‌ی مسیرهای صوتی واقعی و داخل همین مخزن هستند (assets/audio).
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const AU = 'assets/audio';

  /* ── ۹ قطعه‌ی بخش تولیدات — فایل‌های واقعی MP3 ── */
  const TRACKS = [
    {
      id: 'adventure', file: AU + '/tracks/call-to-adventure.mp3',
      title: 'فراخوان ماجراجویی', latin: 'Call to Adventure',
      artist: 'Kevin MacLeod', artistFa: 'کوین مک‌لئود',
      tag: 'cinema', tagFa: 'سینمایی', dur: '۴:۰۷', hue: 268,
      desc: 'تم حماسی ارکسترال؛ شروعی قدرتمند برای هر روایت.', ab: true
    },
    {
      id: 'tavern', file: AU + '/tracks/tavern-brawl.mp3',
      title: 'هیاهوی میخانه', latin: 'Tavern Brawl',
      artist: 'Alexander Nakarada', artistFa: 'الکساندر ناکارادا',
      tag: 'folk', tagFa: 'فولک', dur: '۴:۲۹', hue: 36,
      desc: 'فولک پرانرژی با رنگ روستایی؛ مناسب تیتراژ و فضای شاد.'
    },
    {
      id: 'deep', file: AU + '/tracks/drums-of-the-deep.mp3',
      title: 'طبل‌های ژرفا', latin: 'Drums of the Deep',
      artist: 'Kevin MacLeod', artistFa: 'کوین مک‌لئود',
      tag: 'perc', tagFa: 'کوبه‌ای', dur: '۴:۱۷', hue: 8,
      desc: 'کوبه‌ای عمیق و آیینی؛ ضرباهنگِ تنش و قدرت.'
    },
    {
      id: 'tamlin', file: AU + '/tracks/tam-lin.mp3',
      title: 'افسانه‌ی تام‌لین', latin: 'Tam Lin',
      artist: 'Alexander Nakarada', artistFa: 'الکساندر ناکارادا',
      tag: 'folk', tagFa: 'فولک', dur: '۴:۲۱', hue: 150,
      desc: 'بالاد سلتیک با حس افسانه؛ لطیف، روایی و خیال‌انگیز.'
    },
    {
      id: 'devon', file: AU + '/tracks/devonshire-waltz.mp3',
      title: 'والس دون‌شایر', latin: 'Devonshire Waltz',
      artist: 'Kevin MacLeod', artistFa: 'کوین مک‌لئود',
      tag: 'classic', tagFa: 'کلاسیک', dur: '۵:۱۳', hue: 45,
      desc: 'والس اشرافی کلاسیک؛ ظرافتِ سالن‌های قدیمی اروپا.'
    },
    {
      id: 'darkwaltz', file: AU + '/tracks/grand-dark-waltz.mp3',
      title: 'والس تاریک بزرگ', latin: 'Grand Dark Waltz',
      artist: 'Kevin MacLeod', artistFa: 'کوین مک‌لئود',
      tag: 'cinema', tagFa: 'سینمایی', dur: '۶:۲۵', hue: 320,
      desc: 'والس تیره‌ی سینمایی؛ جایی که شکوه با راز گره می‌خورد.'
    },
    {
      id: 'machina', file: AU + '/tracks/machina.mp3',
      title: 'ماشینا', latin: 'Machina',
      artist: 'Scott Buckley', artistFa: 'اسکات باکلی',
      tag: 'electro', tagFa: 'الکترونیک', dur: '۳:۱۲', hue: 190,
      desc: 'الکترونیک مکانیکی؛ انرژی مدرن، شهری و بی‌وقفه.'
    },
    {
      id: 'mars', file: AU + '/tracks/sunrise-on-mars.mp3',
      title: 'طلوع در مریخ', latin: 'Sunrise on Mars',
      artist: 'Jason Shaw', artistFa: 'جیسون شاو',
      tag: 'electro', tagFa: 'الکترونیک', dur: '۲:۰۹', hue: 16,
      desc: 'امبینت گرم و مینیمال؛ طلوعی آرام روی شن‌های سرخ.'
    },
    {
      id: 'firefly', file: AU + '/tracks/firefly.mp3',
      title: 'شب‌تاب', latin: 'Firefly',
      artist: 'Scott Buckley', artistFa: 'اسکات باکلی',
      tag: 'electro', tagFa: 'الکترونیک', dur: '۲:۳۲', hue: 95,
      desc: 'چیل‌اوت رؤیایی؛ سوسوی شب‌تاب‌های یک شب تابستان.'
    }
  ];

  /* ── سازها — هر کارت یک سمپل واقعی دارد ── */
  const INSTRUMENTS = {
    keys: [
      { id: 'piano', name: 'پیانو', latin: 'Piano', icon: '🎹', level: 'همه‌ی سطوح', term: 'ترم ۱۲ جلسه‌ای', sample: AU + '/samples/piano_chord.mp3', desc: 'پادشاه سازها؛ از کلاسیک تا پاپ و جز.' },
      { id: 'organ', name: 'ارگ', latin: 'Organ', icon: '🎛', level: 'متوسط به بالا', term: 'ترم ۱۰ جلسه‌ای', sample: AU + '/samples/organ-chords.mp3', desc: 'صدای کلیسا و صحنه؛ شکوهِ پایدار.' },
      { id: 'synth', name: 'سینث‌سایزر', latin: 'Synth', icon: '🎚', level: 'متوسط', term: 'ترم ۸ جلسه‌ای', sample: AU + '/samples/synth-hit.mp3', desc: 'طراحی صدا و اجرای الکترونیک زنده.' },
      { id: 'accord', name: 'آکاردئون', latin: 'Accordion', icon: '🪗', level: 'مبتدی تا پیشرفته', term: 'ترم ۱۰ جلسه‌ای', sample: AU + '/clips/clip-folk1.mp3', desc: 'نفسِ فولک؛ از محلی تا فرانسوی.' }
    ],
    strings: [
      { id: 'guitar', name: 'گیتار', latin: 'Guitar', icon: '🎸', level: 'همه‌ی سطوح', term: 'ترم ۱۲ جلسه‌ای', sample: AU + '/samples/guitar_chord1.mp3', desc: 'کلاسیک، فلامنکو، پاپ و الکتریک.' },
      { id: 'violin', name: 'ویولن', latin: 'Violin', icon: '🎻', level: 'مبتدی تا پیشرفته', term: 'ترم ۱۲ جلسه‌ای', sample: AU + '/clips/clip-strings.mp3', desc: 'نزدیک‌ترین صدا به آواز انسان.' },
      { id: 'setar', name: 'سه‌تار', latin: 'Setar', icon: '🪕', level: 'همه‌ی سطوح', term: 'ترم ۱۲ جلسه‌ای', sample: AU + '/samples/banjo_pin_1.mp3', desc: 'عرفانِ مضراب؛ ردیف و بداهه‌نوازی.' },
      { id: 'santur', name: 'سنتور', latin: 'Santur', icon: '🎶', level: 'مبتدی تا پیشرفته', term: 'ترم ۱۰ جلسه‌ای', sample: AU + '/samples/Kalimba_1.mp3', desc: 'بارانِ مضراب روی سیم‌های ایرانی.' }
    ],
    wind: [
      { id: 'flute', name: 'فلوت', latin: 'Flute', icon: '🪈', level: 'مبتدی تا پیشرفته', term: 'ترم ۱۰ جلسه‌ای', sample: AU + '/samples/flute_trill_1.mp3', desc: 'نقره‌ای و چابک؛ از کلاسیک تا جز.' },
      { id: 'ney', name: 'نی', latin: 'Ney', icon: '🎋', level: 'همه‌ی سطوح', term: 'ترم ۱۲ جلسه‌ای', sample: AU + '/samples/flute_harmonics_1.mp3', desc: 'نفسِ عرفان؛ ردیف و تکنیک دم.' },
      { id: 'sax', name: 'ساکسیفون', latin: 'Saxophone', icon: '🎷', level: 'متوسط', term: 'ترم ۱۰ جلسه‌ای', sample: AU + '/clips/clip-brass.mp3', desc: 'صدای شب‌های جز و بلوز.' },
      { id: 'clar', name: 'کلارینت', latin: 'Clarinet', icon: '🎺', level: 'مبتدی تا پیشرفته', term: 'ترم ۱۰ جلسه‌ای', sample: AU + '/clips/clip-folk2.mp3', desc: 'گرم و قصه‌گو؛ از قهوه‌خانه تا ارکستر.' }
    ],
    perc: [
      { id: 'tonbak', name: 'تنبک', latin: 'Tonbak', icon: '🪘', level: 'همه‌ی سطوح', term: 'ترم ۱۰ جلسه‌ای', sample: AU + '/samples/hand_drum_1.mp3', desc: 'قلبِ ریتم ایرانی؛ پلنگ و ریز.' },
      { id: 'daf', name: 'دف', latin: 'Daf', icon: '⭕', level: 'مبتدی تا پیشرفته', term: 'ترم ۸ جلسه‌ای', sample: AU + '/samples/ritz_tambourine_1.mp3', desc: 'حلقه‌ی عرفان؛ پوست و زنجیر.' },
      { id: 'cajon', name: 'کاخن', latin: 'Cajon', icon: '📦', level: 'مبتدی', term: 'ترم ۶ جلسه‌ای', sample: AU + '/drums/kick.mp3', desc: 'درامز جیبی؛ همراهِ گیتار و جمع.' },
      { id: 'drums', name: 'درامز', latin: 'Drums', icon: '🥁', level: 'همه‌ی سطوح', term: 'ترم ۱۲ جلسه‌ای', sample: AU + '/drums/breakbeat.mp3', desc: 'موتورِ بند؛ گروو، فیل و استیج.' }
    ]
  };

  /* ── درام‌پد تعاملی ── */
  const PADS = [
    { id: 'kick', name: 'کیک', key: '۱', code: 'Digit1', file: AU + '/drums/kick.mp3', c: '#f472b6' },
    { id: 'snare', name: 'اسنیر', key: '۲', code: 'Digit2', file: AU + '/drums/snare.mp3', c: '#e9b949' },
    { id: 'hihat', name: 'های‌هت', key: '۳', code: 'Digit3', file: AU + '/drums/hihat.mp3', c: '#2dd4bf' },
    { id: 'tom1', name: 'تام ۱', key: '۴', code: 'Digit4', file: AU + '/drums/tom1.mp3', c: '#8b5cf6' },
    { id: 'tom2', name: 'تام ۲', key: '۵', code: 'Digit5', file: AU + '/drums/tom2.mp3', c: '#7dd3fc' },
    { id: 'clap', name: 'کلپ', key: '۶', code: 'Digit6', file: AU + '/samples/Clap1.mp3', c: '#fb923c' },
    { id: 'shaker', name: 'شیکر', key: '۷', code: 'Digit7', file: AU + '/samples/shaker1.mp3', c: '#a3e635' },
    { id: 'tamb', name: 'تمبورین', key: '۸', code: 'Digit8', file: AU + '/samples/ritz_tambourine_1.mp3', c: '#facc15' }
  ];

  /* ── سمپل‌های پیانو (Salamander) با شماره‌ی MIDI ── */
  const PIANO_SAMPLES = [
    { midi: 57, file: AU + '/piano/A3.mp3' },
    { midi: 60, file: AU + '/piano/C4.mp3' },
    { midi: 63, file: AU + '/piano/Ds4.mp3' },
    { midi: 66, file: AU + '/piano/Fs4.mp3' },
    { midi: 69, file: AU + '/piano/A4.mp3' },
    { midi: 72, file: AU + '/piano/C5.mp3' },
    { midi: 75, file: AU + '/piano/Ds5.mp3' },
    { midi: 78, file: AU + '/piano/Fs5.mp3' },
    { midi: 81, file: AU + '/piano/A5.mp3' },
    { midi: 84, file: AU + '/piano/C6.mp3' }
  ];

  /* ── اساتید ── */
  const TEACHERS = [
    { n: 'آرش نیکنام', r: 'گیتار کلاسیک و آهنگسازی', q: 'قبل از تکنیک، سکوت را تمرین کن؛ موسیقی آن‌جا شروع می‌شود.', s: 5, g: 'linear-gradient(140deg,#c98a3c,#6d3f14)', ic: '🎸', img: 'photo-1511671782779-c97d3d27a1d4' },
    { n: 'لیلا سپهری', r: 'پیانو و تئوری موسیقی', q: 'هر قطعه یک جمله است؛ اول معنی‌اش را بفهم، بعد بنوازش.', s: 5, g: 'linear-gradient(140deg,#8b5cf6,#2a1a5e)', ic: '🎹', img: 'photo-1494790108377-be9c29b29330' },
    { n: 'سهیل راد', r: 'میکس و مسترینگ', q: 'یک میکس خوب شنیده نمی‌شود؛ فقط حس می‌شود.', s: 5, g: 'linear-gradient(140deg,#2dd4bf,#0b4f49)', ic: '🎚', img: 'photo-1500648767791-00dcc994a43e' },
    { n: 'نگار فروزان', r: 'آواز و سلفژ', q: 'صدای تو ساز توست؛ با آن مهربان باش.', s: 4, g: 'linear-gradient(140deg,#f472b6,#6b1239)', ic: '🎤', img: 'photo-1438761681033-6461ffad8d80' }
  ];

  /* ── گالری ── */
  const GALLERY = [
    { c: 'g1', ic: '🎙', l: 'اتاق ضبط A', s: 'وکال و سازهای آکوستیک', g: 'linear-gradient(135deg,#8b5cf6,#1b1033)', img: 'photo-1598488035139-bdbb2231ce04' },
    { c: 'g2', ic: '🎚', l: 'اتاق کنترل', s: 'میکس', g: 'linear-gradient(135deg,#e9b949,#5c3d08)', img: 'photo-1598653222000-6b7b7a552625' },
    { c: 'g3', ic: '🎹', l: 'کلاس پیانو', s: 'آموزش', g: 'linear-gradient(135deg,#2dd4bf,#07403a)', img: 'photo-1552422535-c45813c61732' },
    { c: 'g4', ic: '🎸', l: 'اتاق زهی', s: 'تمرین', g: 'linear-gradient(135deg,#c98a3c,#3b2209)', img: 'photo-1510915361894-db8b60106cb1' },
    { c: 'g5', ic: '🥁', l: 'اتاق ضربی', s: 'ایزوله', g: 'linear-gradient(135deg,#c2492f,#3d0f07)', img: 'photo-1519892300165-cb5542fb47c7' },
    { c: 'g6', ic: '🎻', l: 'سالن اجرا', s: 'رسیتال ماهانه', g: 'linear-gradient(135deg,#f472b6,#3c0b25)', img: 'photo-1465847899084-d164df4dedc6' },
    { c: 'g7', ic: '🎧', l: 'اتاق مسترینگ', s: 'شنیدِ دقیق', g: 'linear-gradient(135deg,#7dd3fc,#0b2a40)', img: 'photo-1484704849700-f032a568e944' }
  ];

  window.AVA_DATA = { TRACKS, INSTRUMENTS, PADS, PIANO_SAMPLES, TEACHERS, GALLERY };
})();

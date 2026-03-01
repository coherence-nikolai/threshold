/* ===============================
   THRESHOLD v1 — engine.js
   Fixed landing, cleaned questions,
   architectural seam interaction
   =============================== */

let currentLang = 'en';
let currentField = 'self';
let isTransitioning = false;

/* ---------- Elements ---------- */
const landing     = document.getElementById('landing');
const landingEn   = document.getElementById('landing-en');
const landingEs   = document.getElementById('landing-es');
const landingHint = document.getElementById('landing-hint');
const intro       = document.getElementById('intro');
const ui          = document.getElementById('ui');
const questionEl  = document.getElementById('question');
const nextBtn     = document.getElementById('next');
const crossVisual = document.querySelector('.cross-visual');
const nextHint    = document.getElementById('next-hint');
const catButtons  = document.querySelectorAll('.cat');
const infoBtn     = document.getElementById('info-btn');
const soundBtn    = document.getElementById('sound-btn');
const langToggle  = document.getElementById('language-toggle');
const sizePop     = document.getElementById('size-pop');
const sizeDown    = document.getElementById('size-down');
const sizeUp      = document.getElementById('size-up');
const infoModal   = document.getElementById('info-modal');
const infoClose   = document.getElementById('info-close');
const infoTitle   = document.getElementById('info-title');
const infoLabel1  = document.getElementById('info-label-1');
const infoText1   = document.getElementById('info-text-1');
const infoLabel2  = document.getElementById('info-label-2');
const infoText2   = document.getElementById('info-text-2');

/* ---------- Storage ---------- */
const KEY_LANG  = 'threshold_lang';
const KEY_SOUND = 'threshold_sound';
const KEY_TEXT  = 'threshold_text_level';

/* ---------- Audio ---------- */
const BASE_HZ    = 136.1;
const CROSS_GAIN = 0.042;
const SWELL_GAIN = 0.016;
let audioCtx = null;

function soundEnabled() {
  const v = localStorage.getItem(KEY_SOUND);
  return v === null ? true : v === 'on';
}

function setSoundEnabled(on) {
  localStorage.setItem(KEY_SOUND, on ? 'on' : 'off');
  soundBtn.textContent = on ? '♪' : '♩';
  soundBtn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
}

function ensureAudio() {
  if (!soundEnabled()) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playCrossingTone() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(CROSS_GAIN, now + 0.04);
  master.gain.linearRampToValueAtTime(CROSS_GAIN * 0.65, now + 0.18);
  master.gain.linearRampToValueAtTime(0.0001, now + 0.65);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(860, now);
  master.connect(lp);
  lp.connect(ctx.destination);

  [[BASE_HZ, 'sine', 1.0, 0],
   [BASE_HZ * 2, 'sine', 0.24, 4],
   [BASE_HZ * 3, 'sine', 0.12, -5],
   [BASE_HZ * 4, 'triangle', 0.05, 2]
  ].forEach(([freq, type, gain, detune]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    o.detune.setValueAtTime(detune, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    o.connect(g); g.connect(master);
    o.start(now); o.stop(now + 0.68);
  });
}

function playQuestionSwell() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(SWELL_GAIN, now + 0.08);
  master.gain.linearRampToValueAtTime(SWELL_GAIN * 0.6, now + 0.28);
  master.gain.linearRampToValueAtTime(0.0001, now + 0.58);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(480, now);
  bp.Q.setValueAtTime(0.85, now);

  master.connect(bp);
  bp.connect(ctx.destination);

  const bufSize = Math.floor(ctx.sampleRate * 0.6);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.18;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(BASE_HZ * 2, now);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0, now);
  og.gain.linearRampToValueAtTime(0.01, now + 0.09);
  og.gain.linearRampToValueAtTime(0.0001, now + 0.58);

  noise.connect(master);
  o.connect(og); og.connect(master);
  noise.start(now); noise.stop(now + 0.62);
  o.start(now); o.stop(now + 0.62);
}

/* ---------- Text size ---------- */
function getTextLevel() {
  const v = localStorage.getItem(KEY_TEXT);
  const n = v ? parseInt(v, 10) : 2;
  return Math.min(3, Math.max(1, n));
}

function setTextLevel(level) {
  const l = Math.min(3, Math.max(1, level));
  localStorage.setItem(KEY_TEXT, String(l));
  const root = document.documentElement;
  // All levels shifted up — bigger by default
  const sizes = [
    ['clamp(2rem,   5.0vw, 2.8rem)', '1.52'],
    ['clamp(2.2rem, 5.8vw, 3.2rem)', '1.55'],
    ['clamp(2.5rem, 6.5vw, 3.7rem)', '1.58'],
  ];
  root.style.setProperty('--qSize', sizes[l-1][0]);
  root.style.setProperty('--qLine', sizes[l-1][1]);
}

/* ---------- Italic toggle (accessibility) ---------- */
const KEY_ITALIC = 'threshold_italic';

function italicEnabled() {
  return localStorage.getItem(KEY_ITALIC) !== 'off';
}

function setItalic(on) {
  localStorage.setItem(KEY_ITALIC, on ? 'on' : 'off');
  document.body.classList.toggle('no-italic', !on);
}

/* Long-press A+ to toggle italic */
let italicPressTimer = null;
sizeUp.addEventListener('pointerdown', () => {
  italicPressTimer = setTimeout(() => {
    italicPressTimer = null;
    setItalic(!italicEnabled());
    showSizePop();
  }, 600);
});
sizeUp.addEventListener('pointerup', () => {
  if (italicPressTimer) {
    clearTimeout(italicPressTimer);
    italicPressTimer = null;
    setTextLevel(getTextLevel() + 1);
    showSizePop();
  }
});
sizeUp.addEventListener('pointerleave', () => {
  if (italicPressTimer) { clearTimeout(italicPressTimer); italicPressTimer = null; }
});

/* ---------- Binaural drone ---------- */
let droneLeft  = null;
let droneRight = null;
let droneMaster = null;
let droneStarted = false;

function startDrone() {
  if (droneStarted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  droneStarted = true;

  const now = ctx.currentTime;

  // Master gain — fades in slowly over 10s
  droneMaster = ctx.createGain();
  droneMaster.gain.setValueAtTime(0, now);
  droneMaster.gain.linearRampToValueAtTime(0.0, now + 0.1);
  droneMaster.gain.linearRampToValueAtTime(0.018, now + 10);
  droneMaster.connect(ctx.destination);

  // Channel merger for stereo separation
  const merger = ctx.createChannelMerger(2);
  merger.connect(droneMaster);

  // Left ear: 136.1Hz (OM frequency)
  const oscL = ctx.createOscillator();
  oscL.type = 'sine';
  oscL.frequency.setValueAtTime(136.1, now);
  const gainL = ctx.createGain();
  gainL.gain.setValueAtTime(1, now);
  oscL.connect(gainL);
  gainL.connect(merger, 0, 0); // left channel

  // Right ear: 140.1Hz (4Hz difference = theta)
  const oscR = ctx.createOscillator();
  oscR.type = 'sine';
  oscR.frequency.setValueAtTime(140.1, now);
  const gainR = ctx.createGain();
  gainR.gain.setValueAtTime(1, now);
  oscR.connect(gainR);
  gainR.connect(merger, 0, 1); // right channel

  // Very subtle second harmonic for warmth (mono, not binaural)
  const oscHarm = ctx.createOscillator();
  oscHarm.type = 'sine';
  oscHarm.frequency.setValueAtTime(272.2, now); // 136.1 × 2
  const gainHarm = ctx.createGain();
  gainHarm.gain.setValueAtTime(0.12, now);
  oscHarm.connect(gainHarm);
  gainHarm.connect(droneMaster);

  oscL.start(now);
  oscR.start(now);
  oscHarm.start(now);

  droneLeft  = oscL;
  droneRight = oscR;
}

function stopDrone() {
  if (!droneStarted || !droneMaster) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  droneMaster.gain.linearRampToValueAtTime(0, now + 2);
  setTimeout(() => {
    try { droneLeft.stop(); droneRight.stop(); } catch(e) {}
    droneStarted = false;
  }, 2200);
}

function setDroneEnabled(on) {
  if (on) {
    startDrone();
    if (droneMaster) {
      const ctx = ensureAudio();
      const now = ctx.currentTime;
      droneMaster.gain.linearRampToValueAtTime(0.018, now + 3);
    }
  } else {
    stopDrone();
  }
}

/* ---------- Copy ---------- */
function setIntroByLang() {
  const isEs = currentLang === 'es';
  document.title = isEs ? 'umbral' : 'threshold';
  document.getElementById('intro-title').textContent   = isEs ? 'umbral' : 'threshold';
  document.getElementById('intro-subtitle').textContent = isEs
    ? 'una pregunta es un umbral'
    : 'a question is a doorway';
  nextHint.textContent = isEs ? 'cruzar el umbral' : 'cross the threshold';
  document.getElementById('lang-label').textContent = isEs ? 'ES · EN' : 'EN · ES';
}

function updateCategoryLabels() {
  document.querySelectorAll('.cat-name').forEach(el => {
    const t = el.dataset[currentLang];
    if (t) el.textContent = t;
  });
}

function updateInfoModal() {
  const isEs = currentLang === 'es';
  infoTitle.textContent = isEs ? 'umbral' : 'threshold';
  if (isEs) {
    infoLabel1.textContent = 'Umbral';
    infoText1.textContent  = 'El límite entre lo conocido y lo que empieza a revelarse.';
    infoLabel2.textContent = 'Threshold';
    infoText2.textContent  = 'The space between who you were and who you are becoming.';
  } else {
    infoLabel1.textContent = 'Threshold';
    infoText1.textContent  = 'The space between who you were and who you are becoming.';
    infoLabel2.textContent = 'Umbral';
    infoText2.textContent  = 'El límite entre lo conocido y lo que empieza a revelarse.';
  }
}

/* ---------- Category atmosphere ---------- */
function setFieldAtmosphere(field) {
  document.body.className = '';
  if (field) document.body.classList.add('field-' + field);
}

function setActiveCat() {
  catButtons.forEach(b =>
    b.classList.toggle('active', b.dataset.field === currentField)
  );
}

/* ---------- Questions ---------- */
const usedQuestions = {};

function pickQuestion() {
  const pool = QUESTION_DATA?.[currentLang]?.[currentField];
  if (!pool || pool.length === 0) return '...';

  const key = currentLang + '_' + currentField;
  if (!usedQuestions[key]) usedQuestions[key] = [];

  // Reset if exhausted
  if (usedQuestions[key].length >= pool.length) usedQuestions[key] = [];

  let idx;
  let attempts = 0;
  do {
    idx = Math.floor(Math.random() * pool.length);
    attempts++;
  } while (usedQuestions[key].includes(idx) && attempts < 50);

  usedQuestions[key].push(idx);
  return pool[idx];
}

function showQuestion({ instant = false } = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = pickQuestion();

  if (instant || reduced) {
    questionEl.textContent = q;
    questionEl.classList.remove('hide');
    questionEl.classList.add('show');
    return;
  }

  if (isTransitioning) return;
  isTransitioning = true;

  questionEl.classList.add('hide');
  questionEl.classList.remove('show');

  setTimeout(() => {
    questionEl.textContent = q;
    questionEl.classList.remove('hide');
    questionEl.classList.add('show');
    playQuestionSwell();
    setTimeout(() => { isTransitioning = false; }, 1200);
  }, 750);
}

/* ---------- Intro sequence ---------- */
function runIntro() {
  intro.style.display = 'flex';
  intro.classList.remove('stage-title', 'stage-sub', 'fade-out');

  requestAnimationFrame(() => intro.classList.add('stage-title'));
  setTimeout(() => intro.classList.add('stage-sub'), 850);
  setTimeout(() => intro.classList.add('fade-out'), 2500);

  setTimeout(() => {
    intro.style.display = 'none';
    ui.style.display = 'flex';
    setActiveCat();
    setFieldAtmosphere(currentField);
    showQuestion({ instant: true });
    playQuestionSwell();
  }, 3700);
}

/* ---------- Browser language detection ---------- */
function detectBrowserLang() {
  const langs = navigator.languages || [navigator.language || 'en'];
  for (const l of langs) {
    const code = l.toLowerCase().split('-')[0];
    if (code === 'es') return 'es';
    if (code === 'en') return 'en';
  }
  return 'en';
}

/* ---------- Landing entry ---------- */
function enter(lang) {
  currentLang = lang;
  localStorage.setItem(KEY_LANG, lang);

  setIntroByLang();
  updateCategoryLabels();
  updateInfoModal();

  landing.classList.add('entering');
  landing.classList.toggle('pick-en', lang === 'en');
  landing.classList.toggle('pick-es', lang === 'es');

  playCrossingTone();
  if (soundEnabled()) startDrone();

  setTimeout(() => landing.classList.add('fade-out'), 900);
  setTimeout(() => {
    landing.style.display = 'none';
    runIntro();
  }, 1600);
}

/* ---------- Controls ---------- */
soundBtn.addEventListener('click', () => {
  const on = soundEnabled();
  setSoundEnabled(!on);
  if (!on) {
    ensureAudio();
    setDroneEnabled(true);
  } else {
    setDroneEnabled(false);
  }
});

/* Long-press for size, tap for language */
let pressTimer = null;
let sizeTimer  = null;

function showSizePop() {
  sizePop.classList.add('show');
  if (sizeTimer) clearTimeout(sizeTimer);
  sizeTimer = setTimeout(() => sizePop.classList.remove('show'), 3200);
}

langToggle.addEventListener('pointerdown', () => {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    pressTimer = null;
    showSizePop();
  }, 520);
});

langToggle.addEventListener('pointerup', () => {
  if (!pressTimer) return;
  clearTimeout(pressTimer);
  pressTimer = null;
  // Tap = language switch
  currentLang = currentLang === 'en' ? 'es' : 'en';
  localStorage.setItem(KEY_LANG, currentLang);
  setIntroByLang();
  updateCategoryLabels();
  updateInfoModal();
  showQuestion();
});

langToggle.addEventListener('pointerleave', () => {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
});
langToggle.addEventListener('pointercancel', () => {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
});

sizeDown.addEventListener('click', () => { setTextLevel(getTextLevel() - 1); showSizePop(); });

catButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentField = btn.dataset.field;
    setActiveCat();
    setFieldAtmosphere(currentField);
    showQuestion();
  });
});

nextBtn.addEventListener('click', () => {
  if (crossVisual) {
    crossVisual.classList.remove('rippling');
    void crossVisual.offsetWidth;
    crossVisual.classList.add('rippling');
    setTimeout(() => crossVisual.classList.remove('rippling'), 1600);
  }
  playCrossingTone();
  showQuestion();
});

infoBtn.addEventListener('click',  () => { updateInfoModal(); infoModal.classList.remove('hidden'); });
infoClose.addEventListener('click', () => infoModal.classList.add('hidden'));
infoModal.addEventListener('click', e => { if (e.target === infoModal) infoModal.classList.add('hidden'); });
window.addEventListener('keydown', e => { if (e.key === 'Escape') infoModal.classList.add('hidden'); });

/* Keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') {
    if (document.activeElement === document.body ||
        document.activeElement === nextBtn) {
      e.preventDefault();
      nextBtn.click();
    }
  }
});

/* ---------- Init ---------- */
window.addEventListener('load', () => {
  const saved = localStorage.getItem(KEY_LANG);
  currentLang = (saved === 'es' || saved === 'en') ? saved : 'en';

  setTextLevel(getTextLevel());
  setSoundEnabled(soundEnabled());
  setItalic(italicEnabled());

  landing.style.display = 'flex';
  intro.style.display   = 'none';
  ui.style.display      = 'none';

  // Pre-highlight the browser's detected language
  const detected = detectBrowserLang();
  if (detected === 'es') {
    document.getElementById('landing-es').classList.add('detected');
  } else {
    document.getElementById('landing-en').classList.add('detected');
  }
});

landingEn.addEventListener('click', () => enter('en'));
landingEs.addEventListener('click', () => enter('es'));

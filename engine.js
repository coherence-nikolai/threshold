/* ===============================
   THRESHOLD v14 – engine.js
   Locked design:
   - Split landing language seam
   - Intro title/subtitle
   - Categories + slow fades
   - Sound: 136.1Hz crossing + subtle swell on question arrival
   - Tap EN|ES switches language
   - Long-press EN|ES shows A-/A+ for text size
   =============================== */

let currentLang = null;
let currentField = "self";
let isTransitioning = false;

/* ---------- Elements ---------- */
const landing = document.getElementById("landing");
const landingEn = document.getElementById("landing-en");
const landingEs = document.getElementById("landing-es");
const landingHint = document.getElementById("landing-hint");

const intro = document.getElementById("intro");
const ui = document.getElementById("ui");

const questionEl = document.getElementById("question");
const nextBtn = document.getElementById("next");
const portalVisual = document.querySelector(".threshold-visual");
const nextHint = document.getElementById("next-hint");

const catButtons = document.querySelectorAll(".cat");

const infoBtn = document.getElementById("info-btn");
const soundBtn = document.getElementById("sound-btn");
const langToggle = document.getElementById("language-toggle");

const sizePop = document.getElementById("size-pop");
const sizeDown = document.getElementById("size-down");
const sizeUp = document.getElementById("size-up");

const infoModal = document.getElementById("info-modal");
const infoClose = document.getElementById("info-close");
const infoTitle = document.getElementById("info-title");
const infoLabel1 = document.getElementById("info-label-1");
const infoText1 = document.getElementById("info-text-1");
const infoLabel2 = document.getElementById("info-label-2");
const infoText2 = document.getElementById("info-text-2");

/* ---------- Storage keys ---------- */
const KEY_LANG = "threshold_lang";
const KEY_SOUND = "threshold_sound";
const KEY_TEXT = "threshold_text_level";

/* ---------- Sound (WebAudio) ---------- */
const BASE_HZ = 136.1;      // locked
const CROSS_GAIN = 0.045;   // subtle, phone-safe
const SWELL_GAIN = 0.018;   // very subtle under-question swell

let audioCtx = null;

function soundEnabled() {
  const v = localStorage.getItem(KEY_SOUND);
  return v === null ? true : v === "on";
}

function setSoundEnabled(on) {
  localStorage.setItem(KEY_SOUND, on ? "on" : "off");
  soundBtn.textContent = on ? "🔊" : "🔇";
  soundBtn.setAttribute("aria-label", on ? "Sound on" : "Sound off");
}

function ensureAudio() {
  if (!soundEnabled()) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playCrossingTone() {
  const ctx = ensureAudio();
  if (!ctx) return;

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0, now);
  master.gain.linearRampToValueAtTime(CROSS_GAIN, now + 0.03);
  master.gain.linearRampToValueAtTime(CROSS_GAIN * 0.70, now + 0.16);
  master.gain.linearRampToValueAtTime(0.0001, now + 0.60);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, now);
  lp.Q.setValueAtTime(0.8, now);

  master.connect(lp);
  lp.connect(ctx.destination);

  function osc(freq, type, gain, detune=0){
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    o.detune.setValueAtTime(detune, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    o.connect(g);
    g.connect(master);

    o.start(now);
    o.stop(now + 0.62);
  }

  osc(BASE_HZ, "sine", 1.00, 0);
  osc(BASE_HZ * 2.0, "sine", 0.26, +4);
  osc(BASE_HZ * 3.0, "sine", 0.14, -6);
  osc(BASE_HZ * 4.0, "triangle", 0.06, +2);
}

/* A subtle, airy swell when a question ARRIVES (not a ding) */
function playQuestionSwell() {
  const ctx = ensureAudio();
  if (!ctx) return;

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0, now);
  master.gain.linearRampToValueAtTime(SWELL_GAIN, now + 0.06);
  master.gain.linearRampToValueAtTime(SWELL_GAIN * 0.7, now + 0.22);
  master.gain.linearRampToValueAtTime(0.0001, now + 0.52);

  // bandpass noise for "air"
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(520, now);
  bp.Q.setValueAtTime(0.9, now);

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(140, now);
  hp.Q.setValueAtTime(0.7, now);

  master.connect(hp);
  hp.connect(bp);
  bp.connect(ctx.destination);

  // noise
  const bufferSize = Math.floor(ctx.sampleRate * 0.55);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0; i<bufferSize; i++){
    // very gentle noise
    data[i] = (Math.random()*2 - 1) * 0.20;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // a soft harmonic pad under the noise (very low)
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(BASE_HZ * 2.0, now);

  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0, now);
  og.gain.linearRampToValueAtTime(0.012, now + 0.08);
  og.gain.linearRampToValueAtTime(0.006, now + 0.26);
  og.gain.linearRampToValueAtTime(0.0001, now + 0.52);

  noise.connect(master);
  o.connect(og);
  og.connect(master);

  noise.start(now);
  noise.stop(now + 0.56);

  o.start(now);
  o.stop(now + 0.56);
}

/* ---------- Text size (3 levels) ---------- */
function getTextLevel(){
  const v = localStorage.getItem(KEY_TEXT);
  const n = v ? parseInt(v, 10) : 2; // 1..3 (default 2 = Large)
  return Math.min(3, Math.max(1, n));
}

function setTextLevel(level){
  const clamped = Math.min(3, Math.max(1, level));
  localStorage.setItem(KEY_TEXT, String(clamped));

  // Map to CSS variables (question only)
  const root = document.documentElement;
  if (clamped === 1){
    root.style.setProperty("--qSize", "clamp(1.85rem, 4.2vw, 2.6rem)");
    root.style.setProperty("--qLine", "1.42");
  } else if (clamped === 2){
    root.style.setProperty("--qSize", "clamp(1.95rem, 4.6vw, 2.85rem)");
    root.style.setProperty("--qLine", "1.44");
  } else {
    root.style.setProperty("--qSize", "clamp(2.15rem, 5.1vw, 3.15rem)");
    root.style.setProperty("--qLine", "1.48");
  }
}

/* ---------- Copy ---------- */
function setIntroByLang(){
  const isEs = currentLang === "es";
  const title = isEs ? "umbral" : "threshold";
  const subtitle = isEs ? "una pregunta es un umbral" : "a question is a doorway";

  document.title = title;
  document.getElementById("intro-title").textContent = title;
  document.getElementById("intro-subtitle").textContent = subtitle;

  nextHint.textContent = isEs ? "cruzar el umbral" : "cross the threshold";
}

function updateCategoryLabels(){
  document.querySelectorAll(".name").forEach(el => {
    const t = el.dataset[currentLang];
    if (t) el.textContent = t;
  });
}

function updateInfoModalCopy(){
  const isEs = currentLang === "es";
  infoTitle.textContent = isEs ? "umbral" : "threshold";
  if (isEs){
    infoLabel1.textContent = "Umbral";
    infoText1.textContent = "El límite entre lo conocido y lo que empieza a revelarse.";
    infoLabel2.textContent = "Threshold";
    infoText2.textContent = "The space between who you were and who you are becoming.";
  } else {
    infoLabel1.textContent = "Threshold";
    infoText1.textContent = "The space between who you were and who you are becoming.";
    infoLabel2.textContent = "Umbral";
    infoText2.textContent = "El límite entre lo conocido y lo que empieza a revelarse.";
  }
}

/* ---------- Categories ---------- */
function setActiveCat(){
  catButtons.forEach(b => b.classList.toggle("active", b.dataset.field === currentField));
}

/* ---------- Questions ---------- */
function pickQuestion(){
  const pool = QUESTION_DATA?.[currentLang]?.[currentField];
  if (!pool || pool.length === 0) return "...";
  return pool[Math.floor(Math.random() * pool.length)];
}

function showQuestion({instant=false} = {}){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = pickQuestion();

  if (instant || reduced){
    questionEl.textContent = q;
    questionEl.classList.remove("hide");
    questionEl.classList.add("show");
    return;
  }

  if (isTransitioning) return;
  isTransitioning = true;

  const fadeOutMs = 900;
  const pauseMs = 200;

  questionEl.classList.add("hide");
  questionEl.classList.remove("show");

  setTimeout(() => {
    questionEl.textContent = q;
    questionEl.classList.remove("hide");
    questionEl.classList.add("show");

    // swell happens on arrival
    playQuestionSwell();

    setTimeout(() => { isTransitioning = false; }, 1100);
  }, fadeOutMs + pauseMs);
}

/* ---------- Intro sequence ---------- */
function runIntro(){
  intro.style.display = "flex";
  intro.classList.remove("stage-title", "stage-sub", "fade-out");

  requestAnimationFrame(() => intro.classList.add("stage-title"));
  setTimeout(() => intro.classList.add("stage-sub"), 820);
  setTimeout(() => intro.classList.add("fade-out"), 2450);

  setTimeout(() => {
    intro.style.display = "none";
    ui.style.display = "flex";
    setActiveCat();
    showQuestion({instant:true});
    // first question arrival gets a swell (very subtle)
    playQuestionSwell();
  }, 3650);
}

/* ---------- Landing entry ---------- */
function enter(lang){
  currentLang = lang;
  localStorage.setItem(KEY_LANG, lang);

  // prepare copy before intro
  setIntroByLang();
  updateCategoryLabels();
  updateInfoModalCopy();

  // Animate landing choice
  landing.classList.add("entering");
  landing.classList.toggle("pick-en", lang === "en");
  landing.classList.toggle("pick-es", lang === "es");

  // entry tone (same crossing tone, softened by master gain already)
  playCrossingTone();

  // fade landing out, then run intro
  setTimeout(() => landing.classList.add("fade-out"), 980);
  setTimeout(() => {
    landing.style.display = "none";
    runIntro();
  }, 1600);
}

/* ---------- Controls ---------- */
function openInfo(){
  updateInfoModalCopy();
  infoModal.classList.remove("hidden");
}
function closeInfo(){
  infoModal.classList.add("hidden");
}

/* Sound toggle */
soundBtn.addEventListener("click", () => {
  const on = soundEnabled();
  setSoundEnabled(!on);
  // if turning on, prime audio on gesture
  if (!on) ensureAudio();
});

/* EN|ES: tap switches language, long press shows size controls */
let pressTimer = null;
let sizeTimer = null;

function showSizePop(){
  sizePop.classList.add("show");
  if (sizeTimer) clearTimeout(sizeTimer);
  sizeTimer = setTimeout(() => sizePop.classList.remove("show"), 3000);
}

function clearPressTimer(){
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
}

langToggle.addEventListener("pointerdown", (e) => {
  clearPressTimer();
  pressTimer = setTimeout(() => {
    showSizePop();
  }, 520);
});

langToggle.addEventListener("pointerup", (e) => {
  if (!pressTimer) return;

  const wasLongPress = false; // if timer already fired, pressTimer is cleared below
  // If the timer hasn't executed yet, it's a tap: switch language
  clearTimeout(pressTimer);
  pressTimer = null;

  // Tap => language switch
  currentLang = currentLang === "en" ? "es" : "en";
  localStorage.setItem(KEY_LANG, currentLang);
  setIntroByLang();
  updateCategoryLabels();
  updateInfoModalCopy();
  showQuestion();
});

langToggle.addEventListener("pointerleave", clearPressTimer);
langToggle.addEventListener("pointercancel", clearPressTimer);

/* size controls */
sizeDown.addEventListener("click", () => {
  setTextLevel(getTextLevel() - 1);
  showSizePop();
});
sizeUp.addEventListener("click", () => {
  setTextLevel(getTextLevel() + 1);
  showSizePop();
});

/* categories */
catButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentField = btn.dataset.field;
    setActiveCat();
    showQuestion();
  });
});

/* threshold press */
nextBtn.addEventListener("click", () => {
  if (portalVisual){
    portalVisual.classList.remove("rippling");
    void portalVisual.offsetWidth;
    portalVisual.classList.add("rippling");
    setTimeout(() => portalVisual.classList.remove("rippling"), 1800);
  }
  playCrossingTone();
  showQuestion();
});

/* info modal */
infoBtn.addEventListener("click", openInfo);
infoClose.addEventListener("click", closeInfo);
infoModal.addEventListener("click", (e) => { if (e.target === infoModal) closeInfo(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeInfo(); });

/* ---------- Init ---------- */
window.addEventListener("load", () => {
  // apply stored prefs
  const savedLang = localStorage.getItem(KEY_LANG);
  currentLang = (savedLang === "es" || savedLang === "en") ? savedLang : "en";

  setTextLevel(getTextLevel());
  setSoundEnabled(soundEnabled());

  // landing always shows first (ritual)
  landing.style.display = "grid";
  intro.style.display = "none";
  ui.style.display = "none";

  // hide hint slowly after a moment
  setTimeout(() => {
    if (landingHint && !landing.classList.contains("entering")){
      landingHint.style.opacity = "0.35";
    }
  }, 2200);
});

/* Landing handlers */
landingEn.addEventListener("click", () => enter("en"));
landingEs.addEventListener("click", () => enter("es"));

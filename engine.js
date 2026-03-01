/* ===============================
   THRESHOLD – engine.js (LOCKED)
   - Language landing → intro → main UI
   - Slow fade question transitions
   - EN/ES switching
   - Sound: LOCKED 136.1 Hz on threshold press
   =============================== */

let currentLang = null;
let currentField = "self";
let isTransitioning = false;

/* ===== SOUND (LOCKED) ===== */
const BASE_HZ = 136.1;          // locked
const MASTER_GAIN = 0.045;      // subtle (phone-safe)
let audioCtx = null;

function ensureAudio() {
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

function playThresholdTone() {
  const ctx = ensureAudio();
  if (!ctx) return;

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0, now);

  // gentle envelope
  master.gain.linearRampToValueAtTime(MASTER_GAIN, now + 0.03);
  master.gain.linearRampToValueAtTime(MASTER_GAIN * 0.70, now + 0.16);
  master.gain.linearRampToValueAtTime(0.0001, now + 0.58);

  // soften edges for phone speakers
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  filter.Q.setValueAtTime(0.8, now);

  master.connect(filter);
  filter.connect(ctx.destination);

  function osc(freq, type, gain, detuneCents = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    o.detune.setValueAtTime(detuneCents, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);

    o.connect(g);
    g.connect(master);

    o.start(now);
    o.stop(now + 0.60);
  }

  // base + soft harmonics (mirror shimmer)
  osc(BASE_HZ,       "sine",     1.00,  0);
  osc(BASE_HZ * 2.0, "sine",     0.26, +4);
  osc(BASE_HZ * 3.0, "sine",     0.14, -6);
  osc(BASE_HZ * 4.0, "triangle", 0.06, +2);
}

/* ===== Elements ===== */
const langScreen  = document.getElementById("lang-screen");
const chooseEnBtn = document.getElementById("choose-en");
const chooseEsBtn = document.getElementById("choose-es");

const intro      = document.getElementById("intro");
const ui         = document.getElementById("ui");
const questionEl = document.getElementById("question");
const nextBtn    = document.getElementById("next");
const langToggle = document.getElementById("language-toggle");

const catButtons = document.querySelectorAll(".cat");

const infoBtn   = document.getElementById("info-btn");
const infoModal = document.getElementById("info-modal");
const infoClose = document.getElementById("info-close");

const infoTitle  = document.getElementById("info-title");
const infoLabel1 = document.getElementById("info-label-1");
const infoText1  = document.getElementById("info-text-1");
const infoLabel2 = document.getElementById("info-label-2");
const infoText2  = document.getElementById("info-text-2");

const nextHint = document.getElementById("next-hint");

/* ===== Copy helpers ===== */
function setIntroByLang() {
  const isSpanish = currentLang === "es";

  const titleText = isSpanish ? "umbral" : "threshold";
  const subtitleText = isSpanish ? "una pregunta es un umbral" : "a question is a doorway";

  document.title = titleText;
  document.getElementById("intro-title").textContent = titleText;
  document.getElementById("intro-subtitle").textContent = subtitleText;

  nextHint.textContent = isSpanish ? "cruza el umbral" : "cross the threshold";
}

function updateCategoryLabels() {
  document.querySelectorAll(".name").forEach(label => {
    const text = label.dataset[currentLang];
    if (text) label.textContent = text;
  });
}

function updateInfoModalCopy() {
  const isSpanish = currentLang === "es";
  infoTitle.textContent = isSpanish ? "umbral" : "threshold";

  if (isSpanish) {
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

/* ===== Categories ===== */
function setActiveCat() {
  catButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.field === currentField);
  });
}

/* ===== Questions ===== */
function pickQuestion() {
  const pool = QUESTION_DATA?.[currentLang]?.[currentField];
  if (!pool || pool.length === 0) return "...";
  return pool[Math.floor(Math.random() * pool.length)];
}

function showQuestion({ instant = false } = {}) {
  if (!currentLang) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const newQ = pickQuestion();

  if (instant || reduced) {
    questionEl.textContent = newQ;
    questionEl.classList.remove("q-out");
    return;
  }

  if (isTransitioning) return;
  isTransitioning = true;

  // Breath-like timing (slower)
  const fadeOutMs = 900;
  const pauseMs   = 200;
  const fadeInMs  = 1100;

  questionEl.classList.add("q-out");

  setTimeout(() => {
    questionEl.textContent = newQ;
    questionEl.classList.remove("q-out");

    setTimeout(() => {
      isTransitioning = false;
    }, fadeInMs);
  }, fadeOutMs + pauseMs);
}

/* ===== Intro sequence ===== */
function runIntroSequence() {
  intro.style.display = "flex";
  intro.classList.remove("stage-title", "stage-whisper", "fade-out");

  requestAnimationFrame(() => intro.classList.add("stage-title"));
  setTimeout(() => intro.classList.add("stage-whisper"), 850);
  setTimeout(() => intro.classList.add("fade-out"), 2500);

  setTimeout(() => {
    intro.style.display = "none";
    ui.style.display = "flex";
    setActiveCat();
    showQuestion({ instant: true });
  }, 3900);
}

function startExperience() {
  langScreen.style.display = "none";
  ui.style.display = "none";

  setIntroByLang();
  updateCategoryLabels();
  updateInfoModalCopy();

  runIntroSequence();
}

/* ===== Landing language choice ===== */
chooseEnBtn.addEventListener("click", () => {
  currentLang = "en";
  localStorage.setItem("threshold_lang", "en");
  startExperience();
});

chooseEsBtn.addEventListener("click", () => {
  currentLang = "es";
  localStorage.setItem("threshold_lang", "es");
  startExperience();
});

/* ===== Category clicks ===== */
catButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentField = btn.dataset.field;
    setActiveCat();
    showQuestion();
  });
});

/* ===== Threshold press ===== */
nextBtn.addEventListener("click", () => {
  playThresholdTone();
  showQuestion();
});

/* ===== Language toggle ===== */
langToggle.addEventListener("click", () => {
  if (!currentLang) return;

  currentLang = currentLang === "en" ? "es" : "en";
  localStorage.setItem("threshold_lang", currentLang);

  setIntroByLang();
  updateCategoryLabels();
  updateInfoModalCopy();
  showQuestion();
});

/* ===== Info modal ===== */
function openInfo() {
  updateInfoModalCopy();
  infoModal.classList.remove("hidden");
}
function closeInfo() {
  infoModal.classList.add("hidden");
}

infoBtn.addEventListener("click", openInfo);
infoClose.addEventListener("click", closeInfo);

infoModal.addEventListener("click", (e) => {
  if (e.target === infoModal) closeInfo();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeInfo();
});

/* ===== On load: always show landing ===== */
window.addEventListener("load", () => {
  const saved = localStorage.getItem("threshold_lang");
  currentLang = (saved === "en" || saved === "es") ? saved : "en";

  langScreen.style.display = "flex";
  intro.style.display = "none";
  ui.style.display = "none";
});

let currentLang = null;
let currentField = "self";
let isTransitioning = false;

const langScreen = document.getElementById("lang-screen");
const chooseEnBtn = document.getElementById("choose-en");
const chooseEsBtn = document.getElementById("choose-es");

const intro = document.getElementById("intro");
const ui = document.getElementById("ui");
const questionEl = document.getElementById("question");
const nextBtn = document.getElementById("next");
const langToggle = document.getElementById("language-toggle");
const fieldButtons = document.querySelectorAll("#field-selector button");

const infoBtn = document.getElementById("info-btn");
const infoModal = document.getElementById("info-modal");
const infoClose = document.getElementById("info-close");

const infoTitle = document.getElementById("info-title");
const infoLabel1 = document.getElementById("info-label-1");
const infoText1 = document.getElementById("info-text-1");
const infoLabel2 = document.getElementById("info-label-2");
const infoText2 = document.getElementById("info-text-2");

function setIntroByLang() {
  const isSpanish = currentLang === "es";

  const titleText = isSpanish ? "umbral" : "threshold";
  const subtitleText = isSpanish
    ? "una pregunta es un umbral"
    : "a question is a doorway";

  document.title = titleText;
  document.getElementById("intro-title").textContent = titleText;
  document.getElementById("intro-subtitle").textContent = subtitleText;
}

function updateCategoryLabels() {
  document.querySelectorAll(".label").forEach(label => {
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

/* ------- Active category ------- */
function setActiveFieldButton() {
  fieldButtons.forEach(b => b.classList.toggle("active", b.dataset.field === currentField));
}

/* ------- Question transitions ------- */
function pickQuestion() {
  const pool = QUESTION_DATA?.[currentLang]?.[currentField];
  if (!pool || pool.length === 0) return "...";
  const i = Math.floor(Math.random() * pool.length);
  return pool[i];
}

function showQuestion({ instant = false } = {}) {
  if (!currentLang) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const newQ = pickQuestion();

  if (instant || reduced) {
    questionEl.textContent = newQ;
    questionEl.classList.remove("q-out");
    questionEl.classList.add("q-in");
    return;
  }

  if (isTransitioning) return;
  isTransitioning = true;

  questionEl.classList.add("q-out");
  questionEl.classList.remove("q-in");

  setTimeout(() => {
    questionEl.textContent = newQ;
    questionEl.classList.remove("q-out");
    questionEl.classList.add("q-in");

    setTimeout(() => {
      isTransitioning = false;
    }, 340);
  }, 340);
}

/* ------- Intro sequence (staged) ------- */
function runIntroSequence() {
  intro.style.display = "flex";
  intro.classList.remove("stage-title", "stage-whisper", "fade-out");

  // 1) title arrives
  requestAnimationFrame(() => {
    intro.classList.add("stage-title");
  });

  // 2) whisper arrives
  setTimeout(() => {
    intro.classList.add("stage-whisper");
  }, 750);

  // 3) fade out
  setTimeout(() => {
    intro.classList.add("fade-out");
  }, 2400);

  // 4) show UI
  setTimeout(() => {
    intro.style.display = "none";
    ui.style.display = "flex";
    setActiveFieldButton();
    showQuestion({ instant: true });
  }, 3800);
}

function startExperience() {
  langScreen.style.display = "none";
  ui.style.display = "none";

  setIntroByLang();
  updateCategoryLabels();
  updateInfoModalCopy();

  runIntroSequence();
}

/* ------- Landing ------- */
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

/* ------- Category selection ------- */
fieldButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentField = btn.dataset.field;
    setActiveFieldButton();
    showQuestion();
  });
});

/* ------- Next ------- */
nextBtn.addEventListener("click", () => showQuestion());

/* ------- Language toggle ------- */
langToggle.addEventListener("click", () => {
  if (!currentLang) return;

  currentLang = currentLang === "en" ? "es" : "en";
  localStorage.setItem("threshold_lang", currentLang);

  setIntroByLang();
  updateCategoryLabels();
  updateInfoModalCopy();
  showQuestion();
});

/* ------- Info modal ------- */
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

/* ------- Auto-restore ------- */
window.addEventListener("load", () => {
  const saved = localStorage.getItem("threshold_lang");
  if (saved === "en" || saved === "es") {
    currentLang = saved;
    startExperience();
  } else {
    langScreen.style.display = "flex";
    intro.style.display = "none";
    ui.style.display = "none";
  }
});

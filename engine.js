let currentLang = null;   // chosen on landing
let currentField = "self";

const langScreen = document.getElementById("lang-screen");
const chooseEnBtn = document.getElementById("choose-en");
const chooseEsBtn = document.getElementById("choose-es");

const intro = document.getElementById("intro");
const ui = document.getElementById("ui");
const questionEl = document.getElementById("question");
const nextBtn = document.getElementById("next");
const langToggle = document.getElementById("language-toggle");
const fieldButtons = document.querySelectorAll("#field-selector button");

/* Next button text */
const nextLabel = document.getElementById("next-label");
const nextSub = document.getElementById("next-sub");

/* Info modal elements */
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

function updateNextCopy() {
  const isSpanish = currentLang === "es";
  nextLabel.textContent = isSpanish ? "presiona el umbral" : "press the threshold";
  nextSub.textContent = isSpanish ? "siguiente" : "next";
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

function showQuestion() {
  const pool = QUESTION_DATA?.[currentLang]?.[currentField];

  if (!pool || pool.length === 0) {
    questionEl.textContent = "...";
    return;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  questionEl.textContent = pool[randomIndex];
}

function startExperience() {
  langScreen.style.display = "none";
  intro.style.display = "flex";
  ui.style.display = "none";

  intro.classList.remove("fade-out");

  setIntroByLang();
  updateCategoryLabels();
  updateInfoModalCopy();
  updateNextCopy();

  requestAnimationFrame(() => {
    intro.classList.add("fade-out");
  });

  setTimeout(() => {
    intro.style.display = "none";
    ui.style.display = "flex";
    showQuestion();
  }, 3200);
}

/* ---------- Landing choice ---------- */

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

/* ---------- Field selection ---------- */

fieldButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentField = btn.dataset.field;
    showQuestion();
  });
});

/* ---------- Threshold button = next ---------- */

nextBtn.addEventListener("click", showQuestion);

/* ---------- Language toggle (after start) ---------- */

langToggle.addEventListener("click", () => {
  if (!currentLang) return;

  currentLang = currentLang === "en" ? "es" : "en";
  localStorage.setItem("threshold_lang", currentLang);

  setIntroByLang();
  updateCategoryLabels();
  updateInfoModalCopy();
  updateNextCopy();
  showQuestion();
});

/* Allow Enter/Space on language toggle for accessibility */
langToggle.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    langToggle.click();
  }
});

/* ---------- Info modal ---------- */

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

/* ---------- Auto-restore language ---------- */

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

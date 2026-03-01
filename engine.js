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

function setTitleByLang() {
  const titleText = currentLang === "es" ? "umbral" : "threshold";
  document.title = titleText;
  intro.textContent = titleText;
}

function updateCategoryLabels() {
  document.querySelectorAll(".label").forEach(label => {
    const text = label.dataset[currentLang];
    if (text) label.textContent = text;
  });
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
  // hide landing, show intro
  langScreen.style.display = "none";
  intro.style.display = "flex";
  ui.style.display = "none";

  setTitleByLang();
  updateCategoryLabels();

  // fade intro out, then show UI
  // (we add class so CSS anim runs)
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

/* ---------- Continue ---------- */

nextBtn.addEventListener("click", showQuestion);

/* ---------- Language toggle (after start) ---------- */

langToggle.addEventListener("click", () => {
  if (!currentLang) return;

  currentLang = currentLang === "en" ? "es" : "en";
  localStorage.setItem("threshold_lang", currentLang);

  setTitleByLang();
  updateCategoryLabels();
  showQuestion();
});

/* ---------- Auto-restore language if previously chosen ---------- */

window.addEventListener("load", () => {
  const saved = localStorage.getItem("threshold_lang");
  if (saved === "en" || saved === "es") {
    currentLang = saved;
    startExperience();
  } else {
    // first visit: show landing
    langScreen.style.display = "flex";
    intro.style.display = "none";
    ui.style.display = "none";
  }
});

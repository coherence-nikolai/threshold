let currentLang = "en";
let currentField = "self";

const intro = document.getElementById("intro");
const ui = document.getElementById("ui");
const questionEl = document.getElementById("question");
const nextBtn = document.getElementById("next");
const langToggle = document.getElementById("language-toggle");
const fieldButtons = document.querySelectorAll("#field-selector button");

/* ---------------------------
   Intro fade logic
---------------------------- */

window.addEventListener("load", () => {
  setTimeout(() => {
    intro.style.display = "none";
    ui.style.display = "flex";
    showQuestion();
  }, 6000);
});

/* ---------------------------
   Show Question
---------------------------- */

function showQuestion() {
  const pool =
    QUESTION_DATA[currentLang] &&
    QUESTION_DATA[currentLang][currentField];

  if (!pool || pool.length === 0) {
    questionEl.textContent = "...";
    return;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  questionEl.textContent = pool[randomIndex];
}

/* ---------------------------
   Field Selection
---------------------------- */

fieldButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentField = button.dataset.field;
    showQuestion();
  });
});

/* ---------------------------
   Continue Button
---------------------------- */

nextBtn.addEventListener("click", showQuestion);

/* ---------------------------
   Language Toggle
---------------------------- */

langToggle.addEventListener("click", () => {
  currentLang = currentLang === "en" ? "es" : "en";
  updateCategoryLabels();
  showQuestion();
});

/* ---------------------------
   Update Category Labels
---------------------------- */

function updateCategoryLabels() {
  document.querySelectorAll(".label").forEach(label => {
    const text = label.dataset[currentLang];
    if (text) {
      label.textContent = text;
    }
  });
}

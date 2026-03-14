const PASS_THRESHOLD = 0.7;
const QUESTIONS_PER_QUIZ = 20;
const STORAGE_KEY = "english-trainer-progress";

let questionsData = null;
let lessonsData = null;
let currentLevel = null;
let currentLessonIndex = 0;
let currentQuestions = [];
let currentQuestionIndex = 0;
let currentAnswers = [];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Storage ---
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getLevelProgress(levelId) {
  const progress = loadProgress();
  return progress[levelId] || null;
}

function saveLevelResult(levelId, score, total) {
  const progress = loadProgress();
  const existing = progress[levelId];
  if (!existing || score > existing.score) {
    progress[levelId] = { score, total };
  }
  saveProgress(progress);
}

function isLevelUnlocked(levelId) {
  if (levelId === 1) return true;
  const prev = getLevelProgress(levelId - 1);
  return prev && prev.score / prev.total >= PASS_THRESHOLD;
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  showHome();
}

// --- Screens ---
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// --- Home ---
function showHome() {
  const container = document.getElementById("level-list");
  container.innerHTML = "";

  questionsData.levels.forEach((level) => {
    const unlocked = isLevelUnlocked(level.id);
    const progress = getLevelProgress(level.id);
    const passed = progress && progress.score / progress.total >= PASS_THRESHOLD;

    const card = document.createElement("div");
    card.className = "level-card" + (unlocked ? "" : " locked") + (passed ? " completed" : "");

    let badgeClass, badgeText;
    if (passed) {
      badgeClass = "completed-badge";
      badgeText = "Complété";
    } else if (unlocked) {
      badgeClass = "unlocked";
      badgeText = "Disponible";
    } else {
      badgeClass = "locked-badge";
      badgeText = "Verrouillé";
    }

    let progressHTML = "";
    if (progress) {
      const pct = Math.round((progress.score / progress.total) * 100);
      progressHTML = `
        <div class="level-progress">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill ${passed ? "complete" : ""}" style="width: ${pct}%"></div>
          </div>
          <div class="level-score">Meilleur score : ${progress.score}/${progress.total} (${pct}%)</div>
        </div>`;
    } else if (unlocked) {
      progressHTML = `<div class="progress-text">Pas encore commencé</div>`;
    }

    card.innerHTML = `
      <div class="level-card-header">
        <h2>${level.name}</h2>
        <span class="level-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="progress-text">${QUESTIONS_PER_QUIZ} questions tirées au sort parmi ${level.questions.length} — grammaire & vocabulaire</div>
      ${progressHTML}
    `;

    if (unlocked) {
      card.addEventListener("click", () => showLevelMenu(level.id));
    }

    container.appendChild(card);
  });

  showScreen("home-screen");
}

// --- Level Menu ---
function showLevelMenu(levelId) {
  currentLevel = questionsData.levels.find((l) => l.id === levelId);
  document.getElementById("level-menu-title").textContent = currentLevel.name;
  showScreen("level-menu-screen");
}

function startQuiz(levelId) {
  currentLevel = questionsData.levels.find((l) => l.id === levelId);
  currentQuestions = shuffleArray(currentLevel.questions).slice(0, QUESTIONS_PER_QUIZ);
  currentQuestionIndex = 0;
  currentAnswers = [];
  showQuestion();
  showScreen("quiz-screen");
}

// --- Lessons ---
function startLessons() {
  const levelLessons = lessonsData.levels.find((l) => l.id === currentLevel.id);
  if (!levelLessons || !levelLessons.lessons.length) return;
  currentLessonIndex = 0;
  showLesson();
  showScreen("lesson-screen");
}

function showLesson() {
  const levelLessons = lessonsData.levels.find((l) => l.id === currentLevel.id);
  const lessons = levelLessons.lessons;
  const lesson = lessons[currentLessonIndex];

  document.getElementById("lesson-level-name").textContent = currentLevel.name;
  document.getElementById("lesson-counter").textContent =
    `Leçon ${currentLessonIndex + 1} / ${lessons.length}`;
  document.getElementById("lesson-title").textContent = lesson.title;

  const container = document.getElementById("lesson-sections");
  container.innerHTML = "";

  lesson.sections.forEach((section) => {
    const div = document.createElement("div");
    div.className = "lesson-section lesson-section-" + section.type;

    if (section.type === "explanation") {
      div.innerHTML = renderMarkdownBold(section.content);
    } else if (section.type === "examples") {
      div.innerHTML = `<div class="examples-label">Exemples</div>` +
        section.items.map((item) =>
          `<div class="example-pair">
            <div class="example-en">${renderMarkdownBold(item.en)}</div>
            <div class="example-fr">${item.fr}</div>
          </div>`
        ).join("");
    } else if (section.type === "exercise") {
      div.innerHTML = renderExercise(section);
    }

    container.appendChild(div);
  });

  // Nav buttons
  const prevBtn = document.getElementById("lesson-prev-btn");
  const nextBtn = document.getElementById("lesson-next-btn");
  prevBtn.style.visibility = currentLessonIndex === 0 ? "hidden" : "visible";
  if (currentLessonIndex === lessons.length - 1) {
    nextBtn.textContent = "Terminer";
  } else {
    nextBtn.textContent = "Suivant →";
  }
}

function renderMarkdownBold(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function renderExercise(section) {
  const id = "ex-" + Math.random().toString(36).slice(2, 9);
  const optionsHTML = section.options.map((opt, i) =>
    `<button class="exercise-option" data-exercise="${id}" data-index="${i}">${opt}</button>`
  ).join("");

  return `
    <div class="exercise-block" id="${id}">
      <div class="exercise-label">Exercice</div>
      <p class="exercise-sentence">${section.sentence}</p>
      <div class="exercise-options">${optionsHTML}</div>
      <div class="exercise-feedback" id="${id}-feedback"></div>
    </div>
  `;
}

function handleExerciseClick(e) {
  const btn = e.target.closest(".exercise-option");
  if (!btn || btn.disabled) return;

  const exerciseId = btn.dataset.exercise;
  const selectedIndex = parseInt(btn.dataset.index);

  // Find the matching exercise in current lesson
  const levelLessons = lessonsData.levels.find((l) => l.id === currentLevel.id);
  const lesson = levelLessons.lessons[currentLessonIndex];
  const exercises = lesson.sections.filter((s) => s.type === "exercise");

  // Find which exercise this is by matching the block
  const block = document.getElementById(exerciseId);
  const allBlocks = document.querySelectorAll(".exercise-block");
  let exerciseIndex = 0;
  allBlocks.forEach((b, i) => { if (b.id === exerciseId) exerciseIndex = i; });

  const exercise = exercises[exerciseIndex];
  if (!exercise) return;

  const isCorrect = selectedIndex === exercise.answer;
  const buttons = block.querySelectorAll(".exercise-option");
  buttons.forEach((b) => b.disabled = true);
  buttons[exercise.answer].classList.add("correct");
  if (!isCorrect) {
    btn.classList.add("incorrect");
  }

  const feedback = document.getElementById(exerciseId + "-feedback");
  feedback.className = "exercise-feedback " + (isCorrect ? "correct" : "incorrect") + " show";
  feedback.textContent = (isCorrect ? "Correct ! " : "Incorrect. ") + exercise.explanation;
}

function lessonPrev() {
  if (currentLessonIndex > 0) {
    currentLessonIndex--;
    showLesson();
    window.scrollTo(0, 0);
  }
}

function lessonNext() {
  const levelLessons = lessonsData.levels.find((l) => l.id === currentLevel.id);
  if (currentLessonIndex < levelLessons.lessons.length - 1) {
    currentLessonIndex++;
    showLesson();
    window.scrollTo(0, 0);
  } else {
    showLevelMenu(currentLevel.id);
  }
}

// --- Quiz ---

function showQuestion() {
  const q = currentQuestions[currentQuestionIndex];
  const total = currentQuestions.length;

  // Progress bar
  const pct = (currentQuestionIndex / total) * 100;
  document.getElementById("quiz-progress-fill").style.width = pct + "%";
  document.getElementById("quiz-question-num").textContent =
    `Question ${currentQuestionIndex + 1} / ${total}`;
  document.getElementById("quiz-level-name").textContent = currentLevel.name;

  // Category
  document.getElementById("quiz-category").textContent = q.category === "grammar" ? "Grammaire" : "Vocabulaire";

  // Sentence
  document.getElementById("question-sentence").textContent = q.sentence;

  // Options
  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectAnswer(i));
    optionsContainer.appendChild(btn);
  });

  // Reset feedback
  const feedback = document.getElementById("feedback");
  feedback.className = "feedback";
  feedback.textContent = "";

  document.getElementById("next-btn").classList.remove("show");
}

function selectAnswer(index) {
  const q = currentQuestions[currentQuestionIndex];
  const buttons = document.querySelectorAll(".option-btn");
  const isCorrect = index === q.answer;

  currentAnswers.push({ questionIndex: currentQuestionIndex, selected: index, correct: isCorrect });

  // Disable all buttons
  buttons.forEach((btn) => (btn.disabled = true));

  // Highlight
  buttons[q.answer].classList.add("correct");
  if (!isCorrect) {
    buttons[index].classList.add("incorrect");
  }

  // Feedback
  const feedback = document.getElementById("feedback");
  feedback.className = "feedback " + (isCorrect ? "correct" : "incorrect") + " show";
  feedback.textContent = (isCorrect ? "Correct ! " : "Incorrect. ") + q.explanation;

  // Next button
  document.getElementById("next-btn").classList.add("show");
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= currentQuestions.length) {
    showResults();
  } else {
    showQuestion();
  }
}

function goHome() {
  showHome();
}

// --- Results ---
function showResults() {
  const total = currentQuestions.length;
  const score = currentAnswers.filter((a) => a.correct).length;
  const pct = Math.round((score / total) * 100);
  const passed = score / total >= PASS_THRESHOLD;

  saveLevelResult(currentLevel.id, score, total);

  document.getElementById("results-level-name").textContent = currentLevel.name;
  const scoreDisplay = document.getElementById("score-display");
  scoreDisplay.textContent = `${score} / ${total}`;
  scoreDisplay.className = "score-display " + (passed ? "pass" : "fail");

  document.getElementById("score-message").textContent = passed
    ? `Bravo ! ${pct}% de bonnes réponses. Niveau validé !`
    : `${pct}% de bonnes réponses. Il faut ${Math.round(PASS_THRESHOLD * 100)}% pour valider ce niveau.`;

  // Buttons
  const buttonsContainer = document.getElementById("results-buttons");
  buttonsContainer.innerHTML = "";

  const retryBtn = document.createElement("button");
  retryBtn.className = "results-btn secondary";
  retryBtn.textContent = "Recommencer";
  retryBtn.addEventListener("click", () => startQuiz(currentLevel.id));
  buttonsContainer.appendChild(retryBtn);

  const nextLevelId = currentLevel.id + 1;
  const nextLevel = questionsData.levels.find((l) => l.id === nextLevelId);
  if (passed && nextLevel) {
    const nextBtn = document.createElement("button");
    nextBtn.className = "results-btn primary";
    nextBtn.textContent = "Niveau suivant";
    nextBtn.addEventListener("click", () => showLevelMenu(nextLevelId));
    buttonsContainer.appendChild(nextBtn);
  }

  const homeBtn = document.createElement("button");
  homeBtn.className = "results-btn secondary";
  homeBtn.textContent = "Accueil";
  homeBtn.addEventListener("click", goHome);
  buttonsContainer.appendChild(homeBtn);

  // Errors
  const errorsContainer = document.getElementById("errors-list");
  const errors = currentAnswers.filter((a) => !a.correct);
  const errorsSection = document.getElementById("errors-section");

  if (errors.length === 0) {
    errorsSection.style.display = "none";
  } else {
    errorsSection.style.display = "block";
    errorsContainer.innerHTML = "";
    errors.forEach((err) => {
      const q = currentQuestions[err.questionIndex];
      const div = document.createElement("div");
      div.className = "error-item";
      div.innerHTML = `
        <div class="error-sentence">${q.sentence}</div>
        <div class="error-answer">Bonne réponse : ${q.options[q.answer]}</div>
        <div class="error-explanation">${q.explanation}</div>
      `;
      errorsContainer.appendChild(div);
    });
  }

  showScreen("results-screen");
}

// --- Init ---
async function init() {
  const [questionsRes, lessonsRes] = await Promise.all([
    fetch("questions.json"),
    fetch("lessons.json")
  ]);
  questionsData = await questionsRes.json();
  lessonsData = await lessonsRes.json();

  document.getElementById("next-btn").addEventListener("click", nextQuestion);
  document.getElementById("back-btn").addEventListener("click", () => showLevelMenu(currentLevel.id));
  document.getElementById("reset-btn").addEventListener("click", () => {
    if (confirm("Réinitialiser toute la progression ?")) {
      resetProgress();
    }
  });

  // Level menu buttons
  document.getElementById("level-menu-back-btn").addEventListener("click", goHome);
  document.getElementById("lesson-btn").addEventListener("click", startLessons);
  document.getElementById("quiz-btn").addEventListener("click", () => startQuiz(currentLevel.id));

  // Lesson navigation
  document.getElementById("lesson-back-btn").addEventListener("click", () => showLevelMenu(currentLevel.id));
  document.getElementById("lesson-prev-btn").addEventListener("click", lessonPrev);
  document.getElementById("lesson-next-btn").addEventListener("click", lessonNext);

  // Exercise click delegation
  document.getElementById("lesson-sections").addEventListener("click", handleExerciseClick);

  showHome();
}

document.addEventListener("DOMContentLoaded", init);

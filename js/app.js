const DATA_FILES = {
  questions: "./data/questions.json",
  images: "./data/image-map.json",
};

const state = {
  questionsById: new Map(),
  imageMap: {},
  queue: [],
  currentIndex: 0,
  selectedByQuestion: new Map(),
  currentRound: 1,
  roundHistory: [],
};

const ui = {
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  quizState: document.getElementById("quizState"),
  roundSummaryState: document.getElementById("roundSummaryState"),
  finalState: document.getElementById("finalState"),
  questionImageContainer: document.getElementById("questionImageContainer"),
  questionText: document.getElementById("questionText"),
  optionsContainer: document.getElementById("optionsContainer"),
  nextButton: document.getElementById("nextButton"),
  roundBadge: document.getElementById("roundBadge"),
  progressText: document.getElementById("progressText"),
  progressBar: document.getElementById("progressBar"),
  roundSummaryText: document.getElementById("roundSummaryText"),
  startReinforcementButton: document.getElementById("startReinforcementButton"),
  finalSummaryText: document.getElementById("finalSummaryText"),
  historyContainer: document.getElementById("historyContainer"),
  restartButton: document.getElementById("restartButton"),
};

init();

async function init() {
  try {
    const [questionData, imageMap] = await Promise.all([
      fetchJson(DATA_FILES.questions),
      fetchJson(DATA_FILES.images),
    ]);

    state.imageMap = imageMap ?? {};

    if (!Array.isArray(questionData?.questions) || questionData.questions.length === 0) {
      throw new Error("No se encontraron preguntas en data/questions.json");
    }

    questionData.questions.forEach((question) => {
      state.questionsById.set(question.id, question);
    });

    startRound(Array.from(state.questionsById.keys()));
    bindEvents();
  } catch (error) {
    showError(error instanceof Error ? error.message : "Error inesperado al cargar el juego.");
  }
}

function bindEvents() {
  ui.nextButton.addEventListener("click", onNextQuestion);
  ui.startReinforcementButton.addEventListener("click", onStartReinforcement);
  ui.restartButton.addEventListener("click", onRestart);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path}`);
  }
  return response.json();
}

function startRound(questionIds) {
  state.queue = shuffle([...questionIds]);
  state.currentIndex = 0;
  state.selectedByQuestion = new Map();
  hideAllStates();
  ui.quizState.classList.remove("d-none");
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const question = getCurrentQuestion();
  if (!question) {
    finalizeRound();
    return;
  }

  ui.loadingState.classList.add("d-none");
  ui.roundBadge.textContent = `Ronda ${state.currentRound}`;
  renderQuestionImage(question);
  ui.questionText.textContent = question.prompt;
  ui.nextButton.disabled = true;
  ui.nextButton.textContent =
    state.currentIndex === state.queue.length - 1 ? "Terminar ronda" : "Siguiente";

  const done = state.currentIndex;
  const total = state.queue.length;
  const progressPercent = Math.round((done / total) * 100);
  ui.progressText.textContent = `Pregunta ${done + 1} de ${total}`;
  ui.progressBar.style.width = `${progressPercent}%`;
  ui.progressBar.setAttribute("aria-valuenow", String(progressPercent));

  const optionButtons = buildOptionButtons(question);
  ui.optionsContainer.innerHTML = "";
  optionButtons.forEach((button) => ui.optionsContainer.appendChild(button));
}

function buildOptionButtons(question) {
  const shuffledOptions = shuffle(question.options.map((option) => ({ ...option })));
  return shuffledOptions.map((option) => createOptionButton(question.id, option));
}

function createOptionButton(questionId, option) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "option-button";
  button.setAttribute("data-question-id", questionId);
  button.setAttribute("data-option-id", option.id);

  const label = document.createElement("span");
  label.textContent = option.text;
  label.className = "fw-semibold";

  button.append(label);

  button.addEventListener("click", () => {
    const allButtons = ui.optionsContainer.querySelectorAll(".option-button");
    allButtons.forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.selectedByQuestion.set(questionId, option.id);
    ui.nextButton.disabled = false;
  });

  return button;
}

function renderQuestionImage(question) {
  const container = ui.questionImageContainer;
  container.innerHTML = "";
  container.classList.remove("d-none");

  const resolvedAssetId = resolveQuestionAssetId(question);
  if (!resolvedAssetId) {
    renderQuestionImagePlaceholder(container, "Question");
    return;
  }

  const mapItem = state.imageMap[resolvedAssetId];
  const imageUrl = mapItem?.url?.trim?.() ?? "";

  if (!imageUrl) {
    renderQuestionImagePlaceholder(container, mapItem?.label || resolvedAssetId);
    return;
  }

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = mapItem?.label || question.prompt;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    renderQuestionImagePlaceholder(container, mapItem?.label || resolvedAssetId);
  });
  container.appendChild(image);
}

function resolveQuestionAssetId(question) {
  if (question.assetId) {
    return question.assetId;
  }

  const correctOption = question.options.find((option) => option.isCorrect);
  if (correctOption?.assetId) {
    return correctOption.assetId;
  }

  return null;
}

function renderQuestionImagePlaceholder(container, label) {
  container.innerHTML = "";
  const fallback = document.createElement("span");
  fallback.className = "question-image-fallback";
  fallback.textContent = `Imagen: ${label}`;
  container.appendChild(fallback);
}

function onNextQuestion() {
  state.currentIndex += 1;
  renderCurrentQuestion();
}

function finalizeRound() {
  const wrongQuestionIds = [];
  let correctCount = 0;

  state.queue.forEach((questionId) => {
    const question = state.questionsById.get(questionId);
    const selectedOptionId = state.selectedByQuestion.get(questionId);
    const correctOption = question.options.find((option) => option.isCorrect);
    const isCorrect = selectedOptionId === correctOption?.id;

    if (isCorrect) {
      correctCount += 1;
    } else {
      wrongQuestionIds.push(questionId);
    }
  });

  state.roundHistory.push({
    round: state.currentRound,
    total: state.queue.length,
    correct: correctCount,
    wrongQuestionIds,
  });

  if (wrongQuestionIds.length > 0) {
    showRoundSummary(correctCount, state.queue.length, wrongQuestionIds.length);
    return;
  }

  showFinalState();
}

function showRoundSummary(correctCount, totalCount, wrongCount) {
  hideAllStates();
  ui.roundSummaryState.classList.remove("d-none");
  ui.roundSummaryText.textContent = `Acertaste ${correctCount} de ${totalCount}. En la siguiente ronda practicarás solo ${wrongCount} pregunta(s) que fallaste.`;
}

function onStartReinforcement() {
  const lastRound = state.roundHistory[state.roundHistory.length - 1];
  state.currentRound += 1;
  startRound(lastRound.wrongQuestionIds);
}

function showFinalState() {
  hideAllStates();
  ui.finalState.classList.remove("d-none");

  const rounds = state.roundHistory.length;
  const totalAsked = state.roundHistory.reduce((sum, item) => sum + item.total, 0);
  ui.finalSummaryText.textContent = `Completaste todo correctamente en ${rounds} ronda(s), con ${totalAsked} respuestas en total.`;

  ui.historyContainer.innerHTML = "";
  state.roundHistory.forEach((item) => {
    const block = document.createElement("div");
    block.className = "history-item mb-2";
    const wrong = item.total - item.correct;
    block.textContent = `Ronda ${item.round}: ${item.correct}/${item.total} correctas (${wrong} falladas)`;
    ui.historyContainer.appendChild(block);
  });
}

function onRestart() {
  state.currentRound = 1;
  state.roundHistory = [];
  startRound(Array.from(state.questionsById.keys()));
}

function hideAllStates() {
  ui.loadingState.classList.add("d-none");
  ui.errorState.classList.add("d-none");
  ui.quizState.classList.add("d-none");
  ui.roundSummaryState.classList.add("d-none");
  ui.finalState.classList.add("d-none");
}

function showError(message) {
  hideAllStates();
  ui.errorState.classList.remove("d-none");
  ui.errorState.textContent = message;
}

function getCurrentQuestion() {
  const questionId = state.queue[state.currentIndex];
  return state.questionsById.get(questionId);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

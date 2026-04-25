// DOM elements
const hiraganaEl = document.getElementById("hiragana");
const answerInput = document.getElementById("answer");
const feedbackDiv = document.getElementById("feedback");
const checkBtn = document.getElementById("checkBtn");
const nextBtn = document.getElementById("nextBtn");
const scoreSpan = document.getElementById("score");
const timeSpan = document.getElementById("time");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const accuracySpan = document.getElementById("accuracyDisplay");
const modal = document.getElementById("resultModal");
const finalScoreSpan = document.getElementById("finalScore");
const finalAccuracySpan = document.getElementById("finalAccuracy");
const startBtn = document.getElementById("startQuizBtn");
const darkToggle = document.getElementById("darkModeToggle");
const playAgainBtn = document.getElementById("playAgainBtn");

// Game state
let quizActive = false;
let questionList = [];
let currentQIndex = 0;
let userScore = 0;
let answeredCount = 0;
let correctCount = 0;
let timerInterval = null;
let secondsLeft = 60;
let currentStreak = 0;
let answerHistory = [];

// Chart
const chartCanvas = document.getElementById("miniChart");
let chartCtx = chartCanvas?.getContext("2d");

// Safe confetti function
function safeConfetti(options = {}) {
  try {
    if (typeof canvasConfetti === 'function') {
      canvasConfetti(options);
    }
  } catch(e) {
    // Silently fail - confetti is just for fun
  }
}

// Shuffle array
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Update score and accuracy display
function updateDisplay() {
  scoreSpan.textContent = userScore;
  const accuracyPercent = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);
  accuracySpan.textContent = `${accuracyPercent}%`;
}

// Draw mini chart of recent answers
function drawChart() {
  if (!chartCtx || !chartCanvas) return;
  chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  if (answerHistory.length === 0) return;
  const barWidth = (chartCanvas.width / answerHistory.length) - 2;
  answerHistory.forEach((wasCorrect, idx) => {
    const x = idx * (barWidth + 2);
    const barHeight = wasCorrect ? 30 : 15;
    chartCtx.fillStyle = wasCorrect ? "#22c55e" : "#ef4444";
    chartCtx.fillRect(x, chartCanvas.height - barHeight - 5, barWidth, barHeight);
  });
}

// Stop timer
function killTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Start timer with difficulty adjustment
function launchTimer() {
  let timeLimit = parseInt(document.getElementById("timeLimit").value) || 45;
  const difficulty = document.getElementById("difficulty").value;
  if (difficulty === "easy") timeLimit += 30;
  if (difficulty === "hard") timeLimit = Math.max(20, timeLimit - 15);
  secondsLeft = timeLimit;
  timeSpan.textContent = secondsLeft;
  timeSpan.style.color = "";
  
  killTimer();
  timerInterval = setInterval(() => {
    if (!quizActive) return;
    if (secondsLeft <= 1) {
      killTimer();
      endTheQuiz();
    } else {
      secondsLeft--;
      timeSpan.textContent = secondsLeft;
      if (secondsLeft <= 10) timeSpan.style.color = "#ef4444";
    }
  }, 1000);
}

// Update progress bar
function updateProgress() {
  if (questionList.length === 0) return;
  const percent = Math.round((currentQIndex / questionList.length) * 100);
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

// Reset to front page (settings view)
function resetToFrontPage() {
  quizActive = false;
  killTimer();
  
  hiraganaEl.textContent = "✨";
  answerInput.value = "";
  answerInput.disabled = false;
  feedbackDiv.textContent = "✨ Choose your settings and click Start!";
  feedbackDiv.style.color = "#888";
  
  checkBtn.disabled = true;
  nextBtn.disabled = true;
  
  userScore = 0;
  answeredCount = 0;
  correctCount = 0;
  currentStreak = 0;
  answerHistory = [];
  updateDisplay();
  document.getElementById("streakBadge").innerHTML = "⭐ Streak: 0";
  drawChart();
  
  progressBar.style.width = "0%";
  progressText.textContent = "0%";
  timeSpan.textContent = "0";
}

// Load current question
function loadQuestion() {
  if (!quizActive) return;
  if (currentQIndex >= questionList.length) {
    endTheQuiz();
    return;
  }
  
  const q = questionList[currentQIndex];
  hiraganaEl.textContent = q.char;
  answerInput.value = "";
  feedbackDiv.textContent = "";
  feedbackDiv.style.color = "";
  
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  answerInput.disabled = false;
  answerInput.focus();
  
  updateProgress();
}

// Check answer
function checkAnswer() {
  if (!quizActive) return;
  
  const userAnswer = answerInput.value.trim().toLowerCase();
  if (userAnswer === "") {
    feedbackDiv.textContent = "📝 Please type your answer!";
    return;
  }
  
  const currentQ = questionList[currentQIndex];
  const isAnswerCorrect = (userAnswer === currentQ.romaji);
  
  answeredCount++;
  if (isAnswerCorrect) {
    userScore++;
    correctCount++;
    currentStreak++;
    feedbackDiv.textContent = "✅ Correct! Great job!";
    feedbackDiv.style.color = "#16a34a";
    hiraganaEl.style.transform = "scale(1.1)";
    setTimeout(() => hiraganaEl.style.transform = "", 150);
    safeConfetti({ particleCount: 40, spread: 55, origin: { y: 0.6 }, colors: ["#8b5cf6", "#ec4899"] });
  } else {
    currentStreak = 0;
    feedbackDiv.textContent = `❌ Wrong! Correct answer: ${currentQ.romaji}`;
    feedbackDiv.style.color = "#dc2626";
    hiraganaEl.style.filter = "drop-shadow(0 0 3px red)";
    setTimeout(() => hiraganaEl.style.filter = "", 200);
  }
  
  const streakBadge = document.getElementById("streakBadge");
  if (streakBadge) streakBadge.innerHTML = `🔥 Streak: ${currentStreak}`;
  
  answerHistory.push(isAnswerCorrect);
  if (answerHistory.length > 15) answerHistory.shift();
  drawChart();
  updateDisplay();
  
  checkBtn.disabled = true;
  answerInput.disabled = true;
  nextBtn.disabled = false;
}

// Move to next question
function nextQuestion() {
  if (!quizActive) return;
  
  currentQIndex++;
  
  if (currentQIndex < questionList.length) {
    loadQuestion();
  } else {
    endTheQuiz();
  }
}

// End quiz - show modal
function endTheQuiz() {
  if (!quizActive) return;
  quizActive = false;
  killTimer();
  
  checkBtn.disabled = true;
  nextBtn.disabled = true;
  answerInput.disabled = true;
  
  finalScoreSpan.textContent = `${userScore} / ${questionList.length}`;
  const finalAcc = questionList.length === 0 ? 0 : Math.round((userScore / questionList.length) * 100);
  finalAccuracySpan.textContent = `${finalAcc}%`;
  modal.classList.remove("hidden");
  
  safeConfetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
}

// Start fresh quiz
function startFreshQuiz() {
  killTimer();
  
  const qCount = parseInt(document.getElementById("questionCount").value);
  
  if (typeof hiraganaData === 'undefined') {
    feedbackDiv.textContent = "Error: Data not loaded. Refresh the page.";
    return;
  }
  
  const shuffled = shuffleArray([...hiraganaData]);
  questionList = shuffled.slice(0, qCount);
  
  currentQIndex = 0;
  userScore = 0;
  answeredCount = 0;
  correctCount = 0;
  currentStreak = 0;
  answerHistory = [];
  quizActive = true;
  
  updateDisplay();
  document.getElementById("streakBadge").innerHTML = "⭐ Streak: 0";
  drawChart();
  modal.classList.add("hidden");
  
  launchTimer();
  loadQuestion();
}

// Play again - reset to front page
function playAgain() {
  modal.classList.add("hidden");
  resetToFrontPage();
}

// Event Listeners
checkBtn.addEventListener("click", checkAnswer);
nextBtn.addEventListener("click", nextQuestion);
startBtn.addEventListener("click", startFreshQuiz);
playAgainBtn.addEventListener("click", playAgain);

// Enter key support
answerInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && quizActive && !checkBtn.disabled) {
    e.preventDefault();
    checkAnswer();
  }
});

// Dark mode toggle
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  darkToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
});

// Initialize
drawChart();
resetToFrontPage();
console.log("🎌 Hiragana Trainer Ready! Choose settings and click Start!");
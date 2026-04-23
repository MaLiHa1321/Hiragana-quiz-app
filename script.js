// Game State
let questions = [], current = 0, score = 0, locked = false, gameStarted = false;
let timer = null, timeLeft = 0, performanceData = [], correctAnswers = 0, totalAttempts = 0;

// DOM Elements
const hiraganaEl = document.getElementById("hiragana");
const answerEl = document.getElementById("answer");
const feedbackEl = document.getElementById("feedback");
const checkBtn = document.getElementById("checkBtn");
const nextBtn = document.getElementById("nextBtn");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const resultBox = document.getElementById("resultBox");
const finalScore = document.getElementById("finalScore");
const accuracyEl = document.getElementById("accuracy");
const accuracyDisplay = document.getElementById("accuracyDisplay");

// Helper Functions
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateScore() { scoreEl.textContent = score; }
function updateProgress() {
  if (!questions.length) return;
  const progress = Math.round((current / questions.length) * 100);
  progressBar.style.width = progress + "%";
  progressText.textContent = progress + "%";
}

function updateChart() {
  const canvas = document.getElementById('performanceChart');
  if (!canvas || !performanceData.length) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = canvas.width / performanceData.length - 2;
  performanceData.forEach((data, i) => {
    const x = i * (barWidth + 2);
    ctx.fillStyle = data.correct ? '#22c55e' : '#ef4444';
    ctx.fillRect(x, canvas.height - 30, barWidth, data.correct ? 30 : 15);
  });
}

function playSound(type) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = type === 'correct' ? 880 : 440;
    gainNode.gain.value = 0.3;
    oscillator.type = type === 'correct' ? 'sine' : 'sawtooth';
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
    setTimeout(() => oscillator.stop(), 500);
  } catch(e) { console.log('Audio not supported'); }
}

function createParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particleCanvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles = Array.from({ length: 30 }, () => ({
    x: canvas.width / 2, y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
    life: 1, color: `hsl(${Math.random() * 360}, 70%, 60%)`
  }));
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let allDead = true;
    particles.forEach(p => {
      if (p.life > 0) {
        allDead = false;
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 5, 5);
      }
    });
    allDead ? canvas.remove() : requestAnimationFrame(animate);
  }
  animate();
}

function triggerConfetti() {
  canvasConfetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#667eea', '#764ba2'] });
}

// Timer Functions
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

function startTimer() {
  let timeLimit = parseInt(document.getElementById("timeLimit").value) || 60;
  const difficulty = document.getElementById("difficulty").value;
  if (difficulty === 'easy') timeLimit += 30;
  if (difficulty === 'hard') timeLimit = Math.max(20, timeLimit - 20);
  timeLeft = timeLimit;
  timeEl.textContent = timeLeft;
  stopTimer();
  timer = setInterval(() => {
    if (!gameStarted) return;
    if (timeLeft <= 0) { stopTimer(); if (gameStarted && !locked) endGame(); }
    else {
      timeLeft--;
      timeEl.textContent = timeLeft;
      timeEl.style.color = timeLeft <= 10 ? "#ef4444" : "";
    }
  }, 1000);
}

// Game Functions
function loadQuestion() {
  if (!gameStarted || current >= questions.length) { if (current >= questions.length) endGame(); return; }
  hiraganaEl.textContent = questions[current].char;
  answerEl.value = "";
  feedbackEl.textContent = "";
  locked = false;
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  answerEl.disabled = false;
  answerEl.focus();
  updateProgress();
}

function checkAnswer() {
  if (!gameStarted || locked) return;
  const user = answerEl.value.trim().toLowerCase();
  if (!user) { feedbackEl.textContent = "Please enter an answer!"; feedbackEl.style.color = "orange"; return; }
  totalAttempts++;
  const correct = questions[current].romaji;
  const isCorrect = user === correct;
  if (isCorrect) {
    score++; correctAnswers++;
    feedbackEl.textContent = "Correct! ✔ Amazing!";
    feedbackEl.style.color = "#22c55e";
    playSound('correct');
    createParticles();
    hiraganaEl.style.transform = "scale(1.2) rotate(5deg)";
    setTimeout(() => hiraganaEl.style.transform = "", 200);
  } else {
    feedbackEl.textContent = `Wrong! ❌ Correct: ${correct}`;
    feedbackEl.style.color = "#ef4444";
    playSound('wrong');
    hiraganaEl.style.animation = "shake 0.5s ease";
    setTimeout(() => hiraganaEl.style.animation = "", 500);
  }
  accuracyDisplay.textContent = `${Math.round((correctAnswers / totalAttempts) * 100)}%`;
  updateScore();
  locked = true;
  checkBtn.disabled = true;
  nextBtn.disabled = false;
  answerEl.disabled = true;
  performanceData.push({ question: current, correct: isCorrect });
  updateChart();
}

function nextQuestion() {
  if (!gameStarted || nextBtn.disabled) return;
  current++;
  loadQuestion();
}

function endGame() {
  gameStarted = false;
  stopTimer();
  answerEl.disabled = checkBtn.disabled = nextBtn.disabled = true;
  resultBox.classList.remove("hidden");
  finalScore.textContent = `${score} / ${questions.length}`;
  accuracyEl.textContent = `${Math.round((score / questions.length) * 100)}%`;
  triggerConfetti();
}

function startGame() {
  stopTimer();
  if (!window.hiraganaData) { alert("Data not loaded!"); return; }
  const count = parseInt(document.getElementById("questionCount").value);
  questions = shuffle([...hiraganaData]).slice(0, count);
  current = score = correctAnswers = totalAttempts = 0;
  locked = false;
  gameStarted = true;
  performanceData = [];
  resultBox.classList.add("hidden");
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  answerEl.disabled = false;
  updateScore();
  updateProgress();
  startTimer();
  loadQuestion();
}

// Event Listeners
checkBtn.addEventListener("click", checkAnswer);
nextBtn.addEventListener("click", nextQuestion);
answerEl.addEventListener("keydown", (e) => { if (e.key === "Enter" && gameStarted && !locked) checkAnswer(); });
document.getElementById("startBtn")?.addEventListener("click", startGame);
document.getElementById("themeToggle")?.addEventListener("click", () => document.body.classList.toggle("dark"));

// Theme Change
function changeTheme(theme) {
  const gradients = {
    purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    blue: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    green: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    orange: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  };
  document.querySelector('.animated-bg').style.background = gradients[theme];
}
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => changeTheme(btn.dataset.theme));
});
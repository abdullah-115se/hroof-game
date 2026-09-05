// --- 1. إعداد Firebase ---
// ضع كائن firebaseConfig الخاص بك هنا إن لم يكن موجوداً في ملف HTML
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// --- 2. المؤثرات الصوتية ---
const AudioFX = {
  ctx: null,
  init: function() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  buzzer: function() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  },
  tick: function() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  },
  timeOut: function() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  },
  victory: function() {
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.3);
    });
  }
};

// --- 3. متغيرات وحالة اللعبة ---
const letters = [
  'أ', 'ب', 'ت', 'ث', 'ج',
  'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض',
  'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن'
];

let selectedIndex = null;
let timerInterval = null;
let timeLeft = 5;
const gridState = Array(25).fill(null);

const board = document.getElementById('board');
const timerDisplay = document.getElementById('timer');
const questionBox = document.getElementById('questionBox');
const buzzerStatus = document.getElementById('buzzerStatus');

// بناء اللوحة
function createBoard() {
  if (!board) return;
  board.innerHTML = '';
  letters.forEach((letter, index) => {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.innerText = letter;
    cell.onclick = function() { selectCell(index, cell); };
    board.appendChild(cell);
  });
}

function selectCell(index, cellElement) {
  AudioFX.init();
  selectedIndex = index;
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
  cellElement.classList.add('selected');
  if (questionBox) questionBox.innerText = `سؤال الحرف (${letters[index]}): في انتظار السؤال...`;
  resetBuzzer();
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 5;
  if (timerDisplay) timerDisplay.innerText = `الوقت: ${timeLeft} ثواني`;

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timerDisplay) timerDisplay.innerText = `الوقت: ${timeLeft} ثواني`;

    if (timeLeft > 0) {
      AudioFX.tick();
    } else {
      clearInterval(timerInterval);
      if (timerDisplay) timerDisplay.innerText = "انتهى الوقت!";
      AudioFX.timeOut();
    }
  }, 1000);
}

window.resetBuzzer = function() {
  clearInterval(timerInterval);
  if (timerDisplay) timerDisplay.innerText = "الوقت: 5 ثواني";
  if (buzzerStatus) {
    buzzerStatus.innerText = "البازر متاح الآن! بانتظار أسرع لاعب...";
    buzzerStatus.style.background = "#333";
  }
  db.ref('game/buzzer').set({ active: true, winner: null, team: null });
};

window.setCellColor = function(color) {
  if (selectedIndex === null) return;
  const cells = document.querySelectorAll('.cell');
  const target = cells[selectedIndex];
  if (!target) return;

  target.classList.remove('green', 'red');
  if (color === 'green') {
    target.classList.add('green');
    gridState[selectedIndex] = 'green';
  } else if (color === 'red') {
    target.classList.add('red');
    gridState[selectedIndex] = 'red';
  } else {
    gridState[selectedIndex] = null;
  }

  if (checkWin(color)) {
    AudioFX.victory();
    setTimeout(() => {
      alert(`🎉 ألف مبروك! فاز الفريق ${color === 'green' ? 'الأخضر' : 'الأحمر'}!`);
    }, 200);
  }
};

function checkWin(color) {
  if (!color || color === 'neutral') return false;
  const size = 5;
  const visited = Array(25).fill(false);
  const queue = [];

  for (let i = 0; i < size; i++) {
    const startIdx = (color === 'green') ? i * size : i;
    if (gridState[startIdx] === color) {
      queue.push(startIdx);
      visited[startIdx] = true;
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift();
    const r = Math.floor(curr / size);
    const c = curr % size;

    if ((color === 'green' && c === size - 1) || (color === 'red' && r === size - 1)) {
      return true;
    }

    const neighbors = [
      { r: r - 1, c: c }, { r: r + 1, c: c },
      { r: r, c: c - 1 }, { r: r, c: c + 1 }
    ];

    for (const n of neighbors) {
      if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
        const nextIdx = n.r * size + n.c;
        if (!visited[nextIdx] && gridState[nextIdx] === color) {
          visited[nextIdx] = true;
          queue.push(nextIdx);
        }
      }
    }
  }
  return false;
}

// استماع البازر اللحظي
db.ref('game/buzzer').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data && data.winner && buzzerStatus) {
    buzzerStatus.innerText = `🔔 ضغط البازر أولاً: ${data.winner} (الفريق ${data.team === 'green' ? 'الأخضر' : 'الأحمر'})`;
    buzzerStatus.style.background = data.team === 'green' ? '#27ae60' : '#c0392b';
    AudioFX.buzzer();
    startTimer();
  }
});

// تهيئة اللوحة والباركود
window.addEventListener('DOMContentLoaded', () => {
  createBoard();
  document.body.addEventListener('click', () => AudioFX.init(), { once: true });

  const qrContainer = document.getElementById("qrcode");
  if (qrContainer && typeof QRCodeStyling !== 'undefined') {
    qrContainer.innerHTML = '';
    const cleanUrl = window.location.href.split('?')[0].split('#')[0];
    const playerUrl = cleanUrl.includes('index.html') 
      ? cleanUrl.replace('index.html', 'player.html')
      : (cleanUrl.endsWith('/') ? cleanUrl + 'player.html' : cleanUrl + '/player.html');

    const qrCode = new QRCodeStyling({
      width: 140,
      height: 140,
      type: "svg",
      data: playerUrl,
      dotsOptions: { color: "#000", type: "rounded" },
      backgroundOptions: { color: "#fff" }
    });
    qrCode.append(qrContainer);
  }
});
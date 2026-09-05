// بيانات الربط مع Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDoaUuh2g7Ey3xKULKY1cqCsFp0ayV8LYM",
  authDomain: "hroof-game-89a4d.firebaseapp.com",
  databaseURL: "https://hroof-game-89a4d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hroof-game-89a4d",
  storageBucket: "hroof-game-89a4d.firebasestorage.app",
  messagingSenderId: "289753652476",
  appId: "1:289753652476:web:cf0de09e5c657a22c60b79",
  measurementId: "G-8G7SXXV8JS"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const arabicLetters = [
  'أ', 'ب', 'ت', 'ث', 'ج',
  'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض',
  'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن'
];

const questionsBank = {
  'أ': 'عاصمة الأردن؟ (عمان)',
  'ب': 'عاصمة فرنسا؟ (باريس)',
  'ت': 'دولة عربية في شمال إفريقيا؟ (تونس)',
  'ج': 'عاصمة الجزائر؟ (الجزائر)',
  'ح': 'ثاني أكبر مدن سوريا؟ (حلب)',
};

const board = document.getElementById('board');
const questionBox = document.getElementById('questionBox');
const timerDisplay = document.getElementById('timer');
const buzzerStatus = document.getElementById('buzzerStatus');

let activeCell = null;
let timerInterval = null;
let timeLeft = 5;
const gridState = Array(5).fill(null).map(() => Array(5).fill(null));

// رسم الشبكة 5x5
arabicLetters.forEach((letter, index) => {
  const row = Math.floor(index / 5);
  const col = index % 5;

  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.innerText = letter;
  cell.dataset.row = row;
  cell.dataset.col = col;

  cell.addEventListener('click', () => {
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
    cell.classList.add('selected');
    activeCell = cell;

    const q = questionsBank[letter] || `سؤال يبدأ بحرف (${letter})؟`;
    questionBox.innerText = q;

    // فتح البازر وإعادة ضبط السؤال في Firebase
    resetBuzzer();
  });

  board.appendChild(cell);
});

// إدارة المؤقت التنازلي
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 5;
  if (timerDisplay) timerDisplay.innerText = `الوقت: ${timeLeft} ثواني`;

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timerDisplay) timerDisplay.innerText = `الوقت: ${timeLeft} ثواني`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (timerDisplay) timerDisplay.innerText = "انتهى الوقت!";
    }
  }, 1000);
}

// إعادة تفعيل البازر
function resetBuzzer() {
  clearInterval(timerInterval);
  timeLeft = 5;
  if (timerDisplay) timerDisplay.innerText = `الوقت: 5 ثواني`;
  if (buzzerStatus) {
    buzzerStatus.innerText = "البازر متاح الآن! بانتظار أسرع لاعب...";
    buzzerStatus.style.background = "#2c3e50";
  }

  db.ref('game/buzzer').set({
    active: true,
    winner: null,
    team: null
  });
}

// الاستماع للبازر اللحظي من Firebase
db.ref('game/buzzer').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data && data.winner && buzzerStatus) {
    buzzerStatus.innerText = `🔔 ضغط البازر أولاً: ${data.winner} (الفريق ${data.team === 'green' ? 'الأخضر' : 'الأحمر'})`;
    buzzerStatus.style.background = data.team === 'green' ? '#27ae60' : '#c0392b';
    startTimer();
  }
});

// تلوين الخانة وفحص الفوز
function setCellColor(color) {
  if (!activeCell) {
    alert('يرجى اختيار خانة أولاً');
    return;
  }

  clearInterval(timerInterval);
  const r = parseInt(activeCell.dataset.row);
  const c = parseInt(activeCell.dataset.col);
  activeCell.classList.remove('green', 'red');

  if (color === 'green' || color === 'red') {
    activeCell.classList.add(color);
    gridState[r][c] = color;

    if (checkWin(color)) {
      setTimeout(() => {
        alert(`🎉 ألف مبروك! فاز الفريق ${color === 'green' ? 'الأخضر' : 'الأحمر'} بإكمال المسار!`);
      }, 100);
    }
  } else {
    gridState[r][c] = null;
  }
}

// خوارزمية فحص الفوز (BFS)
function checkWin(color) {
  const visited = Array(5).fill(false).map(() => Array(5).fill(false));
  const queue = [];

  if (color === 'green') {
    for (let r = 0; r < 5; r++) {
      if (gridState[r][0] === color) {
        queue.push([r, 0]);
        visited[r][0] = true;
      }
    }
  } else if (color === 'red') {
    for (let c = 0; c < 5; c++) {
      if (gridState[0][c] === color) {
        queue.push([0, c]);
        visited[0][c] = true;
      }
    }
  }

  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  while (queue.length > 0) {
    const [currR, currC] = queue.shift();

    if (color === 'green' && currC === 4) return true;
    if (color === 'red' && currR === 4) return true;

    for (const [dr, dc] of directions) {
      const nr = currR + dr;
      const nc = currC + dc;

      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
        if (!visited[nr][nc] && gridState[nr][nc] === color) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
  }

  return false;
}
// التأكد من توليد الباركود بعد اكتمال تحميل الصفحة والرابط
window.addEventListener('DOMContentLoaded', () => {
  const qrContainer = document.getElementById("qrcode");
  if (!qrContainer) return;

  // تنظيف أي باركود قديم
  qrContainer.innerHTML = '';

  let currentUrl = window.location.href.split('?')[0].split('#')[0];
  let playerUrl = '';

  if (currentUrl.endsWith('index.html')) {
    playerUrl = currentUrl.replace('index.html', 'player.html');
  } else if (currentUrl.endsWith('/')) {
    playerUrl = currentUrl + 'player.html';
  } else {
    playerUrl = currentUrl + '/player.html';
  }

 // في ملف app.js
window.addEventListener('load', () => {
  const qrContainer = document.getElementById("qrcode");
  if (!qrContainer) return;

  // تنظيف الحاوية
  qrContainer.innerHTML = '';

  // تحديد رابط صفحة اللاعب بدقة
  let currentUrl = window.location.href.split('?')[0].split('#')[0];
  let playerUrl = '';

  if (currentUrl.includes('index.html')) {
    playerUrl = currentUrl.replace('index.html', 'player.html');
  } else if (currentUrl.endsWith('/')) {
    playerUrl = currentUrl + 'player.html';
  } else {
    playerUrl = currentUrl + '/player.html';
  }

  // تهيئة وتوليد الـ QR Code بتنسيق عالي الجودة
  const qrCode = new QRCodeStyling({
    width: 150,
    height: 150,
    type: "svg",
    data: playerUrl,
    dotsOptions: {
      color: "#000000",
      type: "rounded"
    },
    backgroundOptions: {
      color: "#ffffff",
    },
    cornersSquareOptions: {
      type: "extra-rounded",
      color: "#000000"
    },
    cornersDotOptions: {
      color: "#000000"
    }
  });

  qrCode.append(qrContainer);
});
});
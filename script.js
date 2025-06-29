let currentAudio = null;
let isMetronomePlaying = false;
let mode = 'normal'; // default

const metronome = new Audio('assets/metronomo.mp3');
metronome.loop = true;

const metronomeStatus = document.getElementById("metronomeStatus");
const modeStatus = document.getElementById("modeStatus");

const normalSounds = {
  'q': new Audio('assets/E_low.mp3'),
  'w': new Audio('assets/A.mp3'),
  'e': new Audio('assets/D.mp3'),
  'r': new Audio('assets/G.mp3'),
  't': new Audio('assets/B.mp3'),
  'y': new Audio('assets/E_high.mp3')
};

const smokeSounds = {
  '1': new Audio('assets/1.mp3'),
  '2': new Audio('assets/2.mp3'),
  '3': new Audio('assets/3.mp3'),
  '4': new Audio('assets/4.mp3')
};

const satisfactionSounds = {
  '1': new Audio('assets/t1.mp3'),
  '2': new Audio('assets/t2.mp3'),
  '3': new Audio('assets/t3.mp3')
};

function getCurrentSounds() {
  if (mode === 'satisfaction') return satisfactionSounds;
  if (mode === 'smoke') return smokeSounds;
  if (mode === 'normal') return normalSounds;
  return {};
}

function flashString(key) {
 const map = {
  'q': 'string-e',       '1': 'string-e',
  'w': 'string-a',       '2': 'string-a',
  'e': 'string-d',       '3': 'string-d',
  'r': 'string-g',       '4': 'string-g',
  't': 'string-b',
  'y': 'string-e-high'
};
    
  const id = map[key];
  if (!id) return;

  const el = document.getElementById(id);
  if (!el) return;

  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 120);
}

function playSound(key) {
  const sounds = getCurrentSounds();
  const sound = sounds[key.toLowerCase()];
  if (!sound) return;

  if (currentAudio && currentAudio !== sound) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  currentAudio = sound;
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio.play();
  highlightKey(key.toLowerCase());

  flashString(key.toLowerCase());
}

function stopSound() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
}

function toggleMetronome() {
  if (isMetronomePlaying) {
    metronome.pause();
    metronome.currentTime = 0;
    document.getElementById("metronomeStatus").innerHTML = "Spento";
  } else {
    metronome.currentTime = 0;
    metronome.play();
    document.getElementById("metronomeStatus").innerHTML = "Attivo";
  }
  isMetronomePlaying = !isMetronomePlaying;
}

function switchMode(newMode) {
  mode = newMode;
  const labels = {
    'normal': 'Corde Vuote',
    'smoke': 'Smoke on the Water',
    'satisfaction': 'Satisfaction'
  };
  modeStatus.innerHTML = `Modalità: <strong>${labels[newMode]}</strong>`;
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (["1", "2", "3", "4", "q", "w", "e", "r", "t", "y"].includes(key)) {
    if (mode === 'satisfaction' && key === '4') return;
    playSound(key);
  } else if (e.code === "Space") {
    e.preventDefault();
    toggleMetronome();
  } else if (key === "d") {
    switchMode('smoke');
  } else if (key === "s") {
    switchMode('satisfaction');
  } else if (key === "n") {
    switchMode('normal');
  } else if (key === "0") {
    stopSound();
  }
});

document.querySelectorAll("button").forEach(button => {
  button.addEventListener("click", () => {
    const key = button.dataset.key;
    if (mode === 'satisfaction' && key === '4') return;
    playSound(key);
  });
});

let observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) {
      stopSound();
    }
  });
});
function highlightKey(key) {
  document.querySelectorAll('.keys span').forEach(el => {
    if (el.textContent.toLowerCase() === key) {
      el.classList.add('active-key');
      setTimeout(() => el.classList.remove('active-key'), 200);
    }
  });
}


observer.observe(document.querySelector('.app-wrapper'));

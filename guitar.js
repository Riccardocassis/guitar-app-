// Variabili globali
let currentMode = 'corde-vuote';
let currentSong = null;
let metronomeActive = false;
let metronomeInterval = null;
let metronomeSource = null; // Source del metronomo per controllarlo
let activeSources = []; // Array per tracciare i suoni attivi
let lastKeyTime = {}; // Prevenire spam dei tasti

// Audio context e suoni
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadSounds();
    setupEventListeners();
});

function initializeApp() {
    // Ottieni la modalità e canzone dai parametri URL
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'corde-vuote';
    const song = urlParams.get('song');
    
    setMode(mode);
    
    // Se c'è una canzone preselezionata, impostala
    if (song && mode === 'canzoni') {
        selectSong(song);
    }
}

function setMode(mode) {
    currentMode = mode;
    
    // Aggiorna l'indicatore della modalità
    const modeIndicator = document.getElementById('currentMode');
    
    if (mode === 'corde-vuote') {
        modeIndicator.textContent = 'Modalità: Corde Vuote';
        document.getElementById('chord-keys').style.display = 'block';
        document.getElementById('song-keys').style.display = 'none';
        document.getElementById('song-selection').style.display = 'none';
        
        updateInstructions([
            '<div class="instruction-item"><kbd>Q W E R T Y</kbd><span>Suona le corde</span></div>'
        ]);
    } else if (mode === 'canzoni') {
        modeIndicator.textContent = 'Modalità: Canzoni';
        document.getElementById('chord-keys').style.display = 'none';
        document.getElementById('song-keys').style.display = 'block';
        
        updateInstructions([
            '<div class="instruction-item"><kbd>1 2 3 4</kbd><span>Note della canzone</span></div>'
        ]);
    }
}

function updateInstructions(instructions) {
    const container = document.getElementById('mode-instructions');
    container.innerHTML = instructions.join('');
}

async function loadSounds() {
    const soundFiles = {
        'E_low': 'assets/E_low.mp3',
        'A': 'assets/A.mp3',
        'D': 'assets/D.mp3',
        'G': 'assets/G.mp3',
        'B': 'assets/B.mp3',
        'E_high': 'assets/E_high.mp3',
        '1': 'assets/1.mp3',
        '2': 'assets/2.mp3',
        '3': 'assets/3.mp3',
        '4': 'assets/4.mp3',
        't1': 'assets/t1.mp3',
        't2': 'assets/t2.mp3',
        't3': 'assets/t3.mp3',
        'metronome': 'assets/metronomo.mp3'
    };

    for (const [key, file] of Object.entries(soundFiles)) {
        try {
            const response = await fetch(file);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            sounds[key] = audioBuffer;
        } catch (error) {
            console.error(`Errore nel caricamento del suono ${key}:`, error);
        }
    }
}

function playSound(soundKey) {
    if (!sounds[soundKey]) return;
    
    // Debounce per prevenire spam (50ms minimo tra suoni dello stesso tipo)
    const now = Date.now();
    if (lastKeyTime[soundKey] && (now - lastKeyTime[soundKey] < 50)) {
        return;
    }
    lastKeyTime[soundKey] = now;
    
    const source = audioContext.createBufferSource();
    source.buffer = sounds[soundKey];
    source.connect(audioContext.destination);
    source.start();
    
    // Aggiungi alla lista dei suoni attivi
    activeSources.push(source);
    
    // Rimuovi dalla lista quando il suono finisce
    source.onended = () => {
        const index = activeSources.indexOf(source);
        if (index > -1) {
            activeSources.splice(index, 1);
        }
    };
    
    return source;
}

function setupEventListeners() {
    // Event listeners per i tasti della tastiera
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyRelease);
    
    // Event listeners per i bottoni cliccabili
    document.querySelectorAll('.key-button').forEach(button => {
        button.addEventListener('mousedown', function() {
            const key = this.dataset.key;
            const stringId = this.dataset.string;
            
            if (key && stringId) {
                handleStringPress(key, stringId, this);
            } else if (key) {
                handleSongKeyPress(key, this);
            }
        });
        
        button.addEventListener('mouseup', function() {
            this.classList.remove('active');
        });
        
        button.addEventListener('mouseleave', function() {
            this.classList.remove('active');
        });
    });
}

function handleKeyPress(event) {
    const key = event.key.toLowerCase();
    
    // Previeni ripetizione se il tasto è già premuto
    if (event.repeat) return;
    
    // Tasti speciali
    if (key === ' ') {
        event.preventDefault();
        toggleMetronome();
        return;
    }
    
    if (key === '0') {
        event.preventDefault();
        stopAllSounds();
        return;
    }
    
    if (key === 'escape') {
        goBack();
        return;
    }
    
    // Tasti principali
    if (currentMode === 'corde-vuote') {
        handleChordKeyPress(key);
    } else if (currentMode === 'canzoni') {
        handleSongKeyPress(key);
    }
}

function handleKeyRelease(event) {
    const key = event.key.toLowerCase();
    
    // Rimuovi highlighting dai tasti
    document.querySelectorAll('.key-button').forEach(button => {
        if (button.dataset.key === key) {
            button.classList.remove('active');
        }
    });
    
    // Spegni le corde illuminate
    if (currentMode === 'corde-vuote') {
        document.querySelectorAll('.string-glow').forEach(string => {
            string.classList.remove('active');
        });
    }
}

function handleChordKeyPress(key) {
    const keyMap = {
        'q': { sound: 'E_low', string: 'string-e' },
        'w': { sound: 'A', string: 'string-a' },
        'e': { sound: 'D', string: 'string-d' },
        'r': { sound: 'G', string: 'string-g' },
        't': { sound: 'B', string: 'string-b' },
        'y': { sound: 'E_high', string: 'string-e-high' }
    };
    
    if (keyMap[key]) {
        playSound(keyMap[key].sound);
        
        // Illumina la corda
        const stringElement = document.getElementById(keyMap[key].string);
        if (stringElement) {
            stringElement.classList.add('active');
        }
        
        // Evidenzia il tasto
        document.querySelectorAll('.key-button').forEach(button => {
            if (button.dataset.key === key) {
                button.classList.add('active');
            }
        });
    }
}

function handleSongKeyPress(key, buttonElement = null) {
    // Usa direttamente i numeri come chiavi per i suoni
    const validKeys = ['1', '2', '3', '4'];
    
    if (validKeys.includes(key)) {
        playSound(key); // Suona direttamente usando il numero come chiave
        
        // Evidenzia il tasto se fornito
        if (buttonElement) {
            buttonElement.classList.add('active');
        } else {
            // Trova il bottone corrispondente
            document.querySelectorAll('.key-button').forEach(button => {
                if (button.dataset.key === key) {
                    button.classList.add('active');
                }
            });
        }
        
        // Illumina le corde in base alla modalità canzone selezionata
        if (currentSong) {
            illuminateStringsForSong(key, currentSong);
        }
    }
}

function handleStringPress(key, stringId, buttonElement) {
    if (currentMode === 'corde-vuote') {
        handleChordKeyPress(key);
    }
}

function illuminateStringsForSong(key, song) {
    // Mapping delle note alle corde per le canzoni
    const songMappings = {
        'deep-purple': {
            '1': ['string-d'],      // Re (3a corda)
            '2': ['string-b'],      // Si (2a corda)  
            '3': ['string-g'],      // Sol (4a corda)
            '4': ['string-e-high']  // Mi acuto (1a corda)
        },
        'satisfaction': {
            '1': ['string-a'],      // La (5a corda)
            '2': ['string-d'],      // Re (4a corda)
            '3': ['string-g'],      // Sol (3a corda)
            '4': ['string-b']       // Si (2a corda)
        }
    };
    
    if (songMappings[song] && songMappings[song][key]) {
        // Spegni tutte le corde
        document.querySelectorAll('.string-glow').forEach(string => {
            string.classList.remove('active');
        });
        
        // Illumina le corde appropriate
        songMappings[song][key].forEach(stringId => {
            const stringElement = document.getElementById(stringId);
            if (stringElement) {
                stringElement.classList.add('active');
            }
        });
    }
}

function selectSong(songId) {
    currentSong = songId;
    
    // Aggiorna l'interfaccia
    document.querySelectorAll('.song-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const selectedBtn = document.querySelector(`[data-song="${songId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
    
    // Aggiorna l'indicatore della modalità
    const songNames = {
        'deep-purple': 'Smoke on the Water',
        'satisfaction': 'Satisfaction'
    };
    
    document.getElementById('currentMode').textContent = 
        `Modalità: ${songNames[songId] || 'Canzoni'}`;
}

function toggleMetronome() {
    metronomeActive = !metronomeActive;
    
    const statusElement = document.getElementById('metronomeStatus');
    const indicatorElement = document.getElementById('metronomeIndicator');
    
    if (metronomeActive) {
        statusElement.textContent = 'Acceso';
        indicatorElement.classList.add('active');
        startMetronome();
    } else {
        statusElement.textContent = 'Spento';
        indicatorElement.classList.remove('active');
        stopMetronome();
    }
}

function startMetronome() {
    // Ferma il metronomo precedente se attivo
    if (metronomeInterval) {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
    }
    
    // Ferma il source del metronomo precedente
    if (metronomeSource) {
        try {
            metronomeSource.stop();
        } catch (e) {
            // Ignora errori se già terminato
        }
        metronomeSource = null;
    }
    
    const indicatorElement = document.getElementById('metronomeIndicator');
    
    const playMetronomeTick = () => {
        if (sounds['metronome'] && metronomeActive) {
            // Ferma il tick precedente se ancora suona
            if (metronomeSource) {
                try {
                    metronomeSource.stop();
                } catch (e) {}
            }
            
            // Crea nuovo source per il metronomo
            metronomeSource = audioContext.createBufferSource();
            metronomeSource.buffer = sounds['metronome'];
            metronomeSource.connect(audioContext.destination);
            metronomeSource.start();
            
            // Clean up quando finisce
            metronomeSource.onended = () => {
                metronomeSource = null;
            };
            
            // Anima l'indicatore
            indicatorElement.classList.remove('active');
            setTimeout(() => {
                if (metronomeActive) {
                    indicatorElement.classList.add('active');
                }
            }, 10);
        }
    };
    
    // Primo tick immediato
    playMetronomeTick();
    
    // Tick ogni 500ms (120 BPM)
    metronomeInterval = setInterval(playMetronomeTick, 500);
}

function stopMetronome() {
    if (metronomeInterval) {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
    }
    
    // Ferma il source del metronome se attivo
    if (metronomeSource) {
        try {
            metronomeSource.stop();
        } catch (e) {
            // Ignora errori se già terminato
        }
        metronomeSource = null;
    }
    
    // Rimuovi l'animazione dall'indicatore
    const indicatorElement = document.getElementById('metronomeIndicator');
    if (indicatorElement) {
        indicatorElement.classList.remove('active');
    }
}

function stopAllSounds() {
    // Ferma tutti i suoni attivi
    activeSources.forEach(source => {
        try {
            source.stop();
        } catch (e) {
            // Ignora errori se il suono è già finito
        }
    });
    activeSources = [];
    
    // Ferma anche il metronomo se attivo
    if (metronomeSource) {
        try {
            metronomeSource.stop();
        } catch (e) {
            // Ignora errori se già terminato
        }
        metronomeSource = null;
    }
    
    // Spegni tutte le corde illuminate
    document.querySelectorAll('.string-glow').forEach(string => {
        string.classList.remove('active');
    });
    
    // Rimuovi highlighting dai tasti
    document.querySelectorAll('.key-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Ferma il metronomo se attivo
    if (metronomeActive) {
        toggleMetronome();
    }
}

function goBack() {
    window.location.href = 'index.html';
}

// Gestione dell'audio context (necessario per i browser moderni)
document.addEventListener('click', function() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

// Prevenzione del comportamento di default per alcuni tasti
document.addEventListener('keydown', function(event) {
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
    }
});

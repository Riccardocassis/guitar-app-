// Variabili globali
let currentMode = 'corde-vuote';
let currentSong = null;
let metronomeActive = false;
let metronomeInterval = null;
let metronomeSource = null; // Source del metronomo per controllarlo
let metronomeSourceList = []; // Lista di tutti i source del metronomo per pulizia sicura
let activeSources = []; // Array per tracciare i suoni attivi
let lastKeyTime = {}; // Prevenire spam dei tasti
let audioContextInitialized = false;
let currentSongSource = null; // Source attuale per le canzoni (una nota alla volta)
let activeSongSources = []; // Array per tracciare tutti i source delle canzoni attivi

// Audio context e suoni
let audioContext;
const sounds = {};

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM caricato, inizializzazione app...');
    initializeApp();
    setupEventListeners();
    initializeAudioContext();
});

function initializeAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio context creato:', audioContext.state);
        loadSounds();
    } catch (error) {
        console.error('Errore nella creazione dell\'audio context:', error);
    }
}

function initializeApp() {
    console.log('Inizializzazione app...');
    // Ottieni la modalità e canzone dai parametri URL
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'corde-vuote';
    const song = urlParams.get('song');
    
    console.log('Modalità:', mode, 'Canzone:', song);
    
    setMode(mode);
    
    // Se c'è una canzone preselezionata, impostala
    if (song && mode === 'canzoni') {
        selectSong(song);
        console.log('Canzone selezionata:', song);
    } else if (mode === 'canzoni' && !song) {
        // Se siamo in modalità canzoni senza canzone specifica, imposta una di default
        console.log('Modalità canzoni senza canzone specificata, imposto default');
        // Potresti voler impostare una canzone di default qui
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
        document.getElementById('song-tabs').style.display = 'none';
        
        updateInstructions([
            '<div class="instruction-item"><kbd>Q W E R T Y</kbd><span>Suona le corde</span></div>'
        ]);
    } else if (mode === 'canzoni') {
        modeIndicator.textContent = 'Modalità: Canzoni';
        document.getElementById('chord-keys').style.display = 'none';
        document.getElementById('song-keys').style.display = 'block';
        document.getElementById('song-tabs').style.display = 'block';
        
        // Assicurati che il tasto 4 sia visibile di default in modalità canzoni
        const key4Button = document.getElementById('key-4-button');
        if (key4Button) {
            key4Button.style.display = 'flex';
        }
        
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
    console.log('Caricamento suoni...');
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
            console.log(`Caricamento ${key} da ${file}...`);
            const response = await fetch(file);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            sounds[key] = audioBuffer;
            console.log(`✓ ${key} caricato con successo`);
        } catch (error) {
            console.error(`❌ Errore nel caricamento del suono ${key}:`, error);
        }
    }
    console.log('Suoni caricati:', Object.keys(sounds));
}

function playSound(soundKey) {
    console.log('Tentativo di riproduzione suono:', soundKey);
    
    if (!audioContext) {
        console.error('Audio context non inizializzato');
        return;
    }
    
    if (audioContext.state === 'suspended') {
        console.log('Audio context sospeso, tentativo di riattivazione...');
        audioContext.resume();
    }
    
    if (!sounds[soundKey]) {
        console.error('Suono non trovato:', soundKey);
        return;
    }
    
    // Rimuovo il debounce per permettere la ripetizione immediata dello stesso suono
    // Il controllo delle sovrapposizioni viene gestito a livello superiore
    /*
    const now = Date.now();
    if (lastKeyTime[soundKey] && (now - lastKeyTime[soundKey] < 50)) {
        return;
    }
    lastKeyTime[soundKey] = now;
    */
    
    try {
        const source = audioContext.createBufferSource();
        source.buffer = sounds[soundKey];
        source.connect(audioContext.destination);
        source.start();
        
        console.log(`✓ Suono riprodotto: ${soundKey}`);
        
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
    } catch (error) {
        console.error('Errore nella riproduzione del suono:', error);
    }
}

function playSongSound(soundKey) {
    console.log('Tentativo di riproduzione suono canzone:', soundKey);
    
    if (!audioContext) {
        console.error('Audio context non inizializzato');
        return;
    }
    
    if (audioContext.state === 'suspended') {
        console.log('Audio context sospeso, tentativo di riattivazione...');
        audioContext.resume();
    }
    
    if (!sounds[soundKey]) {
        console.error('Suono canzone non trovato:', soundKey);
        return;
    }
    
    try {
        const source = audioContext.createBufferSource();
        source.buffer = sounds[soundKey];
        source.connect(audioContext.destination);
        
        // La nota suona una volta sola, senza loop
        source.start();
        
        console.log(`✓ Suono canzone riprodotto: ${soundKey}`);
        
        // Aggiungi alla lista dei source delle canzoni per tracking
        activeSongSources.push(source);
        
        // Gestisci la fine del suono
        source.onended = () => {
            const index = activeSongSources.indexOf(source);
            if (index > -1) {
                activeSongSources.splice(index, 1);
            }
            if (currentSongSource === source) {
                currentSongSource = null;
            }
            console.log(`Suono ${soundKey} terminato naturalmente`);
        };
        
        return source;
    } catch (error) {
        console.error('Errore nella riproduzione del suono canzone:', error);
    }
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
    
    // Event listeners per le tablature cliccabili
    document.addEventListener('click', function(event) {
        if (event.target.closest('.clickable-tab')) {
            const tabElement = event.target.closest('.clickable-tab');
            const sequence = tabElement.dataset.sequence;
            if (sequence) {
                playTabSequence(sequence, tabElement);
            }
        }
    });
}

// Funzione per riprodurre una sequenza di tablature
function playTabSequence(sequence, tabElement) {
    if (!currentSong) return;
    
    // Rimuovi highlight da tutte le tabs
    document.querySelectorAll('.tab-line').forEach(tab => {
        tab.classList.remove('playing');
    });
    
    // Evidenzia la tab corrente
    tabElement.classList.add('playing');
    
    const notes = sequence.split(',');
    let currentNoteIndex = 0;
    
    // Ferma tutte le note precedenti
    activeSongSources.forEach(source => {
        try {
            source.stop();
        } catch (e) {}
    });
    activeSongSources = [];
    currentSongSource = null;
    
    // Spegni tutte le corde
    document.querySelectorAll('.string-glow').forEach(string => {
        string.classList.remove('active');
    });
    
    function playNextNote() {
        if (currentNoteIndex >= notes.length) {
            // Sequenza completata, rimuovi highlight
            setTimeout(() => {
                tabElement.classList.remove('playing');
            }, 1000);
            return;
        }
        
        const note = notes[currentNoteIndex].trim();
        console.log(`Suonando nota ${note} della sequenza`);
        
        // Simula la pressione del tasto
        handleSongKeyPress(note);
        
        currentNoteIndex++;
        
        // Programma la prossima nota (500ms di intervallo)
        setTimeout(playNextNote, 500);
    }
    
    // Inizia la sequenza
    playNextNote();
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
    
    // Rimuovi highlighting dai tasti (solo per evidenziazione temporanea)
    document.querySelectorAll('.key-button').forEach(button => {
        if (button.dataset.key === key) {
            button.classList.remove('active');
        }
    });
    
    // Non gestiamo più lo spegnimento delle corde al rilascio dei tasti
    // Sia per le corde vuote che per le canzoni, le corde si spengono quando il suono finisce
}

function handleChordKeyPress(key) {
    console.log('Tasto premuto:', key);
    const keyMap = {
        'q': { sound: 'E_low', string: 'string-e' },
        'w': { sound: 'A', string: 'string-a' },
        'e': { sound: 'D', string: 'string-d' },
        'r': { sound: 'G', string: 'string-g' },
        't': { sound: 'B', string: 'string-b' },
        'y': { sound: 'E_high', string: 'string-e-high' }
    };
    
    if (keyMap[key]) {
        console.log('Mapping trovato per tasto:', key, keyMap[key]);
        
        // FERMA tutti i suoni precedenti per evitare sovrapposizioni
        activeSources.forEach(source => {
            try {
                // Rimuovi il callback onended prima di fermare per evitare interferenze
                source.onended = null;
                source.stop();
                console.log('Suono corda precedente fermato per nuova corda');
            } catch (e) {
                // Ignora errori se già terminato
            }
        });
        activeSources = [];
        
        // Spegni tutte le corde prima della nuova
        document.querySelectorAll('.string-glow').forEach(string => {
            string.classList.remove('active');
        });
        
        // Rimuovi evidenziazione da tutti i tasti prima del nuovo
        document.querySelectorAll('.key-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Suona la nuova corda
        const newSource = playSound(keyMap[key].sound);
        
        // Illumina SEMPRE la corda corrispondente quando viene premuto il tasto
        const stringElement = document.getElementById(keyMap[key].string);
        if (stringElement) {
            // Illumina immediatamente la corda
            stringElement.classList.add('active');
            console.log('Corda illuminata:', keyMap[key].string);
            
            // Sincronizza l'illuminazione con la durata del suono
            if (newSource) {
                newSource.onended = () => {
                    stringElement.classList.remove('active');
                    console.log('Corda spenta alla fine del suono:', keyMap[key].string);
                    
                    // Rimuovi dalla lista dei source attivi
                    const index = activeSources.indexOf(newSource);
                    if (index > -1) {
                        activeSources.splice(index, 1);
                    }
                };
            } else {
                // Fallback: se non c'è un source audio, spegni la corda dopo un tempo ragionevole
                setTimeout(() => {
                    stringElement.classList.remove('active');
                    console.log('Corda spenta dopo timeout fallback:', keyMap[key].string);
                }, 3000);
            }
        } else {
            console.error('Elemento corda non trovato:', keyMap[key].string);
        }
        
        // Evidenzia il tasto temporaneamente
        document.querySelectorAll('.key-button').forEach(button => {
            if (button.dataset.key === key) {
                button.classList.add('active');
                console.log('Tasto evidenziato:', key);
                // Rimuovi l'evidenziazione dopo un breve tempo
                setTimeout(() => {
                    button.classList.remove('active');
                }, 200);
            }
        });
    } else {
        console.log('Nessun mapping trovato per tasto:', key);
    }
}

function handleSongKeyPress(key, buttonElement = null) {
    console.log('Tasto canzone premuto:', key, 'Canzone attuale:', currentSong);
    
    // Tasti validi dipendono dalla canzone
    let validKeys = ['1', '2', '3', '4'];
    if (currentSong === 'satisfaction') {
        validKeys = ['1', '2', '3']; // Solo 3 tasti per Satisfaction
    }
    
    if (validKeys.includes(key)) {
        // FERMA tutte le note precedenti per evitare sovrapposizioni
        activeSongSources.forEach(source => {
            try {
                // Rimuovi il callback onended prima di fermare per evitare interferenze
                source.onended = null;
                source.stop();
                console.log('Nota precedente fermata per nuova nota');
            } catch (e) {
                // Ignora errori se già terminato
            }
        });
        activeSongSources = [];
        currentSongSource = null;
        
        // Spegni tutte le corde prima della nuova nota
        document.querySelectorAll('.string-glow').forEach(string => {
            string.classList.remove('active');
        });
        
        // Rimuovi evidenziazione da tutti i tasti delle canzoni prima di evidenziare il nuovo
        document.querySelectorAll('#song-keys .key-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Mappa i tasti ai suoni specifici per ogni canzone
        let soundKey = null;
        
        if (currentSong === 'deep-purple') {
            // Smoke on the Water - usa i file numerici corretti
            const deepPurpleMap = {
                '1': '1',   // Prima nota del riff (1.mp3)
                '2': '2',   // Seconda nota del riff (2.mp3)
                '3': '3',   // Terza nota del riff (3.mp3)
                '4': '4'    // Quarta nota del riff (4.mp3)
            };
            soundKey = deepPurpleMap[key];
        } else if (currentSong === 'satisfaction') {
            // Satisfaction - usa i file specifici t1, t2, t3
            const satisfactionMap = {
                '1': 't1',  // Prima nota del riff (t1.mp3)
                '2': 't2',  // Seconda nota del riff (t2.mp3)
                '3': 't3'   // Terza nota del riff (t3.mp3)
                // Tasto 4 rimosso per questa canzone
            };
            soundKey = satisfactionMap[key];
        } else {
            // Default: usa i file numerici
            soundKey = key;
        }
        
        if (soundKey) {
            console.log(`Riproduzione suono: ${soundKey} per tasto ${key} nella canzone ${currentSong}`);
            // Suona la nuova nota
            currentSongSource = playSongSound(soundKey);
            
            // Illumina le corde sincronizzate con il suono
            illuminateStringsForSong(key, currentSong, currentSongSource);
        }
        
        // Evidenzia SOLO il tasto corrente temporaneamente
        if (buttonElement) {
            buttonElement.classList.add('active');
            // Rimuovi l'evidenziazione dopo un breve tempo
            setTimeout(() => {
                buttonElement.classList.remove('active');
            }, 200);
        } else {
            // Trova il bottone corrispondente e evidenzialo temporaneamente
            document.querySelectorAll('#song-keys .key-button').forEach(button => {
                if (button.dataset.key === key) {
                    button.classList.add('active');
                    setTimeout(() => {
                        button.classList.remove('active');
                    }, 200);
                }
            });
        }
    }
}

function handleStringPress(key, stringId, buttonElement) {
    if (currentMode === 'corde-vuote') {
        handleChordKeyPress(key);
    }
}

function illuminateStringsForSong(key, song, soundSource = null) {
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
            '3': ['string-g']       // Sol (3a corda)
            // Tasto 4 rimosso per questa canzone
        }
    };
    
    if (songMappings[song] && songMappings[song][key]) {
        // Illumina le corde appropriate per la nota corrente
        songMappings[song][key].forEach(stringId => {
            const stringElement = document.getElementById(stringId);
            if (stringElement) {
                // Illumina immediatamente la corda
                stringElement.classList.add('active');
                console.log('Corda illuminata per canzone:', stringId);
                
                // Se abbiamo il source del suono, sincronizziamo l'illuminazione con la sua durata
                if (soundSource) {
                    soundSource.onended = () => {
                        stringElement.classList.remove('active');
                        console.log('Corda spenta alla fine del suono:', stringId);
                        
                        // Rimuovi anche dalla lista dei source attivi
                        const index = activeSongSources.indexOf(soundSource);
                        if (index > -1) {
                            activeSongSources.splice(index, 1);
                        }
                        if (currentSongSource === soundSource) {
                            currentSongSource = null;
                        }
                    };
                } else {
                    // Fallback: spegni dopo un tempo fisso se non abbiamo il source
                    setTimeout(() => {
                        stringElement.classList.remove('active');
                        console.log('Corda spenta dopo timeout:', stringId);
                    }, 3000);
                }
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
    
    // Gestisci la visibilità del tasto 4 e delle tablature in base alla canzone
    const key4Button = document.getElementById('key-4-button');
    const albumImage = document.getElementById('album-image');
    const satisfactionTabs = document.getElementById('satisfaction-tabs');
    const deepPurpleTabs = document.getElementById('deep-purple-tabs');
    
    if (songId === 'satisfaction') {
        // Satisfaction: nascondi tasto 4, mostra tabs satisfaction
        if (key4Button) key4Button.style.display = 'none';
        if (albumImage) albumImage.src = 'assets/satisfaction.png';
        if (satisfactionTabs) satisfactionTabs.style.display = 'flex';
        if (deepPurpleTabs) deepPurpleTabs.style.display = 'none';
    } else if (songId === 'deep-purple') {
        // Smoke on the Water: mostra tasto 4, mostra tabs deep purple
        if (key4Button) key4Button.style.display = 'flex';
        if (albumImage) albumImage.src = 'assets/deep-purple.png';
        if (satisfactionTabs) satisfactionTabs.style.display = 'none';
        if (deepPurpleTabs) deepPurpleTabs.style.display = 'flex';
    } else {
        // Default: mostra tasto 4
        if (key4Button) key4Button.style.display = 'flex';
        if (satisfactionTabs) satisfactionTabs.style.display = 'none';
        if (deepPurpleTabs) deepPurpleTabs.style.display = 'none';
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
    console.log('Toggle metronomo, stato attuale:', metronomeActive);
    
    // Previeni chiamate multiple rapide
    if (window.metronomeToggling) {
        console.log('Toggle metronomo già in corso, ignorato');
        return;
    }
    window.metronomeToggling = true;
    
    metronomeActive = !metronomeActive;
    
    const statusElement = document.getElementById('metronomeStatus');
    const indicatorElement = document.getElementById('metronomeIndicator');
    
    if (metronomeActive) {
        console.log('Avvio metronomo...');
        statusElement.textContent = 'Acceso';
        indicatorElement.classList.add('active');
        startMetronome();
    } else {
        console.log('Arresto metronomo...');
        statusElement.textContent = 'Spento';
        indicatorElement.classList.remove('active');
        stopMetronome();
    }
    
    // Rilascia il lock dopo un breve delay
    setTimeout(() => {
        window.metronomeToggling = false;
    }, 100);
}

function startMetronome() {
    // PULIZIA COMPLETA: Ferma TUTTO quello che riguarda il metronomo
    if (metronomeInterval) {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
    }
    
    // Ferma e pulisci TUTTI i source del metronomo precedenti
    metronomeSourceList.forEach(source => {
        try {
            source.stop();
        } catch (e) {
            // Ignora errori se già terminato
        }
    });
    metronomeSourceList = [];
    metronomeSource = null;
    
    const indicatorElement = document.getElementById('metronomeIndicator');
    
    const playMetronomeTick = () => {
        // Controllo di sicurezza: se il metronomo è stato disattivato, non suonare
        if (!metronomeActive || !sounds['metronome']) {
            return;
        }
        
        // FERMA il source precedente prima di crearne uno nuovo
        if (metronomeSource) {
            try {
                metronomeSource.stop();
            } catch (e) {
                // Ignora errori se già terminato
            }
            // Rimuovi dalla lista
            const index = metronomeSourceList.indexOf(metronomeSource);
            if (index > -1) {
                metronomeSourceList.splice(index, 1);
            }
            metronomeSource = null;
        }
        
        try {
            // Crea nuovo source per il metronomo
            const newSource = audioContext.createBufferSource();
            newSource.buffer = sounds['metronome'];
            newSource.connect(audioContext.destination);
            
            // Imposta come source corrente
            metronomeSource = newSource;
            metronomeSourceList.push(newSource);
            
            // Clean up automatico quando finisce NATURALMENTE
            newSource.onended = () => {
                const index = metronomeSourceList.indexOf(newSource);
                if (index > -1) {
                    metronomeSourceList.splice(index, 1);
                }
                if (metronomeSource === newSource) {
                    metronomeSource = null;
                }
            };
            
            newSource.start();
            console.log('Tick metronomo riprodotto');
            
            // Anima l'indicatore solo se il metronomo è ancora attivo
            if (metronomeActive && indicatorElement) {
                indicatorElement.classList.remove('active');
                // Usa requestAnimationFrame per animazione più fluida
                requestAnimationFrame(() => {
                    if (metronomeActive && indicatorElement) {
                        indicatorElement.classList.add('active');
                    }
                });
            }
        } catch (error) {
            console.error('Errore nella riproduzione del metronomo:', error);
        }
    };
    
    // Primo tick immediato
    playMetronomeTick();
    
    // Tick ogni 500ms (120 BPM) - SOLO se il metronomo è ancora attivo
    metronomeInterval = setInterval(() => {
        if (metronomeActive) {
            playMetronomeTick();
        } else {
            // Sicurezza: se per qualche motivo il metronomo non è più attivo, ferma l'interval
            clearInterval(metronomeInterval);
            metronomeInterval = null;
        }
    }, 500);
}

function stopMetronome() {
    console.log('Fermando metronomo...');
    
    // Ferma l'interval IMMEDIATAMENTE
    if (metronomeInterval) {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
        console.log('Interval metronomo fermato');
    }
    
    // Ferma e pulisci TUTTI i source del metronomo
    metronomeSourceList.forEach((source, index) => {
        try {
            source.stop();
            console.log(`Source metronomo ${index} fermato`);
        } catch (e) {
            // Ignora errori se già terminato
        }
    });
    metronomeSourceList = [];
    metronomeSource = null;
    
    // Rimuovi l'animazione dall'indicatore
    const indicatorElement = document.getElementById('metronomeIndicator');
    if (indicatorElement) {
        indicatorElement.classList.remove('active');
    }
    
    console.log('Metronomo completamente fermato');
}

function stopAllSounds() {
    // Ferma tutti i suoni attivi (corde vuote)
    activeSources.forEach(source => {
        try {
            source.stop();
        } catch (e) {
            // Ignora errori se il suono è già finito
        }
    });
    activeSources = [];
    
    // Ferma tutti i suoni delle canzoni
    activeSongSources.forEach(source => {
        try {
            source.stop();
        } catch (e) {
            // Ignora errori se già terminato
        }
    });
    activeSongSources = [];
    currentSongSource = null;
    
    // Ferma TUTTI i source del metronomo
    metronomeSourceList.forEach(source => {
        try {
            source.stop();
        } catch (e) {
            // Ignora errori se già terminato
        }
    });
    metronomeSourceList = [];
    metronomeSource = null;
    
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
    console.log('Click rilevato, stato audio context:', audioContext?.state);
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('Audio context riattivato');
        });
    }
});

// Gestione iniziale dell'audio context
document.addEventListener('click', function initAudio() {
    if (!audioContextInitialized) {
        console.log('Primo click - inizializzazione audio context');
        audioContextInitialized = true;
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        // Rimuovi questo listener dopo il primo click
        document.removeEventListener('click', initAudio);
    }
}, { once: true });

// Prevenzione del comportamento di default per alcuni tasti
document.addEventListener('keydown', function(event) {
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
    }
});

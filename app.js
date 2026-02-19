/* ===== Blind Twister — App Logic ===== */

(function () {
  'use strict';

  // ── i18n ──
  const translations = {
    ru: {
      title: 'Слепой Твистер',
      subtitle: 'Голосовое управление игрой',
      rowsTitle: '🎨 Названия рядов',
      rowsHint: 'Задайте 4 ряда для игрового поля',
      row1: 'Ряд 1',
      row2: 'Ряд 2',
      row3: 'Ряд 3',
      row4: 'Ряд 4',
      playersTitle: '👥 Игроки',
      playersHint: 'Добавьте от 2 игроков',
      playerName: 'Имя игрока',
      startGame: 'Начать игру',
      backBtn: '← Настройка',
      playerLabel: 'Игрок',
      statusDefault: 'Нажмите «Дальше» или скажите «дальше»',
      nextBtn: 'Дальше',
      pressNext: 'Нажмите «Дальше»',
      listening: 'Слушаю… Скажите «дальше»',
      micBlocked: 'Доступ к микрофону заблокирован',
      voiceUnsupported: 'Голосовое управление не поддерживается. Используйте Google Chrome.',
      voiceNeedsHttps: 'Голосовое управление требует HTTPS.',
      serviceNotAllowed: 'Ошибка доступа. Попробуйте перезагрузить или открыть в Safari.',
      errorPrefix: 'Ошибка',
      deleteLabel: 'Удалить',
      limbs: ['Левая рука', 'Правая рука', 'Левая нога', 'Правая нога'],
      voiceCommands: ['дальше', 'далее', 'следующий'],
      speechLang: 'ru-RU',
      langToggleLabel: 'EN',
    },
    en: {
      title: 'Blind Twister',
      subtitle: 'Voice-controlled game',
      rowsTitle: '🎨 Row Names',
      rowsHint: 'Set 4 rows for the playing field',
      row1: 'Row 1',
      row2: 'Row 2',
      row3: 'Row 3',
      row4: 'Row 4',
      playersTitle: '👥 Players',
      playersHint: 'Add at least 2 players',
      playerName: 'Player name',
      startGame: 'Start Game',
      backBtn: '← Setup',
      playerLabel: 'Player',
      statusDefault: 'Press "Next" or say "next"',
      nextBtn: 'Next',
      pressNext: 'Press "Next"',
      listening: 'Listening… Say "next"',
      micBlocked: 'Microphone access blocked',
      voiceUnsupported: 'Voice control not supported. Please use Google Chrome.',
      voiceNeedsHttps: 'Voice control requires HTTPS.',
      serviceNotAllowed: 'Speech service error. Try reloading or open in Safari.',
      errorPrefix: 'Error',
      deleteLabel: 'Delete',
      limbs: ['Left hand', 'Right hand', 'Left foot', 'Right foot'],
      voiceCommands: ['next', 'go', 'forward'],
      speechLang: 'en-US',
      langToggleLabel: 'RU',
    },
  };

  let currentLang = localStorage.getItem('bt-lang') || 'ru';

  function t(key) {
    return translations[currentLang][key] || key;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (translations[currentLang][key]) {
        el.textContent = translations[currentLang][key];
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[currentLang][key]) {
        el.placeholder = translations[currentLang][key];
      }
    });
    document.documentElement.lang = currentLang;
  }

  function switchLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    localStorage.setItem('bt-lang', currentLang);
    langToggle.textContent = t('langToggleLabel');
    applyTranslations();
    // Re-init recognition with new language
    if (recognition) {
      const wasListening = isListening;
      stopListening();
      recognition = null;
      if (wasListening) startListening();
    }
  }

  // ── State ──
  const state = {
    rows: [],
    players: [],
    currentPlayerIndex: 0,
  };

  // ── DOM ──
  const $ = (sel) => document.querySelector(sel);
  const setupScreen = $('#setup-screen');
  const gameScreen = $('#game-screen');
  const rowInputs = [0, 1, 2, 3].map((i) => $(`#row-${i}`));
  const playersList = $('#players-list');
  const newPlayerInput = $('#new-player-input');
  const addPlayerBtn = $('#add-player-btn');
  const startBtn = $('#start-btn');
  const backBtn = $('#back-btn');
  const playerNameEl = $('#player-name');
  const commandCard = $('#command-card');
  const commandLimb = $('#command-limb');
  const commandRow = $('#command-row');
  const micBtn = $('#mic-btn');
  const nextBtn = $('#next-btn');
  const statusText = $('#status-text');
  const statusIcon = $('#status-icon');
  const langToggle = $('#lang-toggle');

  // ── Init language ──
  langToggle.textContent = t('langToggleLabel');
  applyTranslations();
  langToggle.addEventListener('click', switchLang);

  // ── Players ──
  function renderPlayers() {
    playersList.innerHTML = '';
    state.players.forEach((name, i) => {
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      chip.innerHTML = `
        <span class="player-index">${i + 1}</span>
        <span class="player-chip-name">${escapeHtml(name)}</span>
        <button class="remove-btn" data-index="${i}" aria-label="${t('deleteLabel')} ${escapeHtml(name)}">✕</button>
      `;
      playersList.appendChild(chip);
    });
    validateSetup();
  }

  function addPlayer() {
    const name = newPlayerInput.value.trim();
    if (!name) return;
    state.players.push(name);
    newPlayerInput.value = '';
    renderPlayers();
    newPlayerInput.focus();
  }

  function removePlayer(index) {
    state.players.splice(index, 1);
    renderPlayers();
  }

  playersList.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-btn');
    if (btn) removePlayer(Number(btn.dataset.index));
  });

  addPlayerBtn.addEventListener('click', addPlayer);
  newPlayerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPlayer();
  });

  // ── Validation ──
  function validateSetup() {
    const rowsFilled = rowInputs.every((inp) => inp.value.trim().length > 0);
    const enoughPlayers = state.players.length >= 2;
    startBtn.disabled = !(rowsFilled && enoughPlayers);
  }

  rowInputs.forEach((inp) => inp.addEventListener('input', validateSetup));

  // ── Start Game ──
  startBtn.addEventListener('click', () => {
    state.rows = rowInputs.map((inp) => inp.value.trim());
    state.currentPlayerIndex = 0;
    showScreen(gameScreen);
    showInitialCommand();
  });

  backBtn.addEventListener('click', () => {
    stopListening();
    showScreen(setupScreen);
  });

  function showScreen(screen) {
    setupScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    screen.classList.add('active');
  }

  // ── Game Logic ──
  function showInitialCommand() {
    playerNameEl.textContent = state.players[state.currentPlayerIndex];
    commandLimb.textContent = '—';
    commandRow.textContent = t('pressNext');
    playerNameEl.classList.remove('highlight');
  }

  function nextCommand() {
    const player = state.players[state.currentPlayerIndex];
    const limbs = t('limbs');
    const limb = limbs[Math.floor(Math.random() * limbs.length)];
    const row = state.rows[Math.floor(Math.random() * state.rows.length)];

    // Update UI
    playerNameEl.textContent = player;
    playerNameEl.classList.add('highlight');
    setTimeout(() => playerNameEl.classList.remove('highlight'), 600);

    commandLimb.textContent = limb;
    commandRow.textContent = row;
    commandCard.classList.remove('pop');
    // Force reflow for re-triggering animation
    void commandCard.offsetWidth;
    commandCard.classList.add('pop');

    // Speak aloud
    speak(`${player}. ${limb}, ${row}`);

    // Advance to next player
    state.currentPlayerIndex =
      (state.currentPlayerIndex + 1) % state.players.length;
  }

  nextBtn.addEventListener('click', nextCommand);

  // ── Speech Synthesis ──
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = t('speechLang');
    utter.rate = 0.95;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  }

  // ── Speech Recognition ──
  // Lazy getter — the API may become available only on secure contexts
  function getSpeechRecognition() {
    console.log('Checking SpeechRecognition support...');
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    console.log('SpeechRecognition API:', API ? 'Available' : 'Missing', 'isSecureContext:', window.isSecureContext);
    return API || null;
  }

  let recognition = null;
  let isListening = false;

  function initRecognition() {
    const SR = getSpeechRecognition();
    if (!SR) return null;
    const rec = new SR();
    rec.lang = t('speechLang');
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    rec.onresult = (event) => {
      const commands = t('voiceCommands');
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          for (let j = 0; j < event.results[i].length; j++) {
            const transcript = event.results[i][j].transcript.toLowerCase().trim();
            if (commands.some((cmd) => transcript.includes(cmd))) {
              nextCommand();
              return;
            }
          }
        }
      }
    };

    rec.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setStatus('⚠️', t('micBlocked'));
        stopListening();
      } else if (event.error === 'service-not-allowed') {
        setStatus('⚠️', t('serviceNotAllowed'));
        stopListening();
      } else if (event.error === 'no-speech') {
        // Ignore, will restart
      } else {
        setStatus('⚠️', `${t('errorPrefix')}: ${event.error}`);
      }
    };

    rec.onend = () => {
      // Auto-restart if still in listening mode
      if (isListening) {
        try {
          // Re-start only if no error occurred that stopped it
          if (recognition) recognition.start();
        } catch (e) {
          // already started or stopped
        }
      }
    };

    return rec;
  }

  function startListening() {
    const SR = getSpeechRecognition();
    if (!SR) {
      const isSecure = window.isSecureContext;
      setStatus('⚠️', isSecure ? t('voiceUnsupported') : t('voiceNeedsHttps'));
      return;
    }

    // Always recreate instance for stability on iOS
    if (recognition) {
      try { recognition.abort(); } catch (e) { }
    }
    recognition = initRecognition();

    try {
      recognition.start();
      isListening = true;
      micBtn.classList.add('listening');
      setStatus('🎤', t('listening'));
    } catch (e) {
      // already started
    }
  }

  function stopListening() {
    isListening = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    micBtn.classList.remove('listening');
    setStatus('🎤', t('statusDefault'));
  }

  micBtn.addEventListener('click', () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  function setStatus(icon, text) {
    statusIcon.textContent = icon;
    statusText.textContent = text;
  }

  // ── Helpers ──
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Service Worker Registration ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.warn('SW registration failed:', err));
    });
  }
})();

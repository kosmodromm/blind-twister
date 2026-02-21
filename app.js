/* ===== Blind Twister — App Logic ===== */

(function () {
  'use strict';

  // ── i18n ──
  const translations = {
    ru: {
      title: 'Слепой Твистер',
      subtitle: 'Голосовое управление игрой',
      rowsTitle: 'Названия рядов',
      rowsHint: 'Задайте 4 ряда для игрового поля',
      row1: 'Ряд 1',
      row2: 'Ряд 2',
      row3: 'Ряд 3',
      row4: 'Ряд 4',
      playersTitle: 'Игроки',
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
      serviceNotAllowed: 'Ошибка доступа. Проверьте: Настройки → Основные → Клавиатура → Вкл. диктовку. Или откройте в Safari.',
      errorPrefix: 'Ошибка',
      deleteLabel: 'Удалить',
      limbs: ['Левая рука', 'Правая рука', 'Левая нога', 'Правая нога'],
      voiceCommands: ['дальше', 'далее', 'следующий'],
      speechLang: 'ru-RU',
      langToggleLabel: 'EN',
      defPlayer1: 'Игрок 1',
      defPlayer2: 'Игрок 2',
      defRow1: 'Красный',
      defRow2: 'Желтый',
      defRow3: 'Синий',
      defRow4: 'Зеленый',
    },
    en: {
      title: 'Blind Twister',
      subtitle: 'Voice-controlled game',
      rowsTitle: 'Row Names',
      rowsHint: 'Set 4 rows for the playing field',
      row1: 'Row 1',
      row2: 'Row 2',
      row3: 'Row 3',
      row4: 'Row 4',
      playersTitle: 'Players',
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
      serviceNotAllowed: 'Service error. Check: iOS Settings → General → Keyboard → Enable Dictation. Or try Safari.',
      errorPrefix: 'Error',
      deleteLabel: 'Delete',
      limbs: ['Left hand', 'Right hand', 'Left foot', 'Right foot'],
      voiceCommands: ['next', 'go', 'forward'],
      speechLang: 'en-US',
      langToggleLabel: 'RU',
      defPlayer1: 'Player 1',
      defPlayer2: 'Player 2',
      defRow1: 'Red',
      defRow2: 'Yellow',
      defRow3: 'Blue',
      defRow4: 'Green',
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
    const prevLang = currentLang;
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    localStorage.setItem('bt-lang', currentLang);
    langToggle.textContent = t('langToggleLabel');
    applyTranslations();

    // Update default values if they haven't been changed by the user
    updateDefaultsOnLangChange(prevLang);

    // Re-init recognition with new language
    if (recognition) {
      const wasListening = isListening;
      stopListening();
      recognition = null;
      if (wasListening) startListening();
    }
  }

  function updateDefaultsOnLangChange(prevLang) {
    const translationsPrev = translations[prevLang];

    // Update default players
    if (state.players.length === 2 &&
      state.players[0] === translationsPrev['defPlayer1'] &&
      state.players[1] === translationsPrev['defPlayer2']) {
      state.players[0] = t('defPlayer1');
      state.players[1] = t('defPlayer2');
      renderPlayers();
    }

    // Update default rows
    const defaultRowsPrev = [
      translationsPrev['defRow1'],
      translationsPrev['defRow2'],
      translationsPrev['defRow3'],
      translationsPrev['defRow4']
    ];

    rowInputs.forEach((inp, index) => {
      if (inp.value === defaultRowsPrev[index]) {
        inp.value = t(`defRow${index + 1}`);
      }
    });

    validateSetup();
  }

  // ── State ──
  const state = {
    rows: [],
    players: [],
    currentPlayerIndex: 0,
    lastMove: null
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
  const historyContainer = $('#history-container');

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

  // ── Init Defaults ──
  if (state.players.length === 0) {
    state.players = [t('defPlayer1'), t('defPlayer2')];
    renderPlayers();
  }
  if (!rowInputs[0].value) rowInputs[0].value = t('defRow1');
  if (!rowInputs[1].value) rowInputs[1].value = t('defRow2');
  if (!rowInputs[2].value) rowInputs[2].value = t('defRow3');
  if (!rowInputs[3].value) rowInputs[3].value = t('defRow4');
  validateSetup();

  // ── Start Game ──
  startBtn.addEventListener('click', () => {
    state.rows = rowInputs.map((inp) => inp.value.trim());
    state.currentPlayerIndex = 0;
    state.lastMove = null;
    historyContainer.innerHTML = '';
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
    if (state.lastMove) {
      // Add to history
      const histItem = document.createElement('div');
      histItem.className = 'history-item';

      const histPlayer = document.createElement('span');
      histPlayer.className = 'history-player';
      histPlayer.textContent = state.lastMove.player;

      const histMove = document.createElement('span');
      histMove.className = 'history-move';
      histMove.textContent = `${state.lastMove.limb} — ${state.lastMove.row}`;

      histItem.appendChild(histPlayer);
      histItem.appendChild(histMove);
      historyContainer.prepend(histItem);

      // Keep only 3 latest items
      while (historyContainer.children.length > 3) {
        historyContainer.removeChild(historyContainer.lastChild);
      }
    }

    const player = state.players[state.currentPlayerIndex];
    const limbs = t('limbs');
    const limb = limbs[Math.floor(Math.random() * limbs.length)];
    const row = state.rows[Math.floor(Math.random() * state.rows.length)];

    state.lastMove = { player, limb, row };

    // Update UI
    playerNameEl.textContent = player;
    playerNameEl.classList.add('highlight');
    setTimeout(() => playerNameEl.classList.remove('highlight'), 600);

    commandCard.classList.remove('animate-slide');
    commandCard.classList.add('glitch-text');

    setTimeout(() => {
      commandCard.classList.remove('glitch-text');

      commandLimb.textContent = limb;
      commandRow.textContent = row;

      void commandCard.offsetWidth;
      commandCard.classList.add('animate-slide');

      // Speak aloud
      speak(`${player}. ${limb}, ${row}`);
    }, 180);

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
  let isInitializingMic = false; // Prevents overlapping initialization when prompting for permissions

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
        setStatus('///', t('micBlocked'));
        stopListening();
      } else if (event.error === 'service-not-allowed') {
        setStatus('///', t('serviceNotAllowed'));
        stopListening();
      } else if (event.error === 'no-speech') {
        // Ignore, will restart
      } else {
        setStatus('///', `${t('errorPrefix')}: ${event.error}`);
        stopListening();
      }
    };

    rec.onend = () => {
      // Auto-restart if still in listening mode
      if (isListening) {
        setTimeout(() => {
          if (isListening) {
            try {
              // Re-start only if no error occurred that stopped it
              if (recognition) recognition.start();
            } catch (e) {
              // already started or stopped
            }
          }
        }, 300); // 300ms delay to prevent CPU lock-up from infinite onend loops
      }
    };

    return rec;
  }

  async function startListening() {
    if (isInitializingMic || isListening) return;
    isInitializingMic = true;

    const SR = getSpeechRecognition();
    if (!SR) {
      const isSecure = window.isSecureContext;
      setStatus('///', isSecure ? t('voiceUnsupported') : t('voiceNeedsHttps'));
      isInitializingMic = false;
      return;
    }

    // Explicitly ask for microphone permissions first to fix iOS PWA silent failures
    // Do this only on iOS, as other platforms (Chrome/Android) handle permissions natively well
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const needExplicitAudio = isIOS && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

    if (needExplicitAudio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately, we just needed to trigger the permission prompt
        stream.getTracks().forEach((t) => t.stop());

        // Delay to allow iOS to release the microphone hardware before SpeechRecognition claims it.
        // This prevents the UI lockup/freeze often seen on the first permission-granting run.
        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (err) {
        console.warn('getUserMedia error:', err);
        setStatus('///', t('micBlocked'));
        isInitializingMic = false;
        return;
      }
    }

    // Check if the user opted to stop listening while they were taking their time on the permissions prompt
    if (!isInitializingMic) return;

    // Always recreate instance for stability on iOS
    if (recognition) {
      try { recognition.abort(); } catch (e) { }
    }
    recognition = initRecognition();

    try {
      recognition.start();
      isListening = true;
      micBtn.classList.add('listening');
      setStatus('REC', t('listening'));
    } catch (e) {
      console.warn('Recognition start error:', e);
    }

    isInitializingMic = false;
  }

  function stopListening() {
    isListening = false;
    isInitializingMic = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    micBtn.classList.remove('listening');
    setStatus('---', t('statusDefault'));
  }

  micBtn.addEventListener('click', () => {
    if (isListening || isInitializingMic) {
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

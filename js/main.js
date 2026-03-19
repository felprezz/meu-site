/* ========== Main — Ponto de Entrada ========== */

import { uid, inferCategoryFromText, mapPortugueseGender, STORAGE_KEY } from './utils.js';
import { DEFAULT_CATEGORIES } from './data.js';
import { state, saveState, initState } from './state.js';
import { pickRound, initDeckForCategory } from './game.js';
import {
  showScreen, goBack, renderAll, renderResult,
  renderChallenges, openPlayerModal, openChallengeModal,
  updateCurrentCategoryPill, historyStack
} from './ui.js';

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Inicializar estado ---------- */
  initState();

  /* ---------- Referências DOM ---------- */
  const btnPlayHome = document.getElementById('btnPlay');
  const btnPlayFromPlayers = document.getElementById('btnPlayFromPlayers');
  const btnBack = document.getElementById('btnBack');
  const btnNextLevel = document.getElementById('btnNextLevel');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countNumber = document.getElementById('countNumber');
  const resultArea = document.getElementById('resultArea');
  const btnAgain = document.getElementById('btnAgain');
  const hiddenCsvInput = document.getElementById('hiddenCsvInput');
  const hiddenJsonInput = document.getElementById('hiddenJsonInput');

  // Elementos do Timer
  const cfgTimerActive = document.getElementById('cfgTimerActive');
  const cfgTimerMin = document.getElementById('cfgTimerMin');
  const cfgTimerSec = document.getElementById('cfgTimerSec');
  const playTimerContainer = document.getElementById('playTimerContainer');
  const playTimerDisplay = document.getElementById('playTimerDisplay');
  let currentCountdownInterval = null;

  const ANIM_MS = 500;

  /* ---------- Countdown ---------- */
  function setCountdownActive(on) {
    if (on) document.documentElement.classList.add('countdown-active');
    else document.documentElement.classList.remove('countdown-active');
  }

  async function startCountdownThenPlay() {
    const active = state.players.filter(p => p.active).length;
    if (active < 2) {
      alert('É necessário pelo menos 2 jogadores ativos para jogar. Adicione jogadores agora.');
      showScreen('players');
      renderAll();
      openPlayerModal();
      return;
    }

    setCountdownActive(true);
    countdownOverlay.style.display = 'flex';
    countdownOverlay.style.pointerEvents = 'auto';
    for (let n = 3; n >= 1; n--) {
      countNumber.textContent = n;
      countNumber.classList.remove('pulse');
      void countNumber.offsetWidth;
      countNumber.classList.add('pulse');
      await new Promise(res => setTimeout(res, 1000));
    }
    countdownOverlay.style.display = 'none';
    countdownOverlay.style.pointerEvents = 'none';
    setCountdownActive(false);
    enterPlayScreenAutoDraw();
  }

  /* ---------- Entrar na tela de jogo com sorteio automático ---------- */
  function enterPlayScreenAutoDraw() {
    const active = state.players.filter(p => p.active).length;
    if (active < 2) {
      alert('É necessário pelo menos 2 jogadores ativos para jogar. Adicione jogadores agora.');
      showScreen('players');
      renderAll();
      openPlayerModal();
      return;
    }
    state.currentCategoryIndex = 0;
    saveState();
    const cat = state.categories[state.currentCategoryIndex];
    initDeckForCategory(cat);
    updateCurrentCategoryPill();
    showScreen('play');
    resultArea.classList.add('hidden');
    setTimeout(() => {
      const r = pickRound();
      if (!r) { 
        alert('Restrição: Não foi possível encontrar um desafio compatível com o gênero/orientação dos jogadores ativos nesta categoria.\n\nAdicione novos jogadores com orientações diferentes ou adicione desafios sem restrição de gênero.'); 
        goBack();
        return; 
      }
      renderResult(r);
      startTimerForChallenge();
      resultArea.classList.remove('hidden');
    }, 40);
  }

  /* ---------- Lógica do Cronômetro de Jogo ---------- */

  function startTimerForChallenge() {
    // Para qqr timer anterior
    if (currentCountdownInterval) {
      clearInterval(currentCountdownInterval);
      currentCountdownInterval = null;
    }

    if (!state.timerEnabled) {
      playTimerContainer.style.display = 'none';
      return;
    }

    playTimerContainer.style.display = 'block';
    
    // Total em segundos
    let totalSecs = (Number(state.timerMinutes) || 0) * 60 + (Number(state.timerSeconds) || 0);
    
    function format(s) {
      const m = Math.floor(s / 60);
      const rest = s % 60;
      return String(m).padStart(2, '0') + ':' + String(rest).padStart(2, '0');
    }

    playTimerDisplay.textContent = format(totalSecs);

    currentCountdownInterval = setInterval(() => {
      if (totalSecs <= 0) {
        clearInterval(currentCountdownInterval);
        currentCountdownInterval = null;
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
          }
        } catch(e) { console.warn('Erro ao tocar áudio', e); }
        return;
      }
      totalSecs--;
      playTimerDisplay.textContent = format(totalSecs);
    }, 1000);
  }

  /* ---------- Event Listeners ---------- */

  // Navegação
  btnBack.addEventListener('click', () => {
    if (currentCountdownInterval) {
      clearInterval(currentCountdownInterval);
      currentCountdownInterval = null;
    }
    goBack();
  });
  
  btnPlayHome.addEventListener('click', () => startCountdownThenPlay());
  if (btnPlayFromPlayers) btnPlayFromPlayers.addEventListener('click', () => startCountdownThenPlay());
  document.getElementById('btnConfig').addEventListener('click', () => { showScreen('config'); renderAll(); });

  // Próximo nível
  btnNextLevel.addEventListener('click', () => {
    if (state.currentCategoryIndex >= state.categories.length - 1) {
      showScreen('home');
      return;
    }
    state.currentCategoryIndex = state.currentCategoryIndex + 1;
    const cat = state.categories[state.currentCategoryIndex];
    initDeckForCategory(cat);
    updateCurrentCategoryPill();
    if (state.currentCategoryIndex >= state.categories.length - 1) {
      btnNextLevel.textContent = 'Finalizar';
    } else {
      btnNextLevel.textContent = 'Próximo nível';
    }
    resultArea.classList.add('hidden');
    setTimeout(() => {
      const r = pickRound();
      if (!r) { 
        alert('Restrição: Não foi possível encontrar um desafio compatível com o gênero/orientação dos jogadores ativos na próxima categoria.');
        goBack();
        return; 
      }
      renderResult(r);
      startTimerForChallenge();
      resultArea.classList.remove('hidden');
    }, 40);
  });

  // Próximo desafio (dentro da mesma categoria)
  btnAgain.addEventListener('click', async () => {
    resultArea.classList.add('hidden');
    await new Promise(res => setTimeout(res, ANIM_MS));
    const r = pickRound();
    if (!r) {
      alert('Sem combinação válida na categoria atual');
      resultArea.classList.remove('hidden');
      return;
    }
    renderResult(r);
    startTimerForChallenge();
    resultArea.classList.remove('hidden');
  });

  // Config: Menus
  document.getElementById('cfg_players').addEventListener('click', () => showScreen('players'));
  document.getElementById('cfg_challenges').addEventListener('click', () => showScreen('challenges'));
  document.getElementById('cfg_timer').addEventListener('click', () => showScreen('timerSettings'));
  document.getElementById('addPlayerBtn').addEventListener('click', () => openPlayerModal());
  document.getElementById('addChallengeBtn').addEventListener('click', () => openChallengeModal());

  // Config: Cronômetro Bindings
  cfgTimerActive.checked = state.timerEnabled;
  cfgTimerMin.value = state.timerMinutes;
  cfgTimerSec.value = state.timerSeconds;

  function updateTimerSettings() {
    state.timerEnabled = cfgTimerActive.checked;
    state.timerMinutes = parseInt(cfgTimerMin.value) || 0;
    state.timerSeconds = parseInt(cfgTimerSec.value) || 0;
    saveState();
  }

  cfgTimerActive.addEventListener('change', updateTimerSettings);
  cfgTimerMin.addEventListener('input', updateTimerSettings);
  cfgTimerSec.addEventListener('input', updateTimerSettings);

  // Config: Exportar JSON
  document.getElementById('cfg_export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desafios_export.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Config: Importar JSON
  document.getElementById('cfg_import').addEventListener('click', () => hiddenJsonInput.click());
  hiddenJsonInput.addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const obj = JSON.parse(e.target.result);
        if (!obj || !Array.isArray(obj.players) || !Array.isArray(obj.challenges)) {
          alert('JSON inválido: deve conter arrays "players" e "challenges".');
          hiddenJsonInput.value = '';
          return;
        }
        if (!confirm('Importar o JSON irá SUBSTITUIR o estado atual. Deseja continuar?')) {
          hiddenJsonInput.value = '';
          return;
        }
        state.players = obj.players.map(p => Object.assign({
          id: p.id || uid('p'), name: p.name || 'Jogador',
          gender: p.gender || 'M', orientation: p.orientation || 'hetero',
          active: (typeof p.active !== 'undefined' ? p.active : true)
        }, p));
        state.challenges = obj.challenges.map(c => Object.assign({
          id: c.id || uid('c'), text: c.text || c.desafio || 'Desafio',
          category: c.category || DEFAULT_CATEGORIES[1],
          actorGender: c.actorGender || 'any', targetGender: c.targetGender || 'any',
          allowSelf: !!c.allowSelf, weight: (typeof c.weight !== 'undefined' ? c.weight : 2)
        }, c));
        state.categories = Array.isArray(obj.categories) && obj.categories.length
          ? obj.categories : DEFAULT_CATEGORIES.slice();
        state.nextActorIndex = 0;
        state.currentCategoryIndex = 0;
        state.categoryDecks = {};
        saveState(); renderAll(); alert('Importação concluída.');
      } catch (err) {
        console.error(err);
        alert('Erro lendo o arquivo JSON.');
      } finally {
        hiddenJsonInput.value = '';
      }
    };
    reader.readAsText(f);
  });

  // Config: Importar CSV de desafios
  document.getElementById('importChallengesBtn').addEventListener('click', () => hiddenCsvInput.click());
  hiddenCsvInput.addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith('.csv')) {
      alert('Selecione um arquivo .csv');
      hiddenCsvInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const txt = e.target.result;
        const parsed = parseCsvToChallenges(txt);
        if (!parsed || !parsed.length) {
          alert('CSV não contém desafios válidos');
          hiddenCsvInput.value = '';
          return;
        }
        if (!confirm('Importar o CSV irá SUBSTITUIR todos os desafios atuais. Deseja continuar?')) {
          hiddenCsvInput.value = '';
          return;
        }
        state.challenges = parsed.map(c => Object.assign({ id: uid('c'), weight: (typeof c.weight !== 'undefined' ? c.weight : 2) }, c));
        state.nextActorIndex = 0;
        state.categoryDecks = {};
        saveState(); renderChallenges(); alert('Importação de desafios concluída.');
      } catch (err) {
        console.error(err);
        alert('Erro lendo o arquivo CSV.');
      } finally {
        hiddenCsvInput.value = '';
      }
    };
    reader.readAsText(f, 'UTF-8');
  });

  // Config: Reset
  document.getElementById('cfg_reset').addEventListener('click', () => {
    if (!confirm('Resetar as configurações irá restaurar categorias e desafios originais e remover jogadores. Deseja continuar?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state.players = [];
    state.categories = DEFAULT_CATEGORIES.slice();
    state.challenges = [];
    state.nextActorIndex = 0;
    state.currentCategoryIndex = 0;
    state.categoryDecks = {};
    state.timerEnabled = false;
    state.timerMinutes = 1;
    state.timerSeconds = 0;
    
    // Re-inicializa com builtins garantindo state limpo
    saveState();
    location.reload(); // Recarrega a página para garantir que JS/fontes resetem limpos
  });

  // Config: Adicionar categoria
  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const name = prompt('Nome da nova categoria:');
    if (name && name.trim()) {
      state.categories.push(name.trim());
      state.categoryDecks = {};
      saveState();
      renderAll();
    }
  });

  /* ---------- CSV Parser ---------- */
  function parseCsvToChallenges(text) {
    const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l.length);
    if (!lines.length) return [];
    const header = lines[0];
    const sep = header.includes(';') && (header.split(';').length > header.split(',').length) ? ';' : ',';
    const cols = header.split(sep).map(c => c.trim());
    const idxCategoria = cols.findIndex(c => /categoria/i.test(c));
    const idxDesafio = cols.findIndex(c => /desafio/i.test(c));
    const idxQuem = cols.findIndex(c => /quem/i.test(c));
    const idxEmQuem = cols.findIndex(c => /em quem/i.test(c) || /emquem/i.test(c) || /em\s*quem/i.test(c));
    const idxWeight = cols.findIndex(c => /peso/i.test(c) || /weight/i.test(c));
    if (idxDesafio === -1) return [];
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(sep).map(cell => cell.trim());
      const text = row[idxDesafio] || row[1] || '';
      if (!text) continue;
      const category = (idxCategoria !== -1 ? (row[idxCategoria] || DEFAULT_CATEGORIES[1]) : DEFAULT_CATEGORIES[1]);
      const who = (idxQuem !== -1 ? (row[idxQuem] || 'Ambos') : (row[2] || 'Ambos'));
      const emquem = (idxEmQuem !== -1 ? (row[idxEmQuem] || 'Ambos') : (row[3] || 'Ambos'));
      const weightRaw = (idxWeight !== -1 ? (row[idxWeight] || '') : '');
      const actorGender = mapPortugueseGender(who);
      const targetGender = mapPortugueseGender(emquem);
      const weight = weightRaw ? Number(weightRaw) : 2;
      out.push({ text, category, actorGender, targetGender, allowSelf: false, weight });
    }
    return out;
  }

  /* ---------- Render inicial ---------- */
  renderAll();

}); // DOMContentLoaded

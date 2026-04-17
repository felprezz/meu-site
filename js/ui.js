/* ========== UI: Renderização, Modais, Navegação ========== */

import { escapeHtml, uid, insertAtCursor, unifyArticlesForPlayerPlaceholders, TOY_OPTIONS } from './utils.js';
import { DEFAULT_CATEGORIES } from './data.js';
import { state, saveState } from './state.js';

/* ---------- Referências DOM ---------- */
const screens = {
  home: document.getElementById('screenHome'),
  play: document.getElementById('screenPlay'),
  config: document.getElementById('screenConfig'),
  players: document.getElementById('screenPlayers'),
  challenges: document.getElementById('screenChallenges'),
  categories: document.getElementById('screenCategories'),
  timerSettings: document.getElementById('screenTimerSettings') // New timer screen
};

const btnBack = document.getElementById('btnBack');
const nextLevelBar = document.getElementById('nextLevelBar');
const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');
const playersList = document.getElementById('playersList');
const challengesList = document.getElementById('challengesList');
const categoriesList = document.getElementById('categoriesList');
const currentCategoryPill = document.getElementById('currentCategoryPill');
const resultCard = document.getElementById('resultCard');
const resultActor = document.getElementById('resultActor');
const resultChallenge = document.getElementById('resultChallenge');

/* ---------- Mapeamento de cores por categoria ----------
   Fria (leve) → Quente (pesado):
   Aquecimento → Amarelo
   Preliminares → Lavender
   Masturbação → Purple
   Oral → Coral
   Submissão → Laranja-vermelho
   Pesado → Vermelho
*/
const CATEGORY_COLORS = {
  aquecimento:  { color: '#E8E07B', text: '#111114', dim: 'rgba(232, 224, 123, 0.12)', glow: 'rgba(232, 224, 123, 0.15)' },
  preliminares: { color: '#C9B8E8', text: '#111114', dim: 'rgba(201, 184, 232, 0.12)', glow: 'rgba(201, 184, 232, 0.15)' },
  masturbacao:  { color: '#B8A0D8', text: '#111114', dim: 'rgba(184, 160, 216, 0.14)', glow: 'rgba(184, 160, 216, 0.15)' },
  oral:         { color: '#E8825C', text: '#111114', dim: 'rgba(232, 130, 92, 0.12)',  glow: 'rgba(232, 130, 92, 0.15)' },
  submissao:    { color: '#E06040', text: '#ffffff', dim: 'rgba(224, 96, 64, 0.12)',   glow: 'rgba(224, 96, 64, 0.15)' },
  pesado:       { color: '#E04040', text: '#ffffff', dim: 'rgba(224, 64, 64, 0.12)',   glow: 'rgba(224, 64, 64, 0.15)' },
};

/** Normaliza nome de categoria para key de lookup */
function normalizeCategoryKey(cat) {
  if (!cat) return 'preliminares';
  const n = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('aquecimento')) return 'aquecimento';
  if (n.includes('preliminar')) return 'preliminares';
  if (n.includes('masturba')) return 'masturbacao';
  if (n.includes('oral')) return 'oral';
  if (n.includes('submiss')) return 'submissao';
  if (n.includes('pesado')) return 'pesado';
  return 'preliminares';
}

/** Retorna classe CSS para badge de categoria */
function categoryClass(cat) {
  return 'cat-' + normalizeCategoryKey(cat);
}

/** Retorna as cores de uma categoria */
function getCategoryColors(cat) {
  const key = normalizeCategoryKey(cat);
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.preliminares;
}

/** Retorna label legível para gênero */
function genderLabel(g) {
  if (g === 'M') return '♂';
  if (g === 'F') return '♀';
  return '⚤';
}

/* ---------- Navegação ---------- */
export let historyStack = ['home'];

export function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');

  // Botão voltar: visível em todas exceto home
  if (name === 'home') {
    btnBack.classList.remove('visible');
  } else {
    btnBack.classList.add('visible');
  }

  // Mostra "Próximo nível" apenas na tela de jogo
  nextLevelBar.style.display = name === 'play' ? 'flex' : 'none';

  historyStack.push(name);
}

export function goBack() {
  const current = historyStack[historyStack.length - 1];
  if (current === 'play') {
    historyStack = ['home'];
    showScreen('home');
    return;
  }
  historyStack.pop();
  const prev = historyStack.pop() || 'home';
  showScreen(prev);
}

/* ---------- Modal base ---------- */
export function openModalInner(contentHtml) {
  overlay.style.display = 'block';
  modal.style.display = 'block';
  modal.innerHTML = `<div class="modal-content">${contentHtml}</div>`;
}

export function closeModal() {
  overlay.style.display = 'none';
  modal.style.display = 'none';
  modal.innerHTML = '';
}

overlay.addEventListener('click', closeModal);

/* ---------- Pill da categoria atual (com cores!) ---------- */
export function updateCurrentCategoryPill() {
  const cat = state.categories[state.currentCategoryIndex] || '—';
  const colors = getCategoryColors(cat);
  currentCategoryPill.textContent = cat;
  currentCategoryPill.style.setProperty('--result-cat-color', colors.color);
  currentCategoryPill.style.setProperty('--result-cat-dim', colors.dim);
  currentCategoryPill.style.color = colors.color;
  currentCategoryPill.style.background = colors.dim;
}

/**
 * Aplica as cores da categoria ao result card, botões e pill da tela de sorteio.
 */
export function applyCategoryColorsToPlayScreen(category) {
  const colors = getCategoryColors(category);
  const playScreen = document.getElementById('screenPlay');

  // Set CSS custom properties on the play screen
  playScreen.style.setProperty('--result-cat-color', colors.color);
  playScreen.style.setProperty('--result-cat-text', colors.text);
  playScreen.style.setProperty('--result-cat-dim', colors.dim);
  playScreen.style.setProperty('--result-cat-glow', colors.glow);

  // Apply to category pill
  updateCurrentCategoryPill();
}

/* ---------- Renderizar resultado do sorteio ---------- */
export function renderResult(r) {
  resultActor.textContent = r.actor.name;
  resultActor.className = 'result-actor titan-font';
  let text = r.challenge.text || '';
  text = unifyArticlesForPlayerPlaceholders(text);
  text = text.replace(/\{player\}/gi, r.target.name);
  resultChallenge.textContent = text;
  resultChallenge.className = 'result-text titan-font';

  // Aplica cores da categoria
  const cat = state.categories[state.currentCategoryIndex] || r.challenge.category || '';
  applyCategoryColorsToPlayScreen(cat);
}

export function renderPlayers() {
  playersList.innerHTML = '';
  state.players.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';

    const left = document.createElement('div');
    left.className = 'player-info';
    left.innerHTML = `
      <div class="player-avatar">${(p.name || '?').slice(0, 1).toUpperCase()}</div>
      <div>
        <div class="player-name">${escapeHtml(p.name)}</div>
        <div class="player-details">${p.gender === 'M' ? 'Masculino' : 'Feminino'} · ${p.orientation === 'hetero' ? 'Heterossexual' : (p.orientation === 'homo' ? 'Homossexual' : 'Bissexual')}</div>
      </div>`;

    const right = document.createElement('div');
    right.className = 'player-actions';

    const toggle = document.createElement('div');
    toggle.className = 'switch ' + (p.active ? 'on' : 'off');
    toggle.innerHTML = '<div class="knob"></div>';
    toggle.title = p.active ? 'Ativo' : 'Inativo';
    toggle.addEventListener('click', () => { p.active = !p.active; saveState(); renderPlayers(); });

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.title = 'Editar';
    editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h3l11-11-3-3L3 18v3z" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 6.5l3 3" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    editBtn.addEventListener('click', () => openPlayerModal(p));

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.title = 'Excluir';
    delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18" stroke-width="1.4" stroke-linecap="round"/><path d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Excluir jogador ' + p.name + '?')) {
        const idx = state.players.indexOf(p);
        if (idx > -1) {
          state.players.splice(idx, 1);
          saveState(); 
          renderPlayers();
        }
      }
    });

    right.appendChild(toggle);
    right.appendChild(editBtn);
    right.appendChild(delBtn);
    card.appendChild(left);
    card.appendChild(right);
    playersList.appendChild(card);
  });
}

/* ---------- Modal de Jogador ---------- */
export function openPlayerModal(player) {
  const isEdit = !!player;
  const html = `
    <button id="pm_close_x" class="modal-close-x" aria-label="Fechar">✕</button>
    <h3>${isEdit ? 'Editar' : 'Novo'} jogador</h3>
    <div class="form-row">
      <label>Nome</label><input id="pm_name" type="text" value="${isEdit ? escapeHtml(player?.name) : ''}" placeholder="Digite o nome..." />
      <label>Gênero</label>
      <select id="pm_gender" class="select-white"><option value="F">Feminino</option><option value="M">Masculino</option></select>
      <label>Orientação</label>
      <select id="pm_orientation" class="select-white"><option value="hetero">Heterossexual</option><option value="homo">Homossexual</option><option value="bi">Bissexual</option></select>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input id="pm_active" type="checkbox" ${isEdit && player.active ? 'checked' : (isEdit ? '' : 'checked')} /> Ativo no jogo</label>
    </div>
    <div class="modal-actions-right">
      <button id="pm_save" class="btn-primary-small">Salvar</button>
    </div>
  `;
  openModalInner(html);
  document.getElementById('pm_close_x').addEventListener('click', closeModal);
  if (isEdit) {
    document.getElementById('pm_gender').value = player.gender;
    document.getElementById('pm_orientation').value = player.orientation;
    document.getElementById('pm_active').checked = !!player.active;
  }
  document.getElementById('pm_save').addEventListener('click', () => {
    const name = document.getElementById('pm_name').value.trim();
    const gender = document.getElementById('pm_gender').value;
    const orient = document.getElementById('pm_orientation').value;
    const active = document.getElementById('pm_active').checked;
    if (!name) { alert('Nome é obrigatório'); return; }
    if (isEdit) { player.name = name; player.gender = gender; player.orientation = orient; player.active = active; }
    else { state.players.push({ id: uid('p'), name, gender, orientation: orient, active }); }
    saveState(); closeModal(); renderPlayers();
  });
}

export function updateChallengeFilterOptions() {
  const select = document.getElementById('challengeCategoryFilter');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Todas as Categorias</option>';
  (state.categories || []).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  if (state.categories.includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = 'all';
  }
}

/* ---------- Renderizar Desafios (CARDS) ---------- */
export function renderChallenges() {
  const filterSelect = document.getElementById('challengeCategoryFilter');
  const activeCategoryFilter = filterSelect ? filterSelect.value : 'all';

  challengesList.innerHTML = '';
  state.challenges.forEach(ch => {
    if (activeCategoryFilter !== 'all' && ch.category !== activeCategoryFilter) {
      return;
    }
    const catKey = normalizeCategoryKey(ch.category);
    const card = document.createElement('div');
    card.className = 'challenge-card';
    card.setAttribute('data-cat', catKey);

    const textEl = document.createElement('div');
    textEl.className = 'challenge-card-text climate-font'; // New font requested by user
    textEl.textContent = ch.text || '';

    const meta = document.createElement('div');
    meta.className = 'challenge-card-meta';

    const catBadge = document.createElement('span');
    catBadge.className = `challenge-category-badge ${categoryClass(ch.category)}`;
    catBadge.textContent = ch.category || 'Sem categoria';
    meta.appendChild(catBadge);

    if (ch.actorGender && ch.actorGender !== 'any') {
      const badge = document.createElement('span');
      badge.className = 'challenge-gender-badge';
      badge.textContent = `${genderLabel(ch.actorGender)} Faz`;
      meta.appendChild(badge);
    }

    if (ch.targetGender && ch.targetGender !== 'any') {
      const badge = document.createElement('span');
      badge.className = 'challenge-gender-badge';
      badge.textContent = `${genderLabel(ch.targetGender)} Recebe`;
      meta.appendChild(badge);
    }

    if (ch.toys && ch.toys.length > 0) {
      ch.toys.forEach(toyId => {
        const toyDef = TOY_OPTIONS.find(t => t.id === toyId);
        if (toyDef) {
          const badge = document.createElement('span');
          badge.className = 'challenge-gender-badge';
          badge.style.background = 'rgba(232, 130, 92, 0.15)';
          badge.style.color = '#E8825C';
          badge.textContent = toyDef.name;
          meta.appendChild(badge);
        }
      });
    }

    const header = document.createElement('div');
    header.className = 'challenge-card-header';
    header.appendChild(textEl);

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.title = 'Editar';
    editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h3l11-11-3-3L3 18v3z" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 6.5l3 3" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    editBtn.addEventListener('click', () => openChallengeModal(ch));
    header.appendChild(editBtn);

    card.appendChild(header);
    card.appendChild(meta);
    challengesList.appendChild(card);
  });
}

/* ---------- Modal de Desafio ---------- */
export function openChallengeModal(ch) {
  const isEdit = !!ch;
  const html = `
    <button id="ch_close_x" class="modal-close-x" aria-label="Fechar">✕</button>
    <h3>${isEdit ? 'Editar' : 'Novo'} desafio</h3>
    <div class="form-row">
      <label>Texto do desafio</label>
      <textarea id="ch_text" rows="4" placeholder="Descreva o desafio...">${isEdit ? escapeHtml(ch.text) : ''}</textarea>
      <div style="margin-top:4px">
        <label>Quem faz?</label>
        <div style="display:flex;gap:16px;margin-top:6px">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="actor_sel" value="M" /> Homem</label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="actor_sel" value="F" /> Mulher</label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="actor_sel" value="any" checked /> Ambos</label>
        </div>
      </div>
      <div style="margin-top:4px">
        <label>Em quem?</label>
        <div style="display:flex;gap:16px;margin-top:6px">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="target_sel" value="M" /> Homem</label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="target_sel" value="F" /> Mulher</label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="target_sel" value="any" checked /> Ambos</label>
        </div>
      </div>
      <label>Categoria</label>
      <div id="ch_category_container"></div>
      
      <div style="margin-top:12px">
        <label>Brinquedos Necessários</label>
        <div id="ch_toys_container" style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap;"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <button id="ch_insert_player" class="insert-btn">{player}</button>
        <div class="modal-actions-right" style="margin-top:0">
          ${isEdit ? '<button id="ch_delete" class="danger">Excluir</button>' : ''}
          <button id="ch_save" class="btn-primary-small">Salvar</button>
        </div>
      </div>
    </div>
  `;
  openModalInner(html);
  document.getElementById('ch_close_x').addEventListener('click', closeModal);

  const container = document.getElementById('ch_category_container');
  const sel = document.createElement('select');
  sel.id = 'ch_category_select';
  sel.className = 'select-white';
  (state.categories || []).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    sel.appendChild(opt);
  });
  container.appendChild(sel);

  if (isEdit) {
    document.querySelectorAll('input[name="actor_sel"]').forEach(r => r.checked = (r.value === (ch.actorGender || 'any')));
    document.querySelectorAll('input[name="target_sel"]').forEach(r => r.checked = (r.value === (ch.targetGender || 'any')));
    sel.value = ch.category || (state.categories[0] || '');
  } else {
    sel.value = state.categories[0] || '';
  }

  const toysContainer = document.getElementById('ch_toys_container');
  const activeToys = isEdit && ch.toys ? ch.toys : [];
  TOY_OPTIONS.forEach(toy => {
    const lbl = document.createElement('label');
    lbl.style = 'display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.value = toy.id;
    if (activeToys.includes(toy.id)) chk.checked = true;
    lbl.appendChild(chk);
    lbl.appendChild(document.createTextNode(' ' + toy.name));
    toysContainer.appendChild(lbl);
  });

  const textarea = document.getElementById('ch_text');
  document.getElementById('ch_insert_player').addEventListener('click', (ev) => { ev.preventDefault(); insertAtCursor(textarea, '{player}'); });

  document.getElementById('ch_save').addEventListener('click', () => {
    const text = document.getElementById('ch_text').value.trim();
    const category = (sel && sel.value) ? sel.value.trim() : DEFAULT_CATEGORIES[1];
    const actorGender = (document.querySelector('input[name="actor_sel"]:checked') || {}).value || 'any';
    const targetGender = (document.querySelector('input[name="target_sel"]:checked') || {}).value || 'any';
    const selectedToys = [];
    toysContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(c => selectedToys.push(c.value));

    if (!text) { alert('Texto é obrigatório'); return; }
    if (isEdit) {
      ch.text = text; ch.category = category; ch.actorGender = actorGender; ch.targetGender = targetGender; ch.allowSelf = false; ch.toys = selectedToys;
      if (typeof ch.weight === 'undefined') ch.weight = 2;
    } else {
      state.challenges.push({ id: uid('c'), text, category, actorGender, targetGender, allowSelf: false, weight: 2, toys: selectedToys });
    }
    state.categoryDecks = {};
    saveState(); closeModal(); renderChallenges();
  });

  if (isEdit) {
    document.getElementById('ch_delete').addEventListener('click', () => {
      if (!confirm('Excluir desafio?')) return;
      state.challenges = state.challenges.filter(x => x.id !== ch.id);
      state.categoryDecks = {};
      saveState(); closeModal(); renderChallenges();
    });
  }
}

/* ---------- Renderizar Categorias ---------- */
export function renderCategories() {
  updateChallengeFilterOptions();
  categoriesList.innerHTML = '';
  state.categories.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'card';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '10px';

    const dot = document.createElement('span');
    dot.className = `challenge-category-badge ${categoryClass(c)}`;
    dot.textContent = escapeHtml(c);
    left.appendChild(dot);

    const right = document.createElement('div');
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.title = 'Excluir';
    delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18" stroke-width="1.4" stroke-linecap="round"/><path d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    delBtn.addEventListener('click', () => {
      if (confirm('Excluir categoria "' + c + '"?')) {
        state.categories.splice(i, 1);
        state.categoryDecks = {};
        saveState(); renderCategories();
      }
    });
    right.appendChild(delBtn);
    card.appendChild(left);
    card.appendChild(right);
    categoriesList.appendChild(card);
  });
}

/* ---------- Renderizar Tudo ---------- */
export function renderAll() {
  renderPlayers();
  renderChallenges();
  renderCategories();
  updateCurrentCategoryPill();
}

/* ---------- Modal de Seleção de Brinquedos ---------- */
export function openToysSelectionModal(onConfirm) {
  const html = `
    <button id="toys_close_x" class="modal-close-x" aria-label="Fechar">✕</button>
    <h3>Quais desses brinquedos você tem disponível?</h3>
    <div id="toys_selection_container" class="form-row" style="margin-top:16px;"></div>
    <div class="modal-actions-right" style="margin-top:24px;">
      <button id="toys_play_btn" class="btn" style="min-width:auto;width:100%;font-size:18px;">Jogar</button>
    </div>
  `;
  openModalInner(html);
  
  document.getElementById('toys_close_x').addEventListener('click', closeModal);
  const container = document.getElementById('toys_selection_container');
  
  const checkboxes = [];

  TOY_OPTIONS.forEach(toy => {
    const lbl = document.createElement('label');
    lbl.style = 'display:flex;align-items:center;gap:12px;cursor:pointer;font-size:16px;padding:8px 0;';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.value = toy.id;
    chk.style = 'width:20px;height:20px;';
    
    if (state.selectedToys && state.selectedToys.includes(toy.id)) chk.checked = true;
    
    lbl.appendChild(chk);
    lbl.appendChild(document.createTextNode(' ' + toy.name));
    container.appendChild(lbl);
    checkboxes.push(chk);
  });

  const lblNone = document.createElement('label');
  lblNone.style = 'display:flex;align-items:center;gap:12px;cursor:pointer;font-size:16px;padding:8px 0;';
  const chkNone = document.createElement('input');
  chkNone.type = 'checkbox';
  chkNone.value = 'nenhum';
  chkNone.style = 'width:20px;height:20px;';
  
  if (!state.selectedToys || state.selectedToys.length === 0) {
    chkNone.checked = true;
  }
  
  lblNone.appendChild(chkNone);
  lblNone.appendChild(document.createTextNode(' Nenhum'));
  container.appendChild(lblNone);

  checkboxes.forEach(chk => {
    chk.addEventListener('change', () => {
      if (chk.checked) chkNone.checked = false;
      else if (checkboxes.every(c => !c.checked)) chkNone.checked = true;
    });
  });

  chkNone.addEventListener('change', () => {
    if (chkNone.checked) {
      checkboxes.forEach(c => c.checked = false);
    } else if (checkboxes.every(c => !c.checked)) {
      chkNone.checked = true;
    }
  });
  
  document.getElementById('toys_play_btn').addEventListener('click', () => {
    const selected = [];
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
      if (c.value !== 'nenhum') selected.push(c.value);
    });
    state.selectedToys = selected;
    saveState();
    closeModal();
    if (onConfirm) onConfirm();
  });
}

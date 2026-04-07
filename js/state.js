/* ========== Gerenciamento de Estado (localStorage) ========== */

import { STORAGE_KEY, uid, inferCategoryFromText } from './utils.js';
import { DEFAULT_CATEGORIES, BUILTIN_CHALLENGES } from './data.js';

export let state = {
  players: [],
  categories: [],
  challenges: [],
  nextActorIndex: 0,
  currentCategoryIndex: 0,
  categoryDecks: {},
  // Timer config
  timerEnabled: true,
  timerMinutes: 1,
  timerSeconds: 0,
  selectedToys: []
};

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Inicializa o estado a partir do localStorage, mesclando com os desafios builtin.
 * Deve ser chamado uma vez na inicialização do app.
 */
export function initState() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s) {
    try {
      const parsed = JSON.parse(s);
      Object.assign(state, parsed);
      // Ensure defaults for new properties if missing
      if (typeof state.timerEnabled === 'undefined') state.timerEnabled = true;
      if (typeof state.timerMinutes === 'undefined') state.timerMinutes = 1;
      if (typeof state.timerSeconds === 'undefined') state.timerSeconds = 0;
    } catch (e) {
      state.players = [];
      state.categories = DEFAULT_CATEGORIES.slice();
      state.challenges = [];
      state.nextActorIndex = 0;
      state.currentCategoryIndex = 0;
      state.categoryDecks = {};
      state.selectedToys = [];
    }
  }

  // Garante que as categorias existam
  if (!state.categories || !state.categories.length) {
    state.categories = DEFAULT_CATEGORIES.slice();
  }

  // Se não há desafios, semeia com os builtins
  if (!state.challenges.length) {
    state.challenges = BUILTIN_CHALLENGES.map(c => {
      const inferred = inferCategoryFromText(c.text);
      const category = c.category || inferred || DEFAULT_CATEGORIES[1];
      const weight = (typeof c.weight !== 'undefined') ? c.weight : 2;
      return Object.assign({ id: uid('c'), allowSelf: !!c.allowSelf }, c, { category, weight });
    });
    saveState();
  } else {
    // Merge: preserva itens salvos, adiciona builtins que faltam
    const mapTextToIndex = new Map();
    state.challenges.forEach((c, i) => mapTextToIndex.set((c.text || '').trim(), i));

    BUILTIN_CHALLENGES.forEach(b => {
      const t = (b.text || '').trim();
      if (!t) return;

      if (mapTextToIndex.has(t)) {
        const idx = mapTextToIndex.get(t);
        const exist = state.challenges[idx];
        if ((exist.actorGender || 'any') !== (b.actorGender || 'any') || (exist.targetGender || 'any') !== (b.targetGender || 'any')) {
          exist.actorGender = b.actorGender || exist.actorGender || 'any';
          exist.targetGender = b.targetGender || exist.targetGender || 'any';
        }
        if (typeof exist.weight === 'undefined') exist.weight = (typeof b.weight !== 'undefined') ? b.weight : 2;
        if (!exist.category || !exist.category.length) {
          exist.category = inferCategoryFromText(exist.text) || (b.category || DEFAULT_CATEGORIES[1]);
        }
      } else {
        const inferred = inferCategoryFromText(b.text);
        const category = b.category || inferred || DEFAULT_CATEGORIES[1];
        const weight = (typeof b.weight !== 'undefined') ? b.weight : 2;
        state.challenges.push(Object.assign({ id: uid('c'), allowSelf: false }, b, { category, weight }));
      }
    });
    saveState();
  }
}

/* ========== Lógica do Jogo (sorteio, compatibilidade, decks) ========== */

import { shuffle } from './utils.js';
import { state, saveState } from './state.js';

/* Helper: elemento aleatório de um array */
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Retorna os alvos elegíveis para um dado ator,
 * filtrando por orientação sexual.
 */
export function eligibleTargets(actor) {
  const others = state.players.filter(p => p.active && p.id !== actor.id);
  if (actor.orientation === 'hetero') return others.filter(o => o.gender && o.gender !== actor.gender);
  if (actor.orientation === 'homo') return others.filter(o => o.gender && o.gender === actor.gender);
  return others;
}

/**
 * Verifica se um desafio é compatível com ator e alvo.
 */
export function challengeCompatible(ch, actor, target) {
  if (ch.actorGender && ch.actorGender !== 'any' && ch.actorGender !== actor.gender) return false;
  if (ch.targetGender && ch.targetGender !== 'any' && ch.targetGender !== target.gender) return false;
  if (!ch.allowSelf && actor.id === target.id) return false;
  return true;
}

/**
 * Inicializa o deck (baralho embaralhado) para uma categoria.
 * Separa desafios por peso (w1 = prioridade, w2 = normal).
 */
export function initDeckForCategory(cat) {
  if (!cat) return;
  const key = String(cat);
  const allInCategory = state.challenges.filter(c => (c.category || state.categories[0]) === cat);
  const w1 = allInCategory.filter(c => Number(c.weight) === 1).map(c => c.id);
  const w2 = allInCategory.filter(c => Number(c.weight) !== 1).map(c => c.id);
  state.categoryDecks[key] = {
    w1: shuffle(w1),
    w2: shuffle(w2),
  };
  saveState();
}

/**
 * Sorteia uma rodada (ator + alvo + desafio) dentro da categoria atual.
 * Prioriza desafios de peso 1 (w1) antes dos de peso 2 (w2).
 * Retorna { actor, target, challenge } ou null se não encontrar combinação válida.
 */
export function pickRound() {
  const activePlayers = state.players.filter(p => p.active);
  if (activePlayers.length < 2) return null;

  const total = state.players.length;
  if (total === 0) return null;

  let start = (typeof state.nextActorIndex === 'number') ? state.nextActorIndex % total : 0;
  const currentCategory = state.categories[state.currentCategoryIndex];
  if (!currentCategory) return null;

  // Garante que o deck existe
  const deckKey = String(currentCategory);
  if (!state.categoryDecks[deckKey]) {
    initDeckForCategory(currentCategory);
  }

  for (let trial = 0; trial < total; trial++) {
    const idx = (start + trial) % total;
    const actor = state.players[idx];
    if (!actor || !actor.active) continue;

    const targets = eligibleTargets(actor);
    if (!targets.length) continue;

    const target = rand(targets);
    const deck = state.categoryDecks[deckKey];

    // Helper: tira próximo desafio compatível de um pool
    function popCompatibleFromPool(poolArr) {
      for (let i = 0; i < poolArr.length; i++) {
        const cid = poolArr[i];
        const ch = state.challenges.find(x => x.id === cid);
        if (!ch) continue;
        if (challengeCompatible(ch, actor, target)) {
          poolArr.splice(i, 1);
          return ch;
        }
      }
      return null;
    }

    // Prioridade: w1 primeiro
    let chosen = null;
    if (deck && deck.w1 && deck.w1.length) {
      chosen = popCompatibleFromPool(deck.w1);
    }
    // Depois w2
    if (!chosen && deck && deck.w2 && deck.w2.length) {
      chosen = popCompatibleFromPool(deck.w2);
    }
    // Fallback: qualquer desafio compatível na categoria
    if (!chosen) {
      const pool = state.challenges.filter(
        ch => (ch.category || '') === currentCategory && challengeCompatible(ch, actor, target)
      );
      if (pool.length) chosen = rand(pool);
    }

    if (chosen) {
      state.nextActorIndex = (idx + 1) % total;
      saveState();
      return { actor, target, challenge: chosen };
    }
  }

  return null;
}

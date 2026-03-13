/* ========== Constantes ========== */
export const STORAGE_KEY = 'desafios_eroticos_v1';

/* ========== Funções auxiliares puras ========== */

export function uid(pref = 'id') {
  return pref + Math.random().toString(36).slice(2, 9);
}

export function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

export function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Tenta inferir a categoria de um desafio pelo texto (best-effort).
 * Retorna null se não conseguir determinar.
 */
export function inferCategoryFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('masturb') || t.includes('masturbe') || t.includes('masturba')) return 'Masturbação';
  if (t.includes('clit') || t.includes('sexo oral') || t.includes('69') || t.includes('garganta profunda') || t.includes('lamba') || t.includes('chupe') || t.includes('chupar') || t.includes('oral') || t.includes('sopre')) return 'Oral';
  if (t.includes('amarre') || t.includes('chicote') || t.includes('submiss') || t.includes('domine')) return 'Submissão';
  if (t.includes('transe') || t.includes('papai') || t.includes('de quatro') || t.includes('sente no rosto') || t.includes('garganta')) return 'Pesado';
  if (t.includes('beij') || t.includes('massag') || t.includes('acarici') || t.includes('olho') || t.includes('rosto')) return 'Aquecimento';
  return null;
}

/**
 * Unifica artigos antes de {player} para formato neutro do(a), no(a), etc.
 */
export function unifyArticlesForPlayerPlaceholders(text) {
  if (!text) return text;
  text = text.replace(/\b(do|da)\s+\{player\}/gi, 'do(a) {player}');
  text = text.replace(/\b(no|na)\s+\{player\}/gi, 'no(a) {player}');
  text = text.replace(/\b(o|a)\s+\{player\}/gi, 'o(a) {player}');
  text = text.replace(/\b(seu|sua)\s+\{player\}/gi, 'seu(a) {player}');
  text = text.replace(/\b(seus|suas)\s+\{player\}/gi, 'seus(as) {player}');
  text = text.replace(/\b(ao|à|aos|às)\s+\{player\}/gi, 'ao(a) {player}');
  return text;
}

/**
 * Mapeia termos em português para gênero ('M', 'F', 'any').
 */
export function mapPortugueseGender(str) {
  if (!str) return 'any';
  const s = str.toLowerCase();
  if (s.includes('homem') || s.includes('mascul')) return 'M';
  if (s.includes('mulher') || s.includes('femin')) return 'F';
  return 'any';
}

/**
 * Insere texto na posição do cursor de um textarea.
 */
export function insertAtCursor(textarea, textToInsert) {
  if (!textarea) return;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value || '';
  textarea.value = val.slice(0, start) + textToInsert + val.slice(end);
  const pos = start + textToInsert.length;
  textarea.selectionStart = textarea.selectionEnd = pos;
  textarea.focus();
}

// Glue between the game and the automatic word validator: the player-facing policy (stored on this device),
// its settings row, the loading of the dictionary, and the Arabic messages shown to the players.
//
//   auto    unknown words are rejected before the move is committed (default)
//   tahkim  unknown words are accepted provisionally (marked ؟) and can be challenged with Tahkim
//   off     no automatic check: Tahkim only, exactly like before the validator existed
//
// If the dictionary cannot be loaded (offline, blocked file ...) the game silently falls back to Tahkim-only play.
import { $, app } from './state.js';
import { loadDictionary, warmDictionary, validateWords, isDictionaryReady } from './validator.js';

const KEY = 'scrabble.wordcheck';
export const POLICIES = [['auto', 'تلقائي'], ['tahkim', 'تلقائي + تحكيم'], ['off', 'إيقاف']];
const LABEL = 'عند تأكيد الحركة';
let policy = 'auto';

const REASON_AR = {
  NOT_IN_LEXICON: 'غير موجودة في القاموس', WEAK_EVIDENCE: 'دليلها ضعيف في القاموس', INVALID_ORTHOGRAPHY: 'رسمها غير صحيح', MODE_LETTER_UNAVAILABLE: 'تحتاج حرفًا غير متاح في هذا النمط',
  NOT_ARABIC: 'ليست كلمة عربية', TOO_SHORT: 'قصيرة جدًا', TOO_LONG: 'طويلة جدًا', EMPTY: 'فارغة'
};

export const wordCheckPolicy = () => policy;
export function setWordCheckPolicy(p) {
  if (!POLICIES.some(([v]) => v === p)) return false;
  policy = p;
  try { localStorage.setItem(KEY, p); } catch { /* private mode / storage disabled: the choice just lasts for this session */ }
  return true;
}

function ensureLoaded() {
  if (isDictionaryReady()) return Promise.resolve();
  return loadDictionary().then(() => warmDictionary(app.mode)).catch(() => { /* fall back to Tahkim-only; retried on the next move */ });
}
export function warmForMode() { if (policy !== 'off') ensureLoaded().then(() => warmDictionary(app.mode)); }

export function initWordCheck() {
  try { const p = localStorage.getItem(KEY); if (POLICIES.some(([v]) => v === p)) policy = p; } catch { /* keep default */ }
  const host = $('#wcB');
  if (host) {
    const draw = () => {
      host.innerHTML = `<div class="segRow"><div class="setRowHead">${LABEL}</div><div class="seg" role="group" aria-label="${LABEL}">`
        + POLICIES.map(([v, t]) => `<button type="button" class="btn" data-v="${v}" aria-pressed="${policy === v}">${t}</button>`).join('') + '</div></div>';
    };
    draw();
    host.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]');
      if (b && setWordCheckPolicy(b.dataset.v)) { draw(); warmForMode(); }
    });
  }
  warmForMode();
}

const shown = ws => ws.slice(0, 2).map(r => r.word).join('، ') + (ws.length > 2 ? '…' : '');

// Result of checking the words of a move.  { reject, message?, unverified: Set<string>, note? }
export function checkMove(words) {
  const none = { reject: false, unverified: new Set() };
  if (policy === 'off') return none;
  if (!isDictionaryReady()) { ensureLoaded(); return none; }
  const v = validateWords(words, { mode: app.mode, unknown: policy === 'tahkim' ? 'tahkim' : 'reject' });
  if (v.status === 'invalid') {
    const one = v.invalid.length === 1 ? v.invalid[0] : null;
    return { ...none, reject: true, message: one ? `كلمة غير صحيحة: ${one.word} — ${REASON_AR[one.reason] || 'غير مقبولة'}` : `كلمات غير صحيحة: ${shown(v.invalid)}` };
  }
  if (v.status === 'uncertain') return { ...none, unverified: new Set(v.uncertain.map(r => r.word)), note: `⚠ غير مؤكدة: ${shown(v.uncertain)} — يمكن التحكيم` };
  return { ...none, note: v.status === 'valid' ? '✓ كلمات صحيحة' : undefined };
}

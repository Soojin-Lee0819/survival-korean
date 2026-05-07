// Hangul-aware pronunciation scoring used by the real-time feedback flow.
// Decomposes Hangul syllables into jamo (initial / medial / final) so a
// learner saying 안녕 vs 안녕하 vs 안냥 lands on a smooth, forgiving curve.

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;

const STRIP_RE = /[\s.,!?·〜~・…"'`()[\]{}]+/g;

export function normalizeKorean(input) {
  return (input || '').replace(STRIP_RE, '').trim();
}

export function decomposeHangul(input) {
  const out = [];
  for (const ch of input) {
    const code = ch.codePointAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const idx = code - HANGUL_BASE;
      out.push(0x1100 + Math.floor(idx / 588));
      out.push(0x1161 + Math.floor((idx % 588) / 28));
      const fIdx = idx % 28;
      if (fIdx > 0) out.push(0x11a7 + fIdx);
    } else {
      out.push(code);
    }
  }
  return out;
}

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export function scorePronunciation(target, attempt) {
  const tNorm = normalizeKorean(target);
  const aNorm = normalizeKorean(attempt);
  const t = decomposeHangul(tNorm);
  const a = decomposeHangul(aNorm);
  if (t.length === 0) return null;
  const distance = levenshtein(t, a);
  const score = Math.max(0, Math.round(100 - (distance / t.length) * 100));
  return { score, distance, targetLength: t.length, target: tNorm, attempt: aNorm };
}

export function describeScore(score) {
  if (score == null) return { tier: 'none', label: 'Try again', color: '#9c8b78' };
  if (score >= 90) return { tier: 'perfect', label: 'Perfect', color: '#4f6840' };
  if (score >= 75) return { tier: 'great', label: 'Great', color: '#88a06c' };
  if (score >= 50) return { tier: 'almost', label: 'Almost', color: '#c8a14a' };
  if (score >= 20) return { tier: 'rough', label: 'Rough', color: '#d4543a' };
  return { tier: 'miss', label: 'Try again', color: '#a8412c' };
}

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

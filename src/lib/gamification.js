// Gamification: XP, levels, badges. Pure functions + a thin localStorage layer.
// All tunable in one place so reward economy stays balanced.

export const STORAGE = {
  xp: 'sk-xp',
  badges: 'sk-badges',
  scores: 'sk-scores',
};

export const LEVELS = [
  { level: 1, ko: '초보',     en: 'Beginner',   min: 0,   next: 60   },
  { level: 2, ko: '도전자',   en: 'Challenger', min: 60,  next: 180  },
  { level: 3, ko: '익숙한',   en: 'Familiar',   min: 180, next: 360  },
  { level: 4, ko: '유창한',   en: 'Fluent',     min: 360, next: 600  },
  { level: 5, ko: '달인',     en: 'Master',     min: 600, next: Infinity },
];

export function levelFor(xp) {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  let current = LEVELS[0];
  for (const tier of LEVELS) {
    if (safeXp >= tier.min) current = tier;
  }
  const nextThreshold = current.next === Infinity ? current.min : current.next;
  const span = current.next === Infinity ? 1 : current.next - current.min;
  const progress = current.next === Infinity ? 1 : Math.min(1, (safeXp - current.min) / span);
  return { ...current, xp: safeXp, progress, nextThreshold };
}

// Score-driven XP per Repeat attempt.
export function xpForScore(score) {
  if (score == null) return { amount: 5, label: 'Practiced' };
  if (score >= 90) return { amount: 24, label: 'Perfect' };
  if (score >= 75) return { amount: 14, label: 'Great' };
  if (score >= 50) return { amount: 8, label: 'Almost' };
  if (score >= 20) return { amount: 3, label: 'Keep trying' };
  return { amount: 1, label: 'Reset and breathe' };
}

export const BADGES = {
  echo: {
    id: 'echo',
    name: 'Echo',
    desc: 'Listened to your first phrase.',
    glyph: 'wave',
    paletteIdx: 3,
  },
  mirror: {
    id: 'mirror',
    name: 'Mirror',
    desc: 'Recorded your first repeat.',
    glyph: 'chat',
    paletteIdx: 5,
  },
  perfect: {
    id: 'perfect',
    name: 'Perfect Pitch',
    desc: 'Scored 90 or more on a phrase.',
    glyph: 'target',
    paletteIdx: 0,
  },
  bullseye: {
    id: 'bullseye',
    name: 'Bullseye',
    desc: 'Three perfects in a single session.',
    glyph: 'star',
    paletteIdx: 0,
  },
  day1: {
    id: 'day1',
    name: 'Day One',
    desc: 'Completed every line of Day 1.',
    glyph: 'wave',
    paletteIdx: 0,
  },
  day7: {
    id: 'day7',
    name: 'Final Bow',
    desc: 'Completed the seven-day plan.',
    glyph: 'crown',
    paletteIdx: 2,
  },
  streak3: {
    id: 'streak3',
    name: 'Three Sunsets',
    desc: 'Practiced three days in a row.',
    glyph: 'flame',
    paletteIdx: 5,
  },
  streak7: {
    id: 'streak7',
    name: 'Lucky Seven',
    desc: 'Practiced seven days in a row.',
    glyph: 'flame',
    paletteIdx: 0,
  },
  parents10: {
    id: 'parents10',
    name: 'Parents Ready',
    desc: 'Practiced ten lines from the wildcard pack.',
    glyph: 'family',
    paletteIdx: 1,
  },
};

export function loadXp() {
  try {
    return Math.max(0, Number.parseInt(localStorage.getItem(STORAGE.xp) || '0', 10) || 0);
  } catch {
    return 0;
  }
}

export function loadBadges() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.badges) || '{}');
  } catch {
    return {};
  }
}

export function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.scores) || '{}');
  } catch {
    return {};
  }
}

export function persistXp(xp) {
  try {
    localStorage.setItem(STORAGE.xp, String(Math.max(0, Math.floor(xp))));
  } catch { /* ignore quota */ }
}

export function persistBadges(badges) {
  try {
    localStorage.setItem(STORAGE.badges, JSON.stringify(badges));
  } catch { /* ignore quota */ }
}

export function persistScores(scores) {
  try {
    localStorage.setItem(STORAGE.scores, JSON.stringify(scores));
  } catch { /* ignore quota */ }
}

export function recordScore(scores, phraseId, score) {
  const prev = scores[phraseId] || { best: 0, attempts: 0, last: null };
  return {
    ...scores,
    [phraseId]: {
      best: Math.max(prev.best, score),
      attempts: prev.attempts + 1,
      last: { score, at: new Date().toISOString() },
    },
  };
}

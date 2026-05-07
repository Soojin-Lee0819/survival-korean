import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Flame,
  Library,
  Mic,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  StickyNote,
  Trophy,
  X,
} from 'lucide-react';
import {
  BADGES,
  levelFor,
  loadBadges,
  loadScores,
  loadXp,
  persistBadges,
  persistScores,
  persistXp,
  recordScore,
  xpForScore,
} from './lib/gamification';
import { describeScore, scorePronunciation } from './lib/pronunciation';
import useSpeechRecognition from './hooks/useSpeechRecognition';

const ACCENT_PALETTE = [
  { name: 'coral',      bg: '#fdeee7', tint: '#fbd9c8', ink: '#a8412c', dot: '#ec6a4d' },
  { name: 'sage',       bg: '#eef2e6', tint: '#d2dcb8', ink: '#4f6840', dot: '#88a06c' },
  { name: 'sand',       bg: '#f5ecd6', tint: '#e8d4a8', ink: '#7a5b1f', dot: '#c8a14a' },
  { name: 'mist',       bg: '#e8eef0', tint: '#d0dde2', ink: '#3e5963', dot: '#5b7a85' },
  { name: 'plum',       bg: '#f0e8ee', tint: '#e0cdda', ink: '#674057', dot: '#9a6f8a' },
  { name: 'terracotta', bg: '#f4e3d6', tint: '#e6c2a3', ink: '#7c4a2c', dot: '#c47a4d' },
  { name: 'cream',      bg: '#f5ecdc', tint: '#ecdfc6', ink: '#5a4731', dot: '#b3956a' },
];

const STORAGE_KEYS = {
  generated: 'korean-speaking-generated',
  history: 'korean-speaking-history',
  streak: 'korean-speaking-streak',
  meetingDate: 'korean-speaking-meeting-date',
  practiced: 'korean-speaking-practiced',
};

const SAFE_PHRASES = {
  'nice to meet you': {
    koreanText: '만나서 반가워요',
    romanization: 'mannaseo bangawoyo',
    englishMeaning: 'Nice to meet you',
  },
  "let's go eat": {
    koreanText: '같이 밥 먹으러 가요',
    romanization: 'gachi bap meogeureo gayo',
    englishMeaning: "Let's go eat",
  },
  'i missed you': {
    koreanText: '보고 싶었어',
    romanization: 'bogo sipeosseo',
    englishMeaning: 'I missed you',
  },
  'i love you': {
    koreanText: '사랑해',
    romanization: 'saranghae',
    englishMeaning: 'I love you',
  },
  'i want to know you more': {
    koreanText: '너를 더 알고 싶어',
    romanization: 'neoreul deo algo sipeo',
    englishMeaning: 'I want to know you more',
  },
};

function trackEvent(eventName, payload = {}) {
  const events = JSON.parse(localStorage.getItem('korean-speaking-analytics') || '[]');
  events.push({ eventName, payload, createdAt: new Date().toISOString() });
  localStorage.setItem('korean-speaking-analytics', JSON.stringify(events.slice(-200)));
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function updateStreak() {
  const saved = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.streak) || '{"count":0,"lastDate":""}'
  );
  const today = getTodayKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (saved.lastDate === today) return saved;
  if (saved.lastDate === yesterday) return { count: saved.count + 1, lastDate: today };
  return { count: 1, lastDate: today };
}

function computeMeetingDate() {
  const stored = localStorage.getItem(STORAGE_KEYS.meetingDate);
  if (stored) {
    const parsed = new Date(stored);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), 14);
  if (now > target) {
    target.setMonth(target.getMonth() + 1);
  }
  return target;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntil(target) {
  const a = startOfDay(target);
  const b = startOfDay(new Date());
  return Math.round((a - b) / 86400000);
}

function formatLongDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildGeneratedPhrase(input) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  if (SAFE_PHRASES[normalized]) return SAFE_PHRASES[normalized];
  if (normalized.includes('go eat')) {
    return {
      koreanText: '우리 밥 먹으러 갈까요?',
      romanization: 'uri bap meogeureo galkkayo?',
      englishMeaning: 'Should we go eat?',
    };
  }
  if (normalized.includes('miss')) {
    return {
      koreanText: '많이 보고 싶었어',
      romanization: 'mani bogo sipeosseo',
      englishMeaning: 'I missed you a lot',
    };
  }
  if (normalized.includes('parents')) {
    return {
      koreanText: '부모님께 잘 보이고 싶어요',
      romanization: 'bumonimkke jal boigo sipeoyo',
      englishMeaning: 'I want to make a good impression on your parents',
    };
  }
  return {
    koreanText: '그 말을 자연스럽게 표현해 볼게요',
    romanization: 'geu mareul jayeonseureopge pyohyeonhae bolgeyo',
    englishMeaning: 'I will help you phrase that more naturally in Korean',
  };
}

function buildParentsPhrases() {
  const lines = [
    {
      ko: '안녕하세요, 처음 뵙겠습니다',
      ro: 'annyeonghaseyo, cheoeum boepgesseumnida',
      en: 'Hello, it is the first time meeting you',
    },
    {
      ko: '만나 뵙게 되어 영광입니다',
      ro: 'manna boepge doe-eo yeonggwangimnida',
      en: 'It is an honor to meet you',
    },
    {
      ko: '음식이 정말 맛있습니다',
      ro: 'eumsigi jeongmal masisseumnida',
      en: 'The food is really delicious',
    },
    {
      ko: '따님을 정말 소중히 생각하고 있습니다',
      ro: 'ttanimeul jeongmal sojunghi saenggakhago itseumnida',
      en: 'I deeply cherish your daughter',
    },
    {
      ko: '항상 잘 챙기겠습니다',
      ro: 'hangsang jal chaenggigesseumnida',
      en: 'I will always take good care of her',
    },
    {
      ko: '한국 문화를 배우고 있어요',
      ro: 'hanguk munhwareul baeugo isseoyo',
      en: 'I am learning Korean culture',
    },
    {
      ko: '오늘 시간 내 주셔서 감사합니다',
      ro: 'oneul sigan nae jusyeoseo gamsahamnida',
      en: 'Thank you for making time today',
    },
    {
      ko: '집이 정말 따뜻해요',
      ro: 'jibi jeongmal ttatteuthaeyo',
      en: 'Your home feels really warm',
    },
    {
      ko: '말씀 많이 들었어요',
      ro: 'malsseum mani deureosseoyo',
      en: 'I have heard a lot about you',
    },
    {
      ko: '제가 어떻게 도와드릴 수 있을까요?',
      ro: 'jega eotteoke dowadeuril su isseulkkayo?',
      en: 'How can I help?',
    },
  ];
  return Array.from({ length: 100 }, (_, index) => {
    const base = lines[index % lines.length];
    return {
      id: `parents-${index + 1}`,
      koreanText: base.ko,
      romanization: base.ro,
      englishMeaning: `${base.en} (#${index + 1})`,
    };
  });
}

const DAY_PLAN = [
  {
    id: 'day-1',
    label: 'Day 1',
    theme: 'First Impression',
    subtitle: 'A confident, warm hello',
    mission:
      'Lock in the first three lines you will say. They set the entire tone of the day.',
    sticker: 'wave',
    accent: 'from-rose-100 via-rose-50 to-amber-50',
    chip: 'bg-rose-200/70 text-rose-700',
    border: 'border-rose-200',
    phrases: [
      {
        id: 'd1-1',
        koreanText: '안녕하세요, 만나서 반가워요',
        romanization: 'annyeonghaseyo, mannaseo bangawoyo',
        englishMeaning: 'Hello, it is nice to meet you',
        note: 'Default polite hello — works for almost anyone.',
      },
      {
        id: 'd1-2',
        koreanText: '저는 ___이에요',
        romanization: 'jeoneun ___-ieyo',
        englishMeaning: 'I am ___ (introduce yourself)',
        note: 'If your name ends in a consonant, say “___이에요”. If it ends in a vowel, say “___예요”.',
      },
      {
        id: 'd1-3',
        koreanText: '한국어 조금 배우는 중이에요',
        romanization: 'hangugeo jogeum baeuneun jung-ieyo',
        englishMeaning: 'I am learning a little Korean',
        note: 'Disarms expectations and earns instant warmth.',
      },
      {
        id: 'd1-4',
        koreanText: '잘 부탁드려요',
        romanization: 'jal butakdeuryeoyo',
        englishMeaning: 'I look forward to spending time together',
        note: 'A polite, soft “please be kind to me”. Very Korean.',
      },
      {
        id: 'd1-5',
        koreanText: '이름이 어떻게 되세요?',
        romanization: 'ireumi eotteoke doeseyo?',
        englishMeaning: 'May I ask your name?',
        note: 'More respectful than “이름이 뭐예요”.',
      },
    ],
  },
  {
    id: 'day-2',
    label: 'Day 2',
    theme: 'Quiet Compliments',
    subtitle: 'Make her feel seen',
    mission:
      'Compliments land hardest when they are specific, unhurried, and quiet. Try one today.',
    sticker: 'heart',
    accent: 'from-pink-100 via-rose-50 to-rose-100',
    chip: 'bg-pink-200/70 text-pink-700',
    border: 'border-pink-200',
    phrases: [
      {
        id: 'd2-1',
        koreanText: '오늘 정말 예뻐요',
        romanization: 'oneul jeongmal yeppeoyo',
        englishMeaning: 'You look really beautiful today',
        note: 'Use “예뻐요” warmly, never as a tease.',
      },
      {
        id: 'd2-2',
        koreanText: '같이 있으면 진짜 편해요',
        romanization: 'gachi isseumyeon jinjja pyeonhaeyo',
        englishMeaning: 'I feel really at ease around you',
        note: '“편해요” = comfortable. A huge compliment in Korean.',
      },
      {
        id: 'd2-3',
        koreanText: '웃는 모습이 정말 좋아요',
        romanization: 'utneun moseubi jeongmal joayo',
        englishMeaning: 'I really love it when you smile',
      },
      {
        id: 'd2-4',
        koreanText: '너 정말 따뜻한 사람이야',
        romanization: 'neo jeongmal ttatteuthan saramiya',
        englishMeaning: 'You are a really warm person (casual)',
        note: 'Switch to casual “너” only if you already speak casually.',
      },
      {
        id: 'd2-5',
        koreanText: '보고 싶었어',
        romanization: 'bogo sipeosseo',
        englishMeaning: 'I missed you (casual)',
        note: 'Polite version: “보고 싶었어요”.',
      },
    ],
  },
  {
    id: 'day-3',
    label: 'Day 3',
    theme: 'Eating Together',
    subtitle: 'Order food like a local',
    mission:
      'Sharing food is intimacy. Learn three lines so you can enjoy the meal without panic.',
    sticker: 'bowl',
    accent: 'from-orange-100 via-amber-50 to-yellow-100',
    chip: 'bg-orange-200/70 text-orange-700',
    border: 'border-orange-200',
    phrases: [
      {
        id: 'd3-1',
        koreanText: '뭐 먹고 싶어요?',
        romanization: 'mwo meokgo sipeoyo?',
        englishMeaning: 'What do you want to eat?',
      },
      {
        id: 'd3-2',
        koreanText: '이거 추천해 주세요',
        romanization: 'igeo chucheonhae juseyo',
        englishMeaning: 'Please recommend something',
        note: 'Say this to her, or to a server. Works both ways.',
      },
      {
        id: 'd3-3',
        koreanText: '같이 시킬까요?',
        romanization: 'gachi sikilkkayo?',
        englishMeaning: 'Should we order together?',
      },
      {
        id: 'd3-4',
        koreanText: '잘 먹겠습니다',
        romanization: 'jal meokgesseumnida',
        englishMeaning: 'Said before eating — “Thanks for the meal”',
        note: 'Always pause and say this. It is more than a phrase.',
      },
      {
        id: 'd3-5',
        koreanText: '진짜 맛있어요',
        romanization: 'jinjja masisseoyo',
        englishMeaning: 'It is really delicious',
        note: 'Use freely. Reserve for food that actually wowed you.',
      },
    ],
  },
  {
    id: 'day-4',
    label: 'Day 4',
    theme: 'Easy Small Talk',
    subtitle: 'Keep the conversation flowing',
    mission:
      'Three reactive phrases beat fifty memorized monologues. Master these so silence does not scare you.',
    sticker: 'chat',
    accent: 'from-sky-100 via-blue-50 to-cyan-100',
    chip: 'bg-sky-200/70 text-sky-700',
    border: 'border-sky-200',
    phrases: [
      {
        id: 'd4-1',
        koreanText: '오늘 하루 어땠어요?',
        romanization: 'oneul haru eottaesseoyo?',
        englishMeaning: 'How was your day?',
      },
      {
        id: 'd4-2',
        koreanText: '진짜요?',
        romanization: 'jinjjayo?',
        englishMeaning: 'Really? / Seriously?',
        note: 'Use it to react — keeps her talking.',
      },
      {
        id: 'd4-3',
        koreanText: '재미있을 것 같아요',
        romanization: 'jaemi isseul geot gatayo',
        englishMeaning: 'That sounds fun',
      },
      {
        id: 'd4-4',
        koreanText: '같이 해볼래요?',
        romanization: 'gachi haebollaeyo?',
        englishMeaning: 'Want to try it together?',
      },
      {
        id: 'd4-5',
        koreanText: '나도 그래',
        romanization: 'na-do geurae',
        englishMeaning: 'Me too / Same here (casual)',
        note: 'Polite version: “저도 그래요”.',
      },
    ],
  },
  {
    id: 'day-5',
    label: 'Day 5',
    theme: 'Meeting Parents',
    subtitle: 'Respect that lands',
    mission:
      'Korean parents notice tone, not vocabulary. Slower, lower, polite. One bow goes a long way.',
    sticker: 'family',
    accent: 'from-emerald-100 via-teal-50 to-emerald-100',
    chip: 'bg-emerald-200/70 text-emerald-700',
    border: 'border-emerald-200',
    phrases: [
      {
        id: 'd5-1',
        koreanText: '안녕하세요, 처음 뵙겠습니다',
        romanization: 'annyeonghaseyo, cheoeum boepgesseumnida',
        englishMeaning: 'Hello, it is the first time meeting you (formal)',
      },
      {
        id: 'd5-2',
        koreanText: '만나 뵙게 되어 영광입니다',
        romanization: 'manna boepge doe-eo yeonggwangimnida',
        englishMeaning: 'It is an honor to meet you',
      },
      {
        id: 'd5-3',
        koreanText: '음식이 정말 맛있습니다',
        romanization: 'eumsigi jeongmal masisseumnida',
        englishMeaning: 'The food is really delicious (formal)',
        note: 'Always compliment the food early.',
      },
      {
        id: 'd5-4',
        koreanText: '따님을 정말 소중히 생각하고 있습니다',
        romanization: 'ttanimeul jeongmal sojunghi saenggakhago itseumnida',
        englishMeaning: 'I deeply cherish your daughter (formal)',
      },
      {
        id: 'd5-5',
        koreanText: '잘 부탁드리겠습니다',
        romanization: 'jal butakdeurigesseumnida',
        englishMeaning: 'Please take good care of me (very formal)',
        note: 'Often closes the visit. Slight bow when you say it.',
      },
    ],
  },
  {
    id: 'day-6',
    label: 'Day 6',
    theme: 'Heartfelt Words',
    subtitle: 'Say what actually matters',
    mission:
      'Pick one line you mean. Practice it until it leaves your mouth easily and quietly.',
    sticker: 'flower',
    accent: 'from-violet-100 via-purple-50 to-fuchsia-100',
    chip: 'bg-violet-200/70 text-violet-700',
    border: 'border-violet-200',
    phrases: [
      {
        id: 'd6-1',
        koreanText: '너랑 있는 시간이 제일 행복해',
        romanization: 'neorang itneun sigani jeil haengbokae',
        englishMeaning: 'Time with you is when I feel happiest',
      },
      {
        id: 'd6-2',
        koreanText: '너를 더 알고 싶어',
        romanization: 'neoreul deo algo sipeo',
        englishMeaning: 'I want to know you more',
      },
      {
        id: 'd6-3',
        koreanText: '항상 옆에 있을게',
        romanization: 'hangsang yeope isseulge',
        englishMeaning: 'I will always be by your side',
      },
      {
        id: 'd6-4',
        koreanText: '너는 나에게 정말 특별한 사람이야',
        romanization: 'neoneun naege jeongmal teukbyeolhan saramiya',
        englishMeaning: 'You are truly special to me',
      },
      {
        id: 'd6-5',
        koreanText: '사랑해',
        romanization: 'saranghae',
        englishMeaning: 'I love you (casual)',
        note: 'Reserve for moments when you really feel it.',
      },
    ],
  },
  {
    id: 'day-7',
    label: 'Day 7',
    theme: 'Final Rehearsal',
    subtitle: 'Tomorrow you meet — relax',
    mission:
      'Do not add new lines today. Repeat your five strongest phrases until they feel like yours.',
    sticker: 'star',
    accent: 'from-indigo-100 via-blue-50 to-violet-100',
    chip: 'bg-indigo-200/70 text-indigo-700',
    border: 'border-indigo-200',
    phrases: [
      {
        id: 'd7-1',
        koreanText: '잘 잤어요?',
        romanization: 'jal jasseoyo?',
        englishMeaning: 'Did you sleep well?',
      },
      {
        id: 'd7-2',
        koreanText: '오늘 만날 수 있어요?',
        romanization: 'oneul mannal su isseoyo?',
        englishMeaning: 'Can we meet today?',
      },
      {
        id: 'd7-3',
        koreanText: '곧 만나요',
        romanization: 'got mannayo',
        englishMeaning: 'See you soon',
      },
      {
        id: 'd7-4',
        koreanText: '보고 싶어',
        romanization: 'bogo sipeo',
        englishMeaning: 'I miss you (casual)',
      },
      {
        id: 'd7-5',
        koreanText: '좋은 하루 보내요',
        romanization: 'joeun haru bonaeyo',
        englishMeaning: 'Have a good day',
      },
    ],
  },
];

const STICKER_GLYPHS = {
  wave: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 28c0-3 2-5 5-5s5 2 5 5v8" />
      <path d="M26 22c0-3 2-5 5-5s5 2 5 5v14" />
      <path d="M36 26c0-3 2-5 5-5s5 2 5 5v6c0 7-5 12-12 12s-12-5-12-12" />
    </g>
  ),
  heart: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M32 44s-13-7-13-17a7 7 0 0113-3 7 7 0 0113 3c0 10-13 17-13 17z" />
    </g>
  ),
  bowl: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 32h36" />
      <path d="M16 32c0 9 7 14 16 14s16-5 16-14" />
      <path d="M26 22c-1 3 1 4 0 6M32 19c-1 3 1 4 0 6M38 22c-1 3 1 4 0 6" />
    </g>
  ),
  chat: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M14 22a4 4 0 014-4h22a4 4 0 014 4v12a4 4 0 01-4 4h-8l-7 6v-6h-7a4 4 0 01-4-4z" />
      <circle cx="24" cy="28" r="1.2" fill="currentColor" />
      <circle cx="30" cy="28" r="1.2" fill="currentColor" />
      <circle cx="36" cy="28" r="1.2" fill="currentColor" />
    </g>
  ),
  family: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="22" cy="22" r="5" />
      <circle cx="42" cy="22" r="5" />
      <path d="M12 44c1-7 7-12 14-12s8 3 8 7" />
      <path d="M30 44c0-4 4-7 8-7 7 0 13 5 14 12" />
    </g>
  ),
  flower: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="4" />
      <path d="M32 14a6 6 0 010 12M32 38a6 6 0 010 12M14 32a6 6 0 0112 0M38 32a6 6 0 0112 0" />
    </g>
  ),
  star: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M32 14l5 11 12 1-9 8 3 12-11-7-11 7 3-12-9-8 12-1z" />
    </g>
  ),
  target: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="32" cy="32" r="14" />
      <circle cx="32" cy="32" r="9" />
      <circle cx="32" cy="32" r="4" />
      <circle cx="32" cy="32" r="1.5" fill="currentColor" />
    </g>
  ),
  crown: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M14 38l4-16 8 10 6-14 6 14 8-10 4 16z" />
      <path d="M14 38h36v6H14z" />
      <circle cx="22" cy="22" r="1.4" fill="currentColor" />
      <circle cx="32" cy="18" r="1.4" fill="currentColor" />
      <circle cx="42" cy="22" r="1.4" fill="currentColor" />
    </g>
  ),
  flame: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M32 14c-4 6-9 10-9 17 0 7 4 13 9 13s9-6 9-13c0-3-1-5-3-7-1 3-3 5-5 5 1-5-1-10-1-15z" />
      <path d="M30 36c0 3 1 5 2 6 1-1 2-3 2-6" />
    </g>
  ),
};

const Sticker = ({ type, palette }) => {
  const tone = palette || ACCENT_PALETTE[0];
  return (
    <span
      className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
      style={{ backgroundColor: tone.bg, color: tone.ink }}
    >
      <svg viewBox="0 0 64 64" className="h-9 w-9">
        {STICKER_GLYPHS[type] || STICKER_GLYPHS.star}
      </svg>
    </span>
  );
};

const TigerMark = ({ size = 36 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <circle cx="32" cy="34" r="20" fill="#ec6a4d" />
    <path d="M21 25c-1-3 1-6 4-6l4 5z" fill="#ec6a4d" />
    <path d="M43 25c1-3-1-6-4-6l-4 5z" fill="#ec6a4d" />
    <path d="M24 22l4 4-2 2z" fill="#fbf7ef" />
    <path d="M40 22l-4 4 2 2z" fill="#fbf7ef" />
    <path d="M18 33c2-1 5-1 7 0M39 33c2-1 5-1 7 0" stroke="#1f1812" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    <circle cx="26" cy="33" r="2.2" fill="#1f1812" />
    <circle cx="38" cy="33" r="2.2" fill="#1f1812" />
    <ellipse cx="32" cy="40" rx="3" ry="2" fill="#1f1812" />
    <path d="M32 42v3M28 44c0 2 4 2 4 0M36 44c0 2-4 2-4 0" stroke="#1f1812" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);

const PaletteSwatch = ({ palette, label }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide"
    style={{ backgroundColor: palette.bg, color: palette.ink }}
  >
    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette.dot }} />
    {label}
  </span>
);

const BadgeMedal = ({ id, earnedAt, size = 'md' }) => {
  const def = BADGES[id];
  if (!def) return null;
  const palette = ACCENT_PALETTE[def.paletteIdx % ACCENT_PALETTE.length];
  const dim = size === 'lg' ? 'h-16 w-16' : size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
  const glyphSize = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className={`${dim} relative inline-flex items-center justify-center rounded-2xl ${earnedAt ? '' : 'opacity-35'}`}
        style={{ backgroundColor: palette.bg, color: palette.ink }}
      >
        <svg viewBox="0 0 64 64" className={glyphSize} aria-hidden="true">
          {STICKER_GLYPHS[def.glyph] || STICKER_GLYPHS.star}
        </svg>
        {earnedAt && (
          <span
            className="absolute -bottom-1 -right-1 inline-block h-3 w-3 rounded-full ring-2 ring-white"
            style={{ backgroundColor: '#88a06c' }}
          />
        )}
      </div>
      {size !== 'sm' && (
        <p className="text-[11px] font-semibold leading-tight text-ink-700">{def.name}</p>
      )}
    </div>
  );
};

const ScoreBar = ({ score, label }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier = describeScore(score);
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: tier.color }}
        />
      </div>
      <span
        className="font-display text-[15px] font-semibold tabular-nums leading-none"
        style={{ color: tier.color }}
      >
        {clamped}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: tier.color }}>
        {label || tier.label}
      </span>
    </div>
  );
};

const LevelChip = ({ levelInfo, compact = false }) => {
  const widthPct = Math.round(levelInfo.progress * 100);
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1"
      style={{ backgroundColor: '#fdeee7' }}
    >
      <span
        className="font-display inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold"
        style={{ backgroundColor: '#ec6a4d', color: '#fff8f0' }}
        aria-hidden="true"
      >
        {levelInfo.level}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[13px] font-semibold text-ink-900">
          {levelInfo.ko}
        </span>
        {!compact && (
          <span className="text-[10px] tracking-wide text-ink-500">
            {levelInfo.xp} xp · {levelInfo.next === Infinity ? 'max' : `${levelInfo.next - levelInfo.xp} to ${levelFor(levelInfo.next).ko}`}
          </span>
        )}
      </span>
      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full sm:inline-block" style={{ backgroundColor: '#fbd9c8' }}>
        <span
          className="block h-full rounded-full transition-all duration-500"
          style={{ width: `${widthPct}%`, backgroundColor: '#ec6a4d' }}
        />
      </span>
    </div>
  );
};

const Toast = ({ toast, onDismiss }) => {
  const palette = toast.kind === 'badge' ? ACCENT_PALETTE[0] : ACCENT_PALETTE[1];
  const Icon = toast.kind === 'badge' ? Trophy : Sparkles;
  return (
    <div
      role="status"
      className="surface flex items-center gap-3 px-4 py-3 animate-in"
      style={{ borderLeft: `3px solid ${palette.dot}` }}
    >
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: palette.bg, color: palette.ink }}
      >
        <Icon size={18} />
      </span>
      <div className="flex-1 leading-tight">
        <p className="font-display text-[14px] font-semibold text-ink-900">{toast.title}</p>
        {toast.body && <p className="text-[12px] text-ink-500">{toast.body}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 rounded-full p-1 text-ink-300 transition hover:text-ink-700"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

const StudentGroupManager = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [activeDayId, setActiveDayId] = useState(null);
  const [generatedPhrases, setGeneratedPhrases] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.generated) || '[]')
  );
  const [customInput, setCustomInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recordings, setRecordings] = useState({});
  const [practiceHistory, setPracticeHistory] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]')
  );
  const [streak, setStreak] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.streak) || '{"count":0,"lastDate":""}')
  );
  const [practicedToday, setPracticedToday] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.practiced) || '{}')
  );

  const [xp, setXp] = useState(() => loadXp());
  const [badges, setBadges] = useState(() => loadBadges());
  const [scores, setScores] = useState(() => loadScores());
  const [toasts, setToasts] = useState([]);
  // Per-phrase scoring state. Shape: { [phraseId]: { score, transcript, status } }
  const [phraseFeedback, setPhraseFeedback] = useState({});
  const sessionPerfectsRef = useRef(0);

  const speech = useSpeechRecognition({ lang: 'ko-KR' });

  const meetingDate = useMemo(() => computeMeetingDate(), []);
  const days = useMemo(() => daysUntil(meetingDate), [meetingDate]);
  const todayKey = getTodayKey();

  const currentDayIndex = useMemo(() => {
    if (days <= 0) return DAY_PLAN.length - 1;
    if (days > 7) return 0;
    return 7 - days;
  }, [days]);

  const levelInfo = useMemo(() => levelFor(xp), [xp]);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const currentRecordingPhraseIdRef = useRef('');
  const fallbackRecordingRef = useRef(false);

  const wildcardPhrases = useMemo(() => buildParentsPhrases(), []);

  const allPhrases = useMemo(() => {
    const curated = DAY_PLAN.flatMap((day) =>
      day.phrases.map((phrase) => ({
        ...phrase,
        source: 'curated',
        category: `${day.label} · ${day.theme}`,
      }))
    );
    const wild = wildcardPhrases.map((phrase) => ({
      ...phrase,
      source: 'curated',
      category: 'Impress Parents',
    }));
    const generated = generatedPhrases.map((phrase) => ({
      ...phrase,
      source: 'generated',
      category: 'Custom',
    }));
    return [...generated, ...curated, ...wild];
  }, [generatedPhrases, wildcardPhrases]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return generatedPhrases.map((phrase) => ({ ...phrase, category: 'Custom' }));
    return allPhrases
      .filter(
        (phrase) =>
          phrase.englishMeaning.toLowerCase().includes(q) ||
          phrase.koreanText.toLowerCase().includes(q) ||
          phrase.romanization.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [allPhrases, generatedPhrases, searchQuery]);

  const pushToast = (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next = { id, ...toast };
    setToasts((prev) => [next, ...prev].slice(0, 3));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const awardXp = (amount, label) => {
    if (!amount) return null;
    let nextLevelInfo = null;
    setXp((prev) => {
      const previousLevel = levelFor(prev).level;
      const nextValue = Math.max(0, prev + amount);
      const nextLevel = levelFor(nextValue).level;
      persistXp(nextValue);
      if (nextLevel > previousLevel) {
        nextLevelInfo = levelFor(nextValue);
      }
      return nextValue;
    });
    pushToast({ kind: 'xp', title: `+${amount} xp · ${label}` });
    if (nextLevelInfo) {
      setTimeout(() => {
        pushToast({
          kind: 'badge',
          title: `Level ${nextLevelInfo.level} · ${nextLevelInfo.ko}`,
          body: `You earned the title "${nextLevelInfo.en}".`,
        });
      }, 600);
    }
    return amount;
  };

  const awardBadge = (id) => {
    if (!BADGES[id] || badges[id]) return false;
    const nowISO = new Date().toISOString();
    setBadges((prev) => {
      if (prev[id]) return prev;
      const next = { ...prev, [id]: nowISO };
      persistBadges(next);
      return next;
    });
    pushToast({
      kind: 'badge',
      title: `Badge unlocked · ${BADGES[id].name}`,
      body: BADGES[id].desc,
    });
    return true;
  };

  const speakPhrase = (text) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    trackEvent('phrase_listened', { text });
    if (!badges.echo) awardBadge('echo');
  };

  const playRecording = (phraseId) => {
    const url = recordings[phraseId];
    if (!url) return;
    const audio = new Audio(url);
    audio.play();
  };

  const markPracticed = (phraseId) => {
    const updated = { ...practicedToday, [phraseId]: todayKey };
    setPracticedToday(updated);
    localStorage.setItem(STORAGE_KEYS.practiced, JSON.stringify(updated));
    return updated;
  };

  const finalizePractice = (phraseId, { score = null, transcript = null } = {}) => {
    const phrase = allPhrases.find((item) => item.id === phraseId);
    if (!phrase) return;

    const reward = xpForScore(score);
    awardXp(reward.amount, reward.label);

    const updatedHistory = [
      {
        phraseId,
        koreanText: phrase.koreanText,
        score,
        transcript,
        createdAt: new Date().toISOString(),
      },
      ...practiceHistory,
    ].slice(0, 60);
    setPracticeHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updatedHistory));

    if (score != null) {
      setScores((prev) => {
        const next = recordScore(prev, phraseId, score);
        persistScores(next);
        return next;
      });
    }

    const updatedStreak = updateStreak();
    setStreak(updatedStreak);
    localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(updatedStreak));
    if (updatedStreak.count >= 3) awardBadge('streak3');
    if (updatedStreak.count >= 7) awardBadge('streak7');

    if (!badges.mirror) awardBadge('mirror');
    if (score != null && score >= 90) {
      awardBadge('perfect');
      sessionPerfectsRef.current += 1;
      if (sessionPerfectsRef.current >= 3) awardBadge('bullseye');
    } else if (score != null && score < 70) {
      sessionPerfectsRef.current = 0;
    }

    const updatedPracticed = markPracticed(phraseId);

    DAY_PLAN.forEach((day, idx) => {
      const allDone = day.phrases.every((p) => updatedPracticed[p.id] === todayKey);
      if (allDone) {
        if (idx === 0) awardBadge('day1');
        if (idx === DAY_PLAN.length - 1) awardBadge('day7');
      }
    });

    const parentsPracticed = wildcardPhrases
      .slice(0, 30)
      .filter((p) => updatedPracticed[p.id] === todayKey).length;
    if (parentsPracticed >= 10) awardBadge('parents10');

    trackEvent('practice_recorded', { phraseId, score });
  };

  // Effect: when speech recognition transitions to "done" or "error", evaluate.
  useEffect(() => {
    if (!speech.activeId) return;
    if (speech.status !== 'done' && speech.status !== 'error') return;

    const phraseId = speech.activeId;
    const phrase = allPhrases.find((item) => item.id === phraseId);
    if (!phrase) {
      speech.reset();
      return;
    }

    if (speech.status === 'error') {
      setPhraseFeedback((prev) => ({
        ...prev,
        [phraseId]: { status: 'error', error: speech.error || 'recognition_error' },
      }));
      speech.reset();
      return;
    }

    const result = scorePronunciation(phrase.koreanText, speech.transcript);
    if (!result) {
      speech.reset();
      return;
    }

    setPhraseFeedback((prev) => ({
      ...prev,
      [phraseId]: {
        status: 'scored',
        score: result.score,
        transcript: speech.transcript,
        target: result.target,
      },
    }));
    finalizePractice(phraseId, { score: result.score, transcript: speech.transcript });
    speech.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.status, speech.activeId]);

  const startRepeat = async (phraseId) => {
    sessionPerfectsRef.current = 0;
    fallbackRecordingRef.current = false;
    setPhraseFeedback((prev) => ({ ...prev, [phraseId]: { status: 'listening' } }));
    if (speech.isSupported) {
      const ok = speech.start(phraseId);
      if (ok) return;
    }
    // Fallback: MediaRecorder, no scoring, just store playback.
    fallbackRecordingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      currentRecordingPhraseIdRef.current = phraseId;
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => ({ ...prev, [phraseId]: url }));
        finalizePractice(phraseId);
        setPhraseFeedback((prev) => ({
          ...prev,
          [phraseId]: { status: 'recorded', score: null, transcript: null },
        }));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
    } catch (error) {
      console.error('Microphone access failed', error);
      setPhraseFeedback((prev) => ({
        ...prev,
        [phraseId]: { status: 'error', error: 'permission' },
      }));
      pushToast({
        kind: 'badge',
        title: 'Microphone needed',
        body: 'Allow microphone access to practice speaking.',
      });
    }
  };

  const stopRepeat = () => {
    if (fallbackRecordingRef.current && mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      return;
    }
    speech.stop();
  };

  const retryFeedback = (phraseId) => {
    setPhraseFeedback((prev) => {
      const next = { ...prev };
      delete next[phraseId];
      return next;
    });
    speech.reset();
  };

  const generatePhrase = () => {
    const phrase = buildGeneratedPhrase(customInput);
    if (!phrase) return;
    const item = { id: `generated-${Date.now()}`, ...phrase, prompt: customInput.trim() };
    const updated = [item, ...generatedPhrases].slice(0, 30);
    setGeneratedPhrases(updated);
    localStorage.setItem(STORAGE_KEYS.generated, JSON.stringify(updated));
    trackEvent('phrase_generated', { input: customInput.trim() });
    setCustomInput('');
    setSearchQuery(item.englishMeaning);
  };

  const dayProgress = (day) => {
    const total = day.phrases.length;
    const done = day.phrases.filter((p) => practicedToday[p.id] === todayKey).length;
    return { total, done };
  };

  const renderPhraseCard = (phrase, palette) => {
    const tone = palette || ACCENT_PALETTE[0];
    const isPracticed = practicedToday[phrase.id] === todayKey;
    const hasRecording = Boolean(recordings[phrase.id]);
    const feedback = phraseFeedback[phrase.id];
    const phraseScore = scores[phrase.id];
    const isActiveRepeat =
      (speech.activeId === phrase.id && speech.isListening) ||
      feedback?.status === 'listening';
    const liveTranscript = isActiveRepeat
      ? (speech.transcript || speech.interim || '')
      : '';
    return (
      <article
        key={`${phrase.id}-${phrase.category}`}
        className="surface relative animate-in p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <PaletteSwatch palette={tone} label={phrase.category} />
          <div className="flex items-center gap-1.5">
            {phraseScore?.best > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums"
                style={{
                  backgroundColor: describeScore(phraseScore.best).color + '22',
                  color: describeScore(phraseScore.best).color,
                }}
                title={`Best score: ${phraseScore.best}`}
              >
                <Trophy size={10} /> {phraseScore.best}
              </span>
            )}
            {isPracticed && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                style={{ backgroundColor: '#eef2e6', color: '#4f6840' }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#88a06c' }} />
                today
              </span>
            )}
          </div>
        </div>

        <h3 className="font-display mt-3 text-[28px] font-semibold leading-[1.1] text-ink-900">
          {phrase.koreanText}
        </h3>
        <p className="mt-1.5 text-[13px] font-medium tracking-[0.04em] text-ink-500">
          {phrase.romanization}
        </p>
        <p className="mt-2 text-[15px] leading-snug text-ink-700">{phrase.englishMeaning}</p>

        {phrase.note && (
          <p
            className="font-display-italic mt-3 rounded-2xl px-3 py-2 text-[13px] leading-snug"
            style={{ backgroundColor: '#f8efe1', color: '#5a4731' }}
          >
            {phrase.note}
          </p>
        )}

        {isActiveRepeat && (
          <div
            className="mt-3 rounded-2xl border px-4 py-3"
            style={{ borderColor: '#fbd9c8', backgroundColor: '#fdf3ec' }}
          >
            <div className="flex items-center gap-2">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full" style={{ backgroundColor: '#ec6a4d', opacity: 0.6 }} />
                <span className="relative inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#ec6a4d' }} />
              </span>
              <span className="label-eyebrow">Listening · ko-KR</span>
            </div>
            <p className="font-display mt-2 min-h-[28px] text-[20px] leading-snug text-ink-900">
              {liveTranscript || (
                <span className="font-display-italic text-ink-300">Speak now…</span>
              )}
            </p>
          </div>
        )}

        {feedback?.status === 'scored' && (
          <div className="mt-3 rounded-2xl border border-cream-200 px-4 py-3">
            <ScoreBar score={feedback.score} />
            <div className="mt-2 flex items-baseline gap-2 text-[12.5px]">
              <span className="label-eyebrow text-[10px]">You said</span>
              <span className="font-display text-ink-900">
                {feedback.transcript || <span className="text-ink-300">(silence)</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => retryFeedback(phrase.id)}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-ink-500 hover:text-ink-900"
            >
              <RotateCcw size={12} /> Try again
            </button>
          </div>
        )}

        {feedback?.status === 'error' && (
          <div
            className="mt-3 rounded-2xl px-4 py-3 text-[13px]"
            style={{ backgroundColor: '#fdeee7', color: '#a8412c' }}
          >
            {feedback.error === 'no-speech'
              ? "Didn't hear anything. Try once more."
              : feedback.error === 'permission'
                ? 'Microphone permission was blocked.'
                : 'Recognition stopped early. Tap Repeat to try again.'}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={() => speakPhrase(phrase.koreanText)} className="btn-primary">
            <Play size={14} fill="currentColor" /> Listen
          </button>
          {!isActiveRepeat ? (
            <button onClick={() => startRepeat(phrase.id)} className="btn-coral">
              <Mic size={14} /> Repeat
            </button>
          ) : (
            <button onClick={stopRepeat} className="btn-coral">
              <Square size={12} fill="currentColor" /> Stop
            </button>
          )}
          {hasRecording && (
            <button
              onClick={() => playRecording(phrase.id)}
              className="btn-ghost"
              title="Play your recording"
            >
              <StickyNote size={14} /> Mine
            </button>
          )}
        </div>

        {!speech.isSupported && (
          <p className="mt-3 text-[11px] text-ink-300">
            <span className="font-display-italic">Note:</span> live scoring needs Chrome or iOS Safari 14.5+. We'll record your voice instead.
          </p>
        )}
      </article>
    );
  };

  const renderCountdown = () => {
    const inWindow = days >= 0 && days <= 7;
    const headline =
      days < 0
        ? 'Done'
        : days === 0
          ? 'Today'
          : `D−${days}`;
    const headlineSub =
      days < 0
        ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} since`
        : days === 0
          ? 'Speak softly. Speak slowly.'
          : days > 7
            ? `Plan unlocks in ${days - 7}`
            : `Day ${currentDayIndex + 1} of 7`;

    return (
      <section className="surface relative animate-in overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="label-eyebrow">Survival Korean</p>
            <h1 className="font-display mt-1 text-[26px] font-semibold leading-[1.05] text-ink-900">
              Seven calm days
              <br />
              <span className="font-display-italic text-coral-500">until you meet her parents.</span>
            </h1>
          </div>
          <span className="inline-flex shrink-0 animate-drift" aria-hidden="true">
            <TigerMark size={48} />
          </span>
        </div>

        <div className="mt-6 flex items-end gap-4">
          <div
            className="font-display text-[88px] font-semibold leading-none tracking-tight text-ink-900"
            style={{ fontFeatureSettings: '"ss01","tnum"' }}
          >
            {headline}
          </div>
          <div className="pb-2">
            <p className="text-[13px] font-medium text-ink-500">{headlineSub}</p>
            <p className="mt-0.5 text-[12px] text-ink-300">{formatLongDate(meetingDate)}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1.5">
          {DAY_PLAN.map((day, idx) => {
            const isCurrent = inWindow && idx === currentDayIndex;
            const isPast = inWindow && idx < currentDayIndex;
            return (
              <button
                key={day.id}
                onClick={() => {
                  setActiveDayId(day.id);
                  setActiveTab('day');
                }}
                className="group relative h-1.5 flex-1 rounded-full transition"
                style={{
                  backgroundColor: isCurrent ? '#ec6a4d' : isPast ? '#f3a387' : '#ecdfc6',
                }}
                aria-label={`Open ${day.label}: ${day.theme}`}
              />
            );
          })}
        </div>

        {inWindow && (
          <button
            onClick={() => {
              setActiveDayId(DAY_PLAN[currentDayIndex].id);
              setActiveTab('day');
            }}
            className="btn-primary mt-5"
          >
            Open Day {currentDayIndex + 1} <ArrowUpRight size={14} />
          </button>
        )}
      </section>
    );
  };

  const renderHome = () => (
    <div className="space-y-6">
      {renderCountdown()}

      <section className="animate-in delay-50">
        <div className="mb-3 flex items-end justify-between px-1">
          <div>
            <p className="label-eyebrow">The Plan</p>
            <h2 className="font-display mt-0.5 text-[22px] font-semibold leading-tight text-ink-900">
              Seven days, seven moods
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DAY_PLAN.map((day, idx) => {
            const { total, done } = dayProgress(day);
            const isCurrent = days >= 0 && days <= 7 && idx === currentDayIndex;
            const palette = ACCENT_PALETTE[idx % ACCENT_PALETTE.length];
            return (
              <button
                key={day.id}
                onClick={() => {
                  setActiveDayId(day.id);
                  setActiveTab('day');
                }}
                className="group surface relative flex flex-col items-start p-4 text-left transition hover:-translate-y-0.5"
              >
                <Sticker type={day.sticker} palette={palette} />
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-ink-500">
                    {day.label}
                  </span>
                  {isCurrent && (
                    <span
                      className="inline-flex h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: '#ec6a4d' }}
                      aria-label="Today"
                    />
                  )}
                </div>
                <p className="font-display mt-1 text-[17px] font-semibold leading-tight text-ink-900">
                  {day.theme}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">
                  {day.subtitle}
                </p>
                <div className="mt-3 flex w-full items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: palette.tint }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${total ? (done / total) * 100 : 0}%`,
                        backgroundColor: palette.dot,
                      }}
                    />
                  </div>
                  <span className="text-[10.5px] font-medium text-ink-500 tabular-nums">
                    {done}/{total}
                  </span>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => setActiveTab('wildcard')}
            className="surface group relative col-span-2 flex items-center gap-4 p-4 text-left transition hover:-translate-y-0.5"
          >
            <Sticker type="family" palette={ACCENT_PALETTE[5]} />
            <div className="flex-1">
              <p className="label-eyebrow">Wildcard</p>
              <p className="font-display mt-0.5 text-[17px] font-semibold leading-tight text-ink-900">
                100 lines for her parents
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                Formal, kind, never overconfident.
              </p>
            </div>
            <ArrowUpRight size={18} className="text-ink-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </section>

      <section className="animate-in delay-100 surface-soft p-5">
        <p className="label-eyebrow">Tonight's note</p>
        <p className="font-display-italic mt-2 text-[17px] leading-snug text-ink-700">
          “The win isn't memorizing fifty lines. It's saying three lines slowly,
          with eye contact, and meaning every syllable.”
        </p>
      </section>
    </div>
  );

  const renderDay = () => {
    const dayIndex = DAY_PLAN.findIndex((d) => d.id === activeDayId);
    const resolvedIndex = dayIndex === -1 ? currentDayIndex : dayIndex;
    const day = DAY_PLAN[resolvedIndex];
    const palette = ACCENT_PALETTE[resolvedIndex % ACCENT_PALETTE.length];
    const { total, done } = dayProgress(day);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft size={14} /> Back to plan
        </button>

        <section className="surface animate-in p-6">
          <div className="flex items-start gap-4">
            <Sticker type={day.sticker} palette={palette} />
            <div className="flex-1">
              <p className="label-eyebrow">{day.label}</p>
              <h2 className="font-display mt-1 text-[28px] font-semibold leading-tight text-ink-900">
                {day.theme}
              </h2>
              <p className="mt-1 text-[14px] text-ink-500">{day.subtitle}</p>
            </div>
          </div>

          <p
            className="font-display-italic mt-5 rounded-2xl px-4 py-3 text-[15px] leading-snug"
            style={{ backgroundColor: palette.bg, color: palette.ink }}
          >
            “{day.mission}”
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: palette.tint }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${total ? (done / total) * 100 : 0}%`,
                  backgroundColor: palette.dot,
                }}
              />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-ink-500">
              {done}/{total} today
            </span>
          </div>
        </section>

        <section className="space-y-3">
          {day.phrases.map((phrase, idx) => (
            <div key={phrase.id} className="animate-in" style={{ animationDelay: `${idx * 40}ms` }}>
              {renderPhraseCard({ ...phrase, category: day.theme }, palette)}
            </div>
          ))}
        </section>
      </div>
    );
  };

  const renderCustom = () => {
    const customPalette = ACCENT_PALETTE[3];
    return (
      <section className="space-y-4">
        <div className="surface animate-in p-6">
          <p className="label-eyebrow">Phrasebook</p>
          <h2 className="font-display mt-1 text-[24px] font-semibold leading-tight text-ink-900">
            Search anything you might say
          </h2>
          <p className="mt-1 text-[13px] text-ink-500">
            Try a feeling, a situation, a single word. We'll find the closest line.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-1" style={{ backgroundColor: '#f5ecdc' }}>
            <Search size={16} className="text-ink-500" />
            <input
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. it was nice meeting you"
              className="w-full bg-transparent py-2.5 text-[14px] text-ink-900 outline-none placeholder:text-ink-300"
            />
          </div>

          <div className="mt-4 border-t border-cream-200 pt-4">
            <p className="label-eyebrow">If we don't have it</p>
            <div className="mt-2 flex items-center gap-2 rounded-2xl px-4 py-1" style={{ backgroundColor: '#fdeee7' }}>
              <Compass size={16} style={{ color: '#a8412c' }} />
              <input
                id="custom-input"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Type an English sentence"
                className="w-full bg-transparent py-2.5 text-[14px] text-ink-900 outline-none placeholder:text-ink-300"
              />
            </div>
            <button onClick={generatePhrase} className="btn-coral mt-3" disabled={!customInput.trim()}>
              Translate it <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {searchResults.length === 0 ? (
          <div className="surface-soft p-5 text-[13.5px] text-ink-500">
            Try searching <span className="font-display-italic text-ink-700">“meeting parents”</span>,
            {' '}
            <span className="font-display-italic text-ink-700">“I miss you”</span>, or generate one above.
          </div>
        ) : (
          searchResults.map((phrase, idx) => (
            <div key={phrase.id} className="animate-in" style={{ animationDelay: `${idx * 30}ms` }}>
              {renderPhraseCard(phrase, customPalette)}
            </div>
          ))
        )}
      </section>
    );
  };

  const renderWildcard = () => {
    const palette = ACCENT_PALETTE[5];
    return (
      <section className="space-y-4">
        <div className="surface animate-in p-6">
          <div className="flex items-start gap-4">
            <Sticker type="family" palette={palette} />
            <div className="flex-1">
              <p className="label-eyebrow">Wildcard pack</p>
              <h2 className="font-display mt-1 text-[24px] font-semibold leading-tight text-ink-900">
                100 lines for her parents
              </h2>
              <p className="mt-1 text-[13px] text-ink-500">
                Calm, polite, never overconfident. Pick three you can actually say.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {wildcardPhrases.slice(0, 30).map((phrase, idx) => (
            <div key={phrase.id} className="animate-in" style={{ animationDelay: `${idx * 25}ms` }}>
              {renderPhraseCard({ ...phrase, category: 'Parents' }, palette)}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderProgress = () => {
    const earnedBadges = Object.entries(badges)
      .map(([id, earnedAt]) => ({ id, earnedAt }))
      .filter((b) => Boolean(BADGES[b.id]));
    const earnedIds = new Set(earnedBadges.map((b) => b.id));
    const remainingBadges = Object.values(BADGES).filter((b) => !earnedIds.has(b.id));
    const widthPct = Math.round(levelInfo.progress * 100);
    const xpToNext = levelInfo.next === Infinity ? 0 : levelInfo.next - levelInfo.xp;
    const totalAttempts = Object.values(scores).reduce((sum, s) => sum + (s.attempts || 0), 0);
    const bestScores = Object.values(scores).map((s) => s.best || 0);
    const avgBest = bestScores.length
      ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length)
      : 0;

    return (
      <section className="space-y-4">
        <div className="surface animate-in p-6">
          <p className="label-eyebrow">Progress</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <p
                className="font-display text-[44px] font-semibold leading-none text-ink-900"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                {levelInfo.ko}
              </p>
              <p className="mt-1 text-[12.5px] tracking-wide text-ink-500">
                Level {levelInfo.level} · {levelInfo.en}
              </p>
            </div>
            <div className="text-right">
              <p
                className="font-display text-[28px] font-semibold tabular-nums leading-none"
                style={{ color: '#ec6a4d' }}
              >
                {levelInfo.xp}
              </p>
              <p className="mt-0.5 text-[11px] tracking-wide text-ink-500">total xp</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: '#fbd9c8' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${widthPct}%`, backgroundColor: '#ec6a4d' }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-ink-500">
              {xpToNext > 0
                ? `${xpToNext} xp until ${levelFor(levelInfo.next).ko} (${levelFor(levelInfo.next).en})`
                : 'Top tier · keep speaking softly.'}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl px-3 py-2.5" style={{ backgroundColor: '#f5ecdc' }}>
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink-500">Streak</p>
              <p className="font-display mt-0.5 text-[22px] font-semibold tabular-nums leading-none text-ink-900">
                {streak.count}d
              </p>
            </div>
            <div className="rounded-2xl px-3 py-2.5" style={{ backgroundColor: '#eef2e6' }}>
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink-500">Avg best</p>
              <p className="font-display mt-0.5 text-[22px] font-semibold tabular-nums leading-none text-ink-900">
                {avgBest || '—'}
              </p>
            </div>
            <div className="rounded-2xl px-3 py-2.5" style={{ backgroundColor: '#e8eef0' }}>
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink-500">Tries</p>
              <p className="font-display mt-0.5 text-[22px] font-semibold tabular-nums leading-none text-ink-900">
                {totalAttempts}
              </p>
            </div>
          </div>
        </div>

        <div className="surface animate-in delay-50 p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="label-eyebrow">Badges</p>
              <h3 className="font-display mt-0.5 text-[20px] font-semibold leading-tight text-ink-900">
                {earnedBadges.length} of {Object.keys(BADGES).length} unlocked
              </h3>
            </div>
          </div>

          {earnedBadges.length === 0 && (
            <p className="mt-3 text-[13px] text-ink-500">
              No badges yet. Tap <span className="font-display-italic text-ink-700">Listen</span> or{' '}
              <span className="font-display-italic text-ink-700">Repeat</span> on any phrase to start unlocking.
            </p>
          )}

          <div className="mt-4 grid grid-cols-4 gap-3">
            {earnedBadges.map((b) => (
              <BadgeMedal key={b.id} id={b.id} earnedAt={b.earnedAt} />
            ))}
            {remainingBadges.map((b) => (
              <BadgeMedal key={b.id} id={b.id} earnedAt={null} />
            ))}
          </div>
        </div>

        <div className="surface animate-in delay-100 p-6">
          <p className="label-eyebrow">Diary</p>
          <h3 className="font-display mt-0.5 text-[20px] font-semibold leading-tight text-ink-900">
            What you've practiced
          </h3>
          {practiceHistory.length === 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <TigerMark size={36} />
              <p className="text-[13px] text-ink-500">
                Nothing yet. Tap <span className="font-display-italic text-ink-700">Repeat</span> on a phrase to start your diary.
              </p>
            </div>
          ) : (
            <div className="-mx-2 mt-3 divide-y divide-cream-200">
              {practiceHistory.slice(0, 25).map((item, index) => {
                const tier = item.score != null ? describeScore(item.score) : null;
                return (
                  <div
                    key={`${item.phraseId}-${index}`}
                    className="flex items-center gap-3 px-2 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-display truncate text-[16px] font-semibold leading-tight text-ink-900">
                        {item.koreanText}
                      </p>
                      <p className="mt-0.5 text-[11px] tracking-wide text-ink-300">
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {item.score != null && tier && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                        style={{ backgroundColor: tier.color + '22', color: tier.color }}
                      >
                        <Trophy size={10} /> {item.score}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  };

  const navItems = [
    { id: 'home', label: 'Today', icon: Compass },
    { id: 'custom', label: 'Phrasebook', icon: Search },
    { id: 'wildcard', label: 'Parents', icon: Library },
    { id: 'progress', label: 'Progress', icon: Trophy },
  ];

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[440px] pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 rounded-2xl"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: '#fdeee7' }}>
            <TigerMark size={28} />
          </span>
          <div className="text-left">
            <p className="font-display text-[15px] font-semibold leading-tight text-ink-900">
              Survival Korean
            </p>
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-500">
              Quiet coach
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className="flex items-center gap-1.5"
          aria-label="Open progress"
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            style={{ backgroundColor: '#fdeee7', color: '#a8412c' }}
            title={streak.count > 0 ? `${streak.count}-day streak` : 'Start a streak by practicing today'}
          >
            <Flame size={12} />
            <span className="tabular-nums">{streak.count > 0 ? `${streak.count}d` : 'new'}</span>
          </span>
          <LevelChip levelInfo={levelInfo} compact />
        </button>
      </header>

      {toasts.length > 0 && (
        <div className="pointer-events-auto fixed left-1/2 top-3 z-30 flex w-[min(calc(100%-1.5rem),420px)] -translate-x-1/2 flex-col gap-2">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}

      <main className="px-4">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'day' && renderDay()}
        {activeTab === 'custom' && renderCustom()}
        {activeTab === 'wildcard' && renderWildcard()}
        {activeTab === 'progress' && renderProgress()}
      </main>

      <nav
        className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2"
        style={{ width: 'min(calc(100% - 1.5rem), 420px)' }}
      >
        <div
          className="flex items-center gap-1 rounded-full p-1.5"
          style={{
            backgroundColor: 'rgba(31, 24, 18, 0.92)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 32px -8px rgba(31, 24, 18, 0.4)',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'home' && activeTab === 'day');
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="group flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[12px] font-medium transition"
                style={{
                  backgroundColor: isActive ? '#ec6a4d' : 'transparent',
                  color: isActive ? '#fff8f0' : 'rgba(253, 246, 234, 0.62)',
                }}
              >
                <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
                <span className={isActive ? 'inline' : 'hidden sm:inline'}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default StudentGroupManager;

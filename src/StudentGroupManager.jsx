import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarHeart,
  Flame,
  Mic,
  Pause,
  Play,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';

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

const Sticker = ({ type }) => {
  const common = 'h-14 w-14 drop-shadow-sm';
  if (type === 'wave') {
    return (
      <svg viewBox="0 0 64 64" className={common}>
        <circle cx="32" cy="32" r="28" fill="#fde9ef" />
        <path
          d="M22 38c4 4 12 4 18-1l4-4c1.5-1.5 1-3-1-4l-7 7-2-2 5-5c1.5-1.5 1-3-1-4l-7 7-2-2 4-4c1.5-1.5 1-3-1-4l-12 12c-3 3-2 7 2 4z"
          fill="#f59ab3"
        />
      </svg>
    );
  }
  if (type === 'heart') {
    return (
      <svg viewBox="0 0 64 64" className={common}>
        <circle cx="32" cy="32" r="28" fill="#fbe7ee" />
        <path
          d="M32 47s-13-8-13-18a8 8 0 0113-6 8 8 0 0113 6c0 10-13 18-13 18z"
          fill="#f08fb0"
        />
        <circle cx="20" cy="20" r="2.5" fill="#fbcedb" />
        <circle cx="46" cy="22" r="2" fill="#fbcedb" />
      </svg>
    );
  }
  if (type === 'bowl') {
    return (
      <svg viewBox="0 0 64 64" className={common}>
        <circle cx="32" cy="32" r="28" fill="#fff1d6" />
        <path d="M14 36h36c0 8-8 14-18 14s-18-6-18-14z" fill="#f4a05a" />
        <ellipse cx="32" cy="36" rx="18" ry="3" fill="#fde2c0" />
        <path d="M28 22c0 5 4 5 4 0M36 24c0 4 3 4 3 0M22 25c0 4 3 4 3 0" stroke="#c98843" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'chat') {
    return (
      <svg viewBox="0 0 64 64" className={common}>
        <circle cx="32" cy="32" r="28" fill="#e6f4fb" />
        <path
          d="M14 24c0-3 2-5 5-5h22c3 0 5 2 5 5v12c0 3-2 5-5 5h-9l-7 6v-6h-6c-3 0-5-2-5-5z"
          fill="#7cc4e6"
        />
        <circle cx="24" cy="30" r="2" fill="#fff" />
        <circle cx="32" cy="30" r="2" fill="#fff" />
        <circle cx="40" cy="30" r="2" fill="#fff" />
      </svg>
    );
  }
  if (type === 'family') {
    return (
      <svg viewBox="0 0 64 64" className={common}>
        <circle cx="32" cy="32" r="28" fill="#dff4e6" />
        <circle cx="22" cy="26" r="6" fill="#7bc299" />
        <circle cx="42" cy="26" r="6" fill="#5fa37c" />
        <path d="M14 46c2-6 8-10 14-10s8 2 8 6c0-4 4-6 8-6s10 4 12 10z" fill="#9bd3b3" />
      </svg>
    );
  }
  if (type === 'flower') {
    return (
      <svg viewBox="0 0 64 64" className={common}>
        <circle cx="32" cy="32" r="28" fill="#efeaff" />
        <g fill="#b9aafd">
          <circle cx="32" cy="20" r="6" />
          <circle cx="44" cy="32" r="6" />
          <circle cx="32" cy="44" r="6" />
          <circle cx="20" cy="32" r="6" />
        </g>
        <circle cx="32" cy="32" r="5" fill="#fbe18a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={common}>
      <circle cx="32" cy="32" r="28" fill="#eaf0ff" />
      <path
        d="M32 14l4 12 12 1-9 8 3 12-10-7-10 7 3-12-9-8 12-1z"
        fill="#9aa9f6"
      />
    </svg>
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
  const [isRecording, setIsRecording] = useState(false);
  const [practiceHistory, setPracticeHistory] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]')
  );
  const [streak, setStreak] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.streak) || '{"count":0,"lastDate":""}')
  );
  const [practicedToday, setPracticedToday] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEYS.practiced) || '{}')
  );

  const meetingDate = useMemo(() => computeMeetingDate(), []);
  const days = useMemo(() => daysUntil(meetingDate), [meetingDate]);
  const todayKey = getTodayKey();

  const currentDayIndex = useMemo(() => {
    if (days <= 0) return DAY_PLAN.length - 1;
    if (days > 7) return 0;
    return 7 - days;
  }, [days]);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const currentRecordingPhraseIdRef = useRef('');

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

  const speakPhrase = (text) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    trackEvent('phrase_listened', { text });
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
  };

  const startRecording = async (phraseId) => {
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
        setRecordings((prev) => ({ ...prev, [currentRecordingPhraseIdRef.current]: url }));
        const phrase = allPhrases.find((item) => item.id === currentRecordingPhraseIdRef.current);
        const updatedHistory = [
          {
            phraseId: currentRecordingPhraseIdRef.current,
            koreanText: phrase?.koreanText || '',
            createdAt: new Date().toISOString(),
          },
          ...practiceHistory,
        ].slice(0, 40);
        setPracticeHistory(updatedHistory);
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updatedHistory));
        trackEvent('practice_recorded', { phraseId: currentRecordingPhraseIdRef.current });
        const updatedStreak = updateStreak();
        setStreak(updatedStreak);
        localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(updatedStreak));
        markPracticed(currentRecordingPhraseIdRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access failed', error);
      alert('Microphone permission is needed to record your voice.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
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

  const renderPhraseCard = (phrase) => {
    const isPracticed = practicedToday[phrase.id] === todayKey;
    return (
      <article key={`${phrase.id}-${phrase.category}`} className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_10px_30px_rgba(167,139,250,0.12)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">
            {phrase.category}
          </p>
          {isPracticed && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              practiced
            </span>
          )}
        </div>
        <h3 className="font-display mt-2 text-2xl font-bold leading-tight text-slate-900">
          {phrase.koreanText}
        </h3>
        <p className="mt-1 text-base font-semibold text-violet-700/80">
          {phrase.romanization}
        </p>
        <p className="mt-2 text-sm text-slate-600">{phrase.englishMeaning}</p>
        {phrase.note && (
          <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs italic text-amber-800">
            {phrase.note}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => speakPhrase(phrase.koreanText)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-300 to-violet-400 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
          >
            <Play size={16} /> Listen
          </button>
          {!isRecording ? (
            <button
              onClick={() => startRecording(phrase.id)}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-300 to-pink-400 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
            >
              <Mic size={16} /> Repeat
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
            >
              <Pause size={16} /> Stop
            </button>
          )}
          <button
            onClick={() => playRecording(phrase.id)}
            disabled={!recordings[phrase.id]}
            className="rounded-2xl bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-200 disabled:opacity-40"
          >
            Play Mine
          </button>
        </div>
      </article>
    );
  };

  const renderCountdown = () => {
    const inWindow = days >= 0 && days <= 7;
    const banner =
      days < 0
        ? `Mission complete · ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
        : days === 0
          ? 'D-Day · Today is the day'
          : `D-${days}`;
    const subline =
      days < 0
        ? 'You did the work. Now keep speaking softly and slowly.'
        : days === 0
          ? "Don't add new lines today — trust what you trained."
          : days > 7
            ? `Plan unlocks in ${days - 7} day${days - 7 === 1 ? '' : 's'}. Preview anytime.`
            : `Day ${currentDayIndex + 1} of 7 · Stay in tonight, win tomorrow`;

    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-rose-100 via-violet-100 to-sky-100 p-6 shadow-[0_18px_50px_rgba(244,114,182,0.18)]">
        <div className="absolute -right-6 -top-6 h-28 w-28 animate-float rounded-full bg-white/40 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 h-28 w-28 animate-float rounded-full bg-rose-200/70 blur-2xl" />

        <div className="relative">
          <p className="font-script text-2xl text-rose-500">Survival Korean</p>
          <p className="font-display text-3xl font-extrabold leading-tight text-slate-900">
            in 7 Days
          </p>

          <div className="mt-5 flex items-baseline gap-3">
            <span
              className={`font-display text-7xl font-black leading-none tracking-tight text-rose-600 ${inWindow ? 'animate-soft-pulse' : ''}`}
            >
              {banner}
            </span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarHeart size={16} className="text-rose-500" />
            Meeting on {formatLongDate(meetingDate)}
          </p>
          <p className="mt-1 text-sm text-slate-600">{subline}</p>

          <div className="mt-5 grid grid-cols-7 gap-1.5">
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
                  className={`h-2.5 rounded-full transition ${
                    isCurrent
                      ? 'bg-rose-500'
                      : isPast
                        ? 'bg-rose-300'
                        : 'bg-white/70 ring-1 ring-rose-200'
                  }`}
                  aria-label={`Open ${day.label}`}
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
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
            >
              Start Day {currentDayIndex + 1} →
            </button>
          )}
        </div>
      </section>
    );
  };

  const renderHome = () => (
    <div className="space-y-5">
      {renderCountdown()}

      <section>
        <div className="mb-2 flex items-end justify-between px-1">
          <div>
            <p className="font-script text-xl text-violet-500">your roadmap</p>
            <h2 className="font-display text-xl font-bold text-slate-900">7-Day Plan</h2>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            tap a day
          </p>
        </div>
        <div className="space-y-3">
          {DAY_PLAN.map((day, idx) => {
            const { total, done } = dayProgress(day);
            const isCurrent = days >= 0 && days <= 7 && idx === currentDayIndex;
            return (
              <button
                key={day.id}
                onClick={() => {
                  setActiveDayId(day.id);
                  setActiveTab('day');
                }}
                className={`group relative w-full overflow-hidden rounded-3xl border ${day.border} bg-gradient-to-br ${day.accent} p-4 text-left shadow-[0_10px_24px_rgba(148,163,184,0.18)] transition hover:-translate-y-0.5`}
              >
                <div className="absolute right-3 top-3 transition group-hover:scale-105">
                  <Sticker type={day.sticker} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full ${day.chip} px-2 py-0.5 text-[11px] font-bold`}>
                    {day.label}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                      today
                    </span>
                  )}
                </div>
                <p className="font-display mt-2 text-xl font-bold text-slate-900">
                  {day.theme}
                </p>
                <p className="text-sm text-slate-600">{day.subtitle}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {done}/{total} today
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm">
        <p className="font-script text-xl text-rose-500">extra points</p>
        <h3 className="font-display text-lg font-bold text-slate-900">
          100 lines to impress her parents
        </h3>
        <p className="text-sm text-slate-600">
          Tap to browse the wildcard pack — formal, kind, calm phrases.
        </p>
        <button
          onClick={() => setActiveTab('wildcard')}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 px-4 py-2 text-sm font-bold text-white"
        >
          Open wildcard pack →
        </button>
      </section>
    </div>
  );

  const renderDay = () => {
    const day = DAY_PLAN.find((d) => d.id === activeDayId) || DAY_PLAN[currentDayIndex];
    const { total, done } = dayProgress(day);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-1 text-sm font-bold text-slate-600"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <section
          className={`rounded-3xl border ${day.border} bg-gradient-to-br ${day.accent} p-5 shadow-sm`}
        >
          <div className="flex items-center gap-2">
            <span className={`rounded-full ${day.chip} px-2 py-0.5 text-[11px] font-bold`}>
              {day.label}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {done}/{total} practiced today
            </span>
          </div>
          <h2 className="font-display mt-2 text-3xl font-bold text-slate-900">
            {day.theme}
          </h2>
          <p className="text-sm text-slate-700">{day.subtitle}</p>
          <p className="mt-3 rounded-2xl bg-white/70 p-3 text-sm italic text-slate-700">
            “{day.mission}”
          </p>
        </section>

        <section className="space-y-3">
          {day.phrases.map((phrase) =>
            renderPhraseCard({ ...phrase, category: `${day.label} · ${day.theme}` })
          )}
        </section>
      </div>
    );
  };

  const renderCustom = () => (
    <section className="space-y-3">
      <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(139,92,246,0.16)] backdrop-blur-sm">
        <p className="font-script text-xl text-violet-500">your phrasebook</p>
        <h2 className="font-display text-lg font-bold text-slate-900">
          Search or create any phrase
        </h2>
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 px-3">
          <Search size={16} className="text-violet-400" />
          <input
            id="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. it was nice meeting you"
            className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-violet-300"
          />
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-rose-500">
          not found?
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/70 px-3">
          <Wand2 size={16} className="text-rose-500" />
          <input
            id="custom-input"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type the English sentence to translate"
            className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-rose-300"
          />
        </div>
        <button
          onClick={generatePhrase}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
        >
          <Sparkles size={16} /> Generate
        </button>
      </div>

      {searchResults.length === 0 ? (
        <div className="rounded-3xl border border-white/70 bg-white/90 p-4 text-sm text-slate-500 shadow-sm">
          Try searching “meeting parents”, “I miss you”, or generate a custom line above.
        </div>
      ) : (
        searchResults.map((phrase) => renderPhraseCard(phrase))
      )}
    </section>
  );

  const renderWildcard = () => (
    <section className="space-y-3">
      <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 p-5 shadow-sm">
        <p className="font-script text-xl text-rose-500">wildcard pack</p>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          100 lines to impress her parents
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Calm, polite, never overconfident. Pick three you can actually say.
        </p>
      </div>
      <div className="space-y-3">
        {wildcardPhrases
          .slice(0, 30)
          .map((phrase) => renderPhraseCard({ ...phrase, category: 'Impress Parents' }))}
      </div>
    </section>
  );

  const renderHistory = () => (
    <section className="space-y-3 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(125,211,252,0.18)] backdrop-blur-sm">
      <p className="font-script text-xl text-sky-500">progress diary</p>
      <h2 className="font-display text-lg font-bold text-slate-900">Practice History</h2>
      {practiceHistory.length === 0 && (
        <p className="text-sm text-slate-500">
          No recordings yet. Tap “Repeat” on a phrase to begin.
        </p>
      )}
      {practiceHistory.map((item, index) => (
        <div
          key={`${item.phraseId}-${index}`}
          className="rounded-2xl bg-violet-50/80 p-3"
        >
          <p className="font-semibold text-slate-800">{item.koreanText}</p>
          <p className="text-xs text-slate-500">
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </section>
  );

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-md pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/40 bg-white/40 px-5 py-3 backdrop-blur-md">
        <div>
          <p className="font-script text-lg leading-none text-rose-500">survival</p>
          <p className="font-display text-lg font-bold leading-tight text-slate-900">
            Korean Coach
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600">
          <Flame size={12} />
          {streak.count > 0 ? `${streak.count}d` : 'start streak'}
        </div>
      </header>

      <main className="space-y-4 p-4">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'day' && renderDay()}
        {activeTab === 'custom' && renderCustom()}
        {activeTab === 'wildcard' && renderWildcard()}
        {activeTab === 'history' && renderHistory()}
      </main>

      <nav className="fixed bottom-3 left-0 right-0 z-20 mx-auto grid w-[calc(100%-1.25rem)] max-w-md grid-cols-4 rounded-3xl border border-white/60 bg-white/85 p-1 shadow-[0_12px_40px_rgba(244,114,182,0.18)] backdrop-blur-md">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-bold ${activeTab === 'home' ? 'bg-rose-100 text-rose-700' : 'text-slate-500'}`}
        >
          <Sparkles size={18} /> Home
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-bold ${activeTab === 'custom' ? 'bg-violet-100 text-violet-700' : 'text-slate-500'}`}
        >
          <Search size={18} /> Custom
        </button>
        <button
          onClick={() => setActiveTab('wildcard')}
          className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-bold ${activeTab === 'wildcard' ? 'bg-amber-100 text-amber-700' : 'text-slate-500'}`}
        >
          <CalendarHeart size={18} /> Wildcard
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-bold ${activeTab === 'history' ? 'bg-sky-100 text-sky-700' : 'text-slate-500'}`}
        >
          <Mic size={18} /> Diary
        </button>
      </nav>
    </div>
  );
};

export default StudentGroupManager;

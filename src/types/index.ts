export type StockStatus = 'ok' | 'warning' | 'danger';

export interface Cube {
  id: string;
  name: string;
  emoji: string;
  category: string;
  color_tag: string;
  quantity: number;
  warning_threshold: number;
  danger_threshold: number;
  grams_per_cube: number;
  expiry_date: string | null;
  photo_url: string | null;
  notes: string | null;
  introduced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Reaction = 'none' | 'mild' | 'severe';

export const REACTIONS: Record<Reaction, { label: string; emoji: string; color: string }> = {
  none:   { label: '이상없음', emoji: '✅', color: 'text-green-500' },
  mild:   { label: '경미',     emoji: '⚠️', color: 'text-yellow-500' },
  severe: { label: '심각',     emoji: '🚨', color: 'text-red-500' },
};

export interface ConsumptionLog {
  id: string;
  cube_id: string;
  cube_name: string;
  quantity: number;
  grams_override?: number; // 수기 입력 항목의 직접 지정 그램 (cube_id가 없을 때 사용)
  meal_time: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_at: string;
  notes: string | null;
  reaction: Reaction | null;
}


export interface MealPlan {
  id: string;
  date: string; // 'YYYY-MM-DD'
  meal_time: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  cube_ids: string[];
  custom_items: { name: string; grams: number }[]; // 수기 입력 항목
  logged: boolean; // 소비 기록에 추가되었는지
}

export const CATEGORIES = ['채소', '과일', '육류', '생선', '곡물', '밥', '기타'] as const;
export type Category = typeof CATEGORIES[number];

export const MEAL_TIMES = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
} as const;

// 각 카테고리별 고유 이모티콘 (카테고리 간 중복 없음, Unicode 12.0 이하만 사용)
export const CATEGORY_EMOJIS: Record<string, string[]> = {
  채소: ['🥦', '🥕', '🌽', '🥬', '🍆', '🥒', '🍅', '🧅', '🧄', '🌿', '🍠', '🥑', '🥔', '🌱', '🍃', '🌵', '🎃', '🍀', '🌺', '🌻', '🌸', '🌼', '🌹', '🌷'],
  과일: ['🍎', '🍌', '🍇', '🍓', '🍑', '🍒', '🍋', '🍊', '🍐', '🥝', '🍉', '🍈', '🍏', '🍍', '🥭', '🥥', '🍄', '🍦', '🍧', '🍭', '🍡', '🍮', '🍰', '🍬'],
  육류: ['🍗', '🥩', '🍖', '🥚', '🐔', '🐷', '🐄', '🐑', '🦆', '🐇', '🥓', '🌭', '🍔', '🍳', '🐓'],
  생선: ['🐟', '🦐', '🦑', '🦀', '🍣', '🐠', '🐡', '🦞', '🦪', '🐙', '🍤', '🦈', '🐬', '🐳', '🎣'],
  곡물: ['🌾', '🥣', '🥖', '🌰', '🥐', '🍞', '🥨', '🥞', '🌮', '🌯', '🥙', '🥯', '🥜', '🍕', '🥪'],
  밥:   ['🍚', '🍱', '🥘', '🍲', '🍛', '🍜', '🍝', '🥮', '🍘', '🍥', '🍙', '🍽', '🥄', '🥗', '🥫'],
  기타: ['🧆', '🥛', '🧀', '🍯', '🧂', '☕', '🧃', '🥤', '🍼', '🧈', '🧁', '🍩', '🎂', '🍪', '🥧'],
};

export const COLOR_TAGS = [
  '#E8734A', '#A8C97F', '#7BAFD4', '#F4C430', '#C47AC0',
  '#E87D7D', '#5BBF8E', '#F0A06A', '#6B8E6B', '#A0785A',
] as const;

export function getStockStatus(quantity: number, warningThreshold: number, dangerThreshold: number): StockStatus {
  if (quantity <= dangerThreshold) return 'danger';
  if (quantity <= warningThreshold) return 'warning';
  return 'ok';
}

export const STATUS_COLORS: Record<StockStatus, string> = {
  ok: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
};

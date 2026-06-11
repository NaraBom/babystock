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
  cube_snapshots?: Record<string, { name: string; emoji: string; grams: number }>; // 삭제된 큐브 복원용 스냅샷
  custom_items: { name: string; grams: number }[]; // 수기 입력 항목
  logged: boolean; // 소비 기록에 추가되었는지
}

export const CATEGORIES = ['채소', '과일', '육류', '생선', '밥', '기타'] as const;
export type Category = typeof CATEGORIES[number];

export const MEAL_TIMES = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
} as const;

// 각 카테고리별 고유 이모티콘 (카테고리 간 중복 없음, Unicode 12.0 이하만 사용)
export const CATEGORY_EMOJIS: Record<string, string[]> = {
  채소: ['/emojis/채소/carrot.png', '/emojis/채소/alfalfa_sprout.png', '/emojis/채소/artichoke.png', '/emojis/채소/arugula.png', '/emojis/채소/avocado.png', '/emojis/채소/bamboo_shoot.png', '/emojis/채소/beech_mushroom.png', '/emojis/채소/beet.png', '/emojis/채소/bitter_melon.png', '/emojis/채소/black_bean.png', '/emojis/채소/black_garlic.png', '/emojis/채소/black_soybean.png', '/emojis/채소/black_truffle.png', '/emojis/채소/bok_choy.png', '/emojis/채소/broccoli.png', '/emojis/채소/broccoli_sprout.png', '/emojis/채소/burdock.png', '/emojis/채소/butternut_squash.png', '/emojis/채소/button_mushroom.png', '/emojis/채소/cabbage.png', '/emojis/채소/cauliflower.png', '/emojis/채소/celeriac.png', '/emojis/채소/cherry_tomato.png', '/emojis/채소/chicory.png', '/emojis/채소/chili_pepper.png', '/emojis/채소/colorleaf.png', '/emojis/채소/corn.png', '/emojis/채소/crown_daisy.png', '/emojis/채소/cucumber.png', '/emojis/채소/delicata_squash.png', '/emojis/채소/edamame.png', '/emojis/채소/eggplant.png', '/emojis/채소/enoki_mushroom.png', '/emojis/채소/fennel.png', '/emojis/채소/garlic.png', '/emojis/채소/ginger.png', '/emojis/채소/green_onion.png', '/emojis/채소/green_pepper.png', '/emojis/채소/jalapeno.png', '/emojis/채소/jerusalem_artichoke.png', '/emojis/채소/kabocha.png', '/emojis/채소/kale.png', '/emojis/채소/kidney_bean.png', '/emojis/채소/king_oyster.png', '/emojis/채소/kohlrabi.png', '/emojis/채소/leek.png', '/emojis/채소/lentil.png', '/emojis/채소/lettuce.png', '/emojis/채소/lima_bean.png', '/emojis/채소/long_bean.png', '/emojis/채소/lotus_root.png', '/emojis/채소/mung_bean_sprout.png', '/emojis/채소/napa_cabbage.png', '/emojis/채소/okra.png', '/emojis/채소/onion.png', '/emojis/채소/oyster_mushroom.png', '/emojis/채소/paprika.png', '/emojis/채소/parsnip.png', '/emojis/채소/patty_pan.png', '/emojis/채소/pea_pod.png', '/emojis/채소/poblano.png', '/emojis/채소/porcini.png', '/emojis/채소/potato.png', '/emojis/채소/radish.png', '/emojis/채소/radish_sprout.png', '/emojis/채소/red_mustard.png', '/emojis/채소/reishi.png', '/emojis/채소/romaine_lettuce.png', '/emojis/채소/romanesco.png', '/emojis/채소/rutabaga.png', '/emojis/채소/shallot.png', '/emojis/채소/shiitake.png', '/emojis/채소/snow_pea.png', '/emojis/채소/soybean_sprout.png', '/emojis/채소/spaghetti_squash.png', '/emojis/채소/spinach.png', '/emojis/채소/sweet_potato.png', '/emojis/채소/swiss_chard.png', '/emojis/채소/taro.png', '/emojis/채소/tomato.png', '/emojis/채소/turnip.png', '/emojis/채소/wood_ear.png', '/emojis/채소/yacon.png', '/emojis/채소/zucchini.png'],
  과일: ['/emojis/과일/apple.png', '/emojis/과일/apricot.png', '/emojis/과일/banana.png', '/emojis/과일/blueberry.png', '/emojis/과일/cherry.png', '/emojis/과일/cranberry.png', '/emojis/과일/dragon_fruit.png', '/emojis/과일/grape.png', '/emojis/과일/grapefruit.png', '/emojis/과일/kiwi.png', '/emojis/과일/korean_melon.png', '/emojis/과일/lemon.png', '/emojis/과일/mango.png', '/emojis/과일/melon.png', '/emojis/과일/orange.png', '/emojis/과일/papaya.png', '/emojis/과일/peach.png', '/emojis/과일/pear.png', '/emojis/과일/pineapple.png', '/emojis/과일/plum.png', '/emojis/과일/strawberry.png', '/emojis/과일/watermelon.png'],
  육류: ['/emojis/육류/beef.png', '/emojis/육류/pork.png', '/emojis/육류/chicken.png', '/emojis/육류/duck.png', '/emojis/육류/egg.png'],
  생선: ['/emojis/생선/cod.png', '/emojis/생선/halibut.png', '/emojis/생선/pollock.png', '/emojis/생선/salmon.png', '/emojis/생선/sea_bream.png', '/emojis/생선/tuna.png', '/emojis/생선/clam.png', '/emojis/생선/shrimp.png'],
  밥:   ['/emojis/밥/steamed_rice.png', '/emojis/밥/multigrain_rice.png'],
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

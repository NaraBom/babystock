export type StockStatus = 'ok' | 'warning' | 'danger';

export interface Cube {
  id: string;
  name: string;
  category: string;
  color_tag: string;
  quantity: number;
  warning_threshold: number;
  danger_threshold: number;
  grams_per_cube: number;
  expiry_date: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsumptionLog {
  id: string;
  cube_id: string;
  cube_name: string;
  quantity: number;
  meal_time: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_at: string;
  notes: string | null;
}

export interface DashboardStats {
  total_cubes: number;
  low_stock_count: number;
  danger_count: number;
  today_consumption: number;
}

export const CATEGORIES = ['채소', '과일', '육류', '생선', '곡물', '기타'] as const;
export type Category = typeof CATEGORIES[number];

export const MEAL_TIMES = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
} as const;

export const COLOR_TAGS = [
  '#E8734A', '#A8C97F', '#7BAFD4', '#F4C430',
  '#C47AC0', '#E87D7D', '#5BBF8E', '#F0A06A',
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

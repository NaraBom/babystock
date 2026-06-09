import { Cube, ConsumptionLog, MealPlan } from '@/types';

const CUBES_KEY = 'cubridge_cubes';
const LOGS_KEY = 'cubridge_logs';
const SETTINGS_KEY = 'cubridge_settings';
const BABY_KEY = 'cubridge_baby';
const MEAL_PLANS_KEY = 'cubridge_meal_plans';
const SEEDED_KEY = 'cubridge_seeded';

export interface BabyProfile {
  name: string;
  birthDate: string | null; // 'YYYY-MM-DD'
  emoji: string;
  photoUrl: string | null;  // base64 data URL
  memo: string;
}

const DEFAULT_BABY: BabyProfile = { name: '', birthDate: null, emoji: '👶', photoUrl: null, memo: '' };

export function getBabyProfile(): BabyProfile {
  if (!isBrowser()) return DEFAULT_BABY;
  try {
    return { ...DEFAULT_BABY, ...JSON.parse(localStorage.getItem(BABY_KEY) || '{}') };
  } catch {
    return DEFAULT_BABY;
  }
}

export function saveBabyProfile(profile: BabyProfile) {
  if (!isBrowser()) return;
  localStorage.setItem(BABY_KEY, JSON.stringify(profile));
}

export interface AppSettings {
  expiryWarningDays: number;       // 유통기한 임박 기준일
  defaultWarningThreshold: number; // 새 큐브 기본 주의 기준
  defaultDangerThreshold: number;  // 새 큐브 기본 부족 기준
  defaultGramsPerCube: number;     // 새 큐브 기본 용량
  pushNotification: boolean;       // 브라우저 푸시 알림
  weekStartsOnSunday: boolean;     // 주 시작 요일 (true=일요일, false=월요일)
}

const DEFAULT_SETTINGS: AppSettings = {
  expiryWarningDays: 3,
  defaultWarningThreshold: 5,
  defaultDangerThreshold: 2,
  defaultGramsPerCube: 20,
  pushNotification: false,
  weekStartsOnSunday: false,
};

export function getSettings(): AppSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearAllData() {
  if (!isBrowser()) return;
  localStorage.removeItem(CUBES_KEY);
  localStorage.removeItem(LOGS_KEY);
}

function isBrowser() {
  return typeof window !== 'undefined';
}

export function isSeeded(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(SEEDED_KEY) === '1';
}

export function markSeeded() {
  if (!isBrowser()) return;
  localStorage.setItem(SEEDED_KEY, '1');
}

export function getCubes(): Cube[] {
  if (!isBrowser()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUBES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCubes(cubes: Cube[]) {
  if (!isBrowser()) return;
  localStorage.setItem(CUBES_KEY, JSON.stringify(cubes));
}

export function getLogs(): ConsumptionLog[] {
  if (!isBrowser()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLogs(logs: ConsumptionLog[]) {
  if (!isBrowser()) return;
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function addCube(cube: Omit<Cube, 'id' | 'created_at' | 'updated_at'>): Cube {
  const cubes = getCubes();
  const now = new Date().toISOString();
  const newCube: Cube = {
    ...cube,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  };
  saveCubes([...cubes, newCube]);
  return newCube;
}

export function updateCube(id: string, updates: Partial<Omit<Cube, 'id' | 'created_at'>>): Cube | null {
  const cubes = getCubes();
  const idx = cubes.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...cubes[idx], ...updates, updated_at: new Date().toISOString() };
  cubes[idx] = updated;
  saveCubes(cubes);
  return updated;
}

export function deleteCube(id: string) {
  saveCubes(getCubes().filter((c) => c.id !== id));
}

export function addLog(log: Omit<ConsumptionLog, 'id'>): ConsumptionLog {
  const logs = getLogs();
  const newLog: ConsumptionLog = { ...log, id: crypto.randomUUID() };
  saveLogs([newLog, ...logs]);

  // deduct stock, set introduced_at on first log
  const cubes = getCubes();
  const cube = cubes.find((c) => c.id === log.cube_id);
  if (cube) {
    updateCube(cube.id, {
      quantity: Math.max(0, cube.quantity - log.quantity),
      ...(!cube.introduced_at && { introduced_at: log.logged_at }),
    });
  }
  return newLog;
}

export function backfillIntroducedAt() {
  const cubes = getCubes();
  const logs = getLogs();
  let changed = false;
  for (const cube of cubes) {
    if (cube.introduced_at) continue;
    const cubeLogs = logs.filter((l) => l.cube_id === cube.id);
    if (cubeLogs.length === 0) continue;
    const oldest = cubeLogs.reduce((a, b) =>
      new Date(a.logged_at) < new Date(b.logged_at) ? a : b
    );
    updateCube(cube.id, { introduced_at: oldest.logged_at });
    changed = true;
  }
  return changed;
}

export function updateLog(id: string, updates: Partial<Pick<ConsumptionLog, 'reaction' | 'notes'>>) {
  const logs = getLogs();
  const idx = logs.findIndex((l) => l.id === id);
  if (idx === -1) return;
  logs[idx] = { ...logs[idx], ...updates };
  saveLogs(logs);
}

export function deleteLog(id: string, restoreStock = false) {
  const logs = getLogs();
  const log = logs.find((l) => l.id === id);
  if (restoreStock && log) {
    const cube = getCubes().find((c) => c.id === log.cube_id);
    if (cube) updateCube(cube.id, { quantity: cube.quantity + log.quantity });
  }
  saveLogs(logs.filter((l) => l.id !== id));
}

export function getMealPlans(): MealPlan[] {
  if (!isBrowser()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(MEAL_PLANS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function deleteMealPlansByMealTime(meal_time: MealPlan['meal_time']) {
  saveMealPlans(getMealPlans().filter((p) => p.meal_time !== meal_time));
}

export function deleteMealPlansByDate(date: string) {
  saveMealPlans(getMealPlans().filter((p) => p.date !== date));
}

export function markMealPlansLogged(date: string, meal_times: MealPlan['meal_time'][]) {
  const plans = getMealPlans();
  let changed = false;
  for (const plan of plans) {
    if (plan.date === date && meal_times.includes(plan.meal_time) && !plan.logged) {
      plan.logged = true;
      changed = true;
    }
  }
  if (changed) saveMealPlans(plans);
}

export function saveMealPlans(plans: MealPlan[]) {
  if (!isBrowser()) return;
  localStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(plans));
}

export function upsertMealPlan(date: string, meal_time: MealPlan['meal_time'], cube_ids: string[], custom_items: MealPlan['custom_items'] = []) {
  const plans = getMealPlans();
  const idx = plans.findIndex((p) => p.date === date && p.meal_time === meal_time);
  if (cube_ids.length === 0 && custom_items.length === 0) {
    if (idx !== -1) saveMealPlans(plans.filter((_, i) => i !== idx));
    return;
  }
  if (idx !== -1) {
    const existing = plans[idx];
    const prevIds = new Set(existing.cube_ids);
    const hasNewCube = cube_ids.some((id) => !prevIds.has(id));
    plans[idx] = { ...existing, cube_ids, custom_items, logged: hasNewCube ? false : existing.logged };
  } else {
    plans.push({ id: crypto.randomUUID(), date, meal_time, cube_ids, custom_items, logged: false });
  }
  saveMealPlans(plans);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getSampleCubes(): Omit<Cube, 'id' | 'created_at' | 'updated_at'>[] {
  return [
    { name: '브로콜리', emoji: '🥦', category: '채소', color_tag: '#A8C97F', quantity: 8, warning_threshold: 5, danger_threshold: 2, grams_per_cube: 30, expiry_date: daysFromNow(30), photo_url: null, notes: null, introduced_at: null },
    { name: '당근', emoji: '🥕', category: '채소', color_tag: '#F0A06A', quantity: 3, warning_threshold: 5, danger_threshold: 2, grams_per_cube: 30, expiry_date: daysFromNow(2), photo_url: null, notes: null, introduced_at: null },
    { name: '소고기', emoji: '🥩', category: '육류', color_tag: '#E87D7D', quantity: 1, warning_threshold: 4, danger_threshold: 2, grams_per_cube: 20, expiry_date: daysFromNow(-1), photo_url: null, notes: null, introduced_at: null },
    { name: '고구마', emoji: '🍠', category: '채소', color_tag: '#F4C430', quantity: 12, warning_threshold: 5, danger_threshold: 2, grams_per_cube: 35, expiry_date: daysFromNow(45), photo_url: null, notes: null, introduced_at: null },
    { name: '닭가슴살', emoji: '🍗', category: '육류', color_tag: '#7BAFD4', quantity: 6, warning_threshold: 4, danger_threshold: 2, grams_per_cube: 20, expiry_date: daysFromNow(7), photo_url: null, notes: null, introduced_at: null },
  ];
}

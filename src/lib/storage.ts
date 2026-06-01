import { Cube, ConsumptionLog } from '@/types';

const CUBES_KEY = 'babystock_cubes';
const LOGS_KEY = 'babystock_logs';
const SETTINGS_KEY = 'babystock_settings';

export interface AppSettings {
  expiryWarningDays: number;       // 유통기한 임박 기준일
  defaultWarningThreshold: number; // 새 큐브 기본 주의 기준
  defaultDangerThreshold: number;  // 새 큐브 기본 부족 기준
  defaultGramsPerCube: number;     // 새 큐브 기본 용량
  pushNotification: boolean;       // 브라우저 푸시 알림
}

const DEFAULT_SETTINGS: AppSettings = {
  expiryWarningDays: 3,
  defaultWarningThreshold: 5,
  defaultDangerThreshold: 2,
  defaultGramsPerCube: 30,
  pushNotification: false,
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

export function getCubes(): Cube[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(CUBES_KEY) || '[]');
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
    return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
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

  // deduct stock
  const cubes = getCubes();
  const cube = cubes.find((c) => c.id === log.cube_id);
  if (cube) {
    updateCube(cube.id, { quantity: Math.max(0, cube.quantity - log.quantity) });
  }
  return newLog;
}

export function deleteLog(id: string) {
  saveLogs(getLogs().filter((l) => l.id !== id));
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getSampleCubes(): Omit<Cube, 'id' | 'created_at' | 'updated_at'>[] {
  return [
    { name: '브로콜리', category: '채소', color_tag: '#A8C97F', quantity: 8, warning_threshold: 5, danger_threshold: 2, grams_per_cube: 30, expiry_date: daysFromNow(30), photo_url: null, notes: null },
    { name: '당근', category: '채소', color_tag: '#F0A06A', quantity: 3, warning_threshold: 5, danger_threshold: 2, grams_per_cube: 30, expiry_date: daysFromNow(2), photo_url: null, notes: null },
    { name: '소고기', category: '육류', color_tag: '#E87D7D', quantity: 1, warning_threshold: 4, danger_threshold: 2, grams_per_cube: 20, expiry_date: daysFromNow(-1), photo_url: null, notes: null },
    { name: '고구마', category: '채소', color_tag: '#F4C430', quantity: 12, warning_threshold: 5, danger_threshold: 2, grams_per_cube: 35, expiry_date: daysFromNow(45), photo_url: null, notes: null },
    { name: '닭가슴살', category: '육류', color_tag: '#7BAFD4', quantity: 6, warning_threshold: 4, danger_threshold: 2, grams_per_cube: 20, expiry_date: daysFromNow(7), photo_url: null, notes: null },
  ];
}

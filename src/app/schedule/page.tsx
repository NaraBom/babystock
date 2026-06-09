'use client';

import { useMemo, useState } from 'react';
import { useHolidays } from '@/hooks/useHolidays';
import { Cube, MealPlan, MEAL_TIMES, CATEGORIES } from '@/types';
import { getCubes, getLogs, getMealPlans, getSettings, upsertMealPlan, addLog, deleteLog, markMealPlansLogged, deleteMealPlansByMealTime, deleteMealPlansByDate } from '@/lib/storage';
import { isHoliday } from '@/lib/holidays';
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2 } from 'lucide-react';

type MealTime = MealPlan['meal_time'];
const MEAL_ORDER: MealTime[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function getWeekDates(baseDate: Date, weekStartsOnSunday: boolean): Date[] {
  const day = baseDate.getDay(); // 0=Sun
  const startOffset = weekStartsOnSunday ? day : (day + 6) % 7;
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - startOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_LABELS_MON = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_LABELS_SUN = ['일', '월', '화', '수', '목', '금', '토'];
const MEAL_PLAN_CATEGORY_ORDER = ['밥', '육류', '채소', '과일', '생선', '곡물', '기타'] as const;
const MEAL_COLORS: Record<MealTime, string> = {
  breakfast: 'bg-amber-50 border-amber-200 text-amber-700',
  lunch:     'bg-green-50 border-green-200 text-green-700',
  dinner:    'bg-blue-50 border-blue-200 text-blue-700',
  snack:     'bg-purple-50 border-purple-200 text-purple-700',
};

interface CubeSelectorProps {
  cubes: Cube[];
  selected: string[];
  selectedCustomItems: MealPlan['custom_items'];
  onClose: () => void;
  onSave: (ids: string[], customItems: MealPlan['custom_items']) => void;
}

function CubeSelector({ cubes, selected, selectedCustomItems, onClose, onSave }: CubeSelectorProps) {
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const id of selected) map[id] = (map[id] ?? 0) + 1;
    return map;
  });
  const [query, setQuery] = useState('');
  const [customItems, setCustomItems] = useState<{ name: string; grams: number }[]>(selectedCustomItems);
  const [customInput, setCustomInput] = useState('');
  const [customGrams, setCustomGrams] = useState(0);

  function adjust(id: string, delta: number) {
    setCounts((prev) => {
      const next = { ...prev };
      const val = (next[id] ?? 0) + delta;
      if (val <= 0) delete next[id];
      else next[id] = val;
      return next;
    });
  }

  function addCustomItem() {
    const name = customInput.trim();
    if (!name) return;
    setCustomItems((prev) => [...prev, { name, grams: customGrams }]);
    setCustomInput('');
    setCustomGrams(0);
  }

  function handleSave() {
    const ids = Object.entries(counts).flatMap(([id, cnt]) => Array(cnt).fill(id));
    onSave(ids, customItems);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <span className="font-semibold text-gray-800">큐브 선택</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-3 pt-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="큐브 검색..."
            className="w-full text-sm px-3 py-2 rounded-xl border border-[var(--border)] bg-gray-50 focus:outline-none focus:border-[var(--primary)] placeholder-gray-300"
          />
        </div>
        <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-3">
          {cubes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">등록된 큐브가 없어요</p>
          )}
          {CATEGORIES.filter((cat) => cubes.some((c) => c.category === cat && c.name.includes(query))).map((cat) => (
            <div key={cat}>
              <p className="text-[11px] font-semibold text-gray-400 px-1 mb-1">{cat}</p>
              <div className="flex flex-col gap-1">
                {cubes.filter((c) => c.category === cat && c.name.includes(query)).sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((cube) => {
                  const count = counts[cube.id] ?? 0;
                  return (
                    <div
                      key={cube.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                        count > 0 ? 'bg-orange-50 border-[var(--primary)]' : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg">{cube.emoji}</span>
                      <span className="flex-1 text-sm font-medium text-gray-700">{cube.name} <span className="text-xs font-normal text-gray-400">{cube.grams_per_cube}g</span></span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{cube.quantity}개 남음</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => adjust(cube.id, -1)} disabled={count === 0}
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >−</button>
                        <span className={`w-5 text-center text-sm font-bold ${count > 0 ? 'text-[var(--primary)]' : 'text-gray-300'}`}>{count}</span>
                        <button onClick={() => adjust(cube.id, 1)} disabled={count >= cube.quantity}
                          className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 직접 입력 섹션 */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 px-1 mb-1">직접 입력</p>
            <div className="flex flex-col gap-1">
              {customItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="flex-1 text-sm text-gray-700">{item.name}</span>
                  {item.grams > 0 && <span className="text-xs text-purple-400 flex-shrink-0">{item.grams}g</span>}
                  <button onClick={() => setCustomItems((prev) => prev.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 transition"><X size={14} /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem(); } }}
                  placeholder="예: 사과퓨레"
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-[var(--border)] bg-gray-50 focus:outline-none focus:border-[var(--primary)] placeholder-gray-300 min-w-0"
                />
                <input
                  type="number"
                  min={0}
                  value={customGrams || ''}
                  onChange={(e) => setCustomGrams(Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem(); } }}
                  placeholder="g"
                  className="text-sm px-2 py-2 rounded-xl border border-[var(--border)] bg-gray-50 focus:outline-none focus:border-[var(--primary)] placeholder-gray-300 text-center flex-shrink-0"
                  style={{ width: '52px' }}
                />
                <button onClick={addCustomItem}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition flex-shrink-0">
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[var(--border)]">
          <button onClick={handleSave}
            className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition">
            저장
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [cubes, setCubes] = useState<Cube[]>(() => getCubes());
  const [plans, setPlans] = useState<MealPlan[]>(() => getMealPlans());
  const [weekBase, setWeekBase] = useState(() => new Date());
  const [editing, setEditing] = useState<{ date: string; meal_time: MealTime } | null>(null);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ date: string; meal_time: MealTime; cubeId: string; cubeName: string } | null>(null);
  const [deleteAllMealTime, setDeleteAllMealTime] = useState<MealTime | null>(null);
  const [deleteAllDate, setDeleteAllDate] = useState<string | null>(null);

  const weekStartsOnSunday = useMemo(() => getSettings().weekStartsOnSunday, []);
  const DAY_LABELS = weekStartsOnSunday ? DAY_LABELS_SUN : DAY_LABELS_MON;
  const today = new Date();
  const todayKey = toDateKey(today);
  const weekDates = useMemo(() => getWeekDates(weekBase, weekStartsOnSunday), [weekBase, weekStartsOnSunday]);
  const weekYears = useMemo(() => [...new Set(weekDates.map((d) => d.getFullYear()))], [weekDates]);
  const holidays = useHolidays(weekYears);

  function prevWeek() {
    setWeekBase((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
  }
  function nextWeek() {
    setWeekBase((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  }
  function goThisWeek() { setWeekBase(new Date()); }

  function getPlan(date: string, meal_time: MealTime): MealPlan | undefined {
    return plans.find((p) => p.date === date && p.meal_time === meal_time);
  }

  function handleSave(date: string, meal_time: MealTime, ids: string[], customItems: MealPlan['custom_items'] = []) {
    upsertMealPlan(date, meal_time, ids, customItems);
    setPlans(getMealPlans());
  }

  function removeCube(date: string, meal_time: MealTime, cubeId: string, cubeName: string) {
    const plan = getPlan(date, meal_time);
    if (!plan) return;
    // 기록된 식단이면 소비 기록 삭제 여부 확인
    if (plan.logged) {
      setRemoveConfirm({ date, meal_time, cubeId, cubeName });
    } else {
      doRemoveCube(date, meal_time, cubeId, false);
    }
  }

  function doRemoveCube(date: string, meal_time: MealTime, cubeId: string, alsoDeleteLog: boolean) {
    const plan = getPlan(date, meal_time);
    if (!plan) return;
    if (alsoDeleteLog) {
      // 해당 날짜·식사 타임·큐브에 해당하는 소비 기록 삭제 (재고 복원 포함)
      const logs = getLogs().filter(
        (l) => l.cube_id === cubeId && l.meal_time === meal_time && l.logged_at.startsWith(date)
      );
      for (const log of logs) deleteLog(log.id, true);
      setCubes(getCubes());
    }
    handleSave(date, meal_time, plan.cube_ids.filter((id) => id !== cubeId), plan.custom_items ?? []);
    setRemoveConfirm(null);
  }

  function handleDeleteAllByDate(date: string, alsoDeleteLog: boolean) {
    if (alsoDeleteLog) {
      const logEntries = getLogs().filter((l) => l.logged_at.startsWith(date));
      for (const log of logEntries) deleteLog(log.id, true);
      setCubes(getCubes());
    }
    deleteMealPlansByDate(date);
    setPlans(getMealPlans());
    setDeleteAllDate(null);
  }

  function handleDeleteAllByMealTime(meal_time: MealTime, alsoDeleteLog: boolean) {
    if (alsoDeleteLog) {
      const logEntries = getLogs().filter((l) => l.meal_time === meal_time);
      for (const log of logEntries) deleteLog(log.id, true);
      setCubes(getCubes());
    }
    deleteMealPlansByMealTime(meal_time);
    setPlans(getMealPlans());
    setDeleteAllMealTime(null);
  }

  function addTodayToLog() {
    const todayMeals = MEAL_ORDER.map((mt) => getPlan(todayKey, mt))
      .filter((p): p is MealPlan => !!p && !p.logged); // 미기록 식단만
    if (todayMeals.length === 0) {
      setAddedFeedback('추가할 새 식단이 없어요');
      setTimeout(() => setAddedFeedback(null), 3000);
      return;
    }

    const MEAL_HOURS: Record<MealTime, string> = { breakfast: '07:00', lunch: '12:00', dinner: '18:00', snack: '15:00' };

    for (const plan of todayMeals) {
      const loggedAt = new Date(`${todayKey}T${MEAL_HOURS[plan.meal_time]}:00`).toISOString();
      for (const cubeId of plan.cube_ids) {
        const cube = cubes.find((c) => c.id === cubeId);
        if (!cube || cube.quantity < 1) continue;
        addLog({ cube_id: cubeId, cube_name: cube.name, quantity: 1, meal_time: plan.meal_time, logged_at: loggedAt, notes: null, reaction: null });
      }
      for (const item of plan.custom_items ?? []) {
        addLog({ cube_id: '', cube_name: item.name, quantity: 1, grams_override: item.grams > 0 ? item.grams : undefined, meal_time: plan.meal_time, logged_at: loggedAt, notes: null, reaction: null });
      }
    }

    markMealPlansLogged(todayKey, todayMeals.map((p) => p.meal_time));
    setCubes(getCubes());
    setPlans(getMealPlans());
    setAddedFeedback('오늘 식단이 소비 기록에 추가되었어요 ✅');
    setTimeout(() => setAddedFeedback(null), 3000);
  }

  const weekLabel = (() => {
    const start = weekDates[0];
    const weekOfMonth = Math.ceil(start.getDate() / 7);
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${weekOfMonth}주`;
  })();

  const editingPlan = editing ? getPlan(editing.date, editing.meal_time) : undefined;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <h1 className="text-2xl font-bold text-gray-800 mr-auto">식단 계획</h1>
        <button
          onClick={addTodayToLog}
          className="text-sm px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition font-medium"
        >
          오늘 식단 소비 기록에 추가
        </button>
      </div>

      {addedFeedback && (
        <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          {addedFeedback}
        </div>
      )}

      {/* 주 네비게이션 */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 transition"><ChevronLeft size={18} /></button>
        <span className="font-semibold text-gray-700 text-sm">{weekLabel}</span>
        <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 transition"><ChevronRight size={18} /></button>
        <button onClick={goThisWeek} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-gray-500 hover:bg-gray-50 transition ml-1">
          이번 주
        </button>
      </div>

      {/* 그리드 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="w-16 pb-2" />
              {weekDates.map((date, i) => {
                const key = toDateKey(date);
                const isToday = isSameDay(date, today);
                const weekday = date.getDay(); // 0=일, 6=토
                const isRed = weekday === 0 || isHoliday(key, holidays);
                const isBlue = !isRed && weekday === 6;
                return (
                  <th key={key} className="pb-2 text-center w-[calc((100%-4rem)/7)]">
                    <div className={`inline-flex flex-col items-center gap-0.5`}>
                      <span className={`text-xs ${isRed ? 'text-red-400' : isBlue ? 'text-blue-400' : 'text-gray-400'}`}>{DAY_LABELS[i]}</span>
                      <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-[var(--primary)] text-white' : isRed ? 'text-red-400' : isBlue ? 'text-blue-400' : 'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </span>
                      {plans.some((p) => p.date === key) && (
                        <button
                          onClick={() => setDeleteAllDate(key)}
                          className="text-[10px] text-red-400 hover:text-red-600 transition whitespace-nowrap"
                        >
                          전체 삭제
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {MEAL_ORDER.map((mealTime) => (
              <tr key={mealTime} className="align-top">
                <td className="pr-2 pt-2 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-gray-400">{MEAL_TIMES[mealTime]}</span>
                    {plans.some((p) => p.meal_time === mealTime) && (
                      <button
                        onClick={() => setDeleteAllMealTime(mealTime)}
                        className="text-[10px] text-red-400 hover:text-red-600 transition whitespace-nowrap"
                      >
                        전체 삭제
                      </button>
                    )}
                  </div>
                </td>
                {weekDates.map((date) => {
                  const dateKey = toDateKey(date);
                  const plan = getPlan(dateKey, mealTime);
                  // 중복 ID를 집계해 { cube, count }[] 형태로 변환
                  const cubeCounts = (plan?.cube_ids ?? []).reduce<Record<string, number>>((acc, id) => {
                    acc[id] = (acc[id] ?? 0) + 1; return acc;
                  }, {});
                  const plannedEntries = Object.entries(cubeCounts).map(([id, count]) => ({
                    cube: cubes.find((c) => c.id === id),
                    count,
                  })).filter((e) => e.cube).sort((a, b) => {
                    const ai = MEAL_PLAN_CATEGORY_ORDER.indexOf(a.cube!.category as typeof MEAL_PLAN_CATEGORY_ORDER[number]);
                    const bi = MEAL_PLAN_CATEGORY_ORDER.indexOf(b.cube!.category as typeof MEAL_PLAN_CATEGORY_ORDER[number]);
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                  }) as { cube: Cube; count: number }[];
                  const isPast = date < today && !isSameDay(date, today);

                  return (
                    <td key={dateKey} className="p-1 align-top">
                      <div className={`min-h-[144px] rounded-xl border p-1.5 flex flex-col gap-1 transition-colors overflow-hidden ${
                        isPast ? 'bg-gray-50/50 border-gray-100'
                        : plan?.logged ? 'bg-green-50/50 border-green-200'
                        : 'bg-white border-[var(--border)] hover:border-gray-300'
                      }`}>
                        {plan?.logged && (
                          <div className="flex items-center gap-1 text-[10px] text-green-500 font-medium px-0.5">
                            <CheckCircle2 size={10} /> 기록됨
                          </div>
                        )}
                        {plannedEntries.map(({ cube, count }) => (
                          <div
                            key={cube.id}
                            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-lg border w-full ${MEAL_COLORS[mealTime]} ${isPast ? 'opacity-70' : ''}`}
                          >
                            <span className="leading-none">{cube.emoji}</span>
                            <span className="truncate flex-1 font-medium min-w-0">{cube.name}</span>
                            {count > 1 && <span className="font-bold flex-shrink-0">{count}</span>}
                            <button
                              onClick={() => removeCube(dateKey, mealTime, cube.id, cube.name)}
                              className="opacity-50 hover:opacity-100 transition flex-shrink-0"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {(plan?.custom_items ?? []).map((item, i) => (
                          <div
                            key={`custom-${i}`}
                            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-lg border w-full bg-purple-50 border-purple-200 text-purple-700 ${isPast ? 'opacity-70' : ''}`}
                          >
                            <span className="truncate flex-1 font-medium min-w-0">{item.name}</span>
                            {item.grams > 0 && <span className="flex-shrink-0 opacity-60">{item.grams}g</span>}
                            <button
                              onClick={() => {
                                const newCustomItems = (plan?.custom_items ?? []).filter((_, j) => j !== i);
                                handleSave(dateKey, mealTime, plan?.cube_ids ?? [], newCustomItems);
                              }}
                              className="opacity-50 hover:opacity-100 transition flex-shrink-0"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setEditing({ date: dateKey, meal_time: mealTime })}
                          className="flex items-center justify-center w-full mt-auto py-0.5 rounded-lg text-gray-300 hover:text-[var(--primary)] hover:bg-orange-50 transition"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteAllDate && (() => {
        const hasLogs = getLogs().some((l) => l.logged_at.startsWith(deleteAllDate));
        const dateLabel = new Date(deleteAllDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
        return (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 flex flex-col gap-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold">{dateLabel}</span> 식단 계획을 전체 삭제할게요.
                {hasLogs && <><br />소비 기록도 함께 삭제할까요?</>}
              </p>
              <div className="flex flex-col gap-2">
                {hasLogs && (
                  <button
                    onClick={() => handleDeleteAllByDate(deleteAllDate, true)}
                    className="py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition"
                  >
                    소비 기록도 함께 삭제
                  </button>
                )}
                <button
                  onClick={() => handleDeleteAllByDate(deleteAllDate, false)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition ${hasLogs ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-500 text-white hover:bg-red-600'}`}
                >
                  {hasLogs ? '식단 계획만 삭제' : '삭제'}
                </button>
                <button
                  onClick={() => setDeleteAllDate(null)}
                  className="py-2 text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {deleteAllMealTime && (() => {
        const hasLogs = getLogs().some((l) => l.meal_time === deleteAllMealTime);
        return (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 flex flex-col gap-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold">{MEAL_TIMES[deleteAllMealTime]}</span> 식단 계획을 전체 삭제할게요.
                {hasLogs && <><br />소비 기록도 함께 삭제할까요?</>}
              </p>
              <div className="flex flex-col gap-2">
                {hasLogs && (
                  <button
                    onClick={() => handleDeleteAllByMealTime(deleteAllMealTime, true)}
                    className="py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition"
                  >
                    소비 기록도 함께 삭제
                  </button>
                )}
                <button
                  onClick={() => handleDeleteAllByMealTime(deleteAllMealTime, false)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition ${hasLogs ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-500 text-white hover:bg-red-600'}`}
                >
                  {hasLogs ? '식단 계획만 삭제' : '삭제'}
                </button>
                <button
                  onClick={() => setDeleteAllMealTime(null)}
                  className="py-2 text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {removeConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 flex flex-col gap-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-semibold">{removeConfirm.cubeName}</span>을(를) 식단에서 삭제할게요.<br />
              소비 기록도 함께 삭제할까요?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => doRemoveCube(removeConfirm.date, removeConfirm.meal_time, removeConfirm.cubeId, true)}
                className="py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition"
              >
                소비 기록도 함께 삭제
              </button>
              <button
                onClick={() => doRemoveCube(removeConfirm.date, removeConfirm.meal_time, removeConfirm.cubeId, false)}
                className="py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
              >
                식단 계획만 삭제
              </button>
              <button
                onClick={() => setRemoveConfirm(null)}
                className="py-2 text-sm text-gray-400 hover:text-gray-600 transition"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <CubeSelector
          cubes={cubes}
          selected={editingPlan?.cube_ids ?? []}
          selectedCustomItems={editingPlan?.custom_items ?? []}
          onClose={() => setEditing(null)}
          onSave={(ids, customItems) => handleSave(editing.date, editing.meal_time, ids, customItems)}
        />
      )}
    </div>
  );
}

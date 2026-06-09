'use client';

import { ConsumptionLog, Cube, MealPlan } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isHoliday } from '@/lib/holidays';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MEAL_LABELS: Record<MealPlan['meal_time'], string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};
const MEAL_ORDER: MealPlan['meal_time'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface Props {
  viewYear: number;
  viewMonth: number;
  selectedDate: string;
  todayKey: string;
  cells: (number | null)[];
  logsByDate: Record<string, ConsumptionLog[]>;
  cubes: Cube[];
  holidays: Set<string>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateKey: string) => void;
  onGoToday: () => void;
}

export default function LogCalendar({
  viewYear, viewMonth, selectedDate, todayKey, cells, logsByDate, cubes, holidays,
  onPrevMonth, onNextMonth, onSelectDate, onGoToday,
}: Props) {
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const selectedLogs = logsByDate[selectedDate] ?? [];

  function calcStats(logs: ConsumptionLog[]) {
    const count = logs.reduce((s, l) => s + l.quantity, 0);
    const grams = logs.reduce((s, l) => {
      if (l.grams_override !== undefined) return s + l.grams_override;
      const cube = cubes.find((c) => c.id === l.cube_id);
      return s + l.quantity * (cube?.grams_per_cube ?? 0);
    }, 0);
    return { count, grams };
  }

  const mealStats = MEAL_ORDER.map((mt) => ({
    mt,
    ...calcStats(selectedLogs.filter((l) => l.meal_time === mt)),
  })).filter((s) => s.count > 0);

  const totalStats = calcStats(selectedLogs);

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-6 xl:w-[560px] flex-shrink-0">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onPrevMonth} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-3">
          <span className="font-bold text-xl text-gray-800">
            {viewYear}년 {viewMonth + 1}월
          </span>
          <button
            onClick={onGoToday}
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
              selectedDate === todayKey
                ? 'bg-gray-100 text-gray-400 cursor-default'
                : 'bg-orange-50 text-[var(--primary)] hover:bg-orange-100'
            }`}
          >
            오늘
          </button>
        </div>
        <button onClick={onNextMonth} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-sm font-semibold py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-16" />;
          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayLogs = logsByDate[dateKey] ?? [];
          const logCount = dayLogs.reduce((s, l) => s + l.quantity, 0);
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;
          const weekday = i % 7;
          const isRed = !isSelected && (weekday === 0 || isHoliday(dateKey, holidays));
          const isBlue = !isSelected && !isRed && weekday === 6;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateKey)}
              className={`relative flex flex-col items-center justify-start pt-2.5 h-16 rounded-xl text-base transition-colors ${
                isSelected
                  ? 'bg-[var(--primary)] text-white font-bold'
                  : isToday
                  ? 'bg-orange-50 font-bold'
                  : 'hover:bg-gray-50'
              } ${isRed ? 'text-red-400' : ''} ${isBlue ? 'text-blue-400' : ''} ${isToday && !isSelected && !isRed && !isBlue ? 'text-[var(--primary)]' : ''}`}
            >
              <span>{day}</span>
              {logCount > 0 && (
                <span className={`text-[10px] font-semibold mt-0.5 leading-none ${isSelected ? 'text-white/80' : 'text-[var(--primary)]'}`}>
                  {logCount}개
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-400 flex flex-col gap-1.5">
        {mealStats.map(({ mt, count, grams }) => (
          <div key={mt} className="flex justify-between">
            <span>{MEAL_LABELS[mt]}</span>
            <span className="text-gray-500">{grams.toLocaleString()}g <span className="text-gray-300 mx-1">/</span> {count}큐브</span>
          </div>
        ))}
        {mealStats.length > 0 && <div className="border-t border-gray-100 pt-1.5" />}
        <div className="flex justify-between font-medium text-gray-500">
          <span>총</span>
          <span>{totalStats.grams.toLocaleString()}g <span className="text-gray-300 mx-1">/</span> {totalStats.count}큐브</span>
        </div>
      </div>
    </div>
  );
}

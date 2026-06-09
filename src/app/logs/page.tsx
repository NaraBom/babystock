'use client';

import { useMemo, useState, useEffect } from 'react';
import { useHolidays } from '@/hooks/useHolidays';
import { Cube, ConsumptionLog, Reaction } from '@/types';
import { getCubes, getLogs, saveLogs, addLog, deleteLog, deleteCube, updateLog } from '@/lib/storage';
import { Plus, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import LogCalendar from '@/components/LogCalendar';
import LogList from '@/components/LogList';
import LogForm, { LogEntry } from '@/components/LogForm';

type MealTime = ConsumptionLog['meal_time'];
type MergedLog = ConsumptionLog & { _ids: string[] };

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function LogsPage() {
  const [cubes, setCubes] = useState<Cube[]>(() => getCubes());
  const [logs, setLogs] = useState<ConsumptionLog[]>(() => getLogs());

  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const holidays = useHolidays([viewYear - 1, viewYear, viewYear + 1].filter((y, i, a) => a.indexOf(y) === i));
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));

  useEffect(() => {
    function scheduleNextMidnight() {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
      return setTimeout(() => {
        const newKey = toDateKey(new Date());
        setTodayKey(newKey);
        scheduleNextMidnight();
      }, msUntilMidnight);
    }
    const id = scheduleNextMidnight();
    return () => clearTimeout(id);
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<MergedLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MergedLog | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [depleted, setDepleted] = useState<Cube | null>(null);
  const [form, setForm] = useState({
    error: null as string | null,
    date: todayKey,
    time: new Date().toTimeString().slice(0, 5),
    notes: '',
    entries: [{ id: crypto.randomUUID(), cubeId: '', customName: '', customGrams: 0, isCustom: false, quantity: 1 }] as LogEntry[],
  });

  const logsByDate = useMemo(() => {
    const map: Record<string, ConsumptionLog[]> = {};
    for (const log of logs) {
      const key = toDateKey(new Date(log.logged_at));
      if (!map[key]) map[key] = [];
      map[key].push(log);
    }
    return map;
  }, [logs]);

  const cells = useMemo((): (number | null)[] => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startOffset = firstDay.getDay();
    const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const day = i - startOffset + 1;
      return day >= 1 && day <= lastDay.getDate() ? day : null;
    });
  }, [viewYear, viewMonth]);

  const selectedLogs = useMemo((): MergedLog[] => {
    const sorted = (logsByDate[selectedDate] ?? []).sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    const merged: MergedLog[] = [];
    for (const log of sorted) {
      const key = `${log.cube_id}__${log.meal_time}`;
      const existing = merged.find(m => `${m.cube_id}__${m.meal_time}` === key);
      if (existing) {
        existing.quantity += log.quantity;
        existing._ids.push(log.id);
      } else {
        merged.push({ ...log, _ids: [log.id] });
      }
    }
    return merged;
  }, [logsByDate, selectedDate]);

  const selectedDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  function goToday() {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(toDateKey(now));
  }

  function openForm() {
    setForm({ error: null, date: selectedDate, time: new Date().toTimeString().slice(0, 5), notes: '', entries: [{ id: crypto.randomUUID(), cubeId: '', customName: '', customGrams: 0, isCustom: false, quantity: 1 }] });
    setShowForm(true);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const hour = parseInt(form.time.split(':')[0]);
    let mealTime: MealTime = 'snack';
    if (hour >= 6 && hour < 9) mealTime = 'breakfast';
    else if (hour >= 10 && hour < 13) mealTime = 'lunch';
    else if (hour >= 14 && hour < 17) mealTime = 'dinner';
    const loggedAt = new Date(`${form.date}T${form.time}:00`).toISOString();

    const totalByCube = new Map<string, number>();
    for (const entry of form.entries) {
      if (entry.isCustom || !entry.cubeId) continue;
      totalByCube.set(entry.cubeId, (totalByCube.get(entry.cubeId) ?? 0) + entry.quantity);
    }
    for (const [cubeId, total] of totalByCube) {
      const cube = cubes.find((c) => c.id === cubeId);
      if (!cube) continue;
      if (total > cube.quantity) {
        setForm((f) => ({ ...f, error: `[${cube.name}] 재고 부족: 재고 ${cube.quantity}개, 입력 합계 ${total}개` }));
        return;
      }
    }

    let firstDepleted: Cube | null = null;
    for (const entry of form.entries) {
      if (entry.isCustom) {
        if (!entry.customName.trim()) continue;
        addLog({ cube_id: '', cube_name: entry.customName.trim(), quantity: entry.quantity, grams_override: entry.customGrams > 0 ? entry.customGrams : undefined, meal_time: mealTime, logged_at: loggedAt, notes: form.notes || null, reaction: null });
      } else {
        if (!entry.cubeId) continue;
        const cube = cubes.find((c) => c.id === entry.cubeId);
        if (!cube) continue;
        addLog({ cube_id: entry.cubeId, cube_name: cube.name, quantity: entry.quantity, meal_time: mealTime, logged_at: loggedAt, notes: form.notes || null, reaction: null });
        const updatedCube = getCubes().find((c) => c.id === entry.cubeId);
        if (!firstDepleted && updatedCube && updatedCube.quantity === 0) firstDepleted = updatedCube;
      }
    }

    setLogs(getLogs());
    setCubes(getCubes());
    setShowForm(false);

    if (firstDepleted) setDepleted(firstDepleted);
  }

  function openEditForm(log: MergedLog) {
    const d = new Date(log.logged_at);
    setEditTarget(log);
    setForm({
      error: null,
      date: toDateKey(d),
      time: d.toTimeString().slice(0, 5),
      notes: log.notes ?? '',
      entries: [{ id: crypto.randomUUID(), cubeId: log.cube_id || '', customName: log.cube_id ? '' : log.cube_name, customGrams: log.grams_override ?? 0, isCustom: !log.cube_id, quantity: log.quantity }],
    });
    setShowForm(true);
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;

    const hour = parseInt(form.time.split(':')[0]);
    let mealTime: MealTime = 'snack';
    if (hour >= 6 && hour < 9) mealTime = 'breakfast';
    else if (hour >= 10 && hour < 13) mealTime = 'lunch';
    else if (hour >= 14 && hour < 17) mealTime = 'dinner';
    const loggedAt = new Date(`${form.date}T${form.time}:00`).toISOString();

    // 복원될 재고를 포함해서 유효성 검사 (큐브 선택 항목만)
    for (const entry of form.entries) {
      if (entry.isCustom || !entry.cubeId) continue;
      const cube = cubes.find((c) => c.id === entry.cubeId);
      if (!cube) continue;
      const restoredQty = entry.cubeId === editTarget.cube_id
        ? cube.quantity + editTarget.quantity
        : cube.quantity;
      if (entry.quantity > restoredQty) {
        setForm((f) => ({ ...f, error: `[${cube.name}] 재고 부족: 재고 ${restoredQty}개, 입력 ${entry.quantity}개` }));
        return;
      }
    }

    // 기존 기록 삭제 (재고 복원)
    editTarget._ids.forEach((id) => deleteLog(id, true));

    // 새 기록 추가
    for (const entry of form.entries) {
      if (entry.isCustom) {
        if (!entry.customName.trim()) continue;
        addLog({ cube_id: '', cube_name: entry.customName.trim(), quantity: entry.quantity, grams_override: entry.customGrams > 0 ? entry.customGrams : undefined, meal_time: mealTime, logged_at: loggedAt, notes: form.notes || null, reaction: null });
      } else {
        if (!entry.cubeId) continue;
        const cube = getCubes().find((c) => c.id === entry.cubeId);
        if (!cube) continue;
        addLog({ cube_id: entry.cubeId, cube_name: cube.name, quantity: entry.quantity, meal_time: mealTime, logged_at: loggedAt, notes: form.notes || null, reaction: null });
      }
    }

    setLogs(getLogs());
    setCubes(getCubes());
    setShowForm(false);
    setEditTarget(null);
  }

  function handleReactionChange(log: MergedLog, reaction: Reaction | null) {
    log._ids.forEach((id) => updateLog(id, { reaction }));
    setLogs(getLogs());
  }

  function handleDelete(restoreStock: boolean) {
    if (!deleteTarget) return;
    deleteTarget._ids.forEach((id) => deleteLog(id, restoreStock));
    setLogs(getLogs());
    setCubes(getCubes());
    setDeleteTarget(null);
  }

  function handleDeleteAll(restoreStock: boolean) {
    if (restoreStock) {
      logs.forEach((log) => deleteLog(log.id, true));
    } else {
      saveLogs([]);
    }
    setLogs([]);
    setCubes(getCubes());
    setShowDeleteAll(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">소비 기록</h1>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={() => setShowDeleteAll(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition"
            >
              <Trash2 size={14} />
              전체 삭제
            </button>
          )}
          <button
            onClick={openForm}
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-xl hover:opacity-90 transition text-sm font-medium"
          >
            <Plus size={16} />
            기록 추가
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        <LogCalendar
          viewYear={viewYear}
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          todayKey={todayKey}
          cells={cells}
          logsByDate={logsByDate}
          cubes={cubes}
          holidays={holidays}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onSelectDate={setSelectedDate}
          onGoToday={goToday}
        />
        <LogList
          selectedLogs={selectedLogs}
          selectedDateLabel={selectedDateLabel}
          cubes={cubes}
          onAddClick={openForm}
          onDeleteClick={setDeleteTarget}
          onEditClick={openEditForm}
          onReactionChange={handleReactionChange}
        />
      </div>

      {showForm && (
        <LogForm
          cubes={cubes}
          entries={form.entries}
          formDate={form.date}
          formTime={form.time}
          notes={form.notes}
          formError={form.error}
          todayKey={todayKey}
          title={editTarget ? '소비 기록 수정' : '소비 기록 추가'}
          onChangeEntries={(entries) => setForm((f) => ({ ...f, entries }))}
          onChangeFormDate={(date) => setForm((f) => ({ ...f, date }))}
          onChangeFormTime={(time) => setForm((f) => ({ ...f, time }))}
          onChangeNotes={(notes) => setForm((f) => ({ ...f, notes }))}
          onSubmit={editTarget ? handleEdit : handleAdd}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="소비 기록 삭제"
          message={`"${deleteTarget.cube_name}" ${deleteTarget.quantity}개 기록을 삭제할까요?`}
          extraLabel="재고도 복원하고 삭제"
          confirmLabel="기록만 삭제"
          cancelLabel="취소"
          danger
          onExtra={() => handleDelete(true)}
          onConfirm={() => handleDelete(false)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showDeleteAll && (
        <ConfirmModal
          title="소비 기록 전체 삭제"
          message={`기록된 소비 기록 ${logs.length}건을 모두 삭제할까요?`}
          extraLabel="재고도 복원하고 삭제"
          confirmLabel="기록만 삭제"
          cancelLabel="취소"
          danger
          onExtra={() => handleDeleteAll(true)}
          onConfirm={() => handleDeleteAll(false)}
          onCancel={() => setShowDeleteAll(false)}
        />
      )}

      {depleted && (
        <ConfirmModal
          title="🎉 큐브 소진 완료!"
          message={`'${depleted.name}' 큐브가 모두 소진되었습니다.\n큐브 목록에서 삭제할까요?`}
          confirmLabel="삭제"
          cancelLabel="유지"
          danger
          onConfirm={() => {
            deleteCube(depleted.id);
            setCubes(getCubes());
            setDepleted(null);
          }}
          onCancel={() => setDepleted(null)}
        />
      )}
    </div>
  );
}

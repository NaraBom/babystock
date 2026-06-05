'use client';

import { useMemo, useState } from 'react';
import { Cube, ConsumptionLog } from '@/types';
import { getCubes, getLogs, addLog, deleteLog, deleteCube } from '@/lib/storage';
import { Plus } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import LogCalendar from '@/components/LogCalendar';
import LogList from '@/components/LogList';
import LogForm, { LogEntry } from '@/components/LogForm';

type MealTime = ConsumptionLog['meal_time'];
type MergedLog = ConsumptionLog & { _ids: string[] };

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function LogsPage() {
  const [cubes, setCubes] = useState<Cube[]>(() => getCubes());
  const [logs, setLogs] = useState<ConsumptionLog[]>(() => getLogs());

  const today = new Date();
  const todayKey = toDateKey(today);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MergedLog | null>(null);
  const [depleted, setDepleted] = useState<Cube | null>(null);
  const [form, setForm] = useState({
    error: null as string | null,
    date: todayKey,
    time: new Date().toTimeString().slice(0, 5),
    notes: '',
    entries: [{ id: crypto.randomUUID(), cubeId: '', quantity: 1 }] as LogEntry[],
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
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayKey);
  }

  function openForm() {
    setForm({ error: null, date: selectedDate, time: new Date().toTimeString().slice(0, 5), notes: '', entries: [{ id: crypto.randomUUID(), cubeId: '', quantity: 1 }] });
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
      if (!entry.cubeId) continue;
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
      if (!entry.cubeId) continue;
      const cube = cubes.find((c) => c.id === entry.cubeId);
      if (!cube) continue;
      addLog({ cube_id: entry.cubeId, cube_name: cube.name, quantity: entry.quantity, meal_time: mealTime, logged_at: loggedAt, notes: form.notes || null });
      const updatedCube = getCubes().find((c) => c.id === entry.cubeId);
      if (!firstDepleted && updatedCube && updatedCube.quantity === 0) firstDepleted = updatedCube;
    }

    setLogs(getLogs());
    setCubes(getCubes());
    setShowForm(false);

    if (firstDepleted) setDepleted(firstDepleted);
  }

  function handleDelete(restoreStock: boolean) {
    if (!deleteTarget) return;
    deleteTarget._ids.forEach((id) => deleteLog(id, restoreStock));
    setLogs(getLogs());
    setCubes(getCubes());
    setDeleteTarget(null);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">소비 기록</h1>
        <button
          onClick={openForm}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-xl hover:opacity-90 transition text-sm font-medium"
        >
          <Plus size={16} />
          기록 추가
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        <LogCalendar
          viewYear={viewYear}
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          todayKey={todayKey}
          cells={cells}
          logsByDate={logsByDate}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onSelectDate={setSelectedDate}
          onGoToday={goToday}
        />
        <LogList
          selectedLogs={selectedLogs}
          selectedDateLabel={selectedDateLabel}
          onAddClick={openForm}
          onDeleteClick={setDeleteTarget}
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
          onChangeEntries={(entries) => setForm((f) => ({ ...f, entries }))}
          onChangeFormDate={(date) => setForm((f) => ({ ...f, date }))}
          onChangeFormTime={(time) => setForm((f) => ({ ...f, time }))}
          onChangeNotes={(notes) => setForm((f) => ({ ...f, notes }))}
          onSubmit={handleAdd}
          onClose={() => setShowForm(false)}
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

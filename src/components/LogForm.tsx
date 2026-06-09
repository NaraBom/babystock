'use client';

import { Cube, CATEGORIES } from '@/types';
import { Plus, X } from 'lucide-react';
import DateInput from '@/components/DateInput';

export interface LogEntry {
  id: string;
  cubeId: string;       // 큐브 선택 시 사용
  customName: string;   // 직접 입력 시 사용 (cubeId가 빈 문자열일 때)
  customGrams: number;  // 직접 입력 시 그램 수
  isCustom: boolean;    // 직접 입력 모드 여부
  quantity: number;
}

interface Props {
  cubes: Cube[];
  entries: LogEntry[];
  formDate: string;
  formTime: string;
  notes: string;
  formError: string | null;
  todayKey: string;
  title?: string;
  onChangeEntries: (entries: LogEntry[]) => void;
  onChangeFormDate: (date: string) => void;
  onChangeFormTime: (time: string) => void;
  onChangeNotes: (notes: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function LogForm({
  cubes, entries, formDate, formTime, notes, formError, todayKey,
  title = '소비 기록 추가',
  onChangeEntries, onChangeFormDate, onChangeFormTime, onChangeNotes,
  onSubmit, onClose,
}: Props) {
  function toggleMode(idx: number) {
    const next = [...entries];
    const entry = next[idx];
    next[idx] = { ...entry, isCustom: !entry.isCustom, cubeId: '', customName: '' };
    onChangeEntries(next);
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 overflow-y-auto p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 mx-auto overflow-hidden"
        style={{ marginTop: 'max(1rem, 10vh)', marginBottom: 'max(1rem, 10vh)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">날짜</label>
            <DateInput
              value={formDate}
              onChange={(v) => onChangeFormDate(v ?? todayKey)}
              placeholder={false}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">시간</label>
            <input
              type="time"
              value={formTime}
              onChange={(e) => onChangeFormTime(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">큐브 *</label>
          {entries.map((entry, idx) => (
            <div key={entry.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {entry.isCustom ? (
                  <>
                    <input
                      type="text"
                      required
                      value={entry.customName}
                      onChange={(e) => {
                        const next = [...entries];
                        next[idx] = { ...next[idx], customName: e.target.value };
                        onChangeEntries(next);
                      }}
                      placeholder="직접 입력 (예: 사과퓨레)"
                      className="input min-w-0 flex-1"
                      style={{ width: 0 }}
                    />
                    <input
                      type="number"
                      min={0}
                      value={entry.customGrams || ''}
                      onChange={(e) => {
                        const next = [...entries];
                        next[idx] = { ...next[idx], customGrams: Math.max(0, Number(e.target.value)) };
                        onChangeEntries(next);
                      }}
                      placeholder="g"
                      className="input text-center flex-shrink-0 placeholder-gray-300"
                      style={{ width: '52px' }}
                    />
                  </>
                ) : (
                  <select
                    required
                    value={entry.cubeId}
                    onChange={(e) => {
                      const next = [...entries];
                      next[idx] = { ...next[idx], cubeId: e.target.value };
                      onChangeEntries(next);
                    }}
                    className="input min-w-0 flex-1"
                    style={{ width: 0 }}
                  >
                    <option value="">큐브 선택</option>
                    {CATEGORIES.filter((cat) => cubes.some((c) => c.category === cat)).map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {cubes.filter((c) => c.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((c) => (
                          <option key={c.id} value={c.id} disabled={c.quantity === 0}>
                            {c.quantity === 0 ? `[재고없음] ${c.name} (${c.grams_per_cube}g)` : `${c.name} (${c.quantity}개 · ${c.grams_per_cube}g)`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = [...entries];
                    next[idx] = { ...next[idx], quantity: Math.max(1, next[idx].quantity - 1) };
                    onChangeEntries(next);
                  }}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-base hover:bg-gray-50 transition flex-shrink-0"
                >−</button>
                <input
                  type="number"
                  required
                  min={1}
                  max={99}
                  value={entry.quantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const next = [...entries];
                    next[idx] = { ...next[idx], quantity: Math.max(1, Number(e.target.value)) };
                    onChangeEntries(next);
                  }}
                  className="input text-center flex-shrink-0"
                  style={{ width: '56px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = [...entries];
                    next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
                    onChangeEntries(next);
                  }}
                  className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-base hover:opacity-90 transition flex-shrink-0"
                >+</button>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChangeEntries(entries.filter((_, i) => i !== idx))}
                    className="w-7 h-7 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 flex items-center justify-center transition flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleMode(idx)}
                className="self-start text-[11px] text-gray-400 hover:text-[var(--primary)] transition ml-0.5"
              >
                {entry.isCustom ? '← 큐브 선택으로' : '직접 입력 →'}
              </button>
            </div>
          ))}
          {entries.length < 10 && (
            <button
              type="button"
              onClick={() => onChangeEntries([...entries, { id: crypto.randomUUID(), cubeId: '', customName: '', customGrams: 0, isCustom: false, quantity: 1 }])}
              className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline self-start mt-0.5"
            >
              <Plus size={13} />
              항목 추가 ({entries.length}/10)
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">메모 (선택)</label>
          <textarea
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="예: 잘 먹었어요"
            rows={3}
            className="input w-full resize-none"
          />
        </div>

        {formError && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
        )}

        <div className="flex gap-2 mt-1">
          <button type="submit" className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition text-sm">
            저장
          </button>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition text-sm">
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ConsumptionLog, Cube, Reaction, REACTIONS } from '@/types';
import { Pencil, Trash2, UtensilsCrossed } from 'lucide-react';

interface MergedLog extends ConsumptionLog {
  _ids: string[];
}

interface Props {
  selectedLogs: MergedLog[];
  selectedDateLabel: string;
  cubes: Cube[];
  onAddClick: () => void;
  onDeleteClick: (log: MergedLog) => void;
  onEditClick: (log: MergedLog) => void;
  onReactionChange: (log: MergedLog, reaction: Reaction | null) => void;
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ReactionBadge({ log, onChange }: { log: MergedLog; onChange: (r: Reaction | null) => void }) {
  const [open, setOpen] = useState(false);
  const r = log.reaction;
  const info = r ? REACTIONS[r] : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs px-2 py-0.5 rounded-full border transition ${
          r
            ? 'border-transparent bg-gray-50 ' + info!.color
            : 'border-dashed border-gray-200 text-gray-300 hover:border-gray-300'
        }`}
      >
        {r ? `${info!.emoji} ${info!.label}` : '반응 기록'}
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-20 bg-white border border-[var(--border)] rounded-xl shadow-lg p-1 flex flex-col gap-0.5 min-w-[96px]">
          {(Object.entries(REACTIONS) as [Reaction, typeof REACTIONS[Reaction]][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className={`text-xs text-left px-3 py-1.5 rounded-lg hover:bg-gray-50 ${r === key ? 'font-bold ' + val.color : 'text-gray-600'}`}
            >
              {val.emoji} {val.label}
            </button>
          ))}
          {r && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="text-xs text-left px-3 py-1.5 rounded-lg hover:bg-red-50 text-gray-400"
            >
              기록 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LogList({ selectedLogs, selectedDateLabel, cubes, onAddClick, onDeleteClick, onEditClick, onReactionChange }: Props) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">{selectedDateLabel}</h2>
        {selectedLogs.length > 0 && (
          <span className="text-xs text-gray-400">총 {selectedLogs.reduce((s, l) => s + l.quantity, 0)}큐브</span>
        )}
      </div>

      {selectedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300 bg-white rounded-2xl border border-[var(--border)]">
          <UtensilsCrossed size={36} className="mb-3" />
          <p className="text-sm">이날 기록이 없어요</p>
          <button onClick={onAddClick} className="mt-3 text-xs text-[var(--primary)] hover:underline">
            기록 추가하기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-gray-100">
          {selectedLogs.map((log) => (
            <div key={log.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-12 flex-shrink-0">
                    {formatTime(log.logged_at)}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0" />
                  <span className="font-semibold text-gray-800">{log.cube_name}</span>
                  {(() => { const g = log.grams_override ?? cubes.find((c) => c.id === log.cube_id)?.grams_per_cube; return g != null ? <span className="text-xs text-gray-400">{g}g</span> : null; })()}
                  <ReactionBadge log={log} onChange={(r) => onReactionChange(log, r)} />
                  {log.notes && (
                    <span className="text-xs text-gray-400 truncate max-w-32">{log.notes}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-700">{log.quantity}개</span>
                  <button
                    onClick={() => onEditClick(log)}
                    className="p-1 rounded hover:bg-orange-50 text-gray-300 hover:text-[var(--primary)] transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteClick(log)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

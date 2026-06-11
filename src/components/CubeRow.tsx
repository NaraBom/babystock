'use client';

import { useState, useRef } from 'react'; // useRef: expiry date inputs
import Link from 'next/link';
import { Cube, getStockStatus } from '@/types';
import EmojiDisplay from '@/components/EmojiDisplay';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { updateCube, deleteCube } from '@/lib/storage';
import ConfirmModal from '@/components/ConfirmModal';

interface Props {
  cube: Cube;
  expiryWarningDays?: number;
  onUpdate?: (cube: Cube) => void;
  onDelete?: (id: string) => void;
}

function formatIntroducedAt(isoString: string): string {
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  // 로컬 자정 기준으로 경과일 계산 (UTC 파싱 오차 방지)
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date();
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysElapsed = Math.floor((localToday.getTime() - localDate.getTime()) / 86400000);
  return `${dateStr} (D+${daysElapsed})`;
}

const STATUS_CONFIG = {
  ok:      { bar: 'bg-green-400',  text: 'text-green-600',  label: '충분' },
  warning: { bar: 'bg-yellow-400', text: 'text-yellow-600', label: '주의' },
  danger:  { bar: 'bg-red-400',    text: 'text-red-500',    label: '부족' },
};

export default function CubeRow({ cube, expiryWarningDays = 7, onUpdate, onDelete }: Props) {
  const status = getStockStatus(cube.quantity, cube.warning_threshold, cube.danger_threshold);
  const { bar, text, label } = STATUS_CONFIG[status];
  const [now] = useState(() => Date.now());

  const msUntilExpiry = cube.expiry_date
    ? new Date(cube.expiry_date).getTime() - now
    : null;
  const isExpired      = msUntilExpiry !== null && msUntilExpiry < 0;
  const isExpiringSoon = msUntilExpiry !== null && msUntilExpiry >= 0 && msUntilExpiry < expiryWarningDays * 24 * 60 * 60 * 1000;

  // 인라인 편집 상태
  const [editingExpiry, setEditingExpiry]     = useState(false);
  const [expiryWarn, setExpiryWarn]           = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 날짜 세 칸 분리
  const parsedDate = cube.expiry_date ? cube.expiry_date.split('-') : ['', '', ''];
  const [yyyy, setYyyy] = useState(parsedDate[0] ?? '');
  const [mm,   setMm]   = useState(parsedDate[1] ?? '');
  const [dd,   setDd]   = useState(parsedDate[2] ?? '');
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef   = useRef<HTMLInputElement>(null);

  function saveExpiry() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const value = yyyy && mm && dd ? `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}` : null;
    if (value && value < todayStr) {
      setExpiryWarn(true);
      return;
    }
    setExpiryWarn(false);
    const updated = updateCube(cube.id, { expiry_date: value });
    if (updated && onUpdate) onUpdate(updated);
    setEditingExpiry(false);
  }

  function cancelExpiry() {
    setExpiryWarn(false);
    setEditingExpiry(false);
  }

  function adjustQuantity(delta: number) {
    const updated = updateCube(cube.id, { quantity: Math.max(0, cube.quantity + delta) });
    if (updated && onUpdate) onUpdate(updated);
  }

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {/* 상태 바 */}
        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${bar}`} />

        {/* 이모티콘 + 이름 + g */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <EmojiDisplay emoji={cube.emoji ?? '/emojis/채소/carrot.png'} size={20} />
          <Link
            href={`/cubes/${cube.id}`}
            className="font-medium text-gray-800 hover:text-[var(--primary)] transition-colors truncate text-sm"
          >
            {cube.name}
          </Link>
          <span className="text-xs text-gray-400 flex-shrink-0">{cube.grams_per_cube}g</span>
          <span className="text-xs text-gray-400 flex-shrink-0">· 도입 {formatIntroducedAt(cube.introduced_at ?? cube.created_at)}</span>
        </div>

        {/* 유통기한 — 모바일 전용 인라인 표시 */}
        <div className="sm:hidden text-xs flex-shrink-0">
          {isExpired && cube.expiry_date && (
            <span className="text-red-500 font-medium">🚫 {cube.expiry_date}</span>
          )}
          {isExpiringSoon && !isExpired && cube.expiry_date && (
            <span className="text-orange-500 font-medium">⚠ {cube.expiry_date}</span>
          )}
          {!isExpired && !isExpiringSoon && (
            <span className="text-gray-400">{cube.expiry_date ?? '기한 없음'}</span>
          )}
        </div>

        {/* 유통기한 — 클릭 시 date input (PC) */}
        <div className="hidden sm:block w-36 text-xs flex-shrink-0">
          {editingExpiry ? (
            <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-0.5 text-xs">
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder="YYYY"
                maxLength={4}
                value={yyyy}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setYyyy(v);
                  if (v.length === 4) monthRef.current?.focus();
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => { if (e.key === 'Enter') saveExpiry(); if (e.key === 'Escape') cancelExpiry(); }}
                className="w-12 text-center border border-[var(--primary)] rounded-md py-0.5 focus:outline-none"
              />
              <span className="text-gray-400">-</span>
              <input
                ref={monthRef}
                type="text"
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                value={mm}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setMm(v);
                  if (v.length === 2) dayRef.current?.focus();
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => { if (e.key === 'Enter') saveExpiry(); if (e.key === 'Escape') cancelExpiry(); }}
                className="w-8 text-center border border-[var(--primary)] rounded-md py-0.5 focus:outline-none"
              />
              <span className="text-gray-400">-</span>
              <input
                ref={dayRef}
                type="text"
                inputMode="numeric"
                placeholder="DD"
                maxLength={2}
                value={dd}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setDd(v);
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => { if (e.key === 'Enter') saveExpiry(); if (e.key === 'Escape') cancelExpiry(); }}
                onBlur={saveExpiry}
                className="w-8 text-center border border-[var(--primary)] rounded-md py-0.5 focus:outline-none"
              />
            </div>
            {expiryWarn && (
              <span className="text-red-500" style={{ fontSize: '10px' }}>오늘 이후 날짜를 입력해 주세요.</span>
            )}
            </div>
          ) : (
            <button
              onClick={() => {
                const p = cube.expiry_date ? cube.expiry_date.split('-') : ['', '', ''];
                setYyyy(p[0] ?? ''); setMm(p[1] ?? ''); setDd(p[2] ?? '');
                setExpiryWarn(false);
                setEditingExpiry(true);
              }}
              className="text-left w-full hover:underline decoration-dashed underline-offset-2"
            >
              {isExpired && cube.expiry_date && (
                <span className="text-red-500 font-medium">🚫 만료 ({cube.expiry_date})</span>
              )}
              {isExpiringSoon && !isExpired && cube.expiry_date && (
                <span className="text-orange-500 font-medium">⚠ 임박 ({cube.expiry_date})</span>
              )}
              {!isExpired && !isExpiringSoon && (
                <span className="text-gray-500">{cube.expiry_date ?? '기한 없음'}</span>
              )}
            </button>
          )}
        </div>


        {/* 수량 + 상태 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium ${text} w-8 text-right`}>{label}</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => adjustQuantity(-1)}
              className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-transform"
            >
              <Minus size={8} />
            </button>
            <span className="text-sm font-bold text-gray-800 w-5 text-center">
              {cube.quantity}
            </span>
            <button
              onClick={() => adjustQuantity(1)}
              className="w-5 h-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform"
            >
              <Plus size={8} />
            </button>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="큐브 삭제"
          message={`'${cube.name}'을(를) 삭제할까요? 소비 기록은 유지됩니다.`}
          confirmLabel="삭제"
          danger
          onConfirm={() => {
            deleteCube(cube.id);
            onDelete?.(cube.id);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* 수량 도트 표시 */}
      <div className="flex items-center gap-0.5 mt-1.5 pl-4">
        {cube.quantity === 0 ? (
          <span className="text-xs text-gray-300">-</span>
        ) : (
          <>
            {Array.from({ length: Math.min(cube.quantity, 20) }).map((_, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && i % 10 === 0 && (
                  <span className="text-xs leading-none text-gray-400 mx-0.5">/</span>
                )}
                <span className="leading-none" style={{ fontSize: '20px', color: cube.color_tag }}>●</span>
              </span>
            ))}
            {cube.quantity > 20 && (
              <span className="text-xs text-gray-400 ml-1">+{cube.quantity - 20}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

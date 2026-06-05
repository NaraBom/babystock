'use client';

import { useRef, useState } from 'react';

interface Props {
  value: string | null;           // 'YYYY-MM-DD' 또는 null
  onChange: (value: string | null) => void;
  onWarnChange?: (warn: boolean) => void;
  className?: string;
  placeholder?: boolean;
}

const todayStr = new Date().toISOString().slice(0, 10);

export default function DateInput({ value, onChange, onWarnChange, className = '', placeholder = true }: Props) {
  const parse = (v: string | null) => {
    const parts = v ? v.split('-') : ['', '', ''];
    return { yyyy: parts[0] ?? '', mm: parts[1] ?? '', dd: parts[2] ?? '' };
  };

  const [local, setLocal] = useState(() => parse(value));
  const [warn, setWarn] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef   = useRef<HTMLInputElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setLocal(parse(value));
  }

  function validate(next: { yyyy: string; mm: string; dd: string }) {
    const { yyyy, mm, dd } = next;
    if (yyyy.length === 4 && mm.length >= 1 && dd.length >= 1) {
      const dateStr = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      if (dateStr < todayStr) {
        const empty = { yyyy: '', mm: '', dd: '' };
        setLocal(empty);
        setWarn(false);
        onWarnChange?.(false);
        onChange(null);
      } else {
        setWarn(false);
        onWarnChange?.(false);
        onChange(dateStr);
      }
    } else if (placeholder && !yyyy && !mm && !dd) {
      setWarn(false);
      onWarnChange?.(false);
      onChange(null);
    }
  }

  function update(next: { yyyy: string; mm: string; dd: string }, finalField = false) {
    setLocal(next);
    const { yyyy, mm, dd } = next;
    if (finalField || (yyyy.length === 4 && mm.length === 2 && dd.length === 2)) {
      validate(next);
    } else if (placeholder && !yyyy && !mm && !dd) {
      setWarn(false);
      onWarnChange?.(false);
      onChange(null);
    }
  }

  const borderClass = warn
    ? 'border-red-400 focus:border-red-400'
    : 'border-[var(--border)] focus:border-[var(--primary)]';
  const inputClass = `text-center bg-white border rounded-lg py-1.5 text-sm focus:outline-none ${borderClass}`;

  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          placeholder="YYYY"
          maxLength={4}
          value={local.yyyy}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            update({ ...local, yyyy: v });
            if (v.length === 4) setTimeout(() => monthRef.current?.focus(), 0);
          }}
          onBlur={() => update(local, true)}
          className={`w-14 ${inputClass}`}
        />
        <span className="text-gray-400 text-sm">-</span>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          placeholder="MM"
          maxLength={2}
          value={local.mm}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            update({ ...local, mm: v });
            if (v.length === 2) setTimeout(() => dayRef.current?.focus(), 0);
          }}
          onBlur={() => update(local, true)}
          className={`w-10 ${inputClass}`}
        />
        <span className="text-gray-400 text-sm">-</span>
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          placeholder="DD"
          maxLength={2}
          value={local.dd}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            const next = { ...local, dd: v };
            update(next, v.length === 2);
          }}
          onBlur={() => update(local, true)}
          className={`w-10 ${inputClass}`}
        />
      </div>
      {warn && (
        <p className="text-xs text-red-500 mt-1">오늘 이후 날짜를 입력해 주세요.</p>
      )}
    </div>
  );
}

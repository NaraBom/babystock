'use client';

import { useRef, useState } from 'react';
import { Pencil, Check, X, Camera } from 'lucide-react';
import { BabyProfile, getBabyProfile, saveBabyProfile } from '@/lib/storage';

function getAgeMonths(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (months < 0) return null;
  if (months < 24) return `${months}개월`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years}세` : `${years}세 ${rem}개월`;
}

function Avatar({ photoUrl, emoji, size }: { photoUrl: string | null; emoji: string; size: 'sm' | 'lg' }) {
  const cls = size === 'lg'
    ? 'w-40 h-40 text-5xl'
    : 'w-12 h-12 text-3xl';
  if (photoUrl) {
    return (
      <div className={`${cls} rounded-full overflow-hidden border-2 border-orange-200 flex-shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="아기 사진" className="w-full h-full object-cover" />
      </div>
    );
  }
  return <span className={`${cls} leading-none flex items-center justify-center`}>{emoji}</span>;
}

export default function BabyCard() {
  const [profile, setProfile] = useState<BabyProfile>(() => getBabyProfile());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BabyProfile>(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(profile);
    setEditing(true);
  }

  function save() {
    saveBabyProfile(draft);
    setProfile(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(profile);
    setEditing(false);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setDraft((d) => ({ ...d, photoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  }

  const age = getAgeMonths(profile.birthDate);
  const isEmpty = !profile.name && !profile.birthDate && !profile.memo;

  if (editing) {
    return (
      <div className="mx-1 mb-3 px-4 pt-5 pb-6 bg-orange-50 border border-orange-200 rounded-xl text-xs">
        {/* 사진 업로드 */}
        <div className="flex justify-center mb-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group/photo"
          >
            <Avatar photoUrl={draft.photoUrl} emoji={draft.emoji} size="sm" />
            <span className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
              <Camera size={16} className="text-white" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>
        {draft.photoUrl && (
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, photoUrl: null }))}
            className="w-full text-center text-xs text-gray-400 hover:text-red-400 mb-2 transition-colors"
          >
            사진 삭제
          </button>
        )}

        {/* 이름 */}
        <input
          autoFocus
          type="text"
          placeholder="아기 이름"
          maxLength={20}
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          className="w-full border border-orange-200 rounded-lg px-2 py-1.5 mb-1.5 text-xs focus:outline-none focus:border-[var(--primary)] bg-white"
        />

        {/* 생년월일 */}
        <input
          type="date"
          value={draft.birthDate ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, birthDate: e.target.value || null }))}
          className="w-full border border-orange-200 rounded-lg px-2 py-1.5 mb-1.5 text-xs focus:outline-none focus:border-[var(--primary)] bg-white"
        />

        {/* 메모 */}
        <input
          type="text"
          placeholder="메모 (이유식 단계 등)"
          maxLength={30}
          value={draft.memo}
          onChange={(e) => setDraft((d) => ({ ...d, memo: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          className="w-full border border-orange-200 rounded-lg px-2 py-1.5 mb-2 text-xs focus:outline-none focus:border-[var(--primary)] bg-white"
        />

        <div className="flex gap-1.5">
          <button
            onClick={save}
            className="flex-1 flex items-center justify-center gap-1 bg-[var(--primary)] text-white rounded-lg py-1.5 hover:opacity-90 transition"
          >
            <Check size={12} /> 저장
          </button>
          <button
            onClick={cancel}
            className="flex items-center justify-center w-8 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <X size={12} className="text-gray-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group mx-1 mb-3 px-3 pt-4 pb-5 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer hover:border-orange-200 transition-colors flex flex-col items-center text-center min-h-[180px] justify-center relative"
      onClick={startEdit}
    >
      <Pencil
        size={12}
        className="absolute top-2.5 right-2.5 text-gray-300 group-hover:text-[var(--primary)] transition-colors"
      />
      <div className="mb-3">
        <Avatar photoUrl={profile.photoUrl} emoji={profile.emoji} size="lg" />
      </div>
      {isEmpty ? (
        <p className="text-xs text-gray-400">아기 정보 입력하기</p>
      ) : (
        <>
          {profile.name && (
            <p className="text-sm font-semibold text-gray-800 leading-tight">{profile.name}</p>
          )}
          {age && (
            <p className="text-xs text-[var(--primary)] font-medium leading-tight mt-1">{age}</p>
          )}
          {profile.memo && (
            <p className="text-xs text-gray-400 leading-tight mt-1.5">{profile.memo}</p>
          )}
        </>
      )}
    </div>
  );
}

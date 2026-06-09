'use client';

import { useState } from 'react';
import { getBabyProfile, BabyProfile } from '@/lib/storage';
import BabyCard from '@/components/BabyCard';

function getAgeMonths(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  if (now < birth) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / msPerDay) + 1;

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const d = days + 1;
  const totalMonths = years * 12 + months;

  let detail: string;
  if (totalMonths < 24) {
    detail = `${totalMonths}개월 ${d}일`;
  } else {
    const remMonths = months;
    detail = remMonths === 0 ? `${years}세 ${d}일` : `${years}세 ${remMonths}개월 ${d}일`;
  }

  return `D+${totalDays} (${detail})`;
}

function Avatar({ profile }: { profile: BabyProfile }) {
  if (profile.photoUrl) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-200 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.photoUrl} alt="아기 사진" className="w-full h-full object-cover" />
      </div>
    );
  }
  return <span className="text-2xl leading-none flex-shrink-0">{profile.emoji}</span>;
}

export default function MobileBabyBar() {
  const [open, setOpen] = useState(false);
  const [profile] = useState<BabyProfile>(() => getBabyProfile());

  const age = getAgeMonths(profile.birthDate);
  const isEmpty = !profile.name && !profile.birthDate && !profile.memo;

  return (
    <div className="md:hidden">
      {/* 앱 로고 헤더 */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-b border-[var(--border)]">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <polygon points="14,3 25,9 14,15 3,9" fill="#F4A460"/>
          <polygon points="3,9 14,15 14,25 3,19" fill="#E8734A"/>
          <polygon points="25,9 14,15 14,25 25,19" fill="#C4522A"/>
        </svg>
        <span className="font-bold text-base text-[var(--primary)]">Cubridge</span>
      </div>
      {/* 아기 정보 탑바 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 border-b border-orange-100"
      >
        <Avatar profile={profile} />
        <div className="flex-1 text-left min-w-0">
          {isEmpty ? (
            <span className="text-xs text-gray-400">아기 정보 입력하기 ›</span>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              {profile.name && (
                <span className="text-sm font-semibold text-gray-800 truncate">{profile.name}</span>
              )}
              {age && (
                <span className="text-xs text-[var(--primary)] font-medium flex-shrink-0">{age}</span>
              )}
              {profile.memo && (
                <span className="text-xs text-gray-400 truncate">{profile.memo}</span>
              )}
            </div>
          )}
        </div>
        <span className="text-gray-300 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* 펼쳐지는 카드 패널 */}
      {open && (
        <div className="bg-white border-b border-orange-100 px-4 py-3">
          <BabyCard />
        </div>
      )}
    </div>
  );
}

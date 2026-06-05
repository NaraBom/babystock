'use client';

import { useState } from 'react';
import { getBabyProfile, BabyProfile } from '@/lib/storage';
import BabyCard from '@/components/BabyCard';

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
      {/* 탑바 */}
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

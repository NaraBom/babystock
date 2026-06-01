'use client';

import Link from 'next/link';
import { Cube, getStockStatus } from '@/types';
import { AlertTriangle, AlertCircle, CheckCircle2, Minus, Plus } from 'lucide-react';
import { updateCube, getSettings } from '@/lib/storage';

interface Props {
  cube: Cube;
  onUpdate?: (cube: Cube) => void;
}

const STATUS_CONFIG = {
  ok: { border: 'border-green-200', bg: 'bg-green-50', icon: CheckCircle2, iconColor: 'text-green-500', label: '충분' },
  warning: { border: 'border-yellow-300', bg: 'bg-yellow-50', icon: AlertTriangle, iconColor: 'text-yellow-500', label: '주의' },
  danger: { border: 'border-red-300', bg: 'bg-red-50', icon: AlertCircle, iconColor: 'text-red-500', label: '부족' },
};

export default function CubeCard({ cube, onUpdate }: Props) {
  const status = getStockStatus(cube.quantity, cube.warning_threshold, cube.danger_threshold);
  const { border, bg, icon: Icon, iconColor } = STATUS_CONFIG[status];

  const { expiryWarningDays } = getSettings();
  const msUntilExpiry = cube.expiry_date
    ? new Date(cube.expiry_date).getTime() - Date.now()
    : null;
  const isExpired = msUntilExpiry !== null && msUntilExpiry < 0;
  const isExpiringSoon = msUntilExpiry !== null && msUntilExpiry >= 0 && msUntilExpiry < expiryWarningDays * 24 * 60 * 60 * 1000;

  function adjustQuantity(delta: number) {
    const updated = updateCube(cube.id, { quantity: Math.max(0, cube.quantity + delta) });
    if (updated && onUpdate) onUpdate(updated);
  }

  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} p-4 flex flex-col gap-3 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: cube.color_tag }}
          />
          <Link href={`/cubes/${cube.id}`} className="font-semibold text-gray-800 hover:text-[var(--primary)] transition-colors">
            {cube.name}
          </Link>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${iconColor}`}>
          <Icon size={14} />
          {STATUS_CONFIG[status].label}
        </div>
      </div>

      <div className="text-xs text-gray-500">{cube.category} · {cube.grams_per_cube}g/큐브</div>

      {isExpired && cube.expiry_date && (
        <div className="text-xs text-red-500 font-medium">
          🚫 유통기한 만료 ({cube.expiry_date})
        </div>
      )}
      {isExpiringSoon && cube.expiry_date && (
        <div className="text-xs text-orange-500 font-medium">
          ⚠ 유통기한 임박 ({cube.expiry_date})
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="text-2xl font-bold text-gray-800">{cube.quantity}<span className="text-sm font-normal text-gray-500 ml-1">개</span></span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => adjustQuantity(-1)}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => adjustQuantity(1)}
            className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

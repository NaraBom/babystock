'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cube, ConsumptionLog, getStockStatus, MEAL_TIMES, REACTIONS } from '@/types';
import { getCubes, getLogs, getSettings } from '@/lib/storage';
import CubeRow from '@/components/CubeRow';
import { AlertCircle, Box, Plus, X } from 'lucide-react';

// 모달에서 사용할 카테고리 표시 순서
const MODAL_CATEGORY_ORDER = ['밥', '채소', '육류', '과일', '생선', '곡물', '기타'];

function catRank(cat: string) {
  const i = MODAL_CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 99 : i;
}

function sortByCategoryThenName(a: Cube, b: Cube) {
  const diff = catRank(a.category) - catRank(b.category);
  return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ko');
}

type ModalType = 'all' | 'warning' | 'danger' | 'today' | null;

function DashboardModal({
  type, cubes, todayLogs, expiryWarningDays, onClose, onUpdate,
}: {
  type: ModalType;
  cubes: Cube[];
  todayLogs: ConsumptionLog[];
  expiryWarningDays: number;
  onClose: () => void;
  onUpdate: () => void;
}) {
  if (!type) return null;

  const title =
    type === 'all' ? '전체 큐브 종류' :
    type === 'warning' ? '재고 주의' :
    type === 'danger' ? '재고 부족' : '오늘 소비';

  // 큐브 목록 모달 (all / warning / danger)
  const cubesToShow =
    type === 'all' ? [...cubes].sort(sortByCategoryThenName) :
    type === 'warning' ? cubes.filter((c) => getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold) === 'warning').sort(sortByCategoryThenName) :
    type === 'danger' ? cubes.filter((c) => getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold) === 'danger').sort(sortByCategoryThenName) :
    [];

  // 카테고리 그룹핑 (큐브 모달용)
  const grouped = cubesToShow.reduce<Record<string, Cube[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});
  const groupKeys = MODAL_CATEGORY_ORDER.filter((k) => grouped[k]).concat(
    Object.keys(grouped).filter((k) => !MODAL_CATEGORY_ORDER.includes(k))
  );

  // 오늘 소비 모달용 — 식사 타임별 그룹 + 같은 큐브 합산
  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
  const logsByMeal = mealOrder.reduce<Record<string, ConsumptionLog[]>>((acc, mt) => {
    const items = todayLogs.filter((l) => l.meal_time === mt);
    if (items.length) acc[mt] = items;
    return acc;
  }, {});

  function mergeLogs(logs: ConsumptionLog[]): { key: string; cube_id: string; cube_name: string; grams: number | null; quantity: number; reaction: ConsumptionLog['reaction'] | null }[] {
    const map = new Map<string, { cube_id: string; cube_name: string; grams: number | null; quantity: number; reaction: ConsumptionLog['reaction'] | null }>();
    for (const log of logs) {
      const cube = cubes.find((c) => c.id === log.cube_id);
      const grams = log.grams_override ?? cube?.grams_per_cube ?? null;
      const key = log.cube_id || log.cube_name;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += log.quantity;
        if (existing.reaction !== log.reaction) existing.reaction = null;
      } else {
        map.set(key, { cube_id: log.cube_id, cube_name: log.cube_name, grams, quantity: log.quantity, reaction: log.reaction ?? null });
      }
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <span className="font-semibold text-gray-800">{title}</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto flex-1 p-4">
          {type === 'today' ? (
            todayLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">오늘 소비 기록이 없어요</p>
            ) : (
              <div className="flex flex-col gap-4">
                {mealOrder.filter((mt) => logsByMeal[mt]).map((mt) => (
                  <div key={mt}>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5 px-1">{MEAL_TIMES[mt]}</p>
                    <div className="flex flex-col gap-1">
                      {mergeLogs(logsByMeal[mt]).map((item) => {
                        const cube = cubes.find((c) => c.id === item.cube_id);
                        const reaction = item.reaction ? REACTIONS[item.reaction] : null;
                        return (
                          <div key={item.key} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
                            {cube && <span className="text-lg leading-none">{cube.emoji}</span>}
                            <span className="flex-1 text-sm font-medium text-gray-700 min-w-0">
                              {item.cube_name}
                              {item.grams != null && <span className="text-xs font-normal text-gray-400 ml-1">{item.grams}g</span>}
                            </span>
                            {reaction && <span className={`text-xs flex-shrink-0 ${reaction.color}`}>{reaction.emoji} {reaction.label}</span>}
                            <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{item.quantity}개</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : cubesToShow.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">해당하는 큐브가 없어요</p>
          ) : (
            <div className="flex flex-col gap-4">
              {groupKeys.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5 px-1">{cat}</p>
                  <div className="rounded-xl border border-[var(--border)] divide-y divide-gray-100 overflow-hidden">
                    {grouped[cat].map((cube) => (
                      <CubeRow key={cube.id} cube={cube} expiryWarningDays={expiryWarningDays} onUpdate={onUpdate} onDelete={onUpdate} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [cubes, setCubes] = useState<Cube[]>(() => getCubes());
  const [logs] = useState(() => getLogs());
  const [expiryWarningDays] = useState(() => getSettings().expiryWarningDays);
  const [cubeSortOrder] = useState(() => getSettings().cubeSortOrder);
  const [modalType, setModalType] = useState<ModalType>(null);

  function refresh() {
    setCubes(getCubes());
  }

  const warnCubes = cubes.filter((c) => getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold) === 'warning');
  const dangerCubes = cubes.filter((c) => getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold) === 'danger');

  function sortCubes(a: Cube, b: Cube): number {
    const byName = a.name.localeCompare(b.name, 'ko');
    if (cubeSortOrder === 'name') return byName;
    if (cubeSortOrder === 'danger') {
      const rank = { danger: 0, warning: 1, ok: 2 };
      const diff = rank[getStockStatus(a.quantity, a.warning_threshold, a.danger_threshold)]
                 - rank[getStockStatus(b.quantity, b.warning_threshold, b.danger_threshold)];
      return diff !== 0 ? diff : byName;
    }
    // expiry: 기한 없음 맨 위, 임박순, 동일 날짜는 이름순
    const aHas = !!a.expiry_date;
    const bHas = !!b.expiry_date;
    if (!aHas && !bHas) return byName;
    if (!aHas) return -1;
    if (!bHas) return 1;
    const dateDiff = a.expiry_date!.localeCompare(b.expiry_date!);
    return dateDiff !== 0 ? dateDiff : byName;
  }

  const alertCubes = [...dangerCubes, ...warnCubes].sort(sortCubes);

  const today = new Date().toDateString();
  const todayLogs = logs.filter((l) => new Date(l.logged_at).toDateString() === today);
  const todayTotal = todayLogs.reduce((sum, l) => sum + l.quantity, 0);
  // 가장 최근 식사 세션 (아침/점심/저녁 중 마지막 1개)
  function toLocalDateKey(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const mealLogs = logs.filter((l) => l.meal_time !== 'snack');
  const lastMeal = (() => {
    if (mealLogs.length === 0) return null;
    const latest = mealLogs.reduce((a, b) =>
      new Date(a.logged_at) > new Date(b.logged_at) ? a : b
    );
    const date = toLocalDateKey(latest.logged_at);
    const mealTime = latest.meal_time;
    return { mealTime, date, items: mealLogs.filter((l) => toLocalDateKey(l.logged_at) === date && l.meal_time === mealTime) };
  })();

  // 카테고리별 큐브 수 — 표시 순서 적용
  const categoryCount = cubes.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + 1;
    return acc;
  }, {});
  const categoryNames = [
    ...MODAL_CATEGORY_ORDER.filter((k) => categoryCount[k]),
    ...Object.keys(categoryCount).filter((k) => !MODAL_CATEGORY_ORDER.includes(k)),
  ].map((cat) => `${cat} ${categoryCount[cat]}`).join(' · ');

  // 재고 주의/부족 큐브 이름 — 카테고리 순 정렬
  const warnNames = [...warnCubes].sort(sortByCategoryThenName).map((c) => c.name).join(', ');
  const dangerNames = [...dangerCubes].sort(sortByCategoryThenName).map((c) => c.name).join(', ');

  // 오늘 소비한 큐브 이름 (중복 제거)
  const todayCubeNames = [...new Set(todayLogs.map((l) => l.cube_name))].join(', ');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">이유식 재고 현황</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="전체 큐브 종류" value={cubes.length} unit="종" color="text-blue-600" bg="bg-blue-50" sub={categoryNames} onClick={() => setModalType('all')} />
        <StatCard label="재고 주의" value={warnCubes.length} unit="종" color="text-yellow-600" bg="bg-yellow-50" sub={warnNames} onClick={() => setModalType('warning')} />
        <StatCard label="재고 부족" value={dangerCubes.length} unit="종" color="text-red-600" bg="bg-red-50" sub={dangerNames} onClick={() => setModalType('danger')} />
        <StatCard label="오늘 소비" value={todayTotal} unit="큐브" color="text-[var(--primary)]" bg="bg-orange-50" sub={todayCubeNames} onClick={() => setModalType('today')} />
      </div>

      <DashboardModal
        type={modalType}
        cubes={cubes}
        todayLogs={todayLogs}
        expiryWarningDays={expiryWarningDays}
        onClose={() => setModalType(null)}
        onUpdate={() => { setCubes(getCubes()); setModalType(null); }}
      />

      {alertCubes.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              재고 알림 ({alertCubes.length}종)
            </h2>
            <Link href="/cubes" className="text-sm text-[var(--primary)] hover:underline">전체 보기</Link>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
            {alertCubes.map((cube) => (
              <CubeRow key={cube.id} cube={cube} expiryWarningDays={expiryWarningDays} onUpdate={refresh} onDelete={refresh} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Box size={18} className="text-gray-500" />
            전체 큐브
          </h2>
          <div className="flex items-center gap-2">
            <Link href="/cubes/new" className="flex items-center gap-1 bg-[var(--primary)] text-white text-sm px-3 py-1.5 rounded-lg hover:opacity-90 transition">
              <Plus size={14} />
              큐브 추가
            </Link>
            <Link href="/cubes" className="text-sm text-[var(--primary)] hover:underline">전체 보기</Link>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
          {[...cubes]
            .sort(sortCubes)
            .map((cube) => (
              <CubeRow key={cube.id} cube={cube} expiryWarningDays={expiryWarningDays} onUpdate={refresh} onDelete={refresh} />
            ))}
        </div>
      </section>

      {lastMeal && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">최근 소비 기록</h2>
            <Link href="/logs" className="text-sm text-[var(--primary)] hover:underline">전체 보기</Link>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50/60 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">
                {new Date(lastMeal.date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} - {MEAL_TIMES[lastMeal.mealTime]}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {lastMeal.items.map((log) => {
                const grams = log.grams_override ?? cubes.find((c) => c.id === log.cube_id)?.grams_per_cube;
                const reaction = log.reaction ? REACTIONS[log.reaction] : null;
                return (
                  <div key={log.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-gray-800 truncate">{log.cube_name}</span>
                      {grams != null && <span className="text-xs text-gray-400 flex-shrink-0">{grams}g</span>}
                      {reaction && (
                        <span className={`text-xs flex-shrink-0 ${reaction.color}`}>{reaction.emoji} {reaction.label}</span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 flex-shrink-0 ml-3">{log.quantity}개</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, color, bg, sub, onClick }: { label: string; value: number; unit: string; color: string; bg: string; sub?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${bg} rounded-2xl p-4 flex flex-col justify-between min-h-[96px] text-left w-full transition hover:brightness-95 active:scale-[0.98]`}
    >
      <div>
        <div className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm font-normal ml-1">{unit}</span></div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
      {sub && <div className="text-xs text-gray-400 mt-2 truncate">{sub}</div>}
    </button>
  );
}

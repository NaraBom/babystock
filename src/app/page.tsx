'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cube, ConsumptionLog, getStockStatus, MEAL_TIMES } from '@/types';
import { getCubes, getLogs, getSampleCubes, addCube } from '@/lib/storage';
import CubeCard from '@/components/CubeCard';
import { AlertCircle, Box, Plus } from 'lucide-react';

export default function DashboardPage() {
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = getCubes();
    if (stored.length === 0) {
      const samples = getSampleCubes();
      samples.forEach((s) => addCube(s));
      setCubes(getCubes());
    } else {
      setCubes(stored);
    }
    setLogs(getLogs());
    setLoaded(true);
  }, []);

  function refresh() {
    setCubes(getCubes());
  }

  const warnCubes = cubes.filter((c) => getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold) === 'warning');
  const dangerCubes = cubes.filter((c) => getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold) === 'danger');
  const alertCubes = [...dangerCubes, ...warnCubes];

  const today = new Date().toDateString();
  const todayLogs = logs.filter((l) => new Date(l.logged_at).toDateString() === today);
  const todayTotal = todayLogs.reduce((sum, l) => sum + l.quantity, 0);
  const recentLogs = logs.slice(0, 5);

  if (!loaded) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">안녕하세요! 🍼</h1>
        <p className="text-gray-500 text-sm mt-1">오늘의 이유식 재고 현황을 확인하세요</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="전체 큐브 종류" value={cubes.length} unit="종" color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="재고 주의" value={warnCubes.length} unit="종" color="text-yellow-600" bg="bg-yellow-50" />
        <StatCard label="재고 부족" value={dangerCubes.length} unit="종" color="text-red-600" bg="bg-red-50" />
        <StatCard label="오늘 소비" value={todayTotal} unit="큐브" color="text-[var(--primary)]" bg="bg-orange-50" />
      </div>

      {alertCubes.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              재고 알림 ({alertCubes.length}종)
            </h2>
            <Link href="/cubes" className="text-sm text-[var(--primary)] hover:underline">전체 보기</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {alertCubes.map((cube) => (
              <CubeCard key={cube.id} cube={cube} onUpdate={refresh} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cubes.slice(0, 6).map((cube) => (
            <CubeCard key={cube.id} cube={cube} onUpdate={refresh} />
          ))}
        </div>
      </section>

      {recentLogs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">최근 소비 기록</h2>
            <Link href="/logs" className="text-sm text-[var(--primary)] hover:underline">전체 보기</Link>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-gray-100">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-medium text-gray-800">{log.cube_name}</span>
                  <span className="ml-2 text-xs text-gray-400">{MEAL_TIMES[log.meal_time]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">{log.quantity}개</span>
                  <span className="text-xs text-gray-400">
                    {new Date(log.logged_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, color, bg }: { label: string; value: number; unit: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-4`}>
      <div className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm font-normal ml-1">{unit}</span></div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

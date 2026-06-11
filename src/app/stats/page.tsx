'use client';

import { useMemo, useState } from 'react';
import { ConsumptionLog, Cube } from '@/types';
import EmojiDisplay from '@/components/EmojiDisplay';
import { getCubes, getLogs } from '@/lib/storage';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from 'recharts';

const CHART_COLORS = ['#E8734A', '#A8C97F', '#7BAFD4', '#F4C430', '#C47AC0', '#E87D7D', '#5BBF8E', '#F0A06A'];

type Period = 'week' | 'month';

export default function StatsPage() {
  const [logs] = useState<ConsumptionLog[]>(() => getLogs());
  const [cubes] = useState<Cube[]>(() => getCubes());
  const [period, setPeriod] = useState<Period>('week');
  const [selectedCube, setSelectedCube] = useState(() => {
    const c = getCubes();
    return c.length > 0 ? c[0].id : '';
  });

  const now = new Date();
  const cutoff = new Date(now);
  if (period === 'week') cutoff.setDate(now.getDate() - 7);
  else cutoff.setDate(now.getDate() - 30);

  const periodLogs = logs.filter((l) => new Date(l.logged_at) >= cutoff);

  // 막대 차트: 재료별 소비량
  const barData: Record<string, number> = {};
  for (const log of periodLogs) {
    barData[log.cube_name] = (barData[log.cube_name] || 0) + log.quantity;
  }
  const barChartData = Object.entries(barData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 요약 카드
  const totalCubes = barChartData.reduce((s, d) => s + d.value, 0);
  const totalGrams = useMemo(() => {
    return periodLogs.reduce((s, log) => {
      const cube = cubes.find((c) => c.id === log.cube_id);
      return s + log.quantity * (cube?.grams_per_cube ?? 0);
    }, 0);
  }, [periodLogs, cubes]);
  const topIngredient = barChartData[0]?.name ?? null;

  // 재고 소진 예측
  const depletionForecast = useMemo(() => {
    return cubes
      .map((cube) => {
        const cubeLogs = periodLogs.filter((l) => l.cube_id === cube.id);
        const consumed = cubeLogs.reduce((s, l) => s + l.quantity, 0);
        // 실제 소비가 발생한 날짜 수 기준으로 일 사용량 계산
        const activeDays = new Set(cubeLogs.map((l) => new Date(l.logged_at).toLocaleDateString('sv'))).size;
        const dailyUsage = activeDays > 0 ? consumed / activeDays : 0;
        const daysLeft = dailyUsage > 0 ? Math.ceil(cube.quantity / dailyUsage) : null;
        const depletionDate = daysLeft != null
          ? new Date(Date.now() + daysLeft * 86400000).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
          : null;
        return { cube, consumed, dailyUsage, daysLeft, depletionDate };
      })
      .filter((r) => r.consumed > 0 || r.cube.quantity > 0)
      .sort((a, b) => {
        if (a.daysLeft == null && b.daysLeft == null) return 0;
        if (a.daysLeft == null) return 1;
        if (b.daysLeft == null) return -1;
        return a.daysLeft - b.daysLeft;
      });
  }, [cubes, periodLogs]);

  // 라인 차트: 선택 큐브 재고 추이 (시뮬레이션)
  const cubeLogs = useMemo(
    () => logs
      .filter((l) => l.cube_id === selectedCube)
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()),
    [logs, selectedCube]
  );

  const selectedCubeObj = cubes.find((c) => c.id === selectedCube);
  const lineData = useMemo(() => {
    const totalConsumed = cubeLogs.reduce((s, l) => s + l.quantity, 0);
    const initialStock = (selectedCubeObj?.quantity ?? 0) + totalConsumed;
    return cubeLogs.reduce<{ items: Array<{ date: string; 재고: number }>; stock: number }>(
      (acc, log) => {
        const next = acc.stock - log.quantity;
        return {
          stock: next,
          items: [
            ...acc.items,
            {
              date: new Date(log.logged_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
              재고: Math.max(0, next),
            },
          ],
        };
      },
      { items: [], stock: initialStock }
    ).items;
  }, [cubeLogs, selectedCubeObj]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">통계</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
              }`}
            >
              {p === 'week' ? '주간' : '월간'}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">{period === 'week' ? '이번 주' : '이번 달'} 소비</p>
          <p className="text-2xl font-bold text-[var(--primary)]">{totalCubes}<span className="text-sm font-normal text-gray-500 ml-0.5">개</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">총 섭취량</p>
          <p className="text-2xl font-bold text-[var(--primary)]">{totalGrams}<span className="text-sm font-normal text-gray-500 ml-0.5">g</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">최다 소비</p>
          <p className="text-sm font-bold text-gray-800 mt-1 truncate">{topIngredient ?? '-'}</p>
        </div>
      </div>

      {periodLogs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>아직 소비 기록이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 식사 시간대별 차트 */}
          <ChartCard title="식사 시간대별 소비">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: '아침', value: periodLogs.filter((l) => l.meal_time === 'breakfast').reduce((s, l) => s + l.quantity, 0) },
                  { name: '점심', value: periodLogs.filter((l) => l.meal_time === 'lunch').reduce((s, l) => s + l.quantity, 0) },
                  { name: '저녁', value: periodLogs.filter((l) => l.meal_time === 'dinner').reduce((s, l) => s + l.quantity, 0) },
                  { name: '간식', value: periodLogs.filter((l) => l.meal_time === 'snack').reduce((s, l) => s + l.quantity, 0) },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v}개`, '소비량']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {['#E8734A', '#A8C97F', '#7BAFD4', '#F4C430'].map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 막대 차트 */}
          <ChartCard title={`재료별 소비량 (${period === 'week' ? '최근 7일' : '최근 30일'})`}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v}개`, '소비량']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 라인 차트 */}
          <ChartCard
            title="재고 변화 추이"
            header={
              <select
                value={selectedCube}
                onChange={(e) => setSelectedCube(e.target.value)}
                className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 bg-white focus:outline-none"
              >
                {cubes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.grams_per_cube}g)</option>
                ))}
              </select>
            }
          >
            {lineData.length < 2 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                데이터가 부족해요 (소비 기록 2개 이상 필요)
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v}개`, '재고']} />
                  <Line type="monotone" dataKey="재고" stroke="#E8734A" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          {/* 재고 소진 예측 */}
          {depletionForecast.length > 0 && (
            <ChartCard title="재고 소진 예측">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2 font-medium">재료</th>
                      <th className="text-right py-2 font-medium">현재 재고</th>
                      <th className="text-right py-2 font-medium">일 사용량</th>
                      <th className="text-right py-2 font-medium">소진 예정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depletionForecast.map(({ cube, dailyUsage, daysLeft, depletionDate }) => {
                      const urgent = daysLeft != null && daysLeft <= 3;
                      const warning = daysLeft != null && daysLeft <= 7 && !urgent;
                      return (
                        <tr key={cube.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2">
                            <EmojiDisplay emoji={cube.emoji} size={18} className="mr-1" />
                            {cube.name}
                            <span className="text-gray-400 ml-1">({cube.grams_per_cube}g)</span>
                          </td>
                          <td className="text-right py-2 text-gray-600">
                            {cube.quantity}개
                            <span className="text-gray-400 ml-1">({(cube.quantity * cube.grams_per_cube).toLocaleString()}g)</span>
                          </td>
                          <td className="text-right py-2 text-gray-600">
                            {dailyUsage > 0 ? (
                              <>{dailyUsage.toFixed(1)}개 <span className="text-gray-400">({(dailyUsage * cube.grams_per_cube).toFixed(0)}g)</span></>
                            ) : '-'}
                          </td>
                          <td className={`text-right py-2 font-medium ${urgent ? 'text-red-500' : warning ? 'text-orange-400' : 'text-gray-600'}`}>
                            {depletionDate ? `${depletionDate} (${daysLeft}일)` : '소비 없음'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, header, children }: { title: string; header?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700 text-sm">{title}</h2>
        {header}
      </div>
      {children}
    </div>
  );
}

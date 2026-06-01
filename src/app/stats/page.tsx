'use client';

import { useEffect, useState } from 'react';
import { ConsumptionLog, Cube } from '@/types';
import { getCubes, getLogs } from '@/lib/storage';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';

const CHART_COLORS = ['#E8734A', '#A8C97F', '#7BAFD4', '#F4C430', '#C47AC0', '#E87D7D', '#5BBF8E', '#F0A06A'];

type Period = 'week' | 'month';

export default function StatsPage() {
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [selectedCube, setSelectedCube] = useState('');

  useEffect(() => {
    setLogs(getLogs());
    const c = getCubes();
    setCubes(c);
    if (c.length > 0) setSelectedCube(c[0].id);
  }, []);

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

  // 파이 차트: 소비 비율
  const total = barChartData.reduce((s, d) => s + d.value, 0);
  const pieData = barChartData.map((d) => ({ ...d, percent: total > 0 ? Math.round((d.value / total) * 100) : 0 }));

  // 라인 차트: 선택 큐브 재고 추이 (시뮬레이션)
  const cubeLogs = logs
    .filter((l) => l.cube_id === selectedCube)
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

  const selectedCubeObj = cubes.find((c) => c.id === selectedCube);
  let runningStock = selectedCubeObj?.quantity ?? 0;
  // 현재 재고에서 거꾸로 계산
  const totalConsumed = cubeLogs.reduce((s, l) => s + l.quantity, 0);
  let stock = runningStock + totalConsumed;
  const lineData = cubeLogs.map((log) => {
    stock -= log.quantity;
    return {
      date: new Date(log.logged_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
      재고: Math.max(0, stock),
    };
  });

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

      {periodLogs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>아직 소비 기록이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
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

          {/* 파이 차트 */}
          <ChartCard title="소비 비율">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${percent}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => [`${v}개`, '소비량']} />
              </PieChart>
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
                  <option key={c.id} value={c.id}>{c.name}</option>
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

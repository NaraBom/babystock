'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cube, CATEGORIES, getStockStatus } from '@/types';
import { getCubes } from '@/lib/storage';
import CubeCard from '@/components/CubeCard';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'danger', label: '부족' },
  { value: 'warning', label: '주의' },
  { value: 'ok', label: '충분' },
];

export default function CubesPage() {
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setCubes(getCubes());
  }, []);

  function refresh() {
    setCubes(getCubes());
  }

  const filtered = cubes.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === '전체' || c.category === category;
    const status = getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold);
    const matchStatus = statusFilter === 'all' || status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">큐브 목록</h1>
        <Link
          href="/cubes/new"
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-xl hover:opacity-90 transition text-sm font-medium"
        >
          <Plus size={16} />
          큐브 추가
        </Link>
      </div>

      {/* 검색 & 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="큐브 이름 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30"
          />
        </div>
        <div className="flex gap-2 items-center">
          <SlidersHorizontal size={16} className="text-gray-400 flex-shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {['전체', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  category === cat
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-white border border-[var(--border)] text-gray-600 hover:bg-orange-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 재고 상태 필터 */}
      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === value
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-[var(--border)] text-gray-500 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="text-4xl">🥦</span>
          <p className="mt-3">큐브가 없어요</p>
          <Link href="/cubes/new" className="mt-3 inline-block text-[var(--primary)] hover:underline text-sm">
            첫 큐브 추가하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((cube) => (
            <CubeCard key={cube.id} cube={cube} onUpdate={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

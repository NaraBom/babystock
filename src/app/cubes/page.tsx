'use client';

import type * as ExcelJS from 'exceljs';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Cube, CATEGORIES, getStockStatus } from '@/types';
import { getCubes, deleteCube, getSettings } from '@/lib/storage';
import CubeRow from '@/components/CubeRow';
import ConfirmModal from '@/components/ConfirmModal';
import { Plus, Search, Download, FileSpreadsheet, Trash2 } from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'all',     label: '전체' },
  { value: 'danger',  label: '부족' },
  { value: 'warning', label: '주의' },
  { value: 'ok',      label: '충분' },
];

export default function CubesPage() {
  const [cubes, setCubes] = useState<Cube[]>(() => getCubes());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteZero, setShowDeleteZero] = useState(false);
  const expiryWarningDays = getSettings().expiryWarningDays;

  function refresh() {
    setCubes(getCubes());
  }

  const zeroCubes = useMemo(() => cubes.filter((c) => c.quantity === 0), [cubes]);

  function deleteAllZero() {
    zeroCubes.forEach((c) => deleteCube(c.id));
    setCubes(getCubes());
    setShowDeleteZero(false);
  }

  async function exportExcel() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('큐브 목록');

    // 열 정의
    ws.columns = [
      { header: '카테고리', key: 'category', width: 12 },
      { header: '이름',     key: 'name',     width: 16 },
      { header: 'g/개',     key: 'grams',    width: 8  },
      { header: '수량',     key: 'quantity', width: 8  },
      { header: '유통기한', key: 'expiry',   width: 14 },
      { header: '상태',     key: 'status',   width: 8  },
      { header: '메모',     key: 'notes',    width: 24 },
    ];

    // 헤더 스타일
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8734A' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top:    { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left:   { style: 'thin', color: { argb: 'FF000000' } },
        right:  { style: 'thin', color: { argb: 'FF000000' } },
      },
    };
    ws.getRow(1).eachCell((cell) => { cell.style = headerStyle as ExcelJS.Style; });
    ws.getRow(1).height = 22;
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // 카테고리별 정렬 후 행 추가
    const STATUS_LABEL: Record<string, string> = { danger: '부족', warning: '주의', ok: '충분' };
    const STATUS_COLOR: Record<string, string> = { danger: 'FFDC2626', warning: 'FFEA580C', ok: 'FF16A34A' };
    const sorted = [...cubes].sort((a, b) => a.category.localeCompare(b.category));

    sorted.forEach((c) => {
      const status = getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold);
      ws.addRow({
        category: c.category,
        name:     c.name,
        grams:    c.grams_per_cube,
        quantity: c.quantity,
        expiry:   c.expiry_date ?? '',
        status:   STATUS_LABEL[status],
        notes:    c.notes ?? '',
      });
    });

    // 셀 스타일 (데이터 행)
    const cellBorder = {
      top:    { style: 'thin' as const, color: { argb: 'FF000000' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
      left:   { style: 'thin' as const, color: { argb: 'FF000000' } },
      right:  { style: 'thin' as const, color: { argb: 'FF000000' } },
    };
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      row.eachCell((cell, colNum) => {
        cell.border = cellBorder as ExcelJS.Borders;
        cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'center' };
        // 상태 셀 색상
        if (colNum === 6) {
          const s = Object.entries(STATUS_LABEL).find(([, v]) => v === cell.value)?.[0];
          if (s) cell.font = { color: { argb: STATUS_COLOR[s] }, bold: true };
        }
      });
      row.height = 18;
    });

    // 카테고리 셀 병합
    let mergeStart = 2;
    let currentCat = sorted[0]?.category;
    sorted.forEach((c, i) => {
      const rowNum = i + 2;
      const isLast = i === sorted.length - 1;
      if (c.category !== currentCat || isLast) {
        const mergeEnd = isLast && c.category === currentCat ? rowNum : rowNum - 1;
        if (mergeEnd > mergeStart) {
          ws.mergeCells(mergeStart, 1, mergeEnd, 1);
          const mergedCell = ws.getCell(mergeStart, 1);
          mergedCell.alignment = { vertical: 'middle', horizontal: 'center' };
          mergedCell.border = cellBorder as ExcelJS.Borders;
        }
        mergeStart = rowNum;
        currentCat = c.category;
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `큐브목록_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const headers = ['이름', '카테고리', '수량(개)', '상태', '유통기한', 'g/개', '메모'];
    const rows = cubes.map((c) => {
      const status = getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold);
      const statusLabel = status === 'danger' ? '부족' : status === 'warning' ? '주의' : '충분';
      return [
        c.name,
        c.category,
        c.quantity,
        statusLabel,
        c.expiry_date ?? '',
        c.grams_per_cube,
        c.notes ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '﻿' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `큐브목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => cubes.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const status = getStockStatus(c.quantity, c.warning_threshold, c.danger_threshold);
    const matchStatus = statusFilter === 'all' || status === statusFilter;
    return matchSearch && matchStatus;
  }), [cubes, search, statusFilter]);

  // 카테고리별로 그룹화 (큐브가 있는 카테고리만)
  const groups = useMemo(() => CATEGORIES
    .map((cat) => ({ cat, items: filtered.filter((c) => c.category === cat) }))
    .filter(({ items }) => items.length > 0), [filtered]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mr-auto">큐브 목록</h1>
        {zeroCubes.length > 0 && (
          <button
            onClick={() => setShowDeleteZero(true)}
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-500 px-3 py-2 rounded-xl hover:bg-red-100 transition text-sm font-medium cursor-pointer"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">0개 큐브 삭제 ({zeroCubes.length})</span>
            <span className="sm:hidden">삭제 ({zeroCubes.length})</span>
          </button>
        )}
        <button
          onClick={exportExcel}
          className="flex items-center gap-1.5 bg-white border border-[var(--border)] text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-sm font-medium cursor-pointer"
        >
          <FileSpreadsheet size={16} />
          <span className="hidden sm:inline">Excel</span>
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 bg-white border border-[var(--border)] text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-sm font-medium cursor-pointer"
        >
          <Download size={16} />
          <span className="hidden sm:inline">CSV</span>
        </button>
        <Link
          href="/cubes/new"
          className="flex items-center gap-1.5 bg-[var(--primary)] text-white px-3 py-2 rounded-xl hover:opacity-90 transition text-sm font-medium"
        >
          <Plus size={16} />
          큐브 추가
        </Link>
      </div>

      {/* 검색 & 상태 필터 */}
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
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-[var(--border)] text-gray-500 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리별 그룹 */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="text-4xl">🥦</span>
          <p className="mt-3">큐브가 없어요</p>
          <Link href="/cubes/new" className="mt-3 inline-block text-[var(--primary)] hover:underline text-sm">
            첫 큐브 추가하기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ cat, items }) => (
            <div key={cat} className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
              {/* 카테고리 헤더 */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 bg-gray-50/60">
                <span className="text-xs font-semibold text-gray-500 tracking-wide">{cat}</span>
                <span className="text-xs text-gray-400">{items.length}종</span>
              </div>
              {/* 큐브 행 목록 */}
              <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                {items.map((cube) => (
                  <CubeRow key={cube.id} cube={cube} expiryWarningDays={expiryWarningDays} onUpdate={refresh} onDelete={refresh} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteZero && (
        <ConfirmModal
          title="0개 큐브 일괄 삭제"
          message={`수량이 0개인 큐브 ${zeroCubes.length}종을 모두 삭제할까요?`}
          confirmLabel="삭제"
          danger
          onConfirm={deleteAllZero}
          onCancel={() => setShowDeleteZero(false)}
        />
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Box, BookOpen, BarChart2, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/cubes', label: '큐브 목록', icon: Box },
  { href: '/logs', label: '소비 기록', icon: BookOpen },
  { href: '/stats', label: '통계', icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  function navLink(href: string, label: string, Icon: React.ElementType) {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          active
            ? 'bg-[var(--primary)] text-white'
            : 'text-gray-600 hover:bg-orange-50 hover:text-[var(--primary)]'
        }`}
      >
        <Icon size={18} />
        {label}
      </Link>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen sticky top-0 bg-white border-r border-[var(--border)] py-6 px-3 overflow-y-auto">
      <Link href="/" className="mb-8 px-3 flex items-center hover:opacity-80 transition">
        <span className="text-2xl">🍼</span>
        <span className="ml-2 font-bold text-lg text-[var(--primary)]">Cubridge</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
      </nav>

      <div className="border-t border-[var(--border)] my-3" />

      <nav className="flex flex-col gap-1">
        {navLink('/settings', '설정', Settings)}
      </nav>
    </aside>
  );
}

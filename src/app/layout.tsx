import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'BabyStock - 이유식 큐브 재고 관리',
  description: '이유식 큐브 재고를 한눈에 관리하는 스마트 재고 트래커',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-[var(--background)]">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 pb-20 md:pb-0 overflow-auto">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Jua } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileBabyBar from '@/components/MobileBabyBar';

const jua = Jua({ subsets: ['latin'], weight: '400' });

export const metadata: Metadata = {
  title: 'Cubridge - 이유식 큐브 재고 관리',
  description: '이유식 큐브 재고를 한눈에 관리하는 스마트 재고 트래커',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className={`${jua.className} min-h-full bg-[var(--background)]`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 pb-20 md:pb-0 overflow-auto">
            <MobileBabyBar />
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * 관리자 페이지 공통 레이아웃 — 헤더 + 인증 게이트 외부 컨테이너.
 * AdminGate는 각 페이지에서 import 해서 children을 래핑.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-zinc-400 hover:text-white">← 사이트</Link>
            <span className="text-zinc-600">·</span>
            <Link href="/admin/materials" className="text-sm font-bold">apt-planner 관리자</Link>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">internal</span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

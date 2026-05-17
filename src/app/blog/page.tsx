import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'Blog — apt-planner',
  description: '인테리어 공사 가이드·자재 비교·시공 팁을 담은 apt-planner 블로그.',
};

export default function BlogPage() {
  return (
    <div className="flex-1 w-full bg-white">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium mb-6">
          오픈 준비 중
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mb-4">
          Blog
        </h1>
        <p className="text-zinc-600 leading-relaxed mb-8">
          인테리어 공사 가이드·자재 비교·시공 팁을 정리한 글을 곧 공개합니다.
          <br className="hidden sm:block" />
          준비되는 대로 이 페이지에 글이 차곡차곡 쌓일 예정입니다.
        </p>
        <Link
          href="/calc"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 hover:bg-black px-6 py-3 text-white font-semibold text-sm shadow-sm transition active:scale-[0.98]"
        >
          먼저 우리집 예상 공사비부터 →
        </Link>
      </main>

      <footer className="border-t border-zinc-200 bg-zinc-900 text-zinc-300 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-xs text-zinc-400 flex flex-col sm:flex-row justify-between gap-3">
          <span>© apt-planner — All rights reserved</span>
          <span>본 서비스는 어떤 인테리어 업체와도 제휴·수수료 관계가 없습니다.</span>
        </div>
      </footer>
    </div>
  );
}

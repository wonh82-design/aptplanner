'use client';

/**
 * 사이트 전체 공통 헤더 — sticky 고정, 모든 페이지에서 동일한 크기·양식.
 *
 * 메뉴: 예상 공사비 계산기 / Blog / About
 * 활성 메뉴는 usePathname()으로 자동 감지 → 강조 색 표시.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  full: string;
  short: string;
  /** true면 새 탭 + 외부 링크 — 활성 표시 대상에서 제외 */
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/calc',                  full: '예상 공사비 계산기', short: '계산기' },
  { href: 'https://apt-planner.com', full: 'Blog',              short: 'Blog', external: true },
  { href: '/about',                 full: 'About',             short: 'About' },
];

export function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const isActive = (item: NavItem) => {
    if (item.external) return false;
    return item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <>
      {/* 본문이 fixed 헤더 아래로 가려지지 않도록 같은 높이의 spacer */}
      <div className="h-14 sm:h-16" aria-hidden />
      <header className="fixed top-0 inset-x-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* === 로고 (홈) === */}
        <Link
          href="/"
          className="flex items-center gap-2 min-w-0 group"
          aria-label="apt-planner 홈"
        >
          <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded bg-zinc-900 text-white text-xs sm:text-sm font-bold flex-shrink-0 group-hover:bg-blue-700 transition">
            a
          </span>
          <span className="font-bold tracking-tight text-sm sm:text-base truncate text-zinc-900">
            apt-planner
          </span>
        </Link>

        {/* === 메인 네비 — 3개 메뉴 === */}
        <nav className="flex items-center gap-1 sm:gap-2 flex-shrink-0" aria-label="주요 메뉴">
          {NAV_ITEMS.map(item => {
            const active = isActive(item);
            const cls = `relative px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap inline-flex items-center gap-1 ${
              active
                ? 'text-blue-700 bg-blue-50'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`;
            const content = (
              <>
                <span className="hidden sm:inline">{item.full}</span>
                <span className="sm:hidden">{item.short}</span>
                {item.external && (
                  <svg
                    width="11" height="11" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="opacity-60"
                    aria-hidden
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                )}
                {active && (
                  <span className="absolute -bottom-[5px] left-2 right-2 h-[2px] bg-blue-600 rounded-full hidden sm:block" />
                )}
              </>
            );

            return item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cls}
              >
                {content}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cls}
                aria-current={active ? 'page' : undefined}
              >
                {content}
              </Link>
            );
          })}
        </nav>
      </div>
      </header>
    </>
  );
}

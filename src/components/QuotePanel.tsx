'use client';

/**
 * 견적 상세 내역 — 결과 화면에서 ResultBanner 바로 아래 항상 펼쳐서 노출.
 * 두 가지 형태로 합계를 보여준다:
 *   1) 공종별 구분 내역 (by_category)
 *   2) 공간별 구분 내역 (by_room)
 *
 * 라인별 상세 사양·자재는 유료 인테리어 계획서 PDF에서만 제공한다 (free→paid 차별화).
 * 금액은 모두 부가세 별도(보정 적용 후 grand_total 기준).
 */

import type { Quote } from '@/lib/types';
import { fmtKRWVat, fmtKRWShortVat } from '@/lib/calculator';

type Props = { quote: Quote };

export function QuotePanel({ quote }: Props) {
  const grand = quote.totals.grand_total;
  // 공종별 = CATEGORY 단위 (마루/도배/타일/욕실/전기…)로 묶어서 표시
  const workEntries = Object.entries(quote.totals.by_category).sort(([, a], [, b]) => b - a);
  const roomEntries = Object.entries(quote.totals.by_room).sort(([, a], [, b]) => b - a);
  const workMax = workEntries[0]?.[1] ?? 1;
  const roomMax = roomEntries[0]?.[1] ?? 1;

  return (
    <section className="rounded-xl bg-white shadow-sm border border-zinc-200 p-4 sm:p-5">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-zinc-900">견적 상세 내역</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          공종별·공간별 두 가지 형태로 우리집 공사비를 확인하세요. (부가세 포함)
        </p>
      </header>

      {/* 공종별 / 공간별 — 데스크톱 2단, 모바일 1단 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownTable
          title="공종별 구분 내역"
          subtitle={`총 ${workEntries.length}개 카테고리 · 마루·타일·욕실 단위`}
          entries={workEntries}
          max={workMax}
          grand={grand}
          accentClass="bg-blue-500"
        />
        <BreakdownTable
          title="공간별 구분 내역"
          subtitle={`총 ${roomEntries.length}개 공간`}
          entries={roomEntries}
          max={roomMax}
          grand={grand}
          accentClass="bg-emerald-500"
        />
      </div>

      <p className="mt-4 text-[11px] text-zinc-500 leading-relaxed">
        ※ 위 금액은 자재가 + 시공·인건비 + 부가세(10%) 포함, 지역·연식 보정 후 총공사비 기준입니다(상단 예상 공사비와 동일 기준).
        항목별 금액은 만원 단위로 표시되어 합산 시 미세한 차이가 보일 수 있습니다.
        라인별 상세 사양·자재는 유료 인테리어 계획서 PDF에서 확인할 수 있습니다.
      </p>
    </section>
  );
}

// =====================================================
// 공종별 / 공간별 표 컴포넌트
// =====================================================

function BreakdownTable({
  title, subtitle, entries, max, grand, accentClass,
}: {
  title: string;
  subtitle: string;
  entries: [string, number][];
  max: number;
  grand: number;
  accentClass: string;
}) {
  const sum = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white">
      <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200 flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
        <span className="text-[10px] text-zinc-500">{subtitle}</span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {entries.map(([name, amt]) => {
          const pct = grand > 0 ? (amt / grand) * 100 : 0;
          const barPct = max > 0 ? Math.max(2, (amt / max) * 100) : 0;
          return (
            <li key={name} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-zinc-800 truncate flex-1 min-w-0">{name}</span>
                <span className="text-[11px] text-zinc-500 tabular-nums flex-shrink-0">{pct.toFixed(1)}%</span>
                <span className="text-xs font-mono font-semibold text-zinc-900 tabular-nums flex-shrink-0 min-w-[68px] text-right">
                  {fmtKRWShortVat(amt)}
                </span>
              </div>
              <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${accentClass} rounded-full`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-2 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-700">합계 (부가세 포함)</span>
        <span className="text-sm font-mono font-bold text-zinc-900 tabular-nums">{fmtKRWVat(sum)}</span>
      </div>
    </div>
  );
}


'use client';

/**
 * 견적 상세 내역 — 결과 화면에서 ResultBanner 바로 아래 항상 펼쳐서 노출.
 * 두 가지 형태로 합계를 보여준다:
 *   1) 공종별 구분 내역 (by_work_type)
 *   2) 공간별 구분 내역 (by_room)
 * 마지막으로 상세 라인 항목 테이블도 기본 펼침으로 노출.
 *
 * 금액은 모두 부가세 별도(보정 적용 후 grand_total 기준).
 */

import type { Quote } from '@/lib/types';
import { fmtKRW, fmtKRWShort } from '@/lib/calculator';

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
          공종별·공간별 두 가지 형태로 우리집 공사비를 확인하세요. (부가세 별도)
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

      {/* 상세 라인 항목 — 기본 펼침, 내부 스크롤 */}
      <div className="mt-6 pt-5 border-t border-zinc-200">
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <h4 className="text-sm font-semibold text-zinc-900">상세 라인 항목</h4>
          <span className="text-[11px] text-zinc-500">{quote.line_items.length}건 · 가로 스크롤로 자재명까지 확인</span>
        </div>
        <div className="overflow-auto max-h-[480px] border border-zinc-200 rounded-lg">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="text-zinc-500 bg-zinc-50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">#</th>
                <th className="text-left px-3 py-2 font-semibold">공간</th>
                <th className="text-left px-3 py-2 font-semibold">공종</th>
                <th className="text-left px-3 py-2 font-semibold">자재</th>
                <th className="text-right px-3 py-2 font-semibold">수량</th>
                <th className="text-right px-3 py-2 font-semibold">소계</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {quote.line_items.map(it => (
                <tr key={it.id} className="border-t border-zinc-100 hover:bg-zinc-50/60">
                  <td className="px-3 py-1.5 text-zinc-400">{it.id}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{it.room}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-zinc-700">{it.category}</td>
                  <td className="px-3 py-1.5 max-w-[240px] truncate text-zinc-600" title={it.material_label}>
                    {it.material_label}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                    {it.qty} <span className="text-zinc-400">{unitShort(it.unit_type)}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap font-semibold text-zinc-800">
                    {fmtKRWShort(it.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          ※ 위 합계는 자재가 + 시공·인건비 기준이며, 지역·연식 보정 후 10만원 단위로 반올림된 총공사비와 차이가 있을 수 있습니다.
        </p>
      </div>
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
                  {fmtKRWShort(amt)}
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
        <span className="text-xs font-semibold text-zinc-700">합계 (보정 전)</span>
        <span className="text-sm font-mono font-bold text-zinc-900 tabular-nums">{fmtKRW(sum)}</span>
      </div>
    </div>
  );
}

function unitShort(u: string): string {
  switch (u) {
    case 'per_m2': return '㎡';
    case 'per_m': return 'm';
    case 'per_ea': return 'ea';
    case 'per_set': return 'set';
    default: return u;
  }
}

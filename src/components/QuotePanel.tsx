'use client';

import { useState } from 'react';
import type { Quote } from '@/lib/types';
import { fmtKRW, fmtKRWShort } from '@/lib/calculator';

type Props = { quote: Quote };

export function QuotePanel({ quote }: Props) {
  const [showLines, setShowLines] = useState(false);
  const [vatIncluded, setVatIncluded] = useState(false);
  const grand = vatIncluded ? quote.totals.grand_total_with_vat : quote.totals.grand_total;

  // 시장가 평가 (180~220만/평 기준)
  const py = quote.totals.per_pyeong;
  let grade = '✓ 합리적';
  let gradeTone = 'text-emerald-600 bg-emerald-50';
  if (py < 1_800_000) { grade = '↓ 가성비'; gradeTone = 'text-blue-600 bg-blue-50'; }
  else if (py > 2_200_000) { grade = '↑ 고급'; gradeTone = 'text-amber-600 bg-amber-50'; }

  return (
    <aside className="rounded-xl bg-white shadow-sm border border-zinc-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-700 p-5 text-white">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-sm font-medium opacity-90">우리집 예상 공사비</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${gradeTone}`}>{grade}</span>
        </div>
        <div className="text-3xl font-bold tracking-tight tabular-nums">
          {fmtKRWShort(grand)}
        </div>
        <div className="text-xs opacity-75 mt-1 font-mono">{fmtKRW(grand)}</div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10 text-xs">
          <button
            onClick={() => setVatIncluded(v => !v)}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
          >
            {vatIncluded ? '부가세 포함' : '부가세 별도'}
          </button>
          <span className="opacity-75">
            평당 <span className="font-semibold text-white">{fmtKRWShort(quote.totals.per_pyeong)}</span>/평
          </span>
        </div>
      </div>

      {/* 공종별 합계 */}
      <div className="p-5">
        <h3 className="text-xs font-medium text-zinc-500 mb-2">공종별 합계</h3>
        <div className="space-y-1.5">
          {Object.entries(quote.totals.by_work_type)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 12)
            .map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate text-zinc-700">{cat}</span>
                <span className="font-mono text-zinc-600 tabular-nums">{fmtKRWShort(amt)}</span>
              </div>
            ))}
        </div>

        <h3 className="text-xs font-medium text-zinc-500 mb-2 mt-5">공간별 합계</h3>
        <div className="space-y-1.5">
          {Object.entries(quote.totals.by_room)
            .sort(([, a], [, b]) => b - a)
            .map(([room, amt]) => (
              <div key={room} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate text-zinc-700">{room}</span>
                <span className="font-mono text-zinc-600 tabular-nums">{fmtKRWShort(amt)}</span>
              </div>
            ))}
        </div>

        <button
          onClick={() => setShowLines(s => !s)}
          className="mt-4 w-full text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
        >
          {showLines ? '상세 라인 닫기' : `상세 라인 ${quote.line_items.length}건 펼치기`}
        </button>

        {showLines && (
          <div className="mt-3 max-h-96 overflow-y-auto border-t border-zinc-100 pt-3">
            <table className="w-full text-xs">
              <thead className="text-zinc-400">
                <tr>
                  <th className="text-left pb-1">#</th>
                  <th className="text-left pb-1">공간</th>
                  <th className="text-left pb-1">자재</th>
                  <th className="text-right pb-1">수량</th>
                  <th className="text-right pb-1">소계</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {quote.line_items.map(it => (
                  <tr key={it.id} className="border-t border-zinc-50">
                    <td className="py-1 text-zinc-400">{it.id}</td>
                    <td className="py-1">{it.room}</td>
                    <td className="py-1 truncate max-w-[140px]" title={it.material_label}>
                      {it.category}
                      <span className="ml-1 text-zinc-400">· {it.material_label.slice(0, 24)}</span>
                    </td>
                    <td className="py-1 text-right tabular-nums">{it.qty} <span className="text-zinc-400">{unitShort(it.unit_type)}</span></td>
                    <td className="py-1 text-right tabular-nums">{fmtKRWShort(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </aside>
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

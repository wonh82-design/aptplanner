'use client';

/**
 * 입력 단계(Step 2)에서 사용자가 설정을 바꿀 때마다
 * 실시간으로 예상 공사비 범위를 보여주는 sticky 배너 (모바일 전용 — lg는 WizardSidebar).
 *
 * 컴팩트 2줄 구성 — sticky 로 상시 화면을 점유하므로 최소 높이 유지.
 * (총액 단일값·다음 단계 CTA는 하단 고정 MobileBottomBar 가 담당 — 역할 분담)
 */

import { fmtKRWShortVat } from '@/lib/calculator';
import type { Quote } from '@/lib/types';

type Props = {
  quote: Quote;
  /**
   * Step 2 가격 게이트 — true면 금액 대신 선택 유도 문구 표시.
   * (공사범위 프리셋·자재등급 한번에 정하기를 모두 선택하기 전까지 금액 비공개)
   */
  locked?: boolean;
};

export function LivePricePreview({ quote, locked = false }: Props) {
  const { totals } = quote;
  return (
    <aside
      role="status"
      aria-live="polite"
      // lg:hidden — 데스크탑은 WizardSidebar 가 대체. 모바일만 sticky 배너로 동작.
      // sticky 가 부모 flex 안의 형제들과 함께 있어야 효과 — wrapper 없이 직접 자식.
      // top: SiteHeader(56/64) + StepIndicator(~48~56) 만큼 내려서 겹침 방지.
      // z-30: StepIndicator(z-20) 보다 위. SiteHeader(z-40) 보다 아래.
      className="lg:hidden sticky top-[104px] sm:top-[120px] z-30 -mx-4 sm:mx-0 mb-3 sm:mb-4"
    >
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-none sm:rounded-xl shadow-sm border-y sm:border border-zinc-700/40 px-4 sm:px-5 py-2.5">
        <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-0.5">
          실시간 예상 공사비 · 부가세 포함
        </div>
        {locked ? (
          <div className="text-sm font-bold text-zinc-200">
            아래 <strong className="text-white">공사범위 간단 지정</strong>과{' '}
            <strong className="text-white">자재등급 한번에 정하기</strong>를 선택하면 표시돼요
          </div>
        ) : (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-extrabold tabular-nums tracking-tight">
              {fmtKRWShortVat(totals.grand_total_low)} ~ {fmtKRWShortVat(totals.grand_total_high)}
            </span>
            <span className="text-[11px] text-zinc-300">
              중앙값 {fmtKRWShortVat(totals.grand_total)}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

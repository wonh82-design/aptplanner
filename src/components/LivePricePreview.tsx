'use client';

/**
 * 입력 단계(Step 1·2)에서 사용자가 설정을 바꿀 때마다
 * 실시간으로 예상 공사비 범위를 보여주는 sticky 배너.
 * 결과 단계 진입 전 "내가 한 입력이 어떻게 가격에 반영되는지"를 즉시 피드백해
 * 끝까지 진행할 동기를 강화한다.
 */

import { fmtKRWShort, fmtKRWShortVat } from '@/lib/calculator';
import type { Quote } from '@/lib/types';

type Props = {
  quote: Quote;
  /** 2: 공사 범위 단계 · 3: 자재 등급 단계 */
  step: 2 | 3;
  /**
   * Step 2 가격 게이트 — true면 금액 대신 선택 유도 문구 표시.
   * (공사범위 프리셋·자재등급 한번에 정하기를 모두 선택하기 전까지 금액 비공개)
   */
  locked?: boolean;
};

export function LivePricePreview({ quote, step, locked = false }: Props) {
  const { totals, line_items } = quote;
  if (locked) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="lg:hidden sticky top-[104px] sm:top-[120px] z-30 -mx-4 sm:mx-0 mb-3 sm:mb-4"
      >
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-none sm:rounded-xl shadow-sm border-y sm:border border-zinc-700/40 px-4 sm:px-5 py-3 sm:py-3.5">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-0.5">
            실시간 예상 공사비 · 부가세 포함
          </div>
          <div className="text-sm font-bold text-zinc-200">선택 후 표시됩니다</div>
          <div className="mt-1.5 text-[10px] text-zinc-400">
            아래 <strong className="text-zinc-200">공사범위 간단 지정</strong>과{' '}
            <strong className="text-zinc-200">자재등급 한번에 정하기</strong>를 선택하면 예상 공사비가 나타나요.
          </div>
        </div>
      </aside>
    );
  }
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
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-none sm:rounded-xl shadow-sm border-y sm:border border-zinc-700/40 px-4 sm:px-5 py-3 sm:py-3.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-0.5">
              실시간 예상 공사비 · 부가세 포함
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-extrabold tabular-nums tracking-tight">
                {fmtKRWShortVat(totals.grand_total_low)} ~ {fmtKRWShortVat(totals.grand_total_high)}
              </span>
              <span className="text-[11px] text-zinc-300">
                중앙값 {fmtKRWShortVat(totals.grand_total)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-300 flex-shrink-0">
            <Pill label={`${line_items.length} 라인`} />
            <Pill label={step === 2 ? '공사 범위' : '등급 조정'} accent />
          </div>
        </div>
        <div className="mt-1.5 text-[10px] text-zinc-400">
          {step === 2
            ? '공종을 ON/OFF 할 때마다 즉시 반영됩니다. 자재 등급은 다음 단계에서 조정합니다.'
            : '자재 등급·세부 자재 변경 시 위 금액이 즉시 업데이트됩니다.'}
        </div>
      </div>
    </aside>
  );
}

function Pill({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap border ${
        accent ? 'bg-blue-500/20 border-blue-400/40 text-blue-200' : 'bg-white/5 border-white/10'
      }`}
    >
      {label}
    </span>
  );
}

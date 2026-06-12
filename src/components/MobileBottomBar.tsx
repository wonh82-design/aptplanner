'use client';

/**
 * 모바일 전용 하단 고정 CTA 바 (lg 미만에서만 노출).
 *
 * Step 1·2처럼 콘텐츠가 길어 페이지 맨 아래까지 스크롤해야 다음 단계로
 * 갈 수 있던 문제를 해소한다 — 어느 위치에서든 진행 가능.
 *  - 좌측: 이전 단계 (옵션, 컴팩트)
 *  - 중앙: 현재 총 공사비 (옵션 — Step 2에서 가격 게이트 통과 후)
 *  - 우측: 다음 단계 primary CTA (44px+)
 *
 * iOS 홈 인디케이터와 겹치지 않도록 safe-area-inset-bottom 패딩.
 * 사용하는 화면은 콘텐츠 하단에 pb-24 lg:pb-0 여백을 줘야 마지막 요소가 가려지지 않는다.
 */

type Props = {
  /** 다음 단계 클릭 */
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  /** 이전 단계 (미전달 시 버튼 숨김) */
  onBack?: () => void;
  /** 총 공사비 표시 (예: "7,623만원"). null/미전달이면 가격 영역 숨김 */
  price?: string | null;
  /** 가격 위 작은 라벨 (기본: "총 예상 공사비 · 부가세 포함") */
  priceLabel?: string;
  /** nextDisabled 일 때 가격 영역 자리에 보여줄 안내 (예: "평형을 입력해주세요") */
  hint?: string;
};

export function MobileBottomBar({
  onNext, nextLabel, nextDisabled, onBack, price, priceLabel = '총 예상 공사비 · 부가세 포함', hint,
}: Props) {
  return (
    <div
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="이전 단계"
            className="flex-shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 active:scale-[0.97] transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* 가격 / 힌트 영역 */}
        {(price || hint) && (
          <div className="flex-1 min-w-0 leading-tight">
            {price ? (
              <>
                <div className="text-[10px] text-zinc-500 truncate">{priceLabel}</div>
                <div className="text-lg font-extrabold tabular-nums text-blue-700 truncate">{price}</div>
              </>
            ) : (
              <div className="text-[11px] text-zinc-500 leading-snug">{hint}</div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className={`h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition active:scale-[0.98]
            disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap px-5
            ${price || hint || onBack ? 'flex-shrink-0' : 'flex-1'}`}
        >
          {nextLabel} →
        </button>
      </div>
    </div>
  );
}

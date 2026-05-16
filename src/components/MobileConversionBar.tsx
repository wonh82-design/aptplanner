'use client';

/**
 * 결과(Step 3) 화면 모바일에서 하단에 고정되는 전환 바.
 * 데스크톱(sm+)에는 노출되지 않는다 — 데스크톱은 ServicesPricing 카드 자체가 충분히 보이므로.
 *
 * 두 가지 행동을 한 탭 거리에 둔다:
 *  1) 무료 PDF 다운로드
 *  2) 한 끼 식사값 스펙북 신청
 */

type Props = {
  onDownloadFree: () => void;
  onApplySpec: () => void;
  downloading?: boolean;
};

export function MobileConversionBar({ onDownloadFree, onApplySpec, downloading = false }: Props) {
  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-zinc-200 px-3 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={onDownloadFree}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg border-2 border-zinc-300 bg-white text-zinc-800 font-semibold text-xs px-2 py-2.5 transition active:scale-[0.98] disabled:opacity-60"
        >
          {downloading ? '생성 중…' : '무료 PDF'}
        </button>
        <button
          type="button"
          onClick={onApplySpec}
          className="flex-[1.4] flex items-center justify-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-2 py-2.5 shadow-sm transition active:scale-[0.98]"
        >
          스펙북 ₩29,000 →
        </button>
      </div>
    </div>
  );
}

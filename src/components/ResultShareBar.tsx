'use client';

/**
 * 결과 요약 저장·공유 바 — 결과 배너 바로 아래.
 *
 * 30·40대 여정의 핵심 루프(배우자 카톡 공유 → 함께 결정)를 지원한다:
 *  - [공유하기]   Web Share API 로 요약 PNG + 텍스트 공유 (카톡 등 시트).
 *                 파일 공유 미지원 환경은 자동으로 다운로드 폴백.
 *  - [이미지 저장] 요약 PNG 다운로드 (사진첩/파일).
 */

import { useState } from 'react';
import type { Quote } from '@/lib/types';
import { fmtKRWShort } from '@/lib/calculator';
import { buildResultShareImage } from '@/lib/share-image';
import { track } from '@/lib/analytics';

type Props = { quote: Quote; gradeLabel: string };

export function ResultShareBar({ quote, gradeLabel }: Props) {
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fileName = `aptplanner-${quote.property.pyeong}평-요약.png`;

  const summaryText =
    `[Apt-Planner] ${quote.property.pyeong}평 ${gradeLabel} 등급 인테리어 예상 공사비 ` +
    `${fmtKRWShort(Math.round(quote.totals.grand_total_low * 1.1))} ~ ${fmtKRWShort(Math.round(quote.totals.grand_total_high * 1.1))} (부가세 포함)`;

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy('share');
    setMsg(null);
    try {
      const blob = await buildResultShareImage(quote, gradeLabel);
      const file = new File([blob], fileName, { type: 'image/png' });
      const shareData: ShareData = {
        files: [file],
        title: 'Apt-Planner 예상 공사비',
        text: summaryText,
      };
      if (typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        track('share_result_image', { pyeong: quote.property.pyeong, grade: gradeLabel });
      } else {
        // 파일 공유 미지원(데스크톱 브라우저 등) → 다운로드 폴백
        download(blob);
        track('save_result_image', { pyeong: quote.property.pyeong, grade: gradeLabel, fallback: true });
        setMsg('이 브라우저는 바로 공유를 지원하지 않아 이미지로 저장했어요.');
      }
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 조용히 무시
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setMsg('공유 중 문제가 발생했어요. 이미지 저장을 이용해 주세요.');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy('save');
    setMsg(null);
    try {
      const blob = await buildResultShareImage(quote, gradeLabel);
      download(blob);
      track('save_result_image', { pyeong: quote.property.pyeong, grade: gradeLabel });
    } catch {
      setMsg('이미지 생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl bg-white border border-zinc-200 shadow-sm p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleShare}
          disabled={busy !== null}
          className="h-12 rounded-lg bg-zinc-900 hover:bg-black text-white text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {busy === 'share' ? '준비 중…' : '공유하기'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy !== null}
          className="h-12 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {busy === 'save' ? '생성 중…' : '이미지 저장'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500 text-center">
        요약 한 장으로 가족과 공유하거나 업체에 그대로 전달하세요. 무료입니다.
      </p>
      {msg && (
        <p className="mt-1.5 text-[11px] text-amber-700 text-center">{msg}</p>
      )}
    </div>
  );
}

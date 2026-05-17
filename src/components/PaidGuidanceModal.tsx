'use client';

/**
 * 무료 서비스(예상 공사비 계산)를 진행하지 않은 상태에서
 * 스펙북·컨설팅 신청 버튼을 클릭했을 때 표시되는 안내 모달.
 *
 * 사용자에게 "먼저 무료 산정부터 진행한 뒤 마지막 단계에서 신청 가능"을 안내하고,
 * 무료 산정 시작 CTA로 자연스럽게 유도한다.
 */

import Link from 'next/link';

type Props = { onClose: () => void };

export function PaidGuidanceModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                먼저 무료 산정부터 진행해주세요
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none -mt-1"
              aria-label="닫기"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-zinc-700 leading-relaxed mb-5">
            먼저 무료 서비스인 <strong className="text-zinc-900">우리집 공사비 알아보기</strong>를 진행하신 후,
            마지막 단계에서 스펙북·컨설팅 신청을 하실 수 있습니다.
          </p>

          {/* 4단계 미니 stepper */}
          <div className="rounded-lg bg-blue-50/60 border border-blue-200 p-3 mb-5">
            <ol className="flex items-center justify-between gap-1 text-[10px] text-zinc-700">
              {['우리집 현황', '공사 범위', '자재 등급', '결과·신청'].map((s, i) => (
                <li key={i} className="flex items-center gap-1 flex-1 min-w-0">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold flex-shrink-0 ${
                    i < 3 ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="font-semibold truncate">{s}</span>
                  {i < 3 && <span className="text-blue-300 mx-0.5">→</span>}
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Link
              href="/calc"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-3 text-white font-bold text-sm shadow-sm transition active:scale-[0.98]"
            >
              지금 무료 산정 시작하기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition"
            >
              닫기
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 mt-3 text-center">
            가입·결제 없음 · 1분이면 결과 · 결과 PDF 무료
          </p>
        </div>
      </div>
    </div>
  );
}

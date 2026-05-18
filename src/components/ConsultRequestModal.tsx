'use client';

/**
 * 전문가 1:1 컨설팅 (₩150,000, 5월 한정 50% 할인) 신청 모달.
 *
 * 흐름:
 *  1) 사용자가 이름 + 이메일 + 공사 예정월 입력 → 신청 등록 (POST /api/consult-request)
 *  2) 등록 완료 후 입금 안내 화면 노출 (계좌번호 + 입금 후 절차)
 *  3) 입금 확인 후 전문가가 신청한 이메일로 컨설팅 일정 안내 + 결과물 송부
 */

import { useState } from 'react';
import { PAYMENT_ACCOUNT, PAYMENT_ACCOUNT_READY } from '@/lib/payment';
import { track } from '@/lib/analytics';

const EMPTY = '—';

type Props = {
  onClose: () => void;
  meta?: Record<string, unknown>;
};

const PRICE = '150,000원';
const PRICE_ORIGINAL = '300,000원';

const MONTH_OPTIONS = (() => {
  const opts: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push(`${d.getFullYear()}년 ${d.getMonth() + 1}월`);
  }
  opts.push('미정');
  return opts;
})();

export function ConsultRequestModal({ onClose, meta }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plannedMonth, setPlannedMonth] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch('/api/consult-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, plannedMonth, meta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const err = data?.error || `status_${res.status}`;
        setStatus('error');
        setErrMsg(
          err === 'invalid_email'   ? '이메일 형식을 다시 확인해주세요.'
        : err === 'name_required'   ? '이름을 입력해주세요.'
        : err === 'planned_month_required' ? '공사 예정월을 선택해주세요.'
        : '등록 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
        );
        return;
      }
      // 등록 성공 — GA4 conversion event
      track('submit_consult_request', {
        pyeong: typeof meta?.pyeong === 'number' ? meta.pyeong : undefined,
        grade: typeof meta?.grade === 'string' ? meta.grade : undefined,
        grand_total: typeof meta?.grand_total === 'number' ? meta.grand_total : undefined,
        quote_id: typeof meta?.quote_id === 'string' ? meta.quote_id : undefined,
        planned_month: plannedMonth,
      });
      setStatus('ok');
    } catch {
      setStatus('error');
      setErrMsg('네트워크 오류로 등록에 실패했어요. 잠시 후 다시 시도해주세요.');
    }
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(`${PAYMENT_ACCOUNT.bank} ${PAYMENT_ACCOUNT.number}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-orange-700 mb-1">
                전문가 1:1 컨설팅 · 5월 한정 50% 할인
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                {status === 'ok' ? '신청 완료 — 입금 안내' : '컨설팅 신청'}
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

          {status !== 'ok' ? (
            <>
              <div className="rounded-lg bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900 leading-relaxed mb-4">
                <strong>유료서비스는 준비중입니다.</strong> 신청해주시면 서비스 출시 시 이메일로 알려드립니다.
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed mb-3">
                건축사·시공기술사가 우리집 도면·사진·예산을 1:1로 분석합니다.
                신청 후 출시 시 <strong className="text-zinc-900">입금 안내</strong>를 보내드리며,
                입금 확인되면 일정을 잡고 컨설팅 결과물을 이메일로 송부합니다.
              </p>

              <form onSubmit={submit} className="space-y-3">
                <Field label="이름">
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    disabled={status === 'sending'}
                  />
                </Field>
                <Field label="이메일">
                  <input
                    type="email"
                    required
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    disabled={status === 'sending'}
                  />
                </Field>
                <Field label="공사 예정월">
                  <select
                    required
                    value={plannedMonth}
                    onChange={(e) => setPlannedMonth(e.target.value)}
                    className="input"
                    disabled={status === 'sending'}
                  >
                    <option value="">선택해주세요</option>
                    {MONTH_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </Field>

                {status === 'error' && errMsg && (
                  <div className="rounded-md bg-red-50 border border-red-200 text-xs text-red-800 px-3 py-2">
                    {errMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'sending'
                    ? '신청 중…'
                    : (
                      <span className="inline-flex items-center gap-2">
                        출시 알림 신청하기
                        <span className="text-zinc-300 line-through">{PRICE_ORIGINAL}</span>
                        <span>{PRICE} 예정</span>
                      </span>
                    )}
                </button>

                <p className="text-[11px] text-zinc-500 leading-relaxed mt-3">
                  · 본 정보는 컨설팅 진행 외 용도로 사용되지 않습니다.
                  <br />
                  · 컨설팅 완료 후 신청자가 원할 때 즉시 폐기합니다.
                </p>
              </form>
            </>
          ) : (
            // ===== 신청 완료 → 입금 안내 화면 =====
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-sm font-bold text-emerald-900 mb-1">신청이 접수되었습니다 ✓</div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>{name}</strong>님, <strong>{email}</strong>로 안내드릴게요.
                  <br />
                  <span className="text-emerald-700">{plannedMonth} 공사 예정</span>
                </p>
              </div>

              {/* ⚠ 서비스 준비 중 안내 */}
              <div className="rounded-lg bg-amber-50 border border-amber-300 p-3.5 text-xs text-amber-900 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 text-base leading-none mt-0.5">ℹ</span>
                  <div>
                    <strong className="block mb-0.5">유료서비스는 준비중입니다.</strong>
                    신청해주시면 서비스 출시 시 이메일로 알려드립니다. 아래 계좌 정보는 참고용으로 표시되며,
                    출시 알림 전까지 입금하지 않으셔도 됩니다.
                  </div>
                </div>
              </div>

              {/* 입금 안내 박스 (참고용) — 계좌 정보는 출시 시 채워질 예정 */}
              <div className="rounded-lg border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-2">
                  입금 계좌 (출시 시 안내 예정) · 5월 한정 50% 할인
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-zinc-500">은행</span>
                    <span className={`text-sm font-semibold ${PAYMENT_ACCOUNT.bank ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {PAYMENT_ACCOUNT.bank || EMPTY}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-zinc-500">계좌번호</span>
                    <span className={`text-sm font-mono font-bold ${PAYMENT_ACCOUNT.number ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {PAYMENT_ACCOUNT.number || EMPTY}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-zinc-500">예금주</span>
                    <span className={`text-sm font-semibold ${PAYMENT_ACCOUNT.holder ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {PAYMENT_ACCOUNT.holder || EMPTY}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-orange-200/60">
                    <span className="text-[11px] text-orange-700 font-bold">입금 금액 (예정)</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-zinc-400 line-through">₩{PRICE_ORIGINAL}</span>
                      <span className="text-base font-bold text-orange-700">₩{PRICE}</span>
                    </div>
                  </div>
                </div>
                {PAYMENT_ACCOUNT_READY && (
                  <button
                    type="button"
                    onClick={copyAccount}
                    className="mt-3 w-full py-2 rounded-md border border-orange-300 bg-white hover:bg-orange-50 text-orange-700 text-xs font-semibold transition"
                  >
                    {copied ? '계좌번호 복사됨 ✓' : '계좌번호 복사'}
                  </button>
                )}
              </div>

              {/* 출시 시 절차 안내 */}
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-700 leading-relaxed">
                <strong className="text-zinc-900">서비스 출시 후 절차</strong>
                <ol className="mt-1.5 space-y-1 list-decimal list-inside">
                  <li>출시 알림 이메일 발송 → 입금 안내</li>
                  <li>입금자명을 신청한 이름과 동일하게 입금</li>
                  <li>컨설팅 일정·도면/사진 자료 요청</li>
                  <li>진단 결과물(스펙북 + 컨설팅 리포트) 송부</li>
                </ol>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-lg border border-zinc-300 bg-white text-zinc-800 font-bold text-sm hover:bg-zinc-50 transition"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

'use client';

import { useState } from 'react';

type Props = {
  onClose: () => void;
  /** 분석 정보가 있으면 함께 전송 (평형, 등급, 총공사비 등) */
  meta?: Record<string, unknown>;
};

const CURRENT_YEAR = new Date().getFullYear();
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
  const [email, setEmail] = useState('');
  const [plannedMonth, setPlannedMonth] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch('/api/consult-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plannedMonth, meta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const err = data?.error || `status_${res.status}`;
        setStatus('error');
        setErrMsg(
          err === 'invalid_email'   ? '이메일 형식을 다시 확인해주세요.'
        : err === 'planned_month_required' ? '공사 예정월을 선택해주세요.'
        : '등록 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
        );
        return;
      }
      setStatus('ok');
    } catch {
      setStatus('error');
      setErrMsg('네트워크 오류로 등록에 실패했어요. 잠시 후 다시 시도해주세요.');
    }
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
                전문가 1:1 컨설팅
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                현재 서비스 준비중이에요
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
              <p className="text-sm text-zinc-600 leading-relaxed mb-5">
                이메일을 알려주시면 <strong className="text-zinc-900">서비스 가능 시 가장 먼저 알려드릴게요.</strong>
                <br />
                공사 예정월을 함께 적어주시면 일정에 맞춰 연락드립니다.
              </p>

              <form onSubmit={submit} className="space-y-3">
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
                  {status === 'sending' ? '등록 중…' : '이메일 등록하기'}
                </button>

                <p className="text-[11px] text-zinc-500 leading-relaxed mt-3">
                  · 본 정보는 컨설팅 서비스 출시 알림 외 용도로 사용되지 않습니다.
                  <br />
                  · 알림 발송 후 신청자가 원할 때 즉시 폐기합니다.
                </p>
              </form>
            </>
          ) : (
            <div className="py-3">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 mb-4">
                <div className="text-sm font-bold text-emerald-900 mb-1">등록이 완료되었습니다 ✓</div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>{email}</strong>으로 컨설팅 서비스 오픈 시 가장 먼저 안내드릴게요.
                  <br />
                  {CURRENT_YEAR}년 5월 한정 50% 할인 ({plannedMonth} 공사 예정)
                </p>
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

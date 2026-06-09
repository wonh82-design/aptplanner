'use client';

/**
 * '우리집 인테리어 계획서 받기' (₩5,900) 신청 모달.
 *
 * 흐름:
 *  1) 성명 + 이메일 입력 → onSubmit(name, email)
 *     onSubmit 내부(호출부)에서 고객 산정 내역 PDF 를 만들어 관리자에게 메일 발송.
 *  2) 성공 시 안내: "신청 후 24시간 이내에 메일로 송부 → 자료 수령 후 입금"
 */

import { useState } from 'react';
import { PAYMENT_ACCOUNT, PAYMENT_ACCOUNT_READY } from '@/lib/payment';

const EMPTY = '—';
const PRICE = '5,900원';
const ORIGINAL_PRICE = '19,800원'; // 정가 — 출시 기념 70% 할인 전

type Props = {
  onClose: () => void;
  /** 신청 처리 — 성공/실패 반환. 호출부에서 PDF 생성 + API 전송 담당. */
  onSubmit: (name: string, email: string) => Promise<{ ok: boolean; error?: string }>;
};

export function PlanRequestModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrMsg('');
    const r = await onSubmit(name.trim(), email.trim());
    if (r.ok) {
      setStatus('ok');
    } else {
      setStatus('error');
      setErrMsg(
        r.error === 'invalid_email' ? '이메일 형식을 다시 확인해주세요.'
        : r.error === 'name_required' ? '성명을 입력해주세요.'
        : '신청 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
      );
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
              <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-700 mb-1">
                🎉 출시 기념 70% 할인 · <span className="line-through text-blue-300">₩{ORIGINAL_PRICE}</span> ₩{PRICE} · 자료 수령 후 입금
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                {status === 'ok' ? '신청이 접수되었습니다' : '우리집 인테리어 계획서 신청'}
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
              <p className="text-sm text-zinc-600 leading-relaxed mb-3">
                성명과 이메일을 남겨주시면, 지금 산출한 공사 내역을 바탕으로
                아래 <strong className="text-zinc-900">2부의 문서</strong>를
                <strong className="text-zinc-900"> 수정 가능한 파워포인트(PPT)와 엑셀</strong>로 보내드립니다.
              </p>
              <ul className="text-xs text-zinc-700 leading-relaxed mb-4 space-y-1.5">
                <li>① <strong>우리집 공사계획서</strong> — 공사범위·스펙·기준 공사비</li>
                <li>② <strong>업체 견적용 공사계획서</strong> — 공사범위·스펙 + 업체 기재용 견적요청서</li>
              </ul>

              <form onSubmit={submit} className="space-y-3">
                <Field label="성명">
                  <input
                    type="text" required placeholder="홍길동"
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="input" disabled={status === 'sending'}
                  />
                </Field>
                <Field label="이메일">
                  <input
                    type="email" required placeholder="example@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input" disabled={status === 'sending'}
                  />
                </Field>

                {status === 'error' && errMsg && (
                  <div className="rounded-md bg-red-50 border border-red-200 text-xs text-red-800 px-3 py-2">
                    {errMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'sending' ? '신청 처리 중…' : '신청하기'}
                </button>

                <p className="text-[11px] text-zinc-500 leading-relaxed mt-2 text-center">
                  신청 후 <strong>24시간 이내</strong>에 메일로 송부드립니다.
                </p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  · 입력하신 정보와 산정 내역은 문서 제작·송부 용도로만 사용됩니다.
                </p>
              </form>
            </>
          ) : (
            // ===== 신청 완료 =====
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-sm font-bold text-emerald-900 mb-1">신청이 접수되었습니다 ✓</div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>{name}</strong>님, <strong>{email}</strong>로
                  <strong> 24시간 이내</strong>에 2부의 문서(PPT·엑셀)를 보내드립니다.
                </p>
              </div>

              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-700 leading-relaxed">
                <strong className="text-zinc-900">진행 순서</strong>
                <ol className="mt-1.5 space-y-1 list-decimal list-inside">
                  <li>24시간 이내 메일로 2부의 문서 송부</li>
                  <li>자료 확인 후 아래 계좌로 <strong>₩{PRICE}</strong> 입금</li>
                  <li>입금자명은 신청한 성명과 동일하게</li>
                </ol>
              </div>

              {/* 입금 계좌 (자료 수령 후) */}
              <div className="rounded-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-2">
                  입금 계좌 (자료 수령 후)
                </div>
                <div className="space-y-1.5">
                  <Row k="은행" v={PAYMENT_ACCOUNT.bank || EMPTY} ready={!!PAYMENT_ACCOUNT.bank} />
                  <Row k="계좌번호" v={PAYMENT_ACCOUNT.number || EMPTY} mono ready={!!PAYMENT_ACCOUNT.number} />
                  <Row k="예금주" v={PAYMENT_ACCOUNT.holder || EMPTY} ready={!!PAYMENT_ACCOUNT.holder} />
                  <div className="flex items-baseline justify-between pt-2 border-t border-blue-200/60">
                    <span className="text-[11px] text-blue-700 font-bold">입금 금액</span>
                    <span className="text-base font-bold text-blue-700">₩{PRICE}</span>
                  </div>
                </div>
                {PAYMENT_ACCOUNT_READY && (
                  <button
                    type="button" onClick={copyAccount}
                    className="mt-3 w-full py-2 rounded-md border border-blue-300 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold transition"
                  >
                    {copied ? '계좌번호 복사됨 ✓' : '계좌번호 복사'}
                  </button>
                )}
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

function Row({ k, v, mono = false, ready }: { k: string; v: string; mono?: boolean; ready: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[11px] text-zinc-500">{k}</span>
      <span className={`text-sm ${mono ? 'font-mono' : ''} font-semibold ${ready ? 'text-zinc-900' : 'text-zinc-400'}`}>{v}</span>
    </div>
  );
}

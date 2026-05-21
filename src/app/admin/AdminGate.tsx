'use client';

/**
 * 관리자 페이지 인증 게이트.
 * 토큰이 없거나 401 응답을 받으면 비밀번호 입력 폼 표시.
 * 비밀번호는 환경변수 ADMIN_PASSWORD 와 비교.
 */

import { useState } from 'react';
import { useAdminToken } from './useAdminToken';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { token, setToken, hydrated, fetchWithAuth } = useAdminToken();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400 text-sm">
        로딩 중…
      </div>
    );
  }

  // 토큰 있으면 children 노출. 401 발생 시 자식 컴포넌트가 setToken(null) 호출하여 다시 게이트로.
  if (token) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // 비밀번호로 GET 시도 → 200이면 토큰 저장
      const res = await fetch('/api/admin/materials', {
        headers: { 'x-admin-token': password },
      });
      if (res.status === 401) {
        setError('비밀번호가 일치하지 않거나 ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.');
        return;
      }
      if (!res.ok) {
        setError('서버 오류: ' + res.status);
        return;
      }
      setToken(password);
    } catch (e) {
      setError('네트워크 오류: ' + String(e));
    } finally {
      setSubmitting(false);
    }
    void fetchWithAuth; // import 회피
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-zinc-200 shadow-sm p-6 sm:p-7">
        <div className="text-center mb-5">
          <div className="text-2xl mb-2">🔒</div>
          <h1 className="text-lg font-bold text-zinc-900">관리자 인증</h1>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            자재마스터를 편집하려면 운영자 비밀번호가 필요합니다.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={submitting}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-zinc-50"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '확인 중…' : '인증'}
          </button>
        </form>
        <p className="mt-5 text-[10px] text-zinc-400 leading-relaxed">
          ※ ADMIN_PASSWORD 환경변수가 설정되어야 합니다.
          <br />
          .env.local 또는 Vercel Settings → Environment Variables 에서 설정.
        </p>
      </div>
    </div>
  );
}

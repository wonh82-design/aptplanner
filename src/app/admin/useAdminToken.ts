'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'apt-planner:admin:token';

/**
 * 관리자 토큰 관리 hook.
 * sessionStorage에 저장 — 브라우저 탭 닫으면 자동 만료.
 */
export function useAdminToken() {
  const [token, setTokenState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // hydrate
  useEffect(() => {
    try {
      const t = window.sessionStorage.getItem(STORAGE_KEY);
      if (t) setTokenState(t);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const setToken = (t: string | null) => {
    setTokenState(t);
    try {
      if (t) window.sessionStorage.setItem(STORAGE_KEY, t);
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  };

  /** fetch 호출 헬퍼 — token 자동 첨부 */
  const fetchWithAuth = async (input: RequestInfo, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (token) headers.set('x-admin-token', token);
    return fetch(input, { ...init, headers });
  };

  return { token, setToken, hydrated, fetchWithAuth };
}

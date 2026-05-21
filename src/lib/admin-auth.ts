/**
 * 관리자 인증 helper.
 *
 * 운영자만 알고 있는 ADMIN_PASSWORD (환경변수)를 토큰으로 사용.
 * 클라이언트는 sessionStorage에 저장 → fetch 헤더 `x-admin-token`에 첨부.
 * 서버는 헤더 값을 환경변수와 직접 비교 (timing-safe 비교는 단순 비교로 충분 —
 * 본 어드민은 운영자 1인 사용이라 brute force 공격 surface 없음).
 *
 * ADMIN_PASSWORD가 비어 있으면 모든 요청 차단 (안전한 기본값).
 */

/** 헤더 토큰을 환경변수와 비교 — 매치 시 true */
export function isValidAdminToken(token: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected) return false; // 환경변수 미설정 시 모든 요청 거부
  if (!token) return false;
  return token === expected;
}

/** API 라우트 헬퍼 — 401 응답 생성 */
export function unauthorized(message = '관리자 인증 필요') {
  return new Response(JSON.stringify({ ok: false, error: 'unauthorized', message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

import { NextResponse } from 'next/server';
import { isValidAdminToken, unauthorized } from '@/lib/admin-auth';
import { isDbConfigured, fetchPlanRequests, fetchPlanRequestById } from '@/lib/db';

/**
 * 관리자 — '우리집 인테리어 계획서' 신청 목록 API.
 *
 * GET /api/admin/plan-requests          — 신청 목록 (최신순, quote 제외)
 * GET /api/admin/plan-requests?id=123   — 신청 1건 상세 (quote 포함)
 *
 * 인증: 헤더 `x-admin-token` 이 `ADMIN_PASSWORD` 환경변수와 일치해야 함.
 *
 * 데이터 원천: Neon plan_requests 테이블 (api/plan-request 가 신청 시 저장).
 * DB 미설정 시 → 503 (로컬 dev 에서는 신청이 저장되지 않으므로).
 */

export async function GET(req: Request) {
  const token = req.headers.get('x-admin-token');
  if (!isValidAdminToken(token)) return unauthorized();

  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'db_not_configured', message: 'DATABASE_URL 미설정 — 신청은 DB에만 저장됩니다.' },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const idParam = url.searchParams.get('id');

  // 상세 조회 (quote 포함)
  if (idParam) {
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }
    const row = await fetchPlanRequestById(id);
    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, request: row });
  }

  // 목록 조회
  const rows = await fetchPlanRequests(200);
  if (rows === null) {
    return NextResponse.json({ ok: false, error: 'read_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, requests: rows, count: rows.length });
}

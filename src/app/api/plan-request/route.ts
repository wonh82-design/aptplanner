import { NextResponse } from 'next/server';
import { savePlanRequest } from '@/lib/db';
import { buildPlanPptxBase64 } from '@/lib/pptx/plan-pptx';
import { buildPlanXlsxBase64 } from '@/lib/xlsx/plan-xlsx';
import type { Quote } from '@/lib/types';
import type { PlanSection } from '@/lib/plan-doc';

/**
 * '우리집 인테리어 계획서' 신청 접수 API (₩5,900).
 *
 * 관리자 첨부는 **2종**:
 *  ① 수정 가능한 PPTX 공사계획서 — 비주얼 계획서/송부용
 *  ② 엑셀(XLSX) 견적표 — 공종별 단가·수량·공사비 (숫자 셀 → 합계 재계산·견적요청서 가공 용이)
 * 둘 다 결과 화면과 동일한 공종 분류(buildPlanDoc → calculator.categoryOf)로 구성.
 * (서버에서 quote(+선택 sections)로 렌더 → Resend 첨부)
 *
 * 내구성 정책:
 *  이메일은 알림 채널일 뿐 단일 실패점이 아니다. 신청은 먼저 DB(Neon plan_requests)에
 *  영속 저장하여 메일 실패와 무관하게 주문이 보존된다.
 *  - DB 저장 성공 OR 이메일 발송 성공 중 하나라도 되면 ok:true (접수 보장).
 *  - 둘 다 실패하면 ok:false → 사용자가 재시도 (무음 유실 방지).
 *
 * ⚠ 메일 도달 전제(운영): Resend 발신 주소(CONSULT_NOTIFY_FROM)는 '인증된 도메인'이어야
 *   외부 수신자(wonh82@gmail.com)에게 도달. 미인증이어도 DB 저장으로 주문은 보존됨.
 */

const ADMIN_TO = 'wonh82@gmail.com';
const MAX_ATTACH_BASE64 = 6_000_000; // 서버리스 본문 한도 보호 (pptx 는 보통 수십~수백 KB)

export async function POST(req: Request) {
  let body: {
    name?: string; email?: string; meta?: Record<string, unknown>;
    quote?: Quote; sections?: PlanSection[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const name = (body.name ?? '').toString().trim();
  const email = (body.email ?? '').toString().trim();
  if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  const meta = (body.meta ?? {}) as Record<string, unknown>;
  const quote = body.quote ?? null;
  const sections = Array.isArray(body.sections) ? body.sections : undefined;
  const at = new Date().toISOString();
  const gradeLabel = (meta.grade ? String(meta.grade) : '표준');

  // 첨부 파일명 공통 접미사 (평형 없을 때 깔끔하게)
  const fnameSuffix = `${meta.pyeong ?? ''}평_${meta.quote_id ?? quote?.quote_id ?? ''}`.replace(/^평_/, '');

  // ── 공사계획서 PPTX 생성 (best-effort) ──
  let pptxBase64 = '';
  if (quote) {
    try {
      pptxBase64 = await buildPlanPptxBase64({ name, email, quote, gradeLabel, sections });
      if (pptxBase64.length > MAX_ATTACH_BASE64) {
        console.warn('[apt-planner] plan-request: pptx 용량 초과 — 첨부 생략', pptxBase64.length);
        pptxBase64 = '';
      }
    } catch (e) {
      console.error('[apt-planner] plan-request: pptx 생성 실패', e);
      pptxBase64 = '';
    }
  }
  const pptxFilename = `apt-planner_공사계획서_${fnameSuffix}.pptx`;

  // ── 공사 견적표 XLSX 생성 (best-effort) ──
  let xlsxBase64 = '';
  if (quote) {
    try {
      xlsxBase64 = buildPlanXlsxBase64({ name, email, quote, gradeLabel, sections });
      if (xlsxBase64.length > MAX_ATTACH_BASE64) {
        console.warn('[apt-planner] plan-request: xlsx 용량 초과 — 첨부 생략', xlsxBase64.length);
        xlsxBase64 = '';
      }
    } catch (e) {
      console.error('[apt-planner] plan-request: xlsx 생성 실패', e);
      xlsxBase64 = '';
    }
  }
  const xlsxFilename = `apt-planner_견적표_${fnameSuffix}.xlsx`;

  console.log('[apt-planner] PLAN REQUEST', JSON.stringify({
    name, email, at, has_pptx: !!pptxBase64, has_xlsx: !!xlsxBase64,
    quote_id: meta.quote_id ?? quote?.quote_id ?? null,
  }));

  // ── 1) 이메일 발송 (알림 + PPTX·XLSX 첨부, best-effort) ──
  const emailed = await trySendEmail({
    name, email, meta, at, pptxBase64, pptxFilename, xlsxBase64, xlsxFilename,
  });

  // ── 2) DB 영속 저장 (주문 보존 — 메일 실패와 무관) ──
  const persisted = await savePlanRequest({
    name, email, meta, quote, hasPdf: !!pptxBase64 || !!xlsxBase64, emailed,
  });

  if (!emailed && !persisted) {
    console.error('[apt-planner] plan-request DELIVERY FAILED (email+db both failed)', { name, email });
    return NextResponse.json({ ok: false, error: 'delivery_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, emailed, persisted, attached: !!pptxBase64 || !!xlsxBase64 });
}

/** Resend 로 관리자 알림 메일 발송 (PPTX + XLSX 첨부). 성공 시 true. */
async function trySendEmail(p: {
  name: string; email: string; meta: Record<string, unknown>; at: string;
  pptxBase64: string; pptxFilename: string;
  xlsxBase64: string; xlsxFilename: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[apt-planner] plan-request: RESEND_API_KEY 미설정 — 메일 미발송 (DB 저장으로 보존)');
    return false;
  }

  const line = (k: string, label: string) =>
    p.meta[k] !== undefined && p.meta[k] !== null ? `${label}: ${String(p.meta[k])}` : null;
  const metaText = [
    line('pyeong', '평형'), line('bay', '베이'), line('rooms', '방 개수'),
    line('grade', '기준 등급'), line('region', '지역'), line('age', '연식'),
    line('grand_total', '예상 공사비(보정후·부가세별도)'), line('line_item_count', '라인 수'),
    line('quote_id', '견적 ID'),
  ].filter(Boolean).join('\n');

  const subject = `[apt-planner] 인테리어 계획서 신청 — ${p.name} · ${p.email}`;
  const text =
`새 '우리집 인테리어 계획서' 신청이 접수되었습니다.

■ 신청자
이름: ${p.name}
이메일: ${p.email}
접수일: ${p.at}

■ 공사비 산정 내역 (고객 입력 기준)
${metaText || '(메타 없음)'}

■ 첨부 자료 (결과 화면과 동일한 공종 분류)
① 공사계획서 PPTX — 공종별 공사범위·스펙·수량·공사비. 비주얼 계획서/송부용 (그대로 편집 가능).
② 견적표 XLSX — 공종별 단가·수량·공사비가 숫자 셀로 입력됨. 합계 재계산·업체 견적요청서 가공에 사용.

■ 처리 안내
- 위 자료를 편집해 2부 문서(① 우리집 공사계획서 ② 업체 견적용 공사계획서)로 다듬어 신청자에게 24시간 이내 송부 → 자료 수령 후 ₩5,900 입금 안내.
${p.pptxBase64 ? '' : '\n⚠ 첨부 PPTX 누락(생성 실패 또는 용량 초과). DB(plan_requests)의 quote 로 재생성하세요.'}${p.xlsxBase64 ? '' : '\n⚠ 첨부 XLSX 누락(생성 실패 또는 용량 초과). DB(plan_requests)의 quote 로 재생성하세요.'}`;

  const from = process.env.CONSULT_NOTIFY_FROM || 'apt-planner <onboarding@resend.dev>';
  try {
    const payload: Record<string, unknown> = { from, to: ADMIN_TO, reply_to: p.email, subject, text };
    const attachments: { filename: string; content: string }[] = [];
    if (p.pptxBase64) attachments.push({ filename: p.pptxFilename, content: p.pptxBase64 });
    if (p.xlsxBase64) attachments.push({ filename: p.xlsxFilename, content: p.xlsxBase64 });
    if (attachments.length) payload.attachments = attachments;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('[apt-planner] plan-request resend non-ok', res.status, t.slice(0, 300));
      return false;
    }
    console.log('[apt-planner] plan-request resend OK', res.status);
    return true;
  } catch (e) {
    console.error('[apt-planner] plan-request resend exception', e);
    return false;
  }
}

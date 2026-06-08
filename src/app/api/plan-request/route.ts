import { NextResponse } from 'next/server';
import { savePlanRequest } from '@/lib/db';

/**
 * '우리집 인테리어 계획서' 신청 접수 API (₩5,900).
 *
 * 내구성 정책 (코드리뷰 반영):
 *  이메일은 알림 채널일 뿐 단일 실패점이 아니다. 신청은 먼저 DB(Neon plan_requests)에
 *  영속 저장하여 메일 실패와 무관하게 주문이 보존된다.
 *  - DB 저장 성공 OR 이메일 발송 성공 중 하나라도 되면 ok:true (접수 보장).
 *  - 둘 다 실패하면 ok:false → 사용자가 재시도 (무음 유실 방지).
 *
 * 동작:
 *  1) 신청 정보(성명·이메일) + 산정 내역(quote) + PDF(base64) 수신
 *  2) DB 영속 저장 (quote 전체 보관 → 관리자가 재생성 가능)
 *  3) 관리자(wonh82@gmail.com)에게 Resend 메일 — PDF 첨부 (best-effort)
 *
 * ⚠ 메일 도달 전제(운영):
 *   Resend 발신 주소(CONSULT_NOTIFY_FROM)는 반드시 '인증된 도메인' 주소여야
 *   외부 수신자(wonh82@gmail.com)에게 도달한다. 미인증 onboarding@resend.dev 는
 *   Resend 계정 소유자 본인 메일로만 발송되므로 운영 전 도메인 인증 필수.
 *   (도메인 미인증이어도 DB 저장으로 주문은 보존됨)
 */

const ADMIN_TO = 'wonh82@gmail.com';
const MAX_PDF_BASE64 = 4_000_000; // 서버리스 본문 한도(~4.5MB) 보호

export async function POST(req: Request) {
  let body: {
    name?: string; email?: string; meta?: Record<string, unknown>;
    quote?: unknown; pdfBase64?: string; pdfFilename?: string;
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
  const at = new Date().toISOString();
  let pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : '';
  const pdfFilename = (body.pdfFilename || 'apt-planner_산정내역.pdf').toString();

  let attachmentDropped = false;
  if (pdfBase64.length > MAX_PDF_BASE64) {
    attachmentDropped = true;
    pdfBase64 = '';
  }

  console.log('[apt-planner] PLAN REQUEST', JSON.stringify({
    name, email, at, has_pdf: !!pdfBase64, attachment_dropped: attachmentDropped,
    quote_id: meta.quote_id ?? null,
  }));

  // ── 1) 이메일 발송 (알림, best-effort) ──
  const emailed = await trySendEmail({ name, email, meta, at, pdfBase64, pdfFilename, attachmentDropped });

  // ── 2) DB 영속 저장 (주문 보존 — 메일 실패와 무관) ──
  const persisted = await savePlanRequest({
    name, email, meta, quote, hasPdf: !!pdfBase64, emailed,
  });

  // 둘 다 실패 → 무음 유실 방지 위해 명시적 실패 반환
  if (!emailed && !persisted) {
    console.error('[apt-planner] plan-request DELIVERY FAILED (email+db both failed)', { name, email });
    return NextResponse.json({ ok: false, error: 'delivery_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, emailed, persisted, attachmentDropped });
}

/** Resend 로 관리자 알림 메일 발송. 성공 시 true. */
async function trySendEmail(p: {
  name: string; email: string; meta: Record<string, unknown>; at: string;
  pdfBase64: string; pdfFilename: string; attachmentDropped: boolean;
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

■ 처리 안내
- 첨부 산정 내역 PDF 를 바탕으로 2부 문서를 PDF + 수정 가능한 PPT 로 제작해 주세요.
  ① 우리집 공사계획서 (공사범위·스펙·기준 공사비)
  ② 업체 견적용 공사계획서 (공사범위·스펙 + 업체 기재용 견적요청서)
- 신청자에게 24시간 이내 메일 송부 → 자료 수령 후 ₩5,900 입금 안내.
${p.attachmentDropped ? '\n⚠ 첨부 PDF 용량 초과로 본문만 전송됨. DB(plan_requests)의 quote 로 재생성하세요.' : ''}`;

  const from = process.env.CONSULT_NOTIFY_FROM || 'apt-planner <onboarding@resend.dev>';
  try {
    const payload: Record<string, unknown> = { from, to: ADMIN_TO, reply_to: p.email, subject, text };
    if (p.pdfBase64) payload.attachments = [{ filename: p.pdfFilename, content: p.pdfBase64 }];
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

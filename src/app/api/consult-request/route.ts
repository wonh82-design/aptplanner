import { NextResponse } from 'next/server';

/**
 * 컨설팅 신청 접수 API.
 *
 * 동작:
 *  1) 콘솔 로그 (dev에서 확인용)
 *  2) CONSULT_WEBHOOK_URL 환경변수가 있으면 그곳으로 POST 전달
 *     (Slack/Discord webhook, Zapier, Make, Resend Inbound, n8n 등 자유)
 *  3) RESEND_API_KEY + CONSULT_NOTIFY_TO 환경변수가 있으면 이메일 발송
 *
 * 운영 시 환경변수 예:
 *   CONSULT_WEBHOOK_URL=https://hooks.slack.com/services/...
 *   RESEND_API_KEY=re_...
 *   CONSULT_NOTIFY_TO=admin@example.com
 *   CONSULT_NOTIFY_FROM=apt-planner <noreply@aptplanner.kr>
 */
export async function POST(req: Request) {
  let body: { email?: string; plannedMonth?: string; meta?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const email = (body.email ?? '').toString().trim();
  const plannedMonth = (body.plannedMonth ?? '').toString().trim();

  // 간단한 형식 검증
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValid) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }
  if (!plannedMonth) {
    return NextResponse.json({ ok: false, error: 'planned_month_required' }, { status: 400 });
  }

  const record = {
    type: 'consult-request',
    email,
    planned_month: plannedMonth,
    at: new Date().toISOString(),
    user_agent: req.headers.get('user-agent') ?? null,
    referer: req.headers.get('referer') ?? null,
    meta: body.meta ?? null,
  };

  // 1) 콘솔에 즉시 출력 (운영자가 dev 환경에서 바로 확인)
  console.log('[apt-planner] CONSULT REQUEST', JSON.stringify(record));

  // 2) 외부 Webhook 전달 (선택)
  if (process.env.CONSULT_WEBHOOK_URL) {
    try {
      await fetch(process.env.CONSULT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (e) {
      console.error('[apt-planner] webhook failed', e);
    }
  }

  // 3) Resend 이메일 전송 (선택)
  if (process.env.RESEND_API_KEY && process.env.CONSULT_NOTIFY_TO) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.CONSULT_NOTIFY_FROM || 'apt-planner <noreply@aptplanner.kr>',
          to: process.env.CONSULT_NOTIFY_TO,
          subject: `[apt-planner] 컨설팅 신청 — ${email} · ${plannedMonth}`,
          text:
`새 컨설팅 신청이 접수되었습니다.

이메일: ${email}
공사 예정월: ${plannedMonth}
접수일: ${record.at}
User-Agent: ${record.user_agent ?? '-'}
Referer: ${record.referer ?? '-'}
`,
        }),
      });
    } catch (e) {
      console.error('[apt-planner] resend failed', e);
    }
  }

  return NextResponse.json({ ok: true });
}

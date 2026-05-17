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
  let body: { name?: string; email?: string; plannedMonth?: string; meta?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const name = (body.name ?? '').toString().trim();
  const email = (body.email ?? '').toString().trim();
  const plannedMonth = (body.plannedMonth ?? '').toString().trim();

  if (!name) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
  }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValid) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }
  if (!plannedMonth) {
    return NextResponse.json({ ok: false, error: 'planned_month_required' }, { status: 400 });
  }

  const record = {
    type: 'consult-request',
    name,
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
    const from = process.env.CONSULT_NOTIFY_FROM || 'apt-planner <onboarding@resend.dev>';
    const to = process.env.CONSULT_NOTIFY_TO;
    console.log('[apt-planner] consult resend attempt', { from, to, hasKey: !!process.env.RESEND_API_KEY });
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject: `[apt-planner] 컨설팅 신청 — ${name} · ${plannedMonth}`,
          text:
`새 컨설팅 신청이 접수되었습니다.

이름: ${name}
이메일: ${email}
공사 예정월: ${plannedMonth}
접수일: ${record.at}
User-Agent: ${record.user_agent ?? '-'}
Referer: ${record.referer ?? '-'}

입금 확인 후 신청자에게 컨설팅 일정·자료 요청 이메일을 보내주세요.
`,
        }),
      });
      const responseText = await resendRes.text();
      if (!resendRes.ok) {
        console.error('[apt-planner] consult resend non-ok response', resendRes.status, responseText);
      } else {
        console.log('[apt-planner] consult resend OK', resendRes.status, responseText.slice(0, 200));
      }
    } catch (e) {
      console.error('[apt-planner] consult resend failed (exception)', e);
    }
  } else {
    console.warn('[apt-planner] consult resend skipped — env missing', {
      hasKey: !!process.env.RESEND_API_KEY,
      hasTo: !!process.env.CONSULT_NOTIFY_TO,
    });
  }

  return NextResponse.json({ ok: true });
}

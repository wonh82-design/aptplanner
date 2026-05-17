import { NextResponse } from 'next/server';

/**
 * 스펙북(₩29,000) 신청 접수 API.
 *
 * 동작:
 *  1) 콘솔 로그 (dev/Vercel Logs)
 *  2) SPEC_WEBHOOK_URL 환경변수가 있으면 그곳으로 POST 전달 (Slack/Discord/Zapier 등)
 *  3) RESEND_API_KEY + SPEC_NOTIFY_TO 환경변수가 있으면 이메일 발송
 *
 * 운영 시 환경변수 예:
 *   SPEC_WEBHOOK_URL=https://hooks.slack.com/services/...
 *   RESEND_API_KEY=re_...
 *   SPEC_NOTIFY_TO=admin@example.com
 *   CONSULT_NOTIFY_FROM=apt-planner <noreply@aptplanner.kr>
 */
export async function POST(req: Request) {
  let body: { name?: string; email?: string; meta?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const name = (body.name ?? '').toString().trim();
  const email = (body.email ?? '').toString().trim();

  if (!name) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
  }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValid) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  const record = {
    type: 'spec-book-request',
    name,
    email,
    at: new Date().toISOString(),
    user_agent: req.headers.get('user-agent') ?? null,
    referer: req.headers.get('referer') ?? null,
    meta: body.meta ?? null,
  };

  console.log('[apt-planner] SPEC REQUEST', JSON.stringify(record));

  if (process.env.SPEC_WEBHOOK_URL) {
    try {
      await fetch(process.env.SPEC_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (e) {
      console.error('[apt-planner] spec webhook failed', e);
    }
  }

  if (process.env.RESEND_API_KEY && process.env.SPEC_NOTIFY_TO) {
    const from = process.env.CONSULT_NOTIFY_FROM || 'apt-planner <onboarding@resend.dev>';
    const to = process.env.SPEC_NOTIFY_TO;
    console.log('[apt-planner] spec resend attempt', { from, to, hasKey: !!process.env.RESEND_API_KEY });
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
          subject: `[apt-planner] 스펙북 신청 — ${name} · ${email}`,
          text:
`새 스펙북 신청이 접수되었습니다.

이름: ${name}
이메일: ${email}
접수일: ${record.at}
User-Agent: ${record.user_agent ?? '-'}
Referer: ${record.referer ?? '-'}

입금 확인 후 두 가지 PDF를 이메일로 송부해주세요:
  1) 우리집 인테리어 계획 스펙북 PDF
  2) 인테리어 실전 가이드 PDF
`,
        }),
      });
      const responseText = await resendRes.text();
      if (!resendRes.ok) {
        console.error('[apt-planner] spec resend non-ok response', resendRes.status, responseText);
      } else {
        console.log('[apt-planner] spec resend OK', resendRes.status, responseText.slice(0, 200));
      }
    } catch (e) {
      console.error('[apt-planner] spec resend failed (exception)', e);
    }
  } else {
    console.warn('[apt-planner] spec resend skipped — env missing', {
      hasKey: !!process.env.RESEND_API_KEY,
      hasTo: !!process.env.SPEC_NOTIFY_TO,
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * 결과 요약 공유 이미지 생성 (클라이언트 전용 — canvas).
 *
 * 결과 화면의 핵심(총 공사비 범위·시공 방식별 범위·공종 TOP5)을 1080×1350 PNG 한 장으로.
 * 가족(배우자) 카톡 공유·업체 전달용 — 외부 의존성 없이 손그림 캔버스.
 *
 * 금액 표기는 화면과 동일하게 부가세 포함(withVat / grand_total_with_vat) 기준.
 */
import type { Quote } from './types';
import { withVat, fmtKRWShort, REGION_LABEL, AGE_LABEL } from './calculator';

const W = 1080;
const H = 1350;
const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';

/** 10만원 단위 반올림 — ResultBanner 시공 방식별 계산과 동일 */
const r100k = (n: number) => Math.round(n / 100_000) * 100_000;

export async function buildResultShareImage(quote: Quote, gradeLabel: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  const { totals, property } = quote;
  const base = totals.grand_total_with_vat;

  // ===== 배경 =====
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ===== 헤더 밴드 =====
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, W, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText('Apt-Planner', 56, 76);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `28px ${FONT}`;
  ctx.fillText('우리집 인테리어 예상 공사비 요약', 56, 122);

  // ===== 우리집 현황 라인 =====
  ctx.fillStyle = '#52525b';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(
    `${property.pyeong}평 · ${REGION_LABEL[property.region]} · ${AGE_LABEL[property.age]} · ${gradeLabel} 등급`,
    56, 226,
  );

  // ===== 총 공사비 (부가세 포함 범위) =====
  ctx.fillStyle = '#71717a';
  ctx.font = `26px ${FONT}`;
  ctx.fillText('총 예상 공사비 (부가세 포함)', 56, 296);
  ctx.fillStyle = '#1d4ed8';
  ctx.font = `bold 72px ${FONT}`;
  ctx.fillText(
    `${fmtKRWShort(withVat(totals.grand_total_low))} ~ ${fmtKRWShort(withVat(totals.grand_total_high))}`,
    56, 380,
  );
  ctx.fillStyle = '#52525b';
  ctx.font = `30px ${FONT}`;
  ctx.fillText(`중앙값 ${fmtKRWShort(base)} · 평당 약 ${fmtKRWShort(r100k(base / Math.max(property.pyeong, 1)))}`, 56, 432);

  // ===== 시공 방식별 (ResultBanner 와 동일 비율) =====
  const ways: { label: string; low: number; high: number; color: string }[] = [
    { label: '반셀프 인테리어 (±5%)', low: r100k(base * 0.95), high: r100k(base * 1.05), color: '#047857' },
    { label: '동네 인테리어업체 턴키 (+5~15%)', low: r100k(base * 1.05), high: r100k(base * 1.15), color: '#1d4ed8' },
    { label: '디자인 턴키업체 (+10~20%)', low: r100k(base * 1.10), high: r100k(base * 1.20), color: '#b45309' },
  ];
  let y = 520;
  ctx.fillStyle = '#18181b';
  ctx.font = `bold 32px ${FONT}`;
  ctx.fillText('시공 방식별 예상 범위', 56, y);
  y += 28;
  for (const w of ways) {
    y += 64;
    ctx.fillStyle = '#f4f4f5';
    roundRect(ctx, 56, y - 44, W - 112, 64, 12);
    ctx.fill();
    ctx.fillStyle = '#3f3f46';
    ctx.font = `600 27px ${FONT}`;
    ctx.fillText(w.label, 80, y);
    ctx.fillStyle = w.color;
    ctx.font = `bold 29px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${fmtKRWShort(w.low)} ~ ${fmtKRWShort(w.high)}`, W - 80, y);
    ctx.textAlign = 'left';
  }

  // ===== 공종별 TOP 5 (부가세 포함) =====
  y += 110;
  ctx.fillStyle = '#18181b';
  ctx.font = `bold 32px ${FONT}`;
  ctx.fillText('공종별 공사비 TOP 5 (부가세 포함)', 56, y);
  const top5 = Object.entries(totals.by_category).sort(([, a], [, b]) => b - a).slice(0, 5);
  const maxAmt = top5[0]?.[1] ?? 1;
  for (const [cat, amt] of top5) {
    y += 70;
    const vatAmt = withVat(amt);
    // 막대
    const barMax = W - 112 - 260;
    const barW = Math.max(14, Math.round((amt / maxAmt) * barMax));
    ctx.fillStyle = '#dbeafe';
    roundRect(ctx, 230, y - 30, barMax, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#3b82f6';
    roundRect(ctx, 230, y - 30, barW, 40, 8);
    ctx.fill();
    // 라벨·금액
    ctx.fillStyle = '#3f3f46';
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(cat.length > 6 ? cat.slice(0, 6) : cat, 56, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 24px ${FONT}`;
    const amtText = fmtKRWShort(vatAmt);
    if (barW > 150) {
      ctx.fillText(amtText, 246, y - 1);
    } else {
      ctx.fillStyle = '#3f3f46';
      ctx.fillText(amtText, 230 + barW + 14, y - 1);
    }
  }

  // ===== 푸터 =====
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(0, H - 130, W, 130);
  ctx.fillStyle = '#52525b';
  ctx.font = `26px ${FONT}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  ctx.fillText(`${origin}/calc 에서 무료 산출 · ${new Date().toLocaleDateString('ko-KR')}`, 56, H - 76);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `22px ${FONT}`;
  ctx.fillText('표준 시장가 기준 예상치이며 실제 견적은 현장 실측 후 달라질 수 있습니다.', 56, H - 38);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

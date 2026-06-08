/**
 * 공사계획서 PPTX 생성 (서버 전용 — pptxgenjs import).
 *
 * ⚠ 클라이언트 컴포넌트에서 import 금지 (pptxgenjs 가 번들에 섞임).
 *   오직 API route(`/api/plan-request`)에서만 호출.
 *
 * 슬라이드 구성:
 *   1) 표지        — 신청자·우리집 현황·예상 공사비(보정 후)
 *   2) 공종별 요약  — 결과 화면 by_category 와 동일한 공종·금액·비중
 *   3+) 공종별 상세 — 공종마다 [공사범위 · 기준자재(스펙) · 수량 · 단가 · 공사비] + 공종 소계
 *                    (autoPage 로 길면 자동 분할)
 *
 * 공종 분류는 `plan-doc.buildPlanDoc` (→ calculator.categoryOf) 으로 결과 화면과 100% 일치.
 * 수정 가능한 .pptx (텍스트·표) — 관리자가 그대로 편집/송부 가능.
 */
import PptxGenJS from 'pptxgenjs';
import type { Quote } from '../types';
import { REGION_LABEL, AGE_LABEL, adjustmentMultiplier, withVat } from '../calculator';
import { buildPlanDoc, type PlanSection } from '../plan-doc';

const FONT = 'Malgun Gothic';
const NAVY = '1E293B';
const BLUE = '1D4ED8';
const BLUEBG = 'EFF6FF';
const GRAY = '64748B';
const LINE = 'E2E8F0';

const won = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원';
const fmtQty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function cell(text: string, bold = false, align: 'left' | 'right' | 'center' = 'left'): PptxGenJS.TableCell {
  return { text, options: { bold, align, color: '1F2937', fontFace: FONT, fontSize: 10, valign: 'top' } };
}
function headCell(text: string, align: 'left' | 'right' | 'center' = 'left'): PptxGenJS.TableCell {
  return { text, options: { bold: true, align, color: '334155', fill: { color: 'F1F5F9' }, fontFace: FONT, fontSize: 10 } };
}

export async function buildPlanPptxBase64(opts: {
  name: string;
  email: string;
  quote: Quote;
  gradeLabel: string;
  sections?: PlanSection[];
}): Promise<string> {
  const { name, email, quote, gradeLabel } = opts;
  const p = quote.property;

  const doc = opts.sections && opts.sections.length
    ? { sections: opts.sections, rawTotal: opts.sections.reduce((s, x) => s + x.subtotal, 0) }
    : buildPlanDoc(quote);
  const { sections, rawTotal } = doc;

  const adj = adjustmentMultiplier(p);
  const adjustedExVat = Math.round(rawTotal * adj);
  const adjustedIncVat = withVat(adjustedExVat);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.author = 'apt-planner';
  pptx.company = 'apt-planner';
  pptx.title = '우리집 인테리어 공사 계획서';

  // ===== 1) 표지 =====
  const cover = pptx.addSlide();
  cover.background = { color: 'FFFFFF' };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.5, fill: { color: NAVY } });
  cover.addText('우리집 인테리어 공사 계획서', { x: 0.6, y: 0.32, w: 12.1, h: 0.6, fontSize: 30, bold: true, color: 'FFFFFF', fontFace: FONT });
  cover.addText('apt-planner · 표준 자재가 기준 예상 산출 (부가세 별도 표기)', { x: 0.62, y: 1.0, w: 12, h: 0.4, fontSize: 12, color: 'CBD5E1', fontFace: FONT });

  const info: PptxGenJS.TableRow[] = [
    [headCell('신청자'), cell(name || '—'), headCell('견적 ID'), cell(quote.quote_id)],
    [headCell('이메일'), cell(email || '—'), headCell('작성일'), cell(new Date(quote.created_at).toLocaleDateString('ko-KR'))],
    [headCell('평형'), cell(`${p.pyeong}평 (공급)`), headCell('베이 / 방'), cell(`${p.bay}베이 · 방 ${p.rooms}개`)],
    [headCell('지역 / 연식'), cell(`${REGION_LABEL[p.region]} · ${AGE_LABEL[p.age]}`), headCell('욕실'), cell(`공용 ${p.common_bath} · 부부 ${p.master_bath ? '있음' : '없음'}`)],
    [headCell('기준 등급'), cell(gradeLabel), headCell('발코니 깊이'), cell(`${p.balcony_depth_m.toFixed(1)} m`)],
  ];
  cover.addTable(info, {
    x: 0.6, y: 1.95, w: 12.13, colW: [1.8, 4.26, 1.8, 4.27],
    border: { type: 'solid', color: LINE, pt: 0.5 },
    fontSize: 12, fontFace: FONT, valign: 'middle', rowH: 0.42,
  });

  cover.addShape(pptx.ShapeType.rect, { x: 0.6, y: 4.75, w: 12.13, h: 1.85, fill: { color: BLUEBG }, line: { color: 'BFDBFE', width: 1 } });
  cover.addText('예상 공사비 (지역·연식 보정 후)', { x: 0.95, y: 4.98, w: 11, h: 0.4, fontSize: 14, bold: true, color: BLUE, fontFace: FONT });
  cover.addText(
    [
      { text: `부가세 별도   ${won(adjustedExVat)}`, options: { fontSize: 16, color: NAVY, bold: true, breakLine: true } },
      { text: `부가세 포함   ${won(adjustedIncVat)}`, options: { fontSize: 24, color: BLUE, bold: true } },
    ],
    { x: 0.95, y: 5.4, w: 11.4, h: 0.95, fontFace: FONT, lineSpacingMultiple: 1.15 },
  );
  cover.addText(`표준가 합계(보정 전) ${won(rawTotal)} × 보정 ${adj.toFixed(2)}  ·  공종 ${sections.length}개`, { x: 0.95, y: 6.28, w: 11.4, h: 0.3, fontSize: 10, color: GRAY, fontFace: FONT });
  cover.addText('※ 상세 금액은 지역·연식 보정 전 표준 시장가 기준이며, 실제 견적은 현장 실측 후 달라질 수 있습니다.', { x: 0.6, y: 6.95, w: 12, h: 0.3, fontSize: 9, italic: true, color: GRAY, fontFace: FONT });

  // ===== 2) 공종별 요약 =====
  const sum = pptx.addSlide();
  sum.background = { color: 'FFFFFF' };
  sum.addText('공종별 공사비 요약', { x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 20, bold: true, color: NAVY, fontFace: FONT });
  const sumRows: PptxGenJS.TableRow[] = [[headCell('공종'), headCell('공사비 (부가세 별도)', 'right'), headCell('비중', 'right')]];
  for (const sec of sections) {
    const pct = rawTotal > 0 ? (sec.subtotal / rawTotal) * 100 : 0;
    sumRows.push([cell(sec.category), cell(won(sec.subtotal), false, 'right'), cell(pct.toFixed(1) + '%', false, 'right')]);
  }
  sumRows.push([cell('합계 (부가세 별도)', true), cell(won(rawTotal), true, 'right'), cell('100%', true, 'right')]);
  sum.addTable(sumRows, {
    x: 0.5, y: 0.95, w: 8.6, colW: [4.6, 2.6, 1.4],
    border: { type: 'solid', color: LINE, pt: 0.5 },
    fontSize: 11, fontFace: FONT, valign: 'middle',
    autoPage: true, autoPageRepeatHeader: true, autoPageHeaderRows: 1, autoPageSlideStartY: 0.5,
  });

  // ===== 3+) 공종별 상세 =====
  const det = pptx.addSlide();
  det.background = { color: 'FFFFFF' };
  det.addText('공종별 상세 내역 (공사범위 · 스펙 · 수량 · 공사비)', { x: 0.5, y: 0.3, w: 12.3, h: 0.5, fontSize: 18, bold: true, color: NAVY, fontFace: FONT });

  const detRows: PptxGenJS.TableRow[] = [[
    headCell('공사 범위'), headCell('기준 자재 (스펙)'), headCell('수량', 'right'), headCell('단가', 'right'), headCell('공사비', 'right'),
  ]];
  for (const sec of sections) {
    detRows.push([{
      text: `■ ${sec.category}    공종 공사비 ${won(sec.subtotal)} (부가세 별도)`,
      options: { colspan: 5, bold: true, color: BLUE, fill: { color: BLUEBG }, fontFace: FONT, fontSize: 11, align: 'left' },
    }]);
    for (const r of sec.rows) {
      detRows.push([
        cell(r.scope),
        cell(r.spec),
        cell(`${fmtQty(r.qty)}${r.unit}`, false, 'right'),
        cell(`${won(r.unitPrice)}${r.unit ? '/' + r.unit : ''}`, false, 'right'),
        cell(won(r.subtotal), true, 'right'),
      ]);
    }
  }
  det.addTable(detRows, {
    x: 0.5, y: 0.95, w: 12.33, colW: [2.9, 4.6, 1.1, 1.9, 1.83],
    border: { type: 'solid', color: LINE, pt: 0.5 },
    fontSize: 9, fontFace: FONT, valign: 'top',
    autoPage: true, autoPageRepeatHeader: true, autoPageHeaderRows: 1, autoPageSlideStartY: 0.6,
  });

  const out = await pptx.write({ outputType: 'base64' });
  return out as string;
}

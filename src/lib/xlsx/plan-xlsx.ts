/**
 * 공사계획서 XLSX 생성 (서버 전용 — xlsx/SheetJS import).
 *
 * ⚠ 클라이언트 컴포넌트에서 import 금지 (xlsx 가 번들에 섞임).
 *   오직 API route(`/api/plan-request`)에서만 호출.
 *
 * 시트 구성:
 *   1) 요약    — 신청자·우리집 현황·예상 공사비(보정 후) + 공종별 공사비 요약
 *   2) 상세내역 — 라인별 [공종 · 공사범위 · 기준자재(스펙) · 수량 · 단위 · 단가 · 공사비]
 *
 * 공종 분류는 `plan-doc.buildPlanDoc` (→ calculator.categoryOf) 으로 결과 화면/PPTX 와 100% 일치.
 * 단가·수량·공사비는 '숫자 셀'로 기입 → 관리자가 엑셀에서 직접 수정·재계산 가능.
 * 금액은 모두 부가세 별도(라벨·컬럼명에 명시), 최종 예상 공사비만 별도/포함 둘 다 표기.
 *
 * SheetJS 커뮤니티 버전은 셀 폰트/색 스타일 쓰기를 지원하지 않으므로,
 * 가독성은 컬럼 너비(!cols)·숫자 표시형식(z)·셀 병합(!merges)·명확한 라벨로만 확보한다.
 */
import * as XLSX from 'xlsx';
import type { Quote } from '../types';
import { REGION_LABEL, AGE_LABEL, adjustmentMultiplier, withVat } from '../calculator';
import { buildPlanDoc, type PlanSection } from '../plan-doc';

/** 통화 표시형식 — 셀 값은 숫자로 두고 보기만 "1,234,000원" */
const WON_FMT = '#,##0"원"';
/** 수량 표시형식 — 정수는 정수로, 소수는 최대 2자리 */
const QTY_FMT = '#,##0.##';

type Cell = string | number;

export function buildPlanXlsxBase64(opts: {
  name: string;
  email: string;
  quote: Quote;
  gradeLabel: string;
  sections?: PlanSection[];
}): string {
  const { name, email, quote, gradeLabel } = opts;
  const p = quote.property;

  const doc = opts.sections && opts.sections.length
    ? { sections: opts.sections, rawTotal: opts.sections.reduce((s, x) => s + x.subtotal, 0) }
    : buildPlanDoc(quote);
  const { sections, rawTotal } = doc;

  const adj = adjustmentMultiplier(p);
  const adjustedExVat = Math.round(rawTotal * adj);
  const adjustedIncVat = withVat(adjustedExVat);

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: '우리집 인테리어 공사 계획서', Author: 'apt-planner', Company: 'apt-planner' };

  // =====================================================
  // 시트 1: 요약
  //  금액은 number 로, 보정 배수·비중은 문자열로 → number 셀 전체에 통화 포맷을 일괄 적용해도
  //  배수/비중이 "원"으로 깨지지 않는다.
  // =====================================================
  const createdAt = (() => {
    try { return new Date(quote.created_at).toLocaleDateString('ko-KR'); } catch { return '—'; }
  })();

  const s1: Cell[][] = [
    ['우리집 인테리어 공사 계획서'],
    ['apt-planner · 표준 자재가 기준 예상 산출 (별도 표기 없는 금액은 모두 부가세 별도)'],
    [],
    ['■ 신청 정보'],
    ['신청자', name || '—', '', '견적 ID', quote.quote_id],
    ['이메일', email || '—', '', '작성일', createdAt],
    [],
    ['■ 우리집 현황'],
    ['평형', `${p.pyeong}평 (공급)`, '', '베이 / 방', `${p.bay}베이 · 방 ${p.rooms}개`],
    ['지역 / 연식', `${REGION_LABEL[p.region]} · ${AGE_LABEL[p.age]}`, '', '욕실', `공용 ${p.common_bath} · 부부 ${p.master_bath ? '있음' : '없음'}`],
    ['기준 등급', gradeLabel, '', '발코니 깊이', `${p.balcony_depth_m.toFixed(1)} m`],
    [],
    ['■ 예상 공사비 (지역·연식 보정 후)'],
    ['표준가 합계 (보정 전 · 부가세 별도)', rawTotal],
    ['지역·연식 보정 배수', `× ${adj.toFixed(2)}`],
    ['보정 후 · 부가세 별도', adjustedExVat],
    ['보정 후 · 부가세 포함', adjustedIncVat],
    [],
    ['■ 공종별 공사비 요약 (부가세 별도)'],
    ['공종', '공사비', '비중'],
  ];
  for (const sec of sections) {
    const pct = rawTotal > 0 ? (sec.subtotal / rawTotal) * 100 : 0;
    s1.push([sec.category, sec.subtotal, `${pct.toFixed(1)}%`]);
  }
  s1.push(['합계 (부가세 별도)', rawTotal, '100%']);

  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 4 }, { wch: 14 }, { wch: 24 }];
  // 제목·소제목 행 병합 (A 셀 기준 가로 5칸)
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];
  applyMoneyFormatToAllNumbers(ws1);

  XLSX.utils.book_append_sheet(wb, ws1, '요약');

  // =====================================================
  // 시트 2: 상세내역 — 라인별 한 행 (공종 컬럼 포함 → 엑셀 필터/피벗 용이)
  // =====================================================
  const header = ['공종', '공사 범위', '기준 자재 (스펙)', '수량', '단위', '단가 (부가세 별도)', '공사비 (부가세 별도)'];
  const s2: Cell[][] = [header];
  for (const sec of sections) {
    for (const r of sec.rows) {
      s2.push([sec.category, r.scope, r.spec, r.qty, r.unit, r.unitPrice, r.subtotal]);
    }
  }
  s2.push(['', '', '', '', '', '표준가 합계 (보정 전)', rawTotal]);

  const ws2 = XLSX.utils.aoa_to_sheet(s2);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 26 }, { wch: 34 }, { wch: 8 }, { wch: 6 }, { wch: 18 }, { wch: 18 },
  ];
  // 데이터 행: 수량(idx 3)=QTY_FMT, 단가(idx 5)·공사비(idx 6)=WON_FMT. 헤더(문자열)는 자동 스킵.
  applyColumnFormat(ws2, 3, QTY_FMT);
  applyColumnFormat(ws2, 5, WON_FMT);
  applyColumnFormat(ws2, 6, WON_FMT);

  XLSX.utils.book_append_sheet(wb, ws2, '상세내역');

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
}

/** 시트 내 모든 숫자 셀에 통화 표시형식 적용 (요약 시트 — 숫자는 전부 금액). */
function applyMoneyFormatToAllNumbers(ws: XLSX.WorkSheet): void {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      if (cell && cell.t === 'n') cell.z = WON_FMT;
    }
  }
}

/** 특정 컬럼(c)의 숫자 셀에만 표시형식 적용 (상세내역 시트 — 컬럼별로 의미가 다름). */
function applyColumnFormat(ws: XLSX.WorkSheet, c: number, fmt: string): void {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
    if (cell && cell.t === 'n') cell.z = fmt;
  }
}

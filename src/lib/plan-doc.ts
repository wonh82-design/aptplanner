/**
 * 공사계획서 문서 모델 — 견적(Quote)을 "공종(category)별 섹션"으로 재구성.
 *
 * 핵심: 공종 분류를 결과 화면(`QuotePanel` → `totals.by_category`)과 100% 일치시킨다.
 *  - 둘 다 `calculator.categoryOf(lineItem)` 단일 함수로 카테고리를 결정.
 *  - 섹션 정렬도 결과 화면과 동일하게 공사비 내림차순.
 *
 * 각 공종 섹션은 그 공종의 라인(공사범위·스펙·수량·단가·공사비)과 공종 소계를 담는다.
 * (예: '창호' 섹션 = 거실·주방·침실 외창 범위 + 스펙 + 수량 + 창호 공사비 합계)
 *
 * 이 모듈은 isomorphic (브라우저/서버 공용) — pptx 같은 무거운 의존성을 import 하지 않는다.
 */
import type { Quote } from './types';
import { categoryOf } from './calculator';
import { labelOf } from './materials';

export type PlanRow = {
  /** 공사 범위 — 공간 + 세부공종 (예: "거실 · 마루", "전체 · 철거공사") */
  scope: string;
  /** 기준 자재 스펙 (installer_spec) */
  spec: string;
  qty: number;
  /** 단위 약어 (㎡/평/m/개/식) */
  unit: string;
  /** 단가 (부가세 별도) */
  unitPrice: number;
  /** 공사비 (부가세 별도) */
  subtotal: number;
};

export type PlanSection = {
  /** 공종 — 결과 화면 by_category 와 동일 라벨 (창호/에어컨/욕실/주방가구/마루/…) */
  category: string;
  rows: PlanRow[];
  /** 공종 공사비 합 (부가세 별도) */
  subtotal: number;
};

export type PlanDoc = {
  sections: PlanSection[];
  /** 항목 합계 (부가세 별도, 지역·연식 보정 전) — 섹션 소계의 합 */
  rawTotal: number;
};

/** unit_type → 한글 약어 */
function unitShort(u: string): string {
  switch (u) {
    case 'per_m2': return '㎡';
    case 'per_pyeong': return '평';
    case 'per_m': return 'm';
    case 'per_ea': return '개';
    case 'per_set': return '식';
    default: return '';
  }
}

/**
 * Quote → 공종별 섹션 배열.
 * 샷시(window)는 방별 베이폭 분할(단가=룩업총가×분할비율)이라 그대로 두면
 * "단가 1,100만 × 0.27식"처럼 오해되므로 '창호' 섹션 안에서 1줄(일식)로 통합한다.
 */
export function buildPlanDoc(quote: Quote): PlanDoc {
  const byCat = new Map<string, PlanRow[]>();
  const push = (cat: string, row: PlanRow) => {
    const arr = byCat.get(cat) ?? [];
    arr.push(row);
    byCat.set(cat, arr);
  };

  const windowLines = quote.line_items.filter((x) => x.work_type === 'window' && x.subtotal > 0);
  let windowDone = false;

  for (const it of quote.line_items) {
    if (it.subtotal <= 0) continue;
    const cat = categoryOf(it);

    if (it.work_type === 'window') {
      if (windowDone) continue;
      windowDone = true;
      const sum = windowLines.reduce((s, x) => s + x.subtotal, 0);
      const rooms = windowLines.map((x) => x.room).filter((r) => r && r !== '전체');
      push(cat, {
        scope: rooms.length ? `${rooms.join('·')} 외창 일체` : '외창 일체',
        spec: windowLines[0]?.material_label || '—',
        qty: 1,
        unit: '식',
        unitPrice: sum,
        subtotal: sum,
      });
      continue;
    }

    const base = labelOf(it.work_type);
    const scope = it.room && it.room !== '전체' ? `${it.room} · ${base}` : base;
    push(cat, {
      scope,
      spec: it.material_label || '—',
      qty: it.qty,
      unit: unitShort(it.unit_type),
      unitPrice: it.unit_price,
      subtotal: it.subtotal,
    });
  }

  const sections: PlanSection[] = [...byCat.entries()].map(([category, rows]) => ({
    category,
    rows,
    subtotal: rows.reduce((s, r) => s + r.subtotal, 0),
  }));
  // 결과 화면(by_category)과 동일: 공사비 내림차순
  sections.sort((a, b) => b.subtotal - a.subtotal);

  const rawTotal = sections.reduce((s, sec) => s + sec.subtotal, 0);
  return { sections, rawTotal };
}

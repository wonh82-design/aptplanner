/**
 * v5 엑셀 메인 시트(공사비산출) vs 웹 계산기 5가지 시나리오 검증.
 * 엑셀 입력값을 평형/등급별로 변경 후 LibreOffice 재계산한 결과를 사용.
 *
 * 실행: npx tsx scripts/verify-scenarios.ts
 */

import { buildQuote } from '../src/lib/calculator';
import type { Property, Scope, GradeSelection, Grade, RoomScope } from '../src/lib/types';

function makeRoom(opts: Partial<RoomScope> = {}): RoomScope {
  return { expansion_current: false, expansion_after: false, flooring: false, wallpaper: false, molding: false, aircon: false, closet: false, ceiling_fan: false, sash: false, ...opts };
}

/** v5 엑셀 baseline scope — 안방 외 모든 공간 확장 후=Y, 매트릭스 그대로 */
function v5Scope(): Scope {
  return {
    rooms: {
      '거실':    makeRoom({ expansion_after: true, flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, ceiling_fan: true }),
      '주방':    makeRoom({ expansion_after: true, flooring: true, wallpaper: true, molding: true, sash: true }),
      '안방':    makeRoom({ expansion_after: false, flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, closet: true, ceiling_fan: true }),
      '작은방1': makeRoom({ expansion_after: true, flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, closet: true }),
      '작은방2': makeRoom({ expansion_after: true, flooring: true, wallpaper: true, molding: true, sash: true, closet: true }),
      '작은방3': makeRoom(),
    },
    global: { demolition: true, insulation: true, heating_pipe: false, common_bath_set: true, master_bath_set: true, kitchen_set: true, middoor: true, entry_furniture: true, lighting: true, balcony_floor_tile: true, balcony_paint: true, electrical_base: true, switch_outlet: true, induction_line: true, plumbing_base: true, thermostat: true, silicon: true, expansion_report: true },
  };
}

function makeProperty(opts: Partial<Property> = {}): Property {
  return { pyeong: 30, bay: 3, rooms: 3, common_bath: 1, master_bath: 1, balcony_depth_m: 1.5, region: 'gyeonggi', age: '15-30', ...opts };
}

function makeGrade(g: Grade): GradeSelection { return { default: g, overrides: {}, material_overrides: {} }; }

type Scenario = {
  name: string;
  property: Property;
  grade: Grade;
  excel_grand_total: number;
};

// 엑셀 메인 시트(공사비산출)를 평형/등급별로 변경 후 LibreOffice 재계산한 실제 결과
const SCENARIOS: Scenario[] = [
  { name: '#1 · 30평 / 3베이 / 가성비 등급', property: makeProperty({ pyeong: 30 }), grade: '가성비', excel_grand_total: 48_813_607 },
  { name: '#2 · 30평 / 3베이 / 표준 등급 (v5 baseline)', property: makeProperty({ pyeong: 30 }), grade: '표준', excel_grand_total: 68_060_518 },
  { name: '#3 · 30평 / 3베이 / 고급 등급', property: makeProperty({ pyeong: 30 }), grade: '고급', excel_grand_total: 94_892_490 },
  { name: '#4 · 24평 / 3베이 / 표준 등급', property: makeProperty({ pyeong: 24 }), grade: '표준', excel_grand_total: 59_708_369 },
  { name: '#5 · 40평 / 3베이 / 표준 등급', property: makeProperty({ pyeong: 40 }), grade: '표준', excel_grand_total: 76_211_665 },
];

const KRW = (n: number) => n.toLocaleString('ko-KR') + '원';

console.log('━'.repeat(82));
console.log('apt-planner v5 엑셀(메인 시트) vs 웹 계산기 — 5가지 시나리오 검증');
console.log('━'.repeat(82));
console.log('공통 가정: 3베이, 안방 외 모든 공간 확장(Y), 욕실 2개, 주방 3.6m, 전체 샷시 ON');
console.log('지역=경기 (1.00×), 연식=15-30년 (1.00×) — 보정 계수 1.00 기준');
console.log();

const summary: Array<[string, number, number, number]> = [];

for (const s of SCENARIOS) {
  const quote = buildQuote(s.property, v5Scope(), makeGrade(s.grade));
  const web = quote.totals.grand_total_raw;
  const diff = web - s.excel_grand_total;
  const diff_pct = (diff / s.excel_grand_total) * 100;
  summary.push([s.name, s.excel_grand_total, web, diff_pct]);

  console.log(s.name);
  console.log(`  엑셀 메인:    ${KRW(s.excel_grand_total).padStart(20)}  · 평당 ${KRW(Math.round(s.excel_grand_total / s.property.pyeong))}`);
  console.log(`  웹 (보정 전): ${KRW(web).padStart(20)}  · 평당 ${KRW(Math.round(quote.totals.per_pyeong))}`);
  console.log(`  웹 (보정 후): ${KRW(quote.totals.grand_total).padStart(20)}  ±5% 범위: ${KRW(quote.totals.grand_total_low)} ~ ${KRW(quote.totals.grand_total_high)}`);
  console.log(`  차이:         ${((diff >= 0 ? '+' : '') + KRW(diff)).padStart(20)}  · ${diff_pct.toFixed(2)}%`);
  const absPct = Math.abs(diff_pct);
  const verdict = absPct < 1 ? '✓ 매우 정확 (<1%)' : absPct < 3 ? '✓ 정확 (<3%)' : absPct < 7 ? '○ 합리적 (<7%)' : absPct < 15 ? '△ 주의 (<15%)' : '✗ 큰 차이 (≥15%)';
  console.log(`  평가:         ${verdict}\n`);
}

console.log('━'.repeat(82));
console.log('요약 표');
console.log('━'.repeat(82));
console.log('시나리오                                  엑셀          웹           차이%');
console.log('─'.repeat(82));
for (const [name, exc, web, pct] of summary) {
  const n = name.padEnd(40, ' ').slice(0, 40);
  const e = KRW(exc).padStart(13);
  const w = KRW(web).padStart(13);
  const p = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  console.log(`${n}  ${e}  ${w}  ${p.padStart(7)}`);
}
console.log('━'.repeat(82));

/**
 * apt-planner 5가지 대표 시나리오 검증.
 *
 * 비교 기준: scripts/scenarios-fixture.json (frozen, 엑셀 v5 LibreOffice 재계산 결과)
 *
 * - 자재 단가/계산 로직을 변경하면 이 비교 결과가 변하는 게 정상.
 * - 변경이 의도적이라면 fixture의 excel_grand_total을 함께 업데이트.
 * - 의도하지 않은 변화면 regression. 코드 변경을 재검토할 것.
 *
 * 실행: npx tsx scripts/verify-scenarios.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildQuote } from '../src/lib/calculator';
import type { Property, Scope, GradeSelection, GradeGroup, RoomScope } from '../src/lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function makeRoom(opts: Partial<RoomScope> = {}): RoomScope {
  return { expansion_current: false, expansion_after: false, flooring: false, wallpaper: false, molding: false, aircon: false, closet: false, ceiling_fan: false, sash: false, ...opts };
}

/** v5 baseline scope — 안방 외 모든 공간 확장 후=Y, 매트릭스 전체 ON */
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
    global: { demolition: true, insulation: true, heating_pipe: false, common_bath_set: true, master_bath_set: true, kitchen_set: true, middoor: true, entry_furniture: true, lighting: true, balcony_floor_tile: true, balcony_paint: true, electrical_base: true, switch_outlet: true, induction_line: true, plumbing_base: true, thermostat: true, distribution_panel: true, plumbing_relocation: false, silicon: true, protection: true, consent: true, cleanup: true, expansion_report: true, act_permit: false, carpentry_base: true, carpentry_ceiling: true, partition_length: 0, no_molding: false, no_door_frame: false, no_baseboard: false },
  };
}

function makeGrade(g: GradeGroup): GradeSelection { return { default: g, overrides: {}, material_overrides: {} }; }

type FixtureScenario = {
  name: string;
  pyeong: number;
  grade: GradeGroup;
  excel_grand_total: number;
};
type Fixture = {
  common: {
    bay: 2 | 3 | 4 | 5;
    rooms: 2 | 3 | 4 | 5;
    common_bath: 1 | 2;
    master_bath: 0 | 1;
    balcony_depth_m: number;
    region: Property['region'];
    age: Property['age'];
    note: string;
  };
  scenarios: FixtureScenario[];
};

// fixture 로드
const fixturePath = path.join(__dirname, 'scenarios-fixture.json');
const fixture: Fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

type Scenario = {
  name: string;
  property: Property;
  grade: GradeGroup;
  excel_grand_total: number;
};

const SCENARIOS: Scenario[] = fixture.scenarios.map((s) => ({
  name: s.name,
  property: {
    pyeong: s.pyeong,
    bay: fixture.common.bay,
    rooms: fixture.common.rooms,
    common_bath: fixture.common.common_bath,
    master_bath: fixture.common.master_bath,
    balcony_depth_m: fixture.common.balcony_depth_m,
    region: fixture.common.region,
    age: fixture.common.age,
  },
  grade: s.grade,
  excel_grand_total: s.excel_grand_total,
}));

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

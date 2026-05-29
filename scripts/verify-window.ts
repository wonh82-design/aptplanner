/**
 * 샷시(window) 룩업 단가 검증.
 * 평형/베이/등급 조합별로 window 라인의 합계가 룩업 표 값과 일치하는지 확인.
 */
import { buildQuote } from '../src/lib/calculator';
import type { Property, Scope, GradeSelection, GradeGroup, RoomScope } from '../src/lib/types';

function makeRoom(opts: Partial<RoomScope> = {}): RoomScope {
  return {
    expansion_current: false, expansion_after: false,
    flooring: false, wallpaper: false, molding: false,
    aircon: false, closet: false, ceiling_fan: false, sash: false,
    ...opts,
  };
}

const scope: Scope = {
  rooms: {
    '거실':    makeRoom({ sash: true }),
    '주방':    makeRoom({ sash: true }),
    '안방':    makeRoom({ sash: true }),
    '작은방1': makeRoom({ sash: true }),
    '작은방2': makeRoom({ sash: true }),
    '작은방3': makeRoom({ sash: true }),
  },
  global: {
    demolition: false, insulation: false, heating_pipe: false,
    common_bath_set: false, master_bath_set: false, kitchen_set: false,
    middoor: false, entry_furniture: false, lighting: false,
    balcony_floor_tile: false, balcony_paint: false,
    electrical_base: false, switch_outlet: false, induction_line: false,
    plumbing_base: false, thermostat: false, distribution_panel: false,
    plumbing_relocation: false,
    silicon: false, protection: false, consent: false, cleanup: false,
    expansion_report: false, act_permit: false,
    carpentry_base: false, carpentry_ceiling: false,
    partition_length: 0, no_molding: false, no_door_frame: false, no_baseboard: false,
  },
};

function check(pyeong: number, bay: 2 | 3 | 4 | 5, rooms: 2 | 3 | 4, g: GradeGroup, expected: number) {
  const p: Property = {
    pyeong, bay, rooms,
    common_bath: 1, master_bath: 1,
    balcony_depth_m: 1.5, region: 'gyeonggi', age: '15-30',
  };
  const grade: GradeSelection = { default: g, overrides: {}, material_overrides: {} };
  const q = buildQuote(p, scope, grade);
  const win = q.line_items.filter((it) => it.work_type === 'window');
  const sum = win.reduce((s, i) => s + i.subtotal, 0);
  const ok = Math.abs(sum - expected) <= 2; // 반올림 오차 허용
  console.log(
    `${ok ? '✓' : '✗'} ${pyeong}평·${bay}베이·rooms=${rooms}·${g} → ${sum.toLocaleString()}원 ` +
    `(기대 ${expected.toLocaleString()}원, ${win.length}행)`,
  );
  if (!ok) process.exitCode = 1;
}

console.log('━'.repeat(72));
console.log('샷시 룩업 단가 검증 — 평형·베이·등급 별 합계');
console.log('━'.repeat(72));

// 20평대
check(22, 2, 2, '가성비', 8_000_000);
check(22, 2, 2, '표준',   8_500_000);
check(22, 2, 2, '고급',  11_000_000);
check(24, 3, 3, '가성비', 8_800_000);
check(24, 3, 3, '표준',   9_500_000);
check(24, 3, 3, '고급',  12_000_000);

// 30평대
check(30, 2, 3, '가성비', 9_000_000);
check(30, 2, 3, '표준',  10_200_000);
check(30, 2, 3, '고급',  14_000_000);
check(30, 3, 3, '가성비', 9_700_000);
check(30, 3, 3, '표준',  11_000_000);
check(30, 3, 3, '고급',  14_300_000);
check(34, 4, 3, '가성비', 9_700_000);
check(34, 4, 3, '표준',  11_000_000);

// 40평대
check(40, 3, 3, '가성비', 12_000_000);
check(40, 3, 3, '표준',   14_000_000);
check(40, 3, 3, '고급',   17_000_000);
check(45, 4, 4, '표준',   14_000_000);
check(45, 2, 3, '표준',   14_000_000);  // 40평대 2베이 폴백 → 3·4베이 단가

// 경계값
check(29, 3, 3, '표준',    9_500_000);   // 20평대 3베이
check(39, 3, 3, '표준',   11_000_000);   // 30평대 3·4베이
check(50, 4, 4, '고급',   17_000_000);   // 40평대

// 부분 sash (작은방 1개만 OFF)
const partialScope: Scope = {
  ...scope,
  rooms: { ...scope.rooms, '작은방2': makeRoom() },
};
{
  const p: Property = { pyeong: 30, bay: 3, rooms: 3, common_bath: 1, master_bath: 1, balcony_depth_m: 1.5, region: 'gyeonggi', age: '15-30' };
  const grade: GradeSelection = { default: '표준', overrides: {}, material_overrides: {} };
  const q = buildQuote(p, partialScope, grade);
  const win = q.line_items.filter((it) => it.work_type === 'window');
  const sum = win.reduce((s, i) => s + i.subtotal, 0);
  console.log(`\n부분 sash (작은방2 OFF) 30평·3베이·표준 → ${sum.toLocaleString()}원 (전체대비 ~${Math.round(sum/11_000_000*100)}%)`);
}

console.log('\n' + '━'.repeat(72));
if (process.exitCode) {
  console.log('❌ 일부 검증 실패');
} else {
  console.log('✓ 모든 룩업 케이스 통과');
}

/**
 * 방 개수 2/3/4 시뮬레이션 — UI 4룸 옵션 추가 후 회귀 검증.
 *
 * 같은 평형·동일 scope 에서 rooms 만 2→3→4 로 늘려가며
 * 공사비가 합리적으로 증가하는지 확인. (작은방3 추가 시 새로 발생해야 하는 항목:
 *  바닥재·도배·몰딩·붙박이장(있다면)·에어컨(있다면)·thermostat 의 방 수 +1 등)
 */
import { buildQuote } from '../src/lib/calculator';
import { activeRooms } from '../src/lib/areas';
import { defaultScope } from '../src/lib/defaults';
import type { Property, Scope, GradeSelection, GradeGroup, RoomScope, RoomId } from '../src/lib/types';

function makeRoom(opts: Partial<RoomScope> = {}): RoomScope {
  return {
    expansion_current: false,
    expansion_after: false,
    flooring: false,
    wallpaper: false,
    molding: false,
    aircon: false,
    closet: false,
    ceiling_fan: false,
    sash: false,
    ...opts,
  };
}

/**
 * 풀리모델 시나리오. 모든 활성 공간에 마감재(바닥·도배·몰딩·샷시) ON,
 * 침실에는 붙박이장, 거실+안방+작방1 에어컨, 거실+안방 실링팬.
 * 작은방3 까지 동일한 패턴으로 확장된다는 가정 — 룸 추가 시 비용 증가가 예상되어야 함.
 */
function buildScope(rooms: 2 | 3 | 4): Scope {
  const r: Scope['rooms'] = {
    '거실':    makeRoom({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, ceiling_fan: true }),
    '주방':    makeRoom({ flooring: true, wallpaper: true, molding: true, sash: true }),
    '안방':    makeRoom({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, closet: true, ceiling_fan: true }),
    '작은방1': makeRoom({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, closet: true }),
    '작은방2': makeRoom({ flooring: true, wallpaper: true, molding: true, sash: true, closet: true }),
    '작은방3': makeRoom(rooms >= 4
      ? { flooring: true, wallpaper: true, molding: true, sash: true, closet: true }
      : {}),
  };
  // rooms 가 2 라면 작은방2·3 의 scope 도 의미 없지만 activeRooms 로 자동 제외됨
  return {
    rooms: r,
    global: defaultScope().global,
  };
}

function makeProperty(rooms: 2 | 3 | 4): Property {
  return {
    pyeong: 40,        // 모든 룸 수가 자연스러운 중대형 평형
    bay: 3,
    rooms,
    common_bath: 1,
    master_bath: 1,
    balcony_depth_m: 1.5,
    region: 'gyeonggi',
    age: '15-30',
  };
}

const grade: GradeSelection = { default: '표준' as GradeGroup, overrides: {}, material_overrides: {} };

console.log('━'.repeat(82));
console.log('방 개수 시뮬레이션 — 평형 40, 베이 3, 표준 등급, 풀리모델 시나리오');
console.log('━'.repeat(82));

const totals: Record<number, number> = {};
const lineCounts: Record<number, number> = {};
const summaryRows: Array<{ rooms: number; total: number; lines: number; activeRooms: string[] }> = [];

for (const r of [2, 3, 4] as const) {
  const p = makeProperty(r);
  const scope = buildScope(r);
  const q = buildQuote(p, scope, grade);
  totals[r] = q.totals.grand_total_raw;
  lineCounts[r] = q.line_items.length;
  summaryRows.push({
    rooms: r,
    total: q.totals.grand_total_raw,
    lines: q.line_items.length,
    activeRooms: activeRooms(p),
  });

  console.log(`\n[ 방 ${r}개 — activeRooms = ${activeRooms(p).join(', ')} ]`);
  console.log(`  총 공사비 (부가세 별도): ${q.totals.grand_total_raw.toLocaleString()}원`);
  console.log(`  라인 수: ${q.line_items.length}`);
  // 카테고리별 합계
  const byCat = Object.entries(q.totals.by_category).sort(([, a], [, b]) => b - a);
  console.log('  카테고리별 합계:');
  for (const [c, v] of byCat) {
    console.log(`    ${c.padEnd(14)} ${Math.round(v).toLocaleString().padStart(13)}원`);
  }
}

console.log('\n' + '━'.repeat(82));
console.log('요약 — 룸 증가에 따른 총 공사비 변화');
console.log('━'.repeat(82));
console.log('방수  총공사비          라인수  증분(전 단계 대비)');
console.log('─'.repeat(82));
let prev: number | null = null;
for (const row of summaryRows) {
  const delta = prev !== null ? row.total - prev : 0;
  const deltaStr = prev !== null
    ? `+${delta.toLocaleString()}원 (${((delta / prev) * 100).toFixed(1)}%)`
    : '—';
  console.log(`${row.rooms}개   ${row.total.toLocaleString().padStart(14)}원   ${String(row.lines).padStart(3)}     ${deltaStr}`);
  prev = row.total;
}

// 정합성 검증
console.log('\n' + '━'.repeat(82));
console.log('검증');
console.log('━'.repeat(82));
const ok2to3 = totals[3] > totals[2];
const ok3to4 = totals[4] > totals[3];
const lineUp23 = lineCounts[3] > lineCounts[2];
const lineUp34 = lineCounts[4] > lineCounts[3];
console.log(`  방 2 → 3: 총공사비 증가 ${ok2to3 ? '✓' : '✗'} (Δ=${(totals[3] - totals[2]).toLocaleString()}원)`);
console.log(`  방 3 → 4: 총공사비 증가 ${ok3to4 ? '✓' : '✗'} (Δ=${(totals[4] - totals[3]).toLocaleString()}원)`);
console.log(`  방 2 → 3: 라인수 증가     ${lineUp23 ? '✓' : '✗'} (+${lineCounts[3] - lineCounts[2]})`);
console.log(`  방 3 → 4: 라인수 증가     ${lineUp34 ? '✓' : '✗'} (+${lineCounts[4] - lineCounts[3]})`);

// 마루 면적은 평형 기반 정규화 — 방 수와 무관해야 한다.
const floorByRooms: Record<number, number> = {};
for (const r of [2, 3, 4] as const) {
  const p = makeProperty(r);
  const scope = buildScope(r);
  const q = buildQuote(p, scope, grade);
  floorByRooms[r] = q.line_items
    .filter((it) => it.work_type === '마루')
    .reduce((s, it) => s + it.qty, 0);
}
const floorDelta23 = Math.abs(floorByRooms[3] - floorByRooms[2]);
const floorDelta34 = Math.abs(floorByRooms[4] - floorByRooms[3]);
const floorConstant = floorDelta23 < 0.5 && floorDelta34 < 0.5;
console.log(
  `  마루 면적 (㎡): 2개=${floorByRooms[2].toFixed(2)}, 3개=${floorByRooms[3].toFixed(2)}, 4개=${floorByRooms[4].toFixed(2)} ${
    floorConstant ? '✓ 방 수와 무관' : '✗ 보정 실패'
  }`,
);

if (!ok2to3 || !ok3to4 || !lineUp23 || !lineUp34 || !floorConstant) {
  console.error('\n❌ 검증 실패');
  process.exit(1);
}
console.log('\n✓ 모든 검증 통과');

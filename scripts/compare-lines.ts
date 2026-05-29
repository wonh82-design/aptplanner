/**
 * 30평 표준·24평 표준 케이스의 라인별 상세 출력 — 엑셀과 비교 분석용.
 */
import { buildQuote } from '../src/lib/calculator';
import type { Property, Scope, GradeSelection, GradeGroup, RoomScope } from '../src/lib/types';

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
    global: {
      demolition: true, insulation: true, heating_pipe: false,
      common_bath_set: true, master_bath_set: true, kitchen_set: true,
      middoor: true, entry_furniture: true, lighting: true,
      balcony_floor_tile: true, balcony_paint: true,
      electrical_base: true, switch_outlet: true, induction_line: true,
      plumbing_base: true, thermostat: true, distribution_panel: true, plumbing_relocation: false, silicon: true, protection: true, consent: true, cleanup: true,
      expansion_report: true, act_permit: false,
      carpentry_base: true, carpentry_ceiling: true, partition_length: 0,
      no_molding: false, no_door_frame: false, no_baseboard: false,
    },
  };
}

function makeProperty(pyeong: number): Property {
  return {
    pyeong, bay: 3, rooms: 3,
    common_bath: 1, master_bath: 1, balcony_depth_m: 1.5,
    region: 'gyeonggi', age: '15-30',
  };
}

function gr(g: GradeGroup): GradeSelection { return { default: g, overrides: {}, material_overrides: {} }; }

for (const [pyeong, grade] of [[30, '표준'], [24, '표준']] as [number, GradeGroup][]) {
  const q = buildQuote(makeProperty(pyeong), v5Scope(), gr(grade));
  console.log(`\n━━━ ${pyeong}평 / ${grade} 등급 ━━━`);
  console.log(`총: ${q.totals.grand_total_raw.toLocaleString()}원 (라인 ${q.line_items.length}개)\n`);
  // 카테고리별
  console.log('카테고리별:');
  const byCat = Object.entries(q.totals.by_category).sort(([, a], [, b]) => b - a);
  for (const [c, v] of byCat) console.log(`  ${c.padEnd(15)} ${Math.round(v).toLocaleString().padStart(15)}원`);
  console.log('\n라인 항목:');
  for (const it of q.line_items) {
    console.log(`  ${it.id.padStart(3)}. [${it.room.padEnd(8)}] ${it.category.padEnd(15)} ${it.qty.toFixed(2).padStart(7)} ${it.unit_type.padEnd(8)} × ${it.unit_price.toLocaleString().padStart(9)} = ${it.subtotal.toLocaleString().padStart(11)}`);
  }
}

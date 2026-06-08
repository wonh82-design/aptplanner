/**
 * 공사범위 변경 감사 — 공사비 산정의 무결성 검증.
 *
 * 검증 항목:
 *  A) 중복 산정: 같은 (work_type, room) 라인이 한 견적에 2번 이상 등장하는가
 *  B) 불필요 비용(누수): 모든 공사 OFF 일 때 라인이 0개인가 / 토글 OFF 시 해당 공종이 사라지는가
 *  C) 죽은 자재: 어떤 scope 로도 emit 되지 않는 sub_category (자재마스터 잉여 항목)
 *  D) 등급 커버리지: 요청 등급과 다른 등급 자재로 silent fallback 되는 공종
 *  E) 욕실 상호배타: booth/tub/both 타입별 본체·수전 emit 정합성
 *
 * 실행: npx tsx scripts/audit-scope.ts
 */
import { buildQuote, buildLineItems } from '../src/lib/calculator';
import { getPrimaryMaterial, getAllMaterials, labelOf } from '../src/lib/materials';
import { applyGradeFloor } from '../src/lib/types';
import type { Property, Scope, GradeSelection, GradeGroup, RoomScope, BathType } from '../src/lib/types';

const P = (over: Partial<Property> = {}): Property => ({
  pyeong: 32, bay: 3, rooms: 3, common_bath: 1, master_bath: 1,
  balcony_depth_m: 1.5, region: 'gyeonggi', age: '15-30', ...over,
});

const room = (o: Partial<RoomScope> = {}): RoomScope => ({
  expansion_current: false, expansion_after: false, flooring: false, wallpaper: false,
  molding: false, aircon: false, closet: false, ceiling_fan: false, sash: false, ...o,
});

const grade = (g: GradeGroup): GradeSelection => ({ default: g, overrides: {}, material_overrides: {} });

/** 모든 공간 모든 항목 ON */
const allRoomsOn = (o: Partial<RoomScope> = {}): Scope['rooms'] => ({
  '거실': room({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, ceiling_fan: true, expansion_current: true, expansion_after: true, ...o }),
  '주방': room({ flooring: true, wallpaper: true, molding: true, sash: true, expansion_current: true, expansion_after: true, ...o }),
  '안방': room({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, closet: true, ceiling_fan: true, ...o }),
  '작은방1': room({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, closet: true, expansion_current: true, expansion_after: true, ...o }),
  '작은방2': room({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, closet: true, expansion_current: true, expansion_after: true, ...o }),
  '작은방3': room({ ...o }),
});

const globalAllOn = (o: Partial<Scope['global']> = {}): Scope['global'] => ({
  demolition: true, insulation: true, heating_pipe: true,
  common_bath_set: true, master_bath_set: true, common_bath_type: 'booth', master_bath_type: 'booth',
  kitchen_set: true, middoor: true, entry_furniture: true, lighting: true,
  balcony_floor_tile: true, balcony_paint: true, electrical_base: true, switch_outlet: true,
  induction_line: true, plumbing_base: true, thermostat: true, distribution_panel: true,
  plumbing_relocation: true, silicon: true, protection: true, consent: true, cleanup: true,
  expansion_report: true, act_permit: true, carpentry_base: true, carpentry_ceiling: true,
  partition_length: 3, no_molding: false, no_door_frame: false, no_baseboard: false, ...o,
});

const fullScope = (g: Partial<Scope['global']> = {}, r: Partial<RoomScope> = {}): Scope => ({
  rooms: allRoomsOn(r), global: globalAllOn(g),
});

const KRW = (n: number) => n.toLocaleString('ko-KR');
let problems = 0;
const flag = (msg: string) => { problems++; console.log('  ✗ ' + msg); };
const ok = (msg: string) => console.log('  ✓ ' + msg);
const H = (t: string) => console.log('\n' + '━'.repeat(78) + '\n' + t + '\n' + '━'.repeat(78));

// ════════════════════════════════════════════════════════════════════════
H('A) 중복 산정 — 같은 (공종, 공간) 라인이 견적에 2번 이상 등장하는가');
// ════════════════════════════════════════════════════════════════════════
{
  const cases: Array<[string, Property, Scope]> = [
    ['24평 표준 풀스코프(booth)', P({ pyeong: 24 }), fullScope()],
    ['32평 풀스코프(tub)', P({ pyeong: 32 }), fullScope({ common_bath_type: 'tub', master_bath_type: 'tub' })],
    ['45평 풀스코프(both)', P({ pyeong: 45, rooms: 4 }), fullScope({ common_bath_type: 'both', master_bath_type: 'both' })],
    ['확장 시나리오(거실 신규확장)', P({ pyeong: 34 }),
      fullScope({}, {})],
  ];
  // 확장 케이스: 거실만 신규확장(current=false, after=true), 안방 미확장
  cases[3][2] = {
    rooms: {
      ...allRoomsOn(),
      '거실': room({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, ceiling_fan: true, expansion_current: false, expansion_after: true }),
      '안방': room({ flooring: true, wallpaper: true, molding: true, sash: true, aircon: true, closet: true, ceiling_fan: true, expansion_current: false, expansion_after: false }),
    },
    global: globalAllOn(),
  };

  for (const [name, prop, scope] of cases) {
    const q = buildQuote(prop, scope, grade('표준'));
    const seen = new Map<string, number>();
    for (const it of q.line_items) {
      const k = `${it.work_type}@@${it.room}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    const dups = [...seen.entries()].filter(([, c]) => c > 1);
    if (dups.length) {
      flag(`${name}: 중복 ${dups.map(([k, c]) => `${k}×${c}`).join(', ')}`);
    } else {
      ok(`${name}: 중복 없음 (${q.line_items.length}개 라인, 합계 ${KRW(q.totals.grand_total_raw)}원)`);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
H('B) 불필요 비용(누수) — OFF 인데 비용이 잡히는가');
// ════════════════════════════════════════════════════════════════════════
{
  // B-1. 전부 OFF → 라인 0개
  const allOff: Scope = {
    rooms: {
      '거실': room(), '주방': room(), '안방': room(),
      '작은방1': room(), '작은방2': room(), '작은방3': room(),
    },
    global: {
      demolition: false, insulation: false, heating_pipe: false,
      common_bath_set: false, master_bath_set: false, common_bath_type: 'booth', master_bath_type: 'booth',
      kitchen_set: false, middoor: false, entry_furniture: false, lighting: false,
      balcony_floor_tile: false, balcony_paint: false, electrical_base: false, switch_outlet: false,
      induction_line: false, plumbing_base: false, thermostat: false, distribution_panel: false,
      plumbing_relocation: false, silicon: false, protection: false, consent: false, cleanup: false,
      expansion_report: false, act_permit: false, carpentry_base: false, carpentry_ceiling: false,
      partition_length: 0, no_molding: false, no_door_frame: false, no_baseboard: false,
    },
  };
  const qOff = buildQuote(P(), allOff, grade('표준'));
  if (qOff.line_items.length === 0) ok('전부 OFF → 라인 0개 (누수 없음)');
  else flag(`전부 OFF 인데 ${qOff.line_items.length}개 라인 잔존: ${qOff.line_items.map(i => `${i.work_type}(${i.room})`).join(', ')}`);

  // B-2. 토글별 OFF 누수 — 각 글로벌 플래그가 통제하는 공종이 정확히 사라지는가
  const baseline = fullScope();
  const baseWts = new Set(buildLineItems(P(), baseline, grade('표준')).map(i => i.work_type));
  const expectVanish: Record<string, string[]> = {
    demolition: ['base_work'],
    insulation: ['insulation'],
    kitchen_set: ['kitchen_furniture', 'kitchen_top', 'kitchen_midway', 'kitchen_hardware', 'kitchen_hood', 'kitchen_sink'],
    middoor: ['sliding_door'],
    entry_furniture: ['general_furniture'],
    lighting: ['lighting_downlight', 'lighting_indirect_living', 'lighting_magnetic_living', 'lighting_magnetic_kitchen', 'lighting_indirect_bath'],
    balcony_floor_tile: ['balcony_floor_tile'],
    balcony_paint: ['balcony_paint'],
    electrical_base: ['electrical_base'],
    switch_outlet: ['electrical_switch'],
    induction_line: ['induction_line'],
    plumbing_base: ['plumbing_base'],
    thermostat: ['thermostat'],
    distribution_panel: ['distribution_panel'],
    plumbing_relocation: ['plumbing_relocation'],
    heating_pipe: ['plumbing_heating'],
    silicon: ['silicon_labor'],
    protection: ['protection'],
    consent: ['consent'],
    cleanup: ['cleanup'],
    act_permit: ['act_permit'],
    carpentry_base: ['carpentry_base'],
    carpentry_ceiling: ['carpentry_ceiling'],
    common_bath_set: [], // 부부욕실이 남으므로 부분 — 별도 처리
  };
  for (const [flagKey, wts] of Object.entries(expectVanish)) {
    if (flagKey === 'common_bath_set') continue;
    const off = fullScope({ [flagKey]: false } as Partial<Scope['global']>);
    const offWts = new Set(buildLineItems(P(), off, grade('표준')).map(i => i.work_type));
    const stillThere = wts.filter(w => offWts.has(w));
    const leaked = [...offWts].filter(w => !baseWts.has(w)); // OFF 했더니 새 공종 등장?
    if (stillThere.length) flag(`global.${flagKey}=false 인데 잔존: ${stillThere.join(', ')}`);
    else if (leaked.length) flag(`global.${flagKey}=false 인데 새 공종 누수: ${leaked.join(', ')}`);
    else ok(`global.${flagKey}=false → ${wts.length ? wts.join(', ') : '(공종 없음)'} 정상 제거`);
  }

  // B-3. 무몰딩/무걸레받이 — 상호배타 확인 (둘 다 잡히면 중복)
  const noMold = fullScope({ no_molding: true });
  const nmWts = new Set(buildLineItems(P(), noMold, grade('표준')).map(i => i.work_type));
  if (nmWts.has('molding')) flag('no_molding=true 인데 molding 도 함께 emit (중복 마감)');
  else if (nmWts.has('molding_carpentry') && nmWts.has('molding_wallpaper')) ok('no_molding=true → molding 제거 + 목공/도배 마감 대체 (정상)');
  else flag('no_molding=true 인데 대체 마감(molding_carpentry/wallpaper) 누락');

  const noBase = fullScope({ no_baseboard: true });
  const nbWts = new Set(buildLineItems(P(), noBase, grade('표준')).map(i => i.work_type));
  if (nbWts.has('baseboard')) flag('no_baseboard=true 인데 baseboard 도 함께 emit (중복)');
  else if (nbWts.has('baseboard_carpentry') && nbWts.has('baseboard_wallpaper')) ok('no_baseboard=true → baseboard 제거 + 대체 마감 (정상)');
  else flag('no_baseboard=true 인데 대체 마감 누락');

  // B-4. 욕실 OFF — 공용만 끄면 공용 라인만 사라지고 부부는 유지
  const commonOff = fullScope({ common_bath_set: false });
  const li = buildLineItems(P(), commonOff, grade('표준'));
  const commonBathLines = li.filter(i => i.room === '공용욕실');
  const masterBathLines = li.filter(i => i.room === '부부욕실');
  if (commonBathLines.length === 0 && masterBathLines.length > 0) ok('common_bath_set=false → 공용욕실 라인만 제거, 부부욕실 유지 (정상)');
  else flag(`욕실 분리 OFF 이상: 공용 ${commonBathLines.length}개 / 부부 ${masterBathLines.length}개`);
}

// ════════════════════════════════════════════════════════════════════════
H('E) 욕실 상호배타 — booth/tub/both 타입별 본체·수전');
// ════════════════════════════════════════════════════════════════════════
{
  const check = (bt: BathType, mustHave: string[], mustNot: string[]) => {
    const sc = fullScope({ common_bath_type: bt, master_bath_type: bt });
    const li = buildLineItems(P({ pyeong: 45 }), sc, grade('표준')).filter(i => i.room === '공용욕실');
    const wts = new Set(li.map(i => i.work_type));
    const missing = mustHave.filter(w => !wts.has(w));
    const present = mustNot.filter(w => wts.has(w));
    if (missing.length) flag(`욕실 ${bt}: 누락 ${missing.join(', ')}`);
    else if (present.length) flag(`욕실 ${bt}: 있으면 안 되는데 emit ${present.join(', ')}`);
    else ok(`욕실 ${bt}: 본체·수전 정합 (세면기 수전 항상 포함 확인: ${wts.has('bath_faucet') ? 'O' : 'X'})`);
  };
  check('booth', ['bath_partition', 'bath_shower_faucet', 'bath_faucet'], ['bath_bathtub', 'bath_bathtub_faucet']);
  check('tub', ['bath_bathtub', 'bath_bathtub_faucet', 'bath_faucet'], ['bath_partition', 'bath_shower_faucet']);
  check('both', ['bath_partition', 'bath_shower_faucet', 'bath_bathtub', 'bath_bathtub_faucet', 'bath_faucet'], []);
}

// ════════════════════════════════════════════════════════════════════════
H('C) 죽은 자재 — 어떤 scope 로도 emit 되지 않는 sub_category');
// ════════════════════════════════════════════════════════════════════════
{
  // 가능한 모든 공종을 emit 하는 scope 들의 합집합
  const emitted = new Set<string>();
  const scopes: Array<[Property, Scope]> = [
    [P({ pyeong: 45, rooms: 4 }), fullScope({ common_bath_type: 'both', master_bath_type: 'both' })],
    [P({ pyeong: 32 }), fullScope({ no_molding: true, no_baseboard: true, no_door_frame: true })],
    [P({ pyeong: 34 }), {
      rooms: { ...allRoomsOn(),
        '거실': room({ flooring: true, wallpaper: true, molding: true, sash: true, expansion_current: false, expansion_after: true }),
        '안방': room({ flooring: true, wallpaper: true, sash: true, expansion_current: false, expansion_after: false }) },
      global: globalAllOn(),
    }],
  ];
  for (const [prop, sc] of scopes) {
    for (const g of ['가성비', '표준', '고급'] as GradeGroup[]) {
      for (const it of buildLineItems(prop, sc, grade(g))) emitted.add(it.work_type);
    }
  }

  const allSubs = new Set(getAllMaterials().map(m => m.sub_category));
  // door_no_frame 은 자재 없이 하드코딩 → 자재 sub_category 집합엔 없음 (정상)
  const dead = [...allSubs].filter(s => !emitted.has(s)).sort();
  const matsBySub = new Map<string, number>();
  for (const m of getAllMaterials()) matsBySub.set(m.sub_category, (matsBySub.get(m.sub_category) ?? 0) + 1);

  console.log(`  emit 되는 공종: ${emitted.size}종 / 자재 sub_category: ${allSubs.size}종`);
  if (dead.length === 0) ok('죽은 자재 없음 — 모든 sub_category 가 견적에 반영됨');
  else {
    console.log(`  ⚠ 어떤 scope 로도 견적에 안 잡히는 sub_category ${dead.length}종 (잉여 의심):`);
    for (const s of dead) console.log(`     · ${s.padEnd(22)} (${matsBySub.get(s)}개 자재, 라벨 "${labelOf(s)}")`);
    problems++; // 경고로 카운트
  }
}

// ════════════════════════════════════════════════════════════════════════
H('D) 등급 커버리지 — 요청 등급과 다른 등급으로 silent fallback 되는 공종');
// ════════════════════════════════════════════════════════════════════════
{
  // 풀스코프에서 emit 되는 work_type 들에 대해, 각 등급 요청 시 floor 적용 후
  // 실제 선택된 자재의 등급그룹이 요청(=floor 후)과 같은지 확인.
  const emitted = new Set<string>();
  for (const it of buildLineItems(P({ pyeong: 45, rooms: 4 }), fullScope({ common_bath_type: 'both', master_bath_type: 'both' }), grade('표준'))) {
    emitted.add(it.work_type);
  }
  const gradeGroupOfMat = (pg: string): GradeGroup =>
    pg.startsWith('가성비') ? '가성비' : pg.startsWith('표준') ? '표준' : pg.startsWith('고급') ? '고급' : '단일등급';

  let fallbacks = 0;
  for (const wt of [...emitted].sort()) {
    if (wt === 'window' || wt === 'door_no_frame') continue; // window=룩업, door_no_frame=하드코딩
    for (const g of ['가성비', '표준', '고급'] as GradeGroup[]) {
      const resolved = applyGradeFloor(wt, g);
      const mat = getPrimaryMaterial(wt, resolved);
      if (!mat) { flag(`${wt} (${labelOf(wt)}): ${g} 요청 시 자재 없음(null)`); fallbacks++; continue; }
      const got = gradeGroupOfMat(mat.primary_grade);
      if (got !== resolved && got !== '단일등급') {
        console.log(`  · ${wt.padEnd(22)} ${labelOf(wt).padEnd(12)} ${g} 요청(floor→${resolved}) → 실제 ${got} 자재 사용 (${mat.material_id})`);
        fallbacks++;
      }
    }
  }
  if (fallbacks === 0) ok('모든 공종이 요청 등급(또는 floor 적용 등급)에 맞는 자재 보유');
  else { console.log(`  ⚠ 등급 불일치 fallback ${fallbacks}건 (위 목록) — 의도된 floor 면 무시 가능`); problems++; }
}

// ════════════════════════════════════════════════════════════════════════
H(`감사 종료 — 문제/경고 ${problems}건`);
// ════════════════════════════════════════════════════════════════════════

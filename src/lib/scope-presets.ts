/**
 * 공사 범위 프리셋 — 가장 자주 발생하는 시나리오.
 *
 * "올수리" 정의: 바닥/도배/몰딩 (전 공간) + 욕실 풀세트 + 주방 + 중문/신발장
 *                + 조명 + 전기·설비 + 발코니 정리 + 마감 디테일까지 일체.
 * 차이점: 샷시 교체 여부 / 철거 범위.
 *
 * ⚠️ 발코니 확장 관련 필드(expansion_current, expansion_after, expansion_report)는
 *    프리셋에서 절대 건드리지 않는다. 우리집 현황의 '발코니 확장 현황'에서만 변경 가능.
 */
import type { Property, RoomScope, Scope, RoomId, GradeGroup, DemolitionScope } from './types';
import { activeRooms } from './areas';

type Preset = {
  id: string;
  label: string;
  desc: string;
  /**
   * 이 프리셋과 1:1로 연동되는 철거 범위.
   * 프리셋 적용 시 scope.global.demolition_scope 로 설정되고,
   * 역으로 철거 범위를 바꾸면 일치하는 프리셋이 강조된다.
   *  - 철거 최소화        → 'partial'(부분철거)
   *  - 전체 철거 + 올수리 → 'basic'(기본철거)
   *  - 전체 철거 + 샷시   → 'full'(올철거)
   */
  demolitionScope: DemolitionScope;
  /** 현재 scope를 받아 확장 관련 필드는 보존, 나머지만 교체 */
  apply(p: Property, current: Scope): Scope;
  /**
   * 프리셋 적용 시 함께 설정할 work_type → 등급 그룹 매핑.
   * MaterialOverrides.applyScopePreset 에서 value.overrides 에 머지.
   */
  gradeOverrides?: Record<string, GradeGroup>;
};

function makeRoomScope(opts: Partial<RoomScope> = {}): RoomScope {
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

/** 올수리 공통: 모든 공간 바닥/도배/몰딩 ON + 등급 표준 배치. 확장 필드는 건드리지 않음. */
function fullRenovateRoom(roomId: RoomId, opts: { sash: boolean } = { sash: false }): RoomScope {
  const base = makeRoomScope({
    flooring: true,
    wallpaper: true,
    molding: true,
    sash: opts.sash,
  });
  if (roomId === '거실')    return { ...base, aircon: true, ceiling_fan: true };
  if (roomId === '주방')    return { ...base };
  if (roomId === '안방')    return { ...base, aircon: true, closet: true, ceiling_fan: true };
  if (roomId === '작은방1') return { ...base, aircon: true, closet: true };
  if (roomId === '작은방2') return { ...base, closet: true };
  if (roomId === '작은방3') return { ...base, closet: true };
  return base;
}

/**
 * 공간별 scope 맵 생성기.
 * 확장 필드(expansion_current, expansion_after)는 무조건 기존 값 유지.
 */
function makeRoomMap(
  p: Property,
  current: Scope,
  factory: (roomId: RoomId) => RoomScope,
): Scope['rooms'] {
  const visible = activeRooms(p) as RoomId[];
  const all: RoomId[] = ['거실', '주방', '안방', '작은방1', '작은방2', '작은방3'];
  const map: Partial<Record<RoomId, RoomScope>> = {};
  for (const r of all) {
    const cur = current.rooms[r];
    const preserved = {
      expansion_current: cur?.expansion_current ?? false,
      expansion_after:   cur?.expansion_after   ?? false,
    };
    if (visible.includes(r)) {
      map[r] = { ...factory(r), ...preserved };
    } else {
      map[r] = makeRoomScope(preserved);
    }
  }
  return map as Scope['rooms'];
}

/** 현재 확장 시공 계획이 하나라도 있으면 신고 ON (그 외에는 기존 값 유지) */
function needsExpansionReport(current: Scope): boolean {
  return Object.values(current.rooms).some(
    rs => !!rs && rs.expansion_after && !rs.expansion_current,
  );
}

/** 올수리 글로벌 풀세트 — expansion_report는 현재 방 상태로부터 도출 */
function fullRenovateGlobal(current: Scope): Scope['global'] {
  return {
    demolition: true,
    insulation: true,
    heating_pipe: false,           // 노후 의심 시 별도 추가
    common_bath_set: true,
    master_bath_set: true,
    kitchen_set: true,
    middoor: true,
    entry_furniture: true,
    lighting: true,
    balcony_floor_tile: true,
    balcony_paint: true,
    electrical_base: true,
    switch_outlet: true,
    induction_line: true,
    plumbing_base: true,
    thermostat: true,
    distribution_panel: true,    // 기본 포함
    plumbing_relocation: false,  // 옵션 (사용자 선택)
    silicon: true,
    protection: true,
    consent: true,
    cleanup: true,
    expansion_report: needsExpansionReport(current),
    act_permit: false,  // 행위허가는 구조변경 시 사용자 명시 선택
    // 목공사 — 올리모델링이므로 기본·천정 ON
    carpentry_base: true,
    carpentry_ceiling: true,
    partition_length: 0,
    no_molding: false,
    no_door_frame: false,
    no_baseboard: false,
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'finish-only',
    label: '철거 최소화 + 마감재만 교체',
    desc: '철거·전기·설비·조명·목공 기본 포함, 도배·마루·주방·욕실 새로',
    // 철거 최소화 = 부분철거(마감재 위주, 기준의 85%)
    demolitionScope: 'partial',
    apply(p, current) {
      return {
        rooms: makeRoomMap(p, current, () => makeRoomScope({
          // 마감재만: 마루(바닥재) + 도배. 몰딩·외창·에어컨·붙박이장·실링팬 X
          flooring: true,
          wallpaper: true,
        })),
        global: {
          demolition: true,         // 철거공사 기본 포함
          insulation: false,        // 단열 보강은 미포함 (옵션)
          heating_pipe: false,
          common_bath_set: true,    // 욕실공사
          master_bath_set: true,
          kitchen_set: true,        // 주방가구
          middoor: false,
          entry_furniture: false,
          lighting: true,           // 조명공사 기본 포함
          balcony_floor_tile: false,
          balcony_paint: false,
          electrical_base: true,    // 전기공사 기본 포함
          switch_outlet: false,     // 스위치/콘센트는 옵션
          induction_line: false,
          plumbing_base: true,      // 설비공사 기본 포함
          thermostat: false,
          distribution_panel: true, // 분배기 기본 포함
          plumbing_relocation: false, // 옵션
          protection: true,
          consent: true,
          cleanup: true,
          silicon: true,            // 마감 디테일은 일반적으로 포함
          expansion_report: needsExpansionReport(current),
          act_permit: false,
          // 목공사 — 기본 목공 포함 (문틀·문선·기본 보강). 천정 목공은 옵션
          carpentry_base: true,
          carpentry_ceiling: false,
          partition_length: 0,
          no_molding: false,
          no_door_frame: false,
          no_baseboard: false,
        },
      };
    },
  },
  {
    id: 'full-only',
    label: '전체 철거 + 올수리',
    desc: '샷시 없이 내부만 새로',
    // 전체 철거 + 올수리 = 기본철거(욕실·문틀 포함, 기준)
    demolitionScope: 'basic',
    apply(p, current) {
      return {
        rooms: makeRoomMap(p, current, (room) => fullRenovateRoom(room, { sash: false })),
        global: fullRenovateGlobal(current),
      };
    },
  },
  {
    id: 'full-sash',
    label: '전체 철거 + 샷시 + 올수리',
    desc: '내부 전체 새로 + 외창 교체',
    // 전체 철거 + 샷시 = 올철거(샷시까지 완전철거, 기준의 120%)
    demolitionScope: 'full',
    apply(p, current) {
      return {
        rooms: makeRoomMap(p, current, (room) => fullRenovateRoom(room, { sash: true })),
        global: fullRenovateGlobal(current),
      };
    },
  },
];

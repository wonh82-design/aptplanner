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
import type { Property, RoomScope, Scope, RoomId } from './types';
import { activeRooms } from './areas';

type Preset = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  /** 현재 scope를 받아 확장 관련 필드는 보존, 나머지만 교체 */
  apply(p: Property, current: Scope): Scope;
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
    silicon: true,
    expansion_report: needsExpansionReport(current),
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'full-sash',
    icon: '🪟',
    label: '전체 철거 + 샷시 + 올수리',
    desc: '내부 전체 새로 + 외창 교체',
    apply(p, current) {
      return {
        rooms: makeRoomMap(p, current, (room) => fullRenovateRoom(room, { sash: true })),
        global: fullRenovateGlobal(current),
      };
    },
  },
  {
    id: 'full-only',
    icon: '🧰',
    label: '전체 철거 + 올수리',
    desc: '샷시 없이 내부만 새로',
    apply(p, current) {
      return {
        rooms: makeRoomMap(p, current, (room) => fullRenovateRoom(room, { sash: false })),
        global: fullRenovateGlobal(current),
      };
    },
  },
  {
    id: 'finish-only',
    icon: '🎨',
    label: '철거 최소화 + 마감재만 교체',
    desc: '전기·설비·조명 그대로, 도배·마루·주방·욕실만',
    apply(p, current) {
      return {
        rooms: makeRoomMap(p, current, () => makeRoomScope({
          // 마감재만: 마루(바닥재) + 도배. 몰딩·외창·에어컨·붙박이장·실링팬 X
          flooring: true,
          wallpaper: true,
        })),
        global: {
          demolition: false,        // 철거 최소화
          insulation: false,
          heating_pipe: false,
          common_bath_set: true,    // 욕실공사
          master_bath_set: true,
          kitchen_set: true,        // 주방가구
          middoor: false,
          entry_furniture: false,
          lighting: false,          // 조명 그대로
          balcony_floor_tile: false,
          balcony_paint: false,
          electrical_base: false,   // 전기 그대로
          switch_outlet: false,
          induction_line: false,
          plumbing_base: false,     // 설비 그대로
          thermostat: false,
          silicon: true,            // 마감 디테일은 일반적으로 포함
          expansion_report: needsExpansionReport(current),
        },
      };
    },
  },
];

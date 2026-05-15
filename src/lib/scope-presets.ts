/**
 * 공사 범위 프리셋 — 가장 자주 발생하는 3가지 시나리오.
 *
 * "올수리" 정의: 바닥/도배/몰딩 (전 공간) + 욕실 풀세트 + 주방 + 중문/신발장
 *                + 조명 + 전기·설비 + 발코니 정리 + 마감 디테일까지 일체.
 * 차이점: 1) 확장 여부  2) 샷시 교체 여부
 */
import type { Property, RoomScope, Scope, RoomId } from './types';
import { activeRooms } from './areas';

type Preset = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  apply(p: Property): Scope;
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

/** 올수리 공통: 모든 공간 바닥/도배/몰딩 ON + 등급 표준 배치 */
function fullRenovateRoom(roomId: RoomId, opts: { sash: boolean; expand: boolean } = { sash: false, expand: false }): RoomScope {
  const base = makeRoomScope({
    flooring: true,
    wallpaper: true,
    molding: true,
    sash: opts.sash,
    expansion_after: opts.expand,
  });
  if (roomId === '거실')    return { ...base, aircon: true, ceiling_fan: true };
  if (roomId === '주방')    return { ...base };
  if (roomId === '안방')    return { ...base, aircon: true, closet: true, ceiling_fan: true };
  if (roomId === '작은방1') return { ...base, aircon: true, closet: true };
  if (roomId === '작은방2') return { ...base, closet: true };
  return base;
}

function makeRoomMap(p: Property, factory: (roomId: RoomId) => RoomScope): Scope['rooms'] {
  const visible = activeRooms(p) as RoomId[];
  const all: RoomId[] = ['거실', '주방', '안방', '작은방1', '작은방2'];
  const map: Partial<Record<RoomId, RoomScope>> = {};
  for (const r of all) {
    map[r] = visible.includes(r) ? factory(r) : makeRoomScope();
  }
  return map as Scope['rooms'];
}

/** 올수리 글로벌 토글 풀세트 */
function fullRenovateGlobal(opts: { expand: boolean }): Scope['global'] {
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
    thermostat: true,
    silicon: true,
    expansion_report: opts.expand, // 확장 시에만 신고
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'full-expand-sash',
    icon: '🏗️',
    label: '전체 철거 + 전체 확장 + 샷시 + 올수리',
    desc: '가장 큰 공사 — 발코니 모두 확장 + 외창 교체',
    apply(p) {
      return {
        rooms: makeRoomMap(p, (room) => {
          // 안방까지 포함 모든 공간 확장+샷시 ON
          return fullRenovateRoom(room, { sash: true, expand: true });
        }),
        global: fullRenovateGlobal({ expand: true }),
      };
    },
  },
  {
    id: 'full-sash',
    icon: '🪟',
    label: '전체 철거 + 샷시 + 올수리',
    desc: '확장은 없지만 외창은 모두 새로',
    apply(p) {
      return {
        rooms: makeRoomMap(p, (room) => fullRenovateRoom(room, { sash: true, expand: false })),
        global: fullRenovateGlobal({ expand: false }),
      };
    },
  },
  {
    id: 'full-only',
    icon: '🧰',
    label: '전체 철거 + 올수리',
    desc: '확장·샷시 없이 내부만 새로',
    apply(p) {
      return {
        rooms: makeRoomMap(p, (room) => fullRenovateRoom(room, { sash: false, expand: false })),
        global: fullRenovateGlobal({ expand: false }),
      };
    },
  },
];

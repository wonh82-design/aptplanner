/**
 * 공사 범위 프리셋 — 대표 시나리오를 한 번에 설정.
 * UX: 초보자가 가장 흔한 케이스 5개 중 골라 시작 → 세부 조정.
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

function emptyGlobal(): Scope['global'] {
  return {
    demolition: false,
    insulation: false,
    heating_pipe: false,
    common_bath_set: false,
    master_bath_set: false,
    kitchen_set: false,
    middoor: false,
    entry_furniture: false,
    lighting: false,
    balcony_floor_tile: false,
    balcony_paint: false,
    electrical_base: false,
    switch_outlet: false,
    induction_line: false,
    thermostat: false,
    silicon: false,
    expansion_report: false,
  };
}

function makeRoomMap(p: Property, factory: (roomId: RoomId) => RoomScope): Scope['rooms'] {
  const rooms = activeRooms(p) as RoomId[];
  // 항상 5개 키를 갖도록 (활성 외 공간은 empty)
  const all: RoomId[] = ['거실', '주방', '안방', '작은방1', '작은방2'];
  const map: Partial<Record<RoomId, RoomScope>> = {};
  for (const r of all) {
    map[r] = rooms.includes(r) ? factory(r) : makeRoomScope();
  }
  return map as Scope['rooms'];
}

export const PRESETS: Preset[] = [
  {
    id: 'full',
    icon: '🏠',
    label: '풀 리모델링',
    desc: '집 전체 — 가장 일반적',
    apply(p) {
      return {
        rooms: makeRoomMap(p, (room) => {
          const base = makeRoomScope({
            flooring: true, wallpaper: true, molding: true, sash: true,
          });
          if (room === '거실') return { ...base, expansion_after: true, aircon: true, ceiling_fan: true };
          if (room === '주방') return { ...base, expansion_after: true };
          if (room === '안방') return { ...base, aircon: true, closet: true, ceiling_fan: true };
          if (room === '작은방1') return { ...base, expansion_after: true, aircon: true, closet: true };
          if (room === '작은방2') return { ...base, expansion_after: true, closet: true };
          return base;
        }),
        global: {
          ...emptyGlobal(),
          demolition: true, insulation: true,
          common_bath_set: true, master_bath_set: true,
          kitchen_set: true, middoor: true, entry_furniture: true,
          lighting: true,
          balcony_floor_tile: true, balcony_paint: true,
          electrical_base: true, switch_outlet: true,
          induction_line: true, thermostat: true,
          silicon: true, expansion_report: true,
        },
      };
    },
  },
  {
    id: 'bath',
    icon: '🛁',
    label: '욕실만',
    desc: '욕실 풀세트 + 기본 정비',
    apply(p) {
      return {
        rooms: makeRoomMap(p, () => makeRoomScope()),
        global: {
          ...emptyGlobal(),
          common_bath_set: true, master_bath_set: true,
          electrical_base: true,
          silicon: true,
        },
      };
    },
  },
  {
    id: 'kitchen',
    icon: '🍳',
    label: '주방만',
    desc: '주방가구 + 인덕션 전용선',
    apply(p) {
      return {
        rooms: makeRoomMap(p, (room) =>
          room === '주방' ? makeRoomScope({ flooring: true, wallpaper: true }) : makeRoomScope()
        ),
        global: {
          ...emptyGlobal(),
          kitchen_set: true, induction_line: true,
          electrical_base: true, silicon: true,
        },
      };
    },
  },
  {
    id: 'wallfloor',
    icon: '🎨',
    label: '도배·바닥 새단장',
    desc: '벽지·바닥만 깔끔하게',
    apply(p) {
      return {
        rooms: makeRoomMap(p, () =>
          makeRoomScope({ flooring: true, wallpaper: true, molding: true })
        ),
        global: {
          ...emptyGlobal(),
          lighting: true,
          electrical_base: true, switch_outlet: true,
          silicon: true,
        },
      };
    },
  },
  {
    id: 'clear',
    icon: '🧹',
    label: '전체 해제',
    desc: '처음부터 직접 선택',
    apply(p) {
      return {
        rooms: makeRoomMap(p, () => makeRoomScope()),
        global: emptyGlobal(),
      };
    },
  },
];

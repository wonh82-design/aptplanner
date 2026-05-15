/** 기본 입력값 — 30평/3베이/3룸 케이스 */
import type { Property, Scope, GradeSelection, RoomId } from './types';

export function defaultProperty(): Property {
  return {
    pyeong: 30,
    bay: 3,
    rooms: 3,
    common_bath: 1,
    master_bath: 1,
    balcony_depth_m: 1.5,
  };
}

/** 공사범위 시트의 매트릭스를 기본값으로 */
export function defaultRoomScope(roomId: RoomId): Scope['rooms'][RoomId] {
  const base = {
    expansion_current: false,
    expansion_after: false,
    flooring: true,
    wallpaper: true,
    molding: true,
    aircon: false,
    closet: false,
    ceiling_fan: false,
    sash: true,
  };
  // v4 '우리집' 시트 기본값: 안방 외 모든 공간 '확장 후=Y'
  switch (roomId) {
    case '거실':
      return { ...base, expansion_after: true, aircon: true, ceiling_fan: true };
    case '주방':
      return { ...base, expansion_after: true };
    case '안방':
      return { ...base, expansion_after: false, aircon: true, closet: true, ceiling_fan: true };
    case '작은방1':
      return { ...base, expansion_after: true, aircon: true, closet: true };
    case '작은방2':
      return { ...base, expansion_after: true, aircon: true, closet: true };
    default:
      return base;
  }
}

export function defaultScope(): Scope {
  return {
    rooms: {
      '거실': defaultRoomScope('거실'),
      '주방': defaultRoomScope('주방'),
      '안방': defaultRoomScope('안방'),
      '작은방1': defaultRoomScope('작은방1'),
      '작은방2': defaultRoomScope('작은방2'),
    },
    global: {
      demolition: true,
      insulation: true,
      heating_pipe: false,
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
      expansion_report: true,
    },
  };
}

export function defaultGrade(): GradeSelection {
  return { default: '표준', overrides: {}, material_overrides: {} };
}

/** 기본 입력값 — 평형은 0(미입력)으로 시작, 나머지는 일반적인 30평대 3베이 케이스 */
import type { Property, Scope, GradeSelection, RoomId } from './types';

export function defaultProperty(): Property {
  return {
    pyeong: 0,              // 사용자가 직접 입력하도록 placeholder만 표시
    bay: 3,
    rooms: 3,
    common_bath: 1,
    master_bath: 1,
    balcony_depth_m: 1.5,
    region: 'gyeonggi',  // 보정 1.0× 기준
    age: '15-30',        // 보정 1.0× 기준
  };
}

/**
 * 공사범위 시트의 매트릭스를 기본값으로.
 *
 * 발코니 확장 디폴트 정책 (일반적인 한국 아파트 기준):
 *  - 안방 제외 모든 방: 이미 확장됨 (expansion_current=true, expansion_after=true)
 *  - 안방: 발코니 그대로 (expansion_current=false, expansion_after=false)
 *  → 결과적으로 "신규 확장 시공" 0개 → 확장공사 카드 비활성화 시작
 */
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
  // 안방 외 모든 공간 — '이미 확장됨' 상태 (current=true, after=true)
  switch (roomId) {
    case '거실':
      return { ...base, expansion_current: true, expansion_after: true, aircon: true, ceiling_fan: true };
    case '주방':
      return { ...base, expansion_current: true, expansion_after: true };
    case '안방':
      // 안방만 발코니 유지 (확장 없음)
      return { ...base, expansion_current: false, expansion_after: false, aircon: true, closet: true, ceiling_fan: true };
    case '작은방1':
      return { ...base, expansion_current: true, expansion_after: true, aircon: true, closet: true };
    case '작은방2':
      return { ...base, expansion_current: true, expansion_after: true, aircon: true, closet: true };
    case '작은방3':
      // 작은방2와 동일 (4룸 평면에서 작방3은 작방2와 유사한 용도)
      return { ...base, expansion_current: true, expansion_after: true, aircon: true, closet: true };
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
      '작은방3': defaultRoomScope('작은방3'),
    },
    global: {
      demolition: true,
      demolition_scope: 'basic', // 기본철거(100%) — 부분(85%)/올(120%)은 사용자 선택
      insulation: true,
      heating_pipe: false,
      common_bath_set: true,
      master_bath_set: true,
      common_bath_type: 'booth',   // 기본 샤워부스 (파티션)
      master_bath_type: 'booth',
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
      distribution_panel: true,    // 설비 기본 포함 (등급 자동 적용)
      plumbing_relocation: false,  // 옵션 (사용자 별도 선택)
      silicon: true,
      protection: true,            // 기타 — 보양 (기본 포함)
      consent: true,               // 기타 — 동의서 (기본 포함)
      cleanup: true,               // 기타 — 준공청소 (기본 포함)
      // 기본 default = '이미 확장된 상태'이므로 신규 확장 시공 0건 → 신고 불필요
      expansion_report: false,
      act_permit: false,           // 기타 — 행위허가 신고 (구조변경 시만 opt-in)
      // ── 목공사 6 sub-work ──
      // 기본 목공·천정 목공은 올리모델링의 통상 포함 항목 → 기본 ON
      carpentry_base: true,
      carpentry_ceiling: true,
      partition_length: 0,     // 가벽은 사용자가 직접 입력 시 발생
      // 무몰딩·무문선·무걸레받이는 opt-in (사용자가 명시 선택 시)
      no_molding: false,
      no_door_frame: false,
      no_baseboard: false,
      wallpaper_putty: false, // 무몰딩 적용(도배 15% 퍼티/면처리) — 기본 OFF
    },
  };
}

export function defaultGrade(): GradeSelection {
  return { default: '표준', overrides: {}, material_overrides: {} };
}

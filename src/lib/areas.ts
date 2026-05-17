/**
 * 평형 → 공간별 면적·둘레 (선형보간)
 * 데이터는 표준면적 시트(3베이 기준)에서 추출됨.
 */
import areas from '@/data/standard_areas.json';
import type { Property } from './types';

const SA = areas as {
  pyeongs: number[];
  rooms: Record<string, Record<string, number>>;
  rooms_by_bay: Record<string, Record<string, Record<string, number>>>;
  perimeters: Record<string, Record<string, number>>;
  balcony: Record<string, Record<string, number>>;
};

function interp(table: Record<string, number>, pyeong: number): number {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (pyeong <= keys[0]) return table[String(keys[0])];
  if (pyeong >= keys[keys.length - 1]) return table[String(keys[keys.length - 1])];
  for (let i = 0; i < keys.length - 1; i++) {
    const lo = keys[i], hi = keys[i + 1];
    if (pyeong >= lo && pyeong <= hi) {
      const ratio = (pyeong - lo) / (hi - lo);
      return table[String(lo)] + (table[String(hi)] - table[String(lo)]) * ratio;
    }
  }
  return 0;
}

export function roomArea(roomName: string, pyeong: number, bay: number = 3): number {
  // 베이별 표가 있으면 그걸 우선, 없으면 3베이 기본
  const bayTable = SA.rooms_by_bay?.[String(bay)];
  const t = bayTable?.[roomName] ?? SA.rooms[roomName];
  if (!t) return 0;
  return interp(t, pyeong);
}

export function roomPerimeter(roomName: string, pyeong: number): number {
  const t = SA.perimeters[roomName];
  if (!t) return 0;
  return interp(t, pyeong);
}

export function balconyArea(key: string, pyeong: number): number {
  const t = SA.balcony[key];
  if (!t) return 0;
  return interp(t, pyeong);
}

/**
 * 우리집 시트 매핑: RoomId → 표준면적 시트의 키.
 * 작은방3은 별도 데이터가 없어 작방2의 면적·둘레로 폴백한다.
 * (40~50평대에서 작은방3은 작은방2와 유사한 크기로 설계되는 경우가 많아 무난한 근사)
 */
const ROOM_KEY: Record<string, string> = {
  '거실': '거실',
  '주방': '주방',
  '안방': '안방',
  '작은방1': '작방1',
  '작은방2': '작방2',
  '작은방3': '작방2',
};

/** perimeters 시트는 키가 '작은방1' 형태 — 작은방3은 작은방2로 폴백 */
const ROOM_PERIMETER_KEY: Record<string, string> = {
  '작은방3': '작은방2',
};

export function roomAreaForId(roomId: string, pyeong: number, bay: number = 3): number {
  return roomArea(ROOM_KEY[roomId] || roomId, pyeong, bay);
}

export function roomPerimeterForId(roomId: string, pyeong: number): number {
  return roomPerimeter(ROOM_PERIMETER_KEY[roomId] || roomId, pyeong);
}

/** 외부창 면적 — 베이별로 다름 (v4: 2/3/4/5베이 각각 표) */
export function outsideWindowArea(pyeong: number, bay: number = 3): number {
  return roomArea('외부창', pyeong, bay);
}

/** 공급면적 (㎡) — 평 × 3.31 */
export function supplyAreaM2(pyeong: number): number {
  return pyeong * 3.31;
}

/** 전용면적 (㎡) — 공급 × 0.75 */
export function exclusiveAreaM2(pyeong: number): number {
  return supplyAreaM2(pyeong) * 0.75;
}

/** 평형 기반 방 개수(거실 제외) 권장값 */
export function recommendedRoomCount(pyeong: number): 2 | 3 | 4 | 5 {
  // 거실 외 침실 수. 20평대 보통 2룸(안방+작방1), 30평대+ 3룸(안방+작방1+작방2)
  if (pyeong < 22) return 2;
  return 3;
}

/** 우리집 시트의 "스위치/콘센트 평형별 자동 산출" 룩업 */
export function switchOutletCount(pyeong: number): number {
  // 10평 18ea → 30평 34ea → 60평 56ea (선형보간)
  const table: Record<number, number> = { 10: 18, 30: 34, 60: 56 };
  return Math.round(interp(table as never, pyeong));
}

/** 평형별 다운라이트 권장 개수 — 10평 4ea / 24평 10ea / 30평 14ea / 60평 28ea */
export function downlightCount(pyeong: number): number {
  const table: Record<number, number> = { 10: 4, 30: 14, 60: 28 };
  return Math.round(interp(table as never, pyeong));
}

/** 평형별 문짝 개수 권장 */
export function doorCount(pyeong: number): number {
  if (pyeong < 27) return 5;
  if (pyeong < 38) return 7;
  return 9;
}

/** 활성 공간 ID 목록. p.rooms는 거실 제외한 방 개수 (안방+작방들) */
export function activeRooms(p: Property): string[] {
  const rooms = ['거실', '주방', '안방'];   // 거실·주방은 항상, 안방은 방1
  if (p.rooms >= 2) rooms.push('작은방1');
  if (p.rooms >= 3) rooms.push('작은방2');
  if (p.rooms >= 4) rooms.push('작은방3');
  return rooms;
}

export function activeBathrooms(p: Property): string[] {
  const list = [];
  if (p.common_bath >= 1) list.push('공용욕실');
  if (p.master_bath >= 1) list.push('부부욕실');
  return list;
}

/**
 * 공간별 베이 폭(m) — v4 시트 '확장설정' 공식: SQRT(공간면적)
 * 정사각형 가정의 한 변. 베이별 외관 분배 계산에 사용.
 */
export function bayWidthForRoom(roomId: string, pyeong: number): number {
  const a = roomAreaForId(roomId, pyeong);
  return Math.sqrt(Math.max(a, 0));
}

/** 공간별 발코니 면적 = 베이폭 × 발코니깊이 (확장 대상 면적의 기준) */
export function balconyAreaForRoom(roomId: string, pyeong: number, depth: number): number {
  return bayWidthForRoom(roomId, pyeong) * depth;
}

/**
 * 평형 → 공간별 면적·둘레 (선형보간)
 * 데이터는 표준면적 시트(3베이 기준)에서 추출됨.
 */
import areas from '@/data/standard_areas.json';
import type { Property, Scope } from './types';

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
  // 거실 외 침실 수.
  //  20평대 미만 → 2룸 (안방+작방1)
  //  20~40평대 → 3룸 (안방+작방1·2)
  //  50평대+ → 4룸 (안방+작방1·2·3)
  if (pyeong < 22) return 2;
  if (pyeong < 50) return 3;
  return 4;
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

/**
 * 평형별 욕실 1실 평균 면적 (㎡).
 * 24평 4.0 / 34평 5.0 / 44평 6.0 / 60평+ 7.0 — 공용·부부 공통 평균치.
 * 작은 평형(15평 이하)에서는 3.5㎡ 정도, 대형 평형(60평+)은 7㎡ 수준.
 */
export function bathroomArea(pyeong: number): number {
  const table: Record<number, number> = { 15: 3.5, 24: 4.0, 34: 5.0, 44: 6.0, 60: 7.0 };
  return interp(table as never, pyeong);
}

/**
 * 평형별 표준 주방 길이 (m). ㄷ자/ㄱ자 평균값.
 * 24평 3.0 / 34평 3.6 / 44평 4.5 / 60평+ 5.4 — 시트 v4 우리집 환산.
 */
export function kitchenLength(pyeong: number): number {
  const table: Record<number, number> = { 15: 2.4, 24: 3.0, 34: 3.6, 44: 4.5, 60: 5.4 };
  return interp(table as never, pyeong);
}

/**
 * 평형 입력값 clamp — [6, 100] 평. 키보드로 우회된 비현실적 값 방어.
 */
export function clampPyeong(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(6, Math.min(100, n));
}

/** 발코니 깊이 clamp — [0, 3] m */
export function clampBalconyDepth(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(3, n);
}

/** 가벽 길이 clamp — [0, 50] m */
export function clampPartitionLength(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(50, n);
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

/**
 * 시스템에어컨 실내기 설치 공간 목록 (activeRooms 순서 유지).
 * calculator 의 실제 설치 라인과 UI 의 "실내기 N대" 칩이 공유하는 단일 기준.
 *
 *  · 기본: 활성 공간 중 scope.rooms[r].aircon === true 인 곳
 *  · 40평 이상: 주방도 기본 설치 — 단 에어컨이 한 곳이라도 켜진 경우에만.
 *    (에어컨 공종 전체 OFF 시엔 주방도 미설치 → 카드 제외 상태와 정합)
 *
 * 주의: defaults.ts 의 초기 scope 는 주방 aircon=false 이지만, 40평+ 에선
 *       이 함수가 주방을 자동 포함시키므로 평형 입력 시점과 무관하게 반영된다.
 */
export function airconInstallRooms(p: Property, scope: Scope): string[] {
  const active = activeRooms(p);
  const anyOn = active.some((r) => !!scope.rooms[r as keyof Scope['rooms']]?.aircon);
  return active.filter((r) => {
    if (scope.rooms[r as keyof Scope['rooms']]?.aircon) return true;
    if (r === '주방' && p.pyeong >= 40 && anyOn) return true;
    return false;
  });
}

/**
 * 평형 기반 표준 마감면적 (㎡) — 방 수와 무관.
 * 마루는 평형이 같으면 시공 면적이 같아야 한다 (가벽으로 분할해도 총 마감면적 동일).
 * 표준 3룸(거실·주방·안방·작방1·작방2) 합을 baseline 으로 사용 — 30평 기준 회귀 유지.
 */
export function standardFloorArea(p: Property): number {
  return [
    roomAreaForId('거실', p.pyeong, p.bay),
    roomAreaForId('주방', p.pyeong, p.bay),
    roomAreaForId('안방', p.pyeong, p.bay),
    roomAreaForId('작은방1', p.pyeong, p.bay),
    roomAreaForId('작은방2', p.pyeong, p.bay),
  ].reduce((a, b) => a + b, 0);
}

/**
 * 마루 시공 면적 — 활성 공간 면적을 평형 기반 표준 면적으로 정규화.
 *
 *  · 4룸 평면: 작방3 추가로 활성 합이 늘어나도 scale = TARGET/activeRaw < 1 로 보정
 *    → 각 룸 면적이 비례 축소 → 총 마루 면적은 표준값으로 수렴
 *  · 2룸 평면: 활성 합이 적어 scale > 1 → 각 룸이 비례 확장 (거실/주방이 더 넓다는 가정)
 *
 * 같은 평형이면 sum(activeRooms 의 adjustedRoomFlooringArea) == standardFloorArea 가 보장됨.
 */
export function adjustedRoomFlooringArea(roomId: string, p: Property): number {
  const target = standardFloorArea(p);
  const active = activeRooms(p);
  const activeRaw = active.reduce(
    (s, r) => s + roomAreaForId(r, p.pyeong, p.bay),
    0,
  );
  if (activeRaw === 0) return 0;
  const my = roomAreaForId(roomId, p.pyeong, p.bay);
  return my * (target / activeRaw);
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

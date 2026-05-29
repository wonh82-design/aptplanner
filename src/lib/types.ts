/**
 * apt-planner 도메인 타입
 * 설계 원칙 (apt-planner_AI프롬프트_설계서.md 참고):
 *  - Quote Object를 Single Source of Truth로
 *  - 자재는 consumer/installer 이중 표현
 *  - JSON in, JSON out (LLM 단계에서도 유지)
 */

/**
 * Grade — 자재마스터의 primary_grade 값. 7가지.
 * "X 추천" 은 그 등급 그룹 안에서 시스템이 자동으로 우선 선택하는 자재 마커.
 */
export type Grade =
  | '가성비 추천' | '가성비'
  | '표준 추천' | '표준'
  | '고급 추천' | '고급'
  | '단일등급';

/**
 * GradeGroup — 사용자가 견적 화면에서 선택하는 등급. 4가지.
 * 같은 그룹 안에 "추천" 자재가 있으면 그것이 견적에 자동 선택됨.
 */
export type GradeGroup = '가성비' | '표준' | '고급' | '단일등급';

/**
 * Grade(7) → GradeGroup(4) 변환.
 * "표준 추천" → "표준" 같이 "X 추천" 의 추천 접미사를 제거.
 */
export function gradeGroupOf(g: Grade): GradeGroup {
  if (g === '가성비 추천') return '가성비';
  if (g === '표준 추천') return '표준';
  if (g === '고급 추천') return '고급';
  return g; // 가성비/표준/고급/단일등급 그대로
}

/** "X 추천" 인 자재인지 — 추천 우선 선택 + 배지 표시용. */
export function isRecommendedGrade(g: Grade): boolean {
  return g === '가성비 추천' || g === '표준 추천' || g === '고급 추천';
}

export type YesNo = 'Y' | 'N' | '-';

export type RoomId = '거실' | '주방' | '안방' | '작은방1' | '작은방2' | '작은방3';
export type BathId = '공용욕실' | '부부욕실';

/** 자재마스터 1행 */
export type Material = {
  material_id: string;
  /**
   * 세부공종 (sub_category) — 시스템 내부 ID.
   * 예: 'flooring', 'wallpaper', 'bath_tile', 'window' 등.
   * 계산기·UI 라우팅·번들 매핑의 키. UI 에는 "세부공종" 으로 표시.
   * (구 work_type 의 새 이름)
   */
  sub_category: string;
  /**
   * 대공종 (category) — 사람이 읽는 한글 분류.
   * 예: '마루', '도배', '타일', '샷시'. nullable.
   */
  category: string | null;
  brand: string | null;
  product_line: string | null;
  installer_spec: string | null;     // 시공자용 풀스펙
  unit_type: string;                  // per_m2 / per_m / per_ea / per_set
  material_price: number;
  labor_price: number;
  total_unit_price: number;
  primary_grade: Grade;
  /**
   * 자재 이미지 URL (옵셔널).
   * - 구글 드라이브 공유 링크 (https://drive.google.com/file/d/{ID}/view) 그대로 넣어도 됨
   *   → normalizeImageUrl()이 자동으로 임베드 가능한 thumbnail URL로 변환
   * - 일반 https://... URL도 그대로 사용 가능
   * - 비어 있거나 null이면 모달에서 placeholder 표시
   */
  image_url?: string | null;
  /**
   * 제조사 제품 페이지 URL (옵셔널).
   * 자재 카드의 '제조사 페이지' 버튼이 이 URL을 새 창으로 연다.
   * 비어 있으면 버튼이 노출되지 않음.
   */
  vendor_url?: string | null;
};

/** 평형별 표준면적 (3베이 기준) */
export type StandardAreas = {
  pyeongs: number[];                  // [10,20,30,40,50,60]
  rooms: Record<string, Record<number, number>>;       // m²
  perimeters: Record<string, Record<number, number>>;  // m
  balcony: Record<string, Record<number, number>>;     // 발코니/다용도실
};

/** 지역 — 공사비 보정 계수 산정용 */
export type RegionId = 'seoul' | 'gyeonggi' | 'metro' | 'small_city' | 'jeju';
/** 아파트 연식 */
export type AgeId = 'new' | '5-15' | '15-30' | '30+';

/** 우리집 기본 정보 */
export type Property = {
  pyeong: number;            // 공급평형
  bay: 2 | 3 | 4 | 5;
  rooms: 2 | 3 | 4 | 5;      // 방 개수 (거실 제외)
  common_bath: 1 | 2;        // 공용욕실 개수
  master_bath: 0 | 1;        // 부부욕실 유무
  balcony_depth_m: number;   // 발코니 깊이
  region: RegionId;          // 지역 (보정 계수)
  age: AgeId;                // 아파트 연식 (보정 계수)
};

/** 공간별 공종 매트릭스 */
export type RoomScope = {
  expansion_current: boolean; // 현재 확장 상태 (기존)
  expansion_after: boolean;   // 확장 후 상태 (목표)
  flooring: boolean;          // 바닥재
  wallpaper: boolean;         // 도배
  molding: boolean;           // 몰딩
  aircon: boolean;            // 시스템에어컨
  closet: boolean;            // 붙박이장
  ceiling_fan: boolean;       // 실링팬
  sash: boolean;              // 샷시
};

/** 전체 공종 토글 */
export type GlobalScope = {
  demolition: boolean;        // 철거
  insulation: boolean;        // 단열
  heating_pipe: boolean;      // 난방배관 교체
  common_bath_set: boolean;   // 공용욕실 세트
  master_bath_set: boolean;   // 부부욕실 세트
  kitchen_set: boolean;       // 주방가구
  middoor: boolean;           // 중문
  entry_furniture: boolean;   // 현관 일반가구
  lighting: boolean;          // 조명 풀세트
  balcony_floor_tile: boolean;
  balcony_paint: boolean;
  electrical_base: boolean;    // 전기 기본공사 (배선·분전반)
  switch_outlet: boolean;
  induction_line: boolean;
  plumbing_base: boolean;      // 설비 기본공사 (수도·난방·하수 점검·보강) — electrical_base와 분리
  thermostat: boolean;         // 난방 온도조절기
  distribution_panel: boolean; // 분배기 교체 — 설비 기본 포함 (등급에 자동 적용)
  plumbing_relocation: boolean;// 배관 변경 — 옵션 (사용자 선택)
  silicon: boolean;
  protection: boolean;        // 기타 — 보양
  consent: boolean;           // 기타 — 동의서 징구
  cleanup: boolean;           // 기타 — 준공 청소
  expansion_report: boolean;   // 구청 확장공사 신고
  act_permit: boolean;         // 구청 행위허가 신고 — 구조변경·평면수정 시 필수 (확장과 독립)
  // ── 목공사 (carpentry) — 6가지 sub-work ──
  carpentry_base: boolean;     // 기본 목공사 (문틀·문선·기본 보강)
  carpentry_ceiling: boolean;  // 천정 목공 (평천↔우물천, 매입조명 박스 등)
  partition_length: number;    // 가벽 신설·철거 길이 (m). 0이면 미발생
  no_molding: boolean;         // 무몰딩 — molding 자재 대신 천장-벽 목공+도배 마감
  no_door_frame: boolean;      // 무문선 — door 자재 대신 매입보강+마감도배
  no_baseboard: boolean;       // 무걸레받이 — baseboard 자재 대신 벽-바닥 목공+도배 마감
};

export type Scope = {
  rooms: Record<RoomId, RoomScope>;
  global: GlobalScope;
};

/** 등급·자재 선택 — 사용자가 견적 화면에서 선택하는 값 (GradeGroup 4가지 단위) */
export type GradeSelection = {
  default: GradeGroup;                                       // 전체 일괄 등급
  overrides: Partial<Record<string, GradeGroup>>;            // work_type → gradeGroup
  material_overrides: Partial<Record<string, string>>;       // work_type → material_id (그룹 내 특정 자재)
};

/** 산출된 견적 한 줄 */
export type LineItem = {
  id: string;
  room: string;                // '전체' or RoomId or BathId
  work_type: string;           // 'flooring' 등
  category: string;            // '바닥재' 같은 한글 라벨
  unit_type: string;
  qty: number;
  grade: GradeGroup;
  material_id: string | null;
  material_label: string;      // installer_spec
  unit_price: number;
  subtotal: number;
};

/** 견적 합계 */
export type Totals = {
  /** work_type 라벨 단위(granular) — 예: 바닥재, 도배, 세면대… */
  by_work_type: Record<string, number>;
  /** Material.category 단위(grouped) — 예: 마루, 도배, 타일, 욕실, 전기… */
  by_category: Record<string, number>;
  by_room: Record<string, number>;
  /** 보정 전 원시 합계 (부가세 별도) */
  grand_total_raw: number;
  /** 지역·연식 보정 계수 (예: 서울 × 5~15년 = 1.1 × 0.95) */
  adjustment_multiplier: number;
  /** 보정 적용 후 (부가세 별도) — 10만원 단위 반올림 */
  grand_total: number;
  /** -5% 하한 (10만원 단위 반올림) */
  grand_total_low: number;
  /** +5% 상한 (10만원 단위 반올림) */
  grand_total_high: number;
  vat: number;
  grand_total_with_vat: number;
  per_pyeong: number;           // 평당 (부가세 별도, 보정 후)
};

/** Quote Object — Single SoT */
export type Quote = {
  quote_id: string;
  created_at: string;
  property: Property;
  scope: Scope;
  grade: GradeSelection;
  line_items: LineItem[];
  totals: Totals;
};

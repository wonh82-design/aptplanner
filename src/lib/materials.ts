/**
 * 자재마스터 조회 헬퍼.
 * (work_type, gradeGroup) → "X 추천" 자재 우선, 없으면 그 그룹 내 첫 자재.
 *
 * Grade(7) 와 GradeGroup(4) 의 관계:
 *  - 자재의 primary_grade 는 7가지 ('가성비 추천' | '가성비' | '표준 추천' | '표준' | ...)
 *  - 사용자가 선택하는 등급은 4가지 GradeGroup ('가성비' | '표준' | '고급' | '단일등급')
 *  - getPrimaryMaterial 은 GradeGroup 을 받아 그 그룹 내에서 추천 우선 선택
 *
 * ── 데이터 소스 ──
 * 빌드 타임에 src/data/materials.json 을 seed 로 로드.
 * 런타임에 MaterialsProvider(`src/lib/MaterialsProvider.tsx`)가 /api/materials
 * 응답으로 setMaterials() 호출 → 내부 인덱스 갱신.
 * 모든 helper 함수는 동기 시그니처 유지 — 컨슈머(calculator, UI) 변경 불필요.
 */
import data from '@/data/materials.json';
import type { Grade, GradeGroup, Material } from './types';
import { gradeGroupOf, isRecommendedGrade, materialGradeGroups, kitchenRepSlotOf, kitchenRepImageKey } from './types';

/**
 * ALL_MATERIALS — in-place mutable 배열. setMaterials() 호출 시 splice 로 내용 교체.
 * 외부에서 import 후 보관 중인 참조도 자동으로 새 데이터를 반영함.
 */
export const ALL_MATERIALS: Material[] = [...(data as Material[])];
let byKey = new Map<string, Material[]>();
let byId = new Map<string, Material>();

function rebuildIndexes() {
  byKey = new Map();
  byId = new Map();
  for (const m of ALL_MATERIALS) {
    // 그룹 단위로 인덱싱 — 사용자는 GradeGroup(4가지) 단위로 선택하기 때문.
    // "가성비 추천" + "가성비" 둘 다 key="flooring|가성비" 로 들어감.
    // 다중 등급 적용: 자재가 커버하는 모든 그룹(홈 + grade_groups)에 인덱싱.
    for (const group of materialGradeGroups(m)) {
      const k = `${m.sub_category}|${group}`;
      const arr = byKey.get(k) || [];
      arr.push(m);
      byKey.set(k, arr);
    }
    byId.set(m.material_id, m);
  }
}
rebuildIndexes();

/**
 * 런타임 자재 갱신.
 * MaterialsProvider 가 /api/materials fetch 결과로 호출.
 * 호출 후 모든 helper(getMaterialById, getPrimaryMaterial, materialsFor 등)는
 * 새 데이터를 반영한다.
 */
export function setMaterials(materials: Material[]): void {
  ALL_MATERIALS.splice(0, ALL_MATERIALS.length, ...materials);
  rebuildIndexes();
}

/** 현재 메모리상 자재 전체 (편의 함수). */
export function getAllMaterials(): Material[] {
  return ALL_MATERIALS;
}

/**
 * 주방 풀세트 대표 이미지 — 우리집 평형·베이·선택등급에 맞는 이미지 URL (없으면 null).
 * sub_category==='kitchen_set' 인 이미지 홀더 자재에서 `${slot}|${grade}` 키로 조회.
 * 런타임 갱신(/api/materials) 반영 — ALL_MATERIALS 를 직접 순회.
 */
export function getKitchenRepImage(pyeong: number, bay: number, grade: GradeGroup): string | null {
  const key = kitchenRepImageKey(kitchenRepSlotOf(pyeong, bay), grade);
  for (const m of ALL_MATERIALS) {
    if (m.sub_category === 'kitchen_set' && m.kitchen_rep_images) {
      const url = m.kitchen_rep_images[key];
      if (typeof url === 'string' && url.trim()) return url.trim();
    }
  }
  return null;
}

export function getMaterialById(id: string): Material | undefined {
  return byId.get(id);
}

/**
 * 해당 공종·등급그룹의 대표 자재 1개를 결정.
 * 우선순위:
 *  1. 해당 그룹 내 "X 추천" 자재 (예: "표준 추천")
 *  2. 해당 그룹 내 첫 자재
 *  3. 단일등급 폴백
 *  4. 등급 무관 폴백 (그 공종의 아무 자재)
 */
export function getPrimaryMaterial(workType: string, group: GradeGroup): Material | null {
  // 1+2. 해당 그룹 candidates
  const direct = byKey.get(`${workType}|${group}`) ?? [];
  if (direct.length > 0) {
    // '추천'은 그 자재의 홈 그룹에서만 유효 — 추가 그룹(grade_groups)에선 일반 멤버로 취급.
    const recommended = direct.find(
      (m) => isRecommendedGrade(m.primary_grade as Grade) && gradeGroupOf(m.primary_grade as Grade) === group,
    );
    return recommended || direct[0];
  }
  // 3. 단일등급 폴백
  const single = byKey.get(`${workType}|단일등급`) ?? [];
  if (single.length > 0) return single[0];
  // 4. 등급 무관 폴백
  for (const m of ALL_MATERIALS) if (m.sub_category === workType) return m;
  return null;
}

/** 해당 공종의 등급 그룹 옵션 목록 (UI 드롭다운용 — 사용자 선택지) */
export function gradeOptionsFor(workType: string): GradeGroup[] {
  const set = new Set<GradeGroup>();
  for (const m of ALL_MATERIALS) {
    if (m.sub_category === workType) for (const g of materialGradeGroups(m)) set.add(g);
  }
  return Array.from(set);
}

/** 해당 세부공종의 모든 자재 (등급그룹순 → 추천우선 → brand 순 정렬) */
export function materialsFor(workType: string): Material[] {
  const list = ALL_MATERIALS.filter((m) => m.sub_category === workType);
  const groupOrder: Record<string, number> = { '가성비': 0, '표준': 1, '고급': 2, '단일등급': 3 };
  return list.slice().sort((a, b) => {
    const ga = groupOrder[gradeGroupOf(a.primary_grade as Grade)] ?? 99;
    const gb = groupOrder[gradeGroupOf(b.primary_grade as Grade)] ?? 99;
    if (ga !== gb) return ga - gb;
    // 같은 그룹 내에서는 "추천" 자재 우선
    const ra = isRecommendedGrade(a.primary_grade as Grade) ? 0 : 1;
    const rb = isRecommendedGrade(b.primary_grade as Grade) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (a.brand ?? '').localeCompare(b.brand ?? '');
  });
}

/** 세부공종(sub_category) → 한글 라벨 매핑 (UI용).
 *  sub_category 값이 이미 한글인 경우(예: '마루') 이 매핑이 없어도 labelOf 가 그대로 반환. */
export const WORK_TYPE_LABEL: Record<string, string> = {
  molding: '몰딩',
  wallpaper_putty: '도배 퍼티/면처리',
  baseboard: '걸레받이',
  window: '샷시',
  turning_door: '터닝도어',
  door_replacement: '문틀/문짝',
  sliding_door: '중문',
  kitchen_top: '주방 상판',
  kitchen_sink: '주방 싱크볼',
  kitchen_hood: '주방 후드',
  kitchen_furniture: '주방가구',
  kitchen_hardware: '주방 하드웨어',
  kitchen_midway: '주방 미드웨이',
  closet: '붙박이장',
  general_furniture: '현관 신발장',
  bath_basin: '욕실 세면대',
  bath_faucet: '세면기 수전',
  'bath_shower_faucet': '샤워 수전',
  bath_bathtub_faucet: '욕조 수전',
  bath_toilet: '욕실 양변기',
  bath_accessory: '욕실 악세사리',
  bath_tile: '욕실 타일',
  bath_grout: '욕실 줄눈',
  bath_waterproof: '욕실 방수',
  bath_jendai: '욕실 젠다이',
  bath_ceiling: '욕실 천정',
  bath_partition: '샤워부스',
  bath_bathtub: '욕조',
  bath_install: '욕실 설치비',
  tile_labor: '타일 시공팀',
  lighting_downlight: '다운라이트',
  lighting_indirect_living: '거실 간접조명',
  lighting_indirect_bath: '욕실 간접조명',
  lighting_magnetic_living: '거실 마그네틱조명',
  lighting_magnetic_kitchen: '주방 마그네틱조명',
  aircon: '시스템에어컨',
  aircon_outdoor: '에어컨 실외기',
  ceiling_fan: '실링팬',
  carpentry_base: '목공사 기본',
  carpentry_ceiling: '천정 목공',
  carpentry_partition: '가벽',
  balcony_floor_tile: '발코니 바닥타일',
  balcony_paint: '발코니 도장',
  electrical_switch: '스위치/콘센트',
  electrical_base: '전기 기본공사',
  induction_line: '인덕션 전용선',
  distribution_panel: '분전반',
  expansion: '확장공사',
  base_work: '철거공사',
  insulation: '단열공사',
  plumbing_base: '설비 기본공사',
  plumbing_relocation: '배관 변경',
  plumbing_heating: '난방배관 교체',
  thermostat: '난방온도조절기',
  silicon_labor: '실리콘',
  silicon_bio: '실리콘 바이오',
  silicon_modified: '실리콘 변성',
  protection: '보양',
  consent: '동의서 징구',
  cleanup: '준공 청소',
  expansion_report: '확장공사 신고',
  act_permit: '행위허가 신고',
  기타: '기타',
};

export function labelOf(workType: string): string {
  return WORK_TYPE_LABEL[workType] || workType;
}

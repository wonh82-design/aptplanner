/**
 * 자재마스터 조회 헬퍼.
 * (work_type, grade) → 주력 자재 1개를 결정.
 * 우선순위: tags에 '주력' 포함 → primary_grade 일치 → 첫 항목.
 *
 * ── 데이터 소스 ──
 * 빌드 타임에 src/data/materials.json 을 seed 로 로드.
 * 런타임에 MaterialsProvider(`src/lib/MaterialsProvider.tsx`)가 /api/materials
 * 응답으로 setMaterials() 호출 → 내부 인덱스 갱신.
 * 모든 helper 함수는 동기 시그니처 유지 — 컨슈머(calculator, UI) 변경 불필요.
 */
import data from '@/data/materials.json';
import type { Grade, Material } from './types';

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
    const k = `${m.work_type}|${m.primary_grade}`;
    const arr = byKey.get(k) || [];
    arr.push(m);
    byKey.set(k, arr);
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

export function getMaterialById(id: string): Material | undefined {
  return byId.get(id);
}

/** 해당 공종·등급의 주력 자재 (없으면 단일등급 / 다른 등급 폴백) */
export function getPrimaryMaterial(workType: string, grade: Grade): Material | null {
  const candidates: Material[] = [];
  const direct = byKey.get(`${workType}|${grade}`);
  if (direct?.length) candidates.push(...direct);
  // 폴백 1: 단일등급
  const single = byKey.get(`${workType}|단일등급`);
  if (single?.length) candidates.push(...single);
  // 폴백 2: 등급 무관 (이 공종의 모든 자재)
  if (candidates.length === 0) {
    for (const m of ALL_MATERIALS) if (m.work_type === workType) candidates.push(m);
  }
  if (candidates.length === 0) return null;
  // 우선순위: tags '주력' 포함 → 첫 항목
  const main = candidates.find(m => m.tags?.includes('주력'));
  return main || candidates[0];
}

/** 해당 공종의 등급 옵션 목록 (UI 드롭다운용) */
export function gradeOptionsFor(workType: string): Grade[] {
  const set = new Set<Grade>();
  for (const m of ALL_MATERIALS) {
    if (m.work_type === workType) set.add(m.primary_grade);
  }
  return Array.from(set);
}

/** 해당 공종의 모든 자재 (등급순, sub_category순 정렬) */
export function materialsFor(workType: string): Material[] {
  const list = ALL_MATERIALS.filter(m => m.work_type === workType);
  const gradeOrder: Record<string, number> = { '가성비': 0, '표준': 1, '고급': 2, '단일등급': 3 };
  return list.slice().sort((a, b) => {
    const ga = gradeOrder[a.primary_grade] ?? 99;
    const gb = gradeOrder[b.primary_grade] ?? 99;
    if (ga !== gb) return ga - gb;
    return (a.sub_category ?? '').localeCompare(b.sub_category ?? '');
  });
}

/** 공종(work_type) → 한글 라벨 매핑 (UI용) */
export const WORK_TYPE_LABEL: Record<string, string> = {
  flooring: '바닥재',
  wallpaper: '도배',
  molding: '몰딩',
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
  general_furniture: '현관 일반가구',
  bath_basin: '욕실 세면대',
  bath_faucet: '욕실 수전',
  bath_toilet: '욕실 양변기',
  bath_accessory: '욕실 악세사리',
  bath_tile: '욕실 타일',
  bath_grout: '욕실 줄눈',
  bath_waterproof: '욕실 방수',
  bath_jendai: '욕실 젠다이',
  bath_ceiling: '욕실 천정',
  bath_partition: '욕실 파티션',
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
  base_work: '기본공사',
  insulation: '단열공사',
  plumbing_base: '설비 기본공사',
  plumbing_relocation: '배관 변경',
  plumbing_heating: '난방배관 교체',
  thermostat: '난방온도조절기',
  silicon_labor: '실리콘',
  silicon_bio: '실리콘 바이오',
  silicon_modified: '실리콘 변성',
  기타: '기타',
};

export function labelOf(workType: string): string {
  return WORK_TYPE_LABEL[workType] || workType;
}

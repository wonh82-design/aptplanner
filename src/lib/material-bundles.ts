/**
 * 자재 세부 조정에서 여러 work_type을 하나의 카드(세트)로 묶기 위한 정의.
 * 예: 시스템에어컨 = 실내기(aircon) + 실외기(aircon_outdoor)
 *     욕실 풀세트 = 젠다이/방수/타일/세면대/수전/양변기/악세사리/줄눈/파티션/...
 */

export type WorkBundle = {
  id: string;
  label: string;
  desc?: string;
  /** 세트에 포함되는 work_type 키 목록 */
  workTypes: string[];
  /**
   * 표시 순서. 작을수록 위. 미지정 시 line_items의 firstIdx로 자동 정렬.
   * 명시한 번들끼리는 이 값으로 정렬되며, 미지정 번들/싱글보다 뒤로 갈 수도 앞으로 갈 수도 있다 (firstIdx 비교).
   */
  displayOrder?: number;
};

export const WORK_BUNDLES: WorkBundle[] = [
  {
    id: 'aircon',
    label: '시스템에어컨',
    desc: '실내기 + 실외기',
    workTypes: ['aircon', 'aircon_outdoor'],
  },
  {
    id: 'lighting',
    label: '조명 풀세트',
    desc: '다운라이트 + 거실/주방/욕실 간접·매그네틱 조명',
    workTypes: [
      'lighting_downlight',
      'lighting_indirect_living',
      'lighting_indirect_bath',
      'lighting_magnetic_living',
      'lighting_magnetic_kitchen',
    ],
  },
  {
    id: 'bath',
    label: '욕실 풀세트',
    desc: '방수·타일·세면대·수전·양변기·악세사리 일체',
    workTypes: [
      'bath_jendai',
      'bath_waterproof',
      'bath_tile',
      'bath_tile_method',
      'bath_grout',
      'bath_partition',
      'bath_ceiling',
      'bath_basin',
      'bath_faucet',
      'bath_toilet',
      'bath_accessory',
      'bath_install',
      'tile_labor',
      'bath_brick',
    ],
  },
  {
    id: 'kitchen',
    label: '주방 풀세트',
    desc: '상하부장 + 상판 + 미드웨이 + 후드 + 싱크볼',
    workTypes: [
      'kitchen_furniture',
      'kitchen_top',
      'kitchen_midway',
      'kitchen_hardware',
      'kitchen_hood',
      'kitchen_sink',
    ],
  },
  {
    id: 'molding_baseboard',
    label: '몰딩·걸레받이',
    desc: '천장 몰딩 + 벽-바닥 걸레받이 (고급 = 무몰딩/무걸레받이 시공)',
    // 고급 등급 시 무몰딩·무걸레받이 변환을 위한 부속 work_type 포함
    workTypes: [
      'molding',
      'baseboard',
      'molding_carpentry',
      'molding_wallpaper',
      'baseboard_carpentry',
      'baseboard_wallpaper',
    ],
    displayOrder: 100,  // 주방 풀세트 다음에 노출되도록 후순위로 강제
  },
  {
    id: 'electrical',
    label: '전기 공사',
    desc: '전기 기본 + 스위치/콘센트 + 인덕션 220V 전용선',
    workTypes: ['electrical_base', 'electrical_switch', 'induction_line'],
    displayOrder: 110,
  },
  {
    id: 'plumbing',
    label: '설비 공사',
    desc: '설비 기본 + 난방 온도조절기 + 난방배관 교체',
    workTypes: ['plumbing_base', 'thermostat', 'plumbing_heating', 'plumbing_relocation', 'distribution_panel'],
    displayOrder: 120,
  },
];

/** work_type → 속한 bundle (없으면 null) */
const BUNDLE_BY_WORK = new Map<string, WorkBundle>();
for (const b of WORK_BUNDLES) {
  for (const wt of b.workTypes) BUNDLE_BY_WORK.set(wt, b);
}

export function bundleForWorkType(wt: string): WorkBundle | null {
  return BUNDLE_BY_WORK.get(wt) ?? null;
}

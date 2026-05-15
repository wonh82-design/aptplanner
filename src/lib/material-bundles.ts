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
];

/** work_type → 속한 bundle (없으면 null) */
const BUNDLE_BY_WORK = new Map<string, WorkBundle>();
for (const b of WORK_BUNDLES) {
  for (const wt of b.workTypes) BUNDLE_BY_WORK.set(wt, b);
}

export function bundleForWorkType(wt: string): WorkBundle | null {
  return BUNDLE_BY_WORK.get(wt) ?? null;
}

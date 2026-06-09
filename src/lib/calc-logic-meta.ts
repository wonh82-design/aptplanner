/**
 * 공종별 '산식 설명' 레지스트리 — 관리자 계산 로직 확인 화면(/admin/calc-logic) 전용.
 *
 * ⚠ 이 파일은 **설명 텍스트(문서)** 만 담는다. 실제 수량·단가·소계·자재는 화면에서
 *   엔진(buildQuote)을 그대로 돌려 LineItem 에서 가져오므로 숫자는 절대 어긋나지 않는다.
 *   여기 적힌 산식 문구는 사람이 작성한 것이라, `calculator.buildLineItems` 로직을
 *   바꾸면 함께 갱신해야 한다(드리프트 대상은 '설명 문구'뿐).
 *
 * key = work_type (= LineItem.work_type). buildLineItems 가 emit 하는 모든 work_type 을 덮는다.
 * (scripts 의 완전성 체크가 누락을 잡는다.)
 */

export type CalcLogicMeta = {
  /** 수량(qty) 이 어떻게 정해지는지 — 사람이 읽는 산식 */
  formula: string;
  /** 어떤 표준면적/룩업을 참조하는지 (참조 표와 cross-ref) */
  areaRef?: string;
  /** 보충 설명 (조건·예외 등) */
  note?: string;
};

export const CALC_LOGIC_META: Record<string, CalcLogicMeta> = {
  // ── 기본공사 ──
  base_work:   { formula: '전용면적(㎡)', areaRef: '전용면적 = 공급평 × 3.31 × 0.75' },
  insulation:  { formula: '전용면적(㎡)', areaRef: '전용면적 = 공급평 × 3.31 × 0.75' },

  // ── 샷시 ──
  window: {
    formula: '평형·베이·등급 룩업표(window-cost)로 총가 산정 후 방별 베이폭 비율로 안분',
    areaRef: '외부창 / window-cost.ts 룩업',
    note: '자재마스터 단가 미사용. 거실·주방·침실 외창 + 안방 터닝도어 + 철거·사다리차·이윤15% 포함.',
  },

  // ── 공간별 마감 ──
  마루:   { formula: '공간 마루면적(㎡) — 평형 표준 마감면적으로 정규화(방 수 무관)', areaRef: '표준면적(룸) → adjustedRoomFlooringArea' },
  도배:   { formula: '공간 바닥면적 × 2.8 (WALL_RATIO, 벽면 환산)', areaRef: '표준면적(룸)' },
  molding: { formula: '공간 둘레(m)', areaRef: '둘레(perimeters)' },
  molding_carpentry:  { formula: '공간 바닥면적(㎡) 목공 마감', areaRef: '표준면적(룸)', note: '무몰딩(no_molding) ON 시 molding 대체' },
  molding_wallpaper:  { formula: '공간 바닥면적(㎡) 도배 마감', areaRef: '표준면적(룸)', note: '무몰딩(no_molding) ON 시 molding 대체' },

  // ── 걸레받이 ──
  baseboard:          { formula: '도배 공간 둘레합 × 0.343 (BASEBOARD_HEIGHT, ㎡ 환산)', areaRef: '둘레(perimeters)' },
  baseboard_carpentry:{ formula: '둘레합 × 0.343 목공 마감', areaRef: '둘레(perimeters)', note: '무걸레받이(no_baseboard) ON 시 baseboard 대체' },
  baseboard_wallpaper:{ formula: '둘레합 × 0.343 도배 마감', areaRef: '둘레(perimeters)', note: '무걸레받이(no_baseboard) ON 시 baseboard 대체' },

  // ── 목공사 ──
  carpentry_base:      { formula: '1식(고정)' },
  carpentry_ceiling:   { formula: '거실 + 주방 바닥면적 합(㎡)', areaRef: '표준면적(룸)' },
  carpentry_partition: { formula: '가벽 길이(m) × 2.3 (높이 2.3m 양면 마감)', note: 'partition_length 입력 시에만' },
  door_no_frame:       { formula: '문짝 개수 doorCount(평형) × ₩100,000(현장시공)', areaRef: '문짝 개수', note: '무문선(no_door_frame) ON. 자재마스터 미사용(하드코딩 단가).' },

  // ── 욕실 (공용/부부 각각, 욕실 1실 기준) ──
  bath_jendai:        { formula: '욕실 1실당 1개' },
  bath_waterproof:    { formula: '욕실 1실 면적 × 1.8 (BATH_WATERPROOF_AREA_FACTOR, 바닥+벽하부)', areaRef: '욕실면적 bathroomArea(평형)' },
  bath_tile:          { formula: '욕실 1실 면적 × 4.65 (BATH_TILE_AREA_FACTOR, 바닥+전체벽)', areaRef: '욕실면적 bathroomArea(평형)' },
  bath_grout:         { formula: '욕실 1실 면적 × 4.65 (타일과 동일 면적)', areaRef: '욕실면적 bathroomArea(평형)' },
  bath_ceiling:       { formula: '욕실 1실 면적(㎡) — 바닥과 동일', areaRef: '욕실면적 bathroomArea(평형)' },
  bath_basin:         { formula: '욕실 1실당 1개' },
  bath_faucet:        { formula: '욕실 1실당 1개 (세면기 수전 — 타입 무관 항상)' },
  bath_toilet:        { formula: '욕실 1실당 1개' },
  bath_accessory:     { formula: '욕실 1실당 1개' },
  bath_partition:     { formula: '욕실 1실당 1개', note: '욕실타입 booth/both 일 때만' },
  bath_shower_faucet: { formula: '샤워부스 포함 시 1개', note: 'booth/both' },
  bath_bathtub:       { formula: '욕실 1실당 1개', note: '욕실타입 tub/both 일 때만' },
  bath_bathtub_faucet:{ formula: '욕조 포함 시 1개', note: 'tub/both' },
  bath_install:       { formula: '욕실 1실당 1식 (설치 인건비)' },
  tile_labor:         { formula: '활성 욕실 수 × 2' },

  // ── 주방 ──
  kitchen_furniture: { formula: '주방 길이(m)', areaRef: '주방길이 kitchenLength(평형)' },
  kitchen_top:       { formula: '주방 길이(m)', areaRef: '주방길이 kitchenLength(평형)' },
  kitchen_midway:    { formula: '주방 길이(m)', areaRef: '주방길이 kitchenLength(평형)' },
  kitchen_hardware:  { formula: 'max(8, round(주방 길이 × 4.4))개', areaRef: '주방길이 kitchenLength(평형)' },
  kitchen_hood:      { formula: '1식' },
  kitchen_sink:      { formula: '1식' },

  // ── 가구·도어 ──
  sliding_door:      { formula: '1식 (중문)' },
  general_furniture: { formula: '현관 신발장 기준 길이(m)', areaRef: '현관장 길이 entryClosetLength(평형대 밴드)' },
  closet:            { formula: '안방 2.4m / 작은방 2.0m (공간별 고정 길이)' },

  // ── 냉방 ──
  aircon:         { formula: '에어컨 설치 공간 수 (40평+ 주방 자동 포함)', note: 'airconInstallRooms' },
  aircon_outdoor: { formula: '실외기 1대(고정)' },
  ceiling_fan:    { formula: '실링팬 설치 공간 수' },

  // ── 조명 ──
  lighting_downlight:        { formula: '다운라이트 개수 downlightCount(평형)', areaRef: '다운라이트 개수' },
  lighting_indirect_living:  { formula: '거실 1세트' },
  lighting_magnetic_living:  { formula: '거실 1세트' },
  lighting_magnetic_kitchen: { formula: '주방 1세트' },
  lighting_indirect_bath:    { formula: '활성 욕실 수' },

  // ── 발코니 ──
  balcony_floor_tile: { formula: '발코니 면적 − 확장 면적 (㎡)', areaRef: '발코니 면적' },
  balcony_paint:      { formula: '발코니 도장면적 × (1 − 확장비율) (㎡)', areaRef: '발코니 도장 면적' },

  // ── 확장 ──
  expansion:        { formula: '신규 확장 면적 합(㎡) = Σ(√공간면적 × 발코니깊이)', note: '현재 미확장 & 공사후 확장 공간만' },
  expansion_report: { formula: '1식 (확장 시 구청 신고)' },
  turning_door:     { formula: '1식', note: '거실 신규확장 & 안방 미확장 시에만' },

  // ── 전기/설비 ──
  electrical_base:     { formula: '공급면적(㎡)', areaRef: '공급면적 = 공급평 × 3.31' },
  plumbing_base:       { formula: '공급면적(㎡)', areaRef: '공급면적 = 공급평 × 3.31' },
  electrical_switch:   { formula: '스위치/콘센트 개수 switchOutletCount(평형)', areaRef: '스위치 개수' },
  induction_line:      { formula: '1식' },
  thermostat:          { formula: '거실 + 방 수 = (1 + 방 개수)개' },
  silicon_labor:       { formula: '1식' },
  plumbing_heating:    { formula: '평형(㎡당 처리, qty = 공급평)', note: '난방배관 교체 ON 시' },
  distribution_panel:  { formula: '1식' },
  plumbing_relocation: { formula: '1식', note: '배관 변경 옵션 ON 시' },

  // ── 기타 ──
  protection:  { formula: '1식 (보양)' },
  consent:     { formula: '1식 (동의서 징구)' },
  cleanup:     { formula: '평형 (qty = 공급평)' },
  act_permit:  { formula: '1식 (행위허가 신고)', note: '구조변경 시 opt-in' },
};

/** work_type → 산식 메타 (없으면 undefined) */
export function calcLogicMetaOf(workType: string): CalcLogicMeta | undefined {
  return CALC_LOGIC_META[workType];
}

/**
 * 단가 적용 방식 라벨 — unit_type/work_type 으로 판별.
 *  · window           → 평형·베이 룩업
 *  · per_pyeong_band  → 평형별 고정가(1식)
 *  · 그 외            → qty × 단가
 */
export function priceApplyLabel(workType: string, unitType: string): string {
  if (workType === 'window') return '평형·베이 룩업';
  if (unitType === 'per_pyeong_band') return '평형별 고정가(1식)';
  return 'qty × 단가';
}

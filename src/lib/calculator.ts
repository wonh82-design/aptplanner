/**
 * 공사비 산출 엔진.
 * apt-planner_자재DB_템플릿_100SKU_v4.xlsx '공사비산출' 시트의 로직을 단순화.
 *
 * MVP 구현 범위: 핵심 라인아이템 ~20개 카테고리.
 *  - 기본공사 (철거/단열)
 *  - 샷시
 *  - 공간별 (바닥재/도배/몰딩)
 *  - 걸레받이 (전체)
 *  - 욕실 컴포넌트 세트 (per 욕실)
 *  - 주방 가구/상판/싱크볼/후드/하드웨어/미드웨이
 *  - 도어 (중문/일반가구/붙박이장)
 *  - 조명/시스템에어컨/실링팬
 *  - 전기 (기본/스위치/인덕션)
 *  - 발코니 (바닥타일/도장)
 *
 * 확장·가벽 신설·구청 신고·문틀교체 등 조건부 항목은 후속 단계에서 추가.
 */
import type {
  Property, Scope, GradeSelection, LineItem, Totals, Quote, Grade, GradeGroup,
  RegionId, AgeId,
} from './types';
import { gradeGroupOf, bathOverrideKey, applyGradeFloor } from './types';
import {
  roomAreaForId, roomPerimeterForId, balconyArea, outsideWindowArea,
  exclusiveAreaM2, supplyAreaM2, switchOutletCount, activeRooms, activeBathrooms,
  bayWidthForRoom, balconyAreaForRoom, doorCount, downlightCount,
  bathroomArea, kitchenLength, adjustedRoomFlooringArea, airconInstallRooms,
  entryClosetLength,
} from './areas';
import { getPrimaryMaterial, getMaterialById, labelOf } from './materials';
import { lookupWindowCost } from './window-cost';

const WALL_RATIO = 2.8;             // 도배 면적 = 바닥 × 2.8 (벽면 환산)
const BASEBOARD_HEIGHT = 0.343;     // 걸레받이 ㎡ 환산 계수 (시트 v4 기준)
const VAT_RATE = 0.10;

/**
 * 욕실 면적 → 시공 면적 환산 계수.
 *  · 타일·줄눈: 바닥 + 전체 벽면 = 욕실면적 × 4.65 (천장 제외)
 *  · 방수: 바닥 전체 + 벽 하부(약 300mm) + 습식벽 일부 = 욕실면적 × 1.8
 *    (전체 벽면에 방수하지 않으므로 타일 면적보다 작음 — 과대 산정 방지)
 */
const BATH_TILE_AREA_FACTOR = 4.65;
const BATH_WATERPROOF_AREA_FACTOR = 1.8;

/** 지역별 공사비 보정 계수 */
export const REGION_MULTIPLIER: Record<RegionId, number> = {
  seoul: 1.10,
  gyeonggi: 1.00,
  metro: 1.05,
  small_city: 1.10,
  jeju: 1.30,
};

/** 아파트 연식별 보정 계수 */
export const AGE_MULTIPLIER: Record<AgeId, number> = {
  'new': 0.90,
  '5-15': 0.95,
  '15-30': 1.00,
  '30+': 1.05,
};

/** 지역·연식 라벨 (UI/PDF용) */
export const REGION_LABEL: Record<RegionId, string> = {
  seoul: '서울',
  gyeonggi: '경기도',
  metro: '지방 광역시',
  small_city: '지방 중소도시',
  jeju: '제주도',
};
export const AGE_LABEL: Record<AgeId, string> = {
  'new': '5년 이내 (준신축)',
  '5-15': '5~15년',
  '15-30': '15~30년',
  '30+': '30년 이상',
};

/** 우리집 보정 계수 (지역 × 연식) */
export function adjustmentMultiplier(p: Property): number {
  return REGION_MULTIPLIER[p.region] * AGE_MULTIPLIER[p.age];
}

/** 10만원 단위 반올림 */
function roundToHundredK(n: number): number {
  return Math.round(n / 100_000) * 100_000;
}

/** 그레이드 그룹 결정: override > default (사용자 선택값) */
function effectiveGrade(work: string, sel: GradeSelection): GradeGroup {
  return sel.overrides[work] ?? sel.default;
}

/**
 * LineItem 한 줄 생성 헬퍼. material이 없거나 qty=0이면 null 반환.
 * overrideKey: 등급·자재 override 조회 키 (기본 = workType).
 *   욕실 공용/부부 분리 시 `bath_basin@@부부욕실` 같은 네임스페이스 키를 넘겨
 *   같은 work_type 이라도 욕실별로 다른 등급·자재를 적용한다.
 *   자재 조회·라벨·카테고리는 항상 plain workType 기준.
 */
function lineItem(
  id: string,
  room: string,
  workType: string,
  qty: number,
  grade: GradeSelection,
  fallbackUnit: string = 'per_ea',
  overrideKey: string = workType,
): LineItem | null {
  if (qty <= 0) return null;
  // 우선순위: material_overrides[overrideKey] > (workType, effectiveGrade(overrideKey))의 주력자재
  const overrideId = grade.material_overrides?.[overrideKey];
  const overrideMat = overrideId ? getMaterialById(overrideId) : null;
  // 등급 결정 후 공종별 최소 등급 floor 적용 (예: 에어컨은 가성비 → 표준)
  const resolvedGrade = applyGradeFloor(workType, effectiveGrade(overrideKey, grade));
  // override가 해당 work_type이 아니면 무시 (안전망)
  const mat = overrideMat && overrideMat.sub_category === workType
    ? overrideMat
    : getPrimaryMaterial(workType, resolvedGrade);
  if (!mat) return null;
  const unit = mat.unit_type || fallbackUnit;
  const unitPrice = mat.total_unit_price;
  return {
    id,
    room,
    work_type: workType,
    category: labelOf(workType),
    unit_type: unit,
    qty: round2(qty),
    // LineItem.grade 는 GradeGroup(4) — mat.primary_grade 가 7가지 중 하나이므로 그룹으로 변환
    grade: gradeGroupOf(mat.primary_grade as Grade),
    material_id: mat.material_id,
    material_label: mat.installer_spec || `${mat.brand ?? ''} ${mat.product_line ?? ''}`.trim(),
    unit_price: unitPrice,
    subtotal: Math.round(qty * unitPrice),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 샷시(window) 전용 LineItem 생성기.
 * 자재 단가 대신 룩업 표(평형/베이/등급) 기반 총가를 사용한다.
 *  - share: 해당 방의 베이폭 / 활성 방 전체 베이폭 (0~1)
 *  - totalCost: lookupWindowCost(pyeong, bay, gradeGroup) 결과
 *  - subtotal = round(share × totalCost)
 * 자재는 라벨 표시용으로만 선택 — total_unit_price 는 무시.
 */
function windowLineItem(
  room: string,
  share: number,
  totalCost: number,
  grade: GradeSelection,
): LineItem | null {
  if (share <= 0 || totalCost <= 0) return null;
  const overrideId = grade.material_overrides?.['window'];
  const overrideMat = overrideId ? getMaterialById(overrideId) : null;
  const mat = overrideMat && overrideMat.sub_category === 'window'
    ? overrideMat
    : getPrimaryMaterial('window', effectiveGrade('window', grade));
  if (!mat) return null;
  return {
    id: '',
    room,
    work_type: 'window',
    category: labelOf('window'),
    unit_type: 'per_set',
    qty: round2(share),
    grade: gradeGroupOf(mat.primary_grade as Grade),
    material_id: mat.material_id,
    material_label: mat.installer_spec || `${mat.brand ?? ''} ${mat.product_line ?? ''}`.trim(),
    unit_price: totalCost,
    subtotal: Math.round(share * totalCost),
  };
}

/** 메인 함수: Property+Scope+Grade → LineItem[] */
export function buildLineItems(p: Property, scope: Scope, grade: GradeSelection): LineItem[] {
  const items: LineItem[] = [];
  let seq = 1;
  const push = (li: LineItem | null) => {
    if (li) { li.id = String(seq++); items.push(li); }
  };

  const excArea = exclusiveAreaM2(p.pyeong);
  const supArea = supplyAreaM2(p.pyeong);
  const windowArea = outsideWindowArea(p.pyeong, p.bay);

  // ===== 1. 기본공사 (전체 단위) =====
  if (scope.global.demolition)
    push(lineItem('', '전체', 'base_work', excArea, grade, 'per_m2'));
  if (scope.global.insulation)
    push(lineItem('', '전체', 'insulation', excArea, grade, 'per_m2'));

  // ===== 1.5. 확장 면적 사전 계산 =====
  // (현재 확장 X) AND (확장 후 Y)인 공간 → 추가 확장 면적 발생
  // 면적 = SQRT(공간면적) × 발코니 깊이  (v4 '확장설정' 시트 공식)
  const expansionByRoom: Record<string, number> = {};
  let totalExpansion = 0;
  for (const roomId of activeRooms(p)) {
    const rs = scope.rooms[roomId as keyof Scope['rooms']];
    if (!rs) continue;
    if (!rs.expansion_current && rs.expansion_after) {
      const a = balconyAreaForRoom(roomId, p.pyeong, p.balcony_depth_m);
      expansionByRoom[roomId] = a;
      totalExpansion += a;
    }
  }

  // ===== 2. 샷시 — 평형대·베이·등급 룩업 (자재 단가 미사용) =====
  // 자재마스터 window 자재의 total_unit_price 는 0 으로 두고, 이 룩업 표가 진실의 원천.
  // (Obsidian: BIZ/apt planner cost caliltor logic.md '평형대별 샷시 공사비')
  //  포함 범위: 거실·안방·작은방·주방 창 + 안방 발코니 터닝도어 + 철거·사다리차·이윤 15%.
  //
  // 룸별 분배: sash=Y 방의 베이폭 / 활성 방 전체 베이폭 비율로 룩업 총가를 안분.
  //  - 모든 활성 방 sash=Y → 합계 = 룩업가
  //  - 일부만 sash=Y → 베이폭 비율만큼 룩업가 차감
  const sashRooms = activeRooms(p).filter(r => scope.rooms[r as keyof Scope['rooms']]?.sash);
  if (sashRooms.length > 0) {
    const bayWidthSum = activeRooms(p).reduce((s, r) => s + bayWidthForRoom(r, p.pyeong), 0);
    const sashGrade = effectiveGrade('window', grade);
    const totalSashCost = lookupWindowCost(p.pyeong, p.bay, sashGrade);
    if (bayWidthSum > 0 && totalSashCost > 0) {
      for (const r of sashRooms) {
        const share = bayWidthForRoom(r, p.pyeong) / bayWidthSum;
        push(windowLineItem(r, share, totalSashCost, grade));
      }
    }
  }
  // windowArea 는 더 이상 사용하지 않지만 outsideWindowArea import 자체는 향후 확장 여지를 위해 유지.
  void windowArea;

  // ===== 3. 공간별: 바닥재 / 도배 / 몰딩 =====
  for (const roomId of activeRooms(p)) {
    const rs = scope.rooms[roomId as keyof Scope['rooms']];
    if (!rs) continue;
    const area = roomAreaForId(roomId, p.pyeong, p.bay);
    const perim = roomPerimeterForId(roomId, p.pyeong);
    // 마루는 평형 기반 정규화 면적 사용 — 방 수와 무관하게 총 시공면적 일정.
    // 도배·몰딩은 룸 분할 시 가벽 둘레가 늘어나는 현실 반영 → 룸별 raw area 유지.
    const flooringArea = adjustedRoomFlooringArea(roomId, p);

    if (rs.flooring) push(lineItem('', roomId, '마루', flooringArea, grade, 'per_m2'));
    if (rs.wallpaper) push(lineItem('', roomId, '도배', area * WALL_RATIO, grade, 'per_m2'));
    if (rs.molding) {
      if (scope.global.no_molding) {
        // 무몰딩 — molding 자재 대신 천장-벽 접점 목공+도배 마감
        push(lineItem('', roomId, 'molding_carpentry', area, grade, 'per_m2'));
        push(lineItem('', roomId, 'molding_wallpaper', area, grade, 'per_m2'));
      } else {
        push(lineItem('', roomId, 'molding', perim, grade, 'per_m'));
      }
    }
  }

  // ===== 4. 걸레받이 (전체) — 도배 받은 공간들의 둘레 합산 × 0.343 (시트 v4 환산) =====
  const wallpaperRooms = activeRooms(p).filter(r => scope.rooms[r as keyof Scope['rooms']]?.wallpaper);
  if (wallpaperRooms.length > 0) {
    const totalPerim = wallpaperRooms.reduce((s, r) => s + roomPerimeterForId(r, p.pyeong), 0);
    const baseboardArea = totalPerim * BASEBOARD_HEIGHT;
    if (scope.global.no_baseboard) {
      // 무걸레받이 — baseboard 자재 대신 벽-바닥 접점 목공+도배 마감
      push(lineItem('', '전체', 'baseboard_carpentry', baseboardArea, grade, 'per_m2'));
      push(lineItem('', '전체', 'baseboard_wallpaper', baseboardArea, grade, 'per_m2'));
    } else {
      push(lineItem('', '전체', 'baseboard', baseboardArea, grade, 'per_m2'));
    }
  }

  // ===== 4.5. 목공사 — scope.global의 6가지 sub-work 명시 토글로 emit =====
  if (scope.global.carpentry_base) {
    push(lineItem('', '전체', 'carpentry_base', 1, grade, 'per_set'));
  }
  if (scope.global.carpentry_ceiling) {
    const ceilingArea =
      roomAreaForId('거실', p.pyeong, p.bay) +
      roomAreaForId('주방', p.pyeong, p.bay);
    if (ceilingArea > 0) {
      push(lineItem('', '거실/주방', 'carpentry_ceiling', ceilingArea, grade, 'per_m2'));
    }
  }
  if (scope.global.partition_length > 0) {
    // 가벽 1m당 약 2.3㎡ 목공사 (높이 2.3m 기준 양면 마감)
    push(lineItem('', '전체', 'carpentry_partition', scope.global.partition_length * 2.3, grade, 'per_m2'));
  }
  if (scope.global.no_door_frame) {
    // 무문선 — 문짝당 매입 보강 + 마감 도배 (각 50K)
    const cnt = doorCount(p.pyeong);
    if (cnt > 0) {
      push({
        id: '',
        room: '전체',
        work_type: 'door_no_frame',
        category: '목공사',
        unit_type: 'per_ea',
        qty: cnt,
        grade: grade.default,
        material_id: null,
        material_label: '현장시공 무문선 매입보강 + 마감도배',
        unit_price: 100000,
        subtotal: cnt * 100000,
      });
    }
  }

  // ===== 5. 욕실 컴포넌트 (per 욕실) =====
  // 샤워부스(bath_partition) ↔ 욕조(bath_bathtub) 는 욕실 타입에 따라 택1 (상호배타) → 아래에서 별도 emit.
  const bathComponentWorks = [
    'bath_jendai', 'bath_waterproof', 'bath_tile', 'bath_grout',
    'bath_ceiling', 'bath_basin', 'bath_faucet', 'bath_toilet', 'bath_accessory',
  ];
  // 욕실 1실 면적은 평형별로 다름 (areas.bathroomArea). 공용/부부 동일 평균값 사용.
  const bathSingleArea = bathroomArea(p.pyeong);
  const bathAreas = { '공용욕실': bathSingleArea, '부부욕실': bathSingleArea };
  // 욕실 둘레는 현재 산식에 사용하지 않음 — 면적 × 4.65로 벽 도면적을 환산 중.

  for (const bath of activeBathrooms(p)) {
    const enabled = bath === '공용욕실' ? scope.global.common_bath_set : scope.global.master_bath_set;
    if (!enabled) continue;
    for (const wt of bathComponentWorks) {
      let qty = 1;
      const baseArea = bathAreas[bath as keyof typeof bathAreas];
      if (wt === 'bath_tile' || wt === 'bath_grout') {
        // 타일·줄눈 — 바닥 + 전체 벽면
        qty = baseArea * BATH_TILE_AREA_FACTOR;
      } else if (wt === 'bath_waterproof') {
        // 방수 — 바닥 + 벽 하부(전체 벽면 아님) → 더 작은 계수
        qty = baseArea * BATH_WATERPROOF_AREA_FACTOR;
      } else if (wt === 'bath_ceiling') {
        // 천장 — 바닥 면적과 동일
        qty = baseArea;
      }
      // 욕실별 네임스페이스 키 → 공용/부부 독립 등급·자재
      push(lineItem('', bath, wt, qty, grade, 'per_ea', bathOverrideKey(wt, bath)));
    }
    // 샤워부스 / 욕조 / 둘다 — 욕실 타입에 따라 본체·전용 수전 시공.
    //  · 'booth' → 샤워부스(bath_partition) + 샤워수전(bath_shower_faucet)
    //  · 'tub'   → 욕조(bath_bathtub) + 욕조수전(bath_bathtub_faucet)
    //  · 'both'  → 위 둘 다 (40평대 이상에서만 UI 노출)
    //  · 세면기 수전(bath_faucet)은 타입 무관 항상 시공 → bathComponentWorks 에 포함됨
    const bathType = (bath === '공용욕실' ? scope.global.common_bath_type : scope.global.master_bath_type) ?? 'booth';
    const wantBooth = bathType === 'booth' || bathType === 'both';
    const wantTub = bathType === 'tub' || bathType === 'both';
    if (wantBooth) {
      push(lineItem('', bath, 'bath_partition', 1, grade, 'per_ea', bathOverrideKey('bath_partition', bath)));
      push(lineItem('', bath, 'bath_shower_faucet', 1, grade, 'per_ea', bathOverrideKey('bath_shower_faucet', bath)));
    }
    if (wantTub) {
      push(lineItem('', bath, 'bath_bathtub', 1, grade, 'per_ea', bathOverrideKey('bath_bathtub', bath)));
      push(lineItem('', bath, 'bath_bathtub_faucet', 1, grade, 'per_ea', bathOverrideKey('bath_bathtub_faucet', bath)));
    }
    // 욕실 설치비 — 욕실별 1식 (공용/부부 각각)
    push(lineItem('', bath, 'bath_install', 1, grade, 'per_ea', bathOverrideKey('bath_install', bath)));
  }

  // 타일 시공팀 — 전체 공유 (욕실 수 × 2). 욕실별 분리 대상 아님.
  const bathCount = activeBathrooms(p).filter(b =>
    b === '공용욕실' ? scope.global.common_bath_set : scope.global.master_bath_set
  ).length;
  if (bathCount > 0) {
    push(lineItem('', '전체', 'tile_labor', bathCount * 2, grade));
  }

  // ===== 6. 주방 (전체) — 평형별 표준 주방 길이 사용 =====
  if (scope.global.kitchen_set) {
    const kitchenLen = kitchenLength(p.pyeong);
    // 하드웨어 수량도 길이에 비례 (3.6m 기준 16개 → 길이당 4.4개)
    const hardwareQty = Math.max(8, Math.round(kitchenLen * 4.4));
    push(lineItem('', '주방', 'kitchen_furniture', kitchenLen, grade, 'per_m'));
    push(lineItem('', '주방', 'kitchen_top', kitchenLen, grade, 'per_m'));
    push(lineItem('', '주방', 'kitchen_midway', kitchenLen, grade, 'per_m'));
    push(lineItem('', '주방', 'kitchen_hardware', hardwareQty, grade));
    push(lineItem('', '주방', 'kitchen_hood', 1, grade));
    push(lineItem('', '주방', 'kitchen_sink', 1, grade));
  }

  // ===== 7. 가구·도어 =====
  if (scope.global.middoor) push(lineItem('', '거실', 'sliding_door', 1, grade));
  // 현관 신발장 — 평형대별 기준 길이 × 1m당 단가 (per_m)
  if (scope.global.entry_furniture) push(lineItem('', '현관', 'general_furniture', entryClosetLength(p.pyeong), grade, 'per_m'));

  // 붙박이장: 안방 2.4m, 작방 2m (기본)
  for (const roomId of activeRooms(p)) {
    const rs = scope.rooms[roomId as keyof Scope['rooms']];
    if (!rs?.closet) continue;
    const len = roomId === '안방' ? 2.4 : 2.0;
    push(lineItem('', roomId, 'closet', len, grade, 'per_m'));
  }

  // 시스템에어컨 — 설치 공간은 airconInstallRooms 로 결정 (40평+ 주방 기본 포함)
  const acRooms = airconInstallRooms(p, scope);
  if (acRooms.length > 0) {
    push(lineItem('', '전체', 'aircon', acRooms.length, grade));
    push(lineItem('', '전체', 'aircon_outdoor', 1, grade));  // 실외기 1대
  }
  const fanRooms = activeRooms(p).filter(r => scope.rooms[r as keyof Scope['rooms']]?.ceiling_fan);
  if (fanRooms.length > 0) {
    push(lineItem('', '전체', 'ceiling_fan', fanRooms.length, grade));
  }

  // ===== 8. 조명 풀세트 — 5종 emit =====
  // 다운라이트는 평형 기반 수량, 간접·매그네틱은 위치별 1세트, 욕실 간접은 활성 욕실 수.
  // 가성비 등급에서 간접·매그네틱 자재가는 0원이라 총합은 다운라이트가 결정 (의도).
  if (scope.global.lighting) {
    push(lineItem('', '전체', 'lighting_downlight', downlightCount(p.pyeong), grade));
    push(lineItem('', '거실', 'lighting_indirect_living', 1, grade, 'per_set'));
    push(lineItem('', '거실', 'lighting_magnetic_living', 1, grade, 'per_set'));
    push(lineItem('', '주방', 'lighting_magnetic_kitchen', 1, grade, 'per_set'));
    const bathCount = activeBathrooms(p).length;
    if (bathCount > 0) {
      push(lineItem('', '욕실', 'lighting_indirect_bath', bathCount, grade));
    }
  }

  // ===== 9. 발코니 (확장된 부분은 제외) =====
  if (scope.global.balcony_floor_tile) {
    const bAr = Math.max(0, balconyArea('발코니 면적', p.pyeong) - totalExpansion);
    if (bAr > 0) push(lineItem('', '발코니', 'balcony_floor_tile', bAr, grade, 'per_m2'));
  }
  if (scope.global.balcony_paint) {
    // 도장 면적은 둘레 기반이라 확장 시 일부만 빠짐. 단순화: 확장 비율만큼 차감
    const fullPaint = balconyArea('발코니 도장 면적', p.pyeong);
    const fullFloor = balconyArea('발코니 면적', p.pyeong);
    const ratio = fullFloor > 0 ? Math.max(0, 1 - totalExpansion / fullFloor) : 1;
    const pAr = fullPaint * ratio;
    if (pAr > 0) push(lineItem('', '발코니', 'balcony_paint', pAr, grade, 'per_m2'));
  }

  // ===== 9.5. 확장공사 / 구청 신고 / 터닝도어 =====
  if (totalExpansion > 0) {
    push(lineItem('', '전체', 'expansion', totalExpansion, grade, 'per_m2'));
    if (scope.global.expansion_report) {
      // 구청 신고 — 자재마스터 work_type='expansion_report' 자재가 등급별 단가 적용
      push(lineItem('', '전체', 'expansion_report', 1, grade, 'per_set'));
    }
  }
  // 터닝도어: 거실을 신규로 확장 시공 AND 안방은 미확장 상태일 때만 emit.
  // (이미 확장된 거실은 기존 도어가 있으므로 신규 도어비 미발생)
  // 자재마스터 work_type='turning_door' 의 등급별 자재가 자동 선택된다
  // (가성비 KCC LiV Suite ₩1.2M / 표준 LX LSS-30 ₩1.8M / 고급 LX PRESTIGE ₩2.8M).
  const livingExpand = scope.rooms['거실']?.expansion_after;
  const livingAlreadyExpanded = scope.rooms['거실']?.expansion_current;
  const masterNotExpand = !scope.rooms['안방']?.expansion_after;
  if (livingExpand && !livingAlreadyExpanded && masterNotExpand) {
    push(lineItem('', '거실/안방경계', 'turning_door', 1, grade, 'per_ea'));
  }

  // ===== 10. 전기/설비 =====
  if (scope.global.electrical_base) {
    push(lineItem('', '전체', 'electrical_base', supArea, grade, 'per_m2'));
  }
  if (scope.global.plumbing_base) {
    push(lineItem('', '전체', 'plumbing_base', supArea, grade, 'per_m2'));
  }
  if (scope.global.switch_outlet) {
    push(lineItem('', '전체', 'electrical_switch', switchOutletCount(p.pyeong), grade));
  }
  if (scope.global.induction_line) {
    push(lineItem('', '주방', 'induction_line', 1, grade));
  }
  if (scope.global.thermostat) {
    // 거실+방 수
    push(lineItem('', '전체', 'thermostat', 1 + p.rooms, grade));
  }
  if (scope.global.silicon) {
    push(lineItem('', '전체', 'silicon_labor', 1, grade));
  }
  if (scope.global.heating_pipe) {
    push(lineItem('', '전체', 'plumbing_heating', p.pyeong, grade, 'per_m2'));
  }
  // 분배기 교체 — 설비 기본 포함 (기본 ON)
  if (scope.global.distribution_panel) {
    push(lineItem('', '전체', 'distribution_panel', 1, grade, 'per_set'));
  }
  // 배관 변경 — 옵션 (기본 OFF)
  if (scope.global.plumbing_relocation) {
    push(lineItem('', '전체', 'plumbing_relocation', 1, grade, 'per_set'));
  }

  // ===== 기타 묶음 (실리콘은 위에서 처리됨) =====
  if (scope.global.protection) {
    push(lineItem('', '전체', 'protection', 1, grade, 'per_set'));
  }
  if (scope.global.consent) {
    push(lineItem('', '전체', 'consent', 1, grade, 'per_set'));
  }
  if (scope.global.cleanup) {
    // 준공청소 — 평당 단위 (per_pyeong)
    push(lineItem('', '전체', 'cleanup', p.pyeong, grade, 'per_ea'));
  }
  if (scope.global.act_permit) {
    // 구청 행위허가 신고 — 구조변경·평면수정 시 필수 (확장과 독립)
    push(lineItem('', '전체', 'act_permit', 1, grade, 'per_set'));
  }

  // re-sequence ids
  items.forEach((it, i) => { it.id = String(i + 1); });
  return items;
}

/**
 * 자재마스터에 등록되지 않은 특수 라인의 카테고리 매핑.
 * (예: 구청 신고는 자재가 아니라 행정 비용 → '확장' 카테고리로 묶음.
 *  터닝도어는 자재마스터 work_type='turning_door' 자재가 등록되어 category='창호'로 자동 분류됨.)
 */
const SPECIAL_WORK_TYPE_CATEGORY: Record<string, string> = {
  expansion_report: '확장',
  act_permit: '확장',
  door_no_frame: '목공사',
};

/**
 * 카테고리 표시 통합 매핑 — 결과 화면에서 비슷한 성격의 카테고리를 하나로 합침.
 * '몰딩'·'걸레받이'는 사용자 관점에서 모두 목공 마감의 일부 → '목공사'로 통합.
 */
const CATEGORY_DISPLAY_ALIAS: Record<string, string> = {
  '몰딩': '목공사',
  '걸레받이': '목공사',
};

/**
 * LineItem을 어떤 CATEGORY로 묶을지 결정.
 * 우선순위: Material.category (자재마스터 등록 시) → 특수 매핑 → 기존 work_type 라벨 → '기타'.
 * 마지막에 CATEGORY_DISPLAY_ALIAS로 표시용 카테고리 통합.
 */
function categoryOf(it: LineItem): string {
  let cat: string;
  if (it.material_id) {
    const mat = getMaterialById(it.material_id);
    if (mat?.category) cat = mat.category;
    else cat = SPECIAL_WORK_TYPE_CATEGORY[it.work_type] || it.category || '기타';
  } else {
    cat = SPECIAL_WORK_TYPE_CATEGORY[it.work_type] || it.category || '기타';
  }
  return CATEGORY_DISPLAY_ALIAS[cat] ?? cat;
}

/** 합계 집계 + 지역/연식 보정 + 10만원 단위 반올림 */
export function aggregateTotals(items: LineItem[], property: Property): Totals {
  const by_work_type: Record<string, number> = {};
  const by_category: Record<string, number> = {};
  const by_room: Record<string, number> = {};
  let raw = 0;
  for (const it of items) {
    by_work_type[it.category] = (by_work_type[it.category] || 0) + it.subtotal;
    const cat = categoryOf(it);
    by_category[cat] = (by_category[cat] || 0) + it.subtotal;
    by_room[it.room] = (by_room[it.room] || 0) + it.subtotal;
    raw += it.subtotal;
  }

  // 지역 × 연식 보정 적용 + 10만원 반올림
  const adj = adjustmentMultiplier(property);
  const adjusted = raw * adj;
  const grand = roundToHundredK(adjusted);
  const low   = roundToHundredK(adjusted * 0.95);
  const high  = roundToHundredK(adjusted * 1.05);

  const vat = Math.round(grand * VAT_RATE);
  return {
    by_work_type,
    by_category,
    by_room,
    grand_total_raw: Math.round(raw),
    adjustment_multiplier: adj,
    grand_total: grand,
    grand_total_low: low,
    grand_total_high: high,
    vat,
    grand_total_with_vat: grand + vat,
    per_pyeong: property.pyeong > 0 ? Math.round(grand / property.pyeong) : 0,
  };
}

/** Quote 전체 빌드 */
export function buildQuote(
  property: Property,
  scope: Scope,
  grade: GradeSelection,
): Quote {
  const line_items = buildLineItems(property, scope, grade);
  const totals = aggregateTotals(line_items, property);
  return {
    quote_id: 'Q-' + new Date().toISOString().slice(0, 10) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    created_at: new Date().toISOString(),
    property,
    scope,
    grade,
    line_items,
    totals,
  };
}

/** 통화 포맷팅 */
export function fmtKRW(n: number): string {
  if (!Number.isFinite(n)) return '0원';
  return n.toLocaleString('ko-KR') + '원';
}

export function fmtKRWShort(n: number): string {
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(1) + '억';
  if (n >= 10_000) return Math.round(n / 10_000).toLocaleString('ko-KR') + '만원';
  return n.toLocaleString('ko-KR') + '원';
}

/**
 * 부가세 포함 환산 — 사용자에게 보이는 모든 가격은 이 함수로 변환.
 * 내부 계산(line_items.subtotal, totals.grand_total 등)은 부가세 별도로 유지.
 */
export function withVat(n: number): number {
  return Math.round(n * (1 + VAT_RATE));
}

/** 부가세 포함 통화 포맷팅 (사용자 표시용) */
export function fmtKRWVat(n: number): string {
  return fmtKRW(withVat(n));
}

export function fmtKRWShortVat(n: number): string {
  return fmtKRWShort(withVat(n));
}

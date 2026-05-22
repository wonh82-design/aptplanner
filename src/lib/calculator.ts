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
import { gradeGroupOf } from './types';
import {
  roomAreaForId, roomPerimeterForId, balconyArea, outsideWindowArea,
  exclusiveAreaM2, supplyAreaM2, switchOutletCount, activeRooms, activeBathrooms,
  bayWidthForRoom, balconyAreaForRoom, doorCount, downlightCount,
  bathroomArea, kitchenLength,
} from './areas';
import { getPrimaryMaterial, getMaterialById, labelOf } from './materials';

const WALL_RATIO = 2.8;             // 도배 면적 = 바닥 × 2.8 (벽면 환산)
const BASEBOARD_HEIGHT = 0.343;     // 걸레받이 ㎡ 환산 계수 (시트 v4 기준)
const VAT_RATE = 0.10;

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

/** LineItem 한 줄 생성 헬퍼. material이 없거나 qty=0이면 null 반환 */
function lineItem(
  id: string,
  room: string,
  workType: string,
  qty: number,
  grade: GradeSelection,
  fallbackUnit: string = 'per_ea',
): LineItem | null {
  if (qty <= 0) return null;
  // 우선순위: material_overrides > (work_type, effectiveGrade)의 주력자재
  const overrideId = grade.material_overrides?.[workType];
  const overrideMat = overrideId ? getMaterialById(overrideId) : null;
  // override가 해당 work_type이 아니면 무시 (안전망)
  const mat = overrideMat && overrideMat.work_type === workType
    ? overrideMat
    : getPrimaryMaterial(workType, effectiveGrade(workType, grade));
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

  // ===== 2. 샷시 — sash=Y 방의 외부창 분만 emit (베이폭 비율 안분) =====
  // v5 엑셀 정합: 외부창 면적 × (sash=Y 방의 베이폭 합 / 활성 방 전체 베이폭 합).
  // 확장 후 새 외부창은 외부창 면적 정의 자체에 포함되어 있으므로 별도 라인 emit 금지 (이중 계상 방지).
  const sashRooms = activeRooms(p).filter(r => scope.rooms[r as keyof Scope['rooms']]?.sash);
  if (sashRooms.length > 0) {
    const bayWidthSum = activeRooms(p).reduce((s, r) => s + bayWidthForRoom(r, p.pyeong), 0);
    if (bayWidthSum > 0) {
      for (const r of sashRooms) {
        const w = bayWidthForRoom(r, p.pyeong);
        const qty = windowArea * (w / bayWidthSum);
        push(lineItem('', r, 'window', qty, grade, 'per_m2'));
      }
    }
  }

  // ===== 3. 공간별: 바닥재 / 도배 / 몰딩 =====
  for (const roomId of activeRooms(p)) {
    const rs = scope.rooms[roomId as keyof Scope['rooms']];
    if (!rs) continue;
    const area = roomAreaForId(roomId, p.pyeong, p.bay);
    const perim = roomPerimeterForId(roomId, p.pyeong);

    if (rs.flooring) push(lineItem('', roomId, 'flooring', area, grade, 'per_m2'));
    if (rs.wallpaper) push(lineItem('', roomId, 'wallpaper', area * WALL_RATIO, grade, 'per_m2'));
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
  const bathComponentWorks = [
    'bath_jendai', 'bath_waterproof', 'bath_tile', 'bath_grout', 'bath_partition',
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
      if (wt === 'bath_waterproof' || wt === 'bath_tile' || wt === 'bath_grout' || wt === 'bath_ceiling') {
        // 면적 기준 — 욕실 벽 + 천정 (간단화: 욕실 면적 × 4.65)
        const baseArea = bathAreas[bath as keyof typeof bathAreas];
        qty = wt === 'bath_ceiling' ? baseArea : baseArea * 4.65;
      } else if (wt === 'bath_jendai' || wt === 'bath_partition' || wt === 'bath_basin'
                 || wt === 'bath_faucet' || wt === 'bath_toilet' || wt === 'bath_accessory') {
        qty = 1;
      }
      push(lineItem('', bath, wt, qty, grade));
    }
  }

  // 욕실 설치비 + 타일 시공팀
  const bathCount = activeBathrooms(p).filter(b =>
    b === '공용욕실' ? scope.global.common_bath_set : scope.global.master_bath_set
  ).length;
  if (bathCount > 0) {
    push(lineItem('', '전체', 'bath_install', bathCount, grade));
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
  if (scope.global.entry_furniture) push(lineItem('', '현관', 'general_furniture', 1, grade));

  // 붙박이장: 안방 2.4m, 작방 2m (기본)
  for (const roomId of activeRooms(p)) {
    const rs = scope.rooms[roomId as keyof Scope['rooms']];
    if (!rs?.closet) continue;
    const len = roomId === '안방' ? 2.4 : 2.0;
    push(lineItem('', roomId, 'closet', len, grade, 'per_m'));
  }

  // 시스템에어컨 (공간 매트릭스 ON 공간 수)
  const acRooms = activeRooms(p).filter(r => scope.rooms[r as keyof Scope['rooms']]?.aircon);
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
      // 구청 신고 — v4 시트 R111: 1,000,000원 (per_set). 자재마스터에 별도 SKU 없어 고정 라인.
      push({
        id: '',
        room: '전체',
        work_type: 'expansion_report',
        category: '구청 신고',
        unit_type: 'per_set',
        qty: 1,
        grade: grade.default,
        material_id: null,
        material_label: '현장시공 신고대행',
        unit_price: 1_000_000,
        subtotal: 1_000_000,
      });
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

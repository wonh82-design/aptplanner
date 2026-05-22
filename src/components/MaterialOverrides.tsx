'use client';

import { memo, useMemo, useState } from 'react';
import Image from 'next/image';
import type { Grade, GradeGroup, GradeSelection, Material, Property, Quote, RoomId, Scope } from '@/lib/types';
import { gradeGroupOf, isRecommendedGrade } from '@/lib/types';
import { getPrimaryMaterial, labelOf, materialsFor } from '@/lib/materials';
import { fmtKRWShort } from '@/lib/calculator';
import { activeRooms, clampPartitionLength } from '@/lib/areas';
import { normalizeImageUrl, placeholderImageUrl, shouldUseDummyImages } from '@/lib/image-utils';
import { WORK_BUNDLES, bundleForWorkType, type WorkBundle } from '@/lib/material-bundles';
import { BIG_WORK_GROUPS, defaultRoomsForWork, type BigWorkGroup } from '@/lib/scope-meta';
import { PRESETS } from '@/lib/scope-presets';
import { track } from '@/lib/analytics';
import { MaterialDetailModal } from './MaterialDetailModal';

type Props = {
  quote: Quote;
  value: GradeSelection;
  onChange: (next: GradeSelection) => void;
  /** 공사범위 프리셋·12 큰공종 ON/OFF에 필요 */
  scope?: Scope;
  onScopeChange?: (s: Scope) => void;
  /** 공사범위 프리셋·default 룸셋 결정에 필요 */
  property?: Property;
  /** 확장공사 카드 클릭 시 Step 1로 점프 */
  onJumpToProperty?: () => void;
};

// 사용자가 선택하는 등급 그룹 3개 (단일등급은 자동 폴백)
const GRADES: GradeGroup[] = ['가성비', '표준', '고급'];

const GRADE_META: Record<GradeGroup, { color: string; bg: string; ring: string; label: string }> = {
  '가성비':   { color: 'text-emerald-700', bg: 'bg-emerald-50',  ring: 'ring-emerald-300',  label: '실속·경제형' },
  '표준':     { color: 'text-blue-700',    bg: 'bg-blue-50',     ring: 'ring-blue-300',     label: '주류·균형형' },
  '고급':     { color: 'text-amber-700',   bg: 'bg-amber-50',    ring: 'ring-amber-300',    label: '프리미엄' },
  '단일등급': { color: 'text-zinc-700',    bg: 'bg-zinc-50',     ring: 'ring-zinc-300',     label: '단일' },
};

/**
 * '커스텀 구성' 행을 노출하는 번들 ID 화이트리스트.
 * 사용자가 세트 안의 개별 자재 등급을 변경해 등급이 섞이면(mixed),
 * 이 번들들에 한해 가성비 위에 '커스텀 구성' 행이 표시되고 현재 우리집 총공사비를 노출한다.
 */
const CUSTOM_ROW_BUNDLES = new Set<string>(['kitchen', 'bath']);

/**
 * '구성 자재 변경하기' 버튼·기능을 숨기는 번들 ID 목록.
 * 등급(가성비/표준/고급) 토글만 노출하고, 구성 자재 세부 조정은 제공 안 함.
 * 단순 단일 자재 묶음이거나 등급 외 세부 옵션이 의미 없는 번들에 적용.
 */
const HIDE_COMPONENTS_BUNDLES = new Set<string>([
  'aircon',       // 시스템 에어컨
  'electrical',   // 전기 공사
  'plumbing',     // 설비 공사
  'balcony',      // 발코니 마감
  'closet',       // 붙박이장
  'ceiling_fan',  // 실링팬
]);
const CUSTOM_META = {
  color: 'text-purple-700',
  bg: 'bg-purple-50',
  ring: 'ring-purple-300',
  label: '사용자 맞춤',
};

/** 한 work_type의 집계 정보 */
type WorkInfo = { wt: string; sub: number; totalQty: number; firstIdx: number };
/** 표시 단위: 단일 work_type 또는 묶음(bundle) */
type DisplayItem =
  | { kind: 'single'; work: WorkInfo; label: string; firstIdx: number }
  | { kind: 'bundle'; bundle: WorkBundle; works: WorkInfo[]; sub: number; firstIdx: number };

export function MaterialOverrides({
  quote, value, onChange,
  scope, onScopeChange,
  property, onJumpToProperty,
}: Props) {
  // 기본은 모든 항목 펼침 — 사용자가 모든 공종·자재를 한눈에 보고 선택하도록.
  // '주요 5개만 보기' 토글로 다시 압축 가능.
  const [showAll, setShowAll] = useState(true);
  // '자세히' 모달 — 어떤 work_type을 펼쳤는지
  const [detailWorkType, setDetailWorkType] = useState<string | null>(null);
  // 일괄 등급 선택 popover
  const [bulkOpen, setBulkOpen] = useState(false);
  // 공사범위 프리셋 — 마지막 적용된 ID (시각적 강조용)
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  // 1) 견적에 등장하는 work_type 집계 (등장 순서·총 qty 보존)
  const workInfoList = useMemo(() => {
    const map = new Map<string, WorkInfo>();
    quote.line_items.forEach((it, idx) => {
      if (!it.material_id) return;
      const prev = map.get(it.work_type);
      if (prev) {
        prev.sub += it.subtotal;
        prev.totalQty += it.qty;
      } else {
        map.set(it.work_type, { wt: it.work_type, sub: it.subtotal, totalQty: it.qty, firstIdx: idx });
      }
    });
    return Array.from(map.values());
  }, [quote.line_items]);

  // 2) bundle 단위로 그룹핑 → DisplayItem 리스트
  const displayItems = useMemo<DisplayItem[]>(() => {
    const bundleBuckets = new Map<string, { bundle: WorkBundle; works: WorkInfo[]; sub: number; firstIdx: number }>();
    const singles: WorkInfo[] = [];

    for (const w of workInfoList) {
      const b = bundleForWorkType(w.wt);
      if (b) {
        let bucket = bundleBuckets.get(b.id);
        if (!bucket) {
          bucket = { bundle: b, works: [], sub: 0, firstIdx: w.firstIdx };
          bundleBuckets.set(b.id, bucket);
        }
        bucket.works.push(w);
        bucket.sub += w.sub;
        if (w.firstIdx < bucket.firstIdx) bucket.firstIdx = w.firstIdx;
      } else {
        singles.push(w);
      }
    }

    const items: DisplayItem[] = [];
    for (const s of singles) items.push({ kind: 'single', work: s, label: labelOf(s.wt), firstIdx: s.firstIdx });
    for (const b of bundleBuckets.values()) items.push({ kind: 'bundle', bundle: b.bundle, works: b.works, sub: b.sub, firstIdx: b.firstIdx });
    // 정렬 키: bundle.displayOrder가 있으면 그 값, 없으면 firstIdx
    const sortKey = (it: DisplayItem) =>
      it.kind === 'bundle' && it.bundle.displayOrder !== undefined ? it.bundle.displayOrder : it.firstIdx;
    items.sort((a, b) => sortKey(a) - sortKey(b));
    return items;
  }, [workInfoList]);

  const TOP_N = 5;
  const visible = showAll ? displayItems : displayItems.slice(0, TOP_N);

  const effectiveGrade = (wt: string): GradeGroup =>
    (value.overrides[wt] as GradeGroup) ?? value.default;

  /** 단일 work_type 등급 변경 */
  function setGrade(wt: string, g: GradeGroup) {
    const overrides = { ...value.overrides, [wt]: g };
    const matOv = { ...value.material_overrides };
    delete matOv[wt];
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  /**
   * 특정 자재로 직접 변경 — material_overrides[wt] 설정.
   * overrides[wt]도 그 자재의 등급 그룹으로 설정해서 UI 등급 표시 일관성 유지.
   */
  function setMaterial(material: Material) {
    const wt = material.work_type;
    const group = gradeGroupOf(material.primary_grade as Grade);
    const overrides = { ...value.overrides, [wt]: group };
    const matOv = { ...value.material_overrides, [wt]: material.material_id };
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  /**
   * 일괄 등급 변경 — 모든 work_type에 같은 등급 적용.
   * 모든 overrides·material_overrides를 초기화하여 default 등급만 남긴다.
   */
  function setBulkGrade(g: GradeGroup) {
    onChange({ default: g, overrides: {}, material_overrides: {} });
    setBulkOpen(false);
  }

  /**
   * 공사범위 프리셋 적용 — scope 전체 일괄 변경.
   * 확장 관련 필드(expansion_current/after)는 PRESETS.apply 안에서 그대로 보존됨.
   */
  function applyScopePreset(presetId: string) {
    if (!scope || !onScopeChange || !property) return;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    track('select_preset', {
      preset_id: preset.id,
      preset_label: preset.label,
      pyeong: property.pyeong,
    });
    onScopeChange(preset.apply(property, scope));
    setAppliedPresetId(preset.id);
  }

  /**
   * 큰 공종 그룹(BIG_WORK_GROUPS) ON/OFF 토글.
   * 그룹 안의 globalKeys와 roomKeys를 일괄 변경. 확장은 Step 1로 점프.
   */
  function toggleGroup(group: BigWorkGroup) {
    if (!scope || !onScopeChange || !property) return;
    if (group.id === 'expansion') {
      onJumpToProperty?.();
      return;
    }
    const visibleRooms = activeRooms(property) as RoomId[];
    const turnOn = !isGroupActive(group);
    const nextRooms = { ...scope.rooms };
    const nextGlobal = { ...scope.global };

    // 목공사 — 카드 클릭 시: ON이면 기본 목공+천정만 ON
    if (group.id === 'carpentry') {
      if (turnOn) {
        nextGlobal.carpentry_base = true;
        nextGlobal.carpentry_ceiling = true;
      } else {
        nextGlobal.carpentry_base = false;
        nextGlobal.carpentry_ceiling = false;
        nextGlobal.no_molding = false;
        nextGlobal.no_door_frame = false;
        nextGlobal.no_baseboard = false;
        nextGlobal.partition_length = 0;
      }
      onScopeChange({ ...scope, rooms: nextRooms, global: nextGlobal });
      return;
    }

    if (group.globalKeys) {
      for (const k of group.globalKeys) {
        const v = nextGlobal[k];
        if (typeof v === 'boolean') {
          (nextGlobal as Record<string, unknown>)[k] = turnOn;
        }
      }
    }
    if (group.roomKeys) {
      for (const k of group.roomKeys) {
        if (turnOn) {
          let defaults: RoomId[] = defaultRoomsForWork(k, property, visibleRooms);
          if (defaults.length === 0) defaults = visibleRooms.slice();
          for (const r of visibleRooms) {
            nextRooms[r] = { ...nextRooms[r], [k]: defaults.includes(r) };
          }
        } else {
          for (const r of visibleRooms) {
            nextRooms[r] = { ...nextRooms[r], [k]: false };
          }
        }
      }
    }
    onScopeChange({ ...scope, rooms: nextRooms, global: nextGlobal });
  }

  /**
   * 특정 work_type을 scope에서 제외 (해당 scope 키 OFF).
   * line_items가 자동으로 빠져서 자재 카드도 사라짐.
   */
  function excludeWorkType(wt: string) {
    if (!scope || !onScopeChange || !property) return;
    const visibleRooms = activeRooms(property) as RoomId[];
    const nextRooms = { ...scope.rooms };
    const nextGlobal = { ...scope.global };

    // 룸 단위 work_type (모든 활성 룸의 키 OFF)
    const ROOM_KEY_MAP: Record<string, 'flooring' | 'wallpaper' | 'molding' | 'sash' | 'aircon' | 'closet' | 'ceiling_fan'> = {
      flooring: 'flooring',
      wallpaper: 'wallpaper',
      molding: 'molding',
      window: 'sash',
      aircon: 'aircon',
      aircon_outdoor: 'aircon',
      closet: 'closet',
      ceiling_fan: 'ceiling_fan',
    };
    if (wt in ROOM_KEY_MAP) {
      const k = ROOM_KEY_MAP[wt];
      for (const r of visibleRooms) {
        nextRooms[r] = { ...nextRooms[r], [k]: false };
      }
      onScopeChange({ ...scope, rooms: nextRooms, global: nextGlobal });
      return;
    }

    // 글로벌 단위 work_type
    const GLOBAL_KEY_MAP: Record<string, keyof typeof nextGlobal> = {
      base_work: 'demolition',
      insulation: 'insulation',
      electrical_base: 'electrical_base',
      electrical_switch: 'switch_outlet',
      induction_line: 'induction_line',
      plumbing_base: 'plumbing_base',
      thermostat: 'thermostat',
      plumbing_heating: 'heating_pipe',
      silicon_labor: 'silicon',
      balcony_floor_tile: 'balcony_floor_tile',
      balcony_paint: 'balcony_paint',
      sliding_door: 'middoor',
      general_furniture: 'entry_furniture',
      carpentry_base: 'carpentry_base',
      carpentry_ceiling: 'carpentry_ceiling',
    };
    if (wt in GLOBAL_KEY_MAP) {
      const k = GLOBAL_KEY_MAP[wt];
      if (typeof nextGlobal[k] === 'boolean') {
        (nextGlobal as Record<string, unknown>)[k] = false;
      }
      onScopeChange({ ...scope, rooms: nextRooms, global: nextGlobal });
      return;
    }

    // 특수 case
    if (wt === 'carpentry_partition') {
      nextGlobal.partition_length = 0;
      onScopeChange({ ...scope, rooms: nextRooms, global: nextGlobal });
      return;
    }
    if (wt === 'door_no_frame') {
      nextGlobal.no_door_frame = false;
      onScopeChange({ ...scope, rooms: nextRooms, global: nextGlobal });
      return;
    }

    // 매핑 없는 work_type (baseboard, turning_door 등) — 직접 제외 불가
    // (baseboard는 wallpaper OFF로 자동 제외, turning_door/expansion은 Step 1)
  }

  /**
   * 번들 단위 제외 — 번들의 모든 work_type을 OFF.
   */
  function excludeBundle(bundle: WorkBundle) {
    if (!scope || !onScopeChange || !property) return;
    const visibleRooms = activeRooms(property) as RoomId[];
    const nextRooms = { ...scope.rooms };
    const nextGlobal = { ...scope.global };

    switch (bundle.id) {
      case 'bath':
        nextGlobal.common_bath_set = false;
        nextGlobal.master_bath_set = false;
        break;
      case 'kitchen':
        nextGlobal.kitchen_set = false;
        break;
      case 'lighting':
        nextGlobal.lighting = false;
        break;
      case 'aircon':
        for (const r of visibleRooms) nextRooms[r] = { ...nextRooms[r], aircon: false };
        break;
      case 'ceiling_fan':
        for (const r of visibleRooms) nextRooms[r] = { ...nextRooms[r], ceiling_fan: false };
        break;
      case 'closet':
        for (const r of visibleRooms) nextRooms[r] = { ...nextRooms[r], closet: false };
        break;
      case 'balcony':
        nextGlobal.balcony_floor_tile = false;
        nextGlobal.balcony_paint = false;
        break;
      case 'electrical':
        nextGlobal.electrical_base = false;
        nextGlobal.switch_outlet = false;
        nextGlobal.induction_line = false;
        break;
      case 'plumbing':
        nextGlobal.plumbing_base = false;
        nextGlobal.thermostat = false;
        nextGlobal.heating_pipe = false;
        break;
      case 'middoor':
        nextGlobal.middoor = false;
        nextGlobal.entry_furniture = false;
        break;
      case 'carpentry':
        nextGlobal.carpentry_base = false;
        nextGlobal.carpentry_ceiling = false;
        nextGlobal.no_molding = false;
        nextGlobal.no_door_frame = false;
        nextGlobal.no_baseboard = false;
        nextGlobal.partition_length = 0;
        break;
    }
    onScopeChange({ ...scope, rooms: nextRooms, global: nextGlobal });
  }

  /** 그룹 활성 여부 */
  function isGroupActive(group: BigWorkGroup): boolean {
    if (!scope || !property) return false;
    const visibleRooms = activeRooms(property) as RoomId[];
    if (group.id === 'expansion') {
      return visibleRooms.some((r) => {
        const rs = scope.rooms[r];
        return !!rs && rs.expansion_after && !rs.expansion_current;
      });
    }
    if (group.id === 'carpentry') {
      if (scope.global.partition_length > 0) return true;
      if (group.globalKeys?.some((k) => scope.global[k])) return true;
      return false;
    }
    if (group.globalKeys?.some((k) => scope.global[k])) return true;
    if (group.roomKeys?.some((k) => visibleRooms.some((r) => Boolean(scope.rooms[r]?.[k])))) return true;
    return false;
  }

  /** 그 work_type에 현재 적용된 자재 ID (material_override 우선, 없으면 primary) */
  function effectiveMaterialIdOf(wt: string): string | null {
    const matOv = value.material_overrides[wt];
    if (matOv) return matOv;
    const g = effectiveGrade(wt);
    return getPrimaryMaterial(wt, g)?.material_id ?? null;
  }

  /** Bundle 등급 일괄 변경 — 내부 모든 work_type에 같은 등급 + material override 해제 */
  function setBundleGrade(bundle: WorkBundle, g: GradeGroup) {
    const overrides = { ...value.overrides };
    const matOv = { ...value.material_overrides };
    for (const wt of bundle.workTypes) {
      overrides[wt] = g;
      delete matOv[wt];
    }
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  function clearOverride(wt: string) {
    const overrides = { ...value.overrides };
    delete overrides[wt];
    const matOv = { ...value.material_overrides };
    delete matOv[wt];
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  function clearBundleOverride(bundle: WorkBundle) {
    const overrides = { ...value.overrides };
    const matOv = { ...value.material_overrides };
    for (const wt of bundle.workTypes) {
      delete overrides[wt];
      delete matOv[wt];
    }
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  // 공사범위 프리셋·12 공종 그룹 ON/OFF UI는 scope/property 전달 시에만 활성
  const canEditScope = !!(scope && onScopeChange && property);

  return (
    <section className="rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-zinc-200">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-base font-semibold">공종 및 자재 세부 선택</h2>
        <span className="text-[11px] text-zinc-500">{displayItems.length}개 항목</span>
      </div>

      {/* ===== 프리셋 행: 공사범위 + 일괄 등급 ===== */}
      {canEditScope && (
        <div className="mb-4 space-y-2.5">
          {/* 공사범위 프리셋 */}
          <div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-zinc-700">⚡ 공사범위 프리셋</span>
              <span className="text-[10px] text-zinc-400">대표 시나리오 한 번에 적용</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {PRESETS.map((preset, idx) => {
                const isApplied = appliedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyScopePreset(preset.id)}
                    className={`flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2 text-left transition active:scale-[0.98] ${
                      isApplied
                        ? 'border-emerald-400 bg-emerald-50/70 ring-1 ring-emerald-200'
                        : 'border-zinc-200 bg-white hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className={`text-[9px] font-mono font-bold ${isApplied ? 'text-emerald-700' : 'text-blue-600'}`}>
                        PRESET {idx + 1}
                      </span>
                      {isApplied && (
                        <span className="ml-auto text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded">
                          ✓ 적용됨
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-zinc-900">{preset.label}</span>
                    <span className="text-[10px] text-zinc-500 leading-tight">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 자재등급 프리셋 + 일괄 토글 */}
          <div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-zinc-700">🎨 자재 등급 프리셋</span>
              <span className="text-[10px] text-zinc-400">모든 공종에 일괄 적용</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['가성비', '표준', '고급'] as GradeGroup[]).map((g) => {
                const meta = GRADE_META[g];
                const selected = value.default === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setBulkGrade(g)}
                    className={`px-3 py-2 rounded-lg border-2 text-left transition active:scale-[0.98] ${
                      selected ? `${meta.ring.replace('ring-', 'border-')} ${meta.bg} ring-1 ${meta.ring}` : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm font-bold ${selected ? meta.color : 'text-zinc-700'}`}>{g}</span>
                      {selected && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.5 rounded whitespace-nowrap">현재</span>
                      )}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${selected ? meta.color : 'text-zinc-500'}`}>{meta.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      <p className="text-xs text-zinc-500 mb-4">
        공종마다 가성비·표준·고급의 <strong>주력 자재</strong>와 <strong>우리집 총공사비</strong>를 한눈에 비교하고 선택하세요.
        에어컨·조명·욕실·주방은 세트로 묶어 표시됩니다.
      </p>

      <div className="space-y-3">
        {visible.map((item, i) =>
          item.kind === 'single' ? (
            <SingleCard
              key={`s-${item.work.wt}-${i}`}
              work={item.work}
              label={item.label}
              effectiveGrade={effectiveGrade(item.work.wt)}
              effectiveMaterialId={effectiveMaterialIdOf(item.work.wt)}
              hasOverride={
                value.overrides[item.work.wt] !== undefined ||
                value.material_overrides[item.work.wt] !== undefined
              }
              onSelectMaterial={setMaterial}
              onClear={() => clearOverride(item.work.wt)}
              onShowDetail={() => setDetailWorkType(item.work.wt)}
              onExclude={canEditScope ? () => excludeWorkType(item.work.wt) : undefined}
            />
          ) : (
            <BundleCard
              key={`b-${item.bundle.id}-${i}`}
              bundle={item.bundle}
              works={item.works}
              totalSub={item.sub}
              gradeSelection={value}
              effectiveGrade={effectiveGrade}
              onSelectBundleGrade={(g) => setBundleGrade(item.bundle, g)}
              onSelectComponentGrade={(wt, g) => setGrade(wt, g)}
              onClearBundle={() => clearBundleOverride(item.bundle)}
              onShowDetail={(wt) => setDetailWorkType(wt)}
              onExclude={canEditScope ? () => excludeBundle(item.bundle) : undefined}
              scope={scope}
              onScopeChange={onScopeChange}
            />
          )
        )}
      </div>

      {/* '자세히' 모달 — 등급별 자재 비교 */}
      {detailWorkType && (
        <MaterialDetailModal
          workType={detailWorkType}
          currentGrade={effectiveGrade(detailWorkType)}
          onClose={() => setDetailWorkType(null)}
        />
      )}

      {displayItems.length > TOP_N && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2 py-2"
        >
          {showAll ? `주요 ${TOP_N}개만 보기` : `전체 ${displayItems.length}개 항목 펼치기 (현재 ${TOP_N}개 표시)`}
        </button>
      )}
    </section>
  );
}

// =====================================================
// SingleCard — 단일 work_type 한 카드 (기존 동작 유지)
// =====================================================

/**
 * 같은 등급그룹 내 '추천(primary)' 판정 — primary_grade 가 "X 추천" 인 자재가 primary.
 * 없으면 그룹 내 첫 번째 자재가 primary.
 */
function isPrimaryMaterial(m: Material, allInGrade: Material[]): boolean {
  const recommended = allInGrade.filter((x) => isRecommendedGrade(x.primary_grade as Grade));
  if (recommended.length > 0) return recommended[0].material_id === m.material_id;
  return allInGrade[0]?.material_id === m.material_id;
}

/**
 * SingleCard — 한 work_type의 모든 자재를 카드 그리드로 나열.
 * 등급 순(가성비 → 표준 → 고급), 같은 등급 내 추천(primary)이 먼저.
 * 카드 클릭 시 material_override 설정 — 그 자재로 즉시 변경.
 */
function SingleCard({
  work, label, effectiveGrade: curGrade, effectiveMaterialId, hasOverride,
  onSelectMaterial, onClear, onShowDetail, onExclude,
}: {
  work: WorkInfo;
  label: string;
  effectiveGrade: GradeGroup;
  effectiveMaterialId: string | null;
  hasOverride: boolean;
  onSelectMaterial: (m: Material) => void;
  onClear: () => void;
  onShowDetail: () => void;
  /** "이 공종 제외" 클릭 — 미전달 시 버튼 숨김 */
  onExclude?: () => void;
}) {
  // 그 work_type의 모든 자재 (현장시공 제외)
  const allMaterials = materialsFor(work.wt).filter((m) => m.brand !== '현장시공');

  // 등급 그룹별 그룹핑 → 각 그룹 안에서 추천(primary) 먼저 정렬
  const sortedMaterials = (() => {
    const byGroup = new Map<GradeGroup, Material[]>();
    for (const m of allMaterials) {
      const group = gradeGroupOf(m.primary_grade as Grade);
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group)!.push(m);
    }
    const out: Array<{ material: Material; isPrimary: boolean }> = [];
    for (const g of (['가성비', '표준', '고급', '단일등급'] as GradeGroup[])) {
      const list = byGroup.get(g) ?? [];
      // primary 먼저
      const primaryIdx = list.findIndex((m) => isRecommendedGrade(m.primary_grade as Grade));
      const ordered = primaryIdx >= 0
        ? [list[primaryIdx], ...list.filter((_, i) => i !== primaryIdx)]
        : list;
      for (const m of ordered) {
        out.push({ material: m, isPrimary: isPrimaryMaterial(m, list) });
      }
    }
    return out;
  })();

  return (
    <div className={`rounded-lg border ${hasOverride ? 'border-blue-300' : 'border-zinc-200'}`}>
      {/* 헤더 — 공종명 옆에 [제외] [자세히] 버튼 */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50/50 border-b border-zinc-200/70 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-semibold text-zinc-900 truncate">{label}</span>
          {onExclude && <ExcludeButton onExclude={onExclude} />}
          <DetailButton onClick={onShowDetail} label={`${label} 자세히 보기`} />
          {hasOverride && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium whitespace-nowrap">개별 설정</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] text-zinc-500 tabular-nums whitespace-nowrap">현재 {fmtKRWShort(work.sub)}</span>
          {hasOverride && (
            <button onClick={onClear} className="text-[10px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2 whitespace-nowrap">
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 자재 카드 — 한 행 가로 스크롤 (등급 순서 보존, 우측으로 스크롤하여 나머지 확인) */}
      {sortedMaterials.length === 0 ? (
        <div className="px-3 py-6 text-center text-xs text-zinc-400 italic">
          등록된 자재가 없습니다
        </div>
      ) : (
        <div className="relative">
          <div
            className="flex gap-2 overflow-x-auto p-2.5 snap-x snap-mandatory scrollbar-thin"
            style={{ scrollbarWidth: 'thin' }}
          >
            {sortedMaterials.map(({ material, isPrimary }) => (
              <div
                key={material.material_id}
                className="flex-shrink-0 w-40 sm:w-44 snap-start"
              >
                <MaterialCard
                  material={material}
                  isPrimary={isPrimary}
                  isSelected={effectiveMaterialId === material.material_id}
                  totalQty={work.totalQty}
                  onSelect={() => onSelectMaterial(material)}
                />
              </div>
            ))}
          </div>
          {/* 우측 페이드 — 더 있음을 시각적으로 암시 (스크롤 가능 시) */}
          {sortedMaterials.length > 4 && (
            <div className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// MaterialCard — 자재 1개를 시각 카드로 표시
//   상단: 등급 배지 + (추천이면) '추천' 마커
//   이미지: 4:3, image_url 우선 / dev면 picsum 더미
//   본문: brand + product_line + installer_spec
//   하단: 우리집 총공사비 (qty × total_unit_price)
//   선택 시: blue ring
// =====================================================

const MaterialCard = memo(function MaterialCard({
  material, isPrimary, isSelected, totalQty, onSelect,
}: {
  material: Material;
  isPrimary: boolean;
  isSelected: boolean;
  totalQty: number;
  onSelect: () => void;
}) {
  // 색상은 그룹 기준 (가성비/표준/고급/단일등급) — "표준 추천" 도 표준 색
  const meta = GRADE_META[gradeGroupOf(material.primary_grade as Grade)];
  const isRecommended = isRecommendedGrade(material.primary_grade as Grade);
  const homeTotal = Math.round(totalQty * material.total_unit_price);
  const realUrl = normalizeImageUrl(material.image_url ?? null, 600);
  const useDummy = !realUrl && shouldUseDummyImages();
  const imageUrl = realUrl || (useDummy ? placeholderImageUrl(material.material_id, 600) : null);

  // 자재 카드는 자체 클릭 + 내부에 제조사 페이지 a 링크를 함께 포함 → button 중첩 방지 위해 div + role=button
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      className={`group relative w-full flex flex-col rounded-lg border-2 overflow-hidden text-left transition-all active:scale-[0.99] cursor-pointer ${
        isSelected
          ? `${meta.ring.replace('ring-', 'border-')} ring-2 ${meta.ring} shadow-md`
          : 'border-zinc-200 hover:border-zinc-400 hover:shadow-sm'
      }`}
    >
      {/* 상단 등급 배지 — 자재의 primary_grade 그대로 표시 (예: "표준 추천", "고급") */}
      <div className={`${meta.bg} px-2 py-1 flex items-center gap-1 border-b ${
        isSelected ? meta.ring.replace('ring-', 'border-') : 'border-zinc-200'
      }`}>
        {isRecommended && <span className={`text-[10px] ${meta.color}`}>★</span>}
        <span className={`text-[10px] font-bold ${meta.color}`}>{material.primary_grade}</span>
        {isSelected && (
          <span className="ml-auto flex-shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      {/* 이미지 */}
      <MaterialCardImage
        url={imageUrl}
        alt={`${material.brand ?? ''} ${material.product_line ?? ''}`.trim()}
        isDummy={useDummy && !realUrl}
      />

      {/* 본문 — brand/product_line + 제조사 링크 + spec + 가격 */}
      <div className="flex-1 px-2 py-1.5 flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-1">
          <div className="text-[11px] font-bold text-zinc-900 leading-tight line-clamp-2 min-h-[2.4em] flex-1 min-w-0">
            {material.brand} {material.product_line}
          </div>
          {material.vendor_url && (
            <a
              href={material.vendor_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              title="제조사 페이지 새 창으로 열기"
              aria-label="제조사 페이지"
              className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border border-zinc-200 bg-white text-zinc-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
        {material.installer_spec && (
          <div className="text-[9.5px] text-zinc-500 leading-snug line-clamp-2" title={material.installer_spec}>
            {material.installer_spec}
          </div>
        )}
        <div className="mt-1 pt-1 border-t border-zinc-100 flex items-baseline justify-between gap-1">
          <span className="text-[9px] text-zinc-500">우리집</span>
          <span className={`text-xs font-bold tabular-nums ${isSelected ? meta.color : 'text-zinc-900'}`}>
            {fmtKRWShort(homeTotal)}
          </span>
        </div>
      </div>
    </div>
  );
});

function MaterialCardImage({ url, alt, isDummy = false }: { url: string | null; alt: string; isDummy?: boolean }) {
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div className="aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center border-b border-zinc-200">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] bg-zinc-50 border-b border-zinc-200 overflow-hidden">
      <Image
        src={url}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, 240px"
        onError={() => setErrored(true)}
        className="object-cover group-hover:scale-105 transition-transform duration-300"
        // Drive 등 외부 origin: referrer 차단으로 hotlink 회피
        referrerPolicy="no-referrer"
        // 카드는 페이지에 동시에 여러 개 — 기본 lazy 그대로
        unoptimized={url.includes('drive.google.com')}
      />
      {isDummy && (
        <span className="absolute top-1 left-1 text-[7px] font-bold uppercase tracking-wider px-1 py-0 rounded bg-amber-500/90 text-white shadow-sm z-10">
          샘플
        </span>
      )}
    </div>
  );
}

// =====================================================
// 번들 내부의 모든 work_type에 대해 해당 등급의 주력 자재 description을 합쳐 반환.
// installer_spec(시공자용 풀스펙)을 우선 사용하고, 없으면 brand+product_line으로 폴백.
// 같은 라벨이 중복되면 제거(예: 욕실 풀세트의 동일 브랜드 묶음).
// =====================================================
function bundleMaterialSummary(works: WorkInfo[], grade: GradeGroup): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const w of works) {
    const mat = getPrimaryMaterial(w.wt, grade);
    if (!mat) continue;
    const label =
      mat.installer_spec?.trim() ||
      [mat.brand, mat.product_line].filter(Boolean).join(' ').trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    parts.push(label);
  }
  return parts.join(' + ');
}

// =====================================================
// BundleCard — 여러 work_type을 묶어 한 세트로 표시
// =====================================================

function BundleCard({
  bundle, works, totalSub, gradeSelection, effectiveGrade,
  onSelectBundleGrade, onSelectComponentGrade, onClearBundle,
  onShowDetail, onExclude,
  scope, onScopeChange,
}: {
  bundle: WorkBundle;
  works: WorkInfo[];
  totalSub: number;
  gradeSelection: GradeSelection;
  effectiveGrade: (wt: string) => GradeGroup;
  onSelectBundleGrade: (g: GradeGroup) => void;
  onSelectComponentGrade: (wt: string, g: GradeGroup) => void;
  onClearBundle: () => void;
  /** 번들 안의 특정 work_type을 자세히 보기 모달로 열기 */
  onShowDetail: (workType: string) => void;
  /** "이 공종 제외" — 미전달 시 버튼 숨김 */
  onExclude?: () => void;
  scope?: Scope;
  onScopeChange?: (s: Scope) => void;
}) {
  const [showComponents, setShowComponents] = useState(false);

  // 세트 effective grade: 모든 work_type이 같은 등급이면 그 등급, 아니면 'mixed'
  const grades = works.map(w => effectiveGrade(w.wt));
  const uniqueGrades = new Set(grades);
  const bundleGrade: GradeGroup | 'mixed' = uniqueGrades.size === 1 ? grades[0] : 'mixed';

  // 사용자가 등급/자재 override 했는지
  const hasAnyOverride = works.some(w =>
    gradeSelection.overrides[w.wt] !== undefined ||
    gradeSelection.material_overrides[w.wt] !== undefined
  );

  // 각 등급별 세트 합계 — works가 바뀌지 않는 한 캐시
  const totalsByGrade = useMemo(() => {
    const out: Record<GradeGroup, number> = { '가성비': 0, '표준': 0, '고급': 0, '단일등급': 0 };
    for (const g of GRADES) {
      let t = 0;
      for (const w of works) {
        const mat = getPrimaryMaterial(w.wt, g);
        if (mat) t += w.totalQty * mat.total_unit_price;
      }
      out[g] = Math.round(t);
    }
    return out;
  }, [works]);
  const bundleTotalAtGrade = (g: GradeGroup) => totalsByGrade[g];

  return (
    <div className={`rounded-lg border ${hasAnyOverride ? 'border-blue-300' : 'border-zinc-200'}`}>
      {/* 헤더 — 모바일: 2단 / sm+: 1단 */}
      <div className="px-3 py-2 bg-zinc-50/50 border-b border-zinc-200/70
                      flex flex-col gap-2
                      sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-zinc-900">{bundle.label}</span>
            {onExclude && <ExcludeButton onExclude={onExclude} />}
            {works.length > 0 && (
              <DetailButton
                onClick={() => onShowDetail(works[0].wt)}
                label={`${bundle.label} 자세히 보기`}
              />
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 font-medium whitespace-nowrap">
              세트 · {works.length}개 자재
            </span>
            {hasAnyOverride && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                개별 설정
              </span>
            )}
            {bundleGrade === 'mixed' && (
              CUSTOM_ROW_BUNDLES.has(bundle.id) ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-medium whitespace-nowrap">
                  커스텀 구성
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium whitespace-nowrap">
                  등급 혼합
                </span>
              )
            )}
          </div>
          {bundle.desc && (
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{bundle.desc}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          <span className="text-[11px] text-zinc-500 tabular-nums whitespace-nowrap">
            현재 {fmtKRWShort(totalSub)}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {!HIDE_COMPONENTS_BUNDLES.has(bundle.id) && (
              <button
                onClick={() => setShowComponents(s => !s)}
                className={`text-[10px] font-semibold px-2 py-1 rounded border transition whitespace-nowrap ${
                  showComponents
                    ? 'bg-zinc-800 text-white border-zinc-800'
                    : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500'
                }`}
                title="세트 안의 개별 자재를 다른 등급으로 변경"
              >
                <span className="hidden sm:inline">구성 자재 변경하기 </span>
                <span className="sm:hidden">구성 자재 </span>
                {showComponents ? '▲' : '▼'}
              </button>
            )}
            {hasAnyOverride && (
              <button
                onClick={onClearBundle}
                className="text-[10px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2 whitespace-nowrap"
                title="세트 전체를 기본값으로 되돌립니다"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 등급별 행 — 세트 합계 */}
      <div className="divide-y divide-zinc-100">
        {/*
         * 커스텀 구성 행 (가성비 위 위치)
         * - 주방·욕실 풀세트에서만 노출
         * - 사용자가 개별 자재 등급을 바꿔 등급이 섞인(mixed) 상태일 때만 노출
         * - 클릭 불가 (현재 상태 표시 전용). 다른 등급 행을 클릭하면 전체 일괄로 돌아간다.
         */}
        {CUSTOM_ROW_BUNDLES.has(bundle.id) && bundleGrade === 'mixed' && (
          <div
            aria-current="true"
            className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 ${CUSTOM_META.bg} ring-2 ring-inset ${CUSTOM_META.ring}`}
          >
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 flex-shrink-0 border-current ${CUSTOM_META.color}`}>
              <span className={`w-2 h-2 rounded-full bg-current ${CUSTOM_META.color}`} />
            </span>
            <div className="flex-shrink-0 sm:min-w-[80px]">
              <div className={`text-xs font-bold ${CUSTOM_META.color}`}>커스텀 구성</div>
              <div className="text-[10px] text-zinc-500 leading-tight hidden sm:block">{CUSTOM_META.label}</div>
            </div>
            <div className="flex-1 min-w-0 hidden sm:block">
              <div className="text-[11px] text-zinc-500 truncate">
                {works.length}개 자재 개별 설정 — {bundle.label}
              </div>
            </div>
            <div className="flex-shrink-0 text-right ml-auto">
              <div className={`text-sm font-bold tabular-nums ${CUSTOM_META.color}`}>
                {fmtKRWShort(totalSub)}
              </div>
              <div className="text-[10px] text-zinc-500">우리집 총공사비</div>
            </div>
          </div>
        )}
        {GRADES.map(g => {
          const total = bundleTotalAtGrade(g);
          const selected = bundleGrade === g;
          const meta = GRADE_META[g];
          return (
            <button
              key={g}
              type="button"
              onClick={() => onSelectBundleGrade(g)}
              className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left transition
                ${selected ? `${meta.bg} ring-2 ring-inset ${meta.ring}` : 'bg-white hover:bg-zinc-50'}`}
            >
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition flex-shrink-0
                ${selected ? `border-current ${meta.color}` : 'border-zinc-300'}`}>
                {selected && <span className={`w-2 h-2 rounded-full bg-current ${meta.color}`} />}
              </span>
              <div className="flex-shrink-0 sm:min-w-[80px]">
                <div className={`text-xs font-bold ${meta.color}`}>{g} 세트</div>
                <div className="text-[10px] text-zinc-500 leading-tight hidden sm:block">{meta.label}</div>
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                {/* 등급별 주력 자재 리스트 — installer_spec 우선, brand·product fallback */}
                <div className="text-[11px] text-zinc-500 truncate" title={bundleMaterialSummary(works, g)}>
                  {bundleMaterialSummary(works, g) || `${works.length}개 자재 일괄 적용`}
                </div>
              </div>
              <div className="flex-shrink-0 text-right ml-auto">
                <div className={`text-sm font-bold tabular-nums ${selected ? meta.color : 'text-zinc-900'}`}>
                  {fmtKRWShort(total)}
                </div>
                <div className="text-[10px] text-zinc-500">우리집 총공사비</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 구성 자재 영역 (펼침 시) — carpentry는 sub-work 토글, 그 외 bundle은 등급 토글.
          HIDE_COMPONENTS_BUNDLES에 속한 번들은 펼침 자체 비활성. */}
      {showComponents && !HIDE_COMPONENTS_BUNDLES.has(bundle.id) && (
        bundle.id === 'carpentry' && scope && onScopeChange ? (
          <CarpentryScopePanel scope={scope} onScopeChange={onScopeChange} />
        ) : (
          <div className="border-t-2 border-zinc-200 bg-zinc-50/40 px-3 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
              구성 자재 — 항목별로 다른 등급 선택 가능
            </div>
            <div className="space-y-1.5">
              {works.map(w => (
                <ComponentRow
                  key={w.wt}
                  work={w}
                  effectiveGrade={effectiveGrade(w.wt)}
                  onSelectGrade={(g) => onSelectComponentGrade(w.wt, g)}
                  onShowDetail={() => onShowDetail(w.wt)}
                />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// =====================================================
// CarpentryScopePanel — 목공사 6 sub-work 토글 UI
// =====================================================

function CarpentryScopePanel({
  scope, onScopeChange,
}: {
  scope: Scope;
  onScopeChange: (s: Scope) => void;
}) {
  const g = scope.global;
  const setBool = (k: keyof typeof g, v: boolean) =>
    onScopeChange({ ...scope, global: { ...g, [k]: v } });
  const setNum = (k: keyof typeof g, v: number) =>
    onScopeChange({ ...scope, global: { ...g, [k]: v } });

  return (
    <div className="border-t-2 border-zinc-200 bg-zinc-50/40 px-3 py-3 space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
        목공사 세부 공종 — 필요한 항목만 선택
      </div>

      <CarpentryToggle
        on={g.carpentry_base}
        onChange={(v) => setBool('carpentry_base', v)}
        title="기본 목공사"
        desc="문틀·문선·기본 보강. 올철거 리모델링 시 거의 필수"
      />
      <CarpentryToggle
        on={g.carpentry_ceiling}
        onChange={(v) => setBool('carpentry_ceiling', v)}
        title="천정 공사"
        desc="평천 ↔ 우물천정 변경, 매입조명 박스, 기타 천정 수정"
      />

      {/* 가벽 — 길이 입력 */}
      <div className="rounded-md bg-white border border-zinc-200 px-3 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-zinc-900">가벽 공사</div>
          <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">가벽 철거·신설 필요 시 길이(m) 입력</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={g.partition_length}
            onChange={(e) => setNum('partition_length', clampPartitionLength(Number(e.target.value) || 0))}
            className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-xs text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <span className="text-[11px] text-zinc-600">m</span>
        </div>
      </div>

      <CarpentryToggle
        on={g.no_molding}
        onChange={(v) => setBool('no_molding', v)}
        title="무몰딩"
        desc="천장-벽 접점을 몰딩 대신 목공+도배로 마감 (추가 비용 발생)"
        warning
      />
      <CarpentryToggle
        on={g.no_door_frame}
        onChange={(v) => setBool('no_door_frame', v)}
        title="무문선"
        desc="문 주변 문선 대신 매입 보강+도배로 마감 (문짝당 10만원)"
        warning
      />
      <CarpentryToggle
        on={g.no_baseboard}
        onChange={(v) => setBool('no_baseboard', v)}
        title="무걸레받이"
        desc="벽-바닥 접점을 걸레받이 대신 목공+도배로 마감 (추가 비용 발생)"
        warning
      />
    </div>
  );
}

function CarpentryToggle({
  on, onChange, title, desc, warning = false,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc: string;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition active:scale-[0.99] ${
        on
          ? (warning ? 'border-amber-400 bg-amber-50' : 'border-blue-400 bg-blue-50')
          : 'border-zinc-200 bg-white hover:bg-zinc-50'
      }`}
    >
      <span className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border-2 ${
        on
          ? (warning ? 'border-amber-500 bg-amber-500 text-white' : 'border-blue-600 bg-blue-600 text-white')
          : 'border-zinc-300 bg-white'
      }`}>
        {on && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold ${on ? (warning ? 'text-amber-900' : 'text-blue-900') : 'text-zinc-900'}`}>
          {title}
          {warning && <span className="ml-1.5 text-[9px] text-amber-700 font-normal">옵션</span>}
        </div>
        <div className="text-[10px] text-zinc-600 leading-tight mt-0.5">{desc}</div>
      </div>
    </button>
  );
}

// =====================================================
// ComponentRow — bundle 내부의 개별 자재 한 줄
// =====================================================

function ComponentRow({
  work, effectiveGrade, onSelectGrade, onShowDetail,
}: {
  work: WorkInfo;
  effectiveGrade: GradeGroup;
  onSelectGrade: (g: GradeGroup) => void;
  onShowDetail: () => void;
}) {
  const label = labelOf(work.wt);
  const currentMat = getPrimaryMaterial(work.wt, effectiveGrade);

  return (
    <div className="flex items-center gap-2 rounded-md bg-white border border-zinc-200 px-2.5 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-zinc-900 truncate flex items-center gap-1.5">
          <span className="truncate">{label}</span>
          <DetailButton onClick={onShowDetail} label={`${label} 자세히 보기`} />
        </div>
        {currentMat && (
          <div className="text-[10px] text-zinc-500 truncate">
            {currentMat.brand} {currentMat.product_line}
          </div>
        )}
      </div>
      {/* 등급 토글 3버튼 */}
      <div className="inline-flex rounded-md border border-zinc-200 overflow-hidden text-[10px] flex-shrink-0">
        {GRADES.map(g => {
          const selected = effectiveGrade === g;
          const meta = GRADE_META[g];
          return (
            <button
              key={g}
              type="button"
              onClick={() => onSelectGrade(g)}
              className={`px-2 py-1 border-r last:border-r-0 border-r-zinc-200 transition ${
                selected ? `${meta.bg} ${meta.color} font-bold` : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// BulkGradeButton — 일괄로 모든 공종 등급 변경 (헤더 통합)
// =====================================================

function BulkGradeButton({
  currentGrade, isOpen, onToggleOpen, onSelect, onClose,
}: {
  currentGrade: GradeGroup;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelect: (g: GradeGroup) => void;
  onClose: () => void;
}) {
  const meta = GRADE_META[currentGrade];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white hover:border-blue-400 hover:bg-blue-50 text-xs font-semibold text-zinc-800 transition whitespace-nowrap"
        title="모든 공종 자재를 한 번에 같은 등급으로 변경"
      >
        <span>일괄로 등급 선택하기</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
          현재: {currentGrade}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 외부 클릭 시 닫힘 */}
          <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden />
          <div className="absolute right-0 mt-1.5 w-64 rounded-lg border border-zinc-200 bg-white shadow-xl z-30 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
              <div className="text-[11px] font-bold text-zinc-900">전체 공종 등급 일괄 변경</div>
              <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                현재 개별 설정한 항목도 모두 새 등급으로 덮어씁니다
              </div>
            </div>
            <div className="p-1.5 space-y-1">
              {(['가성비', '표준', '고급'] as GradeGroup[]).map((g) => {
                const m = GRADE_META[g];
                const selected = currentGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onSelect(g)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition ${
                      selected ? `${m.bg} ${m.ring} ring-1` : 'hover:bg-zinc-50'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                      selected ? `border-current ${m.color}` : 'border-zinc-300'
                    }`}>
                      {selected && <span className={`w-2 h-2 rounded-full bg-current ${m.color}`} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${m.color}`}>{g}</div>
                      <div className="text-[10px] text-zinc-500 leading-tight">{m.label}</div>
                    </div>
                    {selected && (
                      <span className="text-[9px] font-bold text-zinc-500">현재</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// ExcludeButton — 타이틀 바에 들어가는 작은 '이 공종 제외' 버튼.
//   클릭 시 onExclude 호출 → scope OFF → 카드 자동 사라짐.
//   사용자는 공사범위 프리셋을 다시 클릭하면 그 공종이 다시 추가됨.
// =====================================================

function ExcludeButton({ onExclude }: { onExclude: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onExclude(); }}
      title="이 공종을 견적에서 제외 (공사범위 프리셋 다시 선택 시 복원)"
      className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-zinc-300 bg-white text-zinc-500 hover:border-red-400 hover:bg-red-50 hover:text-red-700 text-[10px] font-semibold transition whitespace-nowrap"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      <span>제외</span>
    </button>
  );
}

// =====================================================
// DetailButton — '자세히' (i) 작은 버튼
// =====================================================

function DetailButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      title={label}
      className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-zinc-300 bg-white hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-zinc-600 text-[10px] font-semibold transition whitespace-nowrap"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <span>자세히</span>
    </button>
  );
}

// 미사용 import 회피 (Quote 타입은 props에서 사용)
void WORK_BUNDLES;

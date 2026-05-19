'use client';

import { memo, useMemo, useState } from 'react';
import type { Grade, GradeSelection, Material, Quote, Scope } from '@/lib/types';
import { getPrimaryMaterial, labelOf } from '@/lib/materials';
import { fmtKRWShort } from '@/lib/calculator';
import { clampPartitionLength } from '@/lib/areas';
import { WORK_BUNDLES, bundleForWorkType, type WorkBundle } from '@/lib/material-bundles';
import { MaterialDetailModal } from './MaterialDetailModal';

type Props = {
  quote: Quote;
  value: GradeSelection;
  onChange: (next: GradeSelection) => void;
  /** 목공사 sub-work 토글에 필요 (carpentry bundle 전용) */
  scope?: Scope;
  onScopeChange?: (s: Scope) => void;
};

const GRADES: Grade[] = ['가성비', '표준', '고급'];

const GRADE_META: Record<Grade, { color: string; bg: string; ring: string; label: string }> = {
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

export function MaterialOverrides({ quote, value, onChange, scope, onScopeChange }: Props) {
  const [showAll, setShowAll] = useState(false);
  // '자세히' 모달 — 어떤 work_type을 펼쳤는지
  const [detailWorkType, setDetailWorkType] = useState<string | null>(null);

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

  const effectiveGrade = (wt: string): Grade =>
    (value.overrides[wt] as Grade) ?? value.default;

  /** 단일 work_type 등급 변경 */
  function setGrade(wt: string, g: Grade) {
    const overrides = { ...value.overrides, [wt]: g };
    const matOv = { ...value.material_overrides };
    delete matOv[wt];
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  /** Bundle 등급 일괄 변경 — 내부 모든 work_type에 같은 등급 + material override 해제 */
  function setBundleGrade(bundle: WorkBundle, g: Grade) {
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

  return (
    <section className="rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-zinc-200">
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <h2 className="text-base font-semibold">4. 공사범위 및 자재 세부 선택</h2>
        <span className="text-[11px] text-zinc-500 flex-shrink-0">{displayItems.length}개 항목</span>
      </div>
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
              hasOverride={value.overrides[item.work.wt] !== undefined}
              onSelectGrade={(g) => setGrade(item.work.wt, g)}
              onClear={() => clearOverride(item.work.wt)}
              onShowDetail={() => setDetailWorkType(item.work.wt)}
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

function SingleCard({
  work, label, effectiveGrade: curGrade, hasOverride,
  onSelectGrade, onClear, onShowDetail,
}: {
  work: WorkInfo;
  label: string;
  effectiveGrade: Grade;
  hasOverride: boolean;
  onSelectGrade: (g: Grade) => void;
  onClear: () => void;
  onShowDetail: () => void;
}) {
  return (
    <div className={`rounded-lg border ${hasOverride ? 'border-blue-300' : 'border-zinc-200'}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50/50 border-b border-zinc-200/70 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-zinc-900 truncate">{label}</span>
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
      <div className="divide-y divide-zinc-100">
        {GRADES.map(g => (
          <GradeRow
            key={g}
            grade={g}
            material={getPrimaryMaterial(work.wt, g)}
            selected={curGrade === g}
            totalQty={work.totalQty}
            onSelect={() => onSelectGrade(g)}
          />
        ))}
      </div>
    </div>
  );
}

// =====================================================
// 번들 내부의 모든 work_type에 대해 해당 등급의 주력 자재 description을 합쳐 반환.
// installer_spec(시공자용 풀스펙)을 우선 사용하고, 없으면 brand+product_line으로 폴백.
// 같은 라벨이 중복되면 제거(예: 욕실 풀세트의 동일 브랜드 묶음).
// =====================================================
function bundleMaterialSummary(works: WorkInfo[], grade: Grade): string {
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
  onShowDetail,
  scope, onScopeChange,
}: {
  bundle: WorkBundle;
  works: WorkInfo[];
  totalSub: number;
  gradeSelection: GradeSelection;
  effectiveGrade: (wt: string) => Grade;
  onSelectBundleGrade: (g: Grade) => void;
  onSelectComponentGrade: (wt: string, g: Grade) => void;
  onClearBundle: () => void;
  /** 번들 안의 특정 work_type을 자세히 보기 모달로 열기 */
  onShowDetail: (workType: string) => void;
  scope?: Scope;
  onScopeChange?: (s: Scope) => void;
}) {
  const [showComponents, setShowComponents] = useState(false);

  // 세트 effective grade: 모든 work_type이 같은 등급이면 그 등급, 아니면 'mixed'
  const grades = works.map(w => effectiveGrade(w.wt));
  const uniqueGrades = new Set(grades);
  const bundleGrade: Grade | 'mixed' = uniqueGrades.size === 1 ? grades[0] : 'mixed';

  // 사용자가 등급/자재 override 했는지
  const hasAnyOverride = works.some(w =>
    gradeSelection.overrides[w.wt] !== undefined ||
    gradeSelection.material_overrides[w.wt] !== undefined
  );

  // 각 등급별 세트 합계 — works가 바뀌지 않는 한 캐시
  const totalsByGrade = useMemo(() => {
    const out: Record<Grade, number> = { '가성비': 0, '표준': 0, '고급': 0, '단일등급': 0 };
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
  const bundleTotalAtGrade = (g: Grade) => totalsByGrade[g];

  return (
    <div className={`rounded-lg border ${hasAnyOverride ? 'border-blue-300' : 'border-zinc-200'}`}>
      {/* 헤더 — 모바일: 2단 / sm+: 1단 */}
      <div className="px-3 py-2 bg-zinc-50/50 border-b border-zinc-200/70
                      flex flex-col gap-2
                      sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-zinc-900">{bundle.label}</span>
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
  effectiveGrade: Grade;
  onSelectGrade: (g: Grade) => void;
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

// =====================================================
// GradeRow — SingleCard의 등급 행. memo: 같은 props 시 리렌더 회피
// =====================================================

const GradeRow = memo(function GradeRow({
  grade, material, selected, totalQty, onSelect,
}: {
  grade: Grade;
  material: Material | null;
  selected: boolean;
  totalQty: number;
  onSelect: () => void;
}) {
  const meta = GRADE_META[grade];

  if (!material) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 opacity-50">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-zinc-300`}>
          {selected && <span className="w-2 h-2 rounded-full bg-zinc-400" />}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${meta.bg} ${meta.color}`}>{grade}</span>
        <span className="text-xs text-zinc-400 italic">등록된 자재 없음</span>
      </div>
    );
  }

  const homeTotal = Math.round(totalQty * material.total_unit_price);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left transition
        ${selected ? `${meta.bg} ring-2 ring-inset ${meta.ring}` : 'bg-white hover:bg-zinc-50'}`}
    >
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition flex-shrink-0
        ${selected ? `border-current ${meta.color}` : 'border-zinc-300'}`}>
        {selected && <span className={`w-2 h-2 rounded-full bg-current ${meta.color}`} />}
      </span>
      <div className="flex-shrink-0 sm:min-w-[80px]">
        <div className={`text-xs font-bold ${meta.color}`}>{grade}</div>
        <div className="text-[10px] text-zinc-500 leading-tight hidden sm:block">{meta.label}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm font-medium text-zinc-900 truncate">
          {material.brand} {material.product_line}
        </div>
        <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate" title={material.installer_spec || ''}>
          {material.installer_spec || `${material.category}${material.sub_category ? ' · ' + material.sub_category : ''}`}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className={`text-xs sm:text-sm font-bold tabular-nums ${selected ? meta.color : 'text-zinc-900'}`}>
          {fmtKRWShort(homeTotal)}
        </div>
        <div className="text-[10px] text-zinc-500 whitespace-nowrap">우리집 총공사비</div>
      </div>
    </button>
  );
});

// 미사용 import 회피 (Quote 타입은 props에서 사용)
void WORK_BUNDLES;

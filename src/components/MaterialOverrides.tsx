'use client';

import { useMemo, useState } from 'react';
import type { Grade, GradeSelection, Material, Quote } from '@/lib/types';
import { getPrimaryMaterial, labelOf } from '@/lib/materials';
import { fmtKRWShort } from '@/lib/calculator';

type Props = {
  quote: Quote;
  value: GradeSelection;
  onChange: (next: GradeSelection) => void;
};

const GRADES: Grade[] = ['가성비', '표준', '고급'];

const GRADE_META: Record<Grade, { color: string; bg: string; ring: string; label: string }> = {
  '가성비':   { color: 'text-emerald-700', bg: 'bg-emerald-50',  ring: 'ring-emerald-300',  label: '실속·경제형' },
  '표준':     { color: 'text-blue-700',    bg: 'bg-blue-50',     ring: 'ring-blue-300',     label: '주류·균형형' },
  '고급':     { color: 'text-amber-700',   bg: 'bg-amber-50',    ring: 'ring-amber-300',    label: '프리미엄' },
  '단일등급': { color: 'text-zinc-700',    bg: 'bg-zinc-50',     ring: 'ring-zinc-300',     label: '단일' },
};

export function MaterialOverrides({ quote, value, onChange }: Props) {
  const [showAll, setShowAll] = useState(false);

  // 견적에 등장하는 work_type만, 소계 큰 순
  const workTypes = useMemo(() => {
    const subtotalByWT = new Map<string, number>();
    for (const it of quote.line_items) {
      if (!it.material_id) continue;
      subtotalByWT.set(it.work_type, (subtotalByWT.get(it.work_type) || 0) + it.subtotal);
    }
    return Array.from(subtotalByWT.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([wt, sub]) => ({ wt, sub, label: labelOf(wt) }));
  }, [quote.line_items]);

  const visible = showAll ? workTypes : workTypes.slice(0, 10);

  const effectiveGrade = (wt: string): Grade =>
    (value.overrides[wt] as Grade) ?? value.default;

  function setGrade(wt: string, g: Grade) {
    const overrides = { ...value.overrides, [wt]: g };
    // 등급이 바뀌면 그 공종의 자재 override 해제
    const matOv = { ...value.material_overrides };
    delete matOv[wt];
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  function clearOverride(wt: string) {
    const overrides = { ...value.overrides };
    delete overrides[wt];
    const matOv = { ...value.material_overrides };
    delete matOv[wt];
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-semibold">4. 자재 세부 조정</h2>
        <span className="text-[11px] text-zinc-500">{workTypes.length}개 공종</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        공종마다 가성비·표준·고급 등급의 <strong>주력 자재</strong>를 보고 직접 선택하세요. 등급별로 단가와 사양을 비교할 수 있습니다.
      </p>

      <div className="space-y-3">
        {visible.map(({ wt, sub, label }) => {
          const curGrade = effectiveGrade(wt);
          const hasOverride = value.overrides[wt] !== undefined;
          return (
            <div key={wt} className={`rounded-lg border ${hasOverride ? 'border-blue-300' : 'border-zinc-200'}`}>
              {/* 공종 헤더 */}
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-50/50 border-b border-zinc-200/70">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">{label}</span>
                  {hasOverride && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                      개별 설정
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 tabular-nums">{fmtKRWShort(sub)}</span>
                  {hasOverride && (
                    <button
                      onClick={() => clearOverride(wt)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
                      title="전체 일괄 등급으로 되돌립니다"
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>

              {/* 등급별 3행 */}
              <div className="divide-y divide-zinc-100">
                {GRADES.map(g => (
                  <GradeRow
                    key={g}
                    workType={wt}
                    grade={g}
                    material={getPrimaryMaterial(wt, g)}
                    selected={curGrade === g}
                    onSelect={() => setGrade(wt, g)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {workTypes.length > 10 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
        >
          {showAll ? '주요 10개만 보기' : `전체 ${workTypes.length}개 공종 펼치기`}
        </button>
      )}
    </section>
  );
}

// =====================================================
// 등급 한 행: 라디오 + 등급 배지 + 주력 자재명 + 단가
// =====================================================

function GradeRow({
  grade, material, selected, onSelect,
}: {
  workType: string;
  grade: Grade;
  material: Material | null;
  selected: boolean;
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

  const unit = (material.unit_type || 'per_ea').replace('per_', '');
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition
        ${selected ? `${meta.bg} ring-2 ring-inset ${meta.ring}` : 'bg-white hover:bg-zinc-50'}`}
    >
      {/* 라디오 인디케이터 */}
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition flex-shrink-0
        ${selected ? `border-current ${meta.color}` : 'border-zinc-300'}`}>
        {selected && <span className={`w-2 h-2 rounded-full bg-current ${meta.color}`} />}
      </span>

      {/* 등급 배지 + 소설명 */}
      <div className="flex-shrink-0 min-w-[80px]">
        <div className={`text-xs font-bold ${meta.color}`}>{grade}</div>
        <div className="text-[10px] text-zinc-500 leading-tight">{meta.label}</div>
      </div>

      {/* 주력 자재 (브랜드 + 제품) */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-900 truncate">
          {material.brand} {material.product_line}
        </div>
        <div className="text-[11px] text-zinc-500 truncate" title={material.installer_spec || ''}>
          {material.installer_spec || `${material.category}${material.sub_category ? ' · ' + material.sub_category : ''}`}
        </div>
      </div>

      {/* 단가 */}
      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-semibold text-zinc-900 tabular-nums">
          {fmtKRWShort(material.total_unit_price)}
        </div>
        <div className="text-[10px] text-zinc-500">/{unit}</div>
      </div>
    </button>
  );
}

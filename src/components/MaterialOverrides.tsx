'use client';

import { useMemo, useState } from 'react';
import type { Grade, GradeSelection, Material, Quote } from '@/lib/types';
import { ALL_MATERIALS, getMaterialById, getPrimaryMaterial, labelOf, materialsFor } from '@/lib/materials';
import { fmtKRWShort } from '@/lib/calculator';

type Props = {
  quote: Quote;
  value: GradeSelection;
  onChange: (next: GradeSelection) => void;
};

const GRADES: Grade[] = ['가성비', '표준', '고급'];

export function MaterialOverrides({ quote, value, onChange }: Props) {
  const [showAll, setShowAll] = useState(false);

  // 현재 견적에 쓰인 work_type만 + 소계 큰 순
  const workTypes = useMemo(() => {
    const subtotalByWT = new Map<string, number>();
    const labelByWT = new Map<string, string>();
    for (const it of quote.line_items) {
      if (!it.material_id) continue;  // 자재마스터에 없는 고정 라인(터닝도어/구청신고) 제외
      subtotalByWT.set(it.work_type, (subtotalByWT.get(it.work_type) || 0) + it.subtotal);
      labelByWT.set(it.work_type, it.category);
    }
    return Array.from(subtotalByWT.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([wt, sub]) => ({ wt, sub, label: labelByWT.get(wt) || labelOf(wt) }));
  }, [quote.line_items]);

  const visible = showAll ? workTypes : workTypes.slice(0, 10);

  function effectiveGrade(wt: string): Grade {
    return (value.overrides[wt] as Grade) ?? value.default;
  }

  function currentMaterial(wt: string): Material | null {
    const overrideId = value.material_overrides[wt];
    if (overrideId) {
      const m = getMaterialById(overrideId);
      if (m && m.work_type === wt) return m;
    }
    return getPrimaryMaterial(wt, effectiveGrade(wt));
  }

  function setGrade(wt: string, g: Grade) {
    const overrides = { ...value.overrides, [wt]: g };
    // 등급이 바뀌면 해당 공종의 자재 override는 해제 (다른 등급의 자재일 수 있으므로)
    const matOv = { ...value.material_overrides };
    delete matOv[wt];
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  function clearGradeOverride(wt: string) {
    const overrides = { ...value.overrides };
    delete overrides[wt];
    const matOv = { ...value.material_overrides };
    delete matOv[wt];
    onChange({ ...value, overrides, material_overrides: matOv });
  }

  function setMaterial(wt: string, materialId: string) {
    onChange({
      ...value,
      material_overrides: { ...value.material_overrides, [wt]: materialId },
    });
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-semibold">4. 자재 세부 조정</h2>
        <span className="text-[11px] text-zinc-500">{workTypes.length}개 공종</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        공종별로 등급을 다르게 가져가거나, 같은 등급 내에서 다른 브랜드·제품으로 바꿀 수 있습니다.
      </p>

      <div className="space-y-2">
        {visible.map(({ wt, sub, label }) => {
          const g = effectiveGrade(wt);
          const mat = currentMaterial(wt);
          const hasOverride = value.overrides[wt] !== undefined || value.material_overrides[wt] !== undefined;
          // 같은 등급이거나 단일등급, 그리고 현재 line의 단위와 호환되는 자재만
          const curUnit = mat?.unit_type;
          const matOptions = materialsFor(wt).filter(m =>
            (m.primary_grade === g || m.primary_grade === '단일등급') &&
            (!curUnit || m.unit_type === curUnit)
          );

          return (
            <div key={wt} className={`rounded-lg border p-3 ${hasOverride ? 'border-blue-300 bg-blue-50/30' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium flex-1 min-w-0 truncate">{label}</span>
                <span className="text-[11px] text-zinc-500 tabular-nums">{fmtKRWShort(sub)}</span>
                {hasOverride && (
                  <button
                    onClick={() => clearGradeOverride(wt)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
                    title="기본값(전체 일괄 등급)으로 되돌립니다"
                  >
                    초기화
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* 등급 트리거 */}
                <div className="inline-flex rounded-md border border-zinc-200 overflow-hidden text-xs">
                  {GRADES.map(gr => (
                    <button
                      key={gr}
                      onClick={() => setGrade(wt, gr)}
                      className={`px-2.5 py-1 transition ${
                        g === gr
                          ? gradeTone(gr) + ' font-medium'
                          : 'bg-white text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {gr}
                    </button>
                  ))}
                </div>

                {/* 자재 셀렉트 */}
                <select
                  value={mat?.material_id ?? ''}
                  onChange={(e) => setMaterial(wt, e.target.value)}
                  className="flex-1 min-w-0 text-xs rounded-md border border-zinc-300 bg-white py-1 px-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  {matOptions.length === 0 && <option>선택 가능한 자재 없음</option>}
                  {matOptions.map(m => (
                    <option key={m.material_id} value={m.material_id}>
                      {m.sub_category ? `[${m.sub_category}] ` : ''}
                      {m.brand} {m.product_line} · {fmtKRWShort(m.total_unit_price)}/{m.unit_type.replace('per_', '')}
                    </option>
                  ))}
                </select>
              </div>

              {mat && (
                <div className="mt-1.5 text-[11px] text-zinc-500 truncate" title={mat.installer_spec ?? ''}>
                  {mat.installer_spec ?? `${mat.brand} ${mat.product_line}`}
                </div>
              )}
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

function gradeTone(g: Grade): string {
  switch (g) {
    case '가성비': return 'bg-emerald-50 text-emerald-900';
    case '표준':   return 'bg-blue-50 text-blue-900';
    case '고급':   return 'bg-amber-50 text-amber-900';
    default:        return 'bg-zinc-100 text-zinc-900';
  }
}

// ALL_MATERIALS는 import 사용처가 없어도 트리쉐이킹 방지 위해 유지
void ALL_MATERIALS;

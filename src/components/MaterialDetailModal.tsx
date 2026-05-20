'use client';

/**
 * 자재 세부 선택 화면에서 '자세히' 버튼 클릭 시 표시되는 모달.
 *
 * 한 work_type(=공종)에 대해 가성비·표준·고급 3등급의 주력 자재를 카드 형태로 비교:
 *  - 자재 이미지 (Material.image_url, 구글 드라이브 공유 링크 자동 변환)
 *  - 브랜드 + 제품 라인
 *  - installer_spec (시공자용 풀스펙)
 *  - 자재가/시공비/합계 단가
 *  - 현재 선택된 등급은 강조 (ring + 배지)
 *
 * 등급 간 차이 설명은 페이지 하단에 일반론으로 표시.
 */

import { useState } from 'react';
import type { Grade, Material } from '@/lib/types';
import { getPrimaryMaterial, labelOf } from '@/lib/materials';
import { normalizeImageUrl, placeholderImageUrl, shouldUseDummyImages } from '@/lib/image-utils';
import { fmtKRWShort } from '@/lib/calculator';

const GRADES: Grade[] = ['가성비', '표준', '고급'];

const GRADE_META: Record<Grade, { color: string; bg: string; ring: string; label: string; desc: string }> = {
  '가성비': {
    color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-300',
    label: '실속·경제형',
    desc: '주요 브랜드의 보급형 라인. 기본 성능은 보장하면서 단가를 낮춰 전체 예산을 압축할 때 적합.',
  },
  '표준': {
    color: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-300',
    label: '주류·균형형',
    desc: '시장에서 가장 많이 시공되는 등급. 가격 대비 마감·내구성 균형이 좋아 무난한 선택.',
  },
  '고급': {
    color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-300',
    label: '프리미엄',
    desc: '대형 브랜드의 상위 라인 또는 수입 자재. 외관·내구성·A/S까지 모두 우선시할 때 추천.',
  },
  '단일등급': {
    color: 'text-zinc-700', bg: 'bg-zinc-50', ring: 'ring-zinc-300',
    label: '단일',
    desc: '등급 구분이 없는 자재.',
  },
};

type Props = {
  workType: string;
  /** 현재 견적에 적용된 등급 — 카드 강조용 */
  currentGrade: Grade;
  onClose: () => void;
};

export function MaterialDetailModal({ workType, currentGrade, onClose }: Props) {
  const label = labelOf(workType);

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-detail-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-5 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-0.5">
              공종 자세히 보기
            </div>
            <h2 id="material-detail-title" className="text-lg sm:text-xl font-bold text-zinc-900 truncate">
              {label}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              가성비·표준·고급 세 등급의 주력 자재를 비교합니다. 노란색 배지로 표시된 등급이 우리집 견적에 적용된 자재입니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-zinc-400 hover:text-zinc-900 text-2xl leading-none -mt-1"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 등급 카드 3개 */}
        <div className="px-5 sm:px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {GRADES.map(g => (
              <GradeCard
                key={g}
                grade={g}
                workType={workType}
                material={getPrimaryMaterial(workType, g)}
                isCurrent={currentGrade === g}
              />
            ))}
          </div>

          {/* 등급 차이 설명 */}
          <div className="mt-5 rounded-lg bg-zinc-50 border border-zinc-200 p-4">
            <div className="text-xs font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
              <span className="text-amber-600">💡</span>
              <span>등급 차이</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-zinc-700 leading-relaxed">
              {GRADES.map(g => {
                const meta = GRADE_META[g];
                return (
                  <li key={g} className="flex items-start gap-2">
                    <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                      {g}
                    </span>
                    <span>{meta.desc}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 pt-3 border-t border-zinc-200 text-[10px] text-zinc-500 leading-relaxed">
              ※ 자재가는 시장 표준가 기준이며 실제 시공 시 매장·시기에 따라 다를 수 있습니다.
              시공비는 일반적인 평균 인건비를 반영했습니다.
            </p>
          </div>
        </div>

        {/* Footer — 닫기 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-5 sm:px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-semibold text-sm transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// GradeCard — 가성비/표준/고급 한 등급의 자재 카드
// =====================================================

function GradeCard({
  grade, workType, material, isCurrent,
}: {
  grade: Grade;
  workType: string;
  material: Material | null;
  isCurrent: boolean;
}) {
  const meta = GRADE_META[grade];
  const realUrl = normalizeImageUrl(material?.image_url ?? null, 800);
  // image_url이 없을 때 더미 이미지 사용 여부 (env or dev)
  const useDummy = !realUrl && shouldUseDummyImages() && !!material;
  const imageUrl = realUrl || (useDummy
    ? placeholderImageUrl(material?.material_id || `${workType}-${grade}`, 800)
    : null);

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden flex flex-col bg-white transition ${
        isCurrent ? `${meta.ring.replace('ring', 'border')} ring-2 ${meta.ring} shadow-md` : 'border-zinc-200'
      }`}
    >
      {/* 헤더 — 등급 배지 + 현재 적용 표시 */}
      <div className={`px-3 py-2 ${meta.bg} flex items-center justify-between gap-2 border-b ${
        isCurrent ? meta.ring.replace('ring', 'border') : 'border-zinc-200'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-sm font-bold ${meta.color}`}>{grade}</span>
          <span className="text-[10px] text-zinc-500 truncate">{meta.label}</span>
        </div>
        {isCurrent && (
          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 whitespace-nowrap">
            ✓ 적용 중
          </span>
        )}
      </div>

      {/* 이미지 영역 */}
      <MaterialImage
        url={imageUrl}
        alt={material ? `${material.brand ?? ''} ${material.product_line ?? ''}`.trim() : workType}
        isDummy={useDummy}
      />

      {/* 자재 정보 */}
      <div className="flex-1 px-3 py-3 space-y-2">
        {material ? (
          <>
            <div>
              <div className="text-sm font-bold text-zinc-900 leading-tight">
                {material.brand} {material.product_line}
              </div>
              {material.installer_spec && (
                <div className="text-[10px] text-zinc-500 mt-1 leading-snug" title={material.installer_spec}>
                  {material.installer_spec}
                </div>
              )}
            </div>

            {/* 가격 정보 */}
            <div className="pt-2 border-t border-zinc-100 space-y-0.5">
              <PriceRow label="자재가" value={material.material_price} unit={material.unit_type} />
              <PriceRow label="시공비" value={material.labor_price} unit={material.unit_type} />
              <PriceRow label="합계" value={material.total_unit_price} unit={material.unit_type} highlight />
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-400 italic">
            이 등급의 등록된 자재가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// MaterialImage — 이미지 로딩/오류 처리
// =====================================================

function MaterialImage({ url, alt, isDummy = false }: { url: string | null; alt: string; isDummy?: boolean }) {
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div className="aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-50 flex flex-col items-center justify-center gap-1.5 border-b border-zinc-200">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span className="text-[10px] text-zinc-400">
          {errored ? '이미지를 불러올 수 없어요' : '이미지 준비 중'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] bg-zinc-50 border-b border-zinc-200 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      {isDummy && (
        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/90 text-white shadow-sm">
          샘플 이미지
        </span>
      )}
    </div>
  );
}

// =====================================================
// PriceRow — 자재가/시공비/합계 한 줄
// =====================================================

function PriceRow({
  label, value, unit, highlight = false,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
}) {
  const unitShort =
    unit === 'per_m2' ? '/㎡' :
    unit === 'per_m'  ? '/m'  :
    unit === 'per_ea' ? '/개' :
    unit === 'per_set' ? '/세트' : '';

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={`text-[10px] ${highlight ? 'text-zinc-900 font-bold' : 'text-zinc-500'}`}>
        {label}
      </span>
      <span className={`tabular-nums ${highlight ? 'text-sm font-bold text-blue-900' : 'text-xs text-zinc-700'}`}>
        {fmtKRWShort(value)}{unitShort}
      </span>
    </div>
  );
}

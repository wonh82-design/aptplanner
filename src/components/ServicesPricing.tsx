'use client';

/**
 * 3종 서비스 가격 카드 비교 컴포넌트.
 * 결과 페이지·랜딩 페이지에서 공통 사용.
 *
 * 사용처별 동작:
 *  - 결과 페이지(/calc Step 3): onClick 콜백 전달 → 다운로드/모달 오픈
 *  - 랜딩 페이지(/): onClick 미전달 → 자동으로 /calc 로 이동(Link)
 */

import Link from 'next/link';
import {
  SERVICE_FREE, SERVICE_SPEC, SERVICE_CONSULT, estimateSavings, fmtSaving,
} from '@/lib/pricing';

type Props = {
  pyeong?: number;
  onDownloadFree?: () => void;
  downloadingFree?: boolean;
  onApplySpec?: () => void;
  onApplyConsult?: () => void;
  recommended?: 'free' | 'spec' | 'consult';
};

export function ServicesPricing({
  pyeong,
  onDownloadFree, downloadingFree = false,
  onApplySpec, onApplyConsult,
  recommended = 'spec',
}: Props) {
  const savings = pyeong ? estimateSavings(pyeong) : null;

  // 절감액 대비 가격 비율 (anchoring)
  const specSavingMax = savings?.max ? Math.floor((SERVICE_SPEC.price / savings.max) * 1000) / 10 : null;
  const consultSavingMax = savings?.max ? Math.floor((SERVICE_CONSULT.price / savings.max) * 1000) / 10 : null;

  return (
    <div className="space-y-5">
      {/* ===== 절감 가치 ANCHOR — 평형 기반 ===== */}
      {savings && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-2 border-amber-300 p-5 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-200/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="relative">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-1">
              {pyeong}평 기준 · 추가금 분쟁 방지 시 절감 가능액
            </div>
            <div className="text-2xl sm:text-4xl font-extrabold text-zinc-900 leading-tight">
              <span className="text-amber-700">{fmtSaving(savings.min)} ~ {fmtSaving(savings.max)}</span>
            </div>
            <p className="text-sm text-zinc-700 mt-2 leading-relaxed">
              같은 사양으로 비교 견적을 받으면 평균 <strong>{fmtSaving(savings.min)} 이상</strong>,
              추가금 분쟁까지 막으면 최대 <strong className="text-amber-700">{fmtSaving(savings.max)}</strong> 까지 절약 가능합니다.
            </p>
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white border border-amber-300">
              <span className="text-xs font-semibold text-zinc-800">
                한 끼 식사값 ₩29,000 = 최대 절감액의 <span className="text-amber-700">단 {specSavingMax ?? 0.1}%</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== 3종 가격 카드 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 무료 */}
        <PricingCard
          tone="free"
          recommended={recommended === 'free'}
          name={SERVICE_FREE.name}
          subBadge="무료"
          priceMain="₩0"
          priceSub="가입 없이 즉시"
          description={SERVICE_FREE.description}
          features={SERVICE_FREE.features}
          ctaText={downloadingFree ? '생성 중…' : '지금 바로 무료 다운로드'}
          ctaDisabled={downloadingFree}
          onClick={onDownloadFree}
        />

        {/* 스펙북 — 추천 */}
        <PricingCard
          tone="spec"
          recommended={recommended === 'spec'}
          name={SERVICE_SPEC.name}
          subBadge="한 끼 식사값"
          priceMain="₩29,000"
          priceSub="단 1회 결제 · 평생 소장"
          description={SERVICE_SPEC.description}
          features={SERVICE_SPEC.features}
          bonus={{ title: SERVICE_SPEC.bonusTitle, items: SERVICE_SPEC.bonusFeatures }}
          savingAnchor={savings ? {
            label: `${fmtSaving(savings.min)} 이상 절감`,
            ratio: specSavingMax ? `절감액의 단 ${specSavingMax}%만 투자` : undefined,
          } : undefined}
          ctaText={SERVICE_SPEC.cta + ' →'}
          onClick={onApplySpec}
        />

        {/* 컨설팅 */}
        <PricingCard
          tone="consult"
          recommended={recommended === 'consult'}
          name={SERVICE_CONSULT.name}
          subBadge="5월 한정 50% 할인"
          priceMain="₩150,000"
          priceOriginal="₩300,000"
          discountLabel="-50%"
          priceSub="+ 업체 견적 비교 서비스 무료"
          description={SERVICE_CONSULT.description}
          features={SERVICE_CONSULT.features}
          bonus={{ title: SERVICE_CONSULT.bonusTitle, items: SERVICE_CONSULT.bonusFeatures }}
          savingAnchor={savings ? {
            label: `최대 ${fmtSaving(savings.max)} 절감`,
            ratio: consultSavingMax ? `절감액의 단 ${consultSavingMax}%만 투자` : undefined,
          } : undefined}
          ctaText={SERVICE_CONSULT.cta + ' →'}
          onClick={onApplyConsult}
          credential="건축사 · 건축시공기술사가 직접 진단"
        />
      </div>
    </div>
  );
}

// =====================================================
// PricingCard
// =====================================================

type Tone = 'free' | 'spec' | 'consult';

function PricingCard({
  tone, recommended, name, subBadge,
  priceMain, priceOriginal, priceSub, discountLabel,
  description, features, bonus, savingAnchor, credential,
  ctaText, ctaDisabled, onClick,
}: {
  tone: Tone;
  recommended: boolean;
  name: string;
  subBadge: string;
  priceMain: string;
  priceOriginal?: string;
  discountLabel?: string;
  priceSub?: string;
  description: string;
  features: readonly string[];
  bonus?: { title: string; items: readonly string[] };
  savingAnchor?: { label: string; ratio?: string };
  credential?: string;
  ctaText: string;
  ctaDisabled?: boolean;
  onClick?: () => void;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={`relative rounded-2xl border-2 bg-white overflow-hidden flex flex-col
      ${recommended ? `${styles.borderActive} shadow-xl md:scale-[1.02] z-10` : 'border-zinc-200'}`}>
      {recommended && (
        <div className={`${styles.bgBadge} text-white text-xs font-bold text-center py-1.5 uppercase tracking-wider`}>
          가장 인기 · 추천
        </div>
      )}

      {/* 헤더 */}
      <div className={`px-5 sm:px-6 pt-5 sm:pt-6 pb-4 ${styles.gradientHeader} border-b border-zinc-200/50`}>
        <div className="mb-3">
          <div className={`inline-block text-[10px] font-bold uppercase tracking-wider ${styles.text} ${styles.subBadgeBg} px-2 py-0.5 rounded mb-1.5`}>
            {subBadge}
          </div>
          <h3 className="font-bold text-zinc-900 text-base leading-tight">{name}</h3>
        </div>
        <div className="flex items-center gap-2 mt-4">
          {priceOriginal && (
            <span className="text-base text-zinc-400 line-through font-medium">{priceOriginal}</span>
          )}
          {discountLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold animate-pulse">
              {discountLabel}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold ${styles.text}`}>{priceMain}</span>
        </div>
        {priceSub && <div className="text-[11px] text-zinc-600 mt-1 font-medium">{priceSub}</div>}
        {credential && (
          <div className="mt-2 text-[10px] text-zinc-600 italic">{credential}</div>
        )}
      </div>

      {/* 본문 */}
      <div className="px-5 sm:px-6 py-5 flex-1 flex flex-col">
        <p className="text-xs text-zinc-600 leading-relaxed mb-4">{description}</p>

        <ul className="space-y-2 text-xs text-zinc-700 mb-4">
          {features.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className={`flex-shrink-0 ${styles.text} font-bold`}>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {bonus && (
          <div className={`rounded-lg ${styles.bgSoft} p-3 mb-4 border ${styles.borderSoft}`}>
            <div className={`text-[11px] font-bold ${styles.text} mb-1.5 uppercase tracking-wider`}>{bonus.title}</div>
            <ul className="space-y-1 text-[11px] text-zinc-700">
              {bonus.items.map((f, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className={styles.text}>·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {savingAnchor && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
            <div className="text-xs font-bold text-amber-900 mb-0.5">{savingAnchor.label}</div>
            {savingAnchor.ratio && (
              <div className="text-[10px] text-amber-700">{savingAnchor.ratio}</div>
            )}
          </div>
        )}

        <CardCta
          tone={tone}
          styles={styles}
          text={ctaText}
          disabled={ctaDisabled}
          onClick={onClick}
        />
      </div>
    </div>
  );
}

/**
 * onClick 있으면 button, 없으면 /calc 로 Link.
 * 랜딩 페이지에서도 카드 클릭이 자연스러운 행동을 만들도록.
 */
function CardCta({
  tone, styles, text, disabled, onClick,
}: {
  tone: Tone;
  styles: typeof TONE_STYLES[Tone];
  text: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const cls = `mt-auto w-full text-center py-3 rounded-lg text-sm font-bold transition active:scale-[0.98]
    ${tone === 'free'
      ? 'border-2 border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
      : `${styles.bgBadge} text-white hover:opacity-90 shadow-md`}
    disabled:opacity-50 disabled:cursor-not-allowed`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cls}>
        {text}
      </button>
    );
  }
  return (
    <Link href="/calc" className={cls + ' inline-flex items-center justify-center'}>
      {text}
    </Link>
  );
}

const TONE_STYLES: Record<Tone, {
  text: string;
  subBadgeBg: string;
  bgSoft: string;
  borderSoft: string;
  bgBadge: string;
  borderActive: string;
  gradientHeader: string;
}> = {
  free: {
    text: 'text-zinc-700',
    subBadgeBg: 'bg-zinc-100',
    bgSoft: 'bg-zinc-50',
    borderSoft: 'border-zinc-200',
    bgBadge: 'bg-zinc-700',
    borderActive: 'border-zinc-400',
    gradientHeader: 'bg-gradient-to-br from-zinc-50 to-white',
  },
  spec: {
    text: 'text-blue-700',
    subBadgeBg: 'bg-blue-100',
    bgSoft: 'bg-blue-50/60',
    borderSoft: 'border-blue-200',
    bgBadge: 'bg-blue-600',
    borderActive: 'border-blue-500',
    gradientHeader: 'bg-gradient-to-br from-blue-50 to-emerald-50/60',
  },
  consult: {
    text: 'text-orange-700',
    subBadgeBg: 'bg-orange-100',
    bgSoft: 'bg-orange-50/60',
    borderSoft: 'border-orange-200',
    bgBadge: 'bg-orange-600',
    borderActive: 'border-orange-500',
    gradientHeader: 'bg-gradient-to-br from-orange-50 to-rose-50/60',
  },
};

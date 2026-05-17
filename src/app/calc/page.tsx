'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PropertyForm } from '@/components/PropertyForm';
import { ScopeMatrix } from '@/components/ScopeMatrix';
import { GradeSelector } from '@/components/GradeSelector';
import { MaterialOverrides } from '@/components/MaterialOverrides';
import { QuotePanel } from '@/components/QuotePanel';
import { StepIndicator } from '@/components/StepIndicator';
import { ServicesPricing } from '@/components/ServicesPricing';
import { LivePricePreview } from '@/components/LivePricePreview';
import { Testimonials } from '@/components/Testimonials';
import { WizardSidebar } from '@/components/WizardSidebar';
import { SiteHeader } from '@/components/SiteHeader';
import { ConsultRequestModal } from '@/components/ConsultRequestModal';
import { SpecBookRequestModal } from '@/components/SpecBookRequestModal';
import { QuotePdfTemplate } from '@/components/pdf/QuotePdfTemplate';
import { PlanPdfTemplate } from '@/components/pdf/PlanPdfTemplate';
import { TipsPdfTemplate } from '@/components/pdf/TipsPdfTemplate';
import { defaultGrade, defaultProperty, defaultScope } from '@/lib/defaults';
import { buildQuote, fmtKRWShort, REGION_LABEL, AGE_LABEL } from '@/lib/calculator';
import { exportPagedPdf } from '@/lib/pdf/export';

type Step = 1 | 2 | 3 | 4;

export default function CalcPage() {
  const [step, setStep] = useState<Step>(1);
  const [maxReached, setMaxReached] = useState<Step>(1);
  const [property, setProperty] = useState(defaultProperty());
  const [scope, setScope] = useState(defaultScope());
  const [grade, setGrade] = useState(defaultGrade());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);

  const quote = useMemo(
    () => buildQuote(property, scope, grade),
    [property, scope, grade]
  );

  const quoteRootRef = useRef<HTMLDivElement>(null);
  const planRootRef = useRef<HTMLDivElement>(null);
  const tipsRootRef = useRef<HTMLDivElement>(null);

  const goTo = (s: Step) => {
    setStep(s);
    if (s > maxReached) setMaxReached(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setProperty(defaultProperty());
    setScope(defaultScope());
    setGrade(defaultGrade());
    setMaxReached(1);
    goTo(1);
  };

  const downloadPdf = async (
    which: 'quote' | 'plan' | 'tips',
    ref: React.RefObject<HTMLDivElement | null>,
    filename: string,
  ) => {
    if (!ref.current) return;
    setDownloading(which);
    try {
      await exportPagedPdf(ref.current, { filename, orientation: 'l' });
    } catch (e) {
      console.error('PDF export failed', e);
      alert('PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex-1 w-full">
      <SiteHeader />

      <StepIndicator current={step} maxReached={maxReached} onStepClick={goTo} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        {/* ===== Step 1: 우리집 현황 — 사이드바 등장 (예상 공사비 카드는 미노출) ===== */}
        {step === 1 && (
          <div className="lg:grid lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-6">
            <WizardSidebar
              step={1}
              property={property}
              scope={scope}
              quote={quote}
              gradeLabel={grade.default}
              onJumpToStep={goTo}
              onNext={() => goTo(2)}
              nextLabel="공사 범위"
            />
            <div className="w-full max-w-3xl mx-auto lg:max-w-none lg:mx-0 flex flex-col gap-4 min-w-0">
              <PropertyForm
                value={property}
                onChange={setProperty}
                rooms={scope.rooms}
                onRoomsChange={(rooms) => {
                  const planned = Object.values(rooms).some(
                    rs => !!rs && rs.expansion_after && !rs.expansion_current,
                  );
                  setScope({
                    ...scope,
                    rooms,
                    global: { ...scope.global, expansion_report: planned },
                  });
                }}
              />
              <div className="lg:hidden">
                <StepNav
                  right={
                    <button onClick={() => goTo(2)} className="btn-primary">
                      공사 범위 선택 →
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== Step 2: 공사 범위 — 사이드바에 예상 공사비 출현 ===== */}
        {step === 2 && (
          <div className="lg:grid lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-6">
            <WizardSidebar
              step={2}
              property={property}
              scope={scope}
              quote={quote}
              gradeLabel={grade.default}
              onJumpToStep={goTo}
              onPrev={() => goTo(1)}
              prevLabel="현황 수정"
              onNext={() => goTo(3)}
              nextLabel="자재 등급"
            />
            <div className="w-full max-w-3xl mx-auto lg:max-w-none lg:mx-0 flex flex-col gap-4 min-w-0">
              {/* 모바일/태블릿 — 라이브 가격 배너 */}
              <div className="lg:hidden">
                <LivePricePreview quote={quote} step={2} />
              </div>
              <ScopeMatrix property={property} value={scope} onChange={setScope} />

              <div className="lg:hidden">
                <StepNav
                  left={
                    <button onClick={() => goTo(1)} className="btn-secondary">← 현황 수정</button>
                  }
                  right={
                    <button onClick={() => goTo(3)} className="btn-primary">
                      자재 등급 →
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== Step 3: 자재 등급 — 사이드바 유지 ===== */}
        {step === 3 && (
          <div className="lg:grid lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-6">
            <WizardSidebar
              step={3}
              property={property}
              scope={scope}
              quote={quote}
              gradeLabel={grade.default}
              onJumpToStep={goTo}
              onPrev={() => goTo(2)}
              prevLabel="공사 범위"
              onNext={() => goTo(4)}
              nextLabel="최종 결과"
            />
            <div className="w-full max-w-3xl mx-auto lg:max-w-none lg:mx-0 flex flex-col gap-4 min-w-0">
              <div className="lg:hidden">
                <LivePricePreview quote={quote} step={3} />
              </div>
              <GradeSelector value={grade} onChange={setGrade} />
              <MaterialOverrides
                quote={quote}
                value={grade}
                onChange={setGrade}
                scope={scope}
                onScopeChange={setScope}
              />

              <div className="lg:hidden">
                <StepNav
                  left={
                    <button onClick={() => goTo(2)} className="btn-secondary">← 공사 범위</button>
                  }
                  right={
                    <button onClick={() => goTo(4)} className="btn-primary">
                      최종 결과 보기 →
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== Step 4: 공사비 결과 — 풀폭 결과 페이지 ===== */}
        {step === 4 && (
          <div className="max-w-5xl mx-auto flex flex-col gap-5">
            <ResultBanner quote={quote} gradeLabel={grade.default} />

            {/* 견적 상세 내역 — 총공사비 바로 아래 항상 펼침 */}
            <QuotePanel quote={quote} />

            {/* 3종 서비스 가격 카드 */}
            <ServicesPricing
              pyeong={property.pyeong}
              onDownloadFree={() => downloadPdf('quote', quoteRootRef, `apt-planner_예상공사비_${property.pyeong}평_${quote.quote_id}.pdf`)}
              downloadingFree={downloading === 'quote'}
              onApplySpec={() => setPremiumOpen(true)}
              onApplyConsult={() => setConsultOpen(true)}
              recommended="spec"
            />

            {/* 신뢰 nudge — 누가 만들었나 */}
            <TrustNudge />

            {/* 소셜 프루프 — 실제 사용자 사례 */}
            <Testimonials />

            {/* 마무리 nudge */}
            <FinalNudge />

            <StepNav
              left={
                <button onClick={() => goTo(3)} className="btn-secondary">← 등급 수정</button>
              }
              right={
                <button onClick={reset} className="btn-secondary">새로 시작</button>
              }
            />
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-[11px] sm:text-xs text-zinc-500 flex flex-col sm:flex-row gap-1 sm:justify-between leading-relaxed">
          <span>※ 본 견적은 표준 자재가 기준의 예상치이며, 실제 시공·견적은 업체 협의가 필요합니다.</span>
          <span>업체 수수료·제휴 0건</span>
        </div>
      </footer>

      {/* 스펙북 신청 모달 — 이름·이메일 입력 → 입금 안내 */}
      {premiumOpen && (
        <SpecBookRequestModal
          onClose={() => setPremiumOpen(false)}
          meta={{
            pyeong: property.pyeong,
            bay: property.bay,
            rooms: property.rooms,
            grade: grade.default,
            grand_total: quote.totals.grand_total,
            quote_id: quote.quote_id,
          }}
        />
      )}

      {/* 전문가 컨설팅 신청 모달 */}
      {consultOpen && (
        <ConsultRequestModal
          onClose={() => setConsultOpen(false)}
          meta={{
            pyeong: property.pyeong,
            bay: property.bay,
            rooms: property.rooms,
            grade: grade.default,
            grand_total: quote.totals.grand_total,
            quote_id: quote.quote_id,
          }}
        />
      )}

      {/* PDF 캡처용 hidden 영역 — 화면 밖에 렌더링 */}
      <div style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none', zIndex: -1 }} aria-hidden>
        <QuotePdfTemplate quote={quote} gradeLabel={grade.default} rootRef={quoteRootRef} />
        <PlanPdfTemplate quote={quote} gradeLabel={grade.default} rootRef={planRootRef} />
        <TipsPdfTemplate rootRef={tipsRootRef} />
      </div>
    </div>
  );
}

// ===== Step 3 하위 컴포넌트 =====

function StepNav({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-2 pt-4 border-t border-zinc-200 gap-3 flex-wrap">
      <div>{left}</div>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

function ResultBanner({
  quote, gradeLabel,
}: {
  quote: ReturnType<typeof buildQuote>;
  gradeLabel: string;
}) {
  const { totals, property } = quote;
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-5">
      <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">산출 완료</div>
      <div className="mt-1 text-lg sm:text-xl font-bold text-zinc-900">
        {property.pyeong}평 · {REGION_LABEL[property.region]} · {AGE_LABEL[property.age]} · {gradeLabel}
      </div>

      {/* 범위 표시 */}
      <div className="mt-4 rounded-lg bg-white/70 p-4">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">예상 공사비 (부가세 별도)</div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-900 tabular-nums">
            {fmtKRWShort(totals.grand_total_low)} ~ {fmtKRWShort(totals.grand_total_high)}
          </span>
          <span className="text-xs text-zinc-500">
            (중앙값 {fmtKRWShort(totals.grand_total)})
          </span>
        </div>
        <div className="text-[11px] text-zinc-600 mt-2">
          지역·연식 반영 · 10만원 단위 반올림 · ±5% 범위
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="부가세 포함" value={fmtKRWShort(totals.grand_total_with_vat)} />
        <Stat label="평당" value={`${fmtKRWShort(totals.per_pyeong)}/평`} />
        <Stat label="세부 공종 및 자재 항목 수" value={`${quote.line_items.length}건`} />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white/70 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-0.5 font-semibold tabular-nums ${highlight ? 'text-lg text-blue-900' : 'text-sm text-zinc-800'}`}>
        {value}
      </div>
    </div>
  );
}

function TrustNudge() {
  return (
    <Link href="/about" className="block group">
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 flex items-center gap-4 hover:border-blue-400 hover:shadow-sm transition">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-700 text-white flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide opacity-70 leading-none">since</span>
          <span className="text-sm font-bold leading-tight">15Y</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-zinc-900">누가 이 견적을 만들었나요?</div>
          <div className="text-xs text-zinc-600 leading-relaxed mt-0.5">
            대형 건설사 <strong>15년 시공·CS 경험</strong> · 건축사 + 건축시공기술사가 직접 검증한 데이터
          </div>
        </div>
        <span className="text-xs text-blue-700 font-semibold group-hover:underline">소개 보기 →</span>
      </div>
    </Link>
  );
}

function FinalNudge() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-zinc-50 to-blue-50/30 border border-zinc-200 p-5 text-center">
      <div className="text-sm text-zinc-700 leading-relaxed">
        견적 결과가 마음에 드시나요?
        <br className="sm:hidden" />
        위 카드에서 다음 단계를 선택하시면 <strong className="text-zinc-900">진짜 견적 비교</strong>가 시작됩니다.
      </div>
      <div className="mt-2 text-[11px] text-zinc-500">
        어떤 인테리어 업체와도 광고비·수수료·제휴 관계 없음
      </div>
    </div>
  );
}



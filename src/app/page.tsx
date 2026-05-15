'use client';

import { useMemo, useState } from 'react';
import { PropertyForm } from '@/components/PropertyForm';
import { ScopeMatrix } from '@/components/ScopeMatrix';
import { GradeSelector } from '@/components/GradeSelector';
import { MaterialOverrides } from '@/components/MaterialOverrides';
import { QuotePanel } from '@/components/QuotePanel';
import { StepIndicator } from '@/components/StepIndicator';
import { defaultGrade, defaultProperty, defaultScope } from '@/lib/defaults';
import { buildQuote, fmtKRWShort } from '@/lib/calculator';

type Step = 1 | 2 | 3;

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [maxReached, setMaxReached] = useState<Step>(1);
  const [property, setProperty] = useState(defaultProperty());
  const [scope, setScope] = useState(defaultScope());
  const [grade, setGrade] = useState(defaultGrade());

  const quote = useMemo(
    () => buildQuote(property, scope, grade),
    [property, scope, grade]
  );

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

  return (
    <div className="flex-1 w-full">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">apt-planner</h1>
            <p className="text-xs text-zinc-500">우리집 인테리어 공사비 산정 · 1단계 MVP</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
            {quote.quote_id}
          </span>
        </div>
      </header>

      <StepIndicator current={step} maxReached={maxReached} onStepClick={goTo} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {step === 1 && (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <PropertyForm value={property} onChange={setProperty} />
            <ScopeMatrix property={property} value={scope} onChange={setScope} />

            <StepNav
              right={
                <button
                  onClick={() => goTo(2)}
                  className="btn-primary"
                >
                  다음: 자재 등급 선택 →
                </button>
              }
            />
          </div>
        )}

        {step === 2 && (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <GradeSelector value={grade} onChange={setGrade} />
            <MaterialOverrides quote={quote} value={grade} onChange={setGrade} />

            <StepNav
              left={
                <button onClick={() => goTo(1)} className="btn-secondary">
                  ← 이전
                </button>
              }
              right={
                <button onClick={() => goTo(3)} className="btn-primary">
                  공사비 계산하기 →
                </button>
              }
            />
          </div>
        )}

        {step === 3 && (
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            <ResultBanner quote={quote} property={{
              pyeong: property.pyeong,
              grade: grade.default,
            }} />
            <QuotePanel quote={quote} />

            <StepNav
              left={
                <button onClick={() => goTo(2)} className="btn-secondary">
                  ← 이전: 등급 수정
                </button>
              }
              right={
                <button onClick={reset} className="btn-secondary">
                  새로 시작
                </button>
              }
            />
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-zinc-500">
          ※ 본 견적은 표준 자재가 기준의 예상치이며, 실제 시공·견적은 업체 협의가 필요합니다.
        </div>
      </footer>
    </div>
  );
}

function StepNav({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-2 pt-4 border-t border-zinc-200">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function ResultBanner({
  quote, property,
}: {
  quote: ReturnType<typeof buildQuote>;
  property: { pyeong: number; grade: string };
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-5">
      <div className="text-xs text-emerald-700 font-medium">📊 산출 완료</div>
      <div className="mt-1 text-2xl font-bold text-zinc-900">
        {property.pyeong}평 · {property.grade} 기준 예상 공사비
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="총 공사비" value={fmtKRWShort(quote.totals.grand_total)} highlight />
        <Stat label="부가세 포함" value={fmtKRWShort(quote.totals.grand_total_with_vat)} />
        <Stat label="평당" value={`${fmtKRWShort(quote.totals.per_pyeong)}/평`} />
        <Stat label="라인 항목" value={`${quote.line_items.length}건`} />
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

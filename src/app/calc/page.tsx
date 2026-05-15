'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PropertyForm } from '@/components/PropertyForm';
import { ScopeMatrix } from '@/components/ScopeMatrix';
import { GradeSelector } from '@/components/GradeSelector';
import { MaterialOverrides } from '@/components/MaterialOverrides';
import { QuotePanel } from '@/components/QuotePanel';
import { StepIndicator } from '@/components/StepIndicator';
import { QuotePdfTemplate } from '@/components/pdf/QuotePdfTemplate';
import { PlanPdfTemplate } from '@/components/pdf/PlanPdfTemplate';
import { TipsPdfTemplate } from '@/components/pdf/TipsPdfTemplate';
import { defaultGrade, defaultProperty, defaultScope } from '@/lib/defaults';
import { buildQuote, fmtKRWShort } from '@/lib/calculator';
import { exportPagedPdf } from '@/lib/pdf/export';

type Step = 1 | 2 | 3;

export default function CalcPage() {
  const [step, setStep] = useState<Step>(1);
  const [maxReached, setMaxReached] = useState<Step>(1);
  const [property, setProperty] = useState(defaultProperty());
  const [scope, setScope] = useState(defaultScope());
  const [grade, setGrade] = useState(defaultGrade());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);

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
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded bg-zinc-900 text-white text-xs flex items-center justify-center font-bold">a</span>
            <div>
              <div className="text-sm font-bold tracking-tight">apt-planner</div>
              <div className="text-[10px] text-zinc-500">우리집 인테리어 공사비 산정</div>
            </div>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/about" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">소개</Link>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
              {quote.quote_id}
            </span>
          </div>
        </div>
      </header>

      <StepIndicator current={step} maxReached={maxReached} onStepClick={goTo} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {step === 1 && (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <PropertyForm
              value={property}
              onChange={setProperty}
              rooms={scope.rooms}
              onRoomsChange={(rooms) => setScope({ ...scope, rooms })}
            />
            <ScopeMatrix property={property} value={scope} onChange={setScope} />

            <StepNav
              right={
                <button onClick={() => goTo(2)} className="btn-primary">
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
                <button onClick={() => goTo(1)} className="btn-secondary">← 이전</button>
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
            <ResultBanner quote={quote} gradeLabel={grade.default} />

            <FreePdfCard
              onDownload={() => downloadPdf('quote', quoteRootRef, `apt-planner_예상공사비_${property.pyeong}평_${quote.quote_id}.pdf`)}
              downloading={downloading === 'quote'}
            />

            <QuotePanel quote={quote} />

            <PremiumPromptCard onClick={() => setPremiumOpen(true)} />

            <StepNav
              left={
                <button onClick={() => goTo(2)} className="btn-secondary">← 이전: 등급 수정</button>
              }
              right={
                <button onClick={reset} className="btn-secondary">새로 시작</button>
              }
            />
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-zinc-500 flex justify-between">
          <span>※ 본 견적은 표준 자재가 기준의 예상치이며, 실제 시공·견적은 업체 협의가 필요합니다.</span>
          <span>업체 수수료·제휴 0건</span>
        </div>
      </footer>

      {/* 유료 신청 모달 */}
      {premiumOpen && (
        <PremiumModal
          onClose={() => setPremiumOpen(false)}
          onDownloadPlan={() => downloadPdf('plan', planRootRef, `apt-planner_인테리어계획서_${property.pyeong}평_${quote.quote_id}.pdf`)}
          onDownloadTips={() => downloadPdf('tips', tipsRootRef, `apt-planner_인테리어실전가이드.pdf`)}
          downloadingPlan={downloading === 'plan'}
          downloadingTips={downloading === 'tips'}
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
    <div className="flex items-center justify-between mt-2 pt-4 border-t border-zinc-200">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function ResultBanner({
  quote, gradeLabel,
}: {
  quote: ReturnType<typeof buildQuote>;
  gradeLabel: string;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-5">
      <div className="text-xs text-emerald-700 font-medium">📊 산출 완료</div>
      <div className="mt-1 text-2xl font-bold text-zinc-900">
        {quote.property.pyeong}평 · {gradeLabel} 기준 예상 공사비
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

function FreePdfCard({ onDownload, downloading }: { onDownload: () => void; downloading: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-xl">
        📄
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-zinc-900">예상 공사비 PDF 다운로드</div>
        <div className="text-xs text-zinc-500">공종별·공간별·상세 라인 포함 · 무료</div>
      </div>
      <button
        onClick={onDownload}
        disabled={downloading}
        className="btn-primary text-xs whitespace-nowrap"
      >
        {downloading ? '생성 중...' : '다운로드'}
      </button>
    </div>
  );
}

function PremiumPromptCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-emerald-50 p-5 text-left
                 hover:border-blue-500 hover:shadow-md transition w-full"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center text-2xl">
          ⭐
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              유료 패키지
            </span>
          </div>
          <h3 className="font-bold text-zinc-900 text-base mb-1">
            제대로 된 비교 견적을 받고 싶다면?
          </h3>
          <p className="text-sm text-zinc-600 leading-relaxed mb-3">
            지금 선택하신 사양 그대로 여러 인테리어 업체에 동일 조건으로 견적 요청할 수 있는
            <strong className="text-zinc-900"> 우리집 인테리어 계획서 PDF</strong>와
            <strong className="text-zinc-900"> 인테리어 실전 가이드 PDF</strong>를 받아보세요.
          </p>
          <ul className="space-y-0.5 text-xs text-zinc-700 mb-3">
            <li>✓ 자재 사양·수량 그대로의 시공자용 계획서</li>
            <li>✓ 인테리어 잘하는 법 · 좋은 업체 고르는 법</li>
            <li>✓ 견적 요청·비교·협상의 정석 가이드</li>
            <li>✓ 계약 직전 마지막 체크리스트</li>
          </ul>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
            자세히 보기 →
          </span>
        </div>
      </div>
    </button>
  );
}

function PremiumModal({
  onClose, onDownloadPlan, onDownloadTips, downloadingPlan, downloadingTips,
}: {
  onClose: () => void;
  onDownloadPlan: () => void;
  onDownloadTips: () => void;
  downloadingPlan: boolean;
  downloadingTips: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-700 mb-2">
                ⭐ 유료 패키지 · 데모 버전
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                인테리어 계획서 + 실전 가이드 패키지
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none"
              aria-label="닫기"
            >
              ×
            </button>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-6 text-xs text-amber-900">
            <strong>현재 데모 버전</strong> — 결제 연동 전이라 두 PDF 모두 무료로 다운로드 가능합니다.
            실서비스 출시 시 결제 후 다운로드되도록 변경됩니다.
          </div>

          <div className="space-y-4 mb-6">
            <PackageItem
              icon="📋"
              title="우리집 인테리어 계획서 PDF"
              desc="선택하신 자재·수량 그대로의 상세 계획서. 인테리어 업체에 그대로 전달하면 같은 조건으로 비교 견적을 받을 수 있습니다."
              bullets={[
                '공간별 자재 사양·수량 표 (시공자 단가 기재용 빈칸 포함)',
                '견적 회신 시 업체 답변 체크리스트',
                '추가금 발생 가능 항목 사전 안내',
              ]}
              onDownload={onDownloadPlan}
              downloading={downloadingPlan}
            />
            <PackageItem
              icon="📖"
              title="인테리어 실전 가이드 PDF"
              desc="인테리어 처음하는 분들이 가장 궁금해하는 핵심을 정리한 가이드입니다."
              bullets={[
                '인테리어 잘하는 법 — 5가지 원칙',
                '좋은 업체 vs 위험한 업체 구분법',
                '견적 요청·비교·협상의 정석',
                '계약 직전 마지막 체크리스트',
              ]}
              onDownload={onDownloadTips}
              downloading={downloadingTips}
            />
          </div>

          <div className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-200 pt-4">
            🔒 <strong>중립성 약속</strong>: 본 패키지는 어떤 인테리어 업체와도 무관하게 제작된 소비자용 자료입니다.
            특정 업체를 추천·노출하지 않으며, 광고비·제휴비를 받지 않습니다.
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageItem({
  icon, title, desc, bullets, onDownload, downloading,
}: {
  icon: string;
  title: string;
  desc: string;
  bullets: string[];
  onDownload: () => void;
  downloading: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-900 mb-1">{title}</h3>
          <p className="text-xs text-zinc-600 leading-relaxed mb-2">{desc}</p>
          <ul className="space-y-0.5 text-xs text-zinc-700 mb-3">
            {bullets.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-600 flex-shrink-0">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={onDownload}
            disabled={downloading}
            className="btn-primary text-xs"
          >
            {downloading ? '생성 중...' : '다운로드'}
          </button>
        </div>
      </div>
    </div>
  );
}

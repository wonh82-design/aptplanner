'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PropertyForm } from '@/components/PropertyForm';
import { MaterialOverrides } from '@/components/MaterialOverrides';
import { QuotePanel } from '@/components/QuotePanel';
import { StepIndicator } from '@/components/StepIndicator';
import { LivePricePreview } from '@/components/LivePricePreview';
import { WizardSidebar } from '@/components/WizardSidebar';
import { SiteHeader } from '@/components/SiteHeader';
import { PlanRequestModal } from '@/components/PlanRequestModal';
import { MobileBottomBar } from '@/components/MobileBottomBar';
import { ResultShareBar } from '@/components/ResultShareBar';
import { defaultGrade, defaultProperty, defaultScope } from '@/lib/defaults';
import { buildQuote, fmtKRWShort, fmtKRWShortVat, REGION_LABEL, AGE_LABEL } from '@/lib/calculator';
import { buildPlanDoc } from '@/lib/plan-doc';
import { track } from '@/lib/analytics';
import type { GradeGroup, GradeSelection, Property, Scope } from '@/lib/types';
import { getAllMaterials } from '@/lib/materials';

type Step = 1 | 2 | 3;

const STORAGE_KEY = 'apt-planner:calc:v3';
const STORAGE_VERSION = 3;

/** 단일 세션 동안 변하지 않는 quote_id 생성 */
function generateQuoteId(): string {
  return 'Q-' + new Date().toISOString().slice(0, 10) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * localStorage에 저장하는 상태.
 * v2부터 `step`은 저장하지 않는다 — 페이지 진입 시 항상 Step 1로 시작.
 * (랜딩 → /calc 진입 시 이전 세션이 Step 4였다고 자동으로 결과 화면으로 점프되던 문제 방지)
 * `maxReached`는 유지하여 사용자가 StepIndicator로 이전 진행 단계까지 자유롭게 점프 가능.
 */
type StoredState = {
  version: number;
  property: Property;
  scope: Scope;
  grade: GradeSelection;
  maxReached: Step;
  quoteId: string;
  /** Step 2 가격 게이트 — 프리셋·자재등급 한번에 정하기를 각각 선택했는지 (additive, 구버전 데이터엔 없음) */
  step2Picked?: { preset: boolean; bulkGrade: boolean };
};

export default function CalcPage() {
  const [step, setStep] = useState<Step>(1);
  const [maxReached, setMaxReached] = useState<Step>(1);
  const [property, setProperty] = useState(defaultProperty());
  const [scope, setScope] = useState(defaultScope());
  const [grade, setGrade] = useState(defaultGrade());
  const [planOpen, setPlanOpen] = useState(false);
  /**
   * Step 2 가격 게이트 — '공사범위 간단 지정'(프리셋)과 '자재등급 한번에 정하기'를
   * 각각 한 번 이상 선택해야 Step 2에서 총 예상 공사비가 표시된다.
   * (기본값 기반 금액이 사용자가 고르기도 전에 앵커링되는 것을 방지)
   */
  const [step2Picked, setStep2Picked] = useState<{ preset: boolean; bulkGrade: boolean }>({
    preset: false,
    bulkGrade: false,
  });
  // quote_id는 세션 단위로 freeze — 입력 변경 시 ID가 바뀌지 않는다.
  const [quoteId, setQuoteId] = useState<string>(() => generateQuoteId());
  // localStorage 복원 알림 배너
  const [restored, setRestored] = useState(false);
  // Step 1 → Step 2 진행 시 확인 모달 노출
  const [confirmStep2Open, setConfirmStep2Open] = useState(false);
  // hydration 완료 플래그 — 완료 전엔 저장 useEffect를 무시 (default 덮어쓰기 방지)
  const hydratedRef = useRef(false);

  // ---- localStorage hydrate (1회) ----
  // step은 의도적으로 복원하지 않는다 — 항상 Step 1(우리집 현황)부터 시작.
  // 사용자가 랜딩에서 "예상공사비 알아보기" 버튼으로 진입했을 때
  // 이전 세션의 Step 4(결과 화면)로 자동 점프되던 문제 방지.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) { hydratedRef.current = true; return; }
      const data = JSON.parse(raw) as Partial<StoredState>;
      if (data.version !== STORAGE_VERSION) { hydratedRef.current = true; return; }
      if (data.property) setProperty(data.property);
      if (data.scope) setScope(data.scope);
      if (data.grade) setGrade(data.grade);
      if (data.maxReached) setMaxReached(data.maxReached);
      if (data.quoteId) setQuoteId(data.quoteId);
      if (data.step2Picked) {
        setStep2Picked({
          preset: !!data.step2Picked.preset,
          bulkGrade: !!data.step2Picked.bulkGrade,
        });
      }
      setRestored(true);
    } catch { /* ignore */ }
    hydratedRef.current = true;
  }, []);

  // ---- localStorage persist (state 변경마다) ----
  // step은 저장하지 않는다 (페이지 진입 시 항상 1로 시작하므로 무의미).
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      const data: StoredState = {
        version: STORAGE_VERSION,
        property, scope, grade, maxReached, quoteId, step2Picked,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, [property, scope, grade, maxReached, quoteId, step2Picked]);

  // ---- 평형이 0이 되면 Step 1로 강제 복귀 + 진행 차단 ----
  const pyeongValid = property.pyeong > 0;
  useEffect(() => {
    if (!pyeongValid && (step > 1 || maxReached > 1)) {
      setStep(1);
      setMaxReached(1);
    }
  }, [pyeongValid, step, maxReached]);

  // quote_id는 useMemo 결과를 freeze
  const quote = useMemo(
    () => {
      const q = buildQuote(property, scope, grade);
      return { ...q, quote_id: quoteId };
    },
    [property, scope, grade, quoteId]
  );

  // 견적이 비어 있는지 (모든 공사 OFF 또는 평형 0)
  const scopeEmpty = !pyeongValid || quote.line_items.length === 0 || quote.totals.grand_total === 0;

  // Step 2 가격 게이트 통과 여부 — 프리셋 + 자재등급 한번에 정하기 모두 선택 시 금액 공개
  const priceRevealed = step2Picked.preset && step2Picked.bulkGrade;

  const goTo = (s: Step) => {
    // 평형 미입력 상태에서 Step 2+ 진입 차단
    if (s > 1 && !pyeongValid) return;
    // 처음 도달하는 단계만 complete_step 이벤트로 트래킹 (단순 점프는 제외)
    if (s > maxReached) {
      track('complete_step', {
        step: s,
        from_step: step,
        pyeong: property.pyeong,
        grade: grade.default,
      });
    }
    setStep(s);
    if (s > maxReached) setMaxReached(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setProperty(defaultProperty());
    setScope(defaultScope());
    setGrade(defaultGrade());
    setStep2Picked({ preset: false, bulkGrade: false });
    setMaxReached(1);
    setQuoteId(generateQuoteId());
    setRestored(false);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    goTo(1);
  };

  const dismissRestored = () => setRestored(false);

  /**
   * '우리집 인테리어 계획서' 신청 처리.
   * 결과 화면과 동일한 공종 분류(buildPlanDoc)로 섹션을 만들어 quote 와 함께 전송.
   * 서버가 이를 받아 '공사계획서 PPTX'(공종별 공사범위·스펙·수량·공사비)를 생성해 관리자에게 메일 발송.
   */
  const handlePlanSubmit = async (name: string, email: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      // 결과 화면과 100% 동일한 공종 분류 — 현재 로드된 자재 기준으로 클라이언트에서 생성해 전송.
      const sections = buildPlanDoc(quote).sections;
      const res = await fetch('/api/plan-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          quote,    // 전체 산정 내역 — DB 보존 + 서버 PPTX 재생성용
          sections, // 공종별 섹션 — 결과 화면과 동일한 공종으로 PPTX 렌더
          meta: {
            pyeong: property.pyeong,
            bay: property.bay,
            rooms: property.rooms,
            grade: grade.default,
            region: REGION_LABEL[property.region],
            age: AGE_LABEL[property.age],
            grand_total: quote.totals.grand_total,
            line_item_count: quote.line_items.length,
            quote_id: quote.quote_id,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        return { ok: false, error: data?.error || `status_${res.status}` };
      }
      track('submit_plan_request', {
        pyeong: property.pyeong,
        grade: grade.default,
        grand_total: quote.totals.grand_total,
        quote_id: quote.quote_id,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'network' };
    }
  };

  return (
    <div className="flex-1 w-full">
      <SiteHeader />

      <StepIndicator current={step} maxReached={maxReached} onStepClick={goTo} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        {/* ===== Step 1: 우리집 현황 — 사이드바 등장 (예상 공사비 카드는 미노출) ===== */}
        {step === 1 && (
          <div className="pb-24 lg:pb-0 lg:grid lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-6 lg:h-[calc(100vh-7rem)]">
            <WizardSidebar
              step={1}
              property={property}
              scope={scope}
              quote={quote}
              gradeLabel={grade.default}
              onJumpToStep={goTo}
              onNext={() => setConfirmStep2Open(true)}
              nextDisabled={!pyeongValid}
              nextLabel="다음 단계"
            />
            <div className="w-full max-w-3xl mx-auto lg:max-w-none lg:mx-0 flex flex-col gap-4 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-2">
              {restored && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 flex items-center gap-2 text-xs text-emerald-900">
                  <span className="flex-shrink-0">↻</span>
                  <span className="flex-1">이전에 입력한 내용을 자동으로 복원했어요.</span>
                  <button
                    onClick={reset}
                    className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2 font-medium whitespace-nowrap"
                  >
                    처음부터 시작
                  </button>
                  <button
                    onClick={dismissRestored}
                    className="text-emerald-600 hover:text-emerald-900 ml-1"
                    aria-label="알림 닫기"
                  >
                    ×
                  </button>
                </div>
              )}
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
              {!pyeongValid && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  💡 평형을 먼저 입력해주세요. 입력하시면 공종 및 자재 선택으로 진행할 수 있습니다.
                </div>
              )}
              {/* 모바일 — 하단 고정 CTA (스크롤 위치와 무관하게 진행 가능) */}
              <MobileBottomBar
                onNext={() => setConfirmStep2Open(true)}
                nextLabel="다음 단계"
                nextDisabled={!pyeongValid}
                hint={!pyeongValid ? '평형을 입력하면 다음 단계로 진행할 수 있어요' : undefined}
              />
            </div>
          </div>
        )}

        {/* ===== Step 2: 공종 및 자재 세부 선택 — 공사범위·등급·개별자재 통합 ===== */}
        {step === 2 && (
          <div className="pb-24 lg:pb-0 lg:grid lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-6 lg:h-[calc(100vh-7rem)]">
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
              nextLabel="최종 결과"
              hidePrice={!priceRevealed}
            />
            <div className="w-full max-w-3xl mx-auto lg:max-w-none lg:mx-0 flex flex-col gap-4 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-2">
              {/* 모바일 sticky 배너 — LivePricePreview 가 자체적으로 lg:hidden 처리.
                  부모 flex 의 직접 자식이어야 sticky 가 동작 (wrapper 안에 단독으로 두면 무효). */}
              <LivePricePreview quote={quote} locked={!priceRevealed} />
              <MaterialOverrides
                quote={quote}
                value={grade}
                onChange={setGrade}
                scope={scope}
                onScopeChange={setScope}
                property={property}
                onJumpToProperty={() => goTo(1)}
                bulkGradePicked={step2Picked.bulkGrade}
                presetPicked={step2Picked.preset}
                onPresetApplied={() => setStep2Picked(p => (p.preset ? p : { ...p, preset: true }))}
                onBulkGradeApplied={() => setStep2Picked(p => (p.bulkGrade ? p : { ...p, bulkGrade: true }))}
              />

              {/* 모바일 — 하단 고정 CTA: 현재 총액 + 결과 보기 (12+화면 스크롤 어디서든 진행) */}
              <MobileBottomBar
                onBack={() => goTo(1)}
                onNext={() => goTo(3)}
                nextLabel="최종 결과 보기"
                price={priceRevealed ? fmtKRWShortVat(quote.totals.grand_total) : null}
                hint={priceRevealed ? undefined : '프리셋·자재등급을 선택하면 공사비가 표시돼요'}
              />
            </div>
          </div>
        )}

        {/* ===== Step 3: 공사비 결과 — 풀폭 결과 페이지 ===== */}
        {step === 3 && (
          <div className="max-w-5xl mx-auto flex flex-col gap-5">
            {scopeEmpty ? (
              <EmptyScopeNotice
                onBackToScope={() => goTo(2)}
                onReset={reset}
              />
            ) : (
              <>
                <ResultBanner
                  quote={quote}
                  gradeLabel={grade.default}
                  currentGrade={grade.default}
                  hasOverrides={
                    Object.keys(grade.overrides).length > 0 ||
                    Object.keys(grade.material_overrides).length > 0
                  }
                  onChangeGrade={(g) => {
                    // 자재등급 한번에 정하기와 동일 — 모든 공종 일괄 + 개별 설정 초기화.
                    setGrade({ default: g, overrides: {}, material_overrides: {} });
                    // 결과에서 등급을 골랐으면 Step 2 가격 게이트의 등급 선택으로도 인정.
                    setStep2Picked((p) => (p.bulkGrade ? p : { ...p, bulkGrade: true }));
                  }}
                />

                {/* 결과 요약 저장·공유 — 가족 공유/업체 전달 루프 */}
                <ResultShareBar quote={quote} gradeLabel={grade.default} />

                {/* 견적 상세 내역 — 총공사비 바로 아래 항상 펼침 */}
                <QuotePanel quote={quote} />

                {/* ===== 유료 — 우리집 인테리어 계획서 받기 (₩5,900) ===== */}
                <div className="rounded-2xl border-2 border-blue-500 bg-white overflow-hidden shadow-lg">
                  <div className="bg-blue-600 text-white text-xs font-bold text-center py-1.5 uppercase tracking-wider">
                    우리집 맞춤 인테리어 계획서
                  </div>
                  <div className="p-5 sm:p-7">
                    <h3 className="text-lg sm:text-xl font-bold text-zinc-900">우리집 인테리어 계획서 받기</h3>
                    <div className="mt-1.5 mb-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold mb-1.5">
                        🎉 출시 기념 70% 할인
                      </span>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-base text-zinc-400 line-through tabular-nums">₩19,800</span>
                        <span className="text-3xl font-extrabold text-blue-700 tabular-nums">₩5,900</span>
                        <span className="text-xs text-zinc-500">· 자료 수령 후 입금</span>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-600 leading-relaxed mb-4">
                      신청하시면 지금 산출한 공사 내역을 바탕으로 아래 <strong className="text-zinc-900">2부의 문서</strong>를
                      <strong className="text-zinc-900"> 수정 가능한 파워포인트(PPT)와 엑셀</strong>로 보내드립니다.
                      <strong className="text-zinc-900"> 자료를 먼저 받아보신 후</strong> 계좌로 입금하시면 됩니다.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 mb-5">
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
                        <div className="text-sm font-bold text-zinc-900 mb-1">① 우리집 공사계획서</div>
                        <div className="text-xs text-zinc-600 leading-relaxed">앱에서 산출한 <strong>공사범위·스펙·기준 공사비</strong>를 정리한 우리집 전용 계획서</div>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                        <div className="text-sm font-bold text-zinc-900 mb-1">② 업체 견적용 공사계획서</div>
                        <div className="text-xs text-zinc-600 leading-relaxed"><strong>공사범위·스펙</strong> + 업체가 대안자재·견적가를 <strong>바로 기재</strong>할 수 있는 견적요청서</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setPlanOpen(true)}
                      className="w-full py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition active:scale-[0.98]"
                    >
                      신청하기
                    </button>
                    <p className="text-[11px] text-zinc-500 mt-3 text-center">
                      신청 후 <strong>24시간 이내</strong>에 메일로 송부드립니다.
                    </p>
                  </div>
                </div>

                {/* 마무리 nudge */}
                <FinalNudge />
              </>
            )}

            <StepNav
              left={
                <button onClick={() => goTo(2)} className="btn-secondary">← 자재 수정</button>
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

      {/* 우리집 인테리어 계획서 신청 모달 — 성명·이메일 입력 → 관리자 메일(PDF 첨부) */}
      {planOpen && (
        <PlanRequestModal
          onClose={() => setPlanOpen(false)}
          onSubmit={handlePlanSubmit}
        />
      )}

      {/* Step 1 → Step 2 진행 전 확인 모달 */}
      {confirmStep2Open && (
        <PropertyConfirmModal
          property={property}
          scope={scope}
          onConfirm={() => {
            setConfirmStep2Open(false);
            goTo(2);
          }}
          onCancel={() => setConfirmStep2Open(false)}
        />
      )}
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
  quote, gradeLabel, currentGrade, hasOverrides, onChangeGrade,
}: {
  quote: ReturnType<typeof buildQuote>;
  gradeLabel: string;
  /** 현재 기본 등급 — 토글 강조용 */
  currentGrade: GradeGroup;
  /** 개별 공종/자재 설정 존재 여부 — 토글 시 초기화 경고 표시용 */
  hasOverrides: boolean;
  /** 등급 일괄 변경 (자재등급 한번에 정하기와 동일 동작) */
  onChangeGrade: (g: GradeGroup) => void;
}) {
  const { totals, property } = quote;
  const GRADE_TOGGLE: { key: GradeGroup; label: string; desc: string }[] = [
    { key: '가성비', label: '가성비', desc: '실속·경제형' },
    { key: '표준', label: '표준', desc: '주류·균형형' },
    { key: '고급', label: '고급', desc: '프리미엄' },
  ];
  // 시공 방식별 base = 부가세 포함 기준
  const base = totals.grand_total_with_vat;

  // 10만원 단위 반올림
  const r100k = (n: number) => Math.round(n / 100_000) * 100_000;

  // 3가지 시공 방식별 공사비 범위
  const scenarios = [
    {
      key: 'self',
      label: '반셀프 인테리어',
      desc: '직영·내가 직접 챙김',
      range: '±5%',
      low: r100k(base * 0.95),
      high: r100k(base * 1.05),
      tone: 'emerald',
    },
    {
      key: 'local',
      label: '동네 인테리어업체 턴키',
      desc: '지역 종합 업체에 일임',
      range: '+5~15%',
      low: r100k(base * 1.05),
      high: r100k(base * 1.15),
      tone: 'blue',
    },
    {
      key: 'design',
      label: '디자인 턴키업체',
      desc: '디자이너 포함 프리미엄',
      range: '+10~20%',
      low: r100k(base * 1.10),
      high: r100k(base * 1.20),
      tone: 'amber',
    },
  ] as const;

  const toneClass = (tone: 'emerald' | 'blue' | 'amber') => {
    if (tone === 'emerald') return { border: 'border-emerald-300', bg: 'bg-emerald-50/70', label: 'text-emerald-700', value: 'text-emerald-900', chip: 'bg-emerald-100 text-emerald-700' };
    if (tone === 'blue') return { border: 'border-blue-300', bg: 'bg-blue-50/70', label: 'text-blue-700', value: 'text-blue-900', chip: 'bg-blue-100 text-blue-700' };
    return { border: 'border-amber-300', bg: 'bg-amber-50/70', label: 'text-amber-700', value: 'text-amber-900', chip: 'bg-amber-100 text-amber-800' };
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-5">
      <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">산출 완료</div>
      <div className="mt-1 text-lg sm:text-xl font-bold text-zinc-900">
        {property.pyeong}평 · {REGION_LABEL[property.region]} · {AGE_LABEL[property.age]} · {gradeLabel}
      </div>

      {/* 등급 즉시 전환 — "고급이면 얼마지?"를 결과 화면에서 바로 해소.
          자재등급 한번에 정하기와 동일하게 모든 공종 일괄 적용(개별 설정 초기화). */}
      <div className="mt-3">
        <div className="grid grid-cols-3 gap-1.5">
          {GRADE_TOGGLE.map((g) => {
            const selected = currentGrade === g.key && !hasOverrides;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => onChangeGrade(g.key)}
                className={`px-2 py-2 rounded-lg border-2 text-left transition active:scale-[0.98] bg-white/80 ${
                  selected
                    ? 'border-emerald-400 ring-1 ring-emerald-200 bg-emerald-50/80'
                    : 'border-zinc-200 hover:border-emerald-300'
                }`}
              >
                <span className={`block text-sm font-bold ${selected ? 'text-emerald-800' : 'text-zinc-700'}`}>
                  {g.label}
                  {selected && <span className="ml-1 text-emerald-600 text-xs" aria-hidden>✓</span>}
                </span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">{g.desc}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-500">
          등급을 탭하면 모든 공종에 일괄 적용되어 아래 금액이 즉시 바뀝니다.
          {hasOverrides && <span className="text-amber-700 font-medium"> 개별 설정한 공종·자재는 초기화돼요.</span>}
        </p>
      </div>

      {/* 3가지 시공 방식별 공사비 — 부가세 포함 */}
      <div className="mt-4 rounded-lg bg-white/70 p-4">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold">
            시공 방식별 예상 공사비 <span className="text-zinc-400 normal-case">(부가세 포함)</span>
          </div>
          <div className="text-[10px] text-zinc-400 tabular-nums">
            기준 {fmtKRWShort(base)}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {scenarios.map((s) => {
            const c = toneClass(s.tone);
            // 평당 환산 — 10만원 단위 반올림
            const pyeong = property.pyeong || 1;
            const lowPerPy = r100k(s.low / pyeong);
            const highPerPy = r100k(s.high / pyeong);
            return (
              <div key={s.key} className={`rounded-lg border ${c.border} ${c.bg} p-3 flex flex-col`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className={`text-[12px] font-bold ${c.label} leading-tight`}>{s.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{s.desc}</div>
                  </div>
                  <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${c.chip} whitespace-nowrap`}>
                    {s.range}
                  </span>
                </div>
                <div className={`text-base sm:text-lg font-extrabold tabular-nums ${c.value} mt-auto leading-tight`}>
                  {fmtKRWShort(s.low)} ~ {fmtKRWShort(s.high)}
                </div>
                <div className="text-[10px] text-zinc-500 tabular-nums mt-1 leading-tight">
                  평당 <span className="font-semibold text-zinc-700">{fmtKRWShort(lowPerPy)} ~ {fmtKRWShort(highPerPy)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
          ※ 자재마스터 <strong className="text-zinc-800">{getAllMaterials().length}종</strong> 실거래 시장가 기준 산출 ·
          모든 금액은 부가세(10%) 포함, 지역·연식 보정 및 10만원 단위 반올림.
          시공 방식별 비율은 시장 평균 추정치이며, 업체·디자인 난이도에 따라 다를 수 있습니다.
        </div>
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

/**
 * 견적이 비어있을 때(공사 범위 0건 또는 평형 미입력) 결과 페이지 대신 표시되는 안내 카드.
 * PDF 다운로드·스펙북·컨설팅 신청 버튼은 모두 비노출 — 사용자를 Step 2로 유도.
 */
function EmptyScopeNotice({
  onBackToScope, onReset,
}: {
  onBackToScope: () => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-6 sm:p-8 text-center">
      <div className="text-4xl mb-3">📋</div>
      <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-2">
        아직 선택된 공사 범위가 없어요
      </h2>
      <p className="text-sm text-zinc-600 leading-relaxed max-w-md mx-auto mb-5">
        공사 범위 단계에서 시공할 공종을 한 개 이상 선택해야
        예상 공사비가 산출됩니다.
        <br />
        <span className="text-[11px] text-zinc-500">
          빠른 시작 프리셋(올수리·마감재만 등)을 선택하시면 편리해요.
        </span>
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button
          onClick={onBackToScope}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition active:scale-[0.98]"
        >
          공사 범위 선택하러 가기 →
        </button>
        <button
          onClick={onReset}
          className="px-5 py-2.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-sm transition"
        >
          처음부터 다시 시작
        </button>
      </div>
    </div>
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

// ===== Step 1 → 2 진행 전 우리집 현황 확인 모달 =====

function PropertyConfirmModal({
  property,
  scope,
  onConfirm,
  onCancel,
}: {
  property: Property;
  scope: Scope;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // 확장공사 계산: expansion_current=false && expansion_after=true 인 룸들
  const expansionRooms = (Object.entries(scope.rooms) as [string, typeof scope.rooms[keyof typeof scope.rooms]][])
    .filter(([, rs]) => rs && !rs.expansion_current && rs.expansion_after)
    .map(([id]) => id);
  const expansionText =
    expansionRooms.length === 0
      ? '확장공사 없음'
      : `${expansionRooms.join(', ')} 확장공사`;

  const bathCount = property.common_bath + property.master_bath;

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-confirm-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-200 bg-blue-50/50">
          <h2 id="property-confirm-title" className="text-lg font-bold text-zinc-900">
            우리집 현황 확인
          </h2>
          <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
            입력하신 내용을 확인해주세요.
          </p>
        </div>

        {/* 본문 — 정보 행 */}
        <dl className="px-5 sm:px-6 py-4 space-y-2.5 text-sm">
          <Row k="평형" v={`${property.pyeong}평`} />
          <Row k="베이" v={`${property.bay}베이`} />
          <Row k="지역" v={REGION_LABEL[property.region]} />
          <Row k="욕실수" v={`${bathCount}개 (공용 ${property.common_bath}, 부부 ${property.master_bath})`} />
          <Row k="아파트 연식" v={AGE_LABEL[property.age]} />
          <Row k="확장공사" v={expansionText} highlight={expansionRooms.length > 0} />
        </dl>

        {/* 버튼 */}
        <div className="px-5 sm:px-6 py-4 border-t border-zinc-200 bg-zinc-50/50 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 font-semibold text-sm transition"
          >
            다시 입력
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm"
          >
            입력한 내용이 맞아요
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, highlight = false }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-zinc-500 font-medium whitespace-nowrap">{k}</dt>
      <dd className={`text-sm font-semibold text-right ${highlight ? 'text-blue-700' : 'text-zinc-900'}`}>
        {v}
      </dd>
    </div>
  );
}


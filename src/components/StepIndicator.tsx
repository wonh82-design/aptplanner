'use client';

type Step = 1 | 2 | 3 | 4;

type Props = {
  current: Step;
  /** 사용자가 클릭하면 호출 (해당 단계가 도달 가능할 때만 enable) */
  onStepClick: (step: Step) => void;
  /** 어디까지 입력 완료했는지 (current까지는 항상 도달 가능) */
  maxReached: Step;
};

const STEPS: { id: Step; label: string; short: string }[] = [
  { id: 1, label: '우리집 현황', short: '현황' },
  { id: 2, label: '공사 범위',   short: '범위' },
  { id: 3, label: '자재 등급',   short: '등급' },
  { id: 4, label: '공사비 결과', short: '결과' },
];

export function StepIndicator({ current, maxReached, onStepClick }: Props) {
  const currentStep = STEPS.find(s => s.id === current);
  return (
    <nav aria-label="진행 단계" className="bg-white border-b border-zinc-200 sticky top-14 sm:top-16 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 sm:py-2">
        {/* 모바일 — 현재 단계 명시 라인 (컴팩트 한 줄) */}
        {currentStep && (
          <div className="sm:hidden flex items-baseline justify-center gap-1.5 mb-1">
            <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
              {currentStep.id} / {STEPS.length}
            </span>
            <span className="text-[11px] font-bold text-blue-900">
              {currentStep.label}
            </span>
          </div>
        )}

        {/* 4단계 원형 + 단축 라벨 — 얇고 컴팩트 */}
        <ol className="flex items-center">
          {STEPS.map((s, idx) => {
            const reachable = s.id <= maxReached;
            const isCurrent = s.id === current;
            const isDone = s.id < current;
            const connectorFilled = s.id < current;

            return (
              <li key={s.id} className="flex items-center flex-1 min-w-0 last:flex-none">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && onStepClick(s.id)}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${s.id}단계: ${s.label}`}
                  className={`flex items-center gap-1.5 sm:gap-2 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-md text-left min-w-0 transition
                    ${isCurrent ? 'sm:bg-blue-50' : ''}
                    ${reachable && !isCurrent ? 'hover:bg-zinc-50 cursor-pointer' : ''}
                    ${!reachable ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {/* 번호 원형 — 현재 단계 ring 강조 */}
                  <span
                    className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold transition flex-shrink-0
                      ${isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-100'
                        : isDone ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-200 text-zinc-500'}`}
                  >
                    {isDone ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : s.id}
                  </span>
                  {/* 라벨 — 모바일은 short, 데스크톱은 풀 라벨 1줄 (sub 제거) */}
                  <span className={`hidden sm:inline text-[11px] font-bold truncate leading-tight ${isCurrent ? 'text-blue-900' : isDone ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    {s.label}
                  </span>
                  <span className={`sm:hidden text-[10px] font-bold whitespace-nowrap ${isCurrent ? 'text-blue-900' : isDone ? 'text-emerald-700' : 'text-zinc-500'}`}>
                    {s.short}
                  </span>
                </button>
                {/* 연결선 — 현재 단계 직전까지 채워짐 */}
                {idx < STEPS.length - 1 && (
                  <span
                    className={`flex-shrink-0 mx-1 sm:mx-1.5 h-[2px] w-2.5 sm:w-6 rounded-full transition-colors ${
                      connectorFilled ? 'bg-emerald-500' : 'bg-zinc-200'
                    }`}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

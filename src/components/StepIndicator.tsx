'use client';

type Step = 1 | 2 | 3 | 4;

type Props = {
  current: Step;
  /** 사용자가 클릭하면 호출 (해당 단계가 도달 가능할 때만 enable) */
  onStepClick: (step: Step) => void;
  /** 어디까지 입력 완료했는지 (current까지는 항상 도달 가능) */
  maxReached: Step;
};

const STEPS: { id: Step; label: string; short: string; sub: string }[] = [
  { id: 1, label: '우리집 현황', short: '현황', sub: '평형·베이·욕실 등' },
  { id: 2, label: '공사 범위',   short: '범위', sub: '12개 큰 공종 선택' },
  { id: 3, label: '자재 등급',   short: '등급', sub: '전체 / 공종별 조정' },
  { id: 4, label: '공사비 결과', short: '결과', sub: '실시간 산출' },
];

export function StepIndicator({ current, maxReached, onStepClick }: Props) {
  return (
    <nav aria-label="진행 단계" className="bg-white border-b border-zinc-200 sticky top-14 sm:top-16 z-20">
      <ol className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center">
        {STEPS.map((s, idx) => {
          const reachable = s.id <= maxReached;
          const isCurrent = s.id === current;
          const isDone = s.id < current;
          // 진행도 — 현재 단계까지의 연결선은 채워짐
          const connectorFilled = s.id < current;

          return (
            <li key={s.id} className="flex items-center flex-1 min-w-0 last:flex-none">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onStepClick(s.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex items-center gap-2 sm:gap-2.5 px-1.5 sm:px-2 py-1.5 rounded-md text-left min-w-0 transition
                  ${isCurrent ? 'bg-blue-50' : ''}
                  ${reachable && !isCurrent ? 'hover:bg-zinc-50 cursor-pointer' : ''}
                  ${!reachable ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {/* 번호 원형 — 현재 단계는 ring으로 강조 */}
                <span
                  className={`flex items-center justify-center w-8 h-8 sm:w-8 sm:h-8 rounded-full text-sm font-bold transition flex-shrink-0
                    ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : isDone ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-200 text-zinc-500'}`}
                >
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : s.id}
                </span>
                {/* 라벨 — 모바일은 short, 데스크톱은 full+sub */}
                <div className="hidden sm:block min-w-0">
                  <div className={`text-xs font-bold truncate leading-tight ${isCurrent ? 'text-blue-900' : isDone ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    {s.label}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate leading-tight mt-0.5">{s.sub}</div>
                </div>
                <div className="sm:hidden min-w-0">
                  <div className={`text-[11px] font-bold truncate ${isCurrent ? 'text-blue-900' : isDone ? 'text-emerald-700' : 'text-zinc-500'}`}>
                    {isCurrent ? s.label : s.short}
                  </div>
                </div>
              </button>
              {/* 연결선 — 현재 단계 직전까지 채워짐 */}
              {idx < STEPS.length - 1 && (
                <span
                  className={`flex-shrink-0 mx-1 sm:mx-2 h-[2px] w-4 sm:w-8 rounded-full transition-colors ${
                    connectorFilled ? 'bg-emerald-500' : 'bg-zinc-200'
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

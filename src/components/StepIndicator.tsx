'use client';

type Step = 1 | 2 | 3;

type Props = {
  current: Step;
  /** 사용자가 클릭하면 호출 (해당 단계가 도달 가능할 때만 enable) */
  onStepClick: (step: Step) => void;
  /** 어디까지 입력 완료했는지 (current까지는 항상 도달 가능) */
  maxReached: Step;
};

const STEPS: { id: Step; label: string; sub: string }[] = [
  { id: 1, label: '우리집·공사 범위', sub: '평형과 무엇을 시공할지' },
  { id: 2, label: '자재 등급',         sub: '전체 / 공종별 조정' },
  { id: 3, label: '공사비 결과',       sub: '실시간 산출' },
];

export function StepIndicator({ current, maxReached, onStepClick }: Props) {
  return (
    <nav aria-label="진행 단계" className="bg-white border-b border-zinc-200">
      <ol className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-1 sm:gap-4">
        {STEPS.map((s, idx) => {
          const reachable = s.id <= maxReached;
          const isCurrent = s.id === current;
          const isDone = s.id < current;

          return (
            <li key={s.id} className="flex-1 flex items-center min-w-0">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onStepClick(s.id)}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left flex-1 min-w-0 transition
                  ${isCurrent ? 'bg-blue-50' : ''}
                  ${reachable && !isCurrent ? 'hover:bg-zinc-50 cursor-pointer' : ''}
                  ${!reachable ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition flex-shrink-0
                    ${isCurrent ? 'bg-blue-600 text-white'
                      : isDone ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-200 text-zinc-500'}`}
                >
                  {isDone ? '✓' : s.id}
                </span>
                <div className="flex-1 min-w-0 hidden sm:block">
                  <div className={`text-xs font-semibold truncate ${isCurrent ? 'text-blue-900' : isDone ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    {s.label}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{s.sub}</div>
                </div>
                <div className="flex-1 min-w-0 sm:hidden">
                  <div className={`text-xs font-semibold truncate ${isCurrent ? 'text-blue-900' : 'text-zinc-700'}`}>
                    {s.label}
                  </div>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <span className={`flex-shrink-0 mx-1 sm:mx-2 h-px w-4 sm:w-8 ${isDone ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

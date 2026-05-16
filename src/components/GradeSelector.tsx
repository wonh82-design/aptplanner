'use client';

import type { Grade, GradeSelection } from '@/lib/types';

const GRADES: { value: Grade; label: string; desc: string; tone: string }[] = [
  { value: '가성비', label: '가성비', desc: '실속·경제형',     tone: 'bg-emerald-50 border-emerald-300 text-emerald-900' },
  { value: '표준',   label: '표준',   desc: '주류·균형형',     tone: 'bg-blue-50 border-blue-300 text-blue-900' },
  { value: '고급',   label: '고급',   desc: '프리미엄·하이엔드', tone: 'bg-amber-50 border-amber-300 text-amber-900' },
];

type Props = {
  value: GradeSelection;
  onChange: (next: GradeSelection) => void;
};

export function GradeSelector({ value, onChange }: Props) {
  return (
    <section className="rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-zinc-200">
      <h2 className="text-base font-semibold mb-4">3. 자재 등급</h2>
      <p className="text-xs text-zinc-500 mb-3">
        전체 일괄 등급을 선택합니다. (공종별 개별 조정은 후속 단계에서 추가 예정)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {GRADES.map(g => {
          const selected = value.default === g.value;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => onChange({ ...value, default: g.value })}
              className={`px-2 sm:px-3 py-3 rounded-lg border-2 text-sm transition-all ${
                selected ? `${g.tone} font-semibold` : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="text-sm sm:text-base font-bold">{g.label}</div>
              <div className="text-[10px] sm:text-[11px] mt-0.5 opacity-80 leading-tight">{g.desc}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

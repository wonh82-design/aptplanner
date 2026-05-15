'use client';

import { useMemo, useState } from 'react';
import { PropertyForm } from '@/components/PropertyForm';
import { ScopeMatrix } from '@/components/ScopeMatrix';
import { GradeSelector } from '@/components/GradeSelector';
import { MaterialOverrides } from '@/components/MaterialOverrides';
import { QuotePanel } from '@/components/QuotePanel';
import { defaultGrade, defaultProperty, defaultScope } from '@/lib/defaults';
import { buildQuote } from '@/lib/calculator';

export default function Home() {
  const [property, setProperty] = useState(defaultProperty());
  const [scope, setScope] = useState(defaultScope());
  const [grade, setGrade] = useState(defaultGrade());

  const quote = useMemo(
    () => buildQuote(property, scope, grade),
    [property, scope, grade]
  );

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

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="flex flex-col gap-4 min-w-0">
            <PropertyForm value={property} onChange={setProperty} />
            <ScopeMatrix property={property} value={scope} onChange={setScope} />
            <GradeSelector value={grade} onChange={setGrade} />
            <MaterialOverrides quote={quote} value={grade} onChange={setGrade} />
          </div>
          <div>
            <QuotePanel quote={quote} />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-zinc-500">
          ※ 본 견적은 표준 자재가 기준의 예상치이며, 실제 시공·견적은 업체 협의가 필요합니다.
        </div>
      </footer>
    </div>
  );
}

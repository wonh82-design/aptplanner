'use client';

/**
 * PC 전용 좌측 사이드바 (lg 이상에서만 노출).
 * 4개 섹션:
 *   1) 총 예상 공사비 카드 (실시간)
 *   2) 우리집 현황 — 평형/베이/방/욕실/지역/연식/등급
 *   3) 공사 범위 — 12개 큰 공종 ON/OFF 요약
 *   4) 공종별 공사비 — by_category top 5
 *
 * 각 섹션은 <details> 아코디언. 현재 활성 단계의 섹션이 기본 펼침.
 * 헤더의 ✎ 버튼 클릭 시 해당 단계로 점프 + 섹션 펼침.
 *
 * 하단: 이전/다음 step nav 버튼.
 *
 * 모바일(< lg)에서는 hidden — 모바일은 LivePricePreview + 스택 레이아웃 사용.
 */

import { useEffect, useState } from 'react';
import { fmtKRWShort, REGION_LABEL, AGE_LABEL } from '@/lib/calculator';
import { activeRooms } from '@/lib/areas';
import { ROOM_WORK_META, GLOBAL_GROUPS } from '@/lib/scope-meta';
import type { Property, Scope, Quote, RoomId, RoomScope } from '@/lib/types';

type Step = 1 | 2 | 3;

type Props = {
  step: Step;
  property: Property;
  scope: Scope;
  quote: Quote;
  gradeLabel: string;
  onJumpToStep: (s: Step) => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  /** 다음 버튼 비활성화 — 버튼 자체는 노출하되 클릭만 막는다 (예: 평형 미입력) */
  nextDisabled?: boolean;
};

type SectionId = 'property' | 'scope' | 'category';

export function WizardSidebar({
  step, property, scope, quote, gradeLabel,
  onJumpToStep, onPrev, onNext, prevLabel, nextLabel, nextDisabled,
}: Props) {
  // 단계가 바뀌면 해당 단계의 섹션이 자동으로 펼쳐진다.
  // 사용자는 단계 안에서 자유롭게 다른 섹션을 열고 닫을 수 있다 (state로 보존).
  const [openMap, setOpenMap] = useState<Record<SectionId, boolean>>({
    property: step === 1,
    scope: step === 2,
    category: step >= 3,
  });
  useEffect(() => {
    setOpenMap({
      property: step === 1,
      scope: step === 2,
      category: step >= 3,
    });
  }, [step]);

  const toggle = (id: SectionId) => setOpenMap(m => ({ ...m, [id]: !m[id] }));
  const open = (id: SectionId) => setOpenMap(m => ({ ...m, [id]: true }));

  return (
    <aside className="hidden lg:flex flex-col gap-3 w-72 flex-shrink-0 lg:h-full overflow-y-auto pb-2">
      {/*
       * 총 예상 공사비 카드 — Step 2부터 노출.
       * Step 1(우리집 현황)에서는 카드를 숨겨 사이드바 상단을 비운다
       * (현황만 입력하는 단계라 가격 placeholder가 불필요).
       */}
      {step >= 2 && (
        <div className="rounded-xl bg-white border border-zinc-200 shadow-sm p-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wide">총 예상 공사비</span>
            <span className="text-[11px] text-zinc-500">{property.pyeong}평</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-blue-700">
              {fmtKRWShort(quote.totals.grand_total)}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            평당 약 {fmtKRWShort(quote.totals.per_pyeong)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100 leading-relaxed">
            범위 {fmtKRWShort(quote.totals.grand_total_low)} ~ {fmtKRWShort(quote.totals.grand_total_high)}
          </div>
        </div>
      )}

      {/* === 우리집 현황 — 모든 단계에서 노출. Step 1에서는 열어둠 === */}
      <SidebarSection
        title="우리집 현황"
        open={openMap.property}
        onToggle={() => toggle('property')}
        editable={step !== 1}
        onEdit={() => { onJumpToStep(1); open('property'); }}
      >
        <KvRow k="평형" v={`${property.pyeong}평`} />
        <KvRow k="베이" v={`${property.bay}베이`} />
        <KvRow k="방 (거실 제외)" v={`${property.rooms}개`} />
        <KvRow k="욕실" v={`공용 ${property.common_bath}${property.master_bath ? ' / 부부 있음' : ''}`} />
        <KvRow k="지역" v={REGION_LABEL[property.region]} />
        <KvRow k="연식" v={AGE_LABEL[property.age]} />
        {step >= 3 && <KvRow k="자재 등급" v={gradeLabel} />}
      </SidebarSection>

      {/* === 공사 범위 — Step 1에선 placeholder, Step 2+에선 실데이터 === */}
      <SidebarSection
        title="공사 범위"
        open={openMap.scope}
        onToggle={() => toggle('scope')}
        editable={step >= 2}
        onEdit={() => { onJumpToStep(2); open('scope'); }}
        locked={step === 1}
      >
        {step >= 2 ? (
          <ScopeSummary scope={scope} property={property} />
        ) : (
          <div className="py-2 text-[11px] text-zinc-500 leading-relaxed">
            다음 단계에서 시공할 큰 공종 12가지를 선택합니다.
          </div>
        )}
      </SidebarSection>

      {/* === 공종별 공사비 — Step 3+에서만 실데이터 === */}
      <SidebarSection
        title="공종별 공사비"
        open={openMap.category}
        onToggle={() => toggle('category')}
        editable={step >= 3}
        onEdit={() => { onJumpToStep(3); open('category'); }}
        locked={step < 3}
      >
        {step >= 3 ? (
          <CategoryBreakdown byCategory={quote.totals.by_category} />
        ) : (
          <div className="py-2 text-[11px] text-zinc-500 leading-relaxed">
            {step === 1
              ? '공사 범위 선택 후 자동으로 카테고리별 비용이 산출됩니다.'
              : '자재 등급 선택 단계에서 카테고리별 비용이 표시됩니다.'}
          </div>
        )}
      </SidebarSection>

      {/* === Nav 버튼 (하단) ===
          이전 버튼은 onPrev 가 있을 때만 노출(Step 1 엔 없음).
          다음 버튼은 onNext 가 있으면 항상 노출하되 nextDisabled 로 클릭만 차단
          → 평형 미입력 상태에서도 비활성 버튼이 보여 다음 단계 존재를 인지시킨다. */}
      {(onPrev || onNext) && (
        <div className={`mt-1 grid gap-2 ${onPrev ? 'grid-cols-[auto_1fr]' : 'grid-cols-1'}`}>
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              ← {prevLabel || '이전'}
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {nextLabel || '다음'} →
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

// =====================================================
// SidebarSection — 아코디언 + edit 버튼
// =====================================================

function SidebarSection({
  title, open, onToggle, editable, onEdit, locked, children,
}: {
  title: string;
  /** 펼침 여부 (controlled) */
  open: boolean;
  /** 사용자가 헤더 클릭 시 호출 */
  onToggle: () => void;
  editable?: boolean;
  onEdit?: () => void;
  /** 아직 도달하지 않은 섹션 — 톤 다운, edit 비활성 */
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className={`rounded-xl border shadow-sm group overflow-hidden ${
        locked ? 'bg-zinc-50/60 border-zinc-200' : 'bg-white border-zinc-200'
      }`}
    >
      <summary
        onClick={(e) => { e.preventDefault(); onToggle(); }}
        className="cursor-pointer flex items-center justify-between gap-2 px-4 py-3 list-none hover:bg-zinc-50 transition"
      >
        <span className={`text-sm font-bold ${locked ? 'text-zinc-500' : 'text-zinc-900'}`}>
          {title}
          {locked && (
            <span className="ml-2 text-[9px] font-normal text-zinc-400 uppercase tracking-wider">대기</span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {editable && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEdit?.(); } }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-zinc-500 hover:text-blue-700 hover:bg-blue-50 border border-zinc-200 hover:border-blue-300 transition text-[11px] font-medium"
              title="이 항목 수정"
              aria-label="수정"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>수정</span>
            </span>
          )}
          {/* 접기/펼치기 버튼 — 클릭 영역 키움 */}
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 group-hover:text-zinc-700 transition-transform group-open:rotate-180"
            aria-hidden
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </summary>
      <div className="px-4 pb-3 pt-1 space-y-0.5">{children}</div>
    </details>
  );
}

// =====================================================
// KvRow — key:value 표시 한 줄
// =====================================================

function KvRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 border-b border-zinc-50 last:border-b-0">
      <span className="text-[11px] text-zinc-500 truncate flex-shrink-0">{k}</span>
      <span className="text-xs font-semibold text-zinc-900 truncate text-right">{v}</span>
    </div>
  );
}

// =====================================================
// ScopeSummary — 12 큰 공종 ON/OFF 요약
// =====================================================

function ScopeSummary({ scope, property }: { scope: Scope; property: Property }) {
  const visibleRooms = activeRooms(property) as RoomId[];
  const roomOn = (key: keyof RoomScope) => visibleRooms.some(r => Boolean(scope.rooms[r]?.[key]));

  // 세부 공사범위 항목 — 큰 그룹이 아니라 개별 공종 단위로 시공/안 함을 보여준다.
  // (프리셋 간 단열·몰딩·에어컨·중문 등 차이가 그룹 안에 묻히지 않고 그대로 드러나도록)
  const items: { label: string; on: boolean }[] = [];
  // 1) 공간 마감·설비 (바닥재/도배/몰딩/외창/에어컨/붙박이장/실링팬)
  for (const w of ROOM_WORK_META) items.push({ label: w.label, on: roomOn(w.key) });
  // 2) 확장공사 (신규 확장 계획 공간이 있을 때만)
  items.push({
    label: '확장공사',
    on: visibleRooms.some(r => {
      const rs = scope.rooms[r];
      return !!rs && rs.expansion_after && !rs.expansion_current;
    }),
  });
  // 3) 글로벌 공종 전체 (GLOBAL_GROUPS — 철거/단열/전기/설비/욕실/주방/조명/문/발코니/기타)
  for (const g of GLOBAL_GROUPS) {
    for (const it of g.items) items.push({ label: it.label, on: !!scope.global[it.key] });
  }
  // 4) 목공사 (GLOBAL_GROUPS 미포함분)
  items.push({ label: '목공 기본', on: !!scope.global.carpentry_base });
  items.push({ label: '천정 목공', on: !!scope.global.carpentry_ceiling });

  const active = items.filter(i => i.on);
  const inactive = items.filter(i => !i.on);

  return (
    <div className="space-y-2 pt-1">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold mb-1">
          시공 ({active.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {active.length === 0 ? (
            <span className="text-[11px] text-zinc-400">선택된 공종 없음</span>
          ) : (
            active.map(i => (
              <span key={i.label} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium whitespace-nowrap">
                {i.label}
              </span>
            ))
          )}
        </div>
      </div>
      {inactive.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-400 font-bold mb-1">
            안 함 ({inactive.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {inactive.map(i => (
              <span key={i.label} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px] whitespace-nowrap">
                {i.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// CategoryBreakdown — by_category top 5
// =====================================================

function CategoryBreakdown({ byCategory }: { byCategory: Record<string, number> }) {
  const entries = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 6);
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);

  if (entries.length === 0) {
    return <div className="text-[11px] text-zinc-400 py-1">산출된 공사비 없음</div>;
  }

  return (
    <div className="space-y-1 pt-1">
      {entries.map(([cat, amt]) => {
        const pct = total > 0 ? (amt / total) * 100 : 0;
        return (
          <div key={cat} className="space-y-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-zinc-700 truncate">{cat}</span>
              <span className="text-[11px] font-mono font-semibold text-zinc-900 tabular-nums whitespace-nowrap">
                {fmtKRWShort(amt)}
              </span>
            </div>
            <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import type { Property, Scope, RoomId } from '@/lib/types';
import { activeRooms } from '@/lib/areas';
import { BIG_WORK_GROUPS, defaultRoomsForWork, type BigWorkGroup } from '@/lib/scope-meta';
import { PRESETS } from '@/lib/scope-presets';

type Props = {
  property: Property;
  value: Scope;
  onChange: (next: Scope) => void;
};

export function ScopeMatrix({ property, value, onChange }: Props) {
  const visibleRooms = activeRooms(property) as RoomId[];

  // ===== 빠른 시작 프리셋 — 확장 무관 =====
  const visiblePresets = PRESETS;

  /**
   * 확장공사 활성 판정 — "신규 확장 시공이 계획된 방"이 있을 때만 활성.
   * - expansion_current=true (이미 확장됨)인 방의 expansion_after=true는 무시
   *   (이미 확장된 상태를 표시하는 것이지 신규 공사가 아님)
   * - 신규 확장 = expansion_after=true && expansion_current=false
   */
  const hasNewExpansion = (): boolean =>
    visibleRooms.some(r => {
      const rs = value.rooms[r];
      return !!rs && rs.expansion_after && !rs.expansion_current;
    });

  // ===== 큰 공종 그룹 — 활성 판정 =====
  /** 그룹 내 어떤 sub-key 하나라도 ON이면 active */
  const isGroupActive = (group: BigWorkGroup): boolean => {
    // 확장공사: 신규 확장 시공 방이 있을 때만 활성 (expansion_report는 derived field로 무시)
    if (group.id === 'expansion') return hasNewExpansion();

    if (group.globalKeys?.some(k => value.global[k])) return true;
    if (group.roomKeys?.some(k => visibleRooms.some(r => Boolean(value.rooms[r]?.[k])))) return true;
    return false;
  };

  /** 그룹 내 켜져 있는 sub-key 카운트 + 전체 카운트 */
  const groupCount = (group: BigWorkGroup): { on: number; total: number } => {
    // 확장공사: 신규 확장 + 신고 두 가지를 별도로 카운트
    if (group.id === 'expansion') {
      const planned = hasNewExpansion();
      return {
        on: (planned ? 1 : 0) + (value.global.expansion_report ? 1 : 0),
        total: 2,
      };
    }
    let on = 0;
    let total = 0;
    if (group.globalKeys) {
      total += group.globalKeys.length;
      on += group.globalKeys.filter(k => value.global[k]).length;
    }
    if (group.roomKeys) {
      total += group.roomKeys.length;
      // 한 룸 키라도 어떤 룸에 켜져 있으면 그 키는 'on'으로 카운트
      on += group.roomKeys.filter(k => visibleRooms.some(r => Boolean(value.rooms[r]?.[k]))).length;
    }
    return { on, total };
  };

  /** 그룹 토글 — ON이면 모두 OFF, OFF이면 모두 ON (룸 키는 defaultRoomsForWork 사용) */
  const toggleGroup = (group: BigWorkGroup) => {
    const turnOn = !isGroupActive(group);
    const nextRooms = { ...value.rooms };
    const nextGlobal = { ...value.global };

    // 확장공사 — already-expanded 방은 expansion_after=true 보존, 나머지만 토글
    if (group.id === 'expansion') {
      for (const r of visibleRooms) {
        const rs = nextRooms[r];
        if (!rs) continue;
        nextRooms[r] = {
          ...rs,
          // 이미 확장된 방: 그대로 true (사실 상태). 그 외 방: 토글값
          expansion_after: rs.expansion_current ? true : turnOn,
        };
      }
      nextGlobal.expansion_report = turnOn;
      onChange({ ...value, rooms: nextRooms, global: nextGlobal });
      return;
    }

    if (group.globalKeys) {
      for (const k of group.globalKeys) nextGlobal[k] = turnOn;
    }
    if (group.roomKeys) {
      for (const k of group.roomKeys) {
        if (turnOn) {
          // 키별 적절한 기본값 룸셋
          let defaults: RoomId[] = defaultRoomsForWork(k, property, visibleRooms);
          // defaultRoomsForWork가 빈 배열을 반환하는 키(flooring/wallpaper/molding/sash 등)는 활성 룸 전체로 처리
          if (defaults.length === 0) defaults = visibleRooms.slice();
          for (const r of visibleRooms) {
            nextRooms[r] = { ...nextRooms[r], [k]: defaults.includes(r) };
          }
        } else {
          for (const r of visibleRooms) {
            nextRooms[r] = { ...nextRooms[r], [k]: false };
          }
        }
      }
    }

    onChange({ ...value, rooms: nextRooms, global: nextGlobal });
  };

  return (
    <section className="rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-zinc-200 space-y-5">
      <header>
        <h2 className="text-base font-semibold">2. 공사 범위</h2>
        <p className="text-xs text-zinc-500 mt-1">
          ① 빠른 프리셋으로 시작 → ② 큰 공종을 ON/OFF
          <span className="text-zinc-400"> · 자재 등급·세부 사양은 다음 단계에서</span>
        </p>
      </header>

      {/* ===== ① 빠른 프리셋 ===== */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs font-semibold text-zinc-700">① 빠른 시작</h3>
          <span className="text-[10px] text-zinc-400">대표 시나리오로 한 번에 설정</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {visiblePresets.map((preset, idx) => (
            <button
              key={preset.id}
              onClick={() => onChange(preset.apply(property, value))}
              className="flex flex-col items-start gap-0.5 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left
                         hover:border-blue-400 hover:bg-blue-50/30 active:scale-[0.98] transition-all"
            >
              <span className="text-[10px] font-mono font-bold text-blue-600 mb-0.5">PRESET {idx + 1}</span>
              <span className="text-xs font-semibold text-zinc-900">{preset.label}</span>
              <span className="text-[10px] text-zinc-500 leading-tight">{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== ② 큰 공종 — 4×3 그리드 ===== */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs font-semibold text-zinc-700">② 큰 공사 범위</h3>
          <span className="text-[10px] text-zinc-400">카드 클릭 = 해당 공종 전체 ON/OFF · 일부만 켜져도 활성으로 표시</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {BIG_WORK_GROUPS.map(group => (
            <BigGroupCard
              key={group.id}
              group={group}
              active={isGroupActive(group)}
              count={groupCount(group)}
              onClick={() => toggleGroup(group)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================
// 큰 공종 카드 — ON/OFF 이진 + 세부 공종 설명
// =====================================================

function BigGroupCard({
  group, active, count, onClick,
}: {
  group: BigWorkGroup;
  active: boolean;
  count: { on: number; total: number };
  onClick: () => void;
}) {
  // 일부만 켜진 경우(부분 활성): partial 표시 — UI상으로는 active와 동일하지만 라벨이 다름
  const partial = active && count.on < count.total;

  const styles = active
    ? (partial
        ? 'border-blue-400 bg-blue-50/70 ring-1 ring-blue-200'
        : 'border-blue-500 bg-blue-50 ring-1 ring-blue-200')
    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50';

  const indicatorStyles = active
    ? 'bg-blue-600 text-white border-blue-600'
    : 'bg-white text-zinc-300 border-zinc-300';

  const labelText = !active
    ? '시공 안 함'
    : partial
      ? `일부 시공 (${count.on}/${count.total})`
      : '시공';
  const labelTone = active ? 'text-blue-700' : 'text-zinc-400';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-2 rounded-lg border-2 p-3 text-left transition-all active:scale-[0.98] ${styles}`}
    >
      {/* 헤더 — 인디케이터 + 제목 */}
      <div className="flex items-center gap-2 w-full">
        <span
          className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition ${indicatorStyles}`}
        >
          {active && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="text-base leading-none">{group.icon}</span>
        <span className="text-sm font-bold text-zinc-900 truncate flex-1">{group.title}</span>
      </div>

      {/* 세부 공종 설명 */}
      <p className="text-[11px] text-zinc-600 leading-snug min-h-[2.6em]">{group.desc}</p>

      {/* 상태 라벨 */}
      <span className={`text-[10px] font-semibold ${labelTone}`}>{labelText}</span>
    </button>
  );
}

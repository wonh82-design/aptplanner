'use client';

import type { Property, Scope, RoomId } from '@/lib/types';
import { activeRooms } from '@/lib/areas';
import {
  ROOM_WORK_GROUPS, GLOBAL_GROUPS, defaultRoomsForWork,
} from '@/lib/scope-meta';
import { PRESETS } from '@/lib/scope-presets';

type Props = {
  property: Property;
  value: Scope;
  onChange: (next: Scope) => void;
};

export function ScopeMatrix({ property, value, onChange }: Props) {
  const visibleRooms = activeRooms(property) as RoomId[];

  // 확장 관련 범위는 우리집 현황 → 발코니 확장 현황에서만 다룬다.
  // 빠른 시작 프리셋에서는 확장에 영향을 주지 않는다.
  const visiblePresets = PRESETS;

  // ===== 공간별 공종 그룹 (Room work) — 그룹 전체 토글 =====
  const roomWorkGroupState = (group: typeof ROOM_WORK_GROUPS[number]): 'off' | 'mixed' | 'on' => {
    const totalKeys = group.keys.length;
    const onKeys = group.keys.filter(k => visibleRooms.some(r => Boolean(value.rooms[r]?.[k]))).length;
    if (onKeys === 0) return 'off';
    if (onKeys === totalKeys) return 'on';
    return 'mixed';
  };

  const toggleRoomWorkGroup = (group: typeof ROOM_WORK_GROUPS[number]) => {
    const state = roomWorkGroupState(group);
    const next = { ...value.rooms };
    if (state === 'on') {
      // 모두 OFF
      for (const r of visibleRooms) {
        for (const k of group.keys) next[r] = { ...next[r], [k]: false };
      }
    } else {
      // 각 키마다 기본 룰대로 공간 적용
      for (const k of group.keys) {
        const defaults = defaultRoomsForWork(k, property, visibleRooms);
        for (const r of visibleRooms) {
          next[r] = { ...next[r], [k]: defaults.includes(r) };
        }
      }
    }
    onChange({ ...value, rooms: next });
  };

  // ===== 전체 공종 그룹 (Global) — 그룹 전체 토글 =====
  const globalGroupState = (group: typeof GLOBAL_GROUPS[number]): 'off' | 'mixed' | 'on' => {
    const total = group.items.length;
    const on = group.items.filter(it => value.global[it.key]).length;
    if (on === 0) return 'off';
    if (on === total) return 'on';
    return 'mixed';
  };

  const toggleGlobalGroup = (group: typeof GLOBAL_GROUPS[number]) => {
    const state = globalGroupState(group);
    const patch: Partial<Scope['global']> = {};
    for (const it of group.items) {
      patch[it.key] = state !== 'on';
    }
    onChange({ ...value, global: { ...value.global, ...patch } });
  };

  return (
    <section className="rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-zinc-200 space-y-5">
      <header>
        <h2 className="text-base font-semibold">2. 공사 범위</h2>
        <p className="text-xs text-zinc-500 mt-1">
          ① 빠른 프리셋으로 시작 → ② 큰 공사 범위만 ON/OFF
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

      {/* ===== ② 공사 항목 (큰 그룹 토글) ===== */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs font-semibold text-zinc-700">② 큰 공사 범위</h3>
          <span className="text-[10px] text-zinc-400">카드 클릭으로 그룹 전체 ON/OFF</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ROOM_WORK_GROUPS.map(group => (
            <GroupToggleCard
              key={group.title}
              title={group.title}
              desc={group.desc}
              icon={group.icon}
              state={roomWorkGroupState(group)}
              count={group.keys.filter(k => visibleRooms.some(r => Boolean(value.rooms[r]?.[k]))).length}
              total={group.keys.length}
              onClick={() => toggleRoomWorkGroup(group)}
            />
          ))}
          {GLOBAL_GROUPS.map(group => (
            <GroupToggleCard
              key={group.title}
              title={group.title}
              desc={group.desc}
              icon={group.icon}
              state={globalGroupState(group)}
              count={group.items.filter(it => value.global[it.key]).length}
              total={group.items.length}
              onClick={() => toggleGlobalGroup(group)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================
// 그룹 토글 카드 — 펼치기 없음, ON/OFF/일부만 시각화
// =====================================================

function GroupToggleCard({
  title, desc, icon, state, count, total, onClick,
}: {
  title: string;
  desc: string;
  icon: string;
  state: 'off' | 'mixed' | 'on';
  count: number;
  total: number;
  onClick: () => void;
}) {
  const styles =
    state === 'on'    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
  : state === 'mixed' ? 'border-amber-400 bg-amber-50'
  :                     'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50';

  const indicatorStyles =
    state === 'on'    ? 'bg-blue-600 text-white border-blue-600'
  : state === 'mixed' ? 'bg-white text-amber-700 border-amber-400'
  :                     'bg-white text-zinc-300 border-zinc-300';

  const labelText = state === 'on' ? '전체 시공' : state === 'mixed' ? `${count}/${total} 항목` : '시공 안 함';
  const labelTone =
    state === 'on'    ? 'text-blue-700'
  : state === 'mixed' ? 'text-amber-700'
  :                     'text-zinc-400';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-lg border-2 p-3 text-left transition-all active:scale-[0.98] ${styles}`}
    >
      {/* 체크 인디케이터 */}
      <span
        className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md border-2 mt-0.5 transition ${indicatorStyles}`}
      >
        {state === 'on' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {state === 'mixed' && (
          <span className="block w-2 h-0.5 bg-current rounded" />
        )}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-base leading-none">{icon}</span>
          <span className="text-sm font-bold text-zinc-900 truncate">{title}</span>
        </div>
        <p className="text-[11px] text-zinc-600 leading-tight line-clamp-2">{desc}</p>
        <div className={`text-[10px] font-semibold mt-1.5 ${labelTone}`}>{labelText}</div>
      </div>
    </button>
  );
}

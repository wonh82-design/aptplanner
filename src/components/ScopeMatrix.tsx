'use client';

import { useState } from 'react';
import type { Property, RoomScope, Scope, RoomId } from '@/lib/types';
import { activeRooms } from '@/lib/areas';
import {
  ROOM_WORK_META, ROOM_WORK_GROUPS, GLOBAL_GROUPS,
  defaultRoomsForWork, ROOM_META,
} from '@/lib/scope-meta';
import { PRESETS } from '@/lib/scope-presets';

type Props = {
  property: Property;
  value: Scope;
  onChange: (next: Scope) => void;
};

export function ScopeMatrix({ property, value, onChange }: Props) {
  const setRooms = (nextRooms: Scope['rooms']) =>
    onChange({ ...value, rooms: nextRooms });

  const toggleGlobal = (key: keyof Scope['global']) => {
    onChange({ ...value, global: { ...value.global, [key]: !value.global[key] } });
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200 space-y-6">
      <header>
        <h2 className="text-base font-semibold">2. 공사 범위</h2>
        <p className="text-xs text-zinc-500 mt-1">
          ① 빠른 프리셋으로 시작 → ② 카테고리별 공사 항목 조정
        </p>
      </header>

      {/* ===== ① 빠른 프리셋 ===== */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs font-semibold text-zinc-700">① 빠른 시작</h3>
          <span className="text-[10px] text-zinc-400">대표 시나리오로 한 번에 설정</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.id}
              onClick={() => onChange(preset.apply(property))}
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

      {/* ===== ② 공사 항목 — 통합 ===== */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-700 mb-2">② 공사 항목</h3>
        <div className="space-y-3">
          {/* 공간별 공종 카테고리 */}
          {ROOM_WORK_GROUPS.map(group => (
            <RoomWorkGroupCard
              key={group.title}
              group={group}
              property={property}
              rooms={value.rooms}
              onChangeRooms={setRooms}
            />
          ))}
          {/* 전체 공종 카테고리 */}
          {GLOBAL_GROUPS.map(group => (
            <GlobalGroupCard
              key={group.title}
              group={group}
              value={value.global}
              onToggle={toggleGlobal}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================
// 공간별 공종 그룹 카드 — RoomScope 키들을 묶어서 표시
// =====================================================

function RoomWorkGroupCard({
  group, property, rooms, onChangeRooms,
}: {
  group: typeof ROOM_WORK_GROUPS[number];
  property: Property;
  rooms: Scope['rooms'];
  onChangeRooms: (next: Scope['rooms']) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const visibleRooms = activeRooms(property) as RoomId[];

  // 그룹 내 ON된 공종 개수
  const activeCount = group.keys.filter(k =>
    visibleRooms.some(r => Boolean(rooms[r]?.[k]))
  ).length;
  const allOn = activeCount === group.keys.length;
  const allOff = activeCount === 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 transition text-left"
      >
        <span className="text-xl leading-none">{group.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-zinc-900">{group.title}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              allOff ? 'bg-zinc-100 text-zinc-500'
              : allOn ? 'bg-emerald-100 text-emerald-700'
              : 'bg-blue-100 text-blue-700'
            }`}>
              {activeCount}/{group.keys.length}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 truncate">{group.desc}</p>
        </div>
        <span className={`text-zinc-400 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 px-3 py-2 space-y-2 bg-zinc-50/30">
          {group.keys.map(key => (
            <RoomWorkItem
              key={key}
              workKey={key}
              property={property}
              rooms={rooms}
              onChangeRooms={onChangeRooms}
              visibleRooms={visibleRooms}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// 공종 하나 — 토글 + 펼치면 공간별 체크박스
// =====================================================

function RoomWorkItem({
  workKey, property, rooms, onChangeRooms, visibleRooms,
}: {
  workKey: keyof RoomScope;
  property: Property;
  rooms: Scope['rooms'];
  onChangeRooms: (next: Scope['rooms']) => void;
  visibleRooms: RoomId[];
}) {
  const meta = ROOM_WORK_META.find(m => m.key === workKey);
  if (!meta) return null;

  // 활성 공간 중 이 공종이 ON된 곳
  const activeIn = visibleRooms.filter(r => Boolean(rooms[r]?.[workKey]));
  const isOn = activeIn.length > 0;
  const allOn = activeIn.length === visibleRooms.length;

  const toggleAll = () => {
    const next = { ...rooms };
    if (isOn) {
      // 전체 OFF
      for (const r of visibleRooms) next[r] = { ...next[r], [workKey]: false };
    } else {
      // 기본 공간들만 ON (사용자 룰 기반)
      const defaults = defaultRoomsForWork(workKey, property, visibleRooms);
      for (const r of visibleRooms) {
        next[r] = { ...next[r], [workKey]: defaults.includes(r) };
      }
    }
    onChangeRooms(next);
  };

  const toggleRoom = (room: RoomId) => {
    const next = { ...rooms, [room]: { ...rooms[room], [workKey]: !rooms[room]?.[workKey] } };
    onChangeRooms(next);
  };

  return (
    <div className={`rounded-md transition ${isOn ? 'bg-blue-50/60 border border-blue-200' : 'bg-white border border-zinc-200'}`}>
      <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={isOn}
          onChange={toggleAll}
          className="cb mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base leading-none">{meta.icon}</span>
            <span className="text-sm font-semibold text-zinc-900">{meta.label}</span>
            {isOn && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                allOn ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {activeIn.length}/{visibleRooms.length} 공간
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{meta.desc}</p>
        </div>
      </label>

      {/* 공간별 체크 — ON된 경우만 표시 */}
      {isOn && (
        <div className="px-3 pb-2.5 pt-1 ml-7 flex flex-wrap gap-1.5">
          {visibleRooms.map(r => {
            const on = Boolean(rooms[r]?.[workKey]);
            const roomMeta = ROOM_META[r] || { label: r };
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleRoom(r)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-all
                  ${on
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-zinc-500 border-zinc-300 hover:border-blue-400 hover:text-blue-700'}`}
              >
                {roomMeta.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================
// 전체 공종 그룹 카드 — Scope.global 토글
// =====================================================

function GlobalGroupCard({
  group, value, onToggle,
}: {
  group: typeof GLOBAL_GROUPS[number];
  value: Scope['global'];
  onToggle: (key: keyof Scope['global']) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = group.items.filter(it => value[it.key]).length;
  const allOn = activeCount === group.items.length;
  const allOff = activeCount === 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 transition text-left"
      >
        <span className="text-xl leading-none">{group.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-zinc-900">{group.title}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              allOff ? 'bg-zinc-100 text-zinc-500'
              : allOn ? 'bg-emerald-100 text-emerald-700'
              : 'bg-blue-100 text-blue-700'
            }`}>
              {activeCount}/{group.items.length}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 truncate">{group.desc}</p>
        </div>
        <span className={`text-zinc-400 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 px-3 py-2 space-y-1.5 bg-zinc-50/30">
          {group.items.map(item => (
            <label
              key={item.key}
              className={`flex items-start gap-3 rounded-md px-2 py-2 cursor-pointer transition
                ${value[item.key] ? 'bg-blue-50' : 'bg-white hover:bg-zinc-50'}`}
            >
              <input
                type="checkbox"
                checked={value[item.key]}
                onChange={() => onToggle(item.key)}
                className="cb mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900">{item.label}</span>
                  {item.warning && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                      {item.warning}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

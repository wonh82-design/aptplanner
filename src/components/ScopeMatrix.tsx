'use client';

import { useState } from 'react';
import type { Property, RoomScope, Scope, RoomId } from '@/lib/types';
import { activeRooms, roomAreaForId, roomPerimeterForId } from '@/lib/areas';
import { ROOM_WORK_META, ROOM_META, GLOBAL_GROUPS } from '@/lib/scope-meta';
import { PRESETS } from '@/lib/scope-presets';

type Props = {
  property: Property;
  value: Scope;
  onChange: (next: Scope) => void;
};

export function ScopeMatrix({ property, value, onChange }: Props) {
  const rooms = activeRooms(property) as RoomId[];

  const updateRoom = (room: RoomId, patch: Partial<RoomScope>) => {
    onChange({
      ...value,
      rooms: { ...value.rooms, [room]: { ...value.rooms[room], ...patch } },
    });
  };

  const toggleGlobal = (key: keyof Scope['global']) => {
    onChange({ ...value, global: { ...value.global, [key]: !value.global[key] } });
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200 space-y-6">
      <header>
        <h2 className="text-base font-semibold">2. 공사 범위</h2>
        <p className="text-xs text-zinc-500 mt-1">
          ① 빠른 프리셋으로 시작하고 → ② 공간별 세부 조정 → ③ 집 전체 공사 항목 확인
        </p>
      </header>

      {/* ===== ① 빠른 프리셋 ===== */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs font-semibold text-zinc-700">① 빠른 시작</h3>
          <span className="text-[10px] text-zinc-400">대표 시나리오로 한 번에 설정</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onChange(preset.apply(property))}
              className="flex flex-col items-start gap-0.5 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left
                         hover:border-blue-400 hover:bg-blue-50/30 active:scale-[0.98] transition-all"
            >
              <span className="text-lg leading-none">{preset.icon}</span>
              <span className="text-xs font-semibold text-zinc-900">{preset.label}</span>
              <span className="text-[10px] text-zinc-500 leading-tight">{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== ② 공간별 카드 ===== */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-700 mb-2">② 공간별로 무엇을 시공할까요?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rooms.map(room => (
            <RoomCard
              key={room}
              room={room}
              area={roomAreaForId(room, property.pyeong, property.bay)}
              perim={roomPerimeterForId(room, property.pyeong)}
              value={value.rooms[room]}
              onChange={(patch) => updateRoom(room, patch)}
            />
          ))}
        </div>
      </div>

      {/* ===== ③ 전체 공종 그룹 ===== */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-700 mb-2">③ 집 전체에 공통으로 하는 공사</h3>
        <div className="space-y-3">
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
// 공간 카드
// =====================================================

function RoomCard({
  room, area, perim, value, onChange,
}: {
  room: RoomId;
  area: number;
  perim: number;
  value: RoomScope;
  onChange: (patch: Partial<RoomScope>) => void;
}) {
  const meta = ROOM_META[room] || { icon: '📐', label: room };

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{meta.icon}</span>
          <span className="font-semibold text-sm">{meta.label}</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">
          {area.toFixed(1)}㎡ · 둘레 {perim.toFixed(1)}m
        </span>
      </div>

      {/* 공종 칩 */}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1.5">시공 항목</div>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_WORK_META.map(w => (
            <Chip
              key={w.key}
              active={Boolean(value[w.key])}
              icon={w.icon}
              label={w.label}
              title={w.desc}
              onClick={() => onChange({ [w.key]: !value[w.key] } as Partial<RoomScope>)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active, icon, label, title, onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-all
        ${active
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white text-zinc-600 border-zinc-300 hover:border-blue-400 hover:text-blue-700'}`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// =====================================================
// 전체 공종 그룹 카드
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
                      ⚠️ {item.warning}
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

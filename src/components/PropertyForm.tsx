'use client';

import { useState } from 'react';
import type { Property, RoomScope, Scope, RoomId } from '@/lib/types';
import {
  recommendedRoomCount, exclusiveAreaM2, supplyAreaM2, outsideWindowArea, activeRooms,
} from '@/lib/areas';
import { ROOM_META } from '@/lib/scope-meta';

/** 공급평 ↔ 전용 m² 변환 계수 (공급평 × 3.31 × 0.75) */
const PYEONG_TO_EX_M2 = 2.4825;

/** 자주 사용하는 평형↔전용㎡ 페어 */
const PRESET_PAIRS = [
  { pyeong: 24, m2: 59 },
  { pyeong: 34, m2: 84 },
  { pyeong: 44, m2: 110 },
];

type InputMode = 'pyeong' | 'm2';

type Props = {
  value: Property;
  onChange: (next: Property) => void;
  /** 공간별 확장 상태 — 매트릭스에서 분리해 이 카드에서 다룸 */
  rooms: Scope['rooms'];
  onRoomsChange: (rooms: Scope['rooms']) => void;
};

export function PropertyForm({ value, onChange, rooms, onRoomsChange }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>('pyeong');

  const setField = <K extends keyof Property>(k: K, v: Property[K]) =>
    onChange({ ...value, [k]: v });

  const visibleRooms = activeRooms(value) as RoomId[];

  // 표시값: 공급평 모드는 정수 평, 전용㎡ 모드는 정수 ㎡
  const displayValue = value.pyeong > 0
    ? (inputMode === 'pyeong'
        ? Math.round(value.pyeong)
        : Math.round(value.pyeong * PYEONG_TO_EX_M2))
    : '';

  const handleInput = (raw: string) => {
    if (raw === '') {
      onChange({ ...value, pyeong: 0 });
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    const py = inputMode === 'pyeong' ? n : n / PYEONG_TO_EX_M2;
    onChange({
      ...value,
      pyeong: py,
      rooms: recommendedRoomCount(py),
    });
  };

  const handlePreset = (pair: typeof PRESET_PAIRS[number]) => {
    onChange({
      ...value,
      pyeong: pair.pyeong,
      rooms: recommendedRoomCount(pair.pyeong),
    });
  };

  /** 현재 값이 어떤 프리셋과 일치하는지 (1평/㎡ 오차 허용) */
  const matchedPreset = PRESET_PAIRS.find(p =>
    Math.abs(p.pyeong - value.pyeong) < 0.5
  );

  const updateExpansion = (roomId: RoomId, state: 'none' | 'plan' | 'done') => {
    const prev = rooms[roomId];
    let patch: Partial<RoomScope>;
    if (state === 'none') patch = { expansion_current: false, expansion_after: false };
    else if (state === 'plan') patch = { expansion_current: false, expansion_after: true };
    else patch = { expansion_current: true, expansion_after: true };
    onRoomsChange({ ...rooms, [roomId]: { ...prev, ...patch } });
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
      <h2 className="text-base font-semibold mb-4">1. 우리집 현황</h2>

      {/* ===== 평형 입력 (공급평 / 전용㎡ 토글) ===== */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-zinc-600">평형</span>
          {/* 모드 토글 */}
          <div className="inline-flex rounded-md border border-zinc-300 bg-zinc-50 overflow-hidden text-[11px]">
            <button
              type="button"
              onClick={() => setInputMode('pyeong')}
              className={`px-2.5 py-1 transition ${
                inputMode === 'pyeong'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-transparent text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              공급평
            </button>
            <button
              type="button"
              onClick={() => setInputMode('m2')}
              className={`px-2.5 py-1 transition ${
                inputMode === 'm2'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-transparent text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              전용 m²
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-stretch">
          <div className="flex-1 min-w-0 relative">
            <input
              type="number"
              min={inputMode === 'pyeong' ? 10 : 25}
              max={inputMode === 'pyeong' ? 80 : 200}
              value={displayValue}
              placeholder={inputMode === 'pyeong' ? '예: 30' : '예: 75'}
              onChange={(e) => handleInput(e.target.value)}
              className="input w-full pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">
              {inputMode === 'pyeong' ? '평' : 'm²'}
            </span>
          </div>
          <div className="inline-flex rounded-lg border border-zinc-300 bg-white overflow-hidden text-xs shadow-sm">
            {PRESET_PAIRS.map(p => {
              const selected = matchedPreset?.pyeong === p.pyeong;
              return (
                <button
                  key={p.pyeong}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`px-2.5 py-2 transition border-r last:border-r-0 border-r-zinc-200 ${
                    selected
                      ? 'bg-blue-100 text-blue-900 font-semibold'
                      : 'bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {inputMode === 'pyeong' ? `${p.pyeong}평` : `${p.m2}㎡`}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-500">
          공급평형(24평·34평) 또는 전용면적(59㎡·84㎡) 중 알고 있는 쪽으로 입력하세요.
          {value.pyeong > 0 && (
            <span className="ml-2 text-zinc-600">
              · {inputMode === 'pyeong'
                  ? `전용 ${Math.round(value.pyeong * PYEONG_TO_EX_M2)}㎡`
                  : `공급 ${Math.round(value.pyeong)}평`}
            </span>
          )}
        </p>
      </div>

      {/* ===== 기본 정보 ===== */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="베이 수">
          <select
            value={value.bay}
            onChange={(e) => setField('bay', Number(e.target.value) as 2 | 3 | 4 | 5)}
            className="input"
          >
            <option value={2}>2베이</option>
            <option value={3}>3베이 (표준)</option>
            <option value={4}>4베이</option>
            <option value={5}>5베이</option>
          </select>
        </Field>

        <Field label="방 개수 (거실 제외)">
          <select
            value={value.rooms}
            onChange={(e) => setField('rooms', Number(e.target.value) as 2 | 3 | 4 | 5)}
            className="input"
          >
            <option value={2}>2개 (안방 + 작은방1)</option>
            <option value={3}>3개 (안방 + 작은방1·2)</option>
          </select>
        </Field>

        <Field label="공용욕실">
          <select
            value={value.common_bath}
            onChange={(e) => setField('common_bath', Number(e.target.value) as 1 | 2)}
            className="input"
          >
            <option value={1}>1개</option>
            <option value={2}>2개</option>
          </select>
        </Field>

        <Field label="부부욕실">
          <select
            value={value.master_bath}
            onChange={(e) => setField('master_bath', Number(e.target.value) as 0 | 1)}
            className="input"
          >
            <option value={0}>없음</option>
            <option value={1}>있음</option>
          </select>
        </Field>

        <Field label="발코니 깊이 (m)">
          <input
            type="number"
            step={0.1}
            min={0}
            max={3}
            value={value.balcony_depth_m}
            onChange={(e) => setField('balcony_depth_m', Number(e.target.value) || 0)}
            className="input"
          />
        </Field>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-zinc-600 bg-zinc-50 rounded-lg p-3">
        <Stat label="공급면적" value={`${supplyAreaM2(value.pyeong).toFixed(1)} ㎡`} />
        <Stat label="전용면적" value={`${exclusiveAreaM2(value.pyeong).toFixed(1)} ㎡`} />
        <Stat label="외부창" value={`${outsideWindowArea(value.pyeong, value.bay).toFixed(1)} ㎡`} />
      </dl>

      {/* ===== 공간별 확장 현황 ===== */}
      <div className="mt-6 pt-5 border-t border-zinc-200">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-800">발코니 확장 현황</h3>
          <span className="text-[10px] text-zinc-500">공간별로 현재·향후 확장 여부</span>
        </div>
        <div className="space-y-1.5">
          {visibleRooms.map(room => {
            const meta = ROOM_META[room] || { icon: '📐', label: room };
            const rs = rooms[room];
            const state: 'none' | 'plan' | 'done' =
              rs.expansion_current ? 'done' :
              rs.expansion_after   ? 'plan' :
              'none';
            return (
              <div key={room} className="flex items-center gap-3 py-1.5">
                <span className="text-sm flex items-center gap-1.5 min-w-[80px]">
                  <span className="text-base">{meta.icon}</span>
                  <span className="font-medium">{meta.label}</span>
                </span>
                <div className="inline-flex rounded-md border border-zinc-200 bg-white overflow-hidden text-xs flex-1 max-w-md">
                  <ExpBtn active={state === 'none'} onClick={() => updateExpansion(room, 'none')}
                    label="그대로" hint="발코니 유지" />
                  <ExpBtn active={state === 'plan'} onClick={() => updateExpansion(room, 'plan')}
                    label="확장 시공" hint="이번에 확장" tone="amber" />
                  <ExpBtn active={state === 'done'} onClick={() => updateExpansion(room, 'done')}
                    label="이미 확장됨" hint="기존부터 확장" />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          ‘확장 시공’ 공간이 있으면 확장공사·새 외창·구청 신고·터닝도어가 자동 추가됩니다.
        </p>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="font-mono font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

function ExpBtn({
  active, onClick, label, hint, tone = 'blue',
}: {
  active: boolean; onClick: () => void; label: string; hint: string; tone?: 'blue' | 'amber';
}) {
  const activeTone = tone === 'amber'
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : 'bg-blue-100 text-blue-900 border-blue-300';
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`flex-1 px-2.5 py-1.5 border-r last:border-r-0 transition text-center ${
        active ? `${activeTone} font-medium` : 'border-r-zinc-200 text-zinc-600 hover:bg-zinc-50'
      }`}
    >
      <div className="text-[11px]">{label}</div>
      <div className="text-[9px] opacity-70">{hint}</div>
    </button>
  );
}

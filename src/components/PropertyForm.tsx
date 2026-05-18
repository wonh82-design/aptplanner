'use client';

import { useState } from 'react';
import type { Property, RoomScope, Scope, RoomId, RegionId, AgeId } from '@/lib/types';
import {
  recommendedRoomCount, exclusiveAreaM2, supplyAreaM2, outsideWindowArea, activeRooms,
  clampPyeong, clampBalconyDepth,
} from '@/lib/areas';
import { ROOM_META } from '@/lib/scope-meta';
import { REGION_LABEL, AGE_LABEL } from '@/lib/calculator';

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
    // 입력을 평형 기준으로 환산 후 clamp [6, 100]
    const rawPy = inputMode === 'pyeong' ? n : n / PYEONG_TO_EX_M2;
    const py = clampPyeong(rawPy);
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

  /**
   * 현재 상태 변경 — '이미 확장됨' ↔ '발코니 있음' 토글.
   * 의도치 않은 신규 확장공사 추가를 방지하기 위해 두 값을 항상 동기화한다:
   *  - 이미 확장됨 (current=true) → 공사후도 true (추가 공사 불필요)
   *  - 발코니 있음 (current=false) → 공사후도 false (기본은 '확장 안 함'으로 리셋)
   * 사용자는 이후 '공사 후' 블럭에서 '확장 시공'을 명시적으로 선택해야 한다.
   */
  const setExpansionCurrent = (roomId: RoomId, isExpanded: boolean) => {
    const prev = rooms[roomId];
    const next: RoomScope = {
      ...prev,
      expansion_current: isExpanded,
      expansion_after: isExpanded,
    };
    onRoomsChange({ ...rooms, [roomId]: next });
  };

  /** 공사 후 상태 변경 — 현재 이미 확장된 공간은 변경 불가 */
  const setExpansionAfter = (roomId: RoomId, willExpand: boolean) => {
    const prev = rooms[roomId];
    if (prev.expansion_current) return; // 이미 확장된 공간은 추가 변경 불가
    onRoomsChange({ ...rooms, [roomId]: { ...prev, expansion_after: willExpand } });
  };

  return (
    <section className="rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-zinc-200">
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

      {/* ===== 기본 정보 — 데스크톱 3열 / 모바일 2열 ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
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

        <Field label="방 (거실 제외)">
          <select
            value={value.rooms}
            onChange={(e) => setField('rooms', Number(e.target.value) as 2 | 3 | 4 | 5)}
            className="input"
          >
            <option value={2}>2개 (안방+작은방1)</option>
            <option value={3}>3개 (안방+작은방1·2)</option>
            {value.pyeong >= 34 && (
              <option value={4}>4개 (안방+작은방1·2·3)</option>
            )}
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

        <Field label="지역">
          <select
            value={value.region}
            onChange={(e) => setField('region', e.target.value as RegionId)}
            className="input"
          >
            {(Object.keys(REGION_LABEL) as RegionId[]).map(k => (
              <option key={k} value={k}>
                {REGION_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="아파트 연식">
          <select
            value={value.age}
            onChange={(e) => setField('age', e.target.value as AgeId)}
            className="input"
          >
            {(Object.keys(AGE_LABEL) as AgeId[]).map(k => (
              <option key={k} value={k}>
                {AGE_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* 면적 요약 + 발코니 깊이 — 한 줄로 통합. 발코니 깊이는 advanced 토글 */}
      <details className="mt-3 group">
        <summary className="cursor-pointer flex items-center justify-between bg-zinc-50 rounded-lg px-3 py-2 list-none">
          <div className="flex items-center gap-4 text-xs text-zinc-600 flex-wrap min-w-0">
            <MiniStat label="공급" value={`${supplyAreaM2(value.pyeong).toFixed(1)}㎡`} />
            <MiniStat label="전용" value={`${exclusiveAreaM2(value.pyeong).toFixed(1)}㎡`} />
            <MiniStat label="외부창" value={`${outsideWindowArea(value.pyeong, value.bay).toFixed(1)}㎡`} />
            <MiniStat label="발코니 깊이" value={`${value.balcony_depth_m.toFixed(1)}m`} />
          </div>
          <span className="text-[10px] text-zinc-400 group-open:rotate-180 transition flex-shrink-0">▾</span>
        </summary>
        <div className="mt-2 px-3 py-2.5 bg-zinc-50 rounded-lg flex items-center gap-3 flex-wrap">
          <label className="text-xs text-zinc-700 font-medium whitespace-nowrap">발코니 깊이 (m)</label>
          <input
            type="number"
            step={0.1}
            min={0}
            max={3}
            value={value.balcony_depth_m}
            onChange={(e) => setField('balcony_depth_m', clampBalconyDepth(Number(e.target.value) || 0))}
            className="input max-w-[120px]"
          />
          <span className="text-[11px] text-zinc-500">기본값 1.5m — 발코니 폭이 다른 경우만 조정</span>
        </div>
      </details>

      {/* ===== 공간별 확장 현황 — '현재 상태' / '공사 후' 2개 블럭으로 통합 ===== */}
      <div className="mt-6 pt-5 border-t border-zinc-200">
        <h3 className="text-sm font-semibold text-zinc-800 mb-1">발코니 확장 현황</h3>
        <p className="text-xs text-zinc-600 leading-relaxed mb-3">
          우리집 발코니는 <strong className="text-zinc-900">지금 어떤 상태</strong>인지,
          공사 후에는 <strong className="text-zinc-900">어떻게 만들고 싶은지</strong> 공간별로 알려주세요.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* ===== 현재 상태 블럭 ===== */}
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            {/* 헤더 (설명) */}
            <div className="pb-3 border-b border-zinc-100 mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">🏠</span>
                <span className="text-xs font-bold text-zinc-900">현재 상태</span>
              </div>
              <div className="text-[10px] text-zinc-600 font-medium mb-1.5">지금 우리집 모습은 어떤가요?</div>
              <ul className="space-y-0.5 text-[10px] text-zinc-700 leading-snug">
                <li className="flex items-start gap-1"><span className="inline-block w-1 h-1 rounded-full bg-zinc-500 mt-1 flex-shrink-0" /><span>발코니 있음 (확장 안 됨)</span></li>
                <li className="flex items-start gap-1"><span className="inline-block w-1 h-1 rounded-full bg-zinc-500 mt-1 flex-shrink-0" /><span>이미 확장됨</span></li>
              </ul>
            </div>
            {/* 공간별 행 */}
            <div className="space-y-1.5">
              {visibleRooms.map(room => {
                const meta = ROOM_META[room] || { label: room };
                const rs = rooms[room];
                const already = rs.expansion_current;
                return (
                  <div key={room} className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-14 text-xs font-medium text-zinc-800 flex items-center gap-1.5 min-w-0">
                      <span className="inline-block w-1 h-4 rounded-sm bg-zinc-300 flex-shrink-0" />
                      <span className="truncate">{meta.label}</span>
                    </span>
                    <div className="inline-flex flex-1 rounded-md border border-zinc-200 bg-white overflow-hidden text-xs">
                      <ExpBtn
                        active={!already}
                        onClick={() => setExpansionCurrent(room, false)}
                        label="발코니 있음"
                        hint="확장 안됨"
                      />
                      <ExpBtn
                        active={already}
                        onClick={() => setExpansionCurrent(room, true)}
                        label="이미 확장됨"
                        hint="기존부터 확장"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== 공사 후 블럭 ===== */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
            {/* 헤더 (설명) */}
            <div className="pb-3 border-b border-blue-100 mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">🔨</span>
                <span className="text-xs font-bold text-blue-900">공사 후</span>
              </div>
              <div className="text-[10px] text-blue-700 font-medium mb-1.5">인테리어 후 어떻게 만들까요?</div>
              <ul className="space-y-0.5 text-[10px] text-zinc-700 leading-snug">
                <li className="flex items-start gap-1"><span className="inline-block w-1 h-1 rounded-full bg-blue-500 mt-1 flex-shrink-0" /><span>확장 안 함 (그대로 유지)</span></li>
                <li className="flex items-start gap-1"><span className="inline-block w-1 h-1 rounded-full bg-blue-500 mt-1 flex-shrink-0" /><span>새로 확장 시공</span></li>
              </ul>
            </div>
            {/* 공간별 행 */}
            <div className="space-y-1.5">
              {visibleRooms.map(room => {
                const meta = ROOM_META[room] || { label: room };
                const rs = rooms[room];
                const already = rs.expansion_current;
                return (
                  <div key={room} className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-14 text-xs font-medium text-zinc-800 flex items-center gap-1.5 min-w-0">
                      <span className="inline-block w-1 h-4 rounded-sm bg-blue-300 flex-shrink-0" />
                      <span className="truncate">{meta.label}</span>
                    </span>
                    {already ? (
                      <div className="flex-1 flex items-center gap-1 text-[10px] text-zinc-500 italic px-2 py-1.5 bg-white/60 rounded-md border border-dashed border-zinc-200">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>추가 공사 불필요</span>
                      </div>
                    ) : (
                      <div className="inline-flex flex-1 rounded-md border border-zinc-200 bg-white overflow-hidden text-xs">
                        <ExpBtn
                          active={!rs.expansion_after}
                          onClick={() => setExpansionAfter(room, false)}
                          label="확장 안 함"
                          hint="발코니 유지"
                        />
                        <ExpBtn
                          active={rs.expansion_after}
                          onClick={() => setExpansionAfter(room, true)}
                          label="확장 시공"
                          hint="이번에 확장"
                          tone="amber"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed flex items-start gap-1.5">
          <span className="text-amber-600 flex-shrink-0 mt-px">💡</span>
          <span>‘확장 시공’ 공간이 있으면 확장공사·새 외창·구청 신고·터닝도어 비용이 자동으로 추가됩니다.</span>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="font-mono font-semibold text-zinc-900 text-[11px]">{value}</span>
    </span>
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

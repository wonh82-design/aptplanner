'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Property, RoomScope, Scope, RoomId, RegionId, AgeId } from '@/lib/types';
import {
  recommendedRoomCount, exclusiveAreaM2, supplyAreaM2, outsideWindowArea, activeRooms,
  clampBalconyDepth,
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
  const [bayHelpOpen, setBayHelpOpen] = useState(false);

  const setField = <K extends keyof Property>(k: K, v: Property[K]) =>
    onChange({ ...value, [k]: v });

  const visibleRooms = activeRooms(value) as RoomId[];

  // 표시값: 공급평 모드는 정수 평, 전용㎡ 모드는 정수 ㎡
  const displayValue = value.pyeong > 0
    ? (inputMode === 'pyeong'
        ? Math.round(value.pyeong)
        : Math.round(value.pyeong * PYEONG_TO_EX_M2))
    : '';

  /**
   * 평형 입력 — 사용자가 자릿수를 한 자씩 자연스럽게 입력할 수 있도록 처리.
   *
   * 정책:
   *  - 입력 중에는 상한(100평)만 적용. 비현실적 큰 값(예: 1억평)만 차단.
   *  - 하한 보정 없음. 사용자가 직접 입력한 값을 그대로 존중.
   *    (이전: clampPyeong이 즉시 min=6 으로 끌어올려서 "24"를 입력하려 해도
   *     "2"→"6"→"64"로 변환되던 버그.
   *     또한 onBlur 자동 보정도 사용자가 "20" 입력 중 "2"만 친 상태에서
   *     포커스 빠지면 6으로 강제 변경되는 부작용이 있어 제거.)
   *
   * 6평 미만 비현실 값은 Step 2 진입 시 자연스러운 견적 0원/적은 견적으로
   * 사용자가 인지하고 수정. UI는 입력 자체를 막지 않음.
   */
  const handleInput = (raw: string) => {
    if (raw === '') {
      onChange({ ...value, pyeong: 0 });
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    const rawPy = inputMode === 'pyeong' ? n : n / PYEONG_TO_EX_M2;
    // 상한(100평)만 적용. 공급평 입력 모드는 정수로 반올림 → 화면 표시값 = 내부 계산값 일치
    // (전용㎡ 모드는 정밀 평형 유지: 표시는 사용자가 입력한 ㎡ 기준이라 어긋나지 않음)
    const py = inputMode === 'pyeong' ? Math.min(100, Math.round(rawPy)) : Math.min(100, rawPy);
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
          {/* 터치 타겟 — 모바일 최소 36px 확보 (py-2), 시각 크기는 text-xs 유지 */}
          <div className="inline-flex rounded-md border border-zinc-300 bg-zinc-50 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setInputMode('pyeong')}
              className={`px-3 py-2 transition ${
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
              className={`px-3 py-2 transition ${
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
              max={inputMode === 'pyeong' ? 100 : 248}
              value={displayValue}
              placeholder={inputMode === 'pyeong' ? '예: 24평' : '예: 59㎡'}
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
        {/* 베이 수 — Field 안 쓰고 인라인 (라벨 옆 '베이란?' 버튼 위해) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label htmlFor="bay-select" className="text-xs font-medium text-zinc-600">베이 수</label>
            <button
              type="button"
              onClick={() => setBayHelpOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition"
              title="베이가 무엇인지 알아보기"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              베이란?
            </button>
          </div>
          <select
            id="bay-select"
            value={value.bay}
            onChange={(e) => setField('bay', Number(e.target.value) as 2 | 3 | 4 | 5)}
            className="input"
          >
            <option value={2}>2베이</option>
            <option value={3}>3베이 (표준)</option>
            <option value={4}>4베이</option>
            <option value={5}>5베이</option>
          </select>
        </div>

        <Field label="방 (거실 제외)">
          <select
            value={value.rooms}
            onChange={(e) => setField('rooms', Number(e.target.value) as 2 | 3 | 4 | 5)}
            className="input"
          >
            <option value={2}>2개 (안방+작은방1)</option>
            <option value={3}>3개 (안방+작은방1·2)</option>
            <option value={4}>4개 (안방+작은방1,2,3)</option>
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
              <div className="text-[10px] text-zinc-600 font-medium">지금 우리집 모습은 어떤가요?</div>
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
              <div className="text-[10px] text-blue-700 font-medium">인테리어 후 어떻게 만들까요?</div>
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
      </div>

      {/* 베이란? 도움말 모달 */}
      {bayHelpOpen && <BayHelpModal onClose={() => setBayHelpOpen(false)} />}
    </section>
  );
}

// ===== 베이란? 도움말 모달 =====
function BayHelpModal({ onClose }: { onClose: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bay-help-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-5 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-0.5">
              도움말
            </div>
            <h2 id="bay-help-title" className="text-lg sm:text-xl font-bold text-zinc-900">
              베이(Bay)란?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-zinc-400 hover:text-zinc-900 text-2xl leading-none -mt-1"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 sm:px-6 py-5 space-y-5">
          {/* 이미지 — public/images/bay-comparison.png 에 파일이 있으면 표시, 없으면 안내 */}
          <div className="rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
            {!imgFailed ? (
              <div className="relative w-full aspect-[2/1]">
                <Image
                  src="/images/bay-comparison.png"
                  alt="3 BAY vs 2 BAY 평면도 비교"
                  fill
                  className="object-contain"
                  onError={() => setImgFailed(true)}
                  unoptimized
                />
              </div>
            ) : (
              <div className="aspect-[2/1] flex items-center justify-center text-xs text-zinc-400 italic px-4 text-center">
                평면도 이미지 (public/images/bay-comparison.png) 미등록
              </div>
            )}
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-zinc-700">
            <p>
              <strong className="text-zinc-900">베이(Bay)</strong> 는 아파트 평면에서{' '}
              <strong className="text-zinc-900">전면(보통 남향)에 배치된 방의 개수</strong>{' '}
              를 의미합니다. 거실과 침실이 전면을 향해 일렬로 배치된 개수예요.
            </p>
            <ul className="space-y-1.5 pl-2">
              <li className="flex gap-2">
                <span className="text-blue-600 mt-0.5">·</span>
                <span><strong className="text-zinc-900">2베이</strong> — 거실 + 침실 1개가 전면. 작은방들은 후면에 배치.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 mt-0.5">·</span>
                <span><strong className="text-zinc-900">3베이</strong> — 거실 + 침실 2개가 전면. 30평대 아파트의 표준.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 mt-0.5">·</span>
                <span><strong className="text-zinc-900">4베이 이상</strong> — 거실 + 침실 3개 이상이 전면. 40평대 이상 큰 평형에서 흔함.</span>
              </li>
            </ul>

            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[13px] leading-relaxed">
              <div className="font-bold text-amber-900 mb-1">베이가 공사비에 미치는 영향</div>
              <p className="text-amber-900">
                베이 수가 많을수록 일조량·채광이 좋아지지만,{' '}
                <strong>외창(샷시) 면적과 외벽 면적이 늘어나</strong>{' '}
                샷시 공사비·단열·도배 비용이 함께 증가합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div className="px-5 sm:px-6 py-4 border-t border-zinc-200 bg-zinc-50/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition"
          >
            확인
          </button>
        </div>
      </div>
    </div>
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

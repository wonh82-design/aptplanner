'use client';

import { useState } from 'react';
import type { Property, Scope, RoomId } from '@/lib/types';
import { activeRooms } from '@/lib/areas';
import { BIG_WORK_GROUPS, defaultRoomsForWork, type BigWorkGroup } from '@/lib/scope-meta';
import { PRESETS } from '@/lib/scope-presets';
import { track } from '@/lib/analytics';

type Props = {
  property: Property;
  value: Scope;
  onChange: (next: Scope) => void;
  /**
   * 확장공사 카드 클릭 시 호출. 확장 상태는 Step 1 발코니 확장 현황에서만 변경 가능.
   * 미전달 시에는 fallback으로 기존 자동 토글 동작 사용 (호환성 유지).
   */
  onJumpToProperty?: () => void;
};

/**
 * 사용자가 공사 범위를 입력하는 두 가지 방식.
 *  - 'preset': 대표 시나리오 카드 3종 중 선택 → 한 번에 자동 설정 (편의성↑)
 *  - 'detail': 12개 큰 공종 카드를 ON/OFF로 세밀 조정 (제어성↑)
 */
type ScopeMode = 'preset' | 'detail';

export function ScopeMatrix({ property, value, onChange, onJumpToProperty }: Props) {
  // 첫 진입은 '빠르게'부터 — 대부분 사용자가 프리셋으로 시작하는 게 자연스러움.
  const [mode, setMode] = useState<ScopeMode>('preset');
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
    // 목공사: globalKeys 중 하나라도 ON 또는 partition_length > 0이면 활성
    if (group.id === 'carpentry') {
      if (value.global.partition_length > 0) return true;
      if (group.globalKeys?.some(k => value.global[k])) return true;
      return false;
    }

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
    // 목공사: 5 boolean + 1 partition_length = 총 6
    if (group.id === 'carpentry') {
      const boolKeys = (group.globalKeys ?? []).length;
      const boolOn = (group.globalKeys ?? []).filter(k => value.global[k]).length;
      const partitionOn = value.global.partition_length > 0 ? 1 : 0;
      return { on: boolOn + partitionOn, total: boolKeys + 1 };
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
    // 확장공사는 카드에서 자동 토글하지 않는다 — 발코니 확장 상태는 Step 1에서만 공간별로 변경.
    // 카드 클릭 시 Step 1로 점프하여 사용자가 의도적으로 공간별 확장 여부를 결정하게 한다.
    if (group.id === 'expansion') {
      if (onJumpToProperty) {
        onJumpToProperty();
      }
      return;
    }

    const turnOn = !isGroupActive(group);
    const nextRooms = { ...value.rooms };
    const nextGlobal = { ...value.global };

    // 목공사 — 카드 클릭 시: ON이면 기본 목공+천정만 ON (무몰딩/문선/걸레는 사용자가 별도 선택)
    if (group.id === 'carpentry') {
      if (turnOn) {
        nextGlobal.carpentry_base = true;
        nextGlobal.carpentry_ceiling = true;
        // 무X 토글은 opt-in이므로 강제 ON 하지 않음 (기존 값 유지)
      } else {
        nextGlobal.carpentry_base = false;
        nextGlobal.carpentry_ceiling = false;
        nextGlobal.no_molding = false;
        nextGlobal.no_door_frame = false;
        nextGlobal.no_baseboard = false;
        nextGlobal.partition_length = 0;
      }
      onChange({ ...value, rooms: nextRooms, global: nextGlobal });
      return;
    }

    if (group.globalKeys) {
      for (const k of group.globalKeys) {
        // boolean 키만 토글 (carpentry 그룹은 위에서 처리)
        const v = nextGlobal[k];
        if (typeof v === 'boolean') {
          (nextGlobal as Record<string, unknown>)[k] = turnOn;
        }
      }
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

  // 현재 활성 큰 공종 수 — '자세히' 모드 진입 안내에 활용
  const activeGroupCount = BIG_WORK_GROUPS.filter(isGroupActive).length;

  return (
    <section className="rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-zinc-200 space-y-4">
      <header>
        <h2 className="text-base font-semibold">2. 공사 범위</h2>
        <p className="text-xs text-zinc-500 mt-1">
          두 가지 방법 중 편한 방식을 고르세요. 언제든 다른 방식으로 전환할 수 있어요.
        </p>
      </header>

      {/* ===== 모드 선택 — 두 큰 옵션 카드 ===== */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <ModeOption
          active={mode === 'preset'}
          onClick={() => setMode('preset')}
          icon="⚡"
          title="프리셋으로 빠르게"
          subtitle="대표 시나리오 3종 중 선택 — 한 번 클릭에 자동 설정"
        />
        <ModeOption
          active={mode === 'detail'}
          onClick={() => setMode('detail')}
          icon="🛠"
          title="자세하게 직접 고르기"
          subtitle={`12개 공종을 ON/OFF로 세밀 조정${activeGroupCount > 0 ? ` · 현재 ${activeGroupCount}개 활성` : ''}`}
        />
      </div>

      {/* ===== 선택된 모드 컨텐츠 ===== */}
      {mode === 'preset' ? (
        <PresetSection
          presets={visiblePresets}
          property={property}
          value={value}
          onChange={onChange}
          onSwitchToDetail={() => setMode('detail')}
        />
      ) : (
        <DetailSection
          groups={BIG_WORK_GROUPS}
          isGroupActive={isGroupActive}
          groupCount={groupCount}
          toggleGroup={toggleGroup}
          onSwitchToPreset={() => setMode('preset')}
        />
      )}
    </section>
  );
}

// =====================================================
// 모드 선택 카드 (2개)
// =====================================================

function ModeOption({
  active, onClick, icon, title, subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex flex-col gap-1 rounded-xl border-2 p-3 sm:p-4 text-left transition-all active:scale-[0.99] ${
        active
          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200 shadow-sm'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
      }`}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-lg sm:text-xl leading-none flex-shrink-0">{icon}</span>
        <span className={`text-sm sm:text-base font-bold truncate flex-1 ${active ? 'text-blue-900' : 'text-zinc-900'}`}>
          {title}
        </span>
        {active && (
          <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
      <p className={`text-[10.5px] sm:text-xs leading-snug ${active ? 'text-blue-800' : 'text-zinc-500'}`}>
        {subtitle}
      </p>
    </button>
  );
}

// =====================================================
// PresetSection — 프리셋 3종 카드 + 자세히 전환 링크
// =====================================================

function PresetSection({
  presets, property, value, onChange, onSwitchToDetail,
}: {
  presets: typeof PRESETS;
  property: Property;
  value: Scope;
  onChange: (s: Scope) => void;
  onSwitchToDetail: () => void;
}) {
  const [appliedId, setAppliedId] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {presets.map((preset, idx) => {
          const isApplied = appliedId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                track('select_preset', {
                  preset_id: preset.id,
                  preset_label: preset.label,
                  pyeong: property.pyeong,
                });
                onChange(preset.apply(property, value));
                setAppliedId(preset.id);
              }}
              className={`flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-3 text-left transition-all active:scale-[0.98] ${
                isApplied
                  ? 'border-emerald-400 bg-emerald-50/70 ring-1 ring-emerald-200'
                  : 'border-zinc-200 bg-white hover:border-blue-400 hover:bg-blue-50/30'
              }`}
            >
              <div className="flex items-center gap-1.5 w-full">
                <span className={`text-[10px] font-mono font-bold ${isApplied ? 'text-emerald-700' : 'text-blue-600'}`}>
                  PRESET {idx + 1}
                </span>
                {isApplied && (
                  <span className="ml-auto text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    ✓ 적용됨
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-zinc-900 mt-0.5">{preset.label}</span>
              <span className="text-[10px] text-zinc-500 leading-tight">{preset.desc}</span>
            </button>
          );
        })}
      </div>

      {/* 자세히로 전환 안내 — 프리셋 적용 후 미세 조정 유도 */}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-[11px] text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="text-zinc-400">💡</span>
          <span>프리셋 적용 후 세부 공종을 추가/제외하려면</span>
        </span>
        <button
          type="button"
          onClick={onSwitchToDetail}
          className="text-blue-700 hover:text-blue-900 font-semibold underline underline-offset-2 whitespace-nowrap"
        >
          자세히 고르기 →
        </button>
      </div>
    </div>
  );
}

// =====================================================
// DetailSection — 12개 큰 공종 카드 그리드
// =====================================================

function DetailSection({
  groups, isGroupActive, groupCount, toggleGroup, onSwitchToPreset,
}: {
  groups: BigWorkGroup[];
  isGroupActive: (g: BigWorkGroup) => boolean;
  groupCount: (g: BigWorkGroup) => { on: number; total: number };
  toggleGroup: (g: BigWorkGroup) => void;
  onSwitchToPreset: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-500">
          카드 클릭 = 해당 공종 전체 ON/OFF · 일부만 켜져도 활성으로 표시
        </span>
        <button
          type="button"
          onClick={onSwitchToPreset}
          className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline underline-offset-2 whitespace-nowrap"
        >
          ← 프리셋으로 빠르게
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {groups.map(group => (
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
      {/* 헤더 — 인디케이터 + 제목 (이모지 제거, 텍스트만) */}
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
        <span className="text-sm font-bold text-zinc-900 truncate flex-1">{group.title}</span>
      </div>

      {/* 세부 공종 설명 */}
      <p className="text-[11px] text-zinc-600 leading-snug min-h-[2.6em]">{group.desc}</p>

      {/* 상태 라벨 */}
      <span className={`text-[10px] font-semibold ${labelTone}`}>{labelText}</span>
    </button>
  );
}

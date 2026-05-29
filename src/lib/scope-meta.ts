/**
 * 공사 항목의 친근한 라벨·설명·아이콘 메타데이터.
 * 인테리어 초보자가 한눈에 의도를 파악할 수 있도록 작성.
 */
import type { Property, RoomId, RoomScope, Scope } from './types';

export type RoomWorkMeta = {
  key: keyof RoomScope;
  label: string;        // 친근한 이름
  icon: string;         // 이모지
  desc: string;         // 한 줄 설명 (호버 툴팁)
};

/** 공간별 공종 — 표시 순서대로 */
export const ROOM_WORK_META: RoomWorkMeta[] = [
  { key: 'flooring',    icon: '🪵', label: '바닥재',    desc: '기존 바닥을 뜯고 강마루·강화마루·장판 등 새 바닥재 시공' },
  { key: 'wallpaper',   icon: '🧱', label: '도배',      desc: '기존 벽지를 떼고 새 벽지 도배 (실크·합지 등)' },
  { key: 'molding',     icon: '🔲', label: '몰딩',      desc: '천장과 벽이 만나는 띠 마감. 천장 라인이 깔끔하게 보임' },
  { key: 'sash',        icon: '🪟', label: '외창(샷시)', desc: '발코니 쪽 큰 창문 교체. 단열·소음 차단↑, 비용↑' },
  { key: 'aircon',      icon: '❄️', label: '시스템에어컨', desc: '천장에 매립하는 에어컨. 실내기가 보이지 않음' },
  { key: 'closet',      icon: '👔', label: '붙박이장',  desc: '벽에 짜맞춰 제작하는 옷장 (한샘·리바트·사제 등)' },
  { key: 'ceiling_fan', icon: '🌀', label: '실링팬',    desc: '천장 선풍기. 여름철 에어컨 보조·공기 순환' },
];

/** 공간 메타 (이모지·표시명) */
export const ROOM_META: Record<string, { icon: string; label: string }> = {
  '거실':    { icon: '🛋️', label: '거실' },
  '주방':    { icon: '🍳', label: '주방' },
  '안방':    { icon: '🛏️', label: '안방' },
  '작은방1': { icon: '📚', label: '작은방 1' },
  '작은방2': { icon: '🧸', label: '작은방 2' },
  '작은방3': { icon: '🎒', label: '작은방 3' },
};

/** 공종 토글 ON 시 기본 적용 공간. 사용자는 이후 개별 공간을 해제할 수 있다. */
export function defaultRoomsForWork(
  key: keyof RoomScope,
  p: Property,
  visible: RoomId[],
): RoomId[] {
  switch (key) {
    case 'flooring':
    case 'wallpaper':
    case 'molding':
    case 'sash':
      // 공간 마감/외창은 전 공간 일괄
      return visible.slice();
    case 'aircon': {
      // 30평대까지는 거실+침실, 40평 이상은 주방 포함
      const base = (['거실', '안방', '작은방1', '작은방2', '작은방3'] as RoomId[]).filter(r => visible.includes(r));
      if (p.pyeong >= 40 && visible.includes('주방')) base.unshift('주방');
      return base;
    }
    case 'closet':
      // 침실에만
      return (['안방', '작은방1', '작은방2', '작은방3'] as RoomId[]).filter(r => visible.includes(r));
    case 'ceiling_fan':
      // 거실 + 안방
      return (['거실', '안방'] as RoomId[]).filter(r => visible.includes(r));
    default:
      return [];
  }
}

/**
 * ② 공사 범위 — 4×3 그리드로 표시되는 12개 큰 공종 카드.
 *
 * 각 그룹은 RoomScope 키와 GlobalScope 키 양쪽을 동시에 토글할 수 있다.
 * 활성 상태: 그룹 내 어떤 sub-key 하나라도 ON이면 그룹이 ON으로 표시된다.
 * 클릭 동작: 그룹 ON이면 모두 OFF, OFF이면 적절한 기본값으로 모두 ON.
 */
export type BigWorkGroup = {
  id: string;
  title: string;
  icon: string;
  /** 카드 하단에 표시될 세부 공종 설명 (한 줄) */
  desc: string;
  /** 그룹에 속한 RoomScope 키 (각 활성 공간에 동일하게 적용) */
  roomKeys?: (keyof RoomScope)[];
  /** 그룹에 속한 GlobalScope 키 */
  globalKeys?: (keyof Scope['global'])[];
};

export const BIG_WORK_GROUPS: BigWorkGroup[] = [
  {
    id: 'demolition',
    title: '철거공사',
    icon: '🔨',
    desc: '기존 마감재·바닥·도배 철거 + 외벽 단열재 보강',
    globalKeys: ['demolition', 'insulation'],
  },
  {
    id: 'expansion',
    title: '확장공사',
    icon: '🏗️',
    desc: '발코니 확장 + 구청 신고 (확장 공간이 있을 때만 활성)',
    roomKeys: ['expansion_after'],
    globalKeys: ['expansion_report'],
  },
  {
    id: 'sash',
    title: '샷시공사',
    icon: '🪟',
    desc: '발코니 쪽 외창 교체 — 단열·소음 차단↑',
    roomKeys: ['sash'],
  },
  {
    id: 'electrical',
    title: '전기 공사',
    icon: '⚡',
    desc: '전기 기본 배선·분전반 + 스위치/콘센트 + 인덕션 220V 전용선',
    globalKeys: ['electrical_base', 'switch_outlet', 'induction_line'],
  },
  {
    id: 'plumbing',
    title: '설비 공사',
    icon: '🚰',
    desc: '설비기본·분배기·온도조절기 (기본) + 배관변경·난방배관 (옵션)',
    globalKeys: ['plumbing_base', 'thermostat', 'distribution_panel', 'heating_pipe', 'plumbing_relocation'],
  },
  {
    id: 'wallpaper',
    title: '도배공사',
    icon: '🧱',
    desc: '활성 공간 전체 도배 재시공 + 발코니 외벽 도장',
    roomKeys: ['wallpaper'],
    globalKeys: ['balcony_paint'],
  },
  {
    id: 'flooring',
    title: '마루공사',
    icon: '🪵',
    desc: '활성 공간 전체 바닥재 교체 + 발코니 바닥타일',
    roomKeys: ['flooring'],
    globalKeys: ['balcony_floor_tile'],
  },
  {
    id: 'bath',
    title: '욕실공사',
    icon: '🚿',
    desc: '공용·부부욕실 풀세트 — 방수·타일·세면대·변기·악세사리',
    globalKeys: ['common_bath_set', 'master_bath_set'],
  },
  {
    id: 'kitchen',
    title: '주방공사',
    icon: '🍳',
    desc: '주방가구 풀세트 — 상하부장·상판·후드·싱크볼·하드웨어',
    globalKeys: ['kitchen_set'],
  },
  {
    id: 'lighting',
    title: '조명공사',
    icon: '💡',
    desc: '다운라이트 + 거실·주방 간접조명·매그네틱 조명',
    globalKeys: ['lighting'],
  },
  {
    id: 'doors',
    title: '문 교체',
    icon: '🚪',
    desc: '중문 + 신발장 (현관 키 큰 가구)',
    globalKeys: ['middoor', 'entry_furniture'],
  },
  {
    id: 'carpentry',
    title: '목공사',
    icon: '🪚',
    desc: '기본·천정 목공 + 가벽 + 무몰딩/무문선/무걸레받이 (선택)',
    globalKeys: ['carpentry_base', 'carpentry_ceiling', 'no_molding', 'no_door_frame', 'no_baseboard'],
    // partition_length(가벽 길이)는 ScopeMatrix.tsx의 활성 판정 로직에 별도 추가
  },
];

// ─────────────────────────────────────────────────────────
// 레거시 호환 export — 기존 코드(PDF 매트릭스 등)가 참조하므로 유지
// ─────────────────────────────────────────────────────────

/** PDF 공간×공종 매트릭스용 — RoomScope 키 라벨 */
export const ROOM_WORK_GROUPS: {
  title: string;
  icon: string;
  desc: string;
  keys: (keyof RoomScope)[];
}[] = [
  {
    title: '공간 마감',
    icon: '📐',
    desc: '바닥재·도배·몰딩·외창 — 활성 공간 전체에 일괄 적용',
    keys: ['flooring', 'wallpaper', 'molding', 'sash'],
  },
];

export type GlobalItemMeta = {
  key: keyof Scope['global'];
  label: string;
  desc: string;
  hint?: string;
  warning?: string;
};

export type GlobalGroup = {
  title: string;
  icon: string;
  desc: string;
  items: GlobalItemMeta[];
};

/**
 * PDF 등 기존 참조 호환용 — BIG_WORK_GROUPS의 globalKeys만 모아 카테고리화한 뷰.
 * 신규 UI 코드에서는 BIG_WORK_GROUPS를 직접 사용하는 것을 권장.
 */
export const GLOBAL_GROUPS: GlobalGroup[] = [
  {
    icon: '🔨', title: '철거공사', desc: '기존 마감재·단열 보강',
    items: [
      { key: 'demolition', label: '철거', desc: '기존 마감재·가구 모두 뜯어내기' },
      { key: 'insulation', label: '단열재 보강', desc: '외벽 안쪽 단열재 추가' },
    ],
  },
  {
    icon: '🏗️', title: '확장공사', desc: '발코니 확장 신고·행위허가',
    items: [
      { key: 'expansion_report', label: '구청 확장공사 신고', desc: '확장 시 필수' },
      { key: 'act_permit', label: '구청 행위허가 신고', desc: '구조변경·평면수정 시 필수' },
    ],
  },
  {
    icon: '⚡', title: '전기 공사', desc: '전기 기본 + 스위치/콘센트 + 인덕션 전용선',
    items: [
      { key: 'electrical_base', label: '전기 기본', desc: '배선·분전반 점검·보강' },
      { key: 'switch_outlet', label: '스위치/콘센트', desc: '평형별 자동 산정' },
      { key: 'induction_line', label: '인덕션 220V 전용선', desc: '가스→인덕션 교체 시 필수' },
    ],
  },
  {
    icon: '🚰', title: '설비 공사', desc: '설비기본·분배기·온도조절기 + 옵션(배관변경·난방배관)',
    items: [
      { key: 'plumbing_base', label: '설비 기본', desc: '수도·하수 점검·보강 (기본 포함)' },
      { key: 'distribution_panel', label: '분배기 교체', desc: '난방 분배기 교체 (기본 포함)' },
      { key: 'thermostat', label: '난방 온도조절기', desc: '거실+각 방 자동 산정 (기본 포함)' },
      { key: 'plumbing_relocation', label: '배관 변경', desc: '옵션 — 주방·욕실 위치 변경 시' },
      { key: 'heating_pipe', label: '난방배관 교체', desc: '옵션 — 20년+ 노후 시 권장', warning: '큰 비용' },
    ],
  },
  {
    icon: '🚿', title: '욕실공사', desc: '공용·부부욕실 풀세트',
    items: [
      { key: 'common_bath_set', label: '공용욕실 풀세트', desc: '방수·타일·세면대·변기·악세사리' },
      { key: 'master_bath_set', label: '부부욕실 풀세트', desc: '안방 욕실' },
    ],
  },
  {
    icon: '🍳', title: '주방공사', desc: '주방가구 풀세트',
    items: [
      { key: 'kitchen_set', label: '주방가구', desc: '상하부장·상판·후드·싱크볼·하드웨어' },
    ],
  },
  {
    icon: '💡', title: '조명공사', desc: '다운라이트·간접조명',
    items: [
      { key: 'lighting', label: '조명 풀세트', desc: '다운라이트 + 거실/주방 간접·매그네틱' },
    ],
  },
  {
    icon: '🚪', title: '문 교체', desc: '중문 + 신발장',
    items: [
      { key: 'middoor', label: '중문', desc: '현관-거실 슬라이딩 문' },
      { key: 'entry_furniture', label: '신발장', desc: '현관 키 큰 가구' },
    ],
  },
  {
    icon: '🌿', title: '발코니 마감', desc: '확장 안 한 발코니 정리',
    items: [
      { key: 'balcony_floor_tile', label: '발코니 바닥타일', desc: '실외기실 등 타일 시공' },
      { key: 'balcony_paint', label: '발코니 외벽 도장', desc: '결로 방지·청결' },
    ],
  },
  {
    icon: '🧴', title: '기타', desc: '실리콘·보양·동의서·준공청소',
    items: [
      { key: 'silicon', label: '실리콘 마감', desc: '욕실·주방·창틀 마감' },
      { key: 'protection', label: '보양', desc: '바닥·창호·문짝 보호' },
      { key: 'consent', label: '동의서 징구', desc: '관리실·이웃 동의' },
      { key: 'cleanup', label: '준공 청소', desc: '평수 비례 — 입주 전 마무리' },
    ],
  },
];

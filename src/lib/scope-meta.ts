/**
 * 공사 항목의 친근한 라벨·설명·아이콘 메타데이터.
 * 인테리어 초보자가 한눈에 의도를 파악할 수 있도록 작성.
 */
import type { RoomScope, Scope } from './types';

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
};

export type GlobalItemMeta = {
  key: keyof Scope['global'];
  label: string;
  desc: string;
  hint?: string;        // 우측에 보일 짧은 보조 텍스트
  warning?: string;     // 주황 배지로 표시
};

export type GlobalGroup = {
  title: string;
  icon: string;
  desc: string;
  items: GlobalItemMeta[];
};

/** 전체 공종 — 카테고리로 그룹화 */
export const GLOBAL_GROUPS: GlobalGroup[] = [
  {
    icon: '🏗️',
    title: '기초 공사',
    desc: '집을 한 번 비우고 새로 만드는 큰 단위 작업',
    items: [
      { key: 'demolition',  label: '철거',         desc: '기존 마감재·가구 모두 뜯어내기. 풀리모델링 시 필수' },
      { key: 'insulation',  label: '단열재 보강',   desc: '외벽 안쪽에 단열재 추가. 결로·곰팡이 방지, 겨울 따뜻함' },
    ],
  },
  {
    icon: '🚿',
    title: '욕실 풀세트',
    desc: '벽·바닥·천장·도기까지 한꺼번에 교체',
    items: [
      { key: 'common_bath_set', label: '공용욕실 풀세트', desc: '방수·타일·세면대·변기·악세사리 한꺼번에' },
      { key: 'master_bath_set', label: '부부욕실 풀세트', desc: '안방 욕실(있는 경우)' },
    ],
  },
  {
    icon: '🍽️',
    title: '주방 가구',
    desc: '주방을 통째로 새로',
    items: [
      { key: 'kitchen_set', label: '주방가구 (3.6m)', desc: '상하부장·상판·후드·싱크볼·하드웨어 일체' },
    ],
  },
  {
    icon: '🚪',
    title: '도어·가구',
    desc: '현관·중문 등 큰 가구',
    items: [
      { key: 'middoor',          label: '중문',     desc: '현관과 거실 사이 슬라이딩 문. 외풍 차단·미관·소음 차단' },
      { key: 'entry_furniture',  label: '신발장',   desc: '현관 키 큰 신발장 (한샘 등 기성 가구)' },
    ],
  },
  {
    icon: '💡',
    title: '조명',
    desc: '거실·주방 중심 조명 일괄',
    items: [
      { key: 'lighting', label: '조명 풀세트', desc: '다운라이트 + 거실/주방 간접·매그네틱 조명' },
    ],
  },
  {
    icon: '🌿',
    title: '발코니 정리',
    desc: '확장 안 한 발코니의 마감',
    items: [
      { key: 'balcony_floor_tile', label: '발코니 바닥타일', desc: '발코니 바닥에 타일 시공 (실외기실 등)' },
      { key: 'balcony_paint',      label: '발코니 외벽 도장', desc: '결로 방지·청결 유지용 도장' },
    ],
  },
  {
    icon: '⚡',
    title: '전기·설비',
    desc: '전기·수도·난방 정비',
    items: [
      { key: 'electrical_base', label: '전기·설비 기본',     desc: '전기·수도 배관 점검·보강' },
      { key: 'switch_outlet',   label: '스위치/콘센트 교체', desc: '평형별 자동 산정 (30평=34개)' },
      { key: 'induction_line',  label: '인덕션 220V 전용선', desc: '가스→인덕션 교체 시 필수. 분전반에서 주방까지' },
      { key: 'thermostat',      label: '난방 온도조절기',    desc: '거실+각 방에 1개씩 자동 산정' },
      { key: 'heating_pipe',    label: '난방배관 교체',      desc: '20년 이상 노후 시 권장. 큰 비용이지만 누수·수명 보장', warning: '큰 비용' },
    ],
  },
  {
    icon: '🧴',
    title: '마감 디테일',
    desc: '꼭 필요한 잔공사',
    items: [
      { key: 'silicon',           label: '실리콘 마감',         desc: '욕실·주방·창틀 등 마감 실리콘' },
      { key: 'expansion_report',  label: '구청 확장공사 신고',  desc: '확장 시 필수. 미신고 시 과태료 부과 위험', warning: '확장 시 필수' },
    ],
  },
];

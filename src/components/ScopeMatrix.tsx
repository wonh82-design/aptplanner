'use client';

import type { Property, RoomScope, Scope, RoomId } from '@/lib/types';
import { activeRooms } from '@/lib/areas';

type Props = {
  property: Property;
  value: Scope;
  onChange: (next: Scope) => void;
};

const EXPANSION_COLS: { key: keyof RoomScope; label: string; hint: string }[] = [
  { key: 'expansion_current', label: '현재',   hint: '현재 확장된 상태' },
  { key: 'expansion_after',   label: '확장후', hint: '확장 시공 의사' },
];

const ROOM_WORK_COLS: { key: keyof RoomScope; label: string }[] = [
  { key: 'flooring',    label: '바닥재' },
  { key: 'wallpaper',   label: '도배' },
  { key: 'molding',     label: '몰딩' },
  { key: 'sash',        label: '샷시' },
  { key: 'aircon',      label: '에어컨' },
  { key: 'closet',      label: '붙박이장' },
  { key: 'ceiling_fan', label: '실링팬' },
];

const GLOBAL_TOGGLES: { key: keyof Scope['global']; label: string; hint?: string }[] = [
  { key: 'demolition',         label: '철거공사',       hint: '전용면적 전체' },
  { key: 'insulation',         label: '단열공사',       hint: '전용면적 전체' },
  { key: 'heating_pipe',       label: '난방배관 교체',  hint: '공급평 × 30만' },
  { key: 'common_bath_set',    label: '공용욕실 세트',  hint: '풀세트' },
  { key: 'master_bath_set',    label: '부부욕실 세트',  hint: '풀세트' },
  { key: 'kitchen_set',        label: '주방가구',       hint: '3.6m 환산' },
  { key: 'middoor',            label: '중문',           hint: '1ea' },
  { key: 'entry_furniture',    label: '현관 일반가구',  hint: '신발장 등' },
  { key: 'lighting',           label: '조명 풀세트' },
  { key: 'balcony_floor_tile', label: '발코니 바닥타일' },
  { key: 'balcony_paint',      label: '발코니 도장' },
  { key: 'electrical_base',    label: '전기·설비 기본' },
  { key: 'switch_outlet',      label: '스위치/콘센트' },
  { key: 'induction_line',     label: '인덕션 전용선',  hint: '220V' },
  { key: 'thermostat',         label: '난방온도조절기' },
  { key: 'silicon',            label: '실리콘 공사' },
  { key: 'expansion_report',   label: '구청 신고',     hint: '확장 시 권장' },
];

export function ScopeMatrix({ property, value, onChange }: Props) {
  const rooms = activeRooms(property) as RoomId[];

  const toggleRoom = (room: RoomId, key: keyof RoomScope) => {
    const next = { ...value.rooms[room], [key]: !value.rooms[room][key] };
    onChange({ ...value, rooms: { ...value.rooms, [room]: next } });
  };

  const toggleGlobal = (key: keyof Scope['global']) => {
    onChange({ ...value, global: { ...value.global, [key]: !value.global[key] } });
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
      <h2 className="text-base font-semibold mb-4">2. 공사 범위</h2>

      <div className="mb-5">
        <h3 className="text-xs font-medium text-zinc-500 mb-2">공간별 공종 매트릭스</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-200">
                <th className="text-left py-2 pr-2 font-medium" rowSpan={2}>공간</th>
                <th className="text-center py-1 font-medium bg-amber-50/60" colSpan={EXPANSION_COLS.length}>
                  확장
                </th>
                <th className="text-center py-1 font-medium" colSpan={ROOM_WORK_COLS.length}>
                  공종
                </th>
              </tr>
              <tr className="text-[10px] text-zinc-500 border-b border-zinc-200">
                {EXPANSION_COLS.map(col => (
                  <th key={col.key} className="py-1 px-1 font-medium text-center bg-amber-50/40" title={col.hint}>
                    {col.label}
                  </th>
                ))}
                {ROOM_WORK_COLS.map(col => (
                  <th key={col.key} className="py-1 px-1 font-medium text-center">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-2 font-medium">{room}</td>
                  {EXPANSION_COLS.map(col => (
                    <td key={col.key} className="py-2 px-1 text-center bg-amber-50/30">
                      <input
                        type="checkbox"
                        checked={value.rooms[room][col.key] as boolean}
                        onChange={() => toggleRoom(room, col.key)}
                        className="cb"
                      />
                    </td>
                  ))}
                  {ROOM_WORK_COLS.map(col => (
                    <td key={col.key} className="py-2 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={value.rooms[room][col.key] as boolean}
                        onChange={() => toggleRoom(room, col.key)}
                        className="cb"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          현재N + 확장후Y 인 공간이 있으면 <b>확장공사·새 외창·구청 신고·터닝도어</b>가 자동 추가됩니다.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-medium text-zinc-500 mb-2">전체 공종 토글</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GLOBAL_TOGGLES.map(t => (
            <label
              key={t.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                value.global[t.key]
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <input
                type="checkbox"
                checked={value.global[t.key]}
                onChange={() => toggleGlobal(t.key)}
                className="cb"
              />
              <span className="flex-1 truncate">
                <span className="font-medium">{t.label}</span>
                {t.hint && <span className="ml-1 text-[10px] text-zinc-400">· {t.hint}</span>}
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

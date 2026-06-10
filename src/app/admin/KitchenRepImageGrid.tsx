'use client';

/**
 * 주방 풀세트 대표 이미지 업로드 그리드 (sub_category==='kitchen_set' 자재 전용).
 * 6개 슬롯(평형대×베이) × 3등급(가성비/표준/고급) = 최대 18칸. 각 칸은 ImageUploadField 재사용.
 * 신규/수정 자재 폼 양쪽에서 동일하게 사용한다.
 */

import { KITCHEN_REP_SLOTS, kitchenRepImageKey } from '@/lib/types';
import type { GradeGroup } from '@/lib/types';
import { ImageUploadField } from './ImageUploadField';

const GRADES: GradeGroup[] = ['가성비', '표준', '고급'];

type Props = {
  /** 현재 이미지 맵 (`${slot}|${grade}` → URL) */
  images: Record<string, string>;
  /** 한 칸 변경 — url 이 null/빈값이면 제거 */
  onChange: (key: string, url: string | null) => void;
  materialId?: string;
  token: string | null;
  onUnauthorized?: () => void;
};

export function KitchenRepImageGrid({ images, onChange, materialId, token, onUnauthorized }: Props) {
  return (
    <div className="sm:col-span-2 space-y-3">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
        ⓘ <strong>평형대·베이·등급별 주방 대표 이미지</strong> — 견적의 주방 풀세트 카드에서 우리집 평형·베이 + 선택 등급에 맞는
        이미지가 표시됩니다. <strong>4·5베이는 3베이 이미지를 공용</strong>하고, 40/50평대는 베이 무관입니다.
        비워두면 해당 조합은 카드에 이미지가 표시되지 않습니다.
      </div>
      {KITCHEN_REP_SLOTS.map((slot) => (
        <div key={slot.key} className="rounded-lg border border-zinc-200 p-3">
          <div className="text-xs font-bold text-zinc-800 mb-2">{slot.label}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GRADES.map((g) => {
              const key = kitchenRepImageKey(slot.key, g);
              return (
                <div key={g}>
                  <div className="text-[10px] font-semibold text-zinc-500 mb-1">{g}</div>
                  <ImageUploadField
                    value={images[key] ?? null}
                    onChange={(url) => onChange(key, url)}
                    materialId={materialId ? `${materialId}-${slot.key}-${g}` : undefined}
                    token={token}
                    onUnauthorized={onUnauthorized}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

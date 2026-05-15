'use client';

import type { Property } from '@/lib/types';
import { recommendedRoomCount, exclusiveAreaM2, supplyAreaM2, outsideWindowArea } from '@/lib/areas';

type Props = {
  value: Property;
  onChange: (next: Property) => void;
};

export function PropertyForm({ value, onChange }: Props) {
  const setField = <K extends keyof Property>(k: K, v: Property[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
      <h2 className="text-base font-semibold mb-4">1. 기본 정보</h2>

      <div className="grid grid-cols-2 gap-4">
        <Field label="평형 (공급평)">
          <div className="flex gap-2 items-stretch">
            <input
              type="number"
              min={10}
              max={80}
              value={value.pyeong || ''}
              placeholder="예: 30"
              onChange={(e) => {
                const raw = e.target.value;
                const py = raw === '' ? 0 : Number(raw);
                onChange({
                  ...value,
                  pyeong: py,
                  rooms: py > 0 ? recommendedRoomCount(py) : value.rooms,
                });
              }}
              className="input flex-1 min-w-0"
            />
            <div className="inline-flex rounded-lg border border-zinc-300 bg-white overflow-hidden text-xs shadow-sm">
              {[24, 34, 44].map(py => (
                <button
                  key={py}
                  type="button"
                  onClick={() => onChange({
                    ...value,
                    pyeong: py,
                    rooms: recommendedRoomCount(py),
                  })}
                  className={`px-2.5 py-2 transition border-r last:border-r-0 border-r-zinc-200 ${
                    value.pyeong === py
                      ? 'bg-blue-100 text-blue-900 font-semibold'
                      : 'bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {py}평
                </button>
              ))}
            </div>
          </div>
        </Field>

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

        <Field label="방 개수">
          <select
            value={value.rooms}
            onChange={(e) => setField('rooms', Number(e.target.value) as 2 | 3 | 4 | 5)}
            className="input"
          >
            <option value={2}>2개</option>
            <option value={3}>3개</option>
            <option value={4}>4개</option>
            <option value={5}>5개</option>
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

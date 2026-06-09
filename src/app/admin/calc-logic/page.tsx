'use client';

/**
 * 관리자 — 공종별 계산 로직 확인 화면 (읽기 전용).
 *
 * URL: /admin/calc-logic
 *
 * 목적: 운영자가 "이 공종은 어떤 표준면적/계수를 적용하고, 어떤 자재마스터 단가를
 *       어떻게 적용하는지" 를 코드를 보지 않고 확인.
 *
 * 핵심: 수량·단가·소계·자재·분류는 실제 엔진(buildQuote)을 그대로 돌려 LineItem 에서
 *       가져온다(코드와 절대 어긋나지 않음). 산식 '설명'만 calc-logic-meta 에서 가져옴.
 *
 * 편집 없음 — 단가 수정은 각 자재의 /admin/materials/[id] 링크로 이동.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import standardAreas from '@/data/standard_areas.json';
import type { GradeGroup, GradeSelection, LineItem, Material, Property, RegionId, AgeId } from '@/lib/types';
import {
  buildQuote, categoryOf, fmtKRW, fmtKRWVat, REGION_LABEL, AGE_LABEL,
  REGION_MULTIPLIER, AGE_MULTIPLIER, adjustmentMultiplier,
  WALL_RATIO, BASEBOARD_HEIGHT, BATH_TILE_AREA_FACTOR, BATH_WATERPROOF_AREA_FACTOR,
} from '@/lib/calculator';
import { setMaterials, labelOf, getPrimaryMaterial } from '@/lib/materials';
import {
  recommendedRoomCount, supplyAreaM2, exclusiveAreaM2, bathroomArea, kitchenLength,
  downlightCount, switchOutletCount, entryClosetLength, doorCount, outsideWindowArea,
} from '@/lib/areas';
import { defaultProperty, defaultScope, defaultGrade } from '@/lib/defaults';
import { calcLogicMetaOf, priceApplyLabel } from '@/lib/calc-logic-meta';
import { AdminGate } from '../AdminGate';

export default function CalcLogicPage() {
  return (
    <AdminGate>
      <CalcLogicViewer />
    </AdminGate>
  );
}

const GRADE_GROUPS: GradeGroup[] = ['가성비', '표준', '고급'];
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function CalcLogicViewer() {
  const [pyeong, setPyeong] = useState(34);
  const [bay, setBay] = useState<2 | 3 | 4 | 5>(3);
  const [commonBath, setCommonBath] = useState<1 | 2>(1);
  const [masterBath, setMasterBath] = useState<0 | 1>(1);
  const [grade, setGrade] = useState<GradeGroup>('표준');
  const [region, setRegion] = useState<RegionId>('gyeonggi');
  const [age, setAge] = useState<AgeId>('15-30');

  // /api/materials(public) 로드 → setMaterials → version 증가로 재계산 트리거
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/materials', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled && Array.isArray(json.materials) && json.materials.length > 0) {
          setMaterials(json.materials as Material[]);
        }
      } catch {
        /* bundled JSON 폴백 */
      } finally {
        if (!cancelled) { setVersion((v) => v + 1); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const property: Property = useMemo(() => ({
    ...defaultProperty(),
    pyeong,
    bay,
    rooms: recommendedRoomCount(pyeong),
    common_bath: commonBath,
    master_bath: masterBath,
    region,
    age,
  }), [pyeong, bay, commonBath, masterBath, region, age]);

  const quote = useMemo(() => {
    const sel: GradeSelection = { ...defaultGrade(), default: grade };
    return buildQuote(property, defaultScope(), sel);
    // version: 자재 갱신 시 재계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property, grade, version]);

  // 대공종(category)별 그룹 — 공사비 내림차순 (결과화면/PPTX 와 동일)
  const groups = useMemo(() => {
    const m = new Map<string, LineItem[]>();
    for (const it of quote.line_items) {
      const cat = categoryOf(it);
      const arr = m.get(cat) ?? [];
      arr.push(it);
      m.set(cat, arr);
    }
    return [...m.entries()]
      .map(([cat, items]) => ({ cat, items, subtotal: items.reduce((s, x) => s + x.subtotal, 0) }))
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [quote]);

  // 등급별 자재 매핑 — 견적에 등장한 distinct work_type
  const workTypes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const it of quote.line_items) {
      if (!seen.has(it.work_type)) { seen.add(it.work_type); out.push(it.work_type); }
    }
    return out;
  }, [quote]);

  const adj = adjustmentMultiplier(property);
  const SA = standardAreas as unknown as {
    pyeongs: number[];
    rooms: Record<string, Record<string, number>>;
    rooms_by_bay: Record<string, Record<string, Record<string, number>>>;
    perimeters: Record<string, Record<string, number>>;
    balcony: Record<string, Record<string, number>>;
  };
  const bayRooms = SA.rooms_by_bay?.[String(bay)] ?? SA.rooms;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
      {/* 헤더 */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-zinc-900">공종별 계산 로직 확인</h1>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
          아래 우리집 샘플 입력값으로 <strong>실제 계산 엔진</strong>을 돌린 결과입니다. 수량·단가·소계·자재는 엔진에서 그대로 가져오며,
          산식 설명만 별도 문서입니다. 단가 수정은 각 자재의 <strong>편집 링크</strong>에서 하세요. (이 화면은 읽기 전용)
        </p>
      </div>

      {/* 샘플 입력 선택기 */}
      <div className="bg-white rounded-lg border border-zinc-200 p-3 sm:p-4 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Picker label="평형(공급)">
            <input
              type="number" inputMode="numeric" min={10} max={80}
              value={pyeong === 0 ? '' : pyeong}
              onChange={(e) => setPyeong(e.target.value === '' ? 0 : Math.min(80, Number(e.target.value)))}
              className="input"
            />
          </Picker>
          <Picker label="베이">
            <select value={bay} onChange={(e) => setBay(Number(e.target.value) as 2 | 3 | 4 | 5)} className="input">
              {[2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}베이</option>)}
            </select>
          </Picker>
          <Picker label="공용욕실">
            <select value={commonBath} onChange={(e) => setCommonBath(Number(e.target.value) as 1 | 2)} className="input">
              <option value={1}>1개</option>
              <option value={2}>2개</option>
            </select>
          </Picker>
          <Picker label="부부욕실">
            <select value={masterBath} onChange={(e) => setMasterBath(Number(e.target.value) as 0 | 1)} className="input">
              <option value={0}>없음</option>
              <option value={1}>있음</option>
            </select>
          </Picker>
          <Picker label="등급">
            <select value={grade} onChange={(e) => setGrade(e.target.value as GradeGroup)} className="input">
              {GRADE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Picker>
          <Picker label="지역">
            <select value={region} onChange={(e) => setRegion(e.target.value as RegionId)} className="input">
              {(Object.keys(REGION_LABEL) as RegionId[]).map((k) => <option key={k} value={k}>{REGION_LABEL[k]}</option>)}
            </select>
          </Picker>
          <Picker label="연식">
            <select value={age} onChange={(e) => setAge(e.target.value as AgeId)} className="input">
              {(Object.keys(AGE_LABEL) as AgeId[]).map((k) => <option key={k} value={k}>{AGE_LABEL[k]}</option>)}
            </select>
          </Picker>
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs">
          <span className="text-zinc-500">방 {property.rooms}개 (권장)</span>
          <span className="text-zinc-500">보정계수 <strong className="text-zinc-800 tabular-nums">×{adj.toFixed(2)}</strong> (지역 ×{REGION_MULTIPLIER[region].toFixed(2)} · 연식 ×{AGE_MULTIPLIER[age].toFixed(2)})</span>
          <span className="text-zinc-700">항목합계(부가세 별도, 보정 전) <strong className="tabular-nums">{fmtKRW(quote.totals.grand_total_raw)}</strong></span>
          <span className="text-zinc-700">보정 후(부가세 포함) <strong className="tabular-nums text-blue-700">{fmtKRWVat(quote.totals.grand_total)}</strong></span>
          {loading && <span className="text-amber-600">자재 로딩 중…</span>}
        </div>
      </div>

      {/* 메인 — 공종별 산식·자재·결과 */}
      <div className="space-y-5">
        {groups.map(({ cat, items, subtotal }) => (
          <section key={cat} className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
            <div className="px-3 sm:px-4 py-2 bg-zinc-50 border-b border-zinc-200 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-zinc-900">{cat}</h2>
              <span className="text-xs text-zinc-500 tabular-nums">소계 {fmtKRW(subtotal)} <span className="text-zinc-400">(부가세 별도)</span></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-zinc-500 bg-white border-b border-zinc-100">
                    <th className="text-left font-semibold px-3 py-1.5 whitespace-nowrap">공종</th>
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">공간</th>
                    <th className="text-left font-semibold px-2 py-1.5">수량 산식</th>
                    <th className="text-right font-semibold px-2 py-1.5 whitespace-nowrap">수량</th>
                    <th className="text-left font-semibold px-2 py-1.5">적용 자재 (단가 편집 링크)</th>
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">단가 적용</th>
                    <th className="text-right font-semibold px-2 py-1.5 whitespace-nowrap">단가</th>
                    <th className="text-right font-semibold px-3 py-1.5 whitespace-nowrap">소계</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {items.map((it) => {
                    const meta = calcLogicMetaOf(it.work_type);
                    return (
                      <tr key={it.id} className="hover:bg-blue-50/30 align-top">
                        <td className="px-3 py-1.5 font-medium text-zinc-900 whitespace-nowrap">
                          {labelOf(it.work_type)}
                          <div className="text-[9px] font-mono text-zinc-400">{it.work_type}</div>
                        </td>
                        <td className="px-2 py-1.5 text-zinc-600 whitespace-nowrap">{it.room}</td>
                        <td className="px-2 py-1.5 text-zinc-700 min-w-[180px]">
                          {meta?.formula ?? <span className="text-red-500">⚠ 산식 미등록</span>}
                          {meta?.areaRef && <div className="text-[10px] text-zinc-400 mt-0.5">↳ {meta.areaRef}</div>}
                          {meta?.note && <div className="text-[10px] text-amber-600 mt-0.5">※ {meta.note}</div>}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-zinc-700 whitespace-nowrap">
                          {fmtNum(it.qty)} <span className="text-zinc-400">{it.unit_type}</span>
                        </td>
                        <td className="px-2 py-1.5 min-w-[200px]">
                          {it.material_id ? (
                            <Link href={`/admin/materials/${encodeURIComponent(it.material_id)}`} className="text-blue-700 hover:underline font-mono text-[10px]">
                              {it.material_id}
                            </Link>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-mono">자재마스터 없음</span>
                          )}
                          <span className="ml-1.5 inline-block px-1 rounded bg-zinc-100 text-zinc-600 text-[9px] align-middle">{it.grade}</span>
                          <div className="text-[10px] text-zinc-500 leading-snug mt-0.5 line-clamp-2">{it.material_label}</div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <span className="text-[10px] text-zinc-600">{priceApplyLabel(it.work_type, it.unit_type)}</span>
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600 whitespace-nowrap">{fmtKRW(it.unit_price)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-zinc-900 whitespace-nowrap">{fmtKRW(it.subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {/* ── 참조 1: 등급별 자재 매핑 ── */}
      <details className="mt-6 bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <summary className="px-4 py-2.5 cursor-pointer text-sm font-bold text-zinc-900 hover:bg-zinc-50 select-none">
          공종별 등급 자재 매핑 — 등급 선택 시 어떤 자재마스터가 적용되는지
        </summary>
        <div className="overflow-x-auto border-t border-zinc-100">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-zinc-500 bg-zinc-50 border-b border-zinc-100">
                <th className="text-left font-semibold px-3 py-1.5">공종</th>
                {GRADE_GROUPS.map((g) => <th key={g} className="text-left font-semibold px-2 py-1.5">{g}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {workTypes.map((wt) => (
                <tr key={wt} className="hover:bg-blue-50/30">
                  <td className="px-3 py-1.5 font-medium text-zinc-900 whitespace-nowrap">
                    {labelOf(wt)} <span className="font-mono text-[9px] text-zinc-400">{wt}</span>
                  </td>
                  {GRADE_GROUPS.map((g) => {
                    const m = getPrimaryMaterial(wt, g);
                    return (
                      <td key={g} className="px-2 py-1.5 align-top">
                        {m ? (
                          <>
                            <Link href={`/admin/materials/${encodeURIComponent(m.material_id)}`} className="text-blue-700 hover:underline font-mono text-[10px]">{m.material_id}</Link>
                            <div className="text-[10px] text-zinc-500 leading-snug">{[m.brand, m.product_line].filter(Boolean).join(' ') || '—'}</div>
                          </>
                        ) : <span className="text-[10px] text-zinc-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* ── 참조 2: 계산 상수·면적 함수 (현재 샘플 기준) ── */}
      <details className="mt-4 bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <summary className="px-4 py-2.5 cursor-pointer text-sm font-bold text-zinc-900 hover:bg-zinc-50 select-none">
          계산 상수·계수 + 면적 함수 (현재 {pyeong}평 기준)
        </summary>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-100">
          <div>
            <h3 className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold mb-1.5">계산 상수 (코드)</h3>
            <KvTable rows={[
              ['도배 벽면 환산 (WALL_RATIO)', `× ${WALL_RATIO}`],
              ['걸레받이 ㎡ 환산 (BASEBOARD_HEIGHT)', `× ${BASEBOARD_HEIGHT}`],
              ['욕실 타일/줄눈 면적계수', `× ${BATH_TILE_AREA_FACTOR}`],
              ['욕실 방수 면적계수', `× ${BATH_WATERPROOF_AREA_FACTOR}`],
              ['공급면적 환산', `평 × ${supplyAreaM2(1)}`],
              ['전용면적 비율', `공급 × ${(exclusiveAreaM2(1) / supplyAreaM2(1)).toFixed(2)}`],
              [`지역 보정 (${REGION_LABEL[region]})`, `× ${REGION_MULTIPLIER[region].toFixed(2)}`],
              [`연식 보정 (${AGE_LABEL[age]})`, `× ${AGE_MULTIPLIER[age].toFixed(2)}`],
            ]} />
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold mb-1.5">면적 함수 — {pyeong}평·{bay}베이 산출값</h3>
            <KvTable rows={[
              ['공급면적', `${supplyAreaM2(pyeong).toFixed(1)} ㎡`],
              ['전용면적', `${exclusiveAreaM2(pyeong).toFixed(1)} ㎡`],
              ['외부창 면적', `${outsideWindowArea(pyeong, bay).toFixed(1)} ㎡`],
              ['욕실 1실 면적', `${bathroomArea(pyeong).toFixed(1)} ㎡`],
              ['주방 길이', `${kitchenLength(pyeong).toFixed(1)} m`],
              ['현관 신발장 길이', `${entryClosetLength(pyeong).toFixed(1)} m`],
              ['다운라이트 개수', `${downlightCount(pyeong)} 개`],
              ['스위치/콘센트 개수', `${switchOutletCount(pyeong)} 개`],
              ['문짝 개수', `${doorCount(pyeong)} 개`],
            ]} />
          </div>
        </div>
      </details>

      {/* ── 참조 3: 표준면적 표 (standard_areas.json) ── */}
      <details className="mt-4 bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <summary className="px-4 py-2.5 cursor-pointer text-sm font-bold text-zinc-900 hover:bg-zinc-50 select-none">
          표준면적 표 (standard_areas.json) — {bay}베이 기준
        </summary>
        <div className="p-4 space-y-5 border-t border-zinc-100">
          <AreaMatrix title={`공간 면적 (㎡) · ${bay}베이`} pyeongs={SA.pyeongs} table={bayRooms} />
          <AreaMatrix title="공간 둘레 (m)" pyeongs={SA.pyeongs} table={SA.perimeters} />
          <AreaMatrix title="발코니 (㎡)" pyeongs={SA.pyeongs} table={SA.balcony} />
        </div>
      </details>

      <p className="mt-5 text-[11px] text-zinc-400 leading-relaxed">
        ※ 산식 설명은 문서이며, 수량·단가·소계·자재는 실제 엔진 산출값입니다.
        구조·계수·표준면적 값을 바꾸려면 코드 수정이 필요합니다(이 화면은 확인 전용).
      </p>
    </div>
  );
}

function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function KvTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full text-xs">
      <tbody className="divide-y divide-zinc-100">
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className="py-1 pr-2 text-zinc-600">{k}</td>
            <td className="py-1 text-right tabular-nums font-mono font-semibold text-zinc-900 whitespace-nowrap">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AreaMatrix({ title, pyeongs, table }: { title: string; pyeongs: number[]; table: Record<string, Record<string, number>> }) {
  const rowKeys = Object.keys(table);
  return (
    <div>
      <h3 className="text-[11px] font-bold text-zinc-700 mb-1.5">{title}</h3>
      <div className="overflow-x-auto">
        <table className="text-[11px] border-collapse">
          <thead>
            <tr className="text-zinc-500">
              <th className="text-left font-semibold px-2 py-1 border-b border-zinc-200">공간 \ 평형</th>
              {pyeongs.map((p) => <th key={p} className="text-right font-semibold px-2 py-1 border-b border-zinc-200 tabular-nums">{p}평</th>)}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rk) => (
              <tr key={rk} className="border-b border-zinc-50">
                <td className="px-2 py-1 text-zinc-700 whitespace-nowrap">{rk}</td>
                {pyeongs.map((p) => {
                  const v = table[rk]?.[String(p)];
                  return <td key={p} className="px-2 py-1 text-right tabular-nums text-zinc-600">{v === undefined ? '—' : v}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

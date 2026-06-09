'use client';

/**
 * 자재마스터 관리자 — 리스트 페이지.
 *
 * 기능:
 *  - 자재 224개를 테이블로 표시
 *  - 대공종 / 등급 필터
 *  - brand / product_line / installer_spec 검색
 *  - 행 클릭 → 편집 페이지로 이동
 *  - "변경 사항 저장" — 편집한 자재들을 일괄 저장 (현재 페이지는 read-only, 편집은 상세 페이지)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Grade, Material, Property } from '@/lib/types';
import { buildQuote } from '@/lib/calculator';
import { defaultScope, defaultGrade } from '@/lib/defaults';
import { AdminGate } from '../AdminGate';
import { useAdminToken } from '../useAdminToken';

const GRADES: Grade[] = [
  '가성비 추천', '가성비',
  '표준 추천', '표준',
  '고급 추천', '고급',
  '단일등급',
];

export default function MaterialsAdminPage() {
  return (
    <AdminGate>
      <MaterialsList />
    </AdminGate>
  );
}

function MaterialsList() {
  const { token, hydrated, fetchWithAuth, setToken } = useAdminToken();
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 필터 state
  const [category, setCategory] = useState<string>('all');
  const [grade, setGrade] = useState<Grade | 'all'>('all');
  const [query, setQuery] = useState('');
  const [onlyMissingImage, setOnlyMissingImage] = useState(false);
  // 정렬 state
  type SortKey = 'default' | 'category' | 'grade' | 'work_type' | 'brand' | 'price' | 'image';
  type SortDir = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // 인라인 편집 state
  const [editMode, setEditMode] = useState(false);
  // material_id → 변경된 필드들 (등급/브랜드/제품명/자재비/인건비)
  const [drafts, setDrafts] = useState<Record<string, Partial<Material>>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  /** 셀의 표시값 — drafts 우선, 없으면 원본 */
  const getDraftValue = <K extends keyof Material>(m: Material, key: K): Material[K] => {
    const d = drafts[m.material_id];
    if (d && key in d) return d[key] as Material[K];
    return m[key];
  };

  /** 단일 셀 변경 */
  const updateDraft = <K extends keyof Material>(id: string, key: K, value: Material[K]) => {
    setDrafts((prev) => {
      const next = { ...prev };
      const cur = { ...(next[id] ?? {}) };
      // 원본과 같으면 dirty 에서 제거 (정확히 같은 값으로 되돌렸을 때)
      const original = materials?.find((m) => m.material_id === id);
      if (original && original[key] === value) {
        delete cur[key];
      } else {
        cur[key] = value;
      }
      if (Object.keys(cur).length === 0) {
        delete next[id];
      } else {
        next[id] = cur;
      }
      return next;
    });
  };

  const dirtyCount = Object.keys(drafts).length;

  /** drafts 적용 — total_unit_price 자동 재계산 */
  const applyDraftsToMaterials = (src: Material[]): Material[] => {
    return src.map((m) => {
      const d = drafts[m.material_id];
      if (!d) return m;
      const next = { ...m, ...d };
      const matP = next.material_price;
      const labP = next.labor_price;
      next.total_unit_price = matP + labP;
      return next;
    });
  };

  /** 일괄 저장 — 전체 materials 배열 PUT */
  const handleBulkSave = async () => {
    if (!materials || dirtyCount === 0) return;
    if (!confirm(`${dirtyCount}개 자재의 변경 사항을 저장하시겠어요?`)) return;
    setBulkSaving(true);
    try {
      const next = applyDraftsToMaterials(materials);
      const res = await fetchWithAuth('/api/admin/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: next }),
      });
      if (res.status === 401) { setToken(null); return; }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert('저장 실패: ' + (data.errors?.join('\n') || data.message || res.status));
        return;
      }
      setMaterials(next);
      setDrafts({});
      setEditMode(false);
      alert(`${dirtyCount}개 자재 저장 완료`);
    } catch (e) {
      alert('네트워크 오류: ' + String(e));
    } finally {
      setBulkSaving(false);
    }
  };

  /** 편집 취소 — 변경 모두 폐기 */
  const handleCancelEdit = () => {
    if (dirtyCount > 0 && !confirm(`${dirtyCount}개 자재의 변경을 모두 폐기하시겠어요?`)) return;
    setDrafts({});
    setEditMode(false);
  };

  // hydrate 완료 + 토큰 있을 때만 fetch (AdminGate 통과한 후)
  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth('/api/admin/materials');
        if (res.status === 401) {
          setToken(null);
          return;
        }
        if (!res.ok) throw new Error('GET failed: ' + res.status);
        const data = await res.json();
        if (cancelled) return;
        setMaterials(data.materials);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token]);

  /**
   * 24평 표준 견적의 sub_category → qty 매핑.
   * 각 자재의 24평 기준 예상 공사비 = qty × total_unit_price.
   * default scope 에서 해당 sub_category 가 OFF 면 qty=0.
   * materials 가 변경되면 자동 재계산 (자재 단가·등급 영향).
   *
   * SUB_CATEGORY_ALIAS — 계산기가 emit 하는 work_type 과 다르지만
   * 같은 면적/물량을 차지하는 대체 자재 sub_category 들:
   *   · 레거시 영문 (옛 스키마 work_type='flooring'/'wallpaper' → 한글 '마루'/'도배')
   *   · 같은 공종의 다른 자재 타입 (예: 바닥재의 '마루' vs '장판' — 면적 동일)
   * 새 alias 추가 시 이 표만 갱신.
   */
  const qtyByWorkType = useMemo(() => {
    const STD_PROPERTY: Property = {
      pyeong: 24, bay: 3, rooms: 3, common_bath: 1, master_bath: 1,
      balcony_depth_m: 1.5, region: 'gyeonggi', age: '15-30',
    };
    const SUB_CATEGORY_ALIAS: Record<string, string[]> = {
      // 마루 = wood flooring · 장판 = PVC sheet flooring · flooring = 옛 영문
      // 셋 다 바닥 마감재로 같은 면적 차지 → 동일 qty 적용
      '마루': ['flooring', '장판'],
      '도배': ['wallpaper'],
    };
    try {
      const q = buildQuote(STD_PROPERTY, defaultScope(), defaultGrade());
      const map = new Map<string, number>();
      for (const it of q.line_items) {
        const wt = it.work_type;
        map.set(wt, (map.get(wt) ?? 0) + it.qty);
        // alias 도 동일 qty 로 매핑 — 대체 자재·레거시 sub_category 호환
        for (const alias of SUB_CATEGORY_ALIAS[wt] ?? []) {
          map.set(alias, (map.get(alias) ?? 0) + it.qty);
        }
      }
      return map;
    } catch {
      return new Map<string, number>();
    }
  }, [materials]);

  const categories = useMemo(() => {
    if (!materials) return [];
    const set = new Set<string>();
    for (const m of materials) if (m.category) set.add(m.category);
    return Array.from(set).sort();
  }, [materials]);

  /** 단일 자재 삭제 — 전체 배열에서 제거하여 PUT */
  const handleDelete = async (id: string, label: string) => {
    if (!materials) return;
    if (!confirm(`자재 "${label}" (${id}) 를 삭제하시겠어요?\n복구 불가합니다.`)) return;
    const next = materials.filter((m) => m.material_id !== id);
    try {
      const res = await fetchWithAuth('/api/admin/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: next }),
      });
      if (res.status === 401) { setToken(null); return; }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert('삭제 실패: ' + (data.errors?.join('\n') || data.message || res.status));
        return;
      }
      setMaterials(next);
      if (data.mode === 'download_required' && data.json) {
        // Production: JSON 다운로드 유도
        const blob = new Blob([data.json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'materials.json'; a.click();
        URL.revokeObjectURL(url);
        alert('Production 환경: 변경된 materials.json 이 다운로드되었습니다. src/data/materials.json 에 교체 후 git commit 하세요.');
      }
    } catch (e) {
      alert('네트워크 오류: ' + String(e));
    }
  };

  const filtered = useMemo(() => {
    if (!materials) return [];
    const q = query.trim().toLowerCase();
    return materials.filter((m) => {
      if (category !== 'all' && m.category !== category) return false;
      if (grade !== 'all' && m.primary_grade !== grade) return false;
      if (onlyMissingImage && m.image_url) return false;
      if (q) {
        const hay = [
          m.material_id, m.sub_category, m.brand, m.product_line, m.installer_spec,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [materials, category, grade, query, onlyMissingImage]);

  // === 정렬 ===
  // 등급은 사용자 정의 순서: 가성비 추천 → 가성비 → 표준 추천 → 표준 → 고급 추천 → 고급 → 단일등급
  const GRADE_ORDER: Record<Grade, number> = {
    '가성비 추천': 0, '가성비': 1,
    '표준 추천': 2, '표준': 3,
    '고급 추천': 4, '고급': 5,
    '단일등급': 6,
  };
  const sorted = useMemo(() => {
    if (sortKey === 'default') return filtered;
    const arr = filtered.slice();
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'category':
          cmp = (a.category ?? '').localeCompare(b.category ?? '');
          break;
        case 'grade':
          cmp = (GRADE_ORDER[a.primary_grade] ?? 99) - (GRADE_ORDER[b.primary_grade] ?? 99);
          break;
        case 'work_type':
          cmp = a.sub_category.localeCompare(b.sub_category);
          break;
        case 'brand':
          cmp = (a.brand ?? '').localeCompare(b.brand ?? '')
            || (a.product_line ?? '').localeCompare(b.product_line ?? '');
          break;
        case 'price':
          cmp = a.total_unit_price - b.total_unit_price;
          break;
        case 'image':
          // 이미지 있는 것 먼저 (asc 기준)
          cmp = (a.image_url ? 1 : 0) - (b.image_url ? 1 : 0);
          break;
      }
      // 동률일 때 material_id로 안정 정렬
      if (cmp === 0) cmp = a.material_id.localeCompare(b.material_id);
      return cmp * dir;
    });
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir]);

  /** 헤더 클릭 시 정렬 토글: 같은 키 다시 클릭 → 방향 반전, 다른 키 클릭 → 그 키로 asc 시작 */
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (loading) {
    return <div className="px-6 py-12 text-center text-sm text-zinc-500">자재 데이터 불러오는 중…</div>;
  }
  if (err) {
    return <div className="px-6 py-12 text-center text-sm text-red-700">오류: {err}</div>;
  }
  if (!materials) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
      {/* 헤더 + 통계 */}
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">자재마스터</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            전체 {materials.length}개 · 필터 결과 {filtered.length}개 ·
            이미지 등록 {materials.filter((m) => m.image_url).length}개
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition"
              title="등급·브랜드·제품명·자재비·인건비를 행에서 직접 편집"
            >
              <span>✏ 일괄 편집 모드</span>
            </button>
          ) : (
            <>
              <span className="text-[11px] text-zinc-600 font-semibold">
                변경 {dirtyCount}건
              </span>
              <button
                onClick={handleBulkSave}
                disabled={bulkSaving || dirtyCount === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-xs font-bold transition"
              >
                {bulkSaving ? '⏳ 저장 중...' : '💾 저장'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={bulkSaving}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition"
              >
                취소
              </button>
            </>
          )}
          <Link
            href="/admin/materials/new"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
          >
            <span className="text-base leading-none">＋</span>
            <span>신규 자재 추가</span>
          </Link>
          <button
            onClick={() => { setToken(null); }}
            className="text-[11px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 필터 행 */}
      <div className="bg-white rounded-lg border border-zinc-200 p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">검색</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="브랜드 / 제품명 / spec / ID"
            className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">대공종</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="all">전체</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">등급</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as Grade | 'all')}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="all">전체</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-zinc-700 ml-1">
          <input
            type="checkbox"
            checked={onlyMissingImage}
            onChange={(e) => setOnlyMissingImage(e.target.checked)}
            className="w-4 h-4"
          />
          이미지 미등록만
        </label>
        <div className="ml-auto flex items-end gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">정렬</label>
            <select
              value={`${sortKey}|${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split('|') as [SortKey, SortDir];
                setSortKey(k);
                setSortDir(d);
              }}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="default|asc">기본 (등록 순)</option>
              <option value="category|asc">대공종 (가나다)</option>
              <option value="category|desc">대공종 (역순)</option>
              <option value="grade|asc">등급 (가성비 → 고급)</option>
              <option value="grade|desc">등급 (고급 → 가성비)</option>
              <option value="work_type|asc">세부공종 ↑</option>
              <option value="work_type|desc">세부공종 ↓</option>
              <option value="brand|asc">브랜드 ↑</option>
              <option value="brand|desc">브랜드 ↓</option>
              <option value="price|asc">단가 낮은 순</option>
              <option value="price|desc">단가 높은 순</option>
              <option value="image|desc">이미지 등록된 것 먼저</option>
              <option value="image|asc">이미지 미등록 먼저</option>
            </select>
          </div>
          {sortKey !== 'default' && (
            <button
              onClick={() => { setSortKey('default'); setSortDir('asc'); }}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2 pb-1.5"
              title="정렬 해제"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed min-w-[1110px]">
            {/* 명시적 컬럼 폭 — 1110px 기준으로 PC 한 화면에 모두 노출 (평당환산 컬럼 제거 후 -90px) */}
            <colgroup>
              <col className="w-[92px]" />   {/* ID */}
              <col className="w-[68px]" />   {/* 대공종 */}
              <col className="w-[90px]" />   {/* 세부공종 */}
              <col className="w-[96px]" />   {/* 등급 */}
              <col className="w-auto" />     {/* 브랜드/제품 — 남는 공간 흡수 */}
              <col className="w-[84px]" />   {/* 자재비 */}
              <col className="w-[84px]" />   {/* 인건비 */}
              <col className="w-[96px]" />   {/* 합계단가 */}
              <col className="w-[110px]" />  {/* 24평 공사비 */}
              <col className="w-[56px]" />   {/* 이미지 */}
              <col className="w-[96px]" />   {/* 액션 */}
            </colgroup>
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600">ID</th>
                <SortableTh label="대공종" sortKey="category" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="세부공종" sortKey="work_type" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="등급" sortKey="grade" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="브랜드 / 제품" sortKey="brand" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="px-3 py-2 text-right font-semibold text-zinc-600 whitespace-nowrap">자재비</th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-600 whitespace-nowrap">인건비</th>
                <SortableTh label="합계단가" sortKey="price" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <th className="px-3 py-2 text-right font-semibold text-zinc-600 whitespace-nowrap">24평 공사비</th>
                <SortableTh label="이미지" sortKey="image" current={sortKey} dir={sortDir} onClick={toggleSort} align="center" />
                <th className="px-3 py-2 text-right font-semibold text-zinc-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sorted.map((m) => {
                const isDirty = !!drafts[m.material_id];
                const vGrade = getDraftValue(m, 'primary_grade');
                const vBrand = getDraftValue(m, 'brand') ?? '';
                const vProd = getDraftValue(m, 'product_line') ?? '';
                const vMat = getDraftValue(m, 'material_price');
                const vLab = getDraftValue(m, 'labor_price');
                const vTotal = (typeof vMat === 'number' && typeof vLab === 'number') ? vMat + vLab : m.total_unit_price;
                // 샷시(window) 는 평형/베이/등급 룩업 기반 — 단가 셀 입력 차단 + '룩업' 배지로 대체
                const isLookupPricing = m.sub_category === 'window';
                // 평형별 고정가 — 단가가 평형대별 표에 있어 리스트의 단일 단가 셀로 표현 불가 (편집 화면에서 입력)
                const isBandPricing = m.unit_type === 'per_pyeong_band';
                const isSpecialPricing = isLookupPricing || isBandPricing;
                return (
                <tr key={m.material_id} className={isDirty ? 'bg-amber-50/60' : 'hover:bg-blue-50/30'}>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                    {isDirty && <span className="text-amber-700 mr-1" title="저장 안 된 변경">●</span>}
                    {m.material_id}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">{m.category ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-700">{m.sub_category}</td>
                  <td className="px-3 py-2">
                    {editMode ? (
                      <select
                        value={vGrade}
                        onChange={(e) => updateDraft(m.material_id, 'primary_grade', e.target.value as Grade)}
                        className="text-[11px] border border-zinc-300 rounded px-1 py-0.5 bg-white w-full min-w-0"
                      >
                        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        <GradeBadge grade={m.primary_grade} />
                        {m.grade_groups && m.grade_groups.length > 0 && (
                          <span className="text-[9px] text-blue-700 font-semibold whitespace-nowrap" title="추가 적용 등급">
                            +{m.grade_groups.join('·')}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 min-w-0">
                    {editMode ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={vBrand}
                          onChange={(e) => updateDraft(m.material_id, 'brand', e.target.value || null)}
                          placeholder="브랜드"
                          className="text-[11px] border border-zinc-300 rounded px-1.5 py-0.5 bg-white w-full min-w-0"
                        />
                        <input
                          type="text"
                          value={vProd}
                          onChange={(e) => updateDraft(m.material_id, 'product_line', e.target.value || null)}
                          placeholder="제품명"
                          className="text-[11px] border border-zinc-300 rounded px-1.5 py-0.5 bg-white w-full min-w-0"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="font-semibold text-zinc-900 truncate">{m.brand} {m.product_line}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{m.installer_spec}</div>
                      </>
                    )}
                  </td>
                  {isSpecialPricing ? (
                    // 샷시(룩업)·평형별 고정가 — 단가 3셀(자재비/인건비/합계+24평)을 배지로 통합
                    <>
                      <td className="px-3 py-2 text-right text-zinc-300">—</td>
                      <td className="px-3 py-2 text-right text-zinc-300">—</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100" colSpan={2}>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold"
                          title={isBandPricing ? '평형대별 고정가 표 기반 — 편집 화면에서 구간별 단가 입력' : '평형/베이/등급 룩업 표 기반 (src/lib/window-cost.ts)'}
                        >
                          <span aria-hidden>ⓘ</span>
                          {isBandPricing ? '평형별 고정가' : '평형/베이/등급 룩업'}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-600">
                        {editMode ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={vMat === 0 ? '' : vMat}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateDraft(m.material_id, 'material_price', v === '' ? 0 : Number(v));
                            }}
                            placeholder="0"
                            className="text-[11px] border border-zinc-300 rounded px-1 py-0.5 bg-white w-full min-w-0 text-right tabular-nums"
                          />
                        ) : (
                          m.material_price.toLocaleString('ko-KR')
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-600">
                        {editMode ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={vLab === 0 ? '' : vLab}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateDraft(m.material_id, 'labor_price', v === '' ? 0 : Number(v));
                            }}
                            placeholder="0"
                            className="text-[11px] border border-zinc-300 rounded px-1 py-0.5 bg-white w-full min-w-0 text-right tabular-nums"
                          />
                        ) : (
                          m.labor_price.toLocaleString('ko-KR')
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-900 font-bold border-l border-zinc-100">
                        {vTotal.toLocaleString('ko-KR')}
                      </td>
                      {/* 24평 공사비 = sub_category 의 24평 표준 qty × 합계단가
                         (qtyByWorkType 는 영문 alias 도 매핑 — 레거시 sub_category 자재 호환) */}
                      {(() => {
                        const qty = qtyByWorkType.get(m.sub_category) ?? 0;
                        const total24 = Math.round(qty * vTotal);
                        return (
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-blue-700 font-semibold whitespace-nowrap">
                            {qty > 0 ? total24.toLocaleString('ko-KR') : <span className="text-zinc-300">—</span>}
                          </td>
                        );
                      })()}
                    </>
                  )}
                  <td className="px-3 py-2 text-center">
                    {m.image_url
                      ? <span className="text-emerald-600 font-bold">✓</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/materials/${encodeURIComponent(m.material_id)}`}
                      className="inline-block px-2.5 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[10px]"
                    >
                      편집
                    </Link>
                    <button
                      onClick={() => handleDelete(m.material_id, `${m.brand ?? ''} ${m.product_line ?? ''}`.trim())}
                      className="ml-1 inline-block px-2 py-1 rounded border border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold text-[10px]"
                      title="이 자재 삭제"
                      disabled={editMode}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-zinc-400 italic">
                    필터에 매치되는 자재가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortableTh({
  label, sortKey, current, dir, onClick, align = 'left',
}: {
  label: string;
  sortKey: 'category' | 'grade' | 'work_type' | 'brand' | 'price' | 'image';
  current: string;
  dir: 'asc' | 'desc';
  onClick: (key: 'category' | 'grade' | 'work_type' | 'brand' | 'price' | 'image') => void;
  align?: 'left' | 'right' | 'center';
}) {
  const active = current === sortKey;
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`px-3 py-2 ${alignCls} font-semibold text-zinc-600 cursor-pointer select-none hover:bg-zinc-100 transition`}
      onClick={() => onClick(sortKey)}
      title={active ? `정렬: ${label} (${dir === 'asc' ? '오름차순' : '내림차순'})` : `${label} 기준 정렬`}
    >
      <span className={`inline-flex items-center gap-0.5 ${active ? 'text-blue-700' : ''}`}>
        {label}
        <span className={`text-[10px] ${active ? 'opacity-100' : 'opacity-30'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '▾'}
        </span>
      </span>
    </th>
  );
}

function GradeBadge({ grade }: { grade: Grade }) {
  // 그룹별 색 + "추천" 자재는 별 표시
  const isRecommended = grade === '가성비 추천' || grade === '표준 추천' || grade === '고급 추천';
  const color =
    grade === '가성비 추천' || grade === '가성비' ? 'bg-emerald-100 text-emerald-700' :
    grade === '표준 추천' || grade === '표준' ? 'bg-blue-100 text-blue-700' :
    grade === '고급 추천' || grade === '고급' ? 'bg-amber-100 text-amber-700' :
    'bg-zinc-100 text-zinc-700';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>
      {isRecommended && <span className="text-[9px]">★</span>}
      <span>{grade}</span>
    </span>
  );
}

'use client';

/**
 * 자재마스터 관리자 — 리스트 페이지.
 *
 * 기능:
 *  - 자재 224개를 테이블로 표시
 *  - 카테고리 / 등급 필터
 *  - brand / product_line / installer_spec 검색
 *  - 행 클릭 → 편집 페이지로 이동
 *  - "변경 사항 저장" — 편집한 자재들을 일괄 저장 (현재 페이지는 read-only, 편집은 상세 페이지)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Grade, Material } from '@/lib/types';
import { AdminGate } from '../AdminGate';
import { useAdminToken } from '../useAdminToken';

const GRADES: Grade[] = ['가성비', '표준', '고급', '단일등급'];

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
          m.material_id, m.work_type, m.brand, m.product_line, m.installer_spec, m.sub_category,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [materials, category, grade, query, onlyMissingImage]);

  // === 정렬 ===
  // 등급은 사용자 정의 순서: 가성비 → 표준 → 고급 → 단일등급
  const GRADE_ORDER: Record<Grade, number> = {
    '가성비': 0, '표준': 1, '고급': 2, '단일등급': 3,
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
          cmp = a.work_type.localeCompare(b.work_type);
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
        <div className="flex items-center gap-2">
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
          <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">카테고리</label>
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
              <option value="category|asc">카테고리 (가나다)</option>
              <option value="category|desc">카테고리 (역순)</option>
              <option value="grade|asc">등급 (가성비 → 고급)</option>
              <option value="grade|desc">등급 (고급 → 가성비)</option>
              <option value="work_type|asc">공종명 ↑</option>
              <option value="work_type|desc">공종명 ↓</option>
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
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600">ID</th>
                <SortableTh label="카테고리" sortKey="category" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="공종" sortKey="work_type" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="브랜드 / 제품" sortKey="brand" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="등급" sortKey="grade" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh label="합계 단가" sortKey="price" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <SortableTh label="이미지" sortKey="image" current={sortKey} dir={sortDir} onClick={toggleSort} align="center" />
                <th className="px-3 py-2 text-right font-semibold text-zinc-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sorted.map((m) => (
                <tr key={m.material_id} className="hover:bg-blue-50/30">
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{m.material_id}</td>
                  <td className="px-3 py-2 text-zinc-700">{m.category ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-700">{m.work_type}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-zinc-900">{m.brand} {m.product_line}</div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-md">{m.installer_spec}</div>
                  </td>
                  <td className="px-3 py-2">
                    <GradeBadge
                      grade={m.primary_grade}
                      isPrimary={(m.tags ?? []).includes('주력')}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-900">
                    {m.total_unit_price.toLocaleString('ko-KR')}
                  </td>
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
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-zinc-400 italic">
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

function GradeBadge({ grade, isPrimary }: { grade: Grade; isPrimary: boolean }) {
  const color =
    grade === '가성비' ? 'bg-emerald-100 text-emerald-700' :
    grade === '표준' ? 'bg-blue-100 text-blue-700' :
    grade === '고급' ? 'bg-amber-100 text-amber-700' :
    'bg-zinc-100 text-zinc-700';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>
      <span>{grade}</span>
      {isPrimary && (
        <span className="text-[9px] font-extrabold opacity-90">★ 추천</span>
      )}
    </span>
  );
}

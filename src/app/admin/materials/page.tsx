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
  const { fetchWithAuth, setToken } = useAdminToken();
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 필터 state
  const [category, setCategory] = useState<string>('all');
  const [grade, setGrade] = useState<Grade | 'all'>('all');
  const [query, setQuery] = useState('');
  const [onlyMissingImage, setOnlyMissingImage] = useState(false);

  useEffect(() => {
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
  }, []);

  const categories = useMemo(() => {
    if (!materials) return [];
    const set = new Set<string>();
    for (const m of materials) if (m.category) set.add(m.category);
    return Array.from(set).sort();
  }, [materials]);

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
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600">ID</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600">카테고리</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600">공종</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600">브랜드 / 제품</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600">등급</th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-600">합계 단가</th>
                <th className="px-3 py-2 text-center font-semibold text-zinc-600">이미지</th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((m) => (
                <tr key={m.material_id} className="hover:bg-blue-50/30">
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{m.material_id}</td>
                  <td className="px-3 py-2 text-zinc-700">{m.category ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-700">{m.work_type}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-zinc-900">{m.brand} {m.product_line}</div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-md">{m.installer_spec}</div>
                  </td>
                  <td className="px-3 py-2">
                    <GradeBadge grade={m.primary_grade} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-900">
                    {m.total_unit_price.toLocaleString('ko-KR')}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {m.image_url
                      ? <span className="text-emerald-600 font-bold">✓</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/materials/${encodeURIComponent(m.material_id)}`}
                      className="inline-block px-2.5 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[10px]"
                    >
                      편집
                    </Link>
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

function GradeBadge({ grade }: { grade: Grade }) {
  const color =
    grade === '가성비' ? 'bg-emerald-100 text-emerald-700' :
    grade === '표준' ? 'bg-blue-100 text-blue-700' :
    grade === '고급' ? 'bg-amber-100 text-amber-700' :
    'bg-zinc-100 text-zinc-700';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>
      {grade}
    </span>
  );
}

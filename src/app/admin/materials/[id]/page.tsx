'use client';

/**
 * 자재마스터 관리자 — 단일 자재 편집 페이지.
 *
 * URL: /admin/materials/[material_id]
 *
 * 동작:
 *  - 마운트 시 GET /api/admin/materials 로 전체 자재 로드 → 해당 ID 찾기
 *  - 폼 편집
 *  - 저장 시 그 자재만 교체한 새 전체 배열을 PUT
 *  - 응답이 mode: 'file_written' 이면 즉시 적용 안내
 *  - mode: 'download_required' 이면 JSON 다운로드 버튼 노출
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Grade, Material } from '@/lib/types';
import { normalizeImageUrl } from '@/lib/image-utils';
import { AdminGate } from '../../AdminGate';
import { useAdminToken } from '../../useAdminToken';

const GRADES: Grade[] = ['가성비', '표준', '고급', '단일등급'];

export default function MaterialEditPage() {
  // client page에서 dynamic param은 useParams hook으로 — use(params)는 Suspense를 throw해서
  // 가까운 boundary가 없으면 not-found 페이지로 fallback되는 버그가 있어 우회.
  const params = useParams();
  const id = decodeURIComponent(String(params?.id ?? ''));
  return (
    <AdminGate>
      <MaterialEditor materialId={id} />
    </AdminGate>
  );
}

function MaterialEditor({ materialId }: { materialId: string }) {
  const { token, hydrated, fetchWithAuth, setToken } = useAdminToken();
  const [allMaterials, setAllMaterials] = useState<Material[] | null>(null);
  const [draft, setDraft] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    mode: 'file_written' | 'download_required';
    message: string;
    json?: string;
  } | null>(null);

  // hydrate 완료 + 토큰 있을 때만 fetch
  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth('/api/admin/materials');
        if (res.status === 401) { setToken(null); return; }
        if (!res.ok) throw new Error('GET failed: ' + res.status);
        const data = await res.json();
        if (cancelled) return;
        setAllMaterials(data.materials);
        const found = (data.materials as Material[]).find((m) => m.material_id === materialId);
        if (!found) {
          setErr(`material_id "${materialId}" 를 찾을 수 없습니다.`);
        } else {
          setDraft({ ...found });
        }
      } catch (e) {
        if (!cancelled) setErr(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, hydrated, token]);

  // 기존 카테고리 목록 — datalist 자동완성용 (조기 return 전에 호출되어야 hook 순서 보존)
  const categoryOptions = useMemo(() => {
    if (!allMaterials) return [];
    const set = new Set<string>();
    for (const m of allMaterials) if (m.category) set.add(m.category);
    return Array.from(set).sort();
  }, [allMaterials]);

  if (loading) {
    return <div className="px-6 py-12 text-center text-sm text-zinc-500">자재 데이터 불러오는 중…</div>;
  }
  if (err) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{err}</div>
        <Link href="/admin/materials" className="mt-4 inline-block text-blue-700 text-sm hover:underline">← 자재 목록으로</Link>
      </div>
    );
  }
  if (!draft || !allMaterials) return null;

  // total = material + labor 자동 동기화
  const updateField = <K extends keyof Material>(k: K, v: Material[K]) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [k]: v };
      // 가격 필드 변경 시 total 자동 재계산
      if (k === 'material_price' || k === 'labor_price') {
        next.total_unit_price = (Number(next.material_price) || 0) + (Number(next.labor_price) || 0);
      }
      return next;
    });
    setSaveResult(null);
  };

  const handleSave = async () => {
    if (!draft || !allMaterials || saving) return;
    setSaving(true);
    setSaveResult(null);
    try {
      // 전체 배열에서 해당 자재만 교체
      const updated = allMaterials.map((m) => m.material_id === draft.material_id ? draft : m);
      const res = await fetchWithAuth('/api/admin/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: updated }),
      });
      if (res.status === 401) { setToken(null); return; }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const errMsg = data.errors?.join('\n') || data.message || '저장 실패';
        setErr(errMsg);
        return;
      }
      setSaveResult({
        mode: data.mode,
        message: data.message,
        json: data.json,
      });
      setAllMaterials(updated);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  };

  const downloadJson = () => {
    if (!saveResult?.json) return;
    const blob = new Blob([saveResult.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'materials.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 이 자재 삭제 — 전체 배열에서 제거 후 PUT → 리스트로 이동 */
  const handleDelete = async () => {
    if (!draft || !allMaterials) return;
    if (!confirm(`자재 "${draft.brand} ${draft.product_line}" (${draft.material_id}) 를 삭제하시겠어요?\n복구 불가합니다.`)) return;
    try {
      const next = allMaterials.filter((m) => m.material_id !== draft.material_id);
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
      if (data.mode === 'download_required' && data.json) {
        const blob = new Blob([data.json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'materials.json'; a.click();
        URL.revokeObjectURL(url);
        alert('Production 환경: 변경된 materials.json 이 다운로드되었습니다. src/data/materials.json 에 교체 후 git commit 하세요.');
      }
      // 리스트로 이동
      window.location.href = '/admin/materials';
    } catch (e) {
      alert('네트워크 오류: ' + String(e));
    }
  };

  const previewImageUrl = normalizeImageUrl(draft.image_url, 600);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
      {/* 상단 nav */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/admin/materials" className="text-xs text-zinc-500 hover:text-blue-700">← 자재 목록</Link>
          <span className="text-zinc-300">/</span>
          <span className="font-mono text-xs text-zinc-700">{draft.material_id}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 font-semibold text-sm transition"
          >
            🗑 삭제
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition disabled:opacity-50"
          >
            {saving ? '저장 중…' : '💾 저장'}
          </button>
        </div>
      </div>

      {/* 저장 결과 알림 */}
      {saveResult && (
        <div className={`mb-4 rounded-lg p-4 border ${
          saveResult.mode === 'file_written'
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`text-sm font-bold mb-1 ${
            saveResult.mode === 'file_written' ? 'text-emerald-900' : 'text-amber-900'
          }`}>
            {saveResult.mode === 'file_written' ? '✓ 파일 저장 완료' : '⚠ JSON 다운로드 필요'}
          </div>
          <div className="text-xs text-zinc-700 leading-relaxed">{saveResult.message}</div>
          {saveResult.mode === 'download_required' && saveResult.json && (
            <button
              onClick={downloadJson}
              className="mt-2 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              materials.json 다운로드
            </button>
          )}
        </div>
      )}

      {/* 폼 */}
      <div className="bg-white rounded-lg border border-zinc-200 p-5 sm:p-6 space-y-5">
        {/* 기본 정보 */}
        <FieldGroup title="기본 정보">
          <Field label="material_id (변경 금지)">
            <input value={draft.material_id} readOnly className="input bg-zinc-50 font-mono text-xs" />
          </Field>
          <Field label="work_type">
            <input value={draft.work_type} onChange={(e) => updateField('work_type', e.target.value)} className="input font-mono" />
          </Field>
          <Field label="카테고리">
            <input
              value={draft.category ?? ''}
              onChange={(e) => updateField('category', e.target.value || null)}
              className="input"
              list="category-options"
              placeholder="기존 카테고리 선택 또는 새로 입력"
            />
            <datalist id="category-options">
              {categoryOptions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="서브 카테고리">
            <input value={draft.sub_category ?? ''} onChange={(e) => updateField('sub_category', e.target.value || null)} className="input" />
          </Field>
        </FieldGroup>

        {/* 자재 정보 */}
        <FieldGroup title="자재 정보">
          <Field label="브랜드">
            <input value={draft.brand ?? ''} onChange={(e) => updateField('brand', e.target.value || null)} className="input" />
          </Field>
          <Field label="제품 라인">
            <input value={draft.product_line ?? ''} onChange={(e) => updateField('product_line', e.target.value || null)} className="input" />
          </Field>
          <Field label="installer_spec (시공자용 풀스펙)" full>
            <textarea
              value={draft.installer_spec ?? ''}
              onChange={(e) => updateField('installer_spec', e.target.value || null)}
              rows={2}
              className="input resize-y"
            />
          </Field>
          <Field label="tags (콤마 구분)">
            <input
              value={draft.tags.join(', ')}
              onChange={(e) => updateField('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
              className="input"
              placeholder="표준, 주력"
            />
          </Field>
        </FieldGroup>

        {/* 단가 */}
        <FieldGroup title="단가">
          <Field label="단위">
            <select value={draft.unit_type} onChange={(e) => updateField('unit_type', e.target.value)} className="input">
              <option value="per_m2">per_m2 (㎡)</option>
              <option value="per_m">per_m (m)</option>
              <option value="per_ea">per_ea (개)</option>
              <option value="per_set">per_set (세트)</option>
            </select>
          </Field>
          <Field label="등급">
            <select value={draft.primary_grade} onChange={(e) => updateField('primary_grade', e.target.value as Grade)} className="input">
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="자재가 (₩)">
            <input type="number" value={draft.material_price} onChange={(e) => updateField('material_price', Number(e.target.value))} className="input text-right tabular-nums" />
          </Field>
          <Field label="시공비 (₩)">
            <input type="number" value={draft.labor_price} onChange={(e) => updateField('labor_price', Number(e.target.value))} className="input text-right tabular-nums" />
          </Field>
          <Field label="합계 (자동 계산)" full>
            <input value={draft.total_unit_price.toLocaleString('ko-KR') + ' 원'} readOnly className="input bg-zinc-50 text-right tabular-nums font-bold" />
          </Field>
        </FieldGroup>

        {/* 키 */}
        <FieldGroup title="lookup (자동 생성 가능)">
          <Field label="lookup_key">
            <input value={draft.lookup_key ?? ''} onChange={(e) => updateField('lookup_key', e.target.value || null)} className="input font-mono text-xs" placeholder="예: flooring|표준" />
          </Field>
          <Field label="secondary_key">
            <input value={draft.secondary_key ?? ''} onChange={(e) => updateField('secondary_key', e.target.value || null)} className="input font-mono text-xs" placeholder="예: 강마루|표준" />
          </Field>
        </FieldGroup>

        {/* 외부 링크 */}
        <FieldGroup title="외부 링크">
          <Field label="제조사 페이지 URL (자재 카드의 ↗ 버튼이 새 창으로 엶)" full>
            <input
              type="url"
              value={draft.vendor_url ?? ''}
              onChange={(e) => updateField('vendor_url', e.target.value || null)}
              className="input"
              placeholder="https://www.lxhausys.com/kr/product/floor/..."
            />
          </Field>
        </FieldGroup>

        {/* 이미지 */}
        <FieldGroup title="이미지">
          <Field label="image_url (구글 드라이브 공유 링크 또는 일반 URL)" full>
            <input
              value={draft.image_url ?? ''}
              onChange={(e) => updateField('image_url', e.target.value || undefined)}
              className="input"
              placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
            />
            <p className="mt-1 text-[10px] text-zinc-500 leading-relaxed">
              구글 드라이브 공유 링크 그대로 붙여넣어도 자동 변환됩니다.
              {previewImageUrl && (
                <>
                  <br />
                  정규화 URL: <span className="font-mono text-[10px] break-all">{previewImageUrl}</span>
                </>
              )}
            </p>
          </Field>
          {/* 이미지 미리보기 */}
          {previewImageUrl ? (
            <div className="sm:col-span-2 rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50">
              <div className="aspect-[4/3] max-w-md mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImageUrl}
                  alt={draft.brand + ' ' + draft.product_line}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="sm:col-span-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center text-xs text-zinc-400">
              이미지 URL을 입력하면 여기에 미리보기가 표시됩니다.
            </div>
          )}
        </FieldGroup>
      </div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 border-b border-zinc-100 pb-1">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, full = false, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wide">{label}</span>
      {children}
    </label>
  );
}

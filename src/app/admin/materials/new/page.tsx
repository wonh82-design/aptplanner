'use client';

/**
 * 자재마스터 관리자 — 신규 자재 추가 페이지.
 *
 * URL: /admin/materials/new
 *
 * 동작:
 *  - 빈 폼 + material_id 자동 생성 (MAT-{XX}-{NNN}, 운영자 수정 가능)
 *  - 카테고리는 기존 자재 목록에서 datalist 자동완성
 *  - 저장 시 전체 배열에 추가하여 PUT
 *  - 성공 시 편집 페이지로 리다이렉트
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Grade, Material } from '@/lib/types';
import { normalizeImageUrl } from '@/lib/image-utils';
import { AdminGate } from '../../AdminGate';
import { useAdminToken } from '../../useAdminToken';
import { ImageUploadField } from '../../ImageUploadField';

const GRADES: Grade[] = [
  '가성비 추천', '가성비',
  '표준 추천', '표준',
  '고급 추천', '고급',
  '단일등급',
];

export default function NewMaterialPage() {
  return (
    <AdminGate>
      <NewMaterialForm />
    </AdminGate>
  );
}

/** 기존 material_id 중 같은 prefix 그룹의 최대 번호 + 1 — 충돌 방지 자동 생성 */
function generateNextId(materials: Material[], prefix: string): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let maxNum = 0;
  for (const m of materials) {
    const match = m.material_id.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

function NewMaterialForm() {
  const router = useRouter();
  const { token, hydrated, fetchWithAuth, setToken } = useAdminToken();
  const [allMaterials, setAllMaterials] = useState<Material[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    mode: 'db_saved' | 'file_written' | 'download_required';
    message: string;
    json?: string;
  } | null>(null);

  const [draft, setDraft] = useState<Material>({
    material_id: 'MAT-NEW-001',
    work_type: '',
    category: null,
    sub_category: null,
    brand: null,
    product_line: null,
    installer_spec: null,
    unit_type: 'per_m2',
    material_price: 0,
    labor_price: 0,
    total_unit_price: 0,
    primary_grade: '표준',
  });

  // 기존 자재 로드 → material_id 자동 생성 + 카테고리 옵션
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
        setAllMaterials(data.materials as Material[]);
        // 기본 ID: MAT-NEW-{N} — 사용자가 수정 가능
        setDraft((prev) => ({
          ...prev,
          material_id: generateNextId(data.materials, 'MAT-NEW'),
        }));
      } catch (e) {
        if (!cancelled) setErr(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token]);

  const updateField = <K extends keyof Material>(k: K, v: Material[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'material_price' || k === 'labor_price') {
        next.total_unit_price = (Number(next.material_price) || 0) + (Number(next.labor_price) || 0);
      }
      return next;
    });
    setSaveResult(null);
  };

  const categoryOptions = useMemo(() => {
    if (!allMaterials) return [];
    const set = new Set<string>();
    for (const m of allMaterials) if (m.category) set.add(m.category);
    return Array.from(set).sort();
  }, [allMaterials]);

  const workTypeOptions = useMemo(() => {
    if (!allMaterials) return [];
    const set = new Set<string>();
    for (const m of allMaterials) if (m.work_type) set.add(m.work_type);
    return Array.from(set).sort();
  }, [allMaterials]);

  const handleSave = async () => {
    if (!allMaterials || saving) return;
    // 기본 검증
    if (!draft.material_id.trim()) { alert('material_id 입력 필요'); return; }
    if (allMaterials.some((m) => m.material_id === draft.material_id)) {
      alert(`material_id "${draft.material_id}" 중복. 다른 ID로 변경하세요.`);
      return;
    }
    if (!draft.work_type.trim()) { alert('work_type 입력 필요'); return; }

    setSaving(true);
    setSaveResult(null);
    try {
      const next = [...allMaterials, draft];
      const res = await fetchWithAuth('/api/admin/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: next }),
      });
      if (res.status === 401) { setToken(null); return; }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.errors?.join('\n') || data.message || '저장 실패');
        return;
      }
      setSaveResult({ mode: data.mode, message: data.message, json: data.json });
      // dev 환경: 편집 페이지로 즉시 이동
      if (data.mode === 'file_written') {
        setTimeout(() => router.push(`/admin/materials/${encodeURIComponent(draft.material_id)}`), 800);
      }
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
    a.href = url; a.download = 'materials.json'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="px-6 py-12 text-center text-sm text-zinc-500">기존 자재 로드 중…</div>;
  if (err) return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 whitespace-pre-wrap">{err}</div>
      <Link href="/admin/materials" className="mt-4 inline-block text-blue-700 text-sm hover:underline">← 자재 목록으로</Link>
    </div>
  );

  const previewImageUrl = normalizeImageUrl(draft.image_url, 600);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
      {/* 상단 nav */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/admin/materials" className="text-xs text-zinc-500 hover:text-blue-700">← 자재 목록</Link>
          <span className="text-zinc-300">/</span>
          <span className="text-xs font-bold text-blue-700">신규 자재</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition disabled:opacity-50"
        >
          {saving ? '저장 중…' : '＋ 자재 추가'}
        </button>
      </div>

      {/* 저장 결과 */}
      {saveResult && (() => {
        const isSuccess = saveResult.mode === 'db_saved' || saveResult.mode === 'file_written';
        const title =
          saveResult.mode === 'db_saved' ? '✓ DB 저장 완료 (즉시 반영)' :
          saveResult.mode === 'file_written' ? '✓ 자재 추가 완료' :
          '⚠ JSON 다운로드 필요';
        return (
          <div className={`mb-4 rounded-lg p-4 border ${
            isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`text-sm font-bold mb-1 ${isSuccess ? 'text-emerald-900' : 'text-amber-900'}`}>
              {title}
            </div>
            <div className="text-xs text-zinc-700">{saveResult.message}</div>
            {saveResult.mode === 'download_required' && saveResult.json && (
              <button
                onClick={downloadJson}
                className="mt-2 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                materials.json 다운로드
              </button>
            )}
          </div>
        );
      })()}

      <div className="bg-white rounded-lg border border-zinc-200 p-5 sm:p-6 space-y-5">
        <FieldGroup title="기본 정보">
          <Field label="material_id (충돌 시 변경)">
            <input value={draft.material_id} onChange={(e) => updateField('material_id', e.target.value)} className="input font-mono text-xs" />
          </Field>
          <Field label="work_type">
            <input
              value={draft.work_type}
              onChange={(e) => updateField('work_type', e.target.value)}
              className="input font-mono"
              list="work-type-options"
              placeholder="예: flooring, wallpaper, kitchen_top"
            />
            <datalist id="work-type-options">
              {workTypeOptions.map((w) => <option key={w} value={w} />)}
            </datalist>
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
            <input value={draft.sub_category ?? ''} onChange={(e) => updateField('sub_category', e.target.value || null)} className="input" placeholder="예: 강마루, 합지" />
          </Field>
        </FieldGroup>

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
        </FieldGroup>

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

        <FieldGroup title="이미지">
          <div className="sm:col-span-2">
            <ImageUploadField
              value={draft.image_url ?? null}
              onChange={(next) => updateField('image_url', next ?? undefined)}
              materialId={draft.material_id}
              token={token}
              onUnauthorized={() => setToken(null)}
            />
            <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">
              📤 파일 업로드 (권장) 또는 외부 URL 직접 입력. 업로드한 파일은 Vercel Blob 에 저장됩니다.
            </p>
          </div>
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

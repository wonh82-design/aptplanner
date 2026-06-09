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
 *  - 응답 mode 별 UI:
 *    · 'db_saved'         → Neon DB upsert 성공 (즉시 운영 반영, 가장 일반적인 케이스)
 *    · 'file_written'     → DB 미설정 dev 환경 — 로컬 JSON 파일 갱신
 *    · 'download_required'→ DB 미설정 prod 환경 — JSON 다운로드 버튼 노출
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Grade, Material, PyeongBandKey, PyeongBandPrice } from '@/lib/types';
import { PYEONG_BANDS } from '@/lib/types';
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
    mode: 'db_saved' | 'file_written' | 'download_required';
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

  /** 5구간 0원 초기 밴드 */
  const emptyBands = (): Partial<Record<PyeongBandKey, PyeongBandPrice>> => {
    const out: Partial<Record<PyeongBandKey, PyeongBandPrice>> = {};
    for (const b of PYEONG_BANDS) out[b.key] = { material_price: 0, labor_price: 0, total_unit_price: 0 };
    return out;
  };

  /**
   * 단위 변경. '평형별 고정가'로 바꾸면 top-level 단가를 0으로 비우고 5구간을 초기화,
   * 다른 단위로 되돌리면 평형별 입력을 감춘다(밴드 데이터 자체는 보존).
   */
  const setUnitType = (next: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      if (next === 'per_pyeong_band') {
        return {
          ...prev,
          unit_type: next,
          material_price: 0,
          labor_price: 0,
          total_unit_price: 0,
          pyeong_band_prices: prev.pyeong_band_prices ?? emptyBands(),
        };
      }
      return { ...prev, unit_type: next };
    });
    setSaveResult(null);
  };

  /** 평형별 고정가 한 구간의 자재비/인건비 변경 — 해당 구간 합계 자동 재계산 */
  const updateBand = (key: PyeongBandKey, field: 'material_price' | 'labor_price', value: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const bands = { ...(prev.pyeong_band_prices ?? emptyBands()) };
      const cur = bands[key] ?? { material_price: 0, labor_price: 0, total_unit_price: 0 };
      const nextBand = { ...cur, [field]: value };
      nextBand.total_unit_price = (Number(nextBand.material_price) || 0) + (Number(nextBand.labor_price) || 0);
      bands[key] = nextBand;
      return { ...prev, pyeong_band_prices: bands };
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
      {saveResult && (() => {
        const isSuccess = saveResult.mode === 'db_saved' || saveResult.mode === 'file_written';
        const title =
          saveResult.mode === 'db_saved' ? '✓ DB 저장 완료 (즉시 반영)' :
          saveResult.mode === 'file_written' ? '✓ 파일 저장 완료' :
          '⚠ JSON 다운로드 필요';
        return (
          <div className={`mb-4 rounded-lg p-4 border ${
            isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`text-sm font-bold mb-1 ${isSuccess ? 'text-emerald-900' : 'text-amber-900'}`}>
              {title}
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
        );
      })()}

      {/* 폼 */}
      <div className="bg-white rounded-lg border border-zinc-200 p-5 sm:p-6 space-y-5">
        {/* 기본 정보 */}
        <FieldGroup title="기본 정보">
          <Field label="material_id (변경 금지)">
            <input value={draft.material_id} readOnly className="input bg-zinc-50 font-mono text-xs" />
          </Field>
          <Field label="세부공종">
            <input value={draft.sub_category} onChange={(e) => updateField('sub_category', e.target.value)} className="input font-mono" />
          </Field>
          <Field label="대공종">
            <input
              value={draft.category ?? ''}
              onChange={(e) => updateField('category', e.target.value || null)}
              className="input"
              list="category-options"
              placeholder="기존 대공종 선택 또는 새로 입력"
            />
            <datalist id="category-options">
              {categoryOptions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
        </FieldGroup>

        {/* 자재 정보 — 등급을 브랜드 왼쪽에 배치 */}
        <FieldGroup title="자재 정보">
          <Field label="등급">
            <select value={draft.primary_grade} onChange={(e) => updateField('primary_grade', e.target.value as Grade)} className="input">
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
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

        {/* 단가 — 샷시(window)는 룩업 표 기반이라 입력 영역 숨김 */}
        {draft.sub_category === 'window' ? (
          <FieldGroup title="단가">
            <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
              <div className="text-xs font-bold text-amber-900 mb-1">
                ⓘ 평형/베이/등급 룩업 기반 — 단가 입력 불가
              </div>
              <div className="text-[11px] text-amber-800 leading-relaxed">
                샷시 공사비는 자재 단가가 아닌 <strong>우리집 평형·베이·등급 룩업 표</strong>에서 산출됩니다.
                (소스: <code className="text-[10px] bg-white/60 px-1 rounded">src/lib/window-cost.ts</code>)<br />
                여기서 단가를 입력해도 계산기는 무시합니다. 단가 표 자체를 바꾸려면 코드 수정이 필요해요.
              </div>
            </div>
          </FieldGroup>
        ) : (
          <FieldGroup title="단가">
            <Field label="단가 구분 (단위)" full>
              <select value={draft.unit_type} onChange={(e) => setUnitType(e.target.value)} className="input">
                <option value="per_m2">per_m2 (㎡)</option>
                <option value="per_pyeong">per_pyeong (평) — 1평=3.3㎡</option>
                <option value="per_m">per_m (m)</option>
                <option value="per_ea">per_ea (개)</option>
                <option value="per_set">per_set (세트)</option>
                <option value="per_pyeong_band">평형별 고정가 (평형대별 1식)</option>
              </select>
            </Field>

            {draft.unit_type === 'per_pyeong_band' ? (
              <div className="sm:col-span-2">
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 mb-3 text-[11px] text-blue-900 leading-relaxed">
                  ⓘ <strong>평형별 고정가</strong> — 우리집 공급평형이 속한 구간의 <strong>합계</strong>가 면적·수량과 무관하게
                  그 공종 공사비로 <strong>1식</strong> 반영됩니다. (10평 미만은 10평대, 50평 이상은 50평대 이상 구간)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                        <th className="text-left font-bold pb-1 pr-2">평형대</th>
                        <th className="text-right font-bold pb-1 px-2">자재비 (₩)</th>
                        <th className="text-right font-bold pb-1 px-2">인건비 (₩)</th>
                        <th className="text-right font-bold pb-1 pl-2">합계 (자동)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PYEONG_BANDS.map((b) => {
                        const band = draft.pyeong_band_prices?.[b.key];
                        return (
                          <tr key={b.key} className="border-t border-zinc-100">
                            <td className="py-1.5 pr-2 font-medium text-zinc-800 whitespace-nowrap">{b.label}</td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                value={!band || band.material_price === 0 ? '' : band.material_price}
                                onChange={(e) => updateBand(b.key, 'material_price', e.target.value === '' ? 0 : Number(e.target.value))}
                                placeholder="0"
                                className="input text-right tabular-nums"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                value={!band || band.labor_price === 0 ? '' : band.labor_price}
                                onChange={(e) => updateBand(b.key, 'labor_price', e.target.value === '' ? 0 : Number(e.target.value))}
                                placeholder="0"
                                className="input text-right tabular-nums"
                              />
                            </td>
                            <td className="py-1.5 pl-2 text-right tabular-nums font-bold text-zinc-900 whitespace-nowrap">
                              {(band?.total_unit_price ?? 0).toLocaleString('ko-KR')} 원
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                <Field label="자재가 (₩)">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draft.material_price === 0 ? '' : draft.material_price}
                    onChange={(e) => updateField('material_price', e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="input text-right tabular-nums"
                  />
                </Field>
                <Field label="시공비 (₩)">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draft.labor_price === 0 ? '' : draft.labor_price}
                    onChange={(e) => updateField('labor_price', e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="input text-right tabular-nums"
                  />
                </Field>
                <Field label="합계 (자동 계산)" full>
                  <input value={draft.total_unit_price.toLocaleString('ko-KR') + ' 원'} readOnly className="input bg-zinc-50 text-right tabular-nums font-bold" />
                </Field>
              </>
            )}
          </FieldGroup>
        )}

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
          <div className="sm:col-span-2">
            <ImageUploadField
              value={draft.image_url ?? null}
              onChange={(next) => updateField('image_url', next ?? undefined)}
              materialId={draft.material_id}
              token={token}
              onUnauthorized={() => setToken(null)}
            />
            <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">
              📤 <strong>파일 업로드</strong>: 권장. Vercel Blob 에 저장되어 즉시 운영 반영.<br />
              🔗 <strong>URL 직접 입력</strong>: 구글 드라이브 공유 링크도 자동 변환되어 표시됨.
              {previewImageUrl && draft.image_url && draft.image_url.includes('drive.google.com') && (
                <>
                  <br />
                  <span className="text-amber-700">⚠️ Drive URL 은 호스팅 안정성이 낮아요. 파일 업로드로 교체 권장.</span>
                </>
              )}
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

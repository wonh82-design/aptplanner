'use client';

/**
 * 관리자 — '우리집 인테리어 계획서'(₩5,900) 신청 목록.
 *
 * 기능:
 *  - Neon plan_requests 테이블의 신청을 최신순으로 표시 (메일/SQL 없이 확인)
 *  - 행 클릭 → 상세 패널 (산정 내역 quote 의 공종별 라인 + 합계)
 *  - 검색 (성명/이메일/견적ID), CSV 내보내기
 *
 * 데이터 원천: GET /api/admin/plan-requests (x-admin-token 인증)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminGate } from '../AdminGate';
import { useAdminToken } from '../useAdminToken';

type Meta = Record<string, unknown> | null;

type PlanRow = {
  id: number;
  name: string;
  email: string;
  meta: Meta;
  has_pdf: boolean;
  emailed: boolean;
  created_at: string;
};

type LineItem = {
  id: string;
  room: string;
  work_type: string;
  category: string;
  unit_type: string;
  qty: number;
  grade: string;
  material_id: string | null;
  material_label: string;
  unit_price: number;
  subtotal: number;
};

type Totals = {
  grand_total?: number;
  grand_total_with_vat?: number;
  per_pyeong?: number;
};

type QuoteDetail = {
  quote_id?: string;
  line_items?: LineItem[];
  totals?: Totals;
} | null;

type DetailRow = PlanRow & { quote: QuoteDetail };

export default function PlanRequestsAdminPage() {
  return (
    <AdminGate>
      <PlanRequestsList />
    </AdminGate>
  );
}

const won = (n: unknown) =>
  typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('ko-KR') : '—';

const metaStr = (meta: Meta, key: string): string => {
  if (!meta) return '';
  const v = meta[key];
  return v === undefined || v === null ? '' : String(v);
};

const metaNum = (meta: Meta, key: string): number | null => {
  if (!meta) return null;
  const v = meta[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

/** ISO → 'YYYY-MM-DD HH:mm' (로컬) */
function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function PlanRequestsList() {
  const { token, hydrated, fetchWithAuth, setToken } = useAdminToken();
  const [rows, setRows] = useState<PlanRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // 상세 패널
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchWithAuth('/api/admin/plan-requests');
      if (res.status === 401) { setToken(null); return; }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.message || data.error || ('서버 오류: ' + res.status));
        return;
      }
      setRows(data.requests as PlanRow[]);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated || !token) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/plan-requests?id=${id}`);
      if (res.status === 401) { setToken(null); return; }
      const data = await res.json();
      if (res.ok && data.ok) setDetail(data.request as DetailRow);
    } catch { /* ignore */ } finally {
      setDetailLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.name, r.email, metaStr(r.meta, 'quote_id'), metaStr(r.meta, 'region')]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const head = ['접수일시', '성명', '이메일', '평형', '베이', '방', '등급', '지역', '연식', '예상공사비(부가세별도)', '라인수', '견적ID', 'PDF첨부', '메일발송'];
    const lines = filtered.map((r) => [
      fmtDate(r.created_at), r.name, r.email,
      metaStr(r.meta, 'pyeong'), metaStr(r.meta, 'bay'), metaStr(r.meta, 'rooms'),
      metaStr(r.meta, 'grade'), metaStr(r.meta, 'region'), metaStr(r.meta, 'age'),
      String(metaNum(r.meta, 'grand_total') ?? ''), metaStr(r.meta, 'line_item_count'),
      metaStr(r.meta, 'quote_id'), r.has_pdf ? 'Y' : 'N', r.emailed ? 'Y' : 'N',
    ]);
    const csv = [head, ...lines]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    // Excel 한글 깨짐 방지 BOM
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-requests_${filtered.length}건.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="px-6 py-12 text-center text-sm text-zinc-500">신청 목록 불러오는 중…</div>;
  }
  if (err) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {err}
        </div>
        <button onClick={() => void load()} className="text-xs text-blue-700 underline underline-offset-2">
          다시 시도
        </button>
      </div>
    );
  }
  if (!rows) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
      {/* 헤더 */}
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">계획서 신청 내역</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            전체 {rows.length}건 · 필터 {filtered.length}건 ·
            메일발송 {rows.filter((r) => r.emailed).length}건 · 최신순 (최대 200건)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/materials"
            className="text-[11px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
          >
            자재마스터 →
          </Link>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition"
          >
            ↻ 새로고침
          </button>
          <button
            onClick={exportCsv}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white text-xs font-bold transition"
          >
            ⬇ CSV
          </button>
          <button
            onClick={() => setToken(null)}
            className="text-[11px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-lg border border-zinc-200 p-3 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="성명 / 이메일 / 견적ID / 지역 검색"
          className="w-full max-w-md rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[920px]">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600 whitespace-nowrap">접수일시</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600">신청자</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600 whitespace-nowrap">현황</th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-600 whitespace-nowrap">예상 공사비</th>
                <th className="px-3 py-2 text-center font-semibold text-zinc-600 whitespace-nowrap">라인</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600 whitespace-nowrap">견적ID</th>
                <th className="px-3 py-2 text-center font-semibold text-zinc-600 whitespace-nowrap">PDF</th>
                <th className="px-3 py-2 text-center font-semibold text-zinc-600 whitespace-nowrap">메일</th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((r) => {
                const total = metaNum(r.meta, 'grand_total');
                return (
                  <tr key={r.id} className="hover:bg-blue-50/30">
                    <td className="px-3 py-2 text-zinc-600 whitespace-nowrap font-mono text-[11px]">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-zinc-900">{r.name}</div>
                      <div className="text-[10px] text-zinc-500">{r.email}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-700 whitespace-nowrap">
                      {metaStr(r.meta, 'pyeong')}평 · {metaStr(r.meta, 'bay') || '—'}베이 · 방{metaStr(r.meta, 'rooms') || '—'}
                      <div className="text-[10px] text-zinc-500">
                        {[metaStr(r.meta, 'grade'), metaStr(r.meta, 'region'), metaStr(r.meta, 'age')].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-900 font-bold whitespace-nowrap">
                      {total !== null ? `₩${won(total)}` : '—'}
                      <div className="text-[9px] text-zinc-400 font-sans font-normal">부가세 별도</div>
                    </td>
                    <td className="px-3 py-2 text-center text-zinc-600">
                      {metaStr(r.meta, 'line_item_count') || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                      {metaStr(r.meta, 'quote_id') || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.has_pdf
                        ? <span className="text-emerald-600 font-bold" title="PDF 첨부 메일 발송">✓</span>
                        : <span className="text-zinc-300" title="첨부 없음 (용량 초과 또는 미생성)">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.emailed
                        ? <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">발송</span>
                        : <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold" title="메일 실패 — DB에는 보존됨">DB</span>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => void openDetail(r.id)}
                        className="inline-block px-2.5 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[10px]"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-zinc-400 italic">
                    {rows.length === 0 ? '아직 신청이 없습니다.' : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 패널 (산정 내역 quote) */}
      {detailId !== null && (
        <DetailPanel
          loading={detailLoading}
          detail={detail}
          onClose={() => { setDetailId(null); setDetail(null); }}
        />
      )}
    </div>
  );
}

function DetailPanel({
  loading, detail, onClose,
}: {
  loading: boolean;
  detail: DetailRow | null;
  onClose: () => void;
}) {
  const meta = detail?.meta ?? null;
  const items = detail?.quote?.line_items ?? [];
  const totals = detail?.quote?.totals ?? null;

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm flex items-stretch justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-5 py-3 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {detail ? `${detail.name} 님의 신청` : '신청 상세'}
            </h2>
            {detail && (
              <p className="text-[11px] text-zinc-500">
                {detail.email} · {fmtDate(detail.created_at)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none" aria-label="닫기">×</button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-400">산정 내역 불러오는 중…</div>
          ) : !detail ? (
            <div className="py-16 text-center text-sm text-red-600">신청 정보를 불러오지 못했습니다.</div>
          ) : (
            <>
              {/* 현황 요약 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                <Stat label="평형" value={`${metaStr(meta, 'pyeong') || '—'}평`} />
                <Stat label="베이" value={metaStr(meta, 'bay') || '—'} />
                <Stat label="방" value={metaStr(meta, 'rooms') || '—'} />
                <Stat label="기준 등급" value={metaStr(meta, 'grade') || '—'} />
                <Stat label="지역" value={metaStr(meta, 'region') || '—'} />
                <Stat label="연식" value={metaStr(meta, 'age') || '—'} />
              </div>

              {/* 합계 */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50/60 p-4 mb-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-blue-800">예상 공사비 (보정 후·부가세 별도)</span>
                  <span className="text-lg font-bold text-blue-700 font-mono tabular-nums">
                    ₩{won(totals?.grand_total ?? metaNum(meta, 'grand_total'))}
                  </span>
                </div>
                {totals?.grand_total_with_vat !== undefined && (
                  <div className="flex items-baseline justify-between mt-1 text-[11px] text-blue-700/80">
                    <span>부가세 포함</span>
                    <span className="font-mono tabular-nums">₩{won(totals.grand_total_with_vat)}</span>
                  </div>
                )}
                {totals?.per_pyeong !== undefined && (
                  <div className="flex items-baseline justify-between text-[11px] text-blue-700/80">
                    <span>평당</span>
                    <span className="font-mono tabular-nums">₩{won(totals.per_pyeong)}</span>
                  </div>
                )}
              </div>

              {/* 공종별 라인 */}
              {items.length > 0 ? (
                <div>
                  <div className="text-xs font-bold text-zinc-700 mb-2">
                    공종별 산정 내역 <span className="text-zinc-400 font-normal">({items.length}개 라인)</span>
                  </div>
                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left font-semibold text-zinc-600">공종</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold text-zinc-600">기준 자재</th>
                          <th className="px-2.5 py-1.5 text-right font-semibold text-zinc-600">수량</th>
                          <th className="px-2.5 py-1.5 text-right font-semibold text-zinc-600">금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {items.map((it) => (
                          <tr key={it.id} className="hover:bg-zinc-50">
                            <td className="px-2.5 py-1.5 text-zinc-700">
                              <div className="font-medium">{it.category || it.work_type}</div>
                              {it.room && it.room !== '전체' && (
                                <div className="text-[9px] text-zinc-400">{it.room}</div>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-zinc-600">
                              <div className="truncate max-w-[180px]">{it.material_label || '—'}</div>
                              <div className="text-[9px] text-zinc-400">{it.grade}</div>
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-zinc-500 whitespace-nowrap">
                              {it.qty}{it.unit_type ? ` ${it.unit_type}` : ''}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-zinc-900 font-semibold whitespace-nowrap">
                              ₩{won(it.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-400 italic py-4 text-center border border-dashed border-zinc-200 rounded-lg">
                  산정 내역(quote)이 저장되지 않았습니다. (구버전 신청 또는 저장 실패)
                </div>
              )}

              <p className="mt-5 text-[10px] text-zinc-400 leading-relaxed">
                · 견적 ID: <span className="font-mono">{metaStr(meta, 'quote_id') || detail.quote?.quote_id || '—'}</span><br />
                · 답장(reply)은 신청자 이메일로 보내면 됩니다: {detail.email}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 border border-zinc-100 px-3 py-2">
      <div className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold text-zinc-900 truncate">{value}</div>
    </div>
  );
}

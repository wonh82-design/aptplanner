'use client';

/**
 * 견적요청서 PDF — A4 세로(794×1123 ≈ 210:297).
 *
 * 구성:
 *   · 1페이지        : 우리집 현황 (평형/지역/연식/베이/방/욕실/등급/발코니 + 공사범위 요약)
 *   · 고객용 표(N p) : 공종 / 기준자재(스펙) / 단가 / 수량 / 공사비   — 가격 표기 (부가세 별도)
 *   · 견적용 표(N p) : 공종 / 기준자재(스펙) / 대안자재 및 공법 / 견적가 — 가격 비움 (업체 기입)
 *
 * 각 [data-pdf-page] = PDF 1페이지. 표가 길면 행을 chunk 로 나눠 여러 페이지로 분할.
 * 단가·수량은 line_item 의 부가세 별도 값. 합계는 항목합계→부가세→총액 순으로 표기.
 */

import type { Quote, RoomId } from '@/lib/types';
import { REGION_LABEL, AGE_LABEL } from '@/lib/calculator';
import { labelOf } from '@/lib/materials';
import { activeRooms } from '@/lib/areas';

type Props = {
  quote: Quote;
  gradeLabel: string;
  rootRef?: React.Ref<HTMLDivElement>;
};

const VAT_RATE = 0.1;
const won = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원';

/** 단위 한글 약어 */
function unitShort(u: string): string {
  switch (u) {
    case 'per_m2': return '㎡';
    case 'per_pyeong': return '평';
    case 'per_m': return 'm';
    case 'per_ea': return '개';
    case 'per_set': return '식';
    default: return '';
  }
}

type Row = {
  gongjong: string;   // 공종 (공간 접두 포함)
  spec: string;       // 기준자재 스펙
  unitPrice: number;  // 단가 (부가세 별도)
  unit: string;       // 단위 약어
  qty: number;        // 수량
  subtotal: number;   // 공사비 (부가세 별도)
};

/**
 * line_items → 표 행. 공간(room)이 '전체'가 아니면 공종 앞에 공간명을 붙여 구분.
 * 샷시(window)는 방별 베이폭 분할(단가=룩업총가 × 분할비율)이라 그대로 두면
 * "단가 1,100만 × 0.27식" 처럼 오해되므로, 전체를 '샷시(창호) 일식' 한 줄로 통합.
 */
function buildRows(quote: Quote): Row[] {
  const out: Row[] = [];
  let windowDone = false;
  for (const it of quote.line_items) {
    if (it.subtotal <= 0) continue;
    if (it.work_type === 'window') {
      if (windowDone) continue;
      windowDone = true;
      const wins = quote.line_items.filter((x) => x.work_type === 'window' && x.subtotal > 0);
      const sum = wins.reduce((s, x) => s + x.subtotal, 0);
      out.push({
        gongjong: '샷시(창호)',
        spec: `${wins[0].material_label || '—'} — 거실·주방·침실 외창 일체`,
        unitPrice: sum,
        unit: '식',
        qty: 1,
        subtotal: sum,
      });
      continue;
    }
    const base = labelOf(it.work_type);
    const gongjong = it.room && it.room !== '전체' ? `${it.room} ${base}` : base;
    out.push({
      gongjong,
      spec: it.material_label || '—',
      unitPrice: it.unit_price,
      unit: unitShort(it.unit_type),
      qty: it.qty,
      subtotal: it.subtotal,
    });
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const ROWS_PER_PAGE = 20;

export function EstimateRequestPdfTemplate({ quote, gradeLabel, rootRef }: Props) {
  const date = new Date(quote.created_at).toLocaleDateString('ko-KR');
  const p = quote.property;
  const rows = buildRows(quote);

  const rawSum = rows.reduce((s, r) => s + r.subtotal, 0);
  const vat = Math.round(rawSum * VAT_RATE);
  const totalWithVat = rawSum + vat;

  const custChunks = chunk(rows, ROWS_PER_PAGE);
  const vendorChunks = chunk(rows, ROWS_PER_PAGE);

  return (
    <div ref={rootRef}>
      {/* ===== 1페이지: 우리집 현황 ===== */}
      <Page docNo={quote.quote_id} date={date} footer="견적요청서 · 우리집 현황">
        <DocTitle
          big="견적 요청서"
          sub="아래 공사 범위·사양 기준으로 견적을 요청드립니다."
        />
        <SectionTitle n="01" t="우리집 현황" />
        <KVGrid items={[
          { k: '평형 (공급)', v: `${p.pyeong}평` },
          { k: '지역', v: REGION_LABEL[p.region] },
          { k: '연식', v: AGE_LABEL[p.age] },
          { k: '베이 수', v: `${p.bay}베이` },
          { k: '방 개수', v: `${p.rooms}개 (거실 제외)` },
          { k: '욕실', v: `공용 ${p.common_bath} · 부부 ${p.master_bath ? '있음' : '없음'}` },
          { k: '기준 자재 등급', v: gradeLabel },
          { k: '발코니 깊이', v: `${p.balcony_depth_m.toFixed(1)} m` },
        ]} />

        <div style={{ height: '18px' }} />
        <SectionTitle n="02" t="공사 범위 요약" />
        <ScopeSummary quote={quote} />

        <div style={{ marginTop: '20px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#475569', lineHeight: 1.7 }}>
          <strong style={{ color: '#1e293b' }}>안내</strong><br />
          · 본 문서는 <strong>고객용</strong>(기준 자재·예상 공사비)과 <strong>견적용</strong>(업체 기입란) 두 부로 구성됩니다.<br />
          · 단가·공사비는 표준 시장가 기준 <strong>부가세 별도</strong> 예상치이며, 실제 견적은 현장 실측 후 달라질 수 있습니다.<br />
          · 견적용 표의 &lsquo;대안 자재 및 공법&rsquo;란에 업체의 제안을 자유롭게 기입해 주세요.
        </div>
      </Page>

      {/* ===== 고객용 표 ===== */}
      {custChunks.map((rowsChunk, i) => {
        const isLast = i === custChunks.length - 1;
        return (
          <Page key={`cust-${i}`} docNo={quote.quote_id} date={date} footer={`고객용 견적 내역 · ${i + 1}/${custChunks.length}`}>
            {i === 0 && (
              <DocTitle big="고객용 — 예상 공사비" sub="apt-planner 가 산출한 기준 자재·예상 공사비 내역 (부가세 별도)" tone="customer" />
            )}
            <CustomerTable rows={rowsChunk} startIdx={i * ROWS_PER_PAGE} />
            {isLast && <CustomerTotals rawSum={rawSum} vat={vat} total={totalWithVat} />}
          </Page>
        );
      })}

      {/* ===== 견적용 표 ===== */}
      {vendorChunks.map((rowsChunk, i) => (
        <Page key={`vendor-${i}`} docNo={quote.quote_id} date={date} footer={`견적용 (업체 기입) · ${i + 1}/${vendorChunks.length}`}>
          {i === 0 && (
            <DocTitle
              big="견적용 — 업체 기입란"
              sub="기준 자재 외 대안 자재·공법을 제안하고 견적가를 기입해 주세요. (단가·공사비 비움)"
              tone="vendor"
            />
          )}
          <VendorTable rows={rowsChunk} startIdx={i * ROWS_PER_PAGE} />
          {i === vendorChunks.length - 1 && <VendorTotals />}
        </Page>
      ))}
    </div>
  );
}

// =====================================================
// 페이지 컨테이너 — A4 세로 794×1123
// =====================================================
function Page({
  children, docNo, date, footer,
}: { children: React.ReactNode; docNo: string; date: string; footer: string }) {
  return (
    <div
      data-pdf-page=""
      style={{
        width: '794px',
        height: '1123px',
        overflow: 'hidden',
        padding: '44px 48px',
        background: '#ffffff',
        boxSizing: 'border-box',
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        color: '#1f2937',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 상단 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '8px', marginBottom: '18px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', letterSpacing: '0.04em' }}>apt-planner 견적요청서</span>
        <span style={{ fontSize: '10px', color: '#64748b' }}>문서번호 {docNo} · {date}</span>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>

      {/* 하단 푸터 */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
        <span>{footer}</span>
        <span>업체 수수료·제휴 0건 · 중립 산출</span>
      </div>
    </div>
  );
}

function DocTitle({ big, sub, tone = 'neutral' }: { big: string; sub: string; tone?: 'neutral' | 'customer' | 'vendor' }) {
  const accent = tone === 'customer' ? '#2563eb' : tone === 'vendor' ? '#b45309' : '#1e293b';
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color: accent, letterSpacing: '-0.01em' }}>{big}</div>
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

function SectionTitle({ n, t }: { n: string; t: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', fontFamily: 'monospace' }}>{n}</span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{t}</span>
    </div>
  );
}

function KVGrid({ items }: { items: { k: string; v: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {items.map((it) => (
        <div key={it.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{it.k}</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{it.v}</span>
        </div>
      ))}
    </div>
  );
}

/** 공사 범위 요약 — 카테고리별 항목 수 + 총 공종 수 */
function ScopeSummary({ quote }: { quote: Quote }) {
  const visibleRooms = activeRooms(quote.property) as RoomId[];
  const expansionRooms = visibleRooms.filter((r) => {
    const rs = quote.scope.rooms[r];
    return rs && !rs.expansion_current && rs.expansion_after;
  });
  const cats = Object.entries(quote.totals.by_category)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([c]) => c);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {cats.map((c) => (
        <span key={c} style={{ fontSize: '11px', padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '999px', fontWeight: 600 }}>{c}</span>
      ))}
      {expansionRooms.length > 0 && (
        <span style={{ fontSize: '11px', padding: '4px 10px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '999px', fontWeight: 600 }}>
          확장: {expansionRooms.join('·')}
        </span>
      )}
    </div>
  );
}

// =====================================================
// 고객용 표 — 공종 / 기준자재(스펙) / 단가 / 수량 / 공사비
// =====================================================
const th: React.CSSProperties = { padding: '7px 8px', fontSize: '10.5px', fontWeight: 700, color: '#334155', background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' };
const tdBase: React.CSSProperties = { padding: '6px 8px', fontSize: '10px', borderBottom: '1px solid #eef2f6', verticalAlign: 'top', lineHeight: 1.4 };

function CustomerTable({ rows, startIdx }: { rows: Row[]; startIdx: number }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid #e2e8f0' }}>
      <colgroup>
        <col style={{ width: '22%' }} />
        <col style={{ width: '40%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '14%' }} />
      </colgroup>
      <thead>
        <tr>
          <th style={th}>공종</th>
          <th style={th}>기준 자재 (스펙)</th>
          <th style={{ ...th, textAlign: 'right' }}>단가</th>
          <th style={{ ...th, textAlign: 'right' }}>수량</th>
          <th style={{ ...th, textAlign: 'right' }}>공사비</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: (startIdx + i) % 2 ? '#fcfdff' : '#ffffff' }}>
            <td style={{ ...tdBase, fontWeight: 700, color: '#1e293b' }}>{r.gongjong}</td>
            <td style={{ ...tdBase, color: '#475569', wordBreak: 'keep-all' }}>{r.spec}</td>
            <td style={{ ...tdBase, textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>{won(r.unitPrice)}{r.unit ? `/${r.unit}` : ''}</td>
            <td style={{ ...tdBase, textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>{r.qty.toLocaleString('ko-KR')}{r.unit}</td>
            <td style={{ ...tdBase, textAlign: 'right', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>{won(r.subtotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CustomerTotals({ rawSum, vat, total }: { rawSum: number; vat: number; total: number }) {
  return (
    <div style={{ marginTop: '12px', marginLeft: 'auto', width: '60%' }}>
      <TotalRow k="항목 합계 (부가세 별도)" v={won(rawSum)} />
      <TotalRow k="부가세 (10%)" v={won(vat)} />
      <TotalRow k="총액 (부가세 포함)" v={won(total)} strong />
    </div>
  );
}

function TotalRow({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: strong ? '9px 12px' : '6px 12px',
      borderTop: strong ? '2px solid #1e293b' : '1px solid #e2e8f0',
      background: strong ? '#1e293b' : 'transparent',
    }}>
      <span style={{ fontSize: strong ? '12px' : '11px', fontWeight: strong ? 800 : 600, color: strong ? '#ffffff' : '#475569' }}>{k}</span>
      <span style={{ fontSize: strong ? '14px' : '11.5px', fontWeight: 800, color: strong ? '#fde68a' : '#1e293b' }}>{v}</span>
    </div>
  );
}

// =====================================================
// 견적용 표 — 공종 / 기준자재(스펙) / 대안자재 및 공법 / 견적가
// =====================================================
function VendorTable({ rows, startIdx }: { rows: Row[]; startIdx: number }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid #e2e8f0' }}>
      <colgroup>
        <col style={{ width: '20%' }} />
        <col style={{ width: '34%' }} />
        <col style={{ width: '30%' }} />
        <col style={{ width: '16%' }} />
      </colgroup>
      <thead>
        <tr>
          <th style={th}>공종</th>
          <th style={th}>기준 자재 (스펙)</th>
          <th style={{ ...th, background: '#fffbeb', color: '#92400e' }}>대안 자재 및 공법 (업체 기입)</th>
          <th style={{ ...th, background: '#fffbeb', color: '#92400e', textAlign: 'right' }}>견적가</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: (startIdx + i) % 2 ? '#fcfdff' : '#ffffff' }}>
            <td style={{ ...tdBase, fontWeight: 700, color: '#1e293b', height: '34px' }}>{r.gongjong}</td>
            <td style={{ ...tdBase, color: '#475569', wordBreak: 'keep-all' }}>{r.spec}</td>
            <td style={{ ...tdBase, background: '#fffdf5' }} />
            <td style={{ ...tdBase, background: '#fffdf5' }} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VendorTotals() {
  return (
    <div style={{ marginTop: '12px', marginLeft: 'auto', width: '60%' }}>
      <VendorTotalRow k="견적 합계 (부가세 별도)" />
      <VendorTotalRow k="부가세 (10%)" />
      <VendorTotalRow k="총 견적가 (부가세 포함)" strong />
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
        <span>업체명/담당자: ____________________</span>
        <span>연락처: ____________________</span>
      </div>
    </div>
  );
}

function VendorTotalRow({ k, strong = false }: { k: string; strong?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: strong ? '11px 12px' : '9px 12px',
      borderTop: strong ? '2px solid #b45309' : '1px solid #e2e8f0',
      background: strong ? '#fffbeb' : 'transparent',
    }}>
      <span style={{ fontSize: strong ? '12px' : '11px', fontWeight: strong ? 800 : 600, color: strong ? '#92400e' : '#475569' }}>{k}</span>
      <span style={{ minWidth: '120px', borderBottom: '1px solid #cbd5e1', height: '16px' }} />
    </div>
  );
}

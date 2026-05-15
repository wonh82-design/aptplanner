'use client';

/**
 * 무료 예상 공사비 PDF.
 * 표지(별도 페이지) + 본문 구조.
 */

import type { Quote } from '@/lib/types';
import { fmtKRW, fmtKRWShort } from '@/lib/calculator';
import { PdfCover } from './PdfCover';

type Props = {
  quote: Quote;
  gradeLabel: string;
  coverRef?: React.Ref<HTMLDivElement>;
  bodyRef?: React.Ref<HTMLDivElement>;
};

export function QuotePdfTemplate({ quote, gradeLabel, coverRef, bodyRef }: Props) {
  return (
    <>
      <div ref={coverRef}>
        <PdfCover
          category="예상 공사비 보고서"
          title={`${quote.property.pyeong}평${'\n'}우리집 인테리어${'\n'}예상 공사비`}
          subtitle={`표준 시장가 기반 산출. 본 보고서는 여러 인테리어 업체에 같은 조건으로 비교 견적을 받기 위한 기초 자료입니다.`}
          meta={[
            `${quote.property.pyeong}평`,
            `${quote.property.bay}베이`,
            `${gradeLabel} 등급`,
            `총 ${quote.line_items.length}개 라인`,
          ]}
          issuedAt={quote.created_at}
          docNo={quote.quote_id}
          tagline="정확한 정보로 무장한 소비자가 좋은 업체를 알아볼 수 있게 되는 것 — 그게 apt-planner의 목표입니다."
        />
      </div>

      <QuoteBody quote={quote} gradeLabel={gradeLabel} innerRef={bodyRef} />
    </>
  );
}

function QuoteBody({
  quote, gradeLabel, innerRef,
}: { quote: Quote; gradeLabel: string; innerRef?: React.Ref<HTMLDivElement> }) {
  const date = new Date(quote.created_at).toLocaleDateString('ko-KR');
  const grand = quote.totals.grand_total;
  const vat = quote.totals.vat;

  return (
    <div
      ref={innerRef}
      style={{
        width: '760px',
        padding: '48px 56px',
        background: '#ffffff',
        color: '#1f2937',
        fontFamily: 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        fontSize: '12px',
        lineHeight: 1.55,
      }}
    >
      <RunningHeader page="본문" docNo={quote.quote_id} date={date} />

      {/* 한눈에 보기 박스 */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        borderRadius: '12px',
        padding: '24px 28px',
        marginBottom: '32px',
      }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '6px' }}>
          한눈에 보기 · {quote.property.pyeong}평 · {gradeLabel}
        </div>
        <div style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '4px' }}>
          {fmtKRW(grand)}
        </div>
        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
          부가세 별도 · 부가세 포함 시 {fmtKRW(grand + vat)} · 평당 {fmtKRWShort(quote.totals.per_pyeong)}
        </div>
      </div>

      {/* 우리집 정보 */}
      <Section num="01" title="우리집 정보 & 공사 범위 요약">
        <KeyValGrid items={[
          { k: '평형 (공급)', v: `${quote.property.pyeong}평` },
          { k: '베이수', v: `${quote.property.bay}베이` },
          { k: '방 개수', v: `${quote.property.rooms}개` },
          { k: '공용욕실', v: `${quote.property.common_bath}개` },
          { k: '부부욕실', v: quote.property.master_bath ? '있음' : '없음' },
          { k: '발코니 깊이', v: `${quote.property.balcony_depth_m}m` },
          { k: '자재 등급', v: gradeLabel },
          { k: '라인 항목', v: `${quote.line_items.length}건` },
          { k: '평당 단가', v: fmtKRWShort(quote.totals.per_pyeong) + '/평' },
        ]} />
      </Section>

      {/* 공종별 합계 */}
      <Section num="02" title="공종별 합계">
        <Table cols={[
          { label: '공종', align: 'left' },
          { label: '소계 (원)', align: 'right' },
        ]}>
          {Object.entries(quote.totals.by_work_type)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amt]) => (
              <tr key={cat}>
                <td style={tdL}>{cat}</td>
                <td style={tdR}>{amt.toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          <tr style={{ borderTop: '2px solid #111827', background: '#f9fafb' }}>
            <td style={{ ...tdL, fontWeight: 800 }}>합계 (부가세 별도)</td>
            <td style={{ ...tdR, fontWeight: 800 }}>{grand.toLocaleString('ko-KR')}</td>
          </tr>
        </Table>
      </Section>

      {/* 공간별 합계 */}
      <Section num="03" title="공간별 합계">
        <Table cols={[
          { label: '공간', align: 'left' },
          { label: '소계 (원)', align: 'right' },
        ]}>
          {Object.entries(quote.totals.by_room)
            .sort(([, a], [, b]) => b - a)
            .map(([room, amt]) => (
              <tr key={room}>
                <td style={tdL}>{room}</td>
                <td style={tdR}>{amt.toLocaleString('ko-KR')}</td>
              </tr>
            ))}
        </Table>
      </Section>

      {/* 상세 라인 */}
      <Section num="04" title="상세 라인 항목">
        <Table cols={[
          { label: '#', align: 'left' },
          { label: '공간', align: 'left' },
          { label: '공종', align: 'left' },
          { label: '자재 사양', align: 'left' },
          { label: '수량', align: 'right' },
          { label: '단가', align: 'right' },
          { label: '소계', align: 'right' },
        ]}>
          {quote.line_items.map(it => (
            <tr key={it.id}>
              <td style={{ ...tdL, color: '#9ca3af', width: '24px' }}>{it.id}</td>
              <td style={tdL}>{it.room}</td>
              <td style={tdL}>{it.category}</td>
              <td style={{ ...tdL, fontSize: '10px', color: '#4b5563' }}>{it.material_label}</td>
              <td style={tdR}>{it.qty} <span style={{ color: '#9ca3af' }}>{unitShort(it.unit_type)}</span></td>
              <td style={tdR}>{it.unit_price.toLocaleString('ko-KR')}</td>
              <td style={tdR}>{it.subtotal.toLocaleString('ko-KR')}</td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* 면책 */}
      <Footer />
    </div>
  );
}

// =====================================================
// 공통 보조
// =====================================================

export const tdL: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid #f3f4f6',
  textAlign: 'left',
  verticalAlign: 'top',
};
export const tdR: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid #f3f4f6',
  textAlign: 'right',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
};

export function RunningHeader({ page, docNo, date }: { page: string; docNo?: string; date: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '12px',
      marginBottom: '24px',
      fontSize: '10px',
      color: '#6b7280',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          background: '#111827',
          color: '#ffffff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '9px',
          letterSpacing: '0.04em',
        }}>apt-planner</span>
        <span>{page}</span>
      </div>
      <div style={{ fontFamily: 'monospace' }}>
        {docNo && <span>{docNo} · </span>}
        {date}
      </div>
    </div>
  );
}

export function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <h2 style={{
        fontSize: '14px',
        fontWeight: 700,
        color: '#111827',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '2px solid #111827',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{
          background: '#111827',
          color: '#ffffff',
          fontSize: '10px',
          padding: '2px 8px',
          borderRadius: '3px',
          fontFamily: 'monospace',
          fontWeight: 700,
        }}>{num}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function KeyValGrid({ items }: { items: { k: string; v: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
      {items.map(({ k, v }) => (
        <div key={k} style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #60a5fa' }}>
          <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

type Col = { label: string; align: 'left' | 'right' };
export function Table({ cols, children }: { cols: Col[]; children: React.ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
      <thead>
        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
          {cols.map(c => (
            <th key={c.label} style={{
              padding: '8px 10px',
              textAlign: c.align,
              fontSize: '10px',
              textTransform: 'uppercase',
              color: '#6b7280',
              letterSpacing: '0.06em',
              fontWeight: 700,
            }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Footer() {
  return (
    <div style={{
      marginTop: '32px',
      padding: '16px 18px',
      background: '#f9fafb',
      borderLeft: '4px solid #111827',
      fontSize: '10px',
      color: '#4b5563',
      lineHeight: 1.7,
      borderRadius: '4px',
    }}>
      <div style={{ fontWeight: 700, color: '#111827', marginBottom: '6px' }}>📌 본 자료의 성격</div>
      <p style={{ margin: 0 }}>
        본 보고서는 표준 시장가·표준 면적 기반 <strong>예상치</strong>이며, 실제 시공·자재·평면 차이에 따라 변동될 수 있습니다.
        정확한 견적은 인테리어 업체와의 협의 후 확정됩니다.
      </p>
      <div style={{ fontWeight: 700, color: '#111827', marginTop: '12px', marginBottom: '6px' }}>🔒 중립성 약속</div>
      <p style={{ margin: 0 }}>
        apt-planner는 어떤 인테리어 업체와도 광고비·수수료·제휴 관계가 없습니다.
        본 자료는 소비자가 같은 조건으로 여러 업체에서 비교 견적을 받을 수 있도록 돕는 도구입니다.
      </p>
    </div>
  );
}

export function unitShort(u: string): string {
  switch (u) {
    case 'per_m2': return '㎡';
    case 'per_m': return 'm';
    case 'per_ea': return 'ea';
    case 'per_set': return 'set';
    default: return u;
  }
}

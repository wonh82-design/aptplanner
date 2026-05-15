'use client';

/**
 * 무료 예상 공사비 PDF 템플릿.
 * - DOM에 hidden으로 마운트한 뒤 html2canvas로 캡처
 * - oklch 색상 회피를 위해 안전한 RGB hex 위주 사용
 */

import type { Quote } from '@/lib/types';
import { fmtKRW, fmtKRWShort } from '@/lib/calculator';

type Props = {
  quote: Quote;
  gradeLabel: string;
  /** 캡처 대상 ref */
  innerRef?: React.Ref<HTMLDivElement>;
};

export function QuotePdfTemplate({ quote, gradeLabel, innerRef }: Props) {
  const date = new Date(quote.created_at).toLocaleDateString('ko-KR');
  const grand = quote.totals.grand_total;
  const vat = quote.totals.vat;

  return (
    <div
      ref={innerRef}
      style={{
        width: '760px',
        padding: '40px',
        background: '#ffffff',
        color: '#111827',
        fontFamily: 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        fontSize: '12px',
        lineHeight: 1.5,
      }}
    >
      {/* 헤더 */}
      <div style={{ borderBottom: '2px solid #111827', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.05em' }}>apt-planner</div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0 0 0' }}>
              우리집 인테리어 예상 공사비
            </h1>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {quote.property.pyeong}평 · {gradeLabel} 기준 · 발행일 {date}
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>
            {quote.quote_id}
          </div>
        </div>
      </div>

      {/* 총합 박스 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <Box label="총 공사비 (부가세 별도)" value={fmtKRW(grand)} highlight />
        <Box label="부가세 포함" value={fmtKRW(grand + vat)} />
        <Box label="평당 단가" value={`${fmtKRWShort(quote.totals.per_pyeong)}/평`} />
        <Box label="라인 항목" value={`${quote.line_items.length}건`} />
      </div>

      {/* 우리집 정보 */}
      <Section title="우리집 정보">
        <KeyValGrid items={[
          { k: '평형', v: `${quote.property.pyeong}평 (공급)` },
          { k: '베이', v: `${quote.property.bay}베이` },
          { k: '방 개수', v: `${quote.property.rooms}개` },
          { k: '욕실', v: `공용 ${quote.property.common_bath}개 / 부부 ${quote.property.master_bath ? '있음' : '없음'}` },
          { k: '발코니 깊이', v: `${quote.property.balcony_depth_m}m` },
          { k: '자재 등급', v: gradeLabel },
        ]} />
      </Section>

      {/* 공종별 합계 */}
      <Section title="공종별 합계">
        <Table cols={['공종', '소계 (원)']}>
          {Object.entries(quote.totals.by_work_type)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amt]) => (
              <tr key={cat}>
                <td style={tdL}>{cat}</td>
                <td style={tdR}>{amt.toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          <tr style={{ borderTop: '2px solid #111827' }}>
            <td style={{ ...tdL, fontWeight: 700 }}>합계 (부가세 별도)</td>
            <td style={{ ...tdR, fontWeight: 700 }}>{grand.toLocaleString('ko-KR')}</td>
          </tr>
        </Table>
      </Section>

      {/* 공간별 합계 */}
      <Section title="공간별 합계">
        <Table cols={['공간', '소계 (원)']}>
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
      <Section title="상세 라인 항목">
        <Table cols={['#', '공간', '공종', '자재', '수량', '단가', '소계']}>
          {quote.line_items.map(it => (
            <tr key={it.id}>
              <td style={{ ...tdL, color: '#9ca3af', width: '24px' }}>{it.id}</td>
              <td style={tdL}>{it.room}</td>
              <td style={tdL}>{it.category}</td>
              <td style={{ ...tdL, fontSize: '10px', color: '#4b5563' }}>{it.material_label}</td>
              <td style={tdR}>{it.qty} {unitShort(it.unit_type)}</td>
              <td style={tdR}>{it.unit_price.toLocaleString('ko-KR')}</td>
              <td style={tdR}>{it.subtotal.toLocaleString('ko-KR')}</td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* 면책 */}
      <div style={{
        marginTop: '24px',
        padding: '12px 14px',
        background: '#f9fafb',
        borderLeft: '3px solid #d1d5db',
        fontSize: '10px',
        color: '#6b7280',
        lineHeight: 1.6,
      }}>
        <strong>본 견적의 성격:</strong> 표준 시장가 기반 예상치이며, 실제 시공·자재·평면 차이에 따라 변동될 수 있습니다.
        실제 견적은 인테리어 업체와의 협의가 필요합니다. <br />
        <strong>중립성 안내:</strong> apt-planner는 어떤 인테리어 업체와도 수수료·제휴 관계가 없습니다. 본 자료는 소비자가 정확한 정보로 비교 견적을 받을 수 있도록 돕는 도구입니다.
      </div>
    </div>
  );
}

// ===== 보조 컴포넌트 =====

const tdL: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'left', verticalAlign: 'top' };
const tdR: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' };

function Box({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: '14px 16px',
      border: highlight ? '2px solid #111827' : '1px solid #e5e7eb',
      borderRadius: '6px',
      background: highlight ? '#111827' : '#ffffff',
      color: highlight ? '#ffffff' : '#111827',
    }}>
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #e5e7eb' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function KeyValGrid({ items }: { items: { k: string; v: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
      {items.map(({ k, v }) => (
        <div key={k} style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', color: '#6b7280' }}>{k}</div>
          <div style={{ fontSize: '12px', fontWeight: 600 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function Table({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {cols.map((c, i) => (
            <th key={c}
                style={{
                  padding: '6px 8px',
                  textAlign: i === 0 || i < cols.length - 3 ? 'left' : 'right',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  letterSpacing: '0.04em',
                }}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function unitShort(u: string): string {
  switch (u) {
    case 'per_m2': return '㎡';
    case 'per_m': return 'm';
    case 'per_ea': return 'ea';
    case 'per_set': return 'set';
    default: return u;
  }
}

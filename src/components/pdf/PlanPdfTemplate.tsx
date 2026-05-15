'use client';

/**
 * 유료: 인테리어 계획서 PDF.
 * 견적 PDF보다 상세 — 자재 사양·공간별 매트릭스·견적요청 양식 포함.
 * 인테리어 업체에 전달해서 정확한 비교 견적을 받을 수 있도록 구성.
 */

import type { Quote } from '@/lib/types';

type Props = {
  quote: Quote;
  gradeLabel: string;
  innerRef?: React.Ref<HTMLDivElement>;
};

export function PlanPdfTemplate({ quote, gradeLabel, innerRef }: Props) {
  const date = new Date(quote.created_at).toLocaleDateString('ko-KR');

  // 라인을 공간별로 그룹핑
  const byRoom = new Map<string, typeof quote.line_items>();
  for (const it of quote.line_items) {
    const arr = byRoom.get(it.room) || [];
    arr.push(it);
    byRoom.set(it.room, arr);
  }

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
        lineHeight: 1.55,
      }}
    >
      {/* 표지 */}
      <div style={{
        textAlign: 'center',
        padding: '80px 0 40px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '32px',
      }}>
        <div style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.08em' }}>apt-planner · 인테리어 계획서</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '12px 0 8px', letterSpacing: '-0.02em' }}>
          우리집 인테리어 계획서
        </h1>
        <div style={{ fontSize: '14px', color: '#4b5563' }}>
          {quote.property.pyeong}평 · {gradeLabel} 기준
        </div>
        <div style={{ marginTop: '24px', fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
          계획서 번호: {quote.quote_id} · 발행일 {date}
        </div>
      </div>

      {/* 이 문서의 사용법 */}
      <Section title="① 이 계획서의 활용법">
        <p style={{ margin: '0 0 8px', color: '#374151' }}>
          이 계획서는 <strong>여러 인테리어 업체에 정확하게 같은 조건으로 비교 견적</strong>을 받기 위한 문서입니다.
          업체에 이 문서를 그대로 전달하시면, 자재 사양과 수량을 명확히 알고 단가만 산출해 회신해줄 수 있습니다.
        </p>
        <Bullet items={[
          '같은 사양으로 3~5개 업체에서 비교 견적을 받으세요.',
          '수량은 표준치이므로 실측 후 일부 조정될 수 있습니다.',
          '단가가 평균보다 10% 이상 차이나는 항목은 추가 설명을 요청하세요.',
        ]} />
      </Section>

      {/* 우리집 정보 + 공사 범위 요약 */}
      <Section title="② 우리집 정보 & 공사 범위">
        <KeyValGrid items={[
          { k: '평형', v: `${quote.property.pyeong}평 (공급)` },
          { k: '베이수', v: `${quote.property.bay}베이` },
          { k: '방 개수', v: `${quote.property.rooms}개` },
          { k: '공용욕실', v: `${quote.property.common_bath}개` },
          { k: '부부욕실', v: quote.property.master_bath ? '있음' : '없음' },
          { k: '발코니 깊이', v: `${quote.property.balcony_depth_m}m` },
          { k: '자재 등급', v: gradeLabel },
          { k: '총 라인 항목', v: `${quote.line_items.length}건` },
          { k: '총 예상 공사비', v: `${quote.totals.grand_total.toLocaleString('ko-KR')}원` },
        ]} />
      </Section>

      {/* 공간별 상세 사양 */}
      <Section title="③ 공간별 상세 사양 (시공자 회신용)">
        <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 12px' }}>
          업체는 아래 표의 자재 사양·수량을 보고 단가만 산출하여 회신해주세요. 수량 변동 시 별도 표기 부탁드립니다.
        </p>
        {Array.from(byRoom.entries()).map(([room, items]) => (
          <div key={room} style={{ marginBottom: '14px' }}>
            <div style={{
              padding: '4px 10px',
              background: '#111827',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px 4px 0 0',
              display: 'inline-block',
            }}>
              {room}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={th}>공종</th>
                  <th style={th}>자재 사양 (브랜드/품번/규격)</th>
                  <th style={{ ...th, textAlign: 'right' }}>수량</th>
                  <th style={{ ...th, textAlign: 'right' }}>단위</th>
                  <th style={{ ...th, textAlign: 'right', background: '#fef3c7' }}>단가 (업체 기재)</th>
                  <th style={{ ...th, textAlign: 'right', background: '#fef3c7' }}>소계 (업체 기재)</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id}>
                    <td style={td}>{it.category}</td>
                    <td style={{ ...td, color: '#1f2937' }}>{it.material_label}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{it.qty}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#6b7280' }}>{unitShort(it.unit_type)}</td>
                    <td style={{ ...td, background: '#fffbeb' }}></td>
                    <td style={{ ...td, background: '#fffbeb' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Section>

      {/* 견적 회신 체크리스트 */}
      <Section title="④ 견적 회신 시 업체 답변이 필요한 사항">
        <Bullet items={[
          '본 계획서 사양과 다른 자재로 견적하실 경우, 어떤 자재로 대체했는지 명시 부탁드립니다.',
          '인건비·일반관리비·이윤은 별도 표기 부탁드립니다.',
          '폐기물 처리비·운반비·신고비는 견적에 포함되는지 명확히 표기해주세요.',
          '예상 공기(시작일~완공일)와 A/S 보증 기간을 알려주세요.',
          '계약금·중도금·잔금 비율과 시기를 명시해주세요.',
          '발생할 수 있는 추가금의 종류와 사전 협의 절차를 안내해주세요.',
        ]} />
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
        <strong>본 계획서의 성격:</strong> 표준 시장가·표준 면적 기반 예상치입니다. 실제 견적은 업체 실측 후 확정됩니다.
        <br />
        <strong>중립성:</strong> apt-planner는 어떤 인테리어 업체와도 수수료·제휴 관계가 없습니다. 본 자료는 소비자의 비교 견적 권리를 보호하기 위한 도구입니다.
      </div>
    </div>
  );
}

// ===== 보조 =====

const th: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '9px',
  textTransform: 'uppercase',
  color: '#6b7280',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
  letterSpacing: '0.04em',
};
const td: React.CSSProperties = {
  padding: '5px 8px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '24px' }}>
      <h2 style={{
        fontSize: '14px',
        fontWeight: 700,
        color: '#111827',
        marginBottom: '10px',
        paddingBottom: '6px',
        borderBottom: '2px solid #111827',
      }}>
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

function Bullet({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '18px', color: '#374151' }}>
      {items.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
    </ul>
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

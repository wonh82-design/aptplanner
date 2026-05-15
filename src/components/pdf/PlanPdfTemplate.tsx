'use client';

/**
 * 유료: 인테리어 계획서 PDF.
 * 표지(별도) + 본문 — 시공자에게 그대로 전달해 같은 조건의 비교 견적을 받기 위한 문서.
 */

import type { Quote } from '@/lib/types';
import { PdfCover } from './PdfCover';
import {
  RunningHeader, Section, KeyValGrid, Footer, unitShort,
} from './QuotePdfTemplate';

type Props = {
  quote: Quote;
  gradeLabel: string;
  coverRef?: React.Ref<HTMLDivElement>;
  bodyRef?: React.Ref<HTMLDivElement>;
};

export function PlanPdfTemplate({ quote, gradeLabel, coverRef, bodyRef }: Props) {
  return (
    <>
      <div ref={coverRef}>
        <PdfCover
          category="인테리어 계획서 · Premium"
          title={`우리집${'\n'}인테리어${'\n'}계획서`}
          subtitle={`여러 인테리어 업체에 같은 조건으로 비교 견적을 받기 위한 문서입니다. 자재 사양·수량은 확정됐고, 업체는 단가만 산출해 회신합니다.`}
          meta={[
            `${quote.property.pyeong}평`,
            `${quote.property.bay}베이`,
            `${gradeLabel} 등급`,
            `${quote.line_items.length}개 라인`,
          ]}
          issuedAt={quote.created_at}
          docNo={quote.quote_id}
          tagline="좋은 인테리어의 시작은 같은 조건으로 비교 견적을 받는 것입니다."
        />
      </div>

      <PlanBody quote={quote} gradeLabel={gradeLabel} innerRef={bodyRef} />
    </>
  );
}

function PlanBody({
  quote, gradeLabel, innerRef,
}: { quote: Quote; gradeLabel: string; innerRef?: React.Ref<HTMLDivElement> }) {
  const date = new Date(quote.created_at).toLocaleDateString('ko-KR');
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
        padding: '48px 56px',
        background: '#ffffff',
        color: '#1f2937',
        fontFamily: 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        fontSize: '12px',
        lineHeight: 1.6,
      }}
    >
      <RunningHeader page="인테리어 계획서" docNo={quote.quote_id} date={date} />

      <Section num="01" title="이 계획서의 활용법">
        <p style={{ margin: '0 0 10px', color: '#374151' }}>
          이 문서는 여러 인테리어 업체에 <strong>동일한 사양·수량</strong>으로 비교 견적을 받기 위한 문서입니다.
          업체에 그대로 전달하시면, 자재 사양과 수량을 명확히 알고 <strong>단가만 산출해 회신</strong>해줄 수 있습니다.
        </p>
        <Bullet items={[
          '같은 조건으로 3~5개 업체에서 비교 견적을 받으세요.',
          '수량은 표준치이므로 실측 후 일부 조정될 수 있습니다.',
          '단가가 평균보다 10% 이상 차이나는 항목은 추가 설명을 요청하세요.',
          '본 문서에 명시되지 않은 자재로 견적할 경우, 어떤 자재로 대체했는지 명시 요구하세요.',
        ]} />
      </Section>

      <Section num="02" title="우리집 정보 & 공사 범위">
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

      <Section num="03" title="공간별 상세 사양 (시공자 회신용)">
        <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 14px' }}>
          업체는 아래 표의 자재 사양·수량을 기준으로 <strong>단가만 기재</strong>해 회신해주세요.
          수량 변동 시 별도 표기 부탁드립니다.
        </p>
        {Array.from(byRoom.entries()).map(([room, items]) => (
          <div key={room} style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '6px 12px',
              background: '#111827',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px 6px 0 0',
              display: 'inline-block',
            }}>
              {room}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #e5e7eb', borderTop: 'none' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={th}>공종</th>
                  <th style={th}>자재 사양 (브랜드/품번/규격)</th>
                  <th style={{ ...th, textAlign: 'right' }}>수량</th>
                  <th style={{ ...th, textAlign: 'right' }}>단위</th>
                  <th style={{ ...th, textAlign: 'right', background: '#fef3c7' }}>단가 (업체)</th>
                  <th style={{ ...th, textAlign: 'right', background: '#fef3c7' }}>소계 (업체)</th>
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

      <Section num="04" title="견적 회신 시 업체가 답해야 할 사항">
        <Bullet items={[
          '본 계획서 사양과 다른 자재로 견적하실 경우, 어떤 자재로 대체했는지 명시 부탁드립니다.',
          '인건비·일반관리비·이윤은 별도 표기 부탁드립니다.',
          '폐기물 처리비·운반비·신고비는 견적에 포함되는지 명확히 표기해주세요.',
          '예상 공기(시작일~완공일)와 A/S 보증 기간을 알려주세요.',
          '계약금·중도금·잔금 비율과 시기를 명시해주세요.',
          '발생할 수 있는 추가금의 종류와 사전 협의 절차를 안내해주세요.',
        ]} />
      </Section>

      <Footer />
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '7px 9px',
  fontSize: '9px',
  textTransform: 'uppercase',
  color: '#6b7280',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
  letterSpacing: '0.06em',
  fontWeight: 700,
};
const td: React.CSSProperties = {
  padding: '6px 9px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top',
};

function Bullet({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '18px', color: '#374151' }}>
      {items.map((s, i) => <li key={i} style={{ marginBottom: '5px' }}>{s}</li>)}
    </ul>
  );
}

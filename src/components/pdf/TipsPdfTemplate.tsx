'use client';

/**
 * 유료 보너스: 인테리어 팁 PDF.
 * 정적 콘텐츠 — 인테리어 잘하는 법, 업체 고르는 법, 견적 요청·비교법.
 */

type Props = { innerRef?: React.Ref<HTMLDivElement> };

export function TipsPdfTemplate({ innerRef }: Props) {
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
        lineHeight: 1.6,
      }}
    >
      {/* 표지 */}
      <div style={{ textAlign: 'center', padding: '60px 0 40px', borderBottom: '1px solid #e5e7eb', marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.08em' }}>apt-planner · 보너스 자료</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '12px 0', letterSpacing: '-0.02em' }}>
          인테리어 처음하는 분을 위한<br />실전 가이드
        </h1>
        <div style={{ fontSize: '13px', color: '#4b5563' }}>
          잘하는 법 · 좋은 업체 고르는 법 · 견적 요청·비교법
        </div>
      </div>

      {/* 1. 인테리어 잘하는 법 */}
      <Section title="1. 인테리어 잘하는 법 — 후회 없는 진행 원칙">
        <H3>1-1. 평면을 먼저, 자재는 나중에</H3>
        <P>구조 변경(벽 철거, 확장)·동선·수납 같은 평면 의사결정을 먼저 끝내야 합니다. 자재는 평면이 확정된 뒤 골라야 어울리는 등급·색·재질을 효율적으로 결정할 수 있습니다.</P>

        <H3>1-2. 등급은 공간별로 다르게</H3>
        <P>거실·주방처럼 매일 보는 공간은 한 등급 위로, 작은방·다용도실처럼 활용도 낮은 공간은 가성비 등급으로 — 같은 예산으로 체감 만족도가 크게 올라갑니다.</P>

        <H3>1-3. 비용 80%는 보이지 않는 곳에서 결정</H3>
        <P>샷시 단열 등급, 단열재 두께, 배관·전기 노후 교체 같은 항목은 눈에 안 띄지만 향후 10년 비용을 크게 좌우합니다. 보이는 자재만 보고 결정하지 마세요.</P>

        <H3>1-4. &lsquo;같이 하면 싸진다&rsquo;가 진짜인 경우</H3>
        <P>철거·도배·바닥재처럼 동선이 겹치는 공사는 한 번에 묶는 게 효율적이지만, 욕실·주방 가구는 별도 발주가 더 쌀 때도 있습니다. 두 가지 모두 견적 받아 비교하세요.</P>

        <H3>1-5. 잔공사·마감 디테일이 만족도를 가른다</H3>
        <P>실리콘 마감, 몰딩 끝선, 도배 이음매 같은 작은 디테일이 완성도를 좌우합니다. 견적에 &ldquo;마감 디테일&rdquo; 항목이 명시되어 있는지 반드시 확인하세요.</P>
      </Section>

      {/* 2. 좋은 업체 고르는 법 */}
      <Section title="2. 정직하고 실력있는 인테리어 업체 고르는 법">
        <H3>2-1. 가장 중요한 한 가지: 견적서 형식</H3>
        <P>좋은 업체는 자재 사양·수량·단가·소계를 항목별로 명시한 상세 견적서를 줍니다. 한 줄에 &ldquo;도배 공사 일체 ◯◯◯만원&rdquo;처럼 뭉뚱그린 견적은 위험 신호입니다.</P>

        <H3>2-2. 3개 이상 업체에서 같은 조건으로 견적받기</H3>
        <P>동일한 평면·동일한 사양으로 견적을 받아야 의미 있는 비교가 됩니다. apt-planner의 <strong>인테리어 계획서 PDF</strong>를 그대로 전달하면 누락 없이 비교 가능합니다.</P>

        <H3>2-3. 사후 관리 체크리스트</H3>
        <Bullet items={[
          'A/S 보증 기간 (보통 1~2년, 3년 이상이면 우수)',
          'A/S 대응 속도 — 최근 시공 고객에게 직접 확인 추천',
          '계약서에 추가금 발생 시 사전 협의 조항이 있는지',
          '폐기물 처리 책임, 운반 비용 포함 여부 명시 여부',
        ]} />

        <H3>2-4. 위험 신호 (이런 업체는 피하세요)</H3>
        <Bullet items={[
          '견적이 다른 곳 대비 30% 이상 저렴 → 자재 등급 다운그레이드 또는 추가금 폭탄 가능',
          '계약 전 큰 비율(50% 이상) 선입금 요구',
          '서면 계약서 없이 구두로만 진행하려는 곳',
          '동일 자재 사양인데 가격을 합리적으로 설명하지 못하는 곳',
          '시공 사례 사진을 제시하지 못하는 곳',
        ]} />
      </Section>

      {/* 3. 견적 요청·비교법 */}
      <Section title="3. apt-planner 계획서로 견적 요청·비교하는 법">
        <H3>3-1. 계획서 활용 — 1·2·3단계</H3>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#374151' }}>
          <li style={{ marginBottom: '6px' }}><strong>업체에 계획서 PDF를 그대로 전달</strong>합니다. (이메일 또는 채팅)</li>
          <li style={{ marginBottom: '6px' }}>업체에 <strong>&ldquo;단가만 산출해 회신&rdquo;</strong>이라고 요청합니다. 자재 임의 변경 시 명시 요구.</li>
          <li style={{ marginBottom: '6px' }}>회수된 견적은 <strong>같은 항목끼리 가로로 나란히 비교</strong>합니다.</li>
        </ol>

        <H3>3-2. 비교할 때 봐야 할 4가지</H3>
        <Bullet items={[
          '항목 누락 — 모든 항목이 채워졌는지 (빈칸은 위험)',
          '단가 분포 — 평균에서 크게 벗어난 항목은 추가 설명 요청',
          '추가금 조항 — 발생 가능 항목과 사전 협의 절차 명시 여부',
          '공기·보증 — 단순 비용 외에 시간·사후 관리도 비교 대상',
        ]} />

        <H3>3-3. 협상의 기술</H3>
        <P>여러 견적을 받아 비교한 결과를 다른 업체에 공유하지 말고, &ldquo;A 항목은 ◯◯만원, B 항목은 ◯◯만원이 평균인데 이 부분 설명 가능하실까요?&rdquo;처럼 데이터 기반으로 질문하세요. 무리한 가격 압박보다 합리적 비교가 결과적으로 좋은 시공을 끌어냅니다.</P>

        <H3>3-4. 마지막 체크 — 계약 직전</H3>
        <Bullet items={[
          '계약서에 자재 사양·수량·단가·소계가 모두 명시되어 있는가?',
          '추가금 발생 시 사전 협의 조항이 있는가?',
          'A/S 보증 기간과 범위가 명확한가?',
          '잔금은 완공·하자보수 점검 이후로 설정되어 있는가?',
        ]} />
      </Section>

      {/* 마무리 */}
      <div style={{
        marginTop: '32px',
        padding: '16px 18px',
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '6px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#075985', marginBottom: '6px' }}>
          📌 핵심 한 줄
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#0c4a6e', lineHeight: 1.6 }}>
          좋은 인테리어의 핵심은 좋은 업체를 만나는 게 아니라,
          <strong> 정확한 정보로 무장한 소비자가 좋은 업체를 알아볼 수 있게 되는 것</strong>입니다.
          apt-planner는 그 정보를 무료로 드립니다.
        </p>
      </div>

      <div style={{ marginTop: '20px', fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
        © apt-planner · 본 자료는 어떤 인테리어 업체와도 제휴·수수료 관계가 없습니다.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <h2 style={{
        fontSize: '16px',
        fontWeight: 800,
        color: '#111827',
        marginBottom: '12px',
        paddingBottom: '6px',
        borderBottom: '2px solid #111827',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#1f2937', margin: '14px 0 6px' }}>
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 8px', color: '#374151', fontSize: '12px', lineHeight: 1.65 }}>
      {children}
    </p>
  );
}

function Bullet({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '0 0 8px', paddingLeft: '20px', color: '#374151' }}>
      {items.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
    </ul>
  );
}

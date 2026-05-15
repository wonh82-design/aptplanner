'use client';

/**
 * 유료 보너스: 인테리어 실전 가이드 PDF — A4 가로.
 * 페이지 단위로 명시 분할, 페이지 중간에 콘텐츠 잘림 방지.
 */

import { PdfCover } from './PdfCover';
import { BodyPage } from './QuotePdfTemplate';

type Props = { rootRef?: React.Ref<HTMLDivElement> };

export function TipsPdfTemplate({ rootRef }: Props) {
  const date = new Date();
  const dateStr = date.toLocaleDateString('ko-KR');

  return (
    <div ref={rootRef}>
      {/* 표지 */}
      <div data-pdf-page="cover">
        <PdfCover
          category="인테리어 실전 가이드 · Premium"
          title="인테리어\n실전 가이드"
          subtitle="현장 15년 · 건축사 · 건축시공기술사의 경험으로 정리한 공간별·공종별 핵심 팁. 인테리어 처음 하는 분들이 가장 자주 놓치는 부분만 모았습니다."
          meta={['공종별 8종', '공간별 7종', '업체 선택', '계약 체크리스트']}
          issuedAt={date.toISOString()}
          tagline="가장 흔한 하자의 80%는 시공 단계의 작은 차이에서 시작됩니다."
        />
      </div>

      {/* PART 1. 공종별 — 2~3개씩 그룹화 */}
      <BodyPage date={dateStr} pageLabel="PART 1. 공종별 · 1/3">
        <PartHeader part="PART 1" title="공종별 핵심 팁" />
        <TipBlock
          icon="🪵"
          title="바닥재 — 5년 뒤 가장 후회하지 않는 선택"
          warning="하자 빈도: ★★★ (3위)"
          body={[
            '강마루는 일반 합판마루보다 단단해 반려동물·아이가 있는 집에 적합합니다. 단, 표면 코팅 등급이 낮으면 5년 안에 광택이 사라집니다. 코팅 7T 이상, 가능하면 9T 이상을 권장.',
            '강화마루는 가성비가 좋지만 들뜸·소음 이슈가 있습니다. 거실은 강마루, 작은방은 강화마루로 등급을 다르게 가는 게 일반적.',
            '장판은 가장 저렴하지만 10년 사용 시 어색합니다. 단기 거주(전세) 외엔 추천하지 않습니다.',
          ]}
          pro="바닥재 시공 전 평탄도 점검이 필수. 1~2mm 단차도 시공 후 들뜸의 원인. 견적에 '바닥 평탄 작업' 항목이 빠져 있다면 추가 요구."
        />
        <TipBlock
          icon="🧱"
          title="도배 — 가장 만만해 보이지만 디테일이 모든 것"
          warning="하자 빈도: ★★★★ (2위)"
          body={[
            '실크벽지는 합지보다 내구성·세척성이 좋지만, 통기성이 낮아 결로가 잘 생기는 외벽 쪽 안방에는 합지가 더 유리할 수 있습니다.',
            '벽지 등급보다 더 중요한 건 바탕면 처리. 기존 벽지를 떼지 않고 그 위에 덧대는 시공은 들뜸·곰팡이 원인.',
            '몰딩·문틀 주변 마감이 만족도를 가릅니다. 시공 전 “마감 디테일 처리 방식”을 문서로 확인.',
          ]}
          pro="도배는 반드시 24시간 자연 건조가 필요. 공기를 단축하려고 보일러를 강하게 틀면 들뜸·찢어짐 발생. 견적에 '건조 기간' 명시 요구."
        />
      </BodyPage>

      <BodyPage date={dateStr} pageLabel="PART 1. 공종별 · 2/3">
        <TipBlock
          icon="🪟"
          title="샷시(외창) — 비용의 20%, 만족도의 50%"
          warning="하자 빈도: ★★★★★ (1위)"
          body={[
            '샷시는 본체보다 시공이 더 중요합니다. 같은 LX·KCC 제품이라도 시공자에 따라 단열·소음 성능이 30% 이상 차이.',
            '단열은 PVC 프레임 깊이가 핵심. 224mm 이상(이중창 기준), 가능하면 250mm 권장. 단열재 충진 여부도 견적에 명시 요구.',
            '소음 차단은 22mm 두께의 페어유리(복층유리) 이상이 필요. 진공유리(슈퍼세이브 등)는 25% 비싸지만 효과 큼.',
            '확장 시 새로 생기는 외창은 단열재가 충분히 들어가지 않으면 결로의 주범. 단열재 50T 이상 + 콘크리트 면 단열 시공 확인.',
          ]}
          pro="샷시 시공 후 외기 누설 테스트(촛불·연기 테스트)를 반드시 요구. 견적 단계에서 'A/S 보증 3년 이상' 조항이 있는지 확인."
        />
        <TipBlock
          icon="❄️"
          title="단열 — 보이지 않는데 평생 만족도를 결정"
          warning="하자 빈도: ★★★★ · 발견까지 평균 2년"
          body={[
            '단열재는 두께가 가장 중요. 외벽 기준 50T 이상이 표준, 외기 직접 면(북향 외벽·확장부)은 75T 이상 권장.',
            '단열재 종류는 EPS(흰색 스티로폼) < XPS(아이소핑크) < PF보드(페놀폼) 순으로 단열 성능이 좋아짐. 가격도 비례.',
            '단열재만 시공하고 기밀 시공(테이프 마감)을 빼면 효과가 50% 이상 떨어짐. 견적에 “기밀 테이프 시공” 명시 요구.',
          ]}
          pro="단열재 시공 직후 단열재 위에 직접 손을 대 차가운 지점이 있는지 확인(저녁 시간 권장). 차가운 부분은 단열재 미충진."
        />
        <TipBlock
          icon="💧"
          title="욕실 방수 — 한 번 빠뜨리면 평생 골칫거리"
          warning="하자 빈도: ★★★★★ · 누수 시 아랫집 분쟁"
          body={[
            '욕실 방수는 액체방수(아덱스 등 탄성도막) 1회 + 시트방수를 함께 시공하는 게 표준. 한 가지만 시공하면 5년 안에 누수 위험.',
            '코너 부위·배수구 주변은 보강 방수가 별도로 필요. 견적에 “코너 보강 방수” 항목 확인.',
            '방수 후 24~48시간 담수 테스트가 필수. 이 과정 없이 타일 시공하면 누수 발견이 늦어짐.',
          ]}
          pro="방수 시공 사진을 단계별로 받으세요. 코너 보강·배수구 주변·시트 겹침 부위가 사진에 명확히 보여야 함. 추후 분쟁 시 증거."
        />
      </BodyPage>

      <BodyPage date={dateStr} pageLabel="PART 1. 공종별 · 3/3">
        <TipBlock
          icon="🍽️"
          title="주방가구 — 보이는 도어보다 보이지 않는 몸체"
          warning="하자 빈도: ★★★ · 발견까지 평균 3~5년"
          body={[
            '주방가구의 핵심은 몸체(상·하부장 본체). 도어가 아무리 예뻐도 몸체가 일반 PB면 습기에 약해 변형. MDF 또는 합판 본체 권장.',
            '상판은 하이막스 < 인조대리석 < 천연석/세라믹 순. 단, 천연석은 산성 음식(레몬 등)에 약함.',
            '하드웨어(경첩·서랍 슬라이드)는 댐퍼 기능 있는 국산 또는 블룸(Blum) 같은 수입 제품 권장.',
            '후드는 흡입력 m³/h 표기와 소음 dB 표기를 함께 비교. 950 m³/h 이상이 표준.',
          ]}
          pro="설치 후 수평·수직 확인이 중요. 도어 들어맞음(여닫이 간격)이 균일한지 시공 직후 확인, 불일치 시 즉시 보정 요구."
        />
        <TipBlock
          icon="💡"
          title="조명 — 분위기뿐 아니라 전기 부하 설계까지"
          body={[
            '거실은 색온도 3000K(전구색)~4000K(주백색)이 가장 무난. 5000K 이상은 사무실 느낌이라 비추.',
            '주방은 4000~5000K로 밝게. 식기 색 구분이 잘 됨.',
            '간접조명은 디머(밝기 조절) 함께 시공해야 만족도 큼.',
            '매그네틱 레일 조명은 5년 이내 트렌드 변화 가능성 있으니 거실 일부만 적용 권장.',
          ]}
          pro="조명 시공 전 분전반 용량 확인 필수. 다운라이트 다수 + 시스템에어컨 + 인덕션 동시 사용 시 분전반 차단기 용량 점검."
        />
        <TipBlock
          icon="🔲"
          title="몰딩·걸레받이 — 무몰딩이 정말 답일까?"
          body={[
            '무몰딩은 시각적으로 깔끔하지만, 천장-벽 직각이 어긋나면 매우 어색. 시공 난이도가 훨씬 높음.',
            '"무몰딩 + 무걸레받이" 조합은 시공자 실력에 크게 의존. 시공 사례 사진을 반드시 확인.',
            '걸레받이는 PVC(가성비)·MDF(표준)·우드(고급) 순. 청소·내구성 면에서 PVC가 실용적.',
          ]}
          pro="무몰딩은 천장·벽 마감 평탄도가 ±2mm 이내여야 함. 시공 전 평탄도 점검 항목이 견적에 있는지 확인."
        />
      </BodyPage>

      {/* PART 2. 공간별 — 2~3개씩 */}
      <BodyPage date={dateStr} pageLabel="PART 2. 공간별 · 1/3">
        <PartHeader part="PART 2" title="공간별 핵심 팁" />
        <TipBlock
          icon="🛋️"
          title="거실 — 가족이 가장 오래 머무는 공간"
          body={[
            '거실은 전체 인테리어 예산의 25~30%. 이 공간만큼은 한 등급 위 자재 권장.',
            '확장 여부가 가장 큰 결정 요소. 확장하면 거실이 약 30% 넓어지지만, 새 외창 단열이 부실하면 결로의 주범.',
            '조명 설계가 만족도를 가름. 메인+간접+보조(스탠드) 3중 조명이 표준. 디머 설치 권장.',
            'TV 벽면은 콘센트 위치를 미리 계산. 매립 시공이 깔끔하지만 추후 위치 변경 어려움.',
          ]}
          defect="자주 발생: 확장부 결로(원인 70%가 단열재 미충진), TV 벽면 콘센트 위치 잘못."
        />
        <TipBlock
          icon="🍳"
          title="주방 — 동선이 모든 것"
          body={[
            '핵심은 싱크대-가스/인덕션-냉장고의 삼각형 동선. 이 거리가 멀면 매일 불편.',
            '대면형 주방은 거실과의 연결성↑, 단 후드 흡입력 더 중요(소음).',
            '인덕션 사용 시 220V 전용선 신설 필수. 가스→인덕션 변경 시 분전반에서 별도 배선.',
            '주방 조명은 매그네틱 + 식탁 위 펜던트 조합이 트렌드. 펜던트 위치를 식탁 정확한 위치에 맞춰야.',
          ]}
          defect="자주 발생: 인덕션 전용선 누락(가장 흔함), 상판-싱크볼 결합부 실리콘 처리 불량으로 누수."
        />
      </BodyPage>

      <BodyPage date={dateStr} pageLabel="PART 2. 공간별 · 2/3">
        <TipBlock
          icon="🛁"
          title="욕실 — 가장 중요한 공간, 가장 자주 실수하는 공간"
          body={[
            '욕실 인테리어의 80%는 방수가 결정. 타일이 예뻐도 방수 부실하면 누수→아랫집 분쟁.',
            '환풍기는 흡입력 큰 모델로. 100m³/h 이상 권장. 약하면 곰팡이 원인.',
            '바닥 구배(경사)가 배수구로 잘 흘러가는지 시공 후 물을 부어 확인.',
            '세면대 하부장은 습기에 약함. 도어 한 칸을 통풍 그릴로 두는 디자인이 위생적.',
          ]}
          defect="자주 발생: ① 방수 부실 누수(1위) ② 바닥 구배 불량으로 물고임 ③ 줄눈 곰팡이 ④ 환풍 부족으로 곰팡이."
        />
        <TipBlock
          icon="🛏️"
          title="안방 — 수면 품질을 위한 공간"
          body={[
            '단열·소음 차단이 거실보다 더 중요. 외벽 면 단열재 75T 이상 권장.',
            '안방 욕실이 있다면 욕실 환풍기·문 틈 처리가 침실 습도에 영향.',
            '붙박이장은 안방의 90%가 시공. 슬라이딩 도어가 공간 활용 좋지만 단가 높음.',
            '실링팬은 여름철 에어컨 보조로 효과 있지만 소음 모델 확인(30dB 이하 권장).',
          ]}
          defect="자주 발생: 외벽 면 결로·곰팡이(단열 부실), 붙박이장 도어 슬라이딩 레일 변형(5년차+)."
        />
      </BodyPage>

      <BodyPage date={dateStr} pageLabel="PART 2. 공간별 · 3/3">
        <TipBlock
          icon="📚"
          title="작은방 — 등급은 가성비로, 기능만 챙기기"
          body={[
            '거실·안방 대비 사용 빈도 낮음. 자재 등급을 한 단계 낮춰 예산 절약 가능.',
            '단, 외벽 면 단열은 동일하게 — 결로·곰팡이는 자녀 건강에 영향.',
            '붙박이장이나 책상 설치 위치에 콘센트가 충분한지 미리 계획.',
            '추후 자녀 방으로 사용 시 필요한 인터넷·TV 단자 위치도 미리 시공.',
          ]}
          defect="자주 발생: 외벽 면 곰팡이(단열 누락), 콘센트 부족으로 멀티탭 사용→화재 위험."
        />
        <TipBlock
          icon="🚪"
          title="현관·복도 — 인테리어의 첫인상"
          body={[
            '신발장은 한샘·리바트 등 기성 가구가 가성비 좋음. 사제 가구는 매우 비쌈.',
            '중문은 외풍 차단·소음·미관 3중 효과. 슬라이딩 3연동이 표준.',
            '현관 타일은 미끄럼 방지 등급 R10 이상 필수. 비 오는 날 안전.',
          ]}
          defect="자주 발생: 중문 슬라이딩 레일 변형(약체 모델), 신발장 도어 처짐(저급 경첩)."
        />
        <TipBlock
          icon="🌿"
          title="발코니·다용도실 — 가장 무시되지만 가장 손쉬운 업그레이드"
          body={[
            '확장하지 않는 발코니는 도장만 새로 해도 분위기가 크게 달라짐. 비용 대비 만족도 큼.',
            '바닥 타일은 미끄럼 방지 + 청소 편의 위주. 600각 타일이 청소·시공 모두 효율적.',
            '다용도실은 환기·세탁기 진동·배수가 핵심. 환풍기 점검 + 세탁기 받침대(진동 흡수) 추천.',
          ]}
          defect="자주 발생: 발코니 도장 박리(시공 전 청소·프라이머 누락), 다용도실 배수 막힘."
        />
      </BodyPage>

      {/* PART 3. 업체 선택 */}
      <BodyPage date={dateStr} pageLabel="PART 3. 업체 선택 & 견적 비교">
        <PartHeader part="PART 3" title="정직한 업체 고르고 견적 비교하기" />
        <TipBlock
          icon="✅"
          title="좋은 업체의 특징"
          body={[
            '견적서에 자재 사양·수량·단가·소계를 항목별로 명시.',
            '추가금 발생 가능 항목을 견적 단계에서 미리 안내.',
            '시공 사례 사진 + 시공 후 1년 이상 지난 고객의 추천을 받을 수 있음.',
            'A/S 보증 기간이 2년 이상이고, 보증 범위가 계약서에 명문화.',
            '계약 시 선수금 비율이 30% 이하.',
          ]}
        />
        <TipBlock
          icon="🚫"
          title="피해야 할 위험 신호 (2개 이상 시 재고)"
          warning="2개 이상 해당 시 재고 권장"
          body={[
            '견적이 다른 곳 대비 30% 이상 저렴 — 자재 다운그레이드 또는 추가금 폭탄 가능.',
            '계약 전 큰 비율(50% 이상) 선입금 요구.',
            '서면 계약서 없이 구두로만 진행하려는 경우.',
            '동일 자재 사양인데 가격을 합리적으로 설명하지 못함.',
            '시공 사례 사진을 제시하지 못하거나, 다른 업체 사진을 가져옴.',
            'A/S 조항이 모호하거나 "구두 약속" 수준에 머무름.',
          ]}
        />
      </BodyPage>

      <BodyPage date={dateStr} pageLabel="견적 비교 · 계약 체크리스트">
        <TipBlock
          icon="📋"
          title="apt-planner 계획서로 견적 비교하는 5단계"
          body={[
            '1단계 — 본 계획서 PDF를 3~5개 업체에 이메일/카톡으로 전달.',
            '2단계 — 업체에게 "단가만 채워 회신" 명확히 요청. 자재 변경 시 명시 의무화.',
            '3단계 — 회수된 견적을 같은 항목끼리 가로로 나란히 비교 (스프레드시트).',
            '4단계 — 평균에서 ±20% 벗어난 항목은 업체에 추가 설명 요청.',
            '5단계 — 최종 후보 2~3곳에 현장 실측·미팅 요청 후 결정.',
          ]}
        />
        <TipBlock
          icon="📝"
          title="계약 직전 마지막 체크리스트"
          body={[
            '자재 사양·수량·단가·소계가 모두 명시되어 있는가?',
            '추가금 발생 시 사전 협의 조항이 있는가?',
            'A/S 보증 기간(2년 이상) + 보증 범위가 명확한가?',
            '잔금은 완공·하자보수 점검 이후로 설정되어 있는가?',
            '폐기물 처리·운반비 등 부대비용 포함 여부가 명시되어 있는가?',
            '시공 사진 단계별 공유 조건이 명시되어 있는가? (분쟁 시 증거)',
            '구조 변경(가벽 철거 등) 시 구청 신고 책임 주체가 명확한가?',
          ]}
        />

        {/* 마무리 */}
        <div style={{
          marginTop: '24px',
          padding: '18px 22px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
          border: '1px solid #86efac',
          borderRadius: '10px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#14532d', marginBottom: '6px' }}>
            📌 핵심 한 줄
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#15803d', lineHeight: 1.7 }}>
            좋은 인테리어의 핵심은 좋은 업체를 만나는 게 아니라,
            <strong> 정확한 정보로 무장한 소비자가 좋은 업체를 알아볼 수 있게 되는 것</strong>입니다.
          </p>
        </div>

        <div style={{ marginTop: '18px', fontSize: '10px', color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
          © apt-planner — 본 자료는 어떤 인테리어 업체와도 제휴·수수료 관계가 없습니다.<br />
          대형 건설사 15년 시공·CS 경험, 건축사·건축시공기술사가 직접 검증한 데이터를 기반으로 작성되었습니다.
        </div>
      </BodyPage>
    </div>
  );
}

// =====================================================
// 보조 컴포넌트
// =====================================================

function PartHeader({ part, title }: { part: string; title: string }) {
  return (
    <div style={{ margin: '0 0 18px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        padding: '4px 12px',
        background: '#111827',
        color: '#ffffff',
        fontSize: '10px',
        fontFamily: 'monospace',
        letterSpacing: '0.08em',
        borderRadius: '4px',
        marginBottom: '8px',
      }}>{part}</div>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
        {title}
      </h2>
      <div style={{ width: '40px', height: '2px', background: '#60a5fa', margin: '8px auto 0' }} />
    </div>
  );
}

function TipBlock({
  icon, title, body, pro, defect, warning,
}: {
  icon: string;
  title: string;
  body: string[];
  pro?: string;
  defect?: string;
  warning?: string;
}) {
  return (
    <div style={{
      marginBottom: '14px',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <div style={{
        background: '#f9fafb',
        padding: '10px 16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h3>
        </div>
        {warning && (
          <span style={{
            fontSize: '10px',
            padding: '3px 9px',
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: '999px',
            fontWeight: 600,
          }}>
            ⚠️ {warning}
          </span>
        )}
      </div>

      <div style={{ padding: '12px 16px' }}>
        <ul style={{ margin: '0 0 0 16px', padding: 0, color: '#374151', fontSize: '11.5px', lineHeight: 1.65 }}>
          {body.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
        </ul>

        {pro && (
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: '#eff6ff',
            borderLeft: '3px solid #3b82f6',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#1e40af',
            lineHeight: 1.6,
          }}>
            <strong>전문가의 한마디:</strong> {pro}
          </div>
        )}

        {defect && (
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: '#fef2f2',
            borderLeft: '3px solid #ef4444',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#991b1b',
            lineHeight: 1.6,
          }}>
            <strong>⚠️ {defect}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

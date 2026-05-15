/**
 * 서비스 가격·기능 상수.
 * 1) 무료 - 예상 공사비 상세 PDF
 * 2) 2.9만 - 인테리어 계획 스펙북 + 꿀팁
 * 3) 30만 → 15만 (5월 한정 50% 할인) - 전문가 컨설팅
 */

export const SERVICE_FREE = {
  id: 'free',
  icon: '📄',
  name: '예상 공사비 상세 내역',
  badge: '무료',
  price: 0,
  priceText: '무료',
  description: '총 공사비 + 공종·공간별 합계 + 라인 60개+ 상세 PDF',
  features: [
    '총 공사비 (부가세 별도/포함)',
    '평당 단가',
    '공종별·공간별 합계',
    '상세 라인 60+ 항목',
  ],
  cta: '바로 다운로드',
} as const;

export const SERVICE_SPEC = {
  id: 'spec',
  icon: '📋',
  name: '우리집 인테리어 계획 스펙북',
  badge: '한끼 식사값',
  price: 29000,
  priceText: '29,000원',
  description: '여러 업체에서 같은 조건으로 비교 견적을 받고 추가금 분쟁을 방지하기 위한 문서 패키지',
  features: [
    '시공자용 상세 사양 계획서 PDF',
    '공종·공간별 시공 매트릭스',
    '업체 단가 기재용 빈 표',
    '견적 회신 체크리스트',
    '추가금 사전 협의 항목',
  ],
  bonusTitle: '+ 인테리어 꿀팁 PDF 보너스',
  bonusFeatures: [
    '공간별 인테리어 팁 (거실/주방/욕실/안방/...)',
    '공종별 핵심 팁 (바닥·도배·샷시·단열·욕실방수·...)',
    '견적 비교의 정석',
    '좋은 업체 고르는 법',
  ],
  cta: '신청하기',
  valueAnchor: '추가금 분쟁 1건 = 평균 200~500만원',
  savingsLabel: '예상 절감: 500~1,000만원',
} as const;

export const SERVICE_CONSULT = {
  id: 'consult',
  icon: '🧑‍🔧',
  name: '전문가 1:1 컨설팅',
  badge: '🔥 출시 기념 50% 할인',
  price: 150000,
  originalPrice: 300000,
  priceText: '150,000원',
  originalPriceText: '300,000원',
  description: '건축사 + 시공기술사가 직접 우리집 도면·사진을 보고 가성비 공사범위를 최적 제안',
  features: [
    '계획 스펙북 + 꿀팁 PDF 전체 포함',
    '도면·사진 기반 우리집 진단',
    '예산에 맞춘 공사범위 최적화',
    '타일 덧방 가능 여부 진단',
    '문틀 재사용 가능 여부 진단',
    '샷시 교체 필요성 판단',
    '주방 대면형 가능 여부 검토',
    '천장 목공사 필요성 판단',
  ],
  bonusTitle: '+ 업체 견적 비교 서비스',
  bonusFeatures: [
    '받으신 업체 견적을 보내주시면',
    '계획서 기준으로 누락·과다·부족 항목 분석',
    '협상 포인트 1:1 코칭',
  ],
  cta: '컨설팅 신청',
  valueAnchor: '컨설팅 한 번으로 평균 500~3,000만원 절감',
  savingsLabel: '예상 절감: 500~3,000만원',
  promotionLabel: '5월 한정 50% 할인 + 견적 비교 서비스 무료',
} as const;

export const SERVICES = [SERVICE_FREE, SERVICE_SPEC, SERVICE_CONSULT] as const;

/** 평형·범위 기반 예상 절감액 추정 */
export function estimateSavings(pyeong: number): { min: number; max: number } {
  // 30평 기준 500~3000만원, 평형에 비례 (단순화)
  const base = pyeong > 0 ? pyeong : 30;
  return {
    min: Math.round((base / 30) * 5_000_000 / 1_000_000) * 1_000_000,
    max: Math.round((base / 30) * 30_000_000 / 1_000_000) * 1_000_000,
  };
}

export function fmtSaving(amount: number): string {
  if (amount >= 100_000_000) return (amount / 100_000_000).toFixed(1) + '억원';
  if (amount >= 10_000) return Math.round(amount / 10_000).toLocaleString('ko-KR') + '만원';
  return amount.toLocaleString('ko-KR') + '원';
}

/**
 * GA4 커스텀 이벤트 트래킹 헬퍼.
 *
 * 사용 패턴:
 *   import { track } from '@/lib/analytics';
 *   track('download_quote_pdf', { pyeong: 30, grade: '표준', grand_total: 35_000_000 });
 *
 * 동작:
 *  - NEXT_PUBLIC_GA_ID가 설정되어 있고 gtag.js가 로드된 환경에서만 실제 이벤트 발송.
 *  - SSR / GA 미연동 환경에서는 silent no-op (오류 없음).
 *  - dev 환경에서는 console.debug로 발송 내역 로깅 (디버깅 용이).
 *
 * GA4 명명 규칙:
 *  - 이벤트명: snake_case, 40자 이하, 영문 동사 기반
 *  - 파라미터명: snake_case, 40자 이하
 *  - 값은 string/number/boolean — 객체는 자동 직렬화 불가, 펴서 보내기
 */

/**
 * 우리가 추적하는 이벤트 — 타입으로 enumerate하여 오타·누락 방지.
 * 신규 이벤트 추가 시 여기에 한 줄 추가.
 */
export type AnalyticsEvent =
  // 산출 위저드 단계 진행 (다음 단계로 이동 성공 시)
  | 'complete_step'
  // 빠른 시작 프리셋 선택
  | 'select_preset'
  // Step 4 무료 PDF 다운로드 성공
  | 'download_quote_pdf'
  // 스펙북 신청 모달 오픈
  | 'apply_spec_book_open'
  // 스펙북 신청 폼 제출 성공
  | 'submit_spec_request'
  // 컨설팅 신청 모달 오픈
  | 'apply_consult_open'
  // 컨설팅 신청 폼 제출 성공
  | 'submit_consult_request'
  // 우리집 인테리어 계획서(₩5,900) 신청 제출 성공
  | 'submit_plan_request';

type GtagParams = Record<string, string | number | boolean | undefined>;

/** gtag 전역 함수 타입 (next/script로 로드됨) */
declare global {
  interface Window {
    gtag?: (command: 'event' | 'config' | 'js', target: string, params?: GtagParams) => void;
  }
}

/**
 * GA4 커스텀 이벤트 발송.
 * gtag 미로드 / GA_ID 없음 / SSR 환경에서는 no-op.
 */
export function track(event: AnalyticsEvent, params: GtagParams = {}): void {
  // SSR 가드
  if (typeof window === 'undefined') return;

  // dev 로그 — 어떤 이벤트가 발송되는지 콘솔에서 확인 가능
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, params);
  }

  // gtag 미로드 (GA_ID 없거나 next/script 로딩 전) → silent no-op
  if (typeof window.gtag !== 'function') return;

  // GA4 API: gtag('event', '<eventName>', { ...params })
  try {
    window.gtag('event', event, params);
  } catch {
    /* GA 실패해도 앱 동작에는 영향 없음 */
  }
}

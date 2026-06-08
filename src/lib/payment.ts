/**
 * 입금 안내용 계좌 정보.
 *
 * 기본값은 운영 계좌로 채워져 있다. 변경이 필요하면 .env의 NEXT_PUBLIC_PAYMENT_* 로 override:
 *   NEXT_PUBLIC_PAYMENT_BANK=국민은행
 *   NEXT_PUBLIC_PAYMENT_NUMBER=84080201081824
 *   NEXT_PUBLIC_PAYMENT_HOLDER=박경희
 *
 * 환경변수가 설정되면 그 값이 우선한다. 빈 문자열로 두면 '—' placeholder + 복사 버튼 숨김.
 */

export const PAYMENT_ACCOUNT = {
  bank: process.env.NEXT_PUBLIC_PAYMENT_BANK ?? '국민은행',
  number: process.env.NEXT_PUBLIC_PAYMENT_NUMBER ?? '84080201081824',
  holder: process.env.NEXT_PUBLIC_PAYMENT_HOLDER ?? '박경희',
};

/** 계좌 정보가 모두 설정되어 있는지 */
export const PAYMENT_ACCOUNT_READY =
  PAYMENT_ACCOUNT.bank.length > 0 &&
  PAYMENT_ACCOUNT.number.length > 0 &&
  PAYMENT_ACCOUNT.holder.length > 0;

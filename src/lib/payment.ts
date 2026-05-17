/**
 * 입금 안내용 계좌 정보.
 *
 * 현재 유료서비스 준비 중 — 계좌 정보는 빈 상태로 두고, 출시 시점에 .env로 채워 넣는다.
 * 운영 시 .env에 NEXT_PUBLIC_PAYMENT_* 로 override:
 *   NEXT_PUBLIC_PAYMENT_BANK=우리은행
 *   NEXT_PUBLIC_PAYMENT_NUMBER=1002-XXX-XXXXXX
 *   NEXT_PUBLIC_PAYMENT_HOLDER=홍길동
 *
 * 빈 값이면 모달에서 '—' placeholder가 표시되고 복사 버튼은 숨겨진다.
 */

export const PAYMENT_ACCOUNT = {
  bank: process.env.NEXT_PUBLIC_PAYMENT_BANK ?? '',
  number: process.env.NEXT_PUBLIC_PAYMENT_NUMBER ?? '',
  holder: process.env.NEXT_PUBLIC_PAYMENT_HOLDER ?? '',
};

/** 계좌 정보가 모두 설정되어 있는지 */
export const PAYMENT_ACCOUNT_READY =
  PAYMENT_ACCOUNT.bank.length > 0 &&
  PAYMENT_ACCOUNT.number.length > 0 &&
  PAYMENT_ACCOUNT.holder.length > 0;

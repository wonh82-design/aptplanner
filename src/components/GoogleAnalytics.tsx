/**
 * Google Analytics 4 — gtag.js 로드.
 * .env의 NEXT_PUBLIC_GA_ID가 있을 때만 활성화. 없으면 렌더 안 함.
 *
 * GA4 한 속성에 여러 서브도메인(apt-planner.com / app.apt-planner.com)을
 * 같은 측정 ID로 심으면 자동으로 모든 도메인 트래픽이 통합 추적됨.
 * 이벤트 파라미터의 `page_location` / `hostname`으로 서브도메인 구분 가능.
 */

import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}

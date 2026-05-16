'use client';

/**
 * PDF에 내장되는 공유용 QR 코드.
 * html2canvas-pro가 캡처할 수 있도록 미리 data URL로 생성해 <img>로 렌더.
 *
 * 생성 시점: 컴포넌트 마운트 시 qrcode 라이브러리로 비동기 생성 → setState.
 * PDF export 전에 ready 상태가 되어야 안전. 일반적으로 100ms 이내 완료.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Props = {
  /** QR이 가리킬 URL. 일반적으로 https://apt-planner.kr 또는 /calc */
  url: string;
  /** 픽셀 단위 크기 (정사각형) */
  size?: number;
  /** 캡션 텍스트 (선택) */
  caption?: string;
};

export function PdfShareQr({ url, size = 110, caption = '같은 결과를 다른 분도 받아볼 수 있어요' }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(d => {
      if (mounted) setDataUrl(d);
    }).catch(() => { /* QR 생성 실패 시 무시 — PDF는 캡션만 표시 */ });
    return () => { mounted = false; };
  }, [url, size]);

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      padding: '10px 14px',
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
    }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        borderRadius: '6px',
        overflow: 'hidden',
      }}>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="apt-planner 공유 QR" width={size} height={size} style={{ display: 'block' }} />
        ) : (
          <span style={{ fontSize: '9px', color: '#9ca3af' }}>QR…</span>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', fontWeight: 700, marginBottom: '2px' }}>
          apt-planner 공유 QR
        </div>
        <div style={{ fontSize: '12px', color: '#111827', fontWeight: 700, lineHeight: 1.35 }}>
          {caption}
        </div>
        <div style={{ fontSize: '9.5px', color: '#6b7280', marginTop: '4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {url}
        </div>
      </div>
    </div>
  );
}

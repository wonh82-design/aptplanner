'use client';

/**
 * 공통 PDF 표지 — 전문적·세련된 디자인.
 * A4 비율 (210×297mm → 760×1075px @ 96dpi-ish)
 */

type Props = {
  /** 표지 카테고리 (예: '예상 공사비 보고서') */
  category: string;
  /** 메인 타이틀 */
  title: string;
  /** 서브 타이틀 (1-2줄) */
  subtitle?: string;
  /** 우측 상단 메타 (예: 평형·등급) */
  meta?: string[];
  /** 발행일 ISO */
  issuedAt: string;
  /** 문서 번호 (quote_id 등) */
  docNo?: string;
  /** 표지 하단 강조 카피 */
  tagline?: string;
};

export function PdfCover({
  category, title, subtitle, meta = [], issuedAt, docNo, tagline,
}: Props) {
  const date = new Date(issuedAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div
      style={{
        width: '760px',
        height: '1075px',
        padding: '60px 56px',
        background: 'linear-gradient(180deg, #111827 0%, #1f2937 60%, #0f172a 100%)',
        color: '#ffffff',
        fontFamily: 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* 상단 브랜드 + 카테고리 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: '#ffffff',
            color: '#111827',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '16px',
          }}>a</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>apt-planner</div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>인테리어 예산 산정 도구</div>
          </div>
        </div>

        <div style={{
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '999px',
          fontSize: '11px',
          letterSpacing: '0.04em',
        }}>
          {category}
        </div>
      </div>

      {/* 중앙 타이틀 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '40px' }}>
        <div style={{
          width: '60px',
          height: '3px',
          background: '#60a5fa',
          marginBottom: '28px',
        }} />

        <h1 style={{
          fontSize: '48px',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-0.025em',
          margin: 0,
        }}>
          {title}
        </h1>

        {subtitle && (
          <p style={{
            fontSize: '17px',
            color: '#d1d5db',
            lineHeight: 1.6,
            margin: '20px 0 0',
            maxWidth: '600px',
          }}>
            {subtitle}
          </p>
        )}

        {meta.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '32px' }}>
            {meta.map((m, i) => (
              <span key={i} style={{
                padding: '6px 12px',
                background: 'rgba(59, 130, 246, 0.18)',
                border: '1px solid rgba(96, 165, 250, 0.35)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#dbeafe',
                fontWeight: 500,
              }}>
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 하단 정보 영역 */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '24px' }}>
        {tagline && (
          <p style={{
            fontSize: '13px',
            color: '#93c5fd',
            fontStyle: 'italic',
            lineHeight: 1.6,
            margin: '0 0 24px',
            maxWidth: '500px',
          }}>
            &ldquo;{tagline}&rdquo;
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <Field label="발행일" value={date} />
          {docNo && <Field label="문서 번호" value={docNo} mono />}
          <Field label="중립성" value="업체 수수료·제휴 0건" emphasize />
        </div>
      </div>

      {/* 데코 */}
      <div style={{
        position: 'absolute',
        top: '0',
        right: '0',
        width: '380px',
        height: '380px',
        background: 'radial-gradient(circle at center, rgba(59,130,246,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function Field({ label, value, mono = false, emphasize = false }: {
  label: string; value: string; mono?: boolean; emphasize?: boolean;
}) {
  return (
    <div>
      <div style={{
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#9ca3af',
        marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '12px',
        fontFamily: mono ? 'monospace' : undefined,
        fontWeight: 600,
        color: emphasize ? '#86efac' : '#ffffff',
      }}>
        {value}
      </div>
    </div>
  );
}

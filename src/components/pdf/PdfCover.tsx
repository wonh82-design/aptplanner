'use client';

/**
 * 공통 PDF 표지 — A4 가로 (297×210mm @ 96dpi ≈ 1060×730px).
 */

type Props = {
  category: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  issuedAt: string;
  docNo?: string;
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
        width: '1060px',
        height: '720px',
        padding: '56px 64px',
        background: 'linear-gradient(135deg, #0b1220 0%, #1f2937 55%, #0f172a 100%)',
        color: '#ffffff',
        fontFamily: 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* 상단 브랜드 + 카테고리 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: '#ffffff',
            color: '#111827',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '18px',
          }}>a</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>apt-planner</div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>인테리어 예산 산정 도구</div>
          </div>
        </div>

        <div style={{
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '999px',
          fontSize: '11px',
          letterSpacing: '0.05em',
        }}>
          {category}
        </div>
      </div>

      {/* 중앙 타이틀 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: '20px' }}>
        <div style={{ maxWidth: '720px' }}>
          <div style={{
            width: '72px',
            height: '3px',
            background: '#60a5fa',
            marginBottom: '28px',
          }} />

          <h1 style={{
            fontSize: '54px',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.028em',
            margin: 0,
            whiteSpace: 'pre-line',
          }}>
            {title}
          </h1>

          {subtitle && (
            <p style={{
              fontSize: '16px',
              color: '#d1d5db',
              lineHeight: 1.6,
              margin: '20px 0 0',
              maxWidth: '640px',
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
      </div>

      {/* 하단 정보 */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '20px' }}>
        {tagline && (
          <p style={{
            fontSize: '13px',
            color: '#93c5fd',
            fontStyle: 'italic',
            lineHeight: 1.55,
            margin: '0 0 18px',
            maxWidth: '640px',
          }}>
            &ldquo;{tagline}&rdquo;
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          <Field label="발행일" value={date} />
          {docNo && <Field label="문서 번호" value={docNo} mono />}
          <Field label="중립성" value="업체 수수료·제휴 0건" emphasize />
        </div>
      </div>

      {/* 데코 */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '480px',
        height: '480px',
        background: 'radial-gradient(circle at center, rgba(59,130,246,0.18) 0%, transparent 70%)',
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

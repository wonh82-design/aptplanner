'use client';

/**
 * 무료 예상 공사비 PDF — A4 가로 (1060×720).
 *
 * 구성 (표지 + 본문 4페이지 = PDF 5페이지):
 *   · 표지        : 제목 + 서비스 개략 소개
 *   · PDF 2페이지 : 우리집 현황 및 공사 범위
 *   · PDF 3페이지 : 총 예상 공사비 + 공종별 공사비 + 공사비 범위 설명
 *   · PDF 4페이지 : 공종별 선택 자재 — 가성비·표준·고급 등급별 주력자재 비교
 *                  (자재 라인 수가 많으면 4-A, 4-B로 자동 분할)
 *   · PDF 5페이지 : 유료 서비스 소개 (스펙북 + 전문가 컨설팅)
 *
 * 라인 항목 상세 단가 표는 무료 PDF에서 제외 — 유료(인테리어 계획서)에서 제공.
 */

import type { Quote, RoomId, RoomScope, GradeGroup } from '@/lib/types';
import { fmtKRW, fmtKRWShort, REGION_LABEL, AGE_LABEL } from '@/lib/calculator';
import { getPrimaryMaterial, labelOf } from '@/lib/materials';
import { PdfCover } from './PdfCover';
import { PdfShareQr } from './PdfShareQr';
import { ROOM_WORK_META, GLOBAL_GROUPS, ROOM_META } from '@/lib/scope-meta';
import { activeRooms } from '@/lib/areas';

/** PDF에 내장되는 공유 URL — 환경변수 우선, 없으면 기본값 */
const SHARE_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) || 'https://apt-planner.kr';

type Props = {
  quote: Quote;
  gradeLabel: string;
  rootRef?: React.Ref<HTMLDivElement>;
};

export function QuotePdfTemplate({ quote, gradeLabel, rootRef }: Props) {
  const date = new Date(quote.created_at).toLocaleDateString('ko-KR');
  const grand = quote.totals.grand_total;
  const visibleRooms = activeRooms(quote.property) as RoomId[];

  // 확장 시공 예정 공간 — current=false && after=true
  const expansionRooms = visibleRooms.filter(r => {
    const rs = quote.scope.rooms[r];
    return rs && !rs.expansion_current && rs.expansion_after;
  });

  // ===== 공종별 선택 자재 표시 데이터 추출 =====
  // line_items에서 material_id가 있는 work_type만 등장 순서대로 중복 제거
  const materialRows = extractMaterialRows(quote);
  // 한 페이지에 들어갈 최대 row 수 (행 높이 ~22px × ~22행 = 484px ≤ 본문 영역 ~558px)
  const MATERIAL_ROWS_PER_PAGE = 22;
  const materialChunks = chunkArr(materialRows, MATERIAL_ROWS_PER_PAGE);
  // 자재 페이지가 한 페이지로 들어가지 않을 때 4-A, 4-B 식으로 분할 라벨
  const materialPageCount = Math.max(1, materialChunks.length);
  const totalBodyPages = 2 + materialPageCount + 1; // 현황 + 공사비 + 자재(N) + 유료

  return (
    <div ref={rootRef}>
      {/* === 표지 (skill §5.2: 타이틀-태그 중복 제거 / §5.3: [유료성]·[문서종류] 톤 통일) === */}
      <div data-pdf-page="cover">
        <PdfCover
          category="무료 · 예상 공사비 보고서"
          title={'우리집\n예상 공사비'}
          subtitle="실제 시장가 기반 224개 자재·60+ 공종 산출. 광고비·수수료·제휴 0건의 중립적인 인테리어 예산 도구가 우리집 사양을 분석해 만든 보고서입니다."
          meta={[
            `${quote.property.pyeong}평`,
            `${quote.property.bay}베이`,
            `${gradeLabel} 등급`,
            `${REGION_LABEL[quote.property.region]} · ${AGE_LABEL[quote.property.age]}`,
          ]}
          issuedAt={quote.created_at}
          docNo={quote.quote_id}
          tagline="정확한 정보로 무장한 소비자가 좋은 업체를 알아볼 수 있게 되는 것 — 그게 apt-planner의 목표입니다."
        />
      </div>

      {/* === 페이지 1: 우리집 현황 및 공사 범위 === */}
      <BodyPage docNo={quote.quote_id} date={date} pageLabel={`1 / ${totalBodyPages} · 우리집 현황 및 공사 범위`}>
        <Section num="01" title="우리집 현황">
          <KeyValGrid items={[
            { k: '평형 (공급)', v: `${quote.property.pyeong}평` },
            { k: '지역',         v: REGION_LABEL[quote.property.region] },
            { k: '연식',         v: AGE_LABEL[quote.property.age] },
            { k: '베이 수',       v: `${quote.property.bay}베이` },
            { k: '방 개수',      v: `${quote.property.rooms}개 (거실 제외)` },
            { k: '욕실',         v: `공용 ${quote.property.common_bath} / 부부 ${quote.property.master_bath ? '있음' : '없음'}` },
            { k: '자재 등급',     v: gradeLabel },
            { k: '발코니 깊이',   v: `${quote.property.balcony_depth_m.toFixed(1)} m` },
          ]} />
        </Section>

        <Section num="02" title="공사 범위" compact>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
            <RoomWorkMatrix
              visibleRooms={visibleRooms}
              roomScopes={quote.scope.rooms}
            />
            <GlobalScopeChecklist global={quote.scope.global} expansionRooms={expansionRooms} />
          </div>
        </Section>
      </BodyPage>

      {/* === 페이지 2: 총 예상 공사비 + 공종별 공사비 + 범위 설명 === */}
      <BodyPage docNo={quote.quote_id} date={date} pageLabel={`2 / ${totalBodyPages} · 예상 공사비`}>
        <HeroBox
          gradeLabel={gradeLabel}
          pyeong={quote.property.pyeong}
          low={quote.totals.grand_total_low}
          high={quote.totals.grand_total_high}
          mid={grand}
          regionLabel={REGION_LABEL[quote.property.region]}
          ageLabel={AGE_LABEL[quote.property.age]}
          perPyeong={quote.totals.per_pyeong}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '14px' }}>
          <Section num="03" title="공종별 공사비 (카테고리 단위)" compact>
            <WorkTypeBreakdown byCategory={quote.totals.by_category} grand={grand} />
          </Section>

          <PriceRangeExplainer />
        </div>
      </BodyPage>

      {/* === 페이지 3 ~ 3+N: 공종별 선택 자재 (등급별 주력자재 비교) === */}
      {materialChunks.map((chunk, idx) => {
        const pageNo = 3 + idx;
        const suffix = materialPageCount > 1 ? ` (${idx + 1}/${materialPageCount})` : '';
        return (
          <BodyPage
            key={`mat-${idx}`}
            docNo={quote.quote_id}
            date={date}
            pageLabel={`${pageNo} / ${totalBodyPages} · 공종별 선택 자재${suffix}`}
          >
            <Section num="04" title={`공종별 선택 자재${suffix}`} compact>
              {idx === 0 && (
                <p style={{ margin: '0 0 8px', fontSize: '10.5px', color: '#4b5563', lineHeight: 1.6 }}>
                  각 공종마다 <strong>가성비·표준·고급</strong> 등급의 주력 자재를 한눈에 비교합니다.
                  <span style={{ marginLeft: '6px', padding: '1px 6px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '3px', fontSize: '10px', fontWeight: 700, color: '#92400e' }}>✓ 노란색</span>
                  <span style={{ marginLeft: '4px' }}>으로 강조된 자재가 현재 우리집 견적에 적용된 자재입니다.</span>
                </p>
              )}
              <MaterialSelectionTable rows={chunk} />
            </Section>
          </BodyPage>
        );
      })}

      {/* === 마지막 페이지: 유료 서비스 소개 + 공유 QR === */}
      <BodyPage
        docNo={quote.quote_id}
        date={date}
        pageLabel={`${totalBodyPages} / ${totalBodyPages} · 다음 단계 — 유료 서비스`}
      >
        <UpsellSection pyeong={quote.property.pyeong} />
        <div style={{ marginTop: '14px' }}>
          <PdfShareQr
            url={SHARE_URL}
            caption="같은 결과를 다른 분도 받아볼 수 있어요 — QR로 apt-planner를 공유하세요"
          />
        </div>
        <Footer />
      </BodyPage>
    </div>
  );
}

// =====================================================
// 공종별 선택 자재 — 데이터 추출 + 페이지 컴포넌트
// =====================================================

type MaterialRow = {
  wt: string;          // work_type
  label: string;       // 한글 라벨
  effGrade: GradeGroup;     // 실제 견적에 적용된 등급 그룹
};

/**
 * Quote.line_items에서 material_id가 있는 공종을 등장 순서대로 중복 제거하여 추출.
 * 각 행에 effective grade (default + overrides) 정보 부착.
 */
function extractMaterialRows(quote: Quote): MaterialRow[] {
  const seen = new Set<string>();
  const rows: MaterialRow[] = [];
  for (const it of quote.line_items) {
    if (!it.material_id || seen.has(it.work_type)) continue;
    seen.add(it.work_type);
    const overrideG = quote.grade.overrides[it.work_type] as GradeGroup | undefined;
    rows.push({
      wt: it.work_type,
      label: labelOf(it.work_type),
      effGrade: overrideG ?? quote.grade.default,
    });
  }
  return rows;
}

/** 배열을 size 크기 청크로 분할. 빈 배열이면 [[]] (1페이지는 보장) */
function chunkArr<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const GRADES_DISPLAY: GradeGroup[] = ['가성비', '표준', '고급'];

/**
 * 공종별 선택 자재 테이블 — 한 페이지 분량.
 * 4컬럼: 공종 | 가성비 자재 | 표준 자재 | 고급 자재
 * 현재 적용된 등급은 노란색 배경 + ✓ 마커로 강조.
 */
function MaterialSelectionTable({ rows }: { rows: MaterialRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '11px' }}>
        선택된 자재가 없습니다. 공사 범위에서 시공 항목을 선택해주세요.
      </div>
    );
  }
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '10px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      overflow: 'hidden',
      tableLayout: 'fixed',
    }}>
      <colgroup>
        <col style={{ width: '14%' }} />
        <col style={{ width: '28.6%' }} />
        <col style={{ width: '28.7%' }} />
        <col style={{ width: '28.7%' }} />
      </colgroup>
      <thead>
        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
          <th style={{ ...thStyle, textAlign: 'left' }}>공종</th>
          {GRADES_DISPLAY.map(g => (
            <th key={g} style={{ ...thStyle, textAlign: 'left' }}>
              {g}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.wt}>
            <td style={{
              ...tdL,
              fontSize: '10px',
              fontWeight: 700,
              color: '#1f2937',
              borderRight: '1px solid #f3f4f6',
              padding: '5px 8px',
            }}>
              {row.label}
            </td>
            {GRADES_DISPLAY.map(g => {
              const mat = getPrimaryMaterial(row.wt, g);
              const isSel = row.effGrade === g;
              const text = mat
                ? (mat.installer_spec?.trim() ||
                   [mat.brand, mat.product_line].filter(Boolean).join(' ').trim() ||
                   '—')
                : '—';
              return (
                <td
                  key={g}
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '9.5px',
                    lineHeight: 1.45,
                    background: isSel ? '#fef9c3' : 'transparent',
                    color: isSel ? '#713f12' : '#4b5563',
                    fontWeight: isSel ? 600 : 400,
                    verticalAlign: 'top',
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                  }}
                >
                  {isSel && (
                    <span style={{
                      display: 'inline-block',
                      marginRight: '4px',
                      fontSize: '9px',
                      fontWeight: 800,
                      color: '#92400e',
                    }}>
                      ✓
                    </span>
                  )}
                  {text}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// =====================================================
// 페이지 컨테이너 — 가로 A4 (1060×720)
// =====================================================

/**
 * PDF 본문 페이지 컨테이너 (A4 가로, 1060×720).
 * - **고정 크기 + overflow: hidden**: 콘텐츠가 페이지 박스를 넘지 못하도록 클립.
 *   apt-planner-pdf skill §0, §2.2 — "1 React 컴포넌트 = 1 PDF 페이지" 원칙.
 *   콘텐츠가 길어질 가능성이 있으면 호출부에서 chunk로 분할 (skill §4).
 */
export function BodyPage({
  children, docNo, date, pageLabel,
}: {
  children: React.ReactNode;
  docNo?: string;
  date: string;
  pageLabel: string;
}) {
  return (
    <div
      data-pdf-page=""
      style={{
        width: '1060px',
        height: '720px',
        overflow: 'hidden',
        padding: '36px 56px',
        background: '#ffffff',
        color: '#1f2937',
        fontFamily: 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        fontSize: '12px',
        lineHeight: 1.55,
        boxSizing: 'border-box',
      }}
    >
      <RunningHeader page={pageLabel} docNo={docNo} date={date} />
      {children}
    </div>
  );
}

// =====================================================
// HeroBox — 페이지 2 상단
// =====================================================

export function HeroBox({
  gradeLabel, pyeong, low, mid, high, regionLabel, ageLabel, perPyeong,
}: {
  gradeLabel: string;
  pyeong: number;
  low: number;
  mid: number;
  high: number;
  regionLabel: string;
  ageLabel: string;
  perPyeong: number;
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#ffffff',
      borderRadius: '12px',
      padding: '20px 26px',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '6px' }}>
        총 예상 공사비 · {pyeong}평 · {regionLabel} · {ageLabel} · {gradeLabel}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {fmtKRW(low)} ~ {fmtKRW(high)}
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px' }}>
            중앙값 {fmtKRW(mid)} · ±5% 범위 · 부가세 별도 · 10만원 단위 반올림
          </div>
        </div>
        <HeroStat label="평당 단가" value={`${fmtKRWShort(perPyeong)}/평`} />
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{value}</div>
    </div>
  );
}

// =====================================================
// 페이지 1 — 공사 범위 (공간×공종 매트릭스 + 전체 공종 체크리스트)
// =====================================================

function RoomWorkMatrix({
  visibleRooms, roomScopes,
}: {
  visibleRooms: RoomId[];
  roomScopes: Record<RoomId, RoomScope>;
}) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
        공간별 시공 항목
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ ...thStyle, textAlign: 'left' }}>공종</th>
            {visibleRooms.map(r => (
              <th key={r} style={{ ...thStyle, textAlign: 'center' }}>
                {ROOM_META[r]?.label ?? r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROOM_WORK_META.map(meta => (
            <tr key={meta.key as string}>
              <td style={{ ...tdL, fontSize: '10.5px' }}>{meta.label}</td>
              {visibleRooms.map(r => {
                const on = !!roomScopes[r]?.[meta.key as keyof RoomScope];
                return (
                  <td key={r} style={{
                    padding: '5px 6px',
                    borderBottom: '1px solid #f3f4f6',
                    textAlign: 'center',
                    color: on ? '#16a34a' : '#d1d5db',
                    fontWeight: 700,
                  }}>
                    {on ? '●' : '·'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GlobalScopeChecklist({
  global, expansionRooms,
}: {
  global: Quote['scope']['global'];
  expansionRooms: RoomId[];
}) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
        전체 공종 (집 단위 일괄 시공)
      </div>
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '8px 10px',
        fontSize: '10.5px',
        lineHeight: 1.6,
      }}>
        {GLOBAL_GROUPS.map(group => {
          const items = group.items.filter(it => !!global[it.key]);
          if (items.length === 0) return null;
          return (
            <div key={group.title} style={{ marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>{group.title}: </span>
              <span style={{ color: '#374151' }}>{items.map(i => i.label).join(' · ')}</span>
            </div>
          );
        })}
        {expansionRooms.length > 0 && (
          <div style={{
            marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb',
            color: '#92400e', fontWeight: 600,
          }}>
            발코니 확장 시공: {expansionRooms.map(r => ROOM_META[r]?.label ?? r).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// 페이지 2 — 공종별 합계 + 공사비 범위 설명
// =====================================================

function WorkTypeBreakdown({
  byCategory, grand,
}: {
  byCategory: Record<string, number>;
  grand: number;
}) {
  const entries = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  const max = entries[0]?.[1] ?? 1;
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
      {entries.map(([cat, amt], i) => {
        const pct = grand > 0 ? (amt / grand) * 100 : 0;
        const barPct = max > 0 ? Math.max(2, (amt / max) * 100) : 0;
        return (
          <div key={cat} style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 56px 90px',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 10px',
            borderBottom: i < entries.length - 1 ? '1px solid #f3f4f6' : 'none',
            fontSize: '10.5px',
          }}>
            <div style={{ color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cat}
            </div>
            <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${barPct}%`, background: '#3b82f6', borderRadius: '999px' }} />
            </div>
            <div style={{ textAlign: 'right', color: '#6b7280', fontFamily: 'monospace' }}>
              {pct.toFixed(1)}%
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#111827' }}>
              {amt.toLocaleString('ko-KR')}
            </div>
          </div>
        );
      })}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 56px 90px',
        gap: '8px',
        alignItems: 'center',
        padding: '6px 10px',
        background: '#f9fafb',
        borderTop: '2px solid #111827',
        fontSize: '11px',
      }}>
        <div style={{ fontWeight: 800, color: '#111827' }}>합계</div>
        <div />
        <div />
        <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#111827' }}>
          {grand.toLocaleString('ko-KR')}
        </div>
      </div>
    </div>
  );
}

function PriceRangeExplainer() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
      border: '1.5px solid #fcd34d',
      borderRadius: '8px',
      padding: '14px 16px',
      fontSize: '10.5px',
      lineHeight: 1.65,
      color: '#451a03',
    }}>
      <div style={{ fontWeight: 800, color: '#92400e', fontSize: '12px', marginBottom: '8px' }}>
        ❔ 왜 공사비가 ‘범위’로 표시되나요?
      </div>
      <p style={{ margin: 0, marginBottom: '8px', color: '#78350f' }}>
        같은 사양·같은 평수라도 <strong>어떤 인테리어 업체와 계약하느냐</strong>에 따라
        견적은 <strong style={{ color: '#b45309' }}>20% 이상</strong> 차이 나는 것이 정상입니다.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
        <RangeBand
          label="동네 인테리어 업체"
          range="저가형"
          desc="가족 단위 운영 · 단일 시공팀 · 마진 최소. 본 견적의 하단(–5%)에 가까움"
          color="#16a34a"
        />
        <RangeBand
          label="중견 시공 업체"
          range="표준형"
          desc="자체 인력 + 시공·디자인 분리. 본 견적 중앙값 근처"
          color="#2563eb"
        />
        <RangeBand
          label="디자인 턴키 업체"
          range="고가형"
          desc="설계·시공·자재·A/S 통합 책임. 본 견적 상단(+5%) 또는 그 이상"
          color="#d97706"
        />
        <RangeBand
          label="인지도 있는 턴키 브랜드"
          range="프리미엄"
          desc="브랜드 가치·홍보비 반영. 본 견적의 +20~30% 이상도 일반적"
          color="#7c3aed"
        />
      </div>
      <p style={{ margin: '10px 0 0', fontSize: '10px', color: '#78350f', borderTop: '1px dashed #fcd34d', paddingTop: '8px' }}>
        ※ 본 보고서의 공사비는 <strong>중견 시공 업체</strong> 기준의 표준 시장가입니다.
        업체 종류에 따라 위·아래로 큰 폭으로 움직일 수 있으니, 받으신 견적과 ±5% 이내라면
        합리적인 범위로 판단하셔도 됩니다.
      </p>
    </div>
  );
}

function RangeBand({ label, range, desc, color }: { label: string; range: string; desc: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <span style={{
        flexShrink: 0,
        width: '4px',
        alignSelf: 'stretch',
        background: color,
        borderRadius: '2px',
        marginTop: '2px',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontWeight: 700, color: '#78350f' }}>{label}</span>
          <span style={{ fontSize: '9px', color: color, fontWeight: 700, letterSpacing: '0.04em' }}>{range}</span>
        </div>
        <div style={{ fontSize: '10px', color: '#92400e', marginTop: '1px' }}>{desc}</div>
      </div>
    </div>
  );
}

// =====================================================
// 페이지 3 — 유료 서비스 소개
// =====================================================

function UpsellSection({ pyeong }: { pyeong: number }) {
  return (
    <div>
      <Section num="05" title="다음 단계 — 유료 서비스로 진짜 비교 견적 받기">
        <p style={{ margin: '0 0 14px', fontSize: '11.5px', color: '#4b5563', lineHeight: 1.7 }}>
          위 보고서는 <strong>우리집 사양의 시장가 기준 예상치</strong>입니다. 실제 견적은 인테리어 업체와의 협의가 필요한데,
          이때 <strong>여러 업체에 같은 조건으로 비교 견적을 받을 수 있는 도구</strong>가 있으면 절감 폭이 커집니다.
          본 서비스의 유료 패키지는 그 과정을 도와드립니다.
        </p>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <UpsellCard
          tone="spec"
          tag="한 끼 식사값"
          name="우리집 인테리어 계획서 PDF"
          price="₩29,000"
          priceSub="단 1회 결제 · 평생 소장"
          desc="선택하신 자재 사양·수량을 그대로 담은 견적용 문서. 업체에 그대로 전달하면 같은 조건으로 비교 견적을 받을 수 있습니다."
          features={[
            '공간별 자재 사양·수량 표 (단가 기재용 빈칸 포함)',
            '견적 회신 시 업체 답변 체크리스트',
            '추가금 발생 가능 항목 사전 안내',
            '인테리어 실전 가이드 PDF 무료 제공',
          ]}
          savingHint={`${pyeong}평 기준 평균 500~1,500만원 절감 가능 — 식사값의 단 ~2%`}
        />
        <UpsellCard
          tone="consult"
          tag="5월 한정 50% 할인"
          name="전문가 1:1 컨설팅"
          price="₩150,000"
          priceOriginal="₩300,000"
          priceSub="건축사 · 건축시공기술사가 직접 진단"
          desc="우리집 도면·생활 패턴·예산을 1:1로 분석해 최적안을 제안합니다. 업체 견적 비교까지 함께 도와드립니다."
          features={[
            '도면 기반 공간 활용도 분석',
            '예산 내 최적 자재·공종 조합 제안',
            '받은 견적 검토 및 협상 포인트 코칭',
            '업체 견적 비교 서비스 무료 포함',
          ]}
          savingHint={`${pyeong}평 기준 최대 3,000만원 절감 가능 — 컨설팅비의 약 0.5%`}
        />
      </div>
    </div>
  );
}

function UpsellCard({
  tone, tag, name, price, priceOriginal, priceSub, desc, features, savingHint,
}: {
  tone: 'spec' | 'consult';
  tag: string;
  name: string;
  price: string;
  priceOriginal?: string;
  priceSub: string;
  desc: string;
  features: string[];
  savingHint: string;
}) {
  const accent = tone === 'spec' ? '#2563eb' : '#ea580c';
  const bgSoft = tone === 'spec' ? '#eff6ff' : '#fff7ed';
  const borderColor = tone === 'spec' ? '#bfdbfe' : '#fed7aa';
  return (
    <div style={{
      border: `2px solid ${borderColor}`,
      borderRadius: '10px',
      background: '#ffffff',
      overflow: 'hidden',
    }}>
      <div style={{ background: bgSoft, padding: '14px 16px', borderBottom: `1px solid ${borderColor}` }}>
        <div style={{
          display: 'inline-block',
          fontSize: '9px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: accent,
          background: '#ffffff',
          padding: '3px 8px',
          borderRadius: '4px',
          marginBottom: '8px',
        }}>{tag}</div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
          {priceOriginal && (
            <span style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through' }}>{priceOriginal}</span>
          )}
          <span style={{ fontSize: '22px', fontWeight: 800, color: accent, letterSpacing: '-0.02em' }}>{price}</span>
        </div>
        <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>{priceSub}</div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '10.5px', color: '#4b5563', lineHeight: 1.65 }}>{desc}</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {features.map((f, i) => (
            <li key={i} style={{ display: 'flex', gap: '6px', fontSize: '10px', color: '#374151', marginBottom: '3px' }}>
              <span style={{ color: accent, fontWeight: 800, flexShrink: 0 }}>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div style={{
          marginTop: '10px',
          padding: '7px 10px',
          background: bgSoft,
          borderLeft: `3px solid ${accent}`,
          borderRadius: '4px',
          fontSize: '9.5px',
          color: '#374151',
          fontWeight: 600,
        }}>
          💰 {savingHint}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 공통 유틸 (다른 PDF에서도 import)
// =====================================================

const thStyle: React.CSSProperties = {
  padding: '7px 9px',
  fontSize: '10px',
  textTransform: 'uppercase',
  color: '#6b7280',
  letterSpacing: '0.05em',
  fontWeight: 700,
};

export const tdL: React.CSSProperties = {
  padding: '7px 9px',
  borderBottom: '1px solid #f3f4f6',
  textAlign: 'left',
  verticalAlign: 'top',
};
export const tdR: React.CSSProperties = {
  padding: '7px 9px',
  borderBottom: '1px solid #f3f4f6',
  textAlign: 'right',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
};

export function RunningHeader({ page, docNo, date }: { page: string; docNo?: string; date: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '10px',
      marginBottom: '20px',
      fontSize: '10px',
      color: '#6b7280',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          background: '#111827',
          color: '#ffffff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '9px',
          letterSpacing: '0.04em',
        }}>apt-planner</span>
        <span>{page}</span>
      </div>
      <div style={{ fontFamily: 'monospace' }}>
        {docNo && <span>{docNo} · </span>}
        {date}
      </div>
    </div>
  );
}

export function Section({
  num, title, children, compact = false,
}: { num: string; title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section style={{ marginBottom: compact ? '8px' : '20px' }}>
      <h2 style={{
        fontSize: compact ? '12px' : '13px',
        fontWeight: 700,
        color: '#111827',
        marginBottom: '10px',
        paddingBottom: '6px',
        borderBottom: '2px solid #111827',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{
          background: '#111827',
          color: '#ffffff',
          fontSize: '9px',
          padding: '2px 7px',
          borderRadius: '3px',
          fontFamily: 'monospace',
          fontWeight: 700,
        }}>{num}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function KeyValGrid({ items }: { items: { k: string; v: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
      {items.map(({ k, v }) => (
        <div key={k} style={{ background: '#f9fafb', padding: '9px 12px', borderRadius: '6px', borderLeft: '3px solid #60a5fa' }}>
          <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

type Col = { label: string; align: 'left' | 'right' };
export function Table({ cols, children }: { cols: Col[]; children: React.ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
      <thead>
        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
          {cols.map(c => (
            <th key={c.label} style={{
              padding: '7px 9px',
              textAlign: c.align,
              fontSize: '10px',
              textTransform: 'uppercase',
              color: '#6b7280',
              letterSpacing: '0.05em',
              fontWeight: 700,
            }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Footer() {
  return (
    <div style={{
      marginTop: '14px',
      padding: '12px 16px',
      background: '#f9fafb',
      borderLeft: '4px solid #111827',
      fontSize: '10px',
      color: '#4b5563',
      lineHeight: 1.7,
      borderRadius: '4px',
    }}>
      <div style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>중립성 약속</div>
      <p style={{ margin: 0 }}>
        apt-planner는 어떤 인테리어 업체와도 광고비·수수료·제휴 관계가 없습니다.
      </p>
    </div>
  );
}

export function unitShort(u: string): string {
  switch (u) {
    case 'per_m2': return '㎡';
    case 'per_m': return 'm';
    case 'per_ea': return 'ea';
    case 'per_set': return 'set';
    default: return u;
  }
}

import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'apt-planner — 인테리어 업체에 휘둘리지 않는 첫걸음',
  description:
    '수수료 0원·업체 제휴 0건. 정확한 시장가 기반 예산을 먼저 알아보고, 여러 업체에서 정직하게 비교 견적을 받으세요.',
};

export default function Landing() {
  return (
    <div className="flex-1 w-full bg-white">
      <SiteHeader />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-14 pb-12 sm:pt-28 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            인테리어 처음하는 분들을 위한 도구 · 100% 소비자 편의
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.15] mb-6">
            인테리어 사기당하지 않고 <br className="hidden sm:block" />
            <span className="text-orange-600">500~3,000만원</span> 아끼는 법
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl mx-auto mb-6">
            정확한 스펙 없이 받은 견적은 비교가 불가능하고,
            <strong className="text-zinc-900"> 시공 중 추가금 분쟁의 80%</strong>가 그 모호함에서 시작됩니다.
            <br /><br />
            apt-planner로 우리집 사양을 먼저 확정하고, 같은 조건으로 여러 업체에서 비교 견적을 받으세요.
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-2 mb-8 text-xs">
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-semibold">가입 없이 무료</span>
            <span className="px-2 py-1 rounded bg-blue-50 text-blue-800 font-semibold">업체 수수료 0원</span>
            <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-semibold">컨설팅 50% 할인</span>
          </div>

          {/* ===== Hero Primary CTA — 전환율 최적화 ===== */}
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/calc"
              className="group relative inline-flex items-center justify-center gap-3
                         rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500
                         hover:from-orange-600 hover:via-orange-700 hover:to-rose-600
                         px-7 sm:px-10 py-4 sm:py-5
                         text-white font-bold text-base sm:text-lg
                         shadow-[0_10px_30px_-8px_rgba(234,88,12,0.55)]
                         hover:shadow-[0_14px_38px_-6px_rgba(234,88,12,0.65)]
                         ring-4 ring-orange-500/10 hover:ring-orange-500/20
                         transition-all duration-200 active:scale-[0.98]"
            >
              <span className="absolute -top-2.5 right-3 sm:right-4 px-2 py-0.5 rounded-full bg-amber-300 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                무료
              </span>
              우리집 예상 공사비 알아보기
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            {/* 신뢰 신호 3종 — 위험 회피 메시지 */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-zinc-600">
              <span className="inline-flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                1분이면 결과
              </span>
              <span className="text-zinc-300">·</span>
              <span className="inline-flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                가입·결제 없음
              </span>
              <span className="text-zinc-300">·</span>
              <span className="inline-flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                결과 PDF 무료
              </span>
            </div>

            <p className="text-[11px] text-zinc-500 max-w-md leading-relaxed">
              마음에 안 들면 그냥 닫으면 됩니다. 이메일·전화번호 받지 않아요.
            </p>
          </div>

          {/* Hero stats — 혜택 중심 */}
          <div className="mt-14 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
            <Stat n="1분" l="결과까지 걸리는 시간" />
            <Stat n="₩0" l="가입·수수료" highlight />
            <Stat n="±5%" l="시장가 정확도" />
          </div>
        </div>
      </section>

      {/* ===== Differentiator ===== */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-3">
              왜 apt-planner인가
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-4">
              우리는 인테리어 업체 연결 서비스가 아닙니다
            </h2>
            <p className="text-zinc-600 max-w-2xl mx-auto leading-relaxed">
              시중의 견적 비교 사이트 대부분은 업체로부터 <strong>3~10% 수수료</strong>를 받고 운영됩니다.
              이는 곧 그 비용이 견적에 반영된다는 뜻이고, &ldquo;공정한 비교&rdquo;라는 본래 취지가 흔들립니다.
              <br /><br />
              apt-planner는 어떤 인테리어 업체와도 거래·제휴 관계가 없습니다.
              <br />
              오직 소비자가 정확한 정보로 무장할 수 있도록 돕습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CompareCard
              tone="bad"
              title="기존 견적 비교 서비스"
              items={[
                '업체에서 수수료 3~10% 수취',
                '제휴 업체 중심으로 견적 제공',
                '뭉뚱그린 견적 (상세 사양 X)',
                '업체 노출 순위가 비즈니스 모델',
              ]}
            />
            <CompareCard
              tone="good"
              title="apt-planner"
              items={[
                '업체 수수료·제휴 0건',
                '실제 시장가 기반 중립 산출',
                '예산별 대표 추천자재·수량까지 상세',
                '여러 업체 비교 견적을 위한 도구',
              ]}
            />
          </div>

        </div>
      </section>

      {/* ===== Problem ===== */}
      <section className="border-t border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 text-center mb-3">
            인테리어 처음하는 분들의 흔한 고민
          </h2>
          <p className="text-zinc-600 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
            한 번도 안 해본 일이라 무엇을 비교해야 할지 모르는 게 당연합니다.
            이 도구는 그 정보 격차를 메우기 위해 만들었습니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProblemCard
              title="업체마다 견적이 너무 다름"
              desc="같은 평형인데 1,000만원에서 3,000만원까지 차이 나는 이유는 자재 사양·수량·인건비 기준이 다르기 때문. 같은 조건으로 비교 견적을 받아야 진짜 비교가 됩니다."
            />
            <ProblemCard
              title="무엇을 비교해야 할지 모름"
              desc="단순히 총액만 비교하면 자재 다운그레이드한 곳이 가장 싸 보입니다. 자재 사양·수량별로 항목을 펼쳐서 비교해야 진짜 가성비를 알 수 있습니다."
            />
            <ProblemCard
              title="공사 중 추가금 폭탄"
              desc="견적에 빠진 항목은 시공 중 추가금으로 청구됩니다. 사전에 모든 공종이 빠짐없이 들어간 견적인지 검증할 수 있어야 합니다."
            />
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest text-blue-700 mb-3">
              How it works
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
              3단계로 정확한 예산을 알아보세요
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard n="1" title="우리집 정보 입력" desc="평형·베이·욕실·발코니 등 기본 정보. 1분이면 충분합니다." />
            <StepCard n="2" title="공사 범위·자재 등급" desc="공간별로 무엇을 시공할지, 자재는 어떤 등급으로 할지 직관적으로 선택." />
            <StepCard n="3" title="실시간 공사비 산출" desc="공종별·공간별 상세 견적. PDF로 다운받아 업체에 그대로 전달 가능." />
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-zinc-200 bg-zinc-900 text-zinc-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-7 h-7 rounded bg-white text-zinc-900 text-xs flex items-center justify-center font-bold">a</span>
                <span className="font-bold text-white">apt-planner</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-400 max-w-md">
                인테리어 처음하는 소비자가 정직하고 실력있는 업체를 고를 수 있도록 돕는
                중립적인 정보 도구입니다.
              </p>
            </div>
            <div className="text-xs text-zinc-500 leading-relaxed max-w-md">
              <p className="mb-2 font-semibold text-zinc-300">중립성 약속</p>
              <p>
                apt-planner는 어떤 인테리어 업체와도 <strong className="text-zinc-300">광고비·수수료·제휴</strong> 관계가 없습니다.
                본 서비스는 100% 소비자 편의를 위해 운영되며, 어떤 업체의 노출 순위·견적도 조작하지 않습니다.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-800 text-xs text-zinc-500 flex flex-col sm:flex-row gap-2 justify-between">
            <span>© apt-planner — All rights reserved</span>
            <span>본 견적은 표준 시장가 기반 예상치이며, 실제 시공·견적은 업체 협의가 필요합니다.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===== 보조 컴포넌트 =====

function Stat({ n, l, highlight = false }: { n: string; l: string; highlight?: boolean }) {
  return (
    <div>
      <div className={`text-2xl sm:text-3xl font-bold ${highlight ? 'text-emerald-600' : 'text-zinc-900'}`}>{n}</div>
      <div className="text-[11px] sm:text-xs text-zinc-500 mt-1">{l}</div>
    </div>
  );
}

function CompareCard({
  tone, title, items,
}: { tone: 'good' | 'bad'; title: string; items: string[] }) {
  const isGood = tone === 'good';
  return (
    <div className={`rounded-xl border p-5 ${isGood ? 'border-emerald-300 bg-emerald-50/30' : 'border-zinc-300 bg-white'}`}>
      <h3 className={`font-bold mb-3 flex items-center gap-2 ${isGood ? 'text-emerald-900' : 'text-zinc-700'}`}>
        <span className={`inline-block w-1.5 h-4 rounded-sm ${isGood ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((s, i) => (
          <li key={i} className={`flex gap-2 ${isGood ? 'text-emerald-900' : 'text-zinc-600 line-through decoration-zinc-400'}`}>
            <span className="text-zinc-400">·</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProblemCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 hover:border-blue-300 hover:shadow-sm transition">
      <h3 className="font-bold text-zinc-900 mb-2">{title}</h3>
      <p className="text-sm text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-6">
      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-4">
        {n}
      </div>
      <h3 className="font-bold text-zinc-900 mb-2">{title}</h3>
      <p className="text-sm text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}


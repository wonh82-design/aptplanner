import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'apt-planner — 인테리어 업체에 휘둘리지 않는 첫걸음',
  description:
    '수수료 0원·업체 제휴 0건. 정확한 시장가 기반 예산을 먼저 알아보고, 여러 업체에서 정직하게 비교 견적을 받으세요.',
};

// ── Unsplash 무료 인테리어 사진 ────────────────────────────────
// 직접 hotlink. 향후 자체 사진으로 교체 시 src 만 갈면 됨.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=2400&q=80';
const MID_IMAGE =
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=2000&q=80';
const STEP_IMAGES = [
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
];

export default function Landing() {
  return (
    <div className="flex-1 w-full bg-white text-zinc-900">
      <SiteHeader />

      {/* ===== Hero — 풀블리드 인테리어 + 좌측 정렬 카피 + 큰 CTA ===== */}
      <section className="relative isolate overflow-hidden">
        {/* 배경 이미지 */}
        <div className="absolute inset-0 -z-10">
          <Image
            src={HERO_IMAGE}
            alt="모던 인테리어 거실"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* 그라데이션 오버레이 — 텍스트 가독성 + 분위기 */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/85 via-zinc-900/55 to-zinc-900/15" />
        </div>

        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-24 sm:pt-32 sm:pb-36 lg:pt-40 lg:pb-44">
          <div className="max-w-2xl">
            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-amber-300 mb-5">
              인테리어 처음 하는 분을 위한 도구
            </div>

            <h1 className="text-[34px] sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-7">
              업체에 휘둘리지 않는<br />
              우리집 첫 견적.
            </h1>

            <p className="text-base sm:text-lg text-zinc-200 leading-relaxed max-w-xl mb-10">
              같은 평형인데 견적이 1,000만원씩 차이 나는 이유는
              자재 사양과 수량 기준이 제각각이기 때문입니다.
              먼저 우리집 사양을 확정하고, 같은 조건으로 비교 견적을 받으세요.
            </p>

            {/* 메인 CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                href="/calc"
                className="group inline-flex items-center justify-center gap-2.5
                           rounded-md bg-amber-500 hover:bg-amber-400
                           px-7 py-4
                           text-zinc-900 font-bold text-base sm:text-lg
                           shadow-lg shadow-amber-500/30
                           transition-all duration-150 active:scale-[0.98]"
              >
                우리집 공사비 계산하기
                <svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <div className="text-[13px] text-zinc-300 leading-tight">
                <div className="font-semibold text-white">1분이면 결과</div>
                <div>가입·결제 없이 무료</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Stats Strip — 짧고 깔끔 ===== */}
      <section className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-12 grid grid-cols-3 gap-4 sm:gap-10">
          <Stat n="±5%" l="시장가 정확도" />
          <Stat n="0원" l="가입·수수료" accent />
          <Stat n="1분" l="결과까지 걸리는 시간" />
        </div>
      </section>

      {/* ===== Why — 기존 vs apt-planner 비교 ===== */}
      <section className="bg-stone-50">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 mb-3">
              왜 apt-planner인가
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
              우리는 업체 연결 서비스가 아닙니다.
            </h2>
            <p className="text-zinc-600 leading-relaxed text-[15px]">
              시중의 견적 비교 사이트 대부분은 업체로부터 3~10% 수수료를 받고 운영됩니다.
              그 비용은 결국 견적에 반영되고, &lsquo;공정한 비교&rsquo;라는 본래 취지가 흔들립니다.
              apt-planner는 어떤 인테리어 업체와도 거래·제휴 관계가 없습니다.
              오직 소비자가 정확한 정보로 무장할 수 있도록 돕습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
      <section>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 mb-3">
              흔한 고민
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
              한 번도 안 해본 일,<br className="hidden sm:block" />
              무엇을 비교해야 할지 모르는 게 당연합니다.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ProblemCard
              n="01"
              title="업체마다 견적이 너무 다름"
              desc="같은 평형인데 1,000만원에서 3,000만원까지 차이 나는 이유는 자재 사양·수량·인건비 기준이 다르기 때문. 같은 조건으로 비교 견적을 받아야 진짜 비교가 됩니다."
            />
            <ProblemCard
              n="02"
              title="무엇을 비교해야 할지 모름"
              desc="총액만 비교하면 자재를 다운그레이드한 곳이 가장 싸 보입니다. 자재 사양·수량별로 항목을 펼쳐서 비교해야 진짜 가성비를 알 수 있습니다."
            />
            <ProblemCard
              n="03"
              title="공사 중 추가금 폭탄"
              desc="견적에 빠진 항목은 시공 중 추가금으로 청구됩니다. 모든 공종이 빠짐없이 들어간 견적인지 사전에 검증할 수 있어야 합니다."
            />
          </div>
        </div>
      </section>

      {/* ===== How it works — 3단계 (사진 포함) ===== */}
      <section className="bg-stone-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 mb-3">
              How it works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              3단계로 정확한 예산을 알아보세요.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              n="1"
              img={STEP_IMAGES[0]}
              imgAlt="우리집 정보 입력"
              title="우리집 정보 입력"
              desc="평형·베이·욕실·발코니 등 기본 정보. 1분이면 충분합니다."
            />
            <StepCard
              n="2"
              img={STEP_IMAGES[1]}
              imgAlt="공사 범위·자재 등급"
              title="공사 범위·자재 등급"
              desc="공간별로 무엇을 시공할지, 자재는 어떤 등급으로 할지 직관적으로 선택."
            />
            <StepCard
              n="3"
              img={STEP_IMAGES[2]}
              imgAlt="실시간 공사비 산출"
              title="실시간 공사비 산출"
              desc="공종별·공간별 상세 견적. PDF로 다운받아 업체에 그대로 전달 가능."
            />
          </div>
        </div>
      </section>

      {/* ===== Final CTA — 풀블리드 다른 인테리어 + 강한 행동 유도 ===== */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src={MID_IMAGE}
            alt="모던 주방 인테리어"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/90 via-zinc-900/75 to-zinc-900/65" />
        </div>

        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15] mb-6">
            1분 투자로 예산에 맞는<br />
            우리집 공사계획을 완성해보세요
          </h2>
          <p className="text-zinc-200 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-10">
            가입도, 결제도, 전화번호도 필요 없습니다.
            마음에 안 들면 그냥 닫으셔도 됩니다.
          </p>

          <Link
            href="/calc"
            className="group inline-flex items-center justify-center gap-2.5
                       rounded-md bg-amber-500 hover:bg-amber-400
                       px-8 py-4
                       text-zinc-900 font-bold text-base sm:text-lg
                       shadow-xl shadow-amber-500/40
                       transition-all duration-150 active:scale-[0.98]"
          >
            우리집 공사비 계산하기
            <svg
              width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          <p className="mt-6 text-xs text-zinc-400">
            ±5% 시장가 정확도 · 결과 PDF 무료 다운로드
          </p>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-zinc-200 bg-zinc-950 text-zinc-300">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-16">
          <div className="flex flex-col sm:flex-row items-start gap-10">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="inline-flex w-8 h-8 rounded bg-white text-zinc-900 text-sm items-center justify-center font-bold">a</span>
                <span className="font-bold text-white text-lg">apt-planner</span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400 max-w-md">
                인테리어 처음 하는 소비자가 정직하고 실력있는 업체를 고를 수 있도록 돕는
                중립적인 정보 도구입니다.
              </p>
            </div>
            <div className="text-sm text-zinc-400 leading-relaxed max-w-md">
              <p className="mb-2 font-semibold text-white">중립성 약속</p>
              <p className="text-[13px]">
                apt-planner는 어떤 인테리어 업체와도 광고비·수수료·제휴 관계가 없습니다.
                100% 소비자 편의를 위해 운영되며, 어떤 업체의 노출 순위·견적도 조작하지 않습니다.
              </p>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-zinc-800 text-xs text-zinc-500 flex flex-col sm:flex-row gap-2 justify-between">
            <span>© apt-planner — All rights reserved</span>
            <span>본 견적은 표준 시장가 기반 예상치이며, 실제 시공·견적은 업체 협의가 필요합니다.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===== 보조 컴포넌트 ===========================================

function Stat({ n, l, accent = false }: { n: string; l: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <div className={`text-3xl sm:text-5xl font-bold tracking-tight ${accent ? 'text-amber-600' : 'text-zinc-900'}`}>
        {n}
      </div>
      <div className="text-[11px] sm:text-sm text-zinc-500 mt-1.5">{l}</div>
    </div>
  );
}

function CompareCard({ tone, title, items }: { tone: 'good' | 'bad'; title: string; items: string[] }) {
  const isGood = tone === 'good';
  return (
    <div
      className={`rounded-xl p-6 sm:p-7 border ${
        isGood
          ? 'border-amber-300 bg-white shadow-sm'
          : 'border-zinc-200 bg-white/60'
      }`}
    >
      <h3 className={`font-bold text-lg mb-4 ${isGood ? 'text-zinc-900' : 'text-zinc-500'}`}>
        {title}
      </h3>
      <ul className="space-y-2.5 text-[14px]">
        {items.map((s, i) => (
          <li key={i} className={`flex gap-2.5 ${isGood ? 'text-zinc-800' : 'text-zinc-400 line-through decoration-zinc-300'}`}>
            <span className={isGood ? 'text-amber-600 mt-0.5' : 'text-zinc-300 mt-0.5'} aria-hidden>
              {isGood ? '✓' : '✕'}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProblemCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="border-t-2 border-zinc-200 pt-5">
      <div className="text-[11px] font-mono text-zinc-400 mb-3 tracking-widest">{n}</div>
      <h3 className="font-bold text-zinc-900 mb-3 text-[17px] leading-snug">{title}</h3>
      <p className="text-[14px] text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({
  n, img, imgAlt, title, desc,
}: { n: string; img: string; imgAlt: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-5 bg-zinc-100">
        <Image
          src={img}
          alt={imgAlt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
        <div className="absolute top-3 left-3 inline-flex w-8 h-8 items-center justify-center rounded-full bg-white text-zinc-900 font-bold text-sm shadow">
          {n}
        </div>
      </div>
      <h3 className="font-bold text-zinc-900 mb-2 text-[17px]">{title}</h3>
      <p className="text-[14px] text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/SiteHeader';
import { LANDING_COPY } from '@/content/landing';

/**
 * 랜딩페이지.
 *
 * ⚠ 워딩 수정은 src/content/landing.ts 에서 하세요.
 *   이 파일은 레이아웃·스타일만 담당합니다.
 *   (사진 URL 만 예외 — 아래 HERO_IMAGE / MID_IMAGE / STEP_IMAGES 에서 직접 교체)
 */

export const metadata = {
  title: LANDING_COPY.meta.title,
  description: LANDING_COPY.meta.description,
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
  const t = LANDING_COPY;

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
              {t.hero.eyebrow}
            </div>

            <h1 className="text-[34px] sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-7">
              {t.hero.title1}<br />
              {t.hero.title2}
            </h1>

            {/* Subtitle 영역 — 이전 WHY 섹션의 헤딩 카피를 흡수 */}
            <p className="text-lg sm:text-xl font-semibold text-white leading-snug mb-3">
              {t.hero.subtitleHeadline}
            </p>
            <p className="text-[15px] sm:text-base text-zinc-200 leading-relaxed max-w-xl mb-10">
              {t.hero.subtitle}
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
                {t.hero.cta}
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
                <div className="font-semibold text-white">{t.hero.miniCtaTitle}</div>
                <div>{t.hero.miniCtaSubtitle}</div>
              </div>
            </div>

            {/* CTA 아래 보조 설명 — 기존 subtitle 자리에서 이동한 카피 */}
            <p className="mt-8 text-[14px] sm:text-[15px] text-zinc-300 leading-relaxed max-w-xl">
              {t.hero.belowCta}
            </p>
          </div>
        </div>
      </section>

      {/* ===== Stats Strip — 짧고 깔끔 ===== */}
      <section className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-12 grid grid-cols-3 gap-4 sm:gap-10">
          {t.stats.map((s, i) => (
            <Stat key={i} n={s.n} l={s.l} accent={s.accent} />
          ))}
        </div>
      </section>

      {/* ===== Why — 비교 카드 (헤딩은 hero 로 이동, 카드만 유지) ===== */}
      <section className="bg-stone-50">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 mb-6 text-center">
            {t.why.eyebrow}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CompareCard tone="bad"  title={t.why.badCard.title}  items={t.why.badCard.items as readonly string[]} />
            <CompareCard tone="good" title={t.why.goodCard.title} items={t.why.goodCard.items as readonly string[]} />
          </div>
        </div>
      </section>

      {/* ===== Problem ===== */}
      <section>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 mb-3">
              {t.problem.eyebrow}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
              {t.problem.title1}<br className="hidden sm:block" />
              {t.problem.title2}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.problem.cards.map((c) => (
              <ProblemCard key={c.n} n={c.n} title={c.title} desc={c.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it works — 3단계 (사진 포함) ===== */}
      <section className="bg-stone-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 mb-3">
              {t.how.eyebrow}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              {t.how.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.how.steps.map((s, i) => (
              <StepCard
                key={i}
                n={String(i + 1)}
                img={STEP_IMAGES[i]}
                imgAlt={s.imgAlt}
                title={s.title}
                desc={s.desc}
              />
            ))}
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
            {t.finalCta.title1}<br />
            {t.finalCta.title2}
          </h2>
          <p className="text-zinc-200 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-10">
            {t.finalCta.subtitle}
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
            {t.finalCta.cta}
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
            {t.finalCta.footnote}
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
                <span className="font-bold text-white text-lg">{t.footer.brandName}</span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400 max-w-md">
                {t.footer.brandDesc}
              </p>
            </div>
            <div className="text-sm text-zinc-400 leading-relaxed max-w-md">
              <p className="mb-2 font-semibold text-white">{t.footer.neutralityHeading}</p>
              <p className="text-[13px]">
                {t.footer.neutralityBody}
              </p>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-zinc-800 text-xs text-zinc-500 flex flex-col sm:flex-row gap-2 justify-between">
            <span>{t.footer.copyright}</span>
            <span>{t.footer.disclaimer}</span>
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

function CompareCard({ tone, title, items }: { tone: 'good' | 'bad'; title: string; items: readonly string[] }) {
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

import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: '소개 — Apt-Planner | 만든 사람과 만든 이유',
  description:
    '건축사·건축시공기술사 자격, 대형 시공사 15년+. 아파트 설계와 하이엔드 초고층 주거 시공관리 경험으로 만든 투명한 인테리어 예산 산정 시스템.',
};

export default function About() {
  return (
    <div className="flex-1 w-full bg-white">
      {/* ===== Top bar ===== */}
      <SiteHeader />

      {/* ===== Intro hero ===== */}
      <section className="border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-10 sm:pt-20 sm:pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium mb-6">
            만든 사람 · 만든 이유
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 leading-[1.2] mb-5">
            <span className="text-blue-700">인테리어 초보자</span>를 위해 만들었습니다
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 leading-relaxed">
            건설사에서 수만세대를 짓고 관리해온 전문가가
            <br className="hidden sm:block" />
            왜 인테리어 예산 도구를 무료로 공개하기로 결심했는지 이야기합니다.
          </p>
        </div>
      </section>

      {/* ===== Profile card ===== */}
      <section className="border-b border-zinc-100 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* 검은 박스 — 자격·경력 강조 */}
            <div className="md:col-span-1 max-w-xs mx-auto md:mx-0 w-full">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 flex flex-col items-center justify-center text-white p-6 text-center">
                {/* 자격 2종 강조 */}
                <div className="space-y-1.5">
                  <div className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">
                    건축사
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">
                    건축시공기술사
                  </div>
                </div>

                <div className="h-px w-10 bg-white/30 my-4" />

                {/* 시공사 경력 강조 */}
                <div className="text-[11px] uppercase tracking-widest opacity-70 mb-1">
                  대형 시공사 경력
                </div>
                <div className="text-2xl font-extrabold tracking-tight">
                  15<span className="text-base font-bold opacity-80">년+</span>
                </div>
                <div className="text-[10px] opacity-75 mt-1 leading-tight">
                  아파트 설계 · 하이엔드<br />초고층 주거 시공관리
                </div>

                <div className="text-[10px] uppercase tracking-widest opacity-50 mt-4">apt-planner · founder</div>
              </div>
            </div>

            {/* 우측 — 자격·경력 상세 */}
            <div className="md:col-span-2 space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-blue-700 mb-1">전문가 프로필</div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                  국가공인 자격 2종 · 대형 시공사 15년+
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Cred title="건축사" desc="국가공인 건축 설계 자격 — 인허가·설계 도서 발급 가능" />
                <Cred title="건축시공기술사" desc="시공 분야 최상위 국가기술자격 — 시공 전반 책임 감리" />
                <Cred title="아파트 설계" desc="대형 단지 평면·인허가·설계 도서 작성 경험" />
                <Cred title="하이엔드 초고층 주거 시공관리" desc="프리미엄 단지 시공관리 · 마감 품질 책임" />
                <Cred title="수만세대 시공·CS" desc="입주민 하자 대응·보수 누적 경험" />
                <Cred title="대형 시공사 15년+" desc="시공관리·CS 책임자로 다수 단지 운영" />
              </div>

              <p className="text-sm text-zinc-600 leading-relaxed pt-2 border-t border-zinc-200">
                설계 단계부터 인허가·시공·하자 보수까지
                <strong className="text-zinc-900"> 아파트 라이프사이클 전체를 다뤘습니다.</strong>
                특히 하이엔드 초고층 주거 시공관리에서는 자재 사양·마감 디테일이
                10년 뒤 어떤 결과를 만드는지 누적 데이터를 가지고 있습니다.
                그 데이터가 본 서비스의 자재 등급·공종 구성의 근거입니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Story ===== */}
      <section className="border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-3 text-center">
            왜 만들었나
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-12 text-center leading-tight">
            전문가인 저조차 추가금 분쟁을 겪었습니다
          </h2>

          <div className="space-y-10 text-zinc-700 leading-relaxed text-[15px]">
            <StoryBlock
              n="01"
              title="현장에서 본 진실"
              body={[
                '15년간 신축 아파트 단지를 짓고, 입주 후 하자 보수를 책임지는 일을 했습니다. 시공 단계에서 어떤 자재를 어떻게 쓰면 5년 뒤 어떤 하자가 발생하는지 — 그 패턴이 머릿속에 데이터처럼 쌓였습니다.',
                '결로·곰팡이·누수·단열 부족·도배 들뜸 — 거의 대부분이 시공 단계의 자재 선택과 시공법 차이에서 나오더군요.',
              ]}
            />

            <StoryBlock
              n="02"
              title="내 집을 인테리어할 때도 똑같았다"
              body={[
                '저 자신과 지인의 아파트를 여러 번 인테리어했습니다. 전문 지식이 있으니 견적 비교는 쉬울 줄 알았습니다.',
                '그런데 막상 업체별 견적을 받아보면, 같은 평형·같은 공사인데 자재 사양·수량 기준이 다르고, 어떤 항목은 통째로 빠져 있어 단순 비교가 불가능했습니다.',
                '결국 가장 깔끔해 보이는 견적으로 계약했는데, 시공 중반에 "이 항목은 견적에 없었다"는 추가금 청구가 시작됐고 끝내 분쟁으로 이어졌습니다.',
              ]}
            />

            <StoryBlock
              n="03"
              title="문제는 '정보 비대칭'이었습니다"
              body={[
                '소비자는 견적에서 무엇을 봐야 하는지, 어떤 자재 사양이 적절한지, 빠진 공종이 무엇인지 알 방법이 없습니다.',
                '업체도 마찬가지로 — 소비자가 무엇을 원하는지 명확하지 않으니 각자의 기준대로 견적을 만들고, 그래서 매번 다른 결과가 나옵니다.',
                '이 비대칭을 해소할 도구가 없다는 게 가장 큰 문제였습니다. 견적 비교 사이트는 대부분 업체로부터 수수료를 받아 운영되니, 진짜 중립적이지 않습니다.',
              ]}
            />

            <StoryBlock
              n="04"
              title="그래서 만들었습니다"
              body={[
                '소비자가 시공 사양을 먼저 정하고, 그 사양으로 시장가 기반 예상 공사비를 미리 알 수 있게 — 그리고 그 사양을 그대로 여러 업체에 전달해 같은 조건으로 비교 견적을 받을 수 있게.',
                '15년 경험에서 추출한 자재 카탈로그 224개, 60+ 공종 산식, 평형·베이별 표준 면적표를 기반으로 만들었습니다.',
                'apt-planner는 인테리어 업체와 어떤 거래 관계도 갖지 않습니다. 광고비·수수료·제휴를 받지 않습니다. 이 도구를 통해 소비자가 정확한 정보로 무장하고, 정직하고 실력있는 업체를 알아볼 수 있게 되는 것 — 그게 목표입니다.',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ===== Mission — 서비스의 가장 큰 목적 ===== */}
      <section className="border-b border-zinc-100 bg-gradient-to-br from-blue-50/40 via-white to-emerald-50/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="text-xs font-semibold uppercase tracking-widest text-blue-700 mb-3 text-center">
            서비스의 가장 큰 목적
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-6 text-center leading-tight">
            정확한 공사범위 · 정직한 업체 · 정확한 견적
          </h2>
          <p className="text-zinc-700 leading-relaxed text-center max-w-2xl mx-auto mb-10 text-[15px]">
            소비자가 <strong className="text-zinc-900">예산에 맞는 정확한 공사범위</strong>를 알고,
            그 공사범위를 <strong className="text-zinc-900">정확히 이해하고 정직하게 견적하는 좋은 업체</strong>와
            공사를 진행할 수 있게 돕는 것 — 그게 apt-planner의 단 하나의 목적입니다.
          </p>

          {/* 핵심 철학 인용 — 큰 quote 박스 */}
          <figure className="relative rounded-2xl border-2 border-zinc-900 bg-white p-6 sm:p-8 shadow-sm">
            <div className="absolute -top-4 left-6 sm:left-8">
              <span className="inline-block px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest rounded">
                인테리어 잘하는 단 하나의 방법
              </span>
            </div>

            <blockquote className="text-zinc-900 leading-relaxed">
              <p className="text-base sm:text-lg font-bold mb-3">
                사기당하지 않고, 추가 공사비 없이, 하자 없이 인테리어 하는 방법은 단 하나입니다.
              </p>
              <p className="text-[15px] sm:text-base text-zinc-700 leading-relaxed border-l-4 border-blue-600 pl-4 my-4 italic">
                &ldquo;정직하고 실력있는 좋은 업체를 찾아서,
                내가 원하는 바를 명확히 설명하고,
                그것에 맞는 적당한 가격에 계약하는 것.&rdquo;
              </p>
              <p className="text-sm sm:text-[15px] text-zinc-700 leading-relaxed">
                그리고 이를 위해 <strong className="text-blue-700">가장 먼저 해야 할 일</strong>이 바로 이 사이트에서
                {' '}<strong>내가 원하는 공사범위를 정해보고, 예상 공사비를 보고,
                내 예산에 맞게 공사범위와 자재 등급을 조정한 후에 이것을 계획서로 만드는 것</strong>입니다.
              </p>
            </blockquote>

            {/* 4단계 요약 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 pt-5 border-t border-zinc-200">
              <MiniStep n="1" t="공사범위 정의" />
              <MiniStep n="2" t="예상 공사비 확인" />
              <MiniStep n="3" t="예산 맞춰 조정" />
              <MiniStep n="4" t="계획서 PDF" />
            </div>
          </figure>
        </div>
      </section>

      {/* ===== Pillars ===== */}
      <section className="border-b border-zinc-100 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3 text-center">
            apt-planner의 약속
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-12 text-center">
            세 가지 원칙으로 운영합니다
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Pillar
              n="01"
              title="완전한 중립성"
              desc="어떤 인테리어 업체와도 광고비·수수료·제휴 관계를 맺지 않습니다. 특정 업체를 추천·노출하지 않습니다."
            />
            <Pillar
              n="02"
              title="검증된 데이터"
              desc="실제 시장가 기반 224개 자재, v4 산출 검증 1% 이내 정확도. 데이터는 분기마다 업데이트합니다."
            />
            <Pillar
              n="03"
              title="소비자 편에서"
              desc="유일한 수익원은 사용자가 직접 신청하는 유료 패키지. 그래서 우리는 어떤 업체에도 유리하게 작용할 동기가 없습니다."
            />
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-4">
            이제 직접 써보실 차례입니다
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            1분이면 우리집 예상 공사비를 알 수 있습니다. 결과를 PDF로 받아 여러 업체에 같은 조건으로 비교 견적을 요청해보세요.
          </p>
          <Link
            href="/calc"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 hover:bg-black px-7 py-3.5 text-white font-semibold shadow-sm transition active:scale-[0.98]"
          >
            무료로 예상 공사비 산정하기 →
          </Link>
          <p className="text-xs text-zinc-500 mt-4">가입 없이 바로 시작 · 결과 PDF 무료 다운로드</p>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-zinc-900 text-zinc-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-xs text-zinc-400 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <span>© Apt-Planner — All rights reserved</span>
            <span>본 서비스는 어떤 인테리어 업체와도 제휴·수수료 관계가 없습니다.</span>
          </div>
          <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">사용 문의</span>
            <a
              href="mailto:wonh82@gmail.com"
              className="text-zinc-200 hover:text-white font-mono transition"
            >
              wonh82@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===== 보조 컴포넌트 =====

function Cred({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-1 h-4 rounded-sm bg-blue-500" />
        <span className="font-semibold text-sm text-zinc-900">{title}</span>
      </div>
      <p className="text-[11px] text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function StoryBlock({ n, title, body }: { n: string; title: string; body: string[] }) {
  return (
    <div className="flex gap-3 sm:gap-5">
      <div className="flex-shrink-0">
        <div className="font-mono text-2xl sm:text-3xl font-bold text-zinc-300">{n}</div>
      </div>
      <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 mb-2 sm:mb-3">{title}</h3>
        <div className="space-y-3 text-sm sm:text-[15px]">
          {body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}

function Pillar({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-6">
      <div className="font-mono text-xs font-bold text-blue-600 mb-2">{n}</div>
      <h3 className="font-bold text-zinc-900 mb-2">{title}</h3>
      <p className="text-sm text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function MiniStep({ n, t }: { n: string; t: string }) {
  return (
    <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:text-center">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex-shrink-0">
        {n}
      </span>
      <span className="text-[11px] sm:text-xs font-semibold text-zinc-700 leading-tight">{t}</span>
    </div>
  );
}

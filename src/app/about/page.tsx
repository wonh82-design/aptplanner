import Link from 'next/link';

export const metadata = {
  title: '소개 — apt-planner | 만든 사람과 만든 이유',
  description:
    '대형 건설사 15년+, 건축사·건축시공기술사. 수만세대 시공관리·CS 경험으로 만든 투명한 인테리어 예산 산정 시스템.',
};

export default function About() {
  return (
    <div className="flex-1 w-full bg-white">
      {/* ===== Top bar ===== */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded bg-zinc-900 text-white text-xs flex items-center justify-center font-bold">a</span>
            <span className="font-bold tracking-tight">apt-planner</span>
          </Link>
          <nav className="flex gap-5 text-xs font-medium text-zinc-600">
            <Link href="/about" className="text-zinc-900">소개</Link>
            <Link href="/calc" className="hover:text-zinc-900">예산 산정 시작 →</Link>
          </nav>
        </div>
      </header>

      {/* ===== Intro hero ===== */}
      <section className="border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium mb-6">
            🧑‍🔧 만든 사람 · 만든 이유
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 leading-[1.2] mb-5">
            현장에서 15년, <span className="text-blue-700">소비자 편으로 돌아섰습니다</span>
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
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-1">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-6xl mb-2">🏗️</div>
                  <div className="text-xs uppercase tracking-widest opacity-70">apt-planner</div>
                  <div className="text-sm font-medium mt-1">founder</div>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-blue-700 mb-1">전문가 프로필</div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">건설 현장 15년 · 자격 2종</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Cred icon="🏢" title="대형 건설사 15년+" desc="시공관리·CS 책임자로 다수 단지 운영" />
                <Cred icon="🏠" title="수만세대 시공·CS" desc="입주민 하자 대응·보수 누적 경험" />
                <Cred icon="📜" title="건축사" desc="국가공인 건축 설계 자격" />
                <Cred icon="📜" title="건축시공기술사" desc="시공 분야 최상위 국가기술자격" />
              </div>

              <p className="text-sm text-zinc-600 leading-relaxed pt-2 border-t border-zinc-200">
                인테리어 자재·시공법뿐 아니라
                <strong className="text-zinc-900"> 아파트의 뼈대(구조·배관·전기·단열)까지 이해</strong>하고 있습니다.
                현장에서 가장 자주 보던 게 어떤 자재가 어떻게 시공됐을 때 몇 년 안에 어떤 하자가 발생하는지였습니다.
                그 데이터가 본 서비스의 자재 등급·공종 구성의 근거입니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Story ===== */}
      <section className="border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-20">
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

      {/* ===== Pillars ===== */}
      <section className="border-b border-zinc-100 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3 text-center">
            apt-planner의 약속
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-12 text-center">
            세 가지 원칙으로 운영합니다
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Pillar
              icon="🔒"
              title="완전한 중립성"
              desc="어떤 인테리어 업체와도 광고비·수수료·제휴 관계를 맺지 않습니다. 특정 업체를 추천·노출하지 않습니다."
            />
            <Pillar
              icon="🔬"
              title="검증된 데이터"
              desc="실제 시장가 기반 자재 224 SKU, v4 산출 검증 1% 이내 정확도. 데이터는 분기마다 업데이트합니다."
            />
            <Pillar
              icon="🤝"
              title="소비자 편에서"
              desc="유일한 수익원은 사용자가 직접 신청하는 유료 패키지. 그래서 우리는 어떤 업체에도 유리하게 작용할 동기가 없습니다."
            />
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-4">
            이제 직접 써보실 차례입니다
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            30초면 우리집 예상 공사비를 알 수 있습니다. 결과를 PDF로 받아 여러 업체에 같은 조건으로 비교 견적을 요청해보세요.
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
        <div className="max-w-5xl mx-auto px-6 py-10 text-xs text-zinc-400 flex flex-col sm:flex-row justify-between gap-3">
          <span>© apt-planner — All rights reserved</span>
          <span>본 서비스는 어떤 인테리어 업체와도 제휴·수수료 관계가 없습니다.</span>
        </div>
      </footer>
    </div>
  );
}

// ===== 보조 컴포넌트 =====

function Cred({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="font-semibold text-sm text-zinc-900">{title}</span>
      </div>
      <p className="text-[11px] text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function StoryBlock({ n, title, body }: { n: string; title: string; body: string[] }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0">
        <div className="font-mono text-3xl font-bold text-zinc-300">{n}</div>
      </div>
      <div className="flex-1 pt-1">
        <h3 className="text-lg font-bold text-zinc-900 mb-3">{title}</h3>
        <div className="space-y-3">
          {body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}

function Pillar({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold text-zinc-900 mb-2">{title}</h3>
      <p className="text-sm text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}

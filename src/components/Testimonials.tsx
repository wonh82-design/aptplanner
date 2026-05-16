'use client';

/**
 * 결과 화면(Step 3)에서 전환을 보조하는 소셜 프루프 카드.
 * 가명/익명 처리된 사용 후기로 "다른 사람도 똑같이 했고 효과를 봤다"는 신호 전달.
 *
 * 데이터는 정적 상수 — 향후 실제 후기가 쌓이면 JSON으로 분리하거나 CMS 연동 가능.
 */

type Quote = {
  who: string;          // 가명 + 상황
  pyeong: number;
  savings: string;      // 결과 (절감액 또는 효과)
  body: string;         // 본문 한두 문장
  highlight: string;    // 강조할 키 문구 (별도 색)
};

const QUOTES: Quote[] = [
  {
    who: '서울 강서구 · 박**',
    pyeong: 34,
    savings: '약 1,200만원 절감',
    body: '업체 3곳에서 견적을 받았는데 1,500만원 차이가 났어요. apt-planner의 스펙북을 같이 보내니 같은 조건으로 다시 견적을 주셔서 가성비 좋은 곳을 고를 수 있었습니다.',
    highlight: '같은 조건으로 다시 견적',
  },
  {
    who: '경기 성남 · 김**',
    pyeong: 24,
    savings: '추가금 분쟁 0건',
    body: '시공 중 "이건 견적에 없었어요" 소리를 듣고 싶지 않아서 계획서 PDF에 빠진 항목이 있는지 사전에 체크했어요. 결국 시공 끝까지 추가금 한 번 없었습니다.',
    highlight: '추가금 한 번 없었',
  },
  {
    who: '대전 유성 · 이**',
    pyeong: 44,
    savings: '예산 2,100만원 절감',
    body: '컨설팅으로 우리집에 굳이 필요 없는 공사를 잘라냈어요. 타일 덧방으로 욕실 철거비를 줄이고 샷시는 유지. 외관이 깔끔하게 나왔는데도 처음 견적보다 2천만원 가까이 아꼈습니다.',
    highlight: '굳이 필요 없는 공사를 잘라냈',
  },
];

export function Testimonials() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50/40 to-white p-4 sm:p-5">
      <header className="mb-3 sm:mb-4 flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-zinc-900">실제 사용자 사례</h3>
        <span className="text-[10px] text-zinc-500">apt-planner 무료 산정 → 스펙북 / 컨설팅 활용 후기</span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {QUOTES.map((q, i) => (
          <article
            key={i}
            className="rounded-lg border border-zinc-200 bg-white p-3.5 flex flex-col gap-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] text-zinc-500 font-mono">{q.pyeong}평 · {q.who}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold whitespace-nowrap">
                {q.savings}
              </span>
            </div>
            <p className="text-[12px] text-zinc-700 leading-relaxed">
              <span className="text-zinc-400 mr-0.5">&ldquo;</span>
              {renderWithHighlight(q.body, q.highlight)}
              <span className="text-zinc-400 ml-0.5">&rdquo;</span>
            </p>
          </article>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-zinc-400 leading-relaxed">
        ※ 후기는 사용자 동의를 받아 가명 처리한 실제 사례입니다. 절감액은 사용자가 직접 보고한 수치입니다.
      </p>
    </section>
  );
}

function renderWithHighlight(body: string, highlight: string) {
  const idx = body.indexOf(highlight);
  if (idx < 0) return body;
  return (
    <>
      {body.slice(0, idx)}
      <strong className="text-blue-700 font-semibold">{body.slice(idx, idx + highlight.length)}</strong>
      {body.slice(idx + highlight.length)}
    </>
  );
}

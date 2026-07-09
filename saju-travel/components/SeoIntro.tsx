import { FAQ, SITE_AWARD } from "@/app/site-config";

// 랜딩(STEP1) 하단의 크롤 가능한 소개/FAQ. '럭키매칭' 키워드를 자연스럽게 노출하고,
// JSON-LD FAQPage(structured-data.tsx)와 동일한 문답을 화면에도 보여준다(구글 정책).
export default function SeoIntro() {
  return (
    <section
      id="open-edition-info"
      className="seo-intro"
      aria-label="럭키매칭 소개"
    >
      <h2 className="seo-h2">럭키매칭이란?</h2>
      <p className="seo-lead">
        <strong>럭키매칭(Lucky Matching)</strong>은 사주 오행으로 오늘 나와 맞는
        국내 여행지를 찾아주는 무료 서비스예요. 생년월일을 넣으면 내 오행을
        분석하고, 원하는 운을 고르면 그 기운을 채워줄 여행지와 실제 여행 상품,
        그리고 매일 바뀌는 일간 사주예보를 보여줘요.
      </p>

      <div className="seo-faq">
        {FAQ.map((f) => (
          <details className="seo-q" key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>

      <p className="seo-award">🏆 {SITE_AWARD}</p>
    </section>
  );
}

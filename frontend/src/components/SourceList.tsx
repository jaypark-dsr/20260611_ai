// 수집 소스 안내. 한국어/영문 소스를 국기 아이콘과 함께 보여준다.
import type { RssSource } from "../types";

export default function SourceList({ sources }: { sources: RssSource[] }) {
  return (
    <section className="future-note" aria-labelledby="sourceHeading">
      <h2 id="sourceHeading" className="section-title">
        수집 소스
      </h2>
      <p>
        매일 아침 아래 RSS 소스에서 자동으로 기사를 모읍니다. 한국어 소스를 우선하며 주제 키워드로
        카테고리를 재분류합니다. 소스는 <code>backend/src/collect/rss-sources.json</code>에서 편집합니다.
      </p>
      <ul className="future-note__list">
        {sources.map((s, i) => (
          <li key={i}>
            {s.lang === "ko" ? "🇰🇷 " : s.lang === "en" ? "🌐 " : ""}
            {s.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

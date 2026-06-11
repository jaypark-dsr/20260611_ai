// 카테고리 필터 버튼 그룹. 데이터에 존재하는 카테고리만 건수와 함께 표시한다.
import type { CategoryDef, NewsItem } from "../types";

interface Props {
  categories: CategoryDef[];
  news: NewsItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function CategoryFilter({ categories, news, active, onChange }: Props) {
  const counts: Record<string, number> = {};
  news.forEach((n) => {
    counts[n.category] = (counts[n.category] || 0) + 1;
  });

  const visible = categories.filter((c) => c.id === "all" || counts[c.id]);

  return (
    <section aria-labelledby="filterHeading">
      <h2 id="filterHeading" className="section-title">
        카테고리
      </h2>
      <div className="filter" role="group" aria-label="뉴스 카테고리 필터">
        {visible.map((c) => {
          const n = c.id === "all" ? news.length : counts[c.id];
          return (
            <button
              key={c.id}
              type="button"
              className="filter__btn"
              aria-pressed={c.id === active}
              onClick={() => onChange(c.id)}
            >
              {c.emoji} {c.label} <span className="filter__count">{n}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

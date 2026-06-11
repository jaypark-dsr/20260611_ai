// 개별 뉴스 카드. 중요도·언어 배지, 북마크, 학습 질문, 원문 링크를 표시한다.
import type { CategoryDef, NewsItem } from "../types";
import { IMPORTANCE_LABEL, categoryLabel, safeUrl } from "../lib/util";

interface Props {
  item: NewsItem;
  categories: CategoryDef[];
  bookmarked: boolean;
  read: boolean;
  onToggleBookmark: (id: string) => void;
  onRead: (id: string) => void;
}

export default function NewsCard({
  item,
  categories,
  bookmarked,
  read,
  onToggleBookmark,
  onRead
}: Props) {
  const url = safeUrl(item.url);
  const cls = `card card--${item.importance}` + (read ? " is-read" : "");

  // 카드 본문 클릭 시 읽음 처리하고 원문을 새 탭으로 연다.
  const handleCardClick = () => {
    onRead(item.id);
    if (url !== "#") {
      window.open(url, "_blank", "noopener");
    }
  };

  return (
    <article className={cls} onClick={handleCardClick}>
      <div className="card__top">
        <span className="card__category">{categoryLabel(categories, item.category)}</span>
        <span className={`badge badge--${item.importance}`}>
          {IMPORTANCE_LABEL[item.importance]}
        </span>
        {item.lang === "ko" && <span className="badge badge--ko">한국어</span>}
        {item.lang === "en" && <span className="badge badge--en">EN</span>}
        <button
          type="button"
          className="card__bookmark"
          aria-pressed={bookmarked}
          aria-label="북마크 토글"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(item.id);
          }}
        >
          {bookmarked ? "★" : "☆"}
        </button>
      </div>

      <h3 className="card__title">{item.title}</h3>
      <p className="card__summary">{item.summary}</p>

      {item.tags.length > 0 && (
        <div className="card__tags">
          {item.tags.map((tag, i) => (
            <span key={i} className="card__tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {item.learningQuestion && (
        <div className="card__learning">
          <strong>학습 질문</strong>
          {item.learningQuestion}
        </div>
      )}

      <div className="card__meta">
        <span className="card__source">
          📰 {item.source || "출처 미상"} · ⏱ {item.readingTime || "?"}분
        </span>
        <a
          className="card__link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            onRead(item.id);
          }}
        >
          원문 ↗
        </a>
      </div>
    </article>
  );
}

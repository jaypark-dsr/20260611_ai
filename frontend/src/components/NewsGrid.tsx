// 필터링된 뉴스 카드 목록과 건수, 빈 상태를 렌더링한다.
import type { CategoryDef, NewsItem } from "../types";
import NewsCard from "./NewsCard";

interface Props {
  items: NewsItem[];
  total: number;
  categories: CategoryDef[];
  bookmarks: Set<string>;
  read: Set<string>;
  onToggleBookmark: (id: string) => void;
  onRead: (id: string) => void;
}

export default function NewsGrid({
  items,
  total,
  categories,
  bookmarks,
  read,
  onToggleBookmark,
  onRead
}: Props) {
  return (
    <section aria-labelledby="newsHeading">
      <div className="section-head">
        <h2 id="newsHeading" className="section-title">
          뉴스
        </h2>
        <p className="news-count" aria-live="polite">
          총 {items.length}건{items.length !== total ? ` / 전체 ${total}건` : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="empty-state">조건에 맞는 뉴스가 없습니다.</p>
      ) : (
        <div className="news-grid">
          {items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              categories={categories}
              bookmarked={bookmarks.has(item.id)}
              read={read.has(item.id)}
              onToggleBookmark={onToggleBookmark}
              onRead={onRead}
            />
          ))}
        </div>
      )}
    </section>
  );
}

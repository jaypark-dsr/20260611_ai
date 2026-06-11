// 기간 모드, 기간 선택, 검색, 중요·북마크·읽음 필터를 담은 도구 모음.
import type { ViewMode } from "../types";

interface Props {
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  periodOptions: string[];
  periodValue: string;
  onPeriod: (v: string) => void;
  search: string;
  onSearch: (v: string) => void;
  importantOnly: boolean;
  bookmarkOnly: boolean;
  unreadOnly: boolean;
  onToggle: (key: "importantOnly" | "bookmarkOnly" | "unreadOnly") => void;
}

const MODES: { id: ViewMode; label: string }[] = [
  { id: "latest", label: "최신" },
  { id: "day", label: "일자별" },
  { id: "month", label: "월별" }
];

export default function Toolbar(props: Props) {
  const {
    viewMode,
    onViewMode,
    periodOptions,
    periodValue,
    onPeriod,
    search,
    onSearch,
    importantOnly,
    bookmarkOnly,
    unreadOnly,
    onToggle
  } = props;

  return (
    <section className="toolbar" aria-label="뉴스 검색과 보기 옵션">
      <div className="toolbar__field toolbar__field--mode">
        <span className="toolbar__label" id="viewModeLabel">
          기간
        </span>
        <div className="segmented" role="group" aria-labelledby="viewModeLabel">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="segmented__btn"
              aria-pressed={viewMode === m.id}
              onClick={() => onViewMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode !== "latest" && (
        <div className="toolbar__field toolbar__field--period">
          <label className="toolbar__label" htmlFor="periodSelect">
            {viewMode === "day" ? "날짜" : "월"}
          </label>
          <select
            id="periodSelect"
            className="toolbar__select"
            value={periodValue}
            onChange={(e) => onPeriod(e.target.value)}
            aria-label="기간 선택"
          >
            {periodOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="toolbar__field toolbar__field--search">
        <label className="toolbar__label" htmlFor="searchInput">
          검색
        </label>
        <input
          id="searchInput"
          type="search"
          className="toolbar__search"
          placeholder="제목, 요약, 태그 검색"
          autoComplete="off"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="toolbar__toggles">
        <button
          type="button"
          className={"toolbar__toggle" + (importantOnly ? " is-active" : "")}
          aria-pressed={importantOnly}
          onClick={() => onToggle("importantOnly")}
        >
          <span aria-hidden="true">🔥</span> 중요만
        </button>
        <button
          type="button"
          className={"toolbar__toggle" + (bookmarkOnly ? " is-active" : "")}
          aria-pressed={bookmarkOnly}
          onClick={() => onToggle("bookmarkOnly")}
        >
          <span aria-hidden="true">★</span> 북마크만
        </button>
        <button
          type="button"
          className={"toolbar__toggle" + (unreadOnly ? " is-active" : "")}
          aria-pressed={unreadOnly}
          onClick={() => onToggle("unreadOnly")}
        >
          <span aria-hidden="true">●</span> 안 읽은 것만
        </button>
      </div>
    </section>
  );
}

// 대시보드 전체 상태를 조율하는 루트 컴포넌트. 데이터 로드, 기간 보기, 필터를 관리한다.
import { useEffect, useMemo, useState } from "react";
import type { Dashboard, ViewMode } from "./types";
import { fetchArchiveIndex, fetchDay, fetchLatest, fetchMonth } from "./lib/api";
import { useTheme } from "./hooks/useTheme";
import { usePersistentSet } from "./hooks/usePersistentSet";
import Header from "./components/Header";
import DataNotice from "./components/DataNotice";
import SummaryCard from "./components/SummaryCard";
import CategoryFilter from "./components/CategoryFilter";
import Toolbar from "./components/Toolbar";
import NewsGrid from "./components/NewsGrid";
import LearningPanels from "./components/LearningPanels";
import SourceList from "./components/SourceList";
import Footer from "./components/Footer";

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const bookmarks = usePersistentSet("news-dashboard:bookmarks");
  const read = usePersistentSet("news-dashboard:read");

  const [data, setData] = useState<Dashboard | null>(null);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("latest");
  const [periodValue, setPeriodValue] = useState("");

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [importantOnly, setImportantOnly] = useState(false);
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  // 기간 셀렉트 옵션 (일자 목록 또는 월 목록)
  const periodOptions = useMemo(() => {
    if (viewMode === "day") {
      return archiveDates;
    }
    if (viewMode === "month") {
      const months: string[] = [];
      archiveDates.forEach((d) => {
        const m = d.slice(0, 7);
        if (!months.includes(m)) {
          months.push(m);
        }
      });
      return months;
    }
    return [];
  }, [viewMode, archiveDates]);

  async function load(mode: ViewMode, value: string) {
    try {
      let d: Dashboard;
      if (mode === "day") {
        d = await fetchDay(value);
      } else if (mode === "month") {
        d = await fetchMonth(value);
      } else {
        d = await fetchLatest();
      }
      setData(d);
      setLoadError(false);
      setActiveCategory("all");
    } catch {
      setLoadError(true);
    }
  }

  // 최초 로드: 아카이브 인덱스와 최신 데이터
  useEffect(() => {
    fetchArchiveIndex()
      .then((idx) => setArchiveDates(Array.isArray(idx.dates) ? idx.dates : []))
      .catch(() => setArchiveDates([]));
    load("latest", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onViewMode(mode: ViewMode) {
    if (mode === viewMode) {
      return;
    }
    setViewMode(mode);
    if (mode === "latest") {
      setPeriodValue("");
      load("latest", "");
      return;
    }
    const opts =
      mode === "day"
        ? archiveDates
        : archiveDates.reduce<string[]>((acc, d) => {
            const m = d.slice(0, 7);
            if (!acc.includes(m)) {
              acc.push(m);
            }
            return acc;
          }, []);
    const first = opts[0] || "";
    setPeriodValue(first);
    if (first) {
      load(mode, first);
    }
  }

  function onPeriod(value: string) {
    setPeriodValue(value);
    load(viewMode, value);
  }

  function onToggle(key: "importantOnly" | "bookmarkOnly" | "unreadOnly") {
    if (key === "importantOnly") setImportantOnly((v) => !v);
    if (key === "bookmarkOnly") setBookmarkOnly((v) => !v);
    if (key === "unreadOnly") setUnreadOnly((v) => !v);
  }

  // 카테고리·검색·중요·북마크·읽음 필터를 모두 AND로 결합
  const filtered = useMemo(() => {
    if (!data) {
      return [];
    }
    const q = search.trim().toLowerCase();
    return data.news.filter((n) => {
      if (activeCategory !== "all" && n.category !== activeCategory) return false;
      if (importantOnly && n.importance !== "high") return false;
      if (bookmarkOnly && !bookmarks.set.has(n.id)) return false;
      if (unreadOnly && read.set.has(n.id)) return false;
      if (q) {
        const hay = (n.title + " " + n.summary + " " + n.tags.join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, activeCategory, search, importantOnly, bookmarkOnly, unreadOnly, bookmarks.set, read.set]);

  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <Header date={data?.dailySummary.date ?? ""} theme={theme} onToggleTheme={toggleTheme} />

      <main id="main" className="container" role="main">
        {loadError && <DataNotice onClose={() => setLoadError(false)} />}

        {data ? (
          <>
            <SummaryCard summary={data.dailySummary} />
            <CategoryFilter
              categories={data.categories}
              news={data.news}
              active={activeCategory}
              onChange={setActiveCategory}
            />
            <Toolbar
              viewMode={viewMode}
              onViewMode={onViewMode}
              periodOptions={periodOptions}
              periodValue={periodValue}
              onPeriod={onPeriod}
              search={search}
              onSearch={setSearch}
              importantOnly={importantOnly}
              bookmarkOnly={bookmarkOnly}
              unreadOnly={unreadOnly}
              onToggle={onToggle}
            />
            <NewsGrid
              items={filtered}
              total={data.news.length}
              categories={data.categories}
              bookmarks={bookmarks.set}
              read={read.set}
              onToggleBookmark={bookmarks.toggle}
              onRead={read.add}
            />
            <LearningPanels
              teamQuestions={data.teamLearningQuestions}
              discussionTopics={data.discussionTopics}
              recommendedRoutine={data.recommendedRoutine}
            />
            <SourceList sources={data.rssSources} />
          </>
        ) : (
          !loadError && <p className="empty-state">불러오는 중…</p>
        )}
      </main>

      {data && <Footer meta={data.meta} />}
    </>
  );
}

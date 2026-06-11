// 사이트 헤더. 제목, 기준 날짜, 다크 모드 토글을 표시한다.
interface Props {
  date: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Header({ date, theme, onToggleTheme }: Props) {
  const isDark = theme === "dark";
  return (
    <header className="site-header" role="banner">
      <div className="container site-header__inner">
        <div className="site-header__brand">
          <span className="site-header__logo" aria-hidden="true">
            📰
          </span>
          <div>
            <h1 className="site-header__title">전산팀 뉴스 대시보드</h1>
            <p className="site-header__subtitle">매일 아침, 오늘의 IT를 함께 읽고 학습합니다.</p>
          </div>
        </div>
        <div className="site-header__actions">
          <p className="site-header__date" aria-live="polite">
            {date ? `${date} 기준` : ""}
          </p>
          <button
            type="button"
            className="theme-toggle"
            aria-pressed={isDark}
            aria-label="다크 모드 전환"
            onClick={onToggleTheme}
          >
            <span className="theme-toggle__icon" aria-hidden="true">
              {isDark ? "☀️" : "🌙"}
            </span>
            <span className="theme-toggle__label">{isDark ? "라이트" : "다크"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

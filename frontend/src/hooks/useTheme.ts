// 다크/라이트 테마를 관리하는 훅. localStorage에 저장하고 첫 방문 시 OS 설정을 따른다.
import { useCallback, useEffect, useState } from "react";

const KEY = "news-dashboard:theme";
type Theme = "light" | "dark";

function initial(): Theme {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    /* 무시 */
  }
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      /* 무시 */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}

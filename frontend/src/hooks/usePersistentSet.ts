// localStorage에 문자열 id 집합을 영속하는 훅. 북마크와 읽음 표시에 쓴다.
import { useCallback, useState } from "react";

function load(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function usePersistentSet(key: string) {
  const [set, setSet] = useState<Set<string>>(() => load(key));

  const save = useCallback(
    (next: Set<string>) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch {
        /* 저장 실패는 무시한다 */
      }
    },
    [key]
  );

  const toggle = useCallback(
    (id: string) => {
      setSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        save(next);
        return next;
      });
    },
    [save]
  );

  const add = useCallback(
    (id: string) => {
      setSet((prev) => {
        if (prev.has(id)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(id);
        save(next);
        return next;
      });
    },
    [save]
  );

  return { set, toggle, add };
}

// 공용 헬퍼. URL 안전 검증과 중요도 라벨.
import type { CategoryDef, Importance } from "../types";

export function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url || "") ? url : "#";
}

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  high: "중요",
  medium: "보통",
  low: "참고"
};

export function categoryLabel(categories: CategoryDef[], id: string): string {
  const found = categories.find((c) => c.id === id);
  return found ? `${found.emoji} ${found.label}` : id;
}

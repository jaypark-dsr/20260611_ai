// 뉴스 데이터 구조를 정의하는 공용 타입

export type Category = "it" | "ai" | "security" | "cloud" | "dev" | "economy";
export type Importance = "high" | "medium" | "low";

export interface NewsItem {
  id: string;
  category: Category;
  title: string;
  summary: string;
  source: string;
  lang: "ko" | "en" | "";
  url: string;
  importance: Importance;
  readingTime: number;
  tags: string[];
  publishedAt: string;
  learningQuestion: string;
  isSample: boolean;
}

export interface CategoryDef {
  id: string;
  label: string;
  emoji: string;
}

export interface DailySummary {
  date: string;
  headline: string;
  points: string[];
}

export interface RssSource {
  category: string;
  name: string;
  lang?: string;
  url?: string;
  status?: string;
}

export interface Dashboard {
  meta: Record<string, unknown>;
  dailySummary: DailySummary;
  categories: CategoryDef[];
  news: NewsItem[];
  teamLearningQuestions: string[];
  discussionTopics: string[];
  recommendedRoutine: string[];
  rssSources: RssSource[];
}

export interface ArchiveIndex {
  dates: string[];
}

// 뉴스 데이터와 일자별·월별 아카이브를 제공하는 Express API 서버

import express from "express";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Dashboard, ArchiveIndex, NewsItem } from "./types.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, "..", "data");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");
const FRONTEND_DIST = path.resolve(HERE, "..", "..", "frontend", "dist");
const PORT = Number(process.env.PORT) || 3001;

const app = express();

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf-8")) as T;
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const monthRe = /^\d{4}-\d{2}$/;

// 최신 뉴스
app.get("/api/news", async (_req, res) => {
  try {
    res.json(await readJson<Dashboard>(path.join(DATA_DIR, "news.json")));
  } catch {
    res.status(500).json({ error: "news.json을 읽지 못했습니다." });
  }
});

// 아카이브 날짜 목록
app.get("/api/archive", async (_req, res) => {
  try {
    res.json(await readJson<ArchiveIndex>(path.join(ARCHIVE_DIR, "index.json")));
  } catch {
    res.json({ dates: [] });
  }
});

// 특정 일자
app.get("/api/news/:date", async (req, res) => {
  const { date } = req.params;
  if (!dateRe.test(date)) {
    res.status(400).json({ error: "날짜 형식 오류" });
    return;
  }
  try {
    res.json(await readJson<Dashboard>(path.join(ARCHIVE_DIR, `${date}.json`)));
  } catch {
    res.status(404).json({ error: "해당 날짜 데이터가 없습니다." });
  }
});

// 특정 월(한 달치 병합)
app.get("/api/month/:month", async (req, res) => {
  const { month } = req.params;
  if (!monthRe.test(month)) {
    res.status(400).json({ error: "월 형식 오류" });
    return;
  }
  try {
    const idx = await readJson<ArchiveIndex>(path.join(ARCHIVE_DIR, "index.json"));
    const dates = (idx.dates || []).filter((d) => d.startsWith(month));
    const seen = new Set<string>();
    const merged: NewsItem[] = [];
    let base: Dashboard | null = null;
    for (const d of dates) {
      try {
        const day = await readJson<Dashboard>(path.join(ARCHIVE_DIR, `${d}.json`));
        if (!base) base = day;
        for (const n of day.news || []) {
          if (!seen.has(n.id)) {
            seen.add(n.id);
            merged.push(n);
          }
        }
      } catch {
        /* 개별 날짜 파일 실패는 건너뛴다 */
      }
    }
    if (!base) {
      res.status(404).json({ error: "해당 월 데이터가 없습니다." });
      return;
    }
    const highs = merged.filter((n) => n.importance === "high").length;
    res.json({
      meta: { lastUpdated: month, total: merged.length },
      dailySummary: {
        date: month,
        headline: `${month} 한 달 동안 ${dates.length}일치 ${merged.length}건을 모았습니다${
          highs ? ` (중요 ${highs}건).` : "."
        }`,
        points: []
      },
      categories: base.categories,
      news: merged,
      teamLearningQuestions: base.teamLearningQuestions,
      discussionTopics: base.discussionTopics,
      recommendedRoutine: base.recommendedRoutine,
      rssSources: base.rssSources
    } satisfies Dashboard);
  } catch {
    res.status(500).json({ error: "월 데이터 병합 실패" });
  }
});

// 프로덕션에서는 프론트엔드 빌드 결과를 정적 서빙한다(단일 서버 배포).
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
  console.log("프론트엔드 정적 서빙 활성화:", FRONTEND_DIST);
}

app.listen(PORT, () => {
  console.log(`뉴스 API 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

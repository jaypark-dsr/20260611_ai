// RSS 피드를 수집해 news.json과 일자별 아카이브를 생성하는 자동 수집 스크립트

import Parser from "rss-parser";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "assets", "data");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");
const NEWS_PATH = path.join(DATA_DIR, "news.json");
const SOURCES_PATH = path.join(ROOT, "scripts", "rss-sources.json");

const SUMMARY_MAX = 200;
const FEED_TIMEOUT_MS = 15000;

// 한국 표준시(KST, UTC+9) 기준 날짜 문자열을 만든다.
function kstDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// 링크를 기반으로 안정적인 짧은 id를 만든다. 북마크가 날짜와 무관하게 유지되도록 한다.
function hashId(category, link) {
  let hash = 0;
  const text = String(link || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return category + "-" + (hash >>> 0).toString(36);
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, max) {
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max - 1).trimEnd() + "…";
}

// 요약 길이로 대략적인 읽기 시간을 추정한다. 최소 2분, 최대 10분.
function estimateReadingTime(text) {
  const minutes = Math.round(text.length / 300);
  return Math.min(10, Math.max(2, minutes || 2));
}

function toIsoDate(item) {
  const raw = item.isoDate || item.pubDate;
  if (!raw) {
    return "";
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function mapItem(feedItem, feed) {
  const title = cleanText(feedItem.title);
  const link = (feedItem.link || "").trim();
  const summarySource = feedItem.contentSnippet || feedItem.summary || feedItem.content || "";
  const summary = truncate(cleanText(summarySource), SUMMARY_MAX);
  const tags = Array.isArray(feedItem.categories)
    ? feedItem.categories.map((c) => cleanText(typeof c === "string" ? c : c && c._)).filter(Boolean).slice(0, 3)
    : [];

  return {
    id: hashId(feed.category, link),
    category: feed.category,
    title,
    summary: summary || "요약 정보가 제공되지 않았습니다. 원문 링크를 확인하세요.",
    source: feed.name,
    url: link,
    importance: "medium",
    readingTime: estimateReadingTime(summary || title),
    tags,
    publishedAt: toIsoDate(feedItem),
    learningQuestion: "",
    isSample: false
  };
}

async function collectFeeds(sources) {
  const parser = new Parser({
    timeout: FEED_TIMEOUT_MS,
    headers: { "User-Agent": "news-dashboard-collector/1.0 (+internal)" }
  });
  const limit = sources.perFeedLimit || 5;
  const seen = new Set();
  const collected = [];
  let okFeeds = 0;

  for (const feed of sources.feeds) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, limit);
      let added = 0;
      for (const raw of items) {
        const mapped = mapItem(raw, feed);
        if (!mapped.title || !mapped.url || seen.has(mapped.url)) {
          continue;
        }
        seen.add(mapped.url);
        collected.push(mapped);
        added += 1;
      }
      okFeeds += 1;
      console.log(`[OK] ${feed.category}/${feed.name} — ${added}건`);
    } catch (error) {
      console.warn(`[SKIP] ${feed.category}/${feed.name} — ${error.message}`);
    }
  }

  // 최신순 정렬. 날짜 없는 항목은 뒤로 보낸다.
  collected.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  return { collected, okFeeds };
}

function buildSummary(news, date) {
  const byCategory = {};
  for (const item of news) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }
  const parts = Object.keys(byCategory).map((cat) => `${cat} ${byCategory[cat]}건`);
  return {
    date,
    headline: `오늘 ${news.length}건의 기사를 자동 수집했습니다. 관심 카테고리를 골라 빠르게 훑어보세요.`,
    points: news.slice(0, 3).map((item) => `[${item.category}] ${item.title}`)
  };
}

async function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function updateArchiveIndex(date) {
  const indexPath = path.join(ARCHIVE_DIR, "index.json");
  const index = await readJsonSafe(indexPath, { dates: [] });
  if (!index.dates.includes(date)) {
    index.dates.push(date);
  }
  index.dates.sort((a, b) => b.localeCompare(a));
  await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf-8");
}

async function main() {
  const sources = JSON.parse(await readFile(SOURCES_PATH, "utf-8"));
  const existing = await readJsonSafe(NEWS_PATH, {});
  const date = kstDate();

  const { collected, okFeeds } = await collectFeeds(sources);

  if (collected.length === 0) {
    console.error("수집된 기사가 없습니다. 기존 news.json을 유지하고 종료합니다.");
    process.exit(okFeeds === 0 ? 1 : 0);
    return;
  }

  // 사람이 큐레이션한 필드는 보존하고 news 배열과 메타, 요약만 갱신한다.
  const output = {
    meta: {
      lastUpdated: date,
      editor: "자동 수집 (GitHub Actions)",
      note: "RSS 자동 수집 결과다. 제목, 출처, 링크, 요약 스니펫만 저장한다. 본문 전체는 저장하지 않는다."
    },
    dailySummary: buildSummary(collected, date),
    categories: existing.categories || [],
    news: collected,
    teamLearningQuestions: existing.teamLearningQuestions || [],
    discussionTopics: existing.discussionTopics || [],
    recommendedRoutine: existing.recommendedRoutine || [],
    rssSources: (sources.feeds || []).map((f) => ({
      category: f.category,
      name: f.name,
      url: f.url,
      status: "수집 중"
    }))
  };

  if (!existsSync(ARCHIVE_DIR)) {
    await mkdir(ARCHIVE_DIR, { recursive: true });
  }

  const payload = JSON.stringify(output, null, 2) + "\n";
  await writeFile(NEWS_PATH, payload, "utf-8");
  await writeFile(path.join(ARCHIVE_DIR, `${date}.json`), payload, "utf-8");
  await updateArchiveIndex(date);

  console.log(`\n완료. 총 ${collected.length}건 (피드 ${okFeeds}/${sources.feeds.length} 성공). 날짜 ${date}.`);
}

main().catch((error) => {
  console.error("수집 중 오류:", error);
  process.exit(1);
});

// RSS 피드를 수집해 주제별로 재분류하고 news.json과 일자별 아카이브를 생성하는 자동 수집 스크립트

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
const SUMMARY_MIN = 25; // 이보다 짧은 요약은 빈약한 것으로 보고 제외한다.
const FEED_TIMEOUT_MS = 15000;

// 수집 실패 등으로 기존 카테고리를 못 읽을 때 쓸 기본 카테고리.
const DEFAULT_CATEGORIES = [
  { id: "all", label: "전체", emoji: "🗂️" },
  { id: "it", label: "IT", emoji: "💻" },
  { id: "ai", label: "AI", emoji: "🤖" },
  { id: "security", label: "보안", emoji: "🔒" },
  { id: "cloud", label: "클라우드", emoji: "☁️" },
  { id: "dev", label: "개발", emoji: "🛠️" },
  { id: "economy", label: "경제", emoji: "📈" }
];
const CATEGORY_LABEL = {
  it: "IT", ai: "AI", security: "보안", cloud: "클라우드", dev: "개발", economy: "경제"
};

// 한국 표준시(KST, UTC+9) 기준 날짜 문자열을 만든다.
function kstDate() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// 자주 등장하는 HTML 엔티티를 실제 문자로 되돌린다. 이중 인코딩과 깨진 제목을 막는다.
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  hellip: "…", mdash: "—", ndash: "–", middot: "·",
  copy: "©", reg: "®", trade: "™", deg: "°", times: "×"
};
function decodeEntities(text) {
  return String(text).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)
      ? NAMED_ENTITIES[body]
      : match;
  });
}

function cleanText(value) {
  return decodeEntities(String(value || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, max) {
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max - 1).trimEnd() + "…";
}

// http/https 링크만 통과시켜 javascript: 등 위험 스킴을 차단한다.
function safeUrl(link) {
  const url = String(link || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

// 제목과 요약을 길이로 환산해 대략적 읽기 시간을 추정한다. 최소 1분, 최대 10분.
function estimateReadingTime(title, summary) {
  const minutes = Math.round((title.length + summary.length) / 220);
  return Math.min(10, Math.max(1, minutes));
}

function toIsoDate(item) {
  const raw = item.isoDate || item.pubDate;
  if (!raw) {
    return "";
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// 제목+요약을 키워드로 스캔해 주제 카테고리를 정한다. 종합지 피드는 키워드가 없으면 null(제외).
function classifyCategory(text, feed, rules) {
  const lower = text.toLowerCase();
  for (const cat of rules.categoryPriority) {
    const kws = rules.keywords[cat] || [];
    for (const kw of kws) {
      if (lower.indexOf(kw.toLowerCase()) !== -1) {
        return cat;
      }
    }
  }
  return feed.requireKeyword ? null : feed.category;
}

// 보안 사고, 긴급 패치 등은 high, 단순 리뷰/루머/할인은 low, 나머지는 medium으로 자동 분류한다.
function classifyImportance(text, rules) {
  const lower = text.toLowerCase();
  for (const kw of rules.importanceKeywords.high || []) {
    if (lower.indexOf(kw.toLowerCase()) !== -1) {
      return "high";
    }
  }
  for (const kw of rules.importanceKeywords.low || []) {
    if (lower.indexOf(kw.toLowerCase()) !== -1) {
      return "low";
    }
  }
  return "medium";
}

// "Comments"처럼 내용 없는 스니펫을 걸러낸다.
function isWeakSummary(summary) {
  if (!summary || summary.length < SUMMARY_MIN) {
    return true;
  }
  return /^comments?$/i.test(summary.trim());
}

function normalizeTitleKey(title) {
  return title.toLowerCase().replace(/[^0-9a-z가-힣]/g, "").slice(0, 30);
}

function hashId(category, link) {
  let hash = 0;
  const text = String(link || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return category + "-" + (hash >>> 0).toString(36);
}

function mapItem(feedItem, feed, rules) {
  const title = cleanText(feedItem.title);
  const url = safeUrl(feedItem.link);
  const summarySource =
    feedItem.contentSnippet || feedItem.summary || feedItem.content || "";
  const summary = truncate(cleanText(summarySource), SUMMARY_MAX);

  if (!title || !url || isWeakSummary(summary)) {
    return null;
  }

  const haystack = title + " " + summary;
  const category = classifyCategory(haystack, feed, rules);
  if (!category) {
    return null; // 종합지에서 관련 키워드가 없는 기사는 제외한다.
  }

  const tags = Array.isArray(feedItem.categories)
    ? feedItem.categories
        .map((c) => cleanText(typeof c === "string" ? c : c && c._))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return {
    id: hashId(category, url),
    category,
    title,
    summary,
    source: feed.name,
    lang: feed.lang || "",
    url,
    importance: classifyImportance(haystack, rules),
    readingTime: estimateReadingTime(title, summary),
    tags,
    publishedAt: toIsoDate(feedItem),
    learningQuestion: (rules.learningQuestions && rules.learningQuestions[category]) || "",
    isSample: false
  };
}

async function collectFeeds(rules) {
  const parser = new Parser({
    timeout: FEED_TIMEOUT_MS,
    headers: { "User-Agent": "Mozilla/5.0 (news-dashboard-collector/2.0; +internal)" }
  });
  const limit = rules.perFeedLimit || 5;
  const seenUrl = new Set();
  const seenTitle = new Set();
  const collected = [];
  let okFeeds = 0;

  for (const feed of rules.feeds) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, limit);
      let added = 0;
      for (const raw of items) {
        const mapped = mapItem(raw, feed, rules);
        if (!mapped) {
          continue;
        }
        const titleKey = normalizeTitleKey(mapped.title);
        if (seenUrl.has(mapped.url) || (titleKey && seenTitle.has(titleKey))) {
          continue; // URL 또는 제목 기준 중복 제거
        }
        seenUrl.add(mapped.url);
        if (titleKey) {
          seenTitle.add(titleKey);
        }
        collected.push(mapped);
        added += 1;
      }
      okFeeds += 1;
      console.log(`[OK]   ${feed.name} (${feed.lang || "?"}) — ${added}건`);
    } catch (error) {
      console.warn(`[SKIP] ${feed.name} — ${error.message}`);
    }
  }

  // 중요도 high 우선, 그다음 최신순으로 정렬한다.
  const weight = { high: 0, medium: 1, low: 2 };
  collected.sort((a, b) => {
    const w = (weight[a.importance] || 1) - (weight[b.importance] || 1);
    if (w !== 0) {
      return w;
    }
    return (b.publishedAt || "").localeCompare(a.publishedAt || "");
  });
  return { collected, okFeeds };
}

function buildSummary(news, date) {
  const highs = news.filter((n) => n.importance === "high");
  const top = (highs.length ? highs : news).slice(0, 3);
  const headline =
    highs.length > 0
      ? `오늘은 중요 이슈 ${highs.length}건을 포함해 총 ${news.length}건을 모았습니다. 우선순위 높은 소식부터 확인하세요.`
      : `오늘은 총 ${news.length}건의 소식을 모았습니다. 관심 카테고리를 골라 빠르게 훑어보세요.`;
  return {
    date,
    headline,
    points: top.map((n) => `[${CATEGORY_LABEL[n.category] || n.category}] ${n.title}`)
  };
}

// 그날 수집된 카테고리 분포를 한 줄 토론거리로 만든다.
function buildDiscussion(news) {
  const counts = {};
  news.forEach((n) => {
    counts[n.category] = (counts[n.category] || 0) + 1;
  });
  const top = Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 2)
    .map((c) => CATEGORY_LABEL[c] || c);
  const topics = [];
  if (top.length) {
    topics.push(`오늘 ${top.join(", ")} 소식이 가장 많았습니다. 우리 업무와 연결되는 지점은 무엇일까요?`);
  }
  topics.push("오늘 본 기사 중 이번 주 안에 팀에 공유하거나 시도해 볼 한 가지는 무엇인가요?");
  return topics;
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
  if (!Array.isArray(index.dates)) {
    index.dates = [];
  }
  if (!index.dates.includes(date)) {
    index.dates.push(date);
  }
  index.dates.sort((a, b) => b.localeCompare(a));
  await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf-8");
}

async function main() {
  const rules = JSON.parse(await readFile(SOURCES_PATH, "utf-8"));
  const existing = await readJsonSafe(NEWS_PATH, {});
  const date = kstDate();

  const { collected, okFeeds } = await collectFeeds(rules);

  if (collected.length === 0) {
    console.error("수집된 기사가 없습니다. 기존 news.json을 유지하고 종료합니다.");
    process.exit(okFeeds === 0 ? 1 : 0);
    return;
  }

  const langCount = collected.filter((n) => n.lang === "ko").length;
  const output = {
    meta: {
      lastUpdated: date,
      editor: "자동 수집 (GitHub Actions)",
      note: "RSS 자동 수집 결과다. 제목, 출처, 링크, 요약 스니펫만 저장한다. 본문 전체는 저장하지 않는다.",
      koCount: langCount,
      total: collected.length
    },
    dailySummary: buildSummary(collected, date),
    categories: existing.categories && existing.categories.length ? existing.categories : DEFAULT_CATEGORIES,
    news: collected,
    teamLearningQuestions:
      existing.teamLearningQuestions && existing.teamLearningQuestions.length
        ? existing.teamLearningQuestions
        : [
            "오늘 본 기사 중 우리 업무에 바로 적용할 수 있는 것은 무엇인가?",
            "보안 중요 이슈를 우리 시스템 점검 절차에 어떻게 연결할 수 있는가?",
            "새로운 기술이나 도구 도입 시 우리 팀이 먼저 합의해야 할 기준은 무엇인가?"
          ],
    discussionTopics: buildDiscussion(collected),
    recommendedRoutine:
      existing.recommendedRoutine && existing.recommendedRoutine.length
        ? existing.recommendedRoutine
        : [
            "오늘의 핵심 요약과 중요 이슈를 먼저 확인한다.",
            "내 담당 영역 카테고리를 필터로 골라 자세히 읽는다.",
            "학습 질문 중 하나를 골라 5분간 생각하고 메모한다.",
            "업무에 적용할 아이디어 한 가지를 팀 채널에 공유한다."
          ],
    rssSources: (rules.feeds || []).map((f) => ({
      category: f.category,
      name: f.name,
      lang: f.lang || "",
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

  const byCat = {};
  collected.forEach((n) => {
    byCat[n.category] = (byCat[n.category] || 0) + 1;
  });
  console.log(
    `\n완료. 총 ${collected.length}건 (한국어 ${langCount}건, 피드 ${okFeeds}/${rules.feeds.length} 성공). 날짜 ${date}.`
  );
  console.log("카테고리 분포:", JSON.stringify(byCat));
}

main().catch((error) => {
  console.error("수집 중 오류:", error);
  process.exit(1);
});

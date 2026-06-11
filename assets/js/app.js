// 뉴스 데이터를 불러와 대시보드 화면을 렌더링하고 카테고리 필터를 처리한다

(function () {
  "use strict";

  // fetch 실패 시(예: file://에서 직접 열어 로컬 JSON 로드가 차단된 경우) 사용할 최소 폴백 데이터.
  // 실제 데이터는 assets/data/news.json을 편집한다.
  var FALLBACK_DATA = {
    meta: { lastUpdated: "데이터 미연결", editor: "전산팀", note: "폴백 데이터" },
    dailySummary: {
      date: "",
      headline: "news.json을 불러오지 못해 폴백 데이터를 표시합니다. 로컬 서버로 열면 실제 데이터가 표시됩니다.",
      points: ["터미널에서 python -m http.server 8000 을 실행한 뒤 http://localhost:8000 을 여세요."]
    },
    categories: [
      { id: "all", label: "전체", emoji: "🗂️" },
      { id: "it", label: "IT", emoji: "💻" },
      { id: "ai", label: "AI", emoji: "🤖" },
      { id: "security", label: "보안", emoji: "🔒" },
      { id: "cloud", label: "클라우드", emoji: "☁️" },
      { id: "dev", label: "개발", emoji: "🛠️" },
      { id: "economy", label: "경제", emoji: "📈" }
    ],
    news: [],
    teamLearningQuestions: [],
    discussionTopics: [],
    recommendedRoutine: [],
    rssSources: []
  };

  var IMPORTANCE_LABEL = { high: "중요", medium: "보통", low: "참고" };
  var state = { data: null, activeCategory: "all" };

  // HTML 삽입 시 특수문자를 이스케이프해 안전하게 텍스트로 출력한다.
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getCategoryLabel(id) {
    var found = (state.data.categories || []).find(function (c) {
      return c.id === id;
    });
    return found ? found.emoji + " " + found.label : id;
  }

  // 오늘 날짜를 한국어로 표시한다.
  function renderTodayDate() {
    var summaryDate = state.data.dailySummary && state.data.dailySummary.date;
    var el = document.getElementById("todayDate");
    if (summaryDate) {
      el.textContent = summaryDate + " 기준";
    } else {
      el.textContent = "";
    }
  }

  function renderSummary() {
    var summary = state.data.dailySummary || {};
    document.getElementById("summaryHeadline").textContent = summary.headline || "";
    var list = document.getElementById("summaryPoints");
    list.innerHTML = (summary.points || [])
      .map(function (point) {
        return "<li>" + escapeHtml(point) + "</li>";
      })
      .join("");
  }

  // 카테고리 필터 버튼을 만든다. 데이터에 실제로 존재하는 카테고리만 노출한다.
  function renderFilter() {
    var container = document.getElementById("categoryFilter");
    var usedCategories = state.data.news.map(function (n) {
      return n.category;
    });

    var buttons = (state.data.categories || [])
      .filter(function (c) {
        return c.id === "all" || usedCategories.indexOf(c.id) !== -1;
      })
      .map(function (c) {
        var pressed = c.id === state.activeCategory ? "true" : "false";
        return (
          '<button type="button" class="filter__btn" data-category="' +
          escapeHtml(c.id) +
          '" aria-pressed="' +
          pressed +
          '">' +
          escapeHtml(c.emoji + " " + c.label) +
          "</button>"
        );
      })
      .join("");

    container.innerHTML = buttons;

    container.querySelectorAll(".filter__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.activeCategory = btn.getAttribute("data-category");
        renderFilter();
        renderNews();
      });
    });
  }

  function getFilteredNews() {
    if (state.activeCategory === "all") {
      return state.data.news;
    }
    return state.data.news.filter(function (n) {
      return n.category === state.activeCategory;
    });
  }

  function buildCard(item) {
    var importanceKey = item.importance || "low";
    var importanceLabel = IMPORTANCE_LABEL[importanceKey] || "참고";

    var tagsHtml = (item.tags || [])
      .map(function (tag) {
        return '<span class="card__tag">' + escapeHtml(tag) + "</span>";
      })
      .join("");

    var sampleBadge = item.isSample
      ? '<span class="badge badge--sample">샘플</span>'
      : "";

    var learningHtml = item.learningQuestion
      ? '<div class="card__learning"><strong>학습 질문</strong>' +
        escapeHtml(item.learningQuestion) +
        "</div>"
      : "";

    return (
      '<article class="card">' +
      '<div class="card__top">' +
      '<span class="card__category">' +
      escapeHtml(getCategoryLabel(item.category)) +
      "</span>" +
      '<span class="badge badge--' +
      escapeHtml(importanceKey) +
      '">' +
      escapeHtml(importanceLabel) +
      "</span>" +
      sampleBadge +
      "</div>" +
      '<h3 class="card__title">' +
      escapeHtml(item.title) +
      "</h3>" +
      '<p class="card__summary">' +
      escapeHtml(item.summary) +
      "</p>" +
      (tagsHtml ? '<div class="card__tags">' + tagsHtml + "</div>" : "") +
      learningHtml +
      '<div class="card__meta">' +
      '<span class="card__source">📰 ' +
      escapeHtml(item.source || "출처 미상") +
      " · ⏱ " +
      escapeHtml(String(item.readingTime || "?")) +
      "분</span>" +
      '<a class="card__link" href="' +
      escapeHtml(item.url || "#") +
      '" target="_blank" rel="noopener noreferrer" aria-label="' +
      escapeHtml(item.title) +
      ' 원문 보기">원문</a>' +
      "</div>" +
      "</article>"
    );
  }

  function renderNews() {
    var grid = document.getElementById("newsGrid");
    var emptyState = document.getElementById("emptyState");
    var countEl = document.getElementById("newsCount");
    var items = getFilteredNews();

    countEl.textContent = "총 " + items.length + "건";

    if (items.length === 0) {
      grid.innerHTML = "";
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    grid.innerHTML = items
      .map(function (item) {
        return buildCard(item);
      })
      .join("");
  }

  // 학습 질문, 토론거리, 추천 루틴 등 단순 리스트 영역을 채운다.
  function fillList(elementId, items, isOrdered) {
    var el = document.getElementById(elementId);
    if (!el) {
      return;
    }
    el.innerHTML = (items || [])
      .map(function (text) {
        return "<li>" + escapeHtml(text) + "</li>";
      })
      .join("");
  }

  function renderRssSources() {
    var el = document.getElementById("rssSources");
    el.innerHTML = (state.data.rssSources || [])
      .map(function (src) {
        return (
          "<li>" +
          escapeHtml(src.name) +
          " — " +
          escapeHtml(src.status || "연동 예정") +
          "</li>"
        );
      })
      .join("");
  }

  function renderFooter() {
    var updated = state.data.meta && state.data.meta.lastUpdated;
    document.getElementById("lastUpdated").textContent = updated
      ? "마지막 갱신 " + updated
      : "";
  }

  function renderAll() {
    renderTodayDate();
    renderSummary();
    renderFilter();
    renderNews();
    fillList("teamQuestions", state.data.teamLearningQuestions);
    fillList("discussionTopics", state.data.discussionTopics);
    fillList("recommendedRoutine", state.data.recommendedRoutine, true);
    renderRssSources();
    renderFooter();
  }

  // news.json을 불러오고, 실패하면 폴백 데이터로 렌더링한다.
  function loadData() {
    fetch("assets/data/news.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        state.data = data;
        renderAll();
      })
      .catch(function (error) {
        console.warn(
          "news.json을 불러오지 못해 폴백 데이터로 표시합니다. 로컬 서버로 열면 정상 동작합니다. 원인:",
          error.message
        );
        state.data = FALLBACK_DATA;
        renderAll();
      });
  }

  document.addEventListener("DOMContentLoaded", loadData);
})();

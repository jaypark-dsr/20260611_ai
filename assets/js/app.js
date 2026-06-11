// 뉴스 데이터를 불러와 렌더링하고 검색, 카테고리, 북마크, 아카이브, 다크 모드를 처리한다

(function () {
  "use strict";

  // fetch 실패 시(예: file://에서 직접 열어 로컬 JSON 로드가 차단된 경우) 사용할 최소 폴백 데이터.
  // 실제 데이터는 assets/data/news.json을 편집하거나 RSS 자동 수집으로 갱신한다.
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
  var STORAGE = { bookmarks: "news-dashboard:bookmarks", theme: "news-dashboard:theme" };

  var state = {
    data: null,
    activeCategory: "all",
    searchQuery: "",
    bookmarkOnly: false,
    bookmarks: loadBookmarks()
  };

  // ---------- localStorage 유틸 ----------

  function loadBookmarks() {
    try {
      var raw = window.localStorage.getItem(STORAGE.bookmarks);
      var arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveBookmarks() {
    try {
      window.localStorage.setItem(
        STORAGE.bookmarks,
        JSON.stringify(Array.from(state.bookmarks))
      );
    } catch (e) {
      console.warn("북마크 저장 실패:", e.message);
    }
  }

  // ---------- 공통 유틸 ----------

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

  // ---------- 다크 모드 ----------

  function applyTheme(theme) {
    var isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    var btn = document.getElementById("themeToggle");
    btn.setAttribute("aria-pressed", isDark ? "true" : "false");
    btn.querySelector(".theme-toggle__icon").textContent = isDark ? "☀️" : "🌙";
    btn.querySelector(".theme-toggle__label").textContent = isDark ? "라이트" : "다크";
  }

  function initTheme() {
    var saved = null;
    try {
      saved = window.localStorage.getItem(STORAGE.theme);
    } catch (e) {
      saved = null;
    }
    if (!saved) {
      var prefersDark =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      saved = prefersDark ? "dark" : "light";
    }
    applyTheme(saved);

    document.getElementById("themeToggle").addEventListener("click", function () {
      var next =
        document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(STORAGE.theme, next);
      } catch (e) {
        /* 저장 실패는 무시한다 */
      }
    });
  }

  // ---------- 렌더링 ----------

  function renderTodayDate() {
    var summaryDate = state.data.dailySummary && state.data.dailySummary.date;
    document.getElementById("todayDate").textContent = summaryDate
      ? summaryDate + " 기준"
      : "";
  }

  function renderSummary() {
    var summary = state.data.dailySummary || {};
    document.getElementById("summaryHeadline").textContent = summary.headline || "";
    document.getElementById("summaryPoints").innerHTML = (summary.points || [])
      .map(function (point) {
        return "<li>" + escapeHtml(point) + "</li>";
      })
      .join("");
  }

  function renderFilter() {
    var container = document.getElementById("categoryFilter");
    var usedCategories = state.data.news.map(function (n) {
      return n.category;
    });

    container.innerHTML = (state.data.categories || [])
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

    container.querySelectorAll(".filter__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.activeCategory = btn.getAttribute("data-category");
        renderFilter();
        renderNews();
      });
    });
  }

  // 카테고리, 검색어, 북마크 조건을 모두 AND로 결합해 필터링한다.
  function getFilteredNews() {
    var query = state.searchQuery.trim().toLowerCase();
    return state.data.news.filter(function (n) {
      if (state.activeCategory !== "all" && n.category !== state.activeCategory) {
        return false;
      }
      if (state.bookmarkOnly && !state.bookmarks.has(n.id)) {
        return false;
      }
      if (query) {
        var haystack = (
          n.title +
          " " +
          n.summary +
          " " +
          (n.tags || []).join(" ")
        ).toLowerCase();
        if (haystack.indexOf(query) === -1) {
          return false;
        }
      }
      return true;
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

    var bookmarked = state.bookmarks.has(item.id);
    var bookmarkBtn =
      '<button type="button" class="card__bookmark" data-id="' +
      escapeHtml(item.id) +
      '" aria-pressed="' +
      (bookmarked ? "true" : "false") +
      '" aria-label="' +
      escapeHtml(item.title) +
      ' 북마크">' +
      (bookmarked ? "★" : "☆") +
      "</button>";

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
      bookmarkBtn +
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

  // 북마크 버튼 클릭을 그리드 단위 이벤트 위임으로 처리한다.
  function handleGridClick(event) {
    var btn = event.target.closest(".card__bookmark");
    if (!btn) {
      return;
    }
    var id = btn.getAttribute("data-id");
    if (state.bookmarks.has(id)) {
      state.bookmarks.delete(id);
    } else {
      state.bookmarks.add(id);
    }
    saveBookmarks();
    renderNews();
  }

  function fillList(elementId, items) {
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
    document.getElementById("rssSources").innerHTML = (state.data.rssSources || [])
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
    fillList("recommendedRoutine", state.data.recommendedRoutine);
    renderRssSources();
    renderFooter();
  }

  // ---------- 도구 모음(검색, 북마크, 아카이브) ----------

  function initToolbar() {
    var search = document.getElementById("searchInput");
    search.addEventListener("input", function () {
      state.searchQuery = search.value;
      renderNews();
    });

    var bookmarkToggle = document.getElementById("bookmarkToggle");
    bookmarkToggle.addEventListener("click", function () {
      state.bookmarkOnly = !state.bookmarkOnly;
      bookmarkToggle.setAttribute("aria-pressed", state.bookmarkOnly ? "true" : "false");
      bookmarkToggle.classList.toggle("is-active", state.bookmarkOnly);
      renderNews();
    });

    var archiveSelect = document.getElementById("archiveSelect");
    archiveSelect.addEventListener("change", function () {
      loadData(archiveSelect.value);
    });

    document.getElementById("newsGrid").addEventListener("click", handleGridClick);
  }

  // 아카이브 인덱스를 불러와 날짜 셀렉트를 채운다. 없으면 조용히 넘어간다.
  function initArchive() {
    fetch("assets/data/archive/index.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (index) {
        var select = document.getElementById("archiveSelect");
        (index.dates || []).forEach(function (date) {
          var opt = document.createElement("option");
          opt.value = date;
          opt.textContent = date;
          select.appendChild(opt);
        });
      })
      .catch(function (error) {
        console.info("아카이브 인덱스 없음(최신만 표시):", error.message);
      });
  }

  // ---------- 데이터 로드 ----------

  // date가 비어 있으면 최신(news.json), 값이 있으면 해당 날짜 아카이브를 불러온다.
  function loadData(date) {
    var url = date
      ? "assets/data/archive/" + encodeURIComponent(date) + ".json"
      : "assets/data/news.json";

    fetch(url, { cache: "no-store" })
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
          "데이터를 불러오지 못했습니다. 로컬 서버로 열면 정상 동작합니다. 원인:",
          error.message
        );
        state.data = FALLBACK_DATA;
        renderAll();
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initToolbar();
    initArchive();
    loadData("");
  });
})();

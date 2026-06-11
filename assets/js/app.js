// 뉴스 데이터를 불러와 렌더링하고 기간(최신/일자/월), 검색, 카테고리, 중요·북마크·읽음 필터, 다크 모드를 처리한다

(function () {
  "use strict";

  // fetch 실패 시(예: file://에서 직접 열어 로컬 JSON 로드가 차단된 경우) 사용할 최소 폴백 데이터.
  var FALLBACK_DATA = {
    meta: { lastUpdated: "데이터 미연결" },
    dailySummary: {
      date: "",
      headline: "데이터를 불러오지 못해 폴백 화면을 표시합니다. 로컬 서버로 열면 정상 동작합니다.",
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
  var STORAGE = {
    bookmarks: "news-dashboard:bookmarks",
    read: "news-dashboard:read",
    theme: "news-dashboard:theme"
  };

  var state = {
    data: null,
    activeCategory: "all",
    searchQuery: "",
    viewMode: "latest", // latest | day | month
    bookmarkOnly: false,
    importantOnly: false,
    unreadOnly: false,
    bookmarks: loadSet(STORAGE.bookmarks),
    read: loadSet(STORAGE.read),
    archiveDates: []
  };

  // ---------- localStorage ----------

  function loadSet(key) {
    try {
      var raw = window.localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveSet(key, set) {
    try {
      window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn("저장 실패:", e.message);
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

  // http/https 링크만 허용해 javascript: 등 위험 스킴을 차단한다.
  function safeUrl(url) {
    return /^https?:\/\//i.test(String(url || "")) ? String(url) : "#";
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
    var counts = {};
    state.data.news.forEach(function (n) {
      counts[n.category] = (counts[n.category] || 0) + 1;
    });

    container.innerHTML = (state.data.categories || [])
      .filter(function (c) {
        return c.id === "all" || counts[c.id];
      })
      .map(function (c) {
        var pressed = c.id === state.activeCategory ? "true" : "false";
        var n = c.id === "all" ? state.data.news.length : counts[c.id];
        return (
          '<button type="button" class="filter__btn" data-category="' +
          escapeHtml(c.id) +
          '" aria-pressed="' +
          pressed +
          '">' +
          escapeHtml(c.emoji + " " + c.label) +
          ' <span class="filter__count">' +
          n +
          "</span></button>"
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

  // 카테고리, 검색어, 중요·북마크·읽음 조건을 모두 AND로 결합한다.
  function getFilteredNews() {
    var query = state.searchQuery.trim().toLowerCase();
    return state.data.news.filter(function (n) {
      if (state.activeCategory !== "all" && n.category !== state.activeCategory) {
        return false;
      }
      if (state.importantOnly && n.importance !== "high") {
        return false;
      }
      if (state.bookmarkOnly && !state.bookmarks.has(n.id)) {
        return false;
      }
      if (state.unreadOnly && state.read.has(n.id)) {
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
    var url = safeUrl(item.url);

    var tagsHtml = (item.tags || [])
      .map(function (tag) {
        return '<span class="card__tag">' + escapeHtml(tag) + "</span>";
      })
      .join("");

    var langBadge =
      item.lang === "ko"
        ? '<span class="badge badge--ko">한국어</span>'
        : item.lang === "en"
        ? '<span class="badge badge--en">EN</span>'
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
      '" aria-label="북마크 토글">' +
      (bookmarked ? "★" : "☆") +
      "</button>";

    var cls =
      "card card--" +
      escapeHtml(importanceKey) +
      (state.read.has(item.id) ? " is-read" : "");

    return (
      '<article class="' +
      cls +
      '" data-id="' +
      escapeHtml(item.id) +
      '" data-url="' +
      escapeHtml(url) +
      '">' +
      '<div class="card__top">' +
      '<span class="card__category">' +
      escapeHtml(getCategoryLabel(item.category)) +
      "</span>" +
      '<span class="badge badge--' +
      escapeHtml(importanceKey) +
      '">' +
      escapeHtml(importanceLabel) +
      "</span>" +
      langBadge +
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
      escapeHtml(url) +
      '" target="_blank" rel="noopener noreferrer">원문 ↗</a>' +
      "</div>" +
      "</article>"
    );
  }

  function renderNews() {
    var grid = document.getElementById("newsGrid");
    var emptyState = document.getElementById("emptyState");
    var countEl = document.getElementById("newsCount");
    var items = getFilteredNews();

    var total = state.data.news.length;
    countEl.textContent = "총 " + items.length + "건" + (items.length !== total ? " / 전체 " + total + "건" : "");

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

  function markRead(id, cardEl) {
    if (!id || state.read.has(id)) {
      return;
    }
    state.read.add(id);
    saveSet(STORAGE.read, state.read);
    if (state.unreadOnly) {
      renderNews();
    } else if (cardEl) {
      cardEl.classList.add("is-read");
    }
  }

  // 카드 영역 클릭을 이벤트 위임으로 처리한다. 북마크 토글, 원문 이동, 읽음 표시.
  function handleGridClick(event) {
    var bm = event.target.closest(".card__bookmark");
    if (bm) {
      var bid = bm.getAttribute("data-id");
      var nowOn;
      if (state.bookmarks.has(bid)) {
        state.bookmarks.delete(bid);
        nowOn = false;
      } else {
        state.bookmarks.add(bid);
        nowOn = true;
      }
      saveSet(STORAGE.bookmarks, state.bookmarks);
      bm.textContent = nowOn ? "★" : "☆";
      bm.setAttribute("aria-pressed", nowOn ? "true" : "false");
      if (state.bookmarkOnly) {
        renderNews();
      }
      return;
    }

    var card = event.target.closest(".card");
    if (!card) {
      return;
    }
    var id = card.getAttribute("data-id");
    var url = card.getAttribute("data-url");
    var link = event.target.closest("a");
    if (link) {
      markRead(id, card); // 원문 링크는 새 탭에서 열리고 읽음 처리만 한다.
      return;
    }
    markRead(id, card);
    if (url && url !== "#") {
      window.open(url, "_blank", "noopener");
    }
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
        var flag = src.lang === "ko" ? "🇰🇷 " : src.lang === "en" ? "🌐 " : "";
        return "<li>" + flag + escapeHtml(src.name) + "</li>";
      })
      .join("");
  }

  function renderFooter() {
    var meta = state.data.meta || {};
    var txt = meta.lastUpdated ? "마지막 갱신 " + meta.lastUpdated : "";
    if (meta.koCount && meta.total) {
      txt += " · 한국어 " + meta.koCount + " / 전체 " + meta.total + "건";
    }
    document.getElementById("lastUpdated").textContent = txt;
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

  // ---------- 도구 모음 ----------

  function initToolbar() {
    var search = document.getElementById("searchInput");
    search.addEventListener("input", function () {
      state.searchQuery = search.value;
      renderNews();
    });

    bindToggle("importantToggle", "importantOnly");
    bindToggle("bookmarkToggle", "bookmarkOnly");
    bindToggle("unreadToggle", "unreadOnly");

    // 기간 모드 세그먼트
    document.querySelectorAll(".segmented__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-mode");
        if (mode === state.viewMode) {
          return;
        }
        state.viewMode = mode;
        document.querySelectorAll(".segmented__btn").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        setupPeriodControl();
      });
    });

    document.getElementById("periodSelect").addEventListener("change", function () {
      loadByPeriod(this.value);
    });

    document.getElementById("newsGrid").addEventListener("click", handleGridClick);

    var noticeClose = document.getElementById("noticeClose");
    if (noticeClose) {
      noticeClose.addEventListener("click", function () {
        showDataNotice(false);
      });
    }
  }

  function bindToggle(btnId, stateKey) {
    var btn = document.getElementById(btnId);
    btn.addEventListener("click", function () {
      state[stateKey] = !state[stateKey];
      btn.setAttribute("aria-pressed", state[stateKey] ? "true" : "false");
      btn.classList.toggle("is-active", state[stateKey]);
      renderNews();
    });
  }

  // 기간 모드에 맞게 셀렉트를 채우고 첫 항목을 로드한다.
  function setupPeriodControl() {
    var field = document.getElementById("periodField");
    var select = document.getElementById("periodSelect");
    var label = document.getElementById("periodLabel");

    if (state.viewMode === "latest") {
      field.hidden = true;
      loadByPeriod("");
      return;
    }

    field.hidden = false;
    if (state.viewMode === "day") {
      label.textContent = "날짜";
      select.innerHTML = state.archiveDates
        .map(function (d) {
          return '<option value="' + d + '">' + d + "</option>";
        })
        .join("");
    } else {
      label.textContent = "월";
      var months = [];
      state.archiveDates.forEach(function (d) {
        var m = d.slice(0, 7);
        if (months.indexOf(m) === -1) {
          months.push(m);
        }
      });
      select.innerHTML = months
        .map(function (m) {
          return '<option value="' + m + '">' + m + "</option>";
        })
        .join("");
    }

    if (select.options.length > 0) {
      loadByPeriod(select.value);
    } else {
      document.getElementById("newsGrid").innerHTML = "";
      document.getElementById("emptyState").hidden = false;
    }
  }

  // ---------- 데이터 로드 ----------

  // 데이터 로드 실패 시 화면 상단 안내 배너를 보이거나 숨긴다.
  function showDataNotice(visible) {
    var el = document.getElementById("dataNotice");
    if (el) {
      el.hidden = !visible;
    }
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return res.json();
    });
  }

  // 기간 모드에 따라 최신/특정일/특정월 데이터를 불러온다.
  function loadByPeriod(value) {
    if (state.viewMode === "month" && value) {
      loadMonth(value);
      return;
    }
    var url = value
      ? "assets/data/archive/" + encodeURIComponent(value) + ".json"
      : "assets/data/news.json";
    fetchJson(url)
      .then(function (data) {
        showDataNotice(false);
        state.data = data;
        renderAll();
      })
      .catch(function (error) {
        console.warn("데이터 로드 실패:", error.message);
        showDataNotice(true);
        state.data = FALLBACK_DATA;
        renderAll();
      });
  }

  // 한 달치 아카이브를 모두 불러와 합치고 중복(id)을 제거해 보여준다.
  function loadMonth(month) {
    var dates = state.archiveDates.filter(function (d) {
      return d.indexOf(month) === 0;
    });
    Promise.all(
      dates.map(function (d) {
        return fetchJson("assets/data/archive/" + d + ".json").catch(function () {
          return null;
        });
      })
    ).then(function (results) {
      var valid = results.filter(Boolean);
      if (valid.length === 0) {
        showDataNotice(true);
        state.data = FALLBACK_DATA;
        renderAll();
        return;
      }
      showDataNotice(false);
      var seen = {};
      var merged = [];
      valid.forEach(function (d) {
        (d.news || []).forEach(function (n) {
          if (!seen[n.id]) {
            seen[n.id] = true;
            merged.push(n);
          }
        });
      });
      var base = valid[0]; // 가장 최근 날짜의 패널을 재사용한다.
      var highs = merged.filter(function (n) {
        return n.importance === "high";
      }).length;
      state.data = {
        meta: { lastUpdated: month, total: merged.length },
        dailySummary: {
          date: month,
          headline:
            month +
            " 한 달 동안 " +
            dates.length +
            "일치 " +
            merged.length +
            "건을 모았습니다" +
            (highs ? " (중요 " + highs + "건)." : "."),
          points: []
        },
        categories: base.categories,
        news: merged,
        teamLearningQuestions: base.teamLearningQuestions,
        discussionTopics: base.discussionTopics,
        recommendedRoutine: base.recommendedRoutine,
        rssSources: base.rssSources
      };
      renderAll();
    });
  }

  // 아카이브 인덱스를 불러와 기간 셀렉트의 기반 데이터를 만든다.
  function initArchive() {
    return fetchJson("assets/data/archive/index.json")
      .then(function (index) {
        state.archiveDates = Array.isArray(index.dates) ? index.dates : [];
      })
      .catch(function (error) {
        console.info("아카이브 인덱스 없음(최신만 표시):", error.message);
        state.archiveDates = [];
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initToolbar();
    initArchive().then(function () {
      loadByPeriod(""); // 최초에는 최신 데이터를 보여준다.
    });
  });
})();

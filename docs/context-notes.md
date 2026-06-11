# context-notes — 결정 사항과 이유 누적

작업 중 내린 결정과 그 이유, [추정]한 가정을 계속 기록한다.

## 초기 가정 ([추정])

- 초기 버전은 별도 로그인이나 서버 없이 정적 웹사이트로 구현한다. 1차 범위가 화면과 데이터 표시에 집중되어 있고 사용자가 내부용 정적 사이트를 요청했기 때문이다.
- 뉴스 수집은 실제 API 키 없이도 동작하도록 RSS 링크, 외부 뉴스 링크, 수동 편집 가능한 JSON, 샘플 데이터를 함께 제공한다. API 키를 코드에 넣을 수 없고 키 없이도 즉시 동작해야 하기 때문이다.
- 구조는 확장 가능하게 만들되 1차 구현은 단순한 HTML/CSS/JS 중심으로 한다.

## 디렉토리 결정

- 명세에 `css/styles.css`와 `assets/css/styles.css`가 함께 등장했다. 첫 실행 명령이 `assets/css/styles.css`, `assets/js/app.js`, `assets/data/news.json`을 명시했으므로 assets 하위 구조를 채택한다.
- assets/icons는 디렉토리만 두고 1차에서는 인라인 SVG와 이모지로 아이콘을 대체한다. 외부 아이콘 의존성을 줄이기 위함이다.

## 데이터 구조 결정

- news.json은 meta, dailySummary, categories, news, teamLearningQuestions, discussionTopics, recommendedRoutine, rssSources로 구성한다.
- 각 뉴스 항목에 `isSample: true` 플래그를 둔다. 샘플 데이터와 실제 연동 데이터를 명확히 구분하기 위함이다. 화면에도 샘플 배지를 표시한다.
- rssSources는 1차에서 사용하지 않지만 추후 자동 수집 확장 시 그대로 쓸 수 있도록 카테고리별 RSS 링크를 미리 담아둔다. 자동 수집 기능을 구현한 것처럼 보이지 않도록 화면에는 "연동 예정" 영역으로만 안내한다.

## 브라우저 fetch 제약 대응 ([추정])

- `file://`로 index.html을 직접 열면 브라우저 보안 정책상 fetch가 news.json 로컬 파일을 차단할 수 있다(특히 Chrome). 이를 위해 app.js에 동일 구조의 내장 폴백 데이터를 두고, fetch 실패 시 폴백으로 렌더링하며 콘솔에 안내 메시지를 남긴다. 로컬 서버(`python -m http.server` 등)로 열면 news.json을 정상 로드한다.
- 이렇게 하면 "그냥 index.html 더블클릭"으로도 화면이 비지 않는다. 데이터 편집은 news.json을 수정하고 로컬 서버로 확인하도록 README에 안내한다.

## 접근성/반응형 결정

- 카테고리 필터는 버튼 그룹으로 구현하고 `aria-pressed`로 활성 상태를 알린다.
- 카드 그리드는 CSS Grid `auto-fill` + `minmax`로 구성해 별도 미디어쿼리 없이도 화면 폭에 맞게 열 수가 조정되며, 폰트와 간격은 브레이크포인트로 보강한다.
- 색상 대비는 본문 텍스트 기준 WCAG AA를 목표로 한다.

## 호환성 결정

- CSS 변수, Grid, Flexbox, `:focus-visible` 등 Chrome/Edge/Safari에서 폭넓게 지원되는 기능만 사용한다.
- JS는 ES6(템플릿 리터럴, const/let, 화살표 함수, fetch, async/await)까지만 사용하고 최신 실험적 문법은 피한다.

## 2차 구현 결정 (2026-06-11) — RSS 수집, 북마크, 검색, 아카이브, 다크모드

### RSS 자동 수집 방식
- 서버리스 대신 GitHub Actions를 택했다. 레포가 이미 GitHub에 있고 정적 사이트 모델과 맞으며 별도 인프라가 필요 없기 때문이다.
- 수집 스크립트는 `scripts/fetch-news.mjs`이며 `rss-parser`를 사용한다. 이 의존성은 CI 수집 전용이고 사이트 런타임은 여전히 무의존성이다. node_modules는 .gitignore에 둔다.
- 워크플로 `.github/workflows/fetch-news.yml`는 매일 아침(UTC 22:00 = KST 07:00)과 수동 실행으로 동작한다. 스크립트 실행 후 변경이 있으면 자동 커밋/푸시한다.
- 수집 소스는 `scripts/rss-sources.json`에 카테고리별로 둔다. 실제 공개 RSS 피드를 기본값으로 넣었으며 사용자가 자유롭게 편집한다. 일부 피드는 차단/이전될 수 있으므로 스크립트는 피드 단위 실패를 무시하고 계속 진행하며 로그를 남긴다.
- 저작권 준수를 위해 스크립트는 제목, 출처, 링크와 RSS가 제공하는 요약 스니펫(길이 제한)만 저장한다. 본문 전체는 저장하지 않는다. importance는 기본 medium, isSample은 false로 둔다.
- 사람이 큐레이션한 필드(dailySummary, teamLearningQuestions, discussionTopics, recommendedRoutine)는 스크립트가 보존한다. 스크립트는 기존 news.json을 읽어 `news` 배열만 교체하고 나머지는 유지한다.

### 일자별 아카이브
- 수집 시 `assets/data/news.json`(최신)과 `assets/data/archive/{YYYY-MM-DD}.json`(스냅샷)을 함께 쓴다.
- `assets/data/archive/index.json`에 사용 가능한 날짜 목록을 최신순으로 유지한다.
- 프런트엔드는 아카이브 셀렉트로 과거 날짜를 골라 해당 스냅샷을 불러온다. 기본은 최신(news.json)이다.

### 북마크
- 카드마다 별 버튼을 두고 localStorage 키 `news-dashboard:bookmarks`에 id 배열을 저장한다. id 기준이라 날짜가 바뀌어도 유지된다.
- "북마크만 보기" 토글로 저장한 항목만 필터링한다.

### 키워드 검색
- 검색 입력으로 제목, 요약, 태그를 부분 일치 필터링한다. 카테고리/북마크 필터와 AND로 결합한다.

### 다크 모드
- 헤더 토글 버튼, localStorage 키 `news-dashboard:theme`. `<html data-theme="dark">`로 CSS 변수 오버라이드한다. 최초 방문 시 OS 설정(prefers-color-scheme)을 따른다.

## 남은 후속 과제 (3차 이후)
- Slack/사내 포털로 오늘의 요약 자동 공유
- 읽음 표시와 팀 학습 체크 현황
- 수집 항목 자동 중요도 분류, 중복 제거 고도화

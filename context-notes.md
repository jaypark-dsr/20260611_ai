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

## 후속 과제 후보 (다음 버전)

- RSS 자동 수집 (서버리스 함수 또는 GitHub Actions + RSS Parser)
- 북마크/즐겨찾기 로컬 저장 (localStorage)
- 키워드 검색과 태그 기반 필터 강화
- 일자별 아카이브 보기
- 다크 모드 토글
- Slack/사내 포털로 오늘의 요약 자동 공유
- 읽음 표시와 팀 학습 체크 현황

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

## 3차 구현 결정 (2026-06-11) — 한국 소스, 주제 재분류, 사이트 고도화, 문서 정리

### 한국 RSS 도입과 주제 기반 재분류
- 실동작 검증(rss-parser 직접 fetch) 후 동작하는 한국 소스만 채택했다. 전자신문 IT, 아이뉴스24, 지디넷코리아, AI타임스, 데일리시큐, GeekNews, 연합뉴스 경제, 한국경제, 매일경제. 보안뉴스 공식 RSS는 전부 404라 데일리시큐로 대체했다.
- 핵심 변경은 "출처=카테고리" 매핑을 버린 것이다. 제목+요약을 키워드로 스캔해 6개 카테고리에 재배정하고, 종합지(연합경제 등)는 requireKeyword로 무관 기사를 제외해 노이즈를 막는다.
- 1차 분류 시 ai가 36건으로 쏠렸다. 영문 키워드 " AI"가 거의 모든 테크 기사에 걸린 탓이다. categoryPriority를 security>cloud>dev>economy>ai>it로 바꾸고 ai 키워드를 명확한 것만 남겨 it 23/security 23/ai 21/cloud 9/economy 7/dev 7로 균형을 맞췄다.

### 수집 스크립트 품질 보강 (QA·피드백 지적 반영)
- HTML 엔티티 디코드로 제목 이중 인코딩을 막았다(잔재 0건). 빈약 요약("Comments" 등)을 제외했다(0건). URL은 http/https만 통과시켜 위험 스킴을 차단했다.
- 중요도 자동 분류로 high 12건이 실제 보안 이슈로 정확히 분류됐다. 중복 제거(URL+정규화 제목), 학습질문 90건 전부 채움, 핵심요약 high 우선 큐레이션, categories 기본값 상수로 유실 방지.

### 프런트엔드 고도화
- 기간 보기 세그먼트(최신/일자별/월별). 월별은 해당 월 아카이브를 모두 합쳐 보여준다.
- 중요만/북마크만/안 읽은 것만 토글. 읽음 추적(localStorage news-dashboard:read), 카드 전체 클릭으로 원문 열기, 카테고리 건수, 언어 배지, 중요도 강조선.
- 버그 수정: 다크모드 활성 버튼 대비(#2f4ea8), input/select focus-visible, footer 다크, url XSS 방어.

### 사용자 지적 4건 해결 (2026-06-11)
1. 수동 갱신 자동화 — 이미 자동수집으로 구현됨. 문서의 "수동 편집" 모순 문구를 자동수집 기준으로 전면 정정했다.
2. 실행/의존성 불일치 — README에 "두 가지 도구 체인" 표를 추가해 python(서빙)과 npm/node(수집 전용, 런타임 무관)의 역할을 분리 명시했다.
3. 루트 문서 난잡 — PLAN/checklist/context-notes를 docs/로 이동하고 참조 경로를 갱신했다.
4. 폴백 안내 UI 부재 — 콘솔 경고만 있던 것을 화면 상단 안내 배너(#dataNotice)로 구현했다. fetch 실패 시 표시, 성공 시 숨김, 닫기 버튼 제공.

## 4차 구현 결정 (2026-06-11) — 백엔드/프론트 분리 리팩토링

### 배경
- 사용자(PM)가 Vanilla JS 정적 사이트가 별로라며 React+Vite 프론트 + 실제 API 백엔드로 분리 리팩토링을 지시했다. CLAUDE.md "프레임워크 도입 금지" 원칙은 명시적 PM 결정으로 무효화하고, 그 사실을 CLAUDE.md에 기록했다.
- 폴백 배너 혼란("페이징은 열리는데 샘플 화면")의 원인은 file:// 직접 열기였다. React+Vite 전환으로 이 문제 자체가 사라진다(dev는 Vite 서버, prod는 백엔드 서빙).

### 아키텍처 결정
- 모노레포로 frontend/(React+Vite+TS), backend/(Express+TS)를 분리했다.
- 백엔드를 실제 API 서버로 택했다(사용자 선택). 데이터는 여전히 JSON 파일이지만 /api/news, /api/archive, /api/news/:date, /api/month/:month로 제공한다. 월별 병합은 서버에서 처리해 프론트를 단순화했다.
- dev는 Vite 프록시(/api→3001), prod는 백엔드가 frontend/dist를 정적 서빙해 단일 서버로 배포 가능하게 했다. 백엔드 server.ts가 dist 존재 시 자동으로 정적 서빙을 켠다.
- 수집 스크립트는 backend/src/collect로 이동하고 경로를 backend/data 기준으로 조정했다. 동작 검증된 .mjs는 그대로 두고(원칙: 멀쩡한 코드 재작성 금지) API 서버만 TS로 새로 작성했다.
- 언어는 TypeScript(사용자 선택). 데이터 구조를 types.ts에 정의해 프론트·백엔드가 동일 형태를 공유한다. tsx는 런타임 타입체크를 하지 않으므로 별도로 tsc --noEmit로 검증한다.

### 검증
- backend `tsc --noEmit` 통과, 전 API 엔드포인트 응답 확인(news 90건, month 병합 90건, 잘못된 날짜 400).
- frontend `tsc --noEmit` + `vite build` 통과(JS 157KB). dev 프록시(5174, 5173은 타 앱 점유)와 prod 단일 서버(SPA+API+SPA폴백 라우팅) 양쪽 동작 확인.

## 5차 구현 결정 (2026-06-12) — 폴더 평탄화 + 멀티 에이전트 하네스

### 폴더 평탄화
- 작업 디렉토리(AI세미나) 안에 news-dashboard 폴더를 한 겹 더 둔 것이 불필요한 중첩이었다. .git 포함 전부를 루트로 올려 리포 루트=프로젝트 루트로 만들었다. git은 경로가 루트 상대라 파일을 .git과 함께 옮기면 히스토리·상태가 그대로 보존된다(커밋 불필요한 순수 reparenting).
- Windows에서 node_modules에 .node 바이너리를 로드한 node 프로세스(tsx, vite)가 디렉토리 rename을 막았다. news-dashboard 경로의 node 프로세스만 골라 종료한 뒤 이동했다.
- .github 폴더는 필요하다는 점을 사용자에게 설명했다. GitHub Actions 워크플로의 표준 위치라 옮기거나 지울 수 없다.

### 멀티 에이전트 하네스 (.claude/agents)
- 기존 agents/는 단순 문서였다. 실제 Claude Code 서브에이전트로 .claude/agents/에 7종을 만들었다. 프로젝트 전용이라 .claude/agents/에 둔다.
- 포맷은 claude-code-guide와 공식 문서로 확정했다. name은 소문자·하이픈만 허용(숫자 불가)이라 a11y-responsive-auditor를 accessibility-auditor로 바꿨다. tools는 콤마 구분, model은 opus/sonnet/inherit, 본문이 시스템 프롬프트다.
- 각 에이전트에 페르소나와 루브릭(채점표)을 넣었다. 최소 권한(리뷰·감사·비평은 읽기 전용), 모델 티어링(판단=opus, 구현=sonnet)을 적용했다.
- 서브에이전트는 중첩 위임이 불가하다. pl-orchestrator는 분배·게이트 종합을 "설계"하고 실제 호출은 메인 스레드가 한다.

### 권한·에이전트 팀 설정
- .claude/settings.json(커밋·공유)에 안전한 dev 명령 권한 허용 목록을 두고, git push는 ask로 남겼다.
- 에이전트 팀은 실험적·개인 설정이라 .claude/settings.local.json(gitignore)에 분리했다. 공식 문서(agent-teams.md) 기준 env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS="1"로 활성화한다. Windows는 분할 패널(tmux)이 미지원이라 teammateMode="in-process"로 둔다. 설치된 Claude Code는 v2.1.86으로 요건(v2.1.32+)을 충족한다.
- 공식 문서 확인 결과 .claude/agents 정의를 에이전트 팀의 팀원 타입으로 그대로 재사용할 수 있다. 서브에이전트 겸 팀원으로 양용된다.

## 남은 후속 과제 (6차 이후)
- Slack/사내 포털로 오늘의 요약 자동 공유
- 팀 학습 체크 현황 공유(현재 읽음·북마크는 개인 localStorage)
- 클라우드·개발 한국어 소스 보강(현재 영문 비중 높음)
- 카드 페이지네이션 또는 무한 스크롤(현재 전량 렌더링)
- 배포 파이프라인(GitHub Actions로 빌드+배포) 구성

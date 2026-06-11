# IT 뉴스 대시보드 (전산팀 아침 학습 허브)

전산팀 구성원이 매일 아침 IT, AI, 보안, 클라우드, 개발, 경제 동향을 빠르게 훑고 학습하기 위한 내부용 정적 뉴스 대시보드다.

## 빠른 시작

### 방법 1. 로컬 서버로 열기 (권장)

news.json 데이터를 정상적으로 불러오려면 로컬 서버로 여는 것을 권장한다.

```bash
cd news-dashboard
python -m http.server 8000
```

브라우저에서 http://localhost:8000 을 연다.

### 방법 2. 파일 직접 열기

index.html을 더블클릭해도 화면은 보인다. 다만 일부 브라우저(특히 Chrome)는 `file://`에서 JSON 로컬 파일 로드를 차단하므로, 이 경우 app.js에 내장된 폴백 샘플 데이터로 렌더링된다. 데이터를 직접 편집해 확인하려면 방법 1을 사용한다.

## 데이터 편집

매일 아침 뉴스는 `assets/data/news.json`을 직접 편집해 갱신한다.

- `dailySummary` — 오늘의 핵심 요약과 핵심 포인트
- `news` — 뉴스 카드 목록 (제목, 요약, 출처, 링크, 중요도, 읽기 시간, 태그, 학습 질문)
- `teamLearningQuestions` — 팀 학습 질문
- `discussionTopics` — 오늘의 토론거리
- `recommendedRoutine` — 추천 아침 학습 루틴

각 뉴스 항목의 `isSample`을 `false`로 바꾸면 화면의 "샘플" 배지가 사라진다.

> 주의. 뉴스 본문 전체를 복사하지 않는다. 제목, 출처, 원문 링크, 요약 형태로만 작성한다.

## 카테고리

IT, AI, 보안, 클라우드, 개발, 경제 6개 카테고리를 제공한다. 상단 필터 버튼으로 전환한다.

## 주요 기능

- **카테고리 필터** — 6개 카테고리 + 전체 전환
- **키워드 검색** — 제목, 요약, 태그를 부분 일치로 즉시 검색. 카테고리/북마크와 함께 적용된다.
- **북마크** — 카드의 별(☆) 버튼으로 저장. 브라우저 localStorage에 보관되어 새로고침해도 유지된다. "북마크만 보기"로 모아 본다.
- **일자별 아카이브** — 상단 날짜 셀렉트로 과거 수집분을 불러온다. 기본은 최신이다.
- **다크 모드** — 헤더 토글 버튼. 설정은 localStorage에 저장되며 첫 방문 시 OS 설정을 따른다.

## RSS 자동 수집

`assets/data/news.json`을 매일 아침 자동으로 갱신할 수 있다.

### 수집 소스 편집

`scripts/rss-sources.json`에서 카테고리별 RSS 피드를 추가/삭제한다. `perFeedLimit`로 피드당 기사 수를 조절한다. 차단되거나 이전된 피드는 수집 시 자동으로 건너뛴다.

### 수동 실행 (로컬)

```bash
npm install        # 최초 1회. rss-parser만 설치한다(수집 전용, 사이트 런타임과 무관).
npm run fetch      # RSS 수집 → news.json + archive/{날짜}.json 갱신
```

### 자동 실행 (GitHub Actions)

`.github/workflows/fetch-news.yml`이 매일 KST 07:00(UTC 22:00)과 수동 실행(`workflow_dispatch`)으로 동작한다. 수집 결과에 변경이 있으면 자동 커밋/푸시한다. 저장소 Settings → Actions에서 워크플로 쓰기 권한이 켜져 있어야 한다.

> 저작권 준수. 수집 스크립트는 제목, 출처, 링크와 RSS가 제공하는 요약 스니펫(길이 제한)만 저장한다. 본문 전체는 저장하지 않는다.

## 디렉토리 구조

```
news-dashboard/
  index.html
  assets/
    css/styles.css
    js/app.js
    data/news.json
    icons/
    data/archive/    일자별 수집 스냅샷과 index.json
  scripts/
    fetch-news.mjs   RSS 수집 스크립트
    rss-sources.json 카테고리별 RSS 피드 목록
  .github/workflows/
    fetch-news.yml   매일 아침 자동 수집 워크플로
  package.json       수집 전용 의존성(rss-parser)
  agents/            에이전트 역할 정의 문서
  CLAUDE.md          운영 기준과 행동 지침
  PLAN.md            구현 계획과 성공 기준
  checklist.md       단계별 진행 체크리스트
  context-notes.md   결정 사항과 가정 기록
```

## 기술 스택

HTML5, CSS3, Vanilla JavaScript, JSON. 빌드 도구 없이 브라우저에서 바로 동작한다.

## 향후 확장

RSS 자동 수집, 북마크 저장, 검색, 일자별 아카이브, 다크 모드는 2차에서 구현했다. 다음 후속 과제는 Slack/사내 포털 자동 공유, 읽음 표시, 수집 항목 자동 중요도 분류다.

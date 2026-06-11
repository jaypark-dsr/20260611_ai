# IT 뉴스 대시보드 (전산팀 아침 학습 허브)

전산팀 구성원이 매일 아침 IT, AI, 보안, 클라우드, 개발, 경제 동향을 빠르게 훑고 학습하기 위한 내부용 정적 뉴스 대시보드다.

## 두 가지 도구 체인 (역할 분리)

이 프로젝트는 목적이 다른 두 부분으로 나뉜다. 헷갈리지 않도록 역할을 명확히 한다.

| 구분 | 도구 | 목적 | 비고 |
| --- | --- | --- | --- |
| **사이트 실행** | Python(또는 아무 정적 서버) | 브라우저로 대시보드 보기 | 무의존성. 빌드 불필요 |
| **데이터 수집** | Node.js + npm(`rss-parser`) | RSS에서 뉴스 자동 수집 | CI/로컬 수집 전용. 사이트 런타임과 무관 |

> 사이트 자체는 의존성이 없다. `package.json`과 `npm install`은 오직 RSS 수집 스크립트(`scripts/fetch-news.mjs`)를 돌리기 위한 것이며, 화면을 띄우는 데는 필요하지 않다.

## 빠른 시작 (사이트 보기)

데이터(news.json)를 정상적으로 불러오려면 로컬 서버로 여는 것을 권장한다.

```bash
cd news-dashboard
python -m http.server 8000      # 또는 npx serve, 사내 정적 호스팅 등
```

브라우저에서 http://localhost:8000 을 연다.

`index.html`을 파일로 직접 열어도 화면 골격은 보이지만, 브라우저 보안 정책(`file://`)상 JSON 로드가 막혀 폴백 화면이 된다. 이때 화면 상단에 **안내 배너**가 떠서 로컬 서버로 열라고 알려준다.

## 데이터 갱신 (자동 수집이 기본)

매일 아침 뉴스는 RSS에서 **자동으로 수집**된다. 수동 편집은 예외적 보정용이다. 자세한 내용은 아래 "RSS 자동 수집" 절을 참고한다.

수동으로 보정할 때는 `assets/data/news.json`을 직접 편집한다.

- `dailySummary` — 오늘의 핵심 요약과 핵심 포인트
- `news` — 뉴스 카드 목록 (제목, 요약, 출처, 링크, 중요도, 읽기 시간, 태그, 학습 질문, 언어)
- `teamLearningQuestions` / `discussionTopics` / `recommendedRoutine` — 학습·토론·루틴 패널

> 주의. 뉴스 본문 전체를 복사하지 않는다. 제목, 출처, 원문 링크, 요약 스니펫 형태로만 작성한다.

## 카테고리

IT, AI, 보안, 클라우드, 개발, 경제 6개 카테고리를 제공한다. 상단 필터 버튼으로 전환한다.

## 주요 기능

- **카테고리 필터** — 6개 카테고리 + 전체 전환, 카테고리별 건수 표시
- **키워드 검색** — 제목, 요약, 태그를 부분 일치로 즉시 검색. 다른 필터와 AND로 결합된다.
- **기간 보기** — 최신 / 일자별 / 월별 세그먼트 전환. 월별은 한 달치 아카이브를 합쳐 보여준다.
- **중요만 보기** — 보안 사고·긴급 패치 등 자동으로 high 분류된 기사만 모아 본다.
- **북마크** — 카드의 별(☆) 버튼으로 저장. localStorage에 보관되어 새로고침해도 유지된다.
- **읽음 표시** — 카드를 열면 흐리게 처리된다. "안 읽은 것만"으로 신규 소식만 본다.
- **한국어/영문 구분** — 카드에 언어 배지 표시. 수집은 한국어 소스를 우선한다.
- **다크 모드** — 헤더 토글. localStorage 저장, 첫 방문 시 OS 설정을 따른다.
- **폴백 안내 배너** — 데이터 로드 실패 시 화면 상단에 원인과 해결법을 안내한다.

## RSS 자동 수집

`assets/data/news.json`과 일자별 아카이브를 매일 아침 자동으로 갱신한다. 한국어 소스(전자신문·아이뉴스24·지디넷·AI타임스·데일리시큐·GeekNews·연합뉴스 등)를 우선하고, 영문 소스(The Verge·BleepingComputer·AWS·OpenAI 등)로 보완한다.

수집 스크립트가 하는 일.

- **주제 재분류** — 출처가 아니라 제목·요약 키워드로 6개 카테고리에 배정한다. 종합지에서 무관한 기사는 제외한다.
- **중요도 자동 분류** — 취약점·유출·랜섬·긴급 패치 등은 high, 리뷰·루머·할인은 low, 나머지는 medium.
- **품질 정리** — HTML 엔티티 디코드, 빈약한 요약(예: "Comments") 제외, URL·제목 기준 중복 제거.
- **학습 질문** — 카테고리별 맞춤 학습 질문을 채운다.
- **핵심 요약** — 중요 이슈 우선으로 오늘의 헤드라인과 상위 3건을 자동 생성한다.

### 수집 소스 편집

`scripts/rss-sources.json`에서 피드와 분류 규칙을 편집한다. `feeds`에 피드를 추가/삭제하고, `keywords`로 카테고리 분류 규칙을, `importanceKeywords`로 중요도 규칙을 조정한다. `requireKeyword: true`인 종합지 피드는 관련 키워드가 없으면 제외된다. 차단·이전된 피드는 수집 시 자동으로 건너뛴다.

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
    data/
      news.json        최신 수집 결과
      archive/         일자별 스냅샷과 index.json
    icons/
  scripts/
    fetch-news.mjs     RSS 수집 스크립트
    rss-sources.json   RSS 피드와 분류 규칙
  .github/workflows/
    fetch-news.yml     매일 아침 자동 수집 워크플로
  package.json         수집 전용 의존성(rss-parser)
  docs/
    PLAN.md            구현 계획과 성공 기준
    checklist.md       단계별 진행 체크리스트
    context-notes.md   결정 사항과 가정 기록
  agents/              에이전트 역할 정의 문서
  CLAUDE.md            운영 기준과 행동 지침
```

## 기술 스택

- 사이트 — HTML5, CSS3, Vanilla JavaScript, JSON. 무의존성, 빌드 도구 없이 브라우저에서 바로 동작한다.
- 수집 — Node.js + rss-parser + GitHub Actions. 사이트 런타임과 분리된 별도 파이프라인이다.

## 향후 확장

RSS 자동 수집, 북마크 저장, 검색, 일자별 아카이브, 다크 모드는 2차에서 구현했다. 다음 후속 과제는 Slack/사내 포털 자동 공유, 읽음 표시, 수집 항목 자동 중요도 분류다.

# IT 뉴스 대시보드 (전산팀 아침 학습 허브)

전산팀이 매일 아침 IT, AI, 보안, 클라우드, 개발, 경제 동향을 빠르게 훑고 학습하기 위한 내부용 뉴스 대시보드다. 한국어 소스를 우선해 매일 아침 RSS로 자동 수집한다.

## 아키텍처

백엔드(API)와 프론트엔드(SPA)를 분리한 모노레포다.

```
news-dashboard/
  frontend/   React + Vite + TypeScript (UI)
  backend/    Express + TypeScript (API + RSS 수집 + 데이터)
```

| 구분 | 스택 | 역할 |
| --- | --- | --- |
| frontend | React 18, Vite, TypeScript | 대시보드 화면. `/api`로 데이터 호출 |
| backend | Express, TypeScript(tsx) | REST API, 프로덕션 정적 서빙, RSS 자동 수집 |

- **개발(dev)** — 백엔드(3001)와 프론트엔드(Vite, 5173)를 함께 띄운다. Vite가 `/api`를 백엔드로 프록시한다.
- **운영(prod)** — `frontend`를 빌드하면 백엔드 하나가 `/api`와 `frontend/dist`(정적 SPA)를 함께 서빙한다.

## 빠른 시작 (개발)

터미널 두 개로 백엔드와 프론트엔드를 함께 띄운다.

```bash
# 1) 백엔드 (API + 데이터)
cd backend
npm install
npm run dev          # http://localhost:3001

# 2) 프론트엔드 (다른 터미널)
cd frontend
npm install
npm run dev          # http://localhost:5173  (이 주소로 접속)
```

브라우저에서 **http://localhost:5173** 을 연다. `/api` 요청은 자동으로 백엔드로 전달된다. 백엔드가 꺼져 있으면 화면 상단에 안내 배너가 뜬다.

## 운영 빌드 (단일 서버)

```bash
cd frontend && npm install && npm run build   # frontend/dist 생성
cd ../backend && npm install && npm start      # http://localhost:3001 에서 SPA + API 동시 제공
```

빌드된 `frontend/dist`가 있으면 백엔드가 이를 정적 서빙하므로, 운영 환경에서는 백엔드 하나만 띄우면 된다. 포트는 `PORT` 환경변수로 바꾼다.

## API 엔드포인트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/news` | 최신 수집 데이터 |
| GET | `/api/archive` | 사용 가능한 날짜 목록 |
| GET | `/api/news/:date` | 특정 일자(YYYY-MM-DD) 스냅샷 |
| GET | `/api/month/:month` | 특정 월(YYYY-MM) 병합 데이터 |

## 주요 기능

- **카테고리 필터** — 6개 카테고리 + 전체, 카테고리별 건수 표시
- **키워드 검색** — 제목·요약·태그 부분 일치, 다른 필터와 AND 결합
- **기간 보기** — 최신 / 일자별 / 월별 (월별은 백엔드에서 한 달치 병합)
- **중요만 / 북마크만 / 안 읽은 것만** 필터
- **읽음 표시** — 카드를 열면 흐리게 처리 (localStorage)
- **북마크** — 별 버튼으로 저장 (localStorage)
- **한국어/영문 배지**, 중요도 강조선, **다크 모드**, 폴백 안내 배너

## RSS 자동 수집

매일 아침 `backend/data/news.json`과 일자별 아카이브를 자동 갱신한다. 한국어 소스(전자신문·아이뉴스24·지디넷·AI타임스·데일리시큐·GeekNews·연합/한경/매경)를 우선하고 영문 소스로 보완한다.

수집 스크립트(`backend/src/collect/fetch-news.mjs`)가 하는 일.

- **주제 재분류** — 출처가 아니라 제목·요약 키워드로 6개 카테고리에 배정. 종합지의 무관 기사는 제외.
- **중요도 자동 분류** — 취약점·유출·랜섬·긴급 패치 등은 high, 리뷰·루머는 low.
- **품질 정리** — HTML 엔티티 디코드, 빈약한 요약 제외, URL·제목 기준 중복 제거.
- **학습 질문·핵심 요약** — 카테고리별 학습 질문을 채우고, 중요 이슈 우선으로 오늘의 요약을 만든다.

### 수동 실행

```bash
cd backend
npm run fetch        # RSS 수집 → data/news.json + data/archive/{날짜}.json
```

### 수집 소스 편집

`backend/src/collect/rss-sources.json`에서 `feeds`(피드), `keywords`(카테고리 규칙), `importanceKeywords`(중요도 규칙)를 편집한다. `requireKeyword: true`인 종합지 피드는 관련 키워드가 없으면 제외된다.

### 자동 실행 (GitHub Actions)

`.github/workflows/fetch-news.yml`이 매일 KST 07:00과 수동 실행(`workflow_dispatch`)으로 `backend`에서 수집을 돌리고, 변경이 있으면 `backend/data`를 자동 커밋·푸시한다. 저장소 Settings → Actions에서 워크플로 쓰기 권한이 켜져 있어야 한다.

> 저작권 준수. 제목, 출처, 링크와 RSS가 제공하는 요약 스니펫(길이 제한)만 저장한다. 본문 전체는 저장하지 않는다.

## 멀티 에이전트 하네스

이 프로젝트는 `.claude/agents/`에 프로젝트 전용 Claude Code 서브에이전트 7종을 둔다. 각 에이전트는 페르소나와 루브릭(채점표)을 가진다.

- pl-orchestrator (계획·릴리즈 게이트) · frontend-engineer · backend-engineer · code-reviewer · qa-tester · ux-content-critic · accessibility-auditor
- 리뷰·감사 에이전트는 읽기 전용, 구현은 엔지니어만. 판단 역할은 opus, 구현은 sonnet으로 티어링.
- 단일 위임은 `@agent-<name>`으로 호출한다. 병렬 협업은 에이전트 팀(experimental, `.claude/settings.local.json`에서 활성화)으로 같은 정의를 팀원으로 재사용한다.
- 자세한 운영 방식은 `docs/agent-harness.md`를 참조한다.

## 문서

- `CLAUDE.md` — 운영 기준과 행동 지침
- `docs/agent-harness.md` — 멀티 에이전트 하네스 운영 방식
- `docs/PLAN.md` — 계획과 성공 기준
- `docs/checklist.md` — 단계별 진행
- `docs/context-notes.md` — 결정 사항과 가정
- `.claude/agents/` — 프로젝트 전용 서브에이전트 정의

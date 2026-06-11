# CLAUDE.md — IT 뉴스 대시보드 프로젝트

이 문서는 본 프로젝트에서 Claude Code와 모든 에이전트가 따르는 운영 기준이다.

## 0. 작업 원칙(Behavioral Guidelines)

1. 코딩 전에 생각한다. 가정을 명시하고, 불확실하면 질문하고, 해석이 여러 개면 혼자 고르지 말고 모두 제시하고, 더 단순한 길이 있으면 말한다. 필요하면 반박한다.
2. 단순함을 우선한다. 문제를 푸는 최소 코드만 쓴다. 요청하지 않은 기능, 추상화, 유연성, 불가능한 상황의 예외처리를 만들지 않는다. 200줄을 50줄로 줄일 수 있으면 다시 쓴다.
3. 외과수술적으로 변경한다. 건드려야 할 것만 건드린다. 주변 코드, 주석, 포맷을 임의로 개선하거나 멀쩡한 걸 리팩터하지 않는다. 기존 스타일을 따른다. 내 변경이 만든 미사용 import, 변수, 함수만 정리하고, 기존 dead code는 삭제하지 말고 언급만 한다.
4. 목표를 주도한다. 검증 가능한 성공 기준을 먼저 정의하고 통과할 때까지 반복한다. 다단계 작업은 단계와 검증 방법을 묶은 간단한 계획을 먼저 제시한다.
5. 한국어 문장 끝에 콜론을 쓰지 않는다. 한국어 출력은 마침표, 물음표, 느낌표로 끝낸다. 콜론은 코드, 키밸류, 라벨 안에서만 허용한다.
6. 새 소스 파일 첫 줄에 한국어 역할 주석을 단다. 그 파일이 하는 일을 한 줄로 적는다. 필수 지시문이나 shebang 바로 아래에 두고, 설정 파일은 제외한다.
7. 비자명한 작업은 시작 전에 산출물 3종을 만든다. Plan, checklist.md, context-notes.md를 먼저 만든다. 사용자가 계획만 주고 바로 코딩하라고 해도 멈추고 체크리스트와 컨텍스트 노트부터 만들지 묻는다.
8. 완료 선언 전에 테스트를 돌린다. 코드를 건드렸으면 프로젝트가 쓰는 테스트를 실행한다. 테스트 셋업이 없으면 최소한 빌드와 문법 검증을 확인한다. 사용자가 끝이라고 말하기 전에 선제적으로 실행한다.
9. 의미 단위로 커밋한다. 하나의 논리적 변경이 끝나면 시키지 않아도 커밋한다. 한 문장으로 설명 가능하면 커밋하고, 아니면 변경이 섞인 것이니 쪼갠다.
10. 에러는 추측하지 말고 읽는다. 전체 에러 메시지, 스택 트레이스, 실제 로그를 읽고 원인을 확정한 뒤에 고친다. 키워드만 보고 흔한 해결책을 들이대지 않는다. 불분명하면 로그로 상태를 확인한 다음 수정한다.

## 1. 프로젝트 목적

전산팀 구성원들이 매일 아침 IT, AI, 보안, 클라우드, 개발, 경제 동향을 빠르게 학습할 수 있는 내부용 뉴스 큐레이션 HTML 사이트를 만든다. 나와 팀원들이 아침마다 주요 기사와 트렌드를 훑고, 필요한 내용을 학습하고, 업무에 적용할 아이디어를 얻기 위한 지식 허브 역할을 한다.

## 2. 프로젝트 범위

- 백엔드(API)와 프론트엔드(SPA)를 분리한 모노레포 뉴스 대시보드를 만든다.
- 프론트엔드는 카테고리 필터, 오늘의 핵심 요약, 중요도·읽기시간·출처·태그·언어 표시, 팀 학습 질문, 북마크, 읽음 표시, 기간 보기(최신·일자별·월별), 다크 모드를 제공한다.
- 백엔드는 뉴스 데이터와 일자별·월별 아카이브를 REST API로 제공하고, RSS 자동 수집(GitHub Actions)으로 매일 아침 데이터를 갱신한다. 한국어 소스를 우선하며 주제 키워드로 카테고리를 재분류한다.
- API 연결 실패 시 프론트엔드가 안내 배너를 표시한다.
- 반응형 레이아웃, 접근성, 브라우저 호환성을 고려한다.

## 3. 주요 산출물

- frontend/ — React + Vite + TypeScript SPA (components, hooks, lib, styles.css)
- backend/ — Express + TypeScript API 서버(server.ts), 공용 타입(types.ts)
- backend/src/collect/ — RSS 수집 스크립트(fetch-news.mjs), 소스·분류 규칙(rss-sources.json)
- backend/data/ — news.json, archive/*.json (일자별 스냅샷)
- .github/workflows/fetch-news.yml (매일 자동 수집)
- README.md, CLAUDE.md
- docs/PLAN.md, docs/checklist.md, docs/context-notes.md (작업 산출물)
- agents/*.md

## 4. 디렉토리 구조

```
news-dashboard/
  CLAUDE.md
  README.md
  frontend/                 React + Vite + TypeScript SPA
    index.html
    vite.config.ts          /api 를 백엔드(3001)로 프록시
    package.json
    src/
      main.tsx, App.tsx
      types.ts
      lib/        api.ts, util.ts
      hooks/      useTheme.ts, usePersistentSet.ts
      components/ Header, SummaryCard, CategoryFilter, Toolbar,
                  NewsGrid, NewsCard, LearningPanels, SourceList,
                  Footer, DataNotice
      styles.css
  backend/                  Express + TypeScript API
    package.json
    tsconfig.json
    src/
      server.ts             /api/news, /api/archive, /api/news/:date, /api/month/:month
      types.ts
      collect/
        fetch-news.mjs       RSS 수집 스크립트
        rss-sources.json     RSS 피드와 분류 규칙
    data/
      news.json              최신 수집 결과
      archive/               일자별 스냅샷과 index.json
  .github/workflows/
    fetch-news.yml          매일 아침 자동 수집
  docs/
    PLAN.md, checklist.md, context-notes.md
  agents/
    PM.md, reviewer.md, feedback.md, ui_ux_designer.md,
    component_developer.md, accessibility_responsive_reviewer.md,
    browser_compatibility_tester.md
```

## 5. 기술 스택

- 프론트엔드 — React 18 + Vite + TypeScript. 컴포넌트 단위 SPA. 빌드는 `tsc --noEmit && vite build`.
- 백엔드 — Express + TypeScript(tsx 실행). REST API와 프로덕션 정적 서빙.
- 데이터 — JSON 파일(backend/data). RSS 자동 수집 결과가 기본이며 필요 시 수동 보정.
- 수집 — Node.js + rss-parser + GitHub Actions.
- 구동 — dev는 Vite(5173) + API(3001)를 함께 띄우고 `/api`를 프록시한다. prod는 백엔드 하나가 `/api`와 `frontend/dist`를 함께 서빙한다.

> 참고. 1~3차는 Vanilla JS 정적 사이트였다. PM 결정으로 4차에서 React+Vite 프론트와 Express 백엔드 분리 구조로 리팩토링했다. 따라서 아래 "불필요한 프레임워크 도입 금지" 원칙은 React/Express 채택을 막지 않는다(명시적 의사결정).

## 6. 코딩 컨벤션

- 한국어 문장은 콜론으로 끝내지 않는다. 마침표, 물음표, 느낌표로 끝낸다.
- 새 소스 파일 첫 줄에는 한국어 역할 주석을 작성한다.
- TypeScript 타입을 활용한다. 데이터 구조는 types.ts에 정의해 프론트·백엔드가 같은 형태를 공유한다.
- 컴포넌트와 함수는 작은 단위로 나누되 과도하게 추상화하지 않는다.
- CSS 클래스명은 의미 기반으로 작성한다. 전역 styles.css를 사용한다.
- 합의된 스택(React, Express) 외의 불필요한 라이브러리는 추가하지 않는다.
- 접근성 속성 aria-label, semantic tag를 적극 사용한다.

## 7. 금지사항과 주의사항

- API 키, 사내 정보, 개인정보를 코드에 넣지 않는다.
- 뉴스 본문 전체를 무단 복사하지 않는다. 기사 제목, 출처, 링크, 요약 스니펫 형태로만 저장하고 표시한다.
- 수집 스크립트는 RSS가 제공하는 요약 스니펫만 저장한다. 본문 전체는 저장하지 않는다.
- 동작하지 않는 기능을 동작하는 것처럼 표시하지 않는다. 데이터 로드 실패 시 폴백 안내 배너로 사실대로 알린다.
- 합의 범위를 넘는 로그인, DB, 관리자 페이지를 임의로 만들지 않는다.
- 다만 확장을 고려한 데이터 구조와 API는 단순하게 준비한다.

## 8. 작업 절차

1. 작업 시작 전 docs/PLAN.md를 작성한다.
2. docs/checklist.md를 생성하고 진행 상황을 체크한다.
3. docs/context-notes.md에 결정 사항과 이유를 누적한다.
4. 구현 전 성공 기준을 정의한다.
5. 완료 선언 전에 검증한다. 프론트는 `npm run build`(tsc 타입체크 포함), 백엔드는 `npx tsc --noEmit`로 타입을 확인하고 API 엔드포인트 응답을 점검한다.
6. dev/prod 두 모드(Vite 프록시, 백엔드 단일 서빙)에서 동작을 확인한다.
7. 검증 후 의미 단위로 git commit을 수행한다.
8. 에러 발생 시 전체 로그를 읽고 원인을 기록한 뒤 수정한다.

## 9. MCP 구성 판단

이번 초기 프로젝트에서는 MCP를 구성하지 않는다.

사유.
- 정적 웹/프론트엔드 프로젝트이며, 초기 구현은 로컬 파일시스템에서 완결된다.
- DB 접속이 필요하지 않다.
- 외부 SaaS/API 직접 연동이 초기 범위에 없다.
- 사용자가 MCP 구성을 명시적으로 요청하지 않았다.

[추정] 추후 RSS 자동 수집, GitHub Actions 배포, Slack 공유, 사내 포털 연동, DB 저장 기능이 추가되면 MCP 또는 외부 API 연동 구성을 재검토한다.

## 10. 에이전트 구성

모든 에이전트는 위 행동 지침 10개를 공통으로 준수한다. 상세 정의는 `agents/` 디렉토리의 각 문서를 참조한다.

- PM — 전체 조율, 의사결정, 우선순위, 모델 전환 권한
- reviewer — 산출물 리뷰와 품질 게이트
- feedback — 사용자 관점 개선점 도출
- ui_ux_designer — 화면, 정보, 사용자 흐름 설계
- component_developer — HTML, CSS, JS 구현
- accessibility_responsive_reviewer — 반응형과 접근성 점검
- browser_compatibility_tester — 브라우저 호환성 점검

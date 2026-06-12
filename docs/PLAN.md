# PLAN — IT 뉴스 대시보드

## 무엇을 왜 만드는가

전산팀이 매일 아침 IT, AI, 보안, 클라우드, 개발, 경제 동향을 빠르게 학습하도록 돕는 내부용 정적 뉴스 대시보드를 만든다. 서버나 로그인 없이 브라우저에서 바로 열린다. 뉴스 데이터는 RSS 자동 수집(GitHub Actions + scripts/fetch-news.mjs)으로 매일 아침 갱신하며, 한국어 소스를 우선하고 주제 키워드로 카테고리를 재분류한다. 필요 시 news.json 수동 보정도 가능하다.

## 성공 기준

1. 로컬 서버로 열면 뉴스 대시보드가 표시되고, 데이터 로드 실패 시 안내 배너가 뜬다.
2. 오늘의 핵심 요약(중요 이슈 우선)이 상단에 보인다.
3. 카테고리 필터가 동작한다. IT, AI, 보안, 클라우드, 개발, 경제 전환이 즉시 반영된다.
4. 각 뉴스 카드에 제목, 요약, 출처, 원문 링크, 중요도, 읽기 시간, 태그, 언어가 표시된다.
5. 기간 보기(최신/일자별/월별), 중요만·북마크만·안 읽은 것만 필터, 읽음 표시가 동작한다.
6. 다크 모드와 모바일/데스크톱 반응형 레이아웃이 동작한다.
7. RSS 자동 수집이 한국어 우선으로 동작하고, 본문 전체를 저장하지 않는다.
8. JavaScript 콘솔 에러가 없다.

## 진행 단계 (모두 완료)

| 단계 | 작업 | 상태 |
| --- | --- | --- |
| 1차 | 정적 대시보드 + 카테고리/요약/학습질문 + 샘플 데이터 | 완료 |
| 2차 | RSS 자동 수집(GitHub Actions), 다크모드, 검색, 북마크, 아카이브 | 완료 |
| 3차 | 한국어 소스 + 주제 재분류 + 중요도 자동분류, 기간 보기, 읽음, 폴백 배너 | 완료 |
| 4차 | 백엔드(Express+TS) / 프론트(React+Vite+TS) 분리 모노레포 리팩토링 | 완료 |
| 5차 | 폴더 평탄화 + .claude/agents 멀티 에이전트 하네스(페르소나·루브릭) 구성 | 완료 |

## 산출물

- 프론트 — frontend/src(컴포넌트·훅·lib·types·styles.css)
- 백엔드 — backend/src(server.ts·types.ts·collect/fetch-news.mjs·rss-sources.json), backend/data
- 자동화 — .github/workflows/fetch-news.yml
- 하네스 — .claude/agents/*.md, .claude/settings.json
- 문서 — README.md, CLAUDE.md, docs/PLAN.md, docs/checklist.md, docs/context-notes.md, docs/agent-harness.md

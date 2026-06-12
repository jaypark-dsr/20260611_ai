# checklist — IT 뉴스 대시보드

## 0단계. 산출물 3종
- [x] PLAN.md 생성
- [x] checklist.md 생성
- [x] context-notes.md 생성

## 1단계. 성공 기준 정의
- [x] 성공 기준 7개 문서화 (PLAN.md 참조)

## 2단계. UI/UX 설계
- [x] 헤더 구조 설계
- [x] 오늘의 핵심 요약 영역 설계
- [x] 카테고리 탭/필터 설계
- [x] 뉴스 카드 구조 설계
- [x] 팀 학습 질문 영역 설계
- [x] 오늘의 토론거리 영역 설계
- [x] 추천 루틴 영역 설계

## 3단계. 기본 파일 구현
- [x] index.html 생성 (semantic + aria)
- [x] assets/css/styles.css 생성 (반응형)
- [x] assets/js/app.js 생성 (렌더링 + 필터)
- [x] assets/data/news.json 생성 (샘플 데이터)
- [x] 각 소스 파일 첫 줄 한국어 역할 주석
- [x] HTML/CSS/JS 문법 점검

## 4단계. 반응형/접근성 점검
- [x] 모바일/태블릿/데스크톱 브레이크포인트 확인
- [x] semantic HTML 사용 확인
- [x] aria-label, alt 적용 확인
- [x] 키보드 탐색 가능 확인
- [x] 명도 대비 확인

## 5단계. 브라우저 호환성 점검
- [x] Chrome/Edge/Safari 위험 구문 점검
- [x] fetch 로컬 파일 제약 대응 (내장 폴백 데이터)

## 6단계. 전체 리뷰
- [x] 행동 지침 1~10 준수 확인
- [x] 불필요한 기능 추가 여부 확인

## 7단계. 피드백과 후속 과제
- [x] 다음 버전 후보 목록 정리 (context-notes.md)

## 8단계. 최종 검증과 커밋
- [x] 정적 파일 구조와 스크립트 로딩 경로 확인
- [x] git init 및 첫 커밋 "Initialize IT news dashboard project"

## 2차. RSS 수집, 북마크, 검색, 아카이브, 다크모드
- [x] scripts/rss-sources.json 카테고리별 피드 구성
- [x] scripts/fetch-news.mjs 수집 스크립트 (제목/출처/링크/스니펫만 저장)
- [x] package.json + .gitignore (rss-parser, 수집 전용 의존성)
- [x] .github/workflows/fetch-news.yml 매일 자동 수집
- [x] 수집 실행 검증 (피드 12/12 성공, 60건, 아카이브 생성)
- [x] 일자별 아카이브 + index.json, 프런트엔드 날짜 셀렉트
- [x] 북마크 localStorage 저장 + 북마크만 보기
- [x] 키워드 검색 (제목/요약/태그)
- [x] 다크 모드 토글 + localStorage + OS 설정 추종
- [x] JS/JSON 문법 검증, 로컬 서버 200 응답 확인
- [x] 의미 단위 커밋 및 푸시

## 3차. 한국 RSS, 주제 재분류, 사이트 고도화
- [x] 한국 언론사 RSS 실동작 검증 후 채택
- [x] 출처 매핑 → 키워드 주제 재분류, 중요도 자동분류
- [x] HTML 엔티티 디코드, 빈약 요약 제외, URL/제목 중복 제거
- [x] 기간 보기(최신/일자/월), 중요/북마크/안읽음, 읽음 표시
- [x] 다크모드 대비, focus-visible, XSS 방어
- [x] 폴백 안내 배너, 문서 docs/ 이동

## 4차. 백엔드/프론트 분리 리팩토링 (React+Vite+TS / Express+TS)
- [x] backend: Express+TS API (/api/news, /api/archive, /api/news/:date, /api/month/:month)
- [x] 수집 스크립트 backend/src/collect 이동 + 경로 조정
- [x] frontend: Vite+React+TS, 컴포넌트/훅/타입 분리, styles.css 이식
- [x] Vite 프록시(/api→3001), 프로덕션 단일 서버 정적 서빙
- [x] backend tsc / frontend tsc+build 통과, dev·prod 양 모드 동작 확인
- [x] 워크플로 경로 갱신(backend), 문서 전면 갱신, 커밋·푸시

## 5차. 폴더 평탄화 + 멀티 에이전트 하네스
- [x] news-dashboard wrapper 제거, 리포 루트=프로젝트 루트로 평탄화(git 히스토리 보존)
- [x] .claude/agents/ 서브에이전트 7종(페르소나+루브릭+프론트매터, 최소권한, 모델 티어링)
- [x] name 규칙 준수(소문자·하이픈), 프론트매터 파싱 검증
- [x] .claude/settings.json 공유 권한 + settings.local.json 에이전트 팀 활성화(공식 문서 기준)
- [x] 옛 agents/ 폴더 제거
- [x] CLAUDE.md 하네스 섹션 + docs/agent-harness.md + README 갱신
- [x] 검증 후 커밋·푸시

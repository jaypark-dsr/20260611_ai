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

## 디렉토리 구조

```
news-dashboard/
  index.html
  assets/
    css/styles.css
    js/app.js
    data/news.json
    icons/
  agents/            에이전트 역할 정의 문서
  CLAUDE.md          운영 기준과 행동 지침
  PLAN.md            구현 계획과 성공 기준
  checklist.md       단계별 진행 체크리스트
  context-notes.md   결정 사항과 가정 기록
```

## 기술 스택

HTML5, CSS3, Vanilla JavaScript, JSON. 빌드 도구 없이 브라우저에서 바로 동작한다.

## 향후 확장 (1차 범위 아님)

RSS 자동 수집, 북마크 저장, 검색 강화, 일자별 아카이브, 다크 모드, Slack 공유 등은 후속 과제다. `assets/data/news.json`의 `rssSources`에 카테고리별 RSS 링크를 미리 담아 두었으며, 현재 버전에서는 화면에 "연동 예정"으로만 안내한다.

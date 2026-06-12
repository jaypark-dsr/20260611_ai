# 멀티 에이전트 하네스

이 프로젝트는 `.claude/agents/`에 프로젝트 전용 Claude Code 서브에이전트를 두고 멀티 에이전트로 운영한다. 각 에이전트는 페르소나와 루브릭을 가진 전문가이며, 모두 루트 CLAUDE.md의 행동 지침 10개를 준수한다.

## 에이전트 로스터

| 에이전트 | 역할 | 모델 | 권한 | 산출 |
| --- | --- | --- | --- | --- |
| pl-orchestrator | 계획·분배·릴리즈 게이트 | opus | 읽기 + 계획 작성 | 계획, 분배안, go/no-go |
| frontend-engineer | React/Vite/TS 구현 | sonnet | 읽기/쓰기/편집/Bash | 프론트 코드 |
| backend-engineer | Express/TS API + 수집 | sonnet | 읽기/쓰기/편집/Bash | API·수집 코드 |
| code-reviewer | 코드 품질 게이트 | opus | 읽기 전용 | 차원별 점수, 승인/보류 |
| qa-tester | QA/QC 전수 테스트 | opus | 읽기/Bash/테스트 작성 | 결함 보고, 릴리즈 판정 |
| ux-content-critic | 사용자 관점 UX·콘텐츠 | opus | 읽기 전용 | 사용성 점수, 개선안 |
| accessibility-auditor | 접근성·반응형·호환성 | opus | 읽기 전용 | PASS/FAIL, 게이트 판정 |

## 설계 원칙

1. 최소 권한 — 리뷰·감사·비평 에이전트는 읽기 전용이다. 코드 수정은 엔지니어만 한다. 게이트와 구현을 분리해 객관성을 지킨다.
2. 모델 티어링 — 판단·게이트 역할은 opus(정확도), 구현 역할은 sonnet(throughput). 품질 게이트는 비싸게, 빌드는 빠르게.
3. 명시적 루브릭 — 모든 품질 에이전트는 채점표로 통과/보류를 가른다. "느낌"이 아니라 기준으로 판정한다.
4. 페르소나 — 각 에이전트는 정해진 관점과 목소리를 가진다. ux-content-critic은 전산팀 실사용자, code-reviewer는 까다로운 시니어 리뷰어처럼 행동한다.

## 표준 작업 흐름

비자명한 작업의 기본 파이프라인이다.

```
사용자(PM) 지시
  → pl-orchestrator   성공 기준 정의, 작업 분배 설계, 산출물 3종 확인
  → frontend-engineer / backend-engineer   구현 (병렬 가능, 파일 충돌 없도록 분리)
  → code-reviewer     코드 품질 채점 (게이트)
  → qa-tester         기능·회귀·빌드·타입 검증 (게이트)
  → accessibility-auditor   접근성·반응형 감사 (게이트)  [UI 변경 시]
  → ux-content-critic       사용자 가치 평가  [화면·콘텐츠 변경 시]
  → pl-orchestrator   게이트 결과 종합 → 릴리즈 go/no-go
```

게이트에서 보류가 나오면 해당 항목을 담당 엔지니어로 되돌린 뒤 다시 게이트를 태운다.

## 릴리즈 게이트 (pl-orchestrator 종합)

| 게이트 | 통과 기준 | 출처 |
| --- | --- | --- |
| 빌드·타입 | frontend `npm run build`, backend `tsc --noEmit` 통과 | qa-tester |
| 코드 품질 | 모든 차원 3점 이상, Critical 0 | code-reviewer |
| 기능·회귀 | Critical/Major 0 | qa-tester |
| 접근성 | WCAG AA 필수 위반 0 | accessibility-auditor |
| 사용자 가치 | 핵심 흐름 평균 3점 이상 | ux-content-critic |

전부 통과 → GO. Critical 1건 또는 게이트 실패 → NO-GO. Major만 남고 시급 → 조건부 GO + 후속 등록.

## 호출 방식

### 단일 위임 (서브에이전트)

- 자동 위임 — 작업 설명이 에이전트의 description과 맞으면 메인 스레드가 알아서 위임한다.
- 명시 호출 — `@agent-frontend-engineer 이 컴포넌트를 …` 처럼 이름을 직접 부른다.
- 서브에이전트는 다른 서브에이전트를 호출하지 못한다(중첩 위임 불가). 분배·종합은 메인 스레드가 한다.

### 병렬 협업 (에이전트 팀, experimental)

여러 에이전트가 동시에 작업하고 서로 대화해야 할 때 쓴다(예: 보안·성능·테스트 관점 병렬 리뷰, 경쟁 가설 디버깅, 프론트·백엔드 동시 구현).

- 활성화 — `.claude/settings.local.json`에 `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"`. 이 프로젝트는 이미 설정돼 있다. Claude Code v2.1.32+ 필요.
- 표시 모드 — `teammateMode`는 Windows에서 `in-process`로 둔다(분할 패널 tmux는 Windows Terminal·VS Code 터미널 미지원).
- 팀원 정의 재사용 — `.claude/agents/`의 정의를 팀원 타입으로 그대로 쓴다. 예: "code-reviewer 에이전트 타입으로 팀원을 스폰해 보안 관점 리뷰를 맡겨줘." 팀원은 해당 정의의 tools·model을 따르고, 정의 본문이 시스템 프롬프트에 덧붙는다.
- 사용법 — 리드(메인 세션)에게 자연어로 팀 구성과 작업을 지시하면 리드가 팀원을 스폰하고 공유 태스크 리스트로 조율한다. 끝나면 "팀 정리해줘"로 정리한다.
- 주의 — 토큰을 많이 쓴다. 병렬 탐색이 실제로 가치 있을 때만 쓰고, 순차적이거나 같은 파일을 만지는 작업은 단일 세션·서브에이전트가 낫다. 팀원끼리 파일 충돌이 없도록 담당을 분리한다.

## 서브에이전트 vs 에이전트 팀

| | 서브에이전트 | 에이전트 팀 |
| --- | --- | --- |
| 통신 | 메인에 결과만 보고 | 팀원끼리 직접 대화 |
| 조율 | 메인이 전부 관리 | 공유 태스크 리스트로 자율 |
| 토큰 | 낮음 | 높음 |
| 적합 | 결과만 필요한 집중 작업 | 토론·협업이 필요한 복잡 작업 |

## 파일 위치

- 에이전트 정의 — `.claude/agents/*.md` (커밋·공유)
- 공유 권한 — `.claude/settings.json` (커밋·공유)
- 로컬 설정 — `.claude/settings.local.json` (gitignore, 에이전트 팀 활성화 등 개인·실험 설정)
- 팀 런타임 상태 — `~/.claude/teams/`, `~/.claude/tasks/` (자동 생성, 수동 편집 금지)

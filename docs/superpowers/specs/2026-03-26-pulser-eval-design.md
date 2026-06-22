# pulser eval — 스킬 테스트 러너

## 한 줄 요약

`pulser eval` — Claude Code 스킬을 테스트 케이스로 실행하고 pass/fail 판정하는 서브커맨드.

## 배경

pulser v0.3.1은 SKILL.md의 구조적 규칙 준수를 정적 분석한다. `eval`은 스킬을 실제로 실행해서 출력 품질을 검증하는 기능을 추가한다.

- 정적 분석(scan)은 "서류 검사", eval은 "모의고사"
- tw93/claude-health, promptfoo 등 어떤 도구도 "Claude Code 스킬 테스트"를 하지 않음

## 인터페이스

```bash
pulser          # 기존: 스킬 진단 (변경 없음)
pulser eval     # 새로: 스킬 테스트
```

플래그, 옵션 없음. 이게 전부.

### 내부 동작

1. 스킬 디렉토리에서 `eval.yaml` 파일 탐색
2. 각 테스트 케이스마다:
   - 스킬 내용을 system prompt로, 테스트 입력을 user prompt로 주입
   - `claude -p --system-prompt "<skill content>" "<test input>"` 실행
   - 출력에 대해 assertions 실행
3. 결과 리포트 (pass/fail/시간)
4. baseline 자동 관리:
   - `~/.pulser/baselines/{skill-hash}.json`
   - 첫 실행: 결과 자동 저장
   - 이후 실행: 이전 결과와 자동 비교, 회귀 시 경고

## 테스트 스펙 형식

스킬 디렉토리에 `eval.yaml` 배치:

```
~/.claude/skills/
  reviewer/
    SKILL.md
    eval.yaml      ← 이 파일
```

```yaml
tests:
  - name: "버그 감지"
    input: "Review: function add(a,b) { return a - b }"
    assert:
      - contains: "subtract"
      - min-length: 30

  - name: "정상 코드 통과"
    input: "Review: function add(a,b) { return a + b }"
    assert:
      - not-contains: "bug"
```

### 지원 assertions

| assertion | 설명 |
|-----------|------|
| `contains: "text"` | 출력에 해당 문자열 포함 |
| `not-contains: "text"` | 출력에 해당 문자열 미포함 |
| `starts-with: "text"` | 출력이 해당 문자열로 시작 |
| `ends-with: "text"` | 출력이 해당 문자열로 종료 |
| `min-length: N` | 출력 길이 N 이상 |
| `max-length: N` | 출력 길이 N 이하 |
| `matches: "regex"` | 정규식 매칭 |

## 출력 형식

```
pulser eval v0.4.0

  reviewer (2 tests)
    ✓ 버그 감지            320ms
    ✗ 정상 코드 통과        280ms
      → expected not-contains "bug", found in output

  geo-audit (3 tests)
    ✓ URL 분석             450ms
    ✓ 스키마 감지           380ms
    ✓ 리포트 생성           520ms

  5 passed · 1 failed · 1.95s
```

### baseline 회귀 감지 시

```
  reviewer (2 tests)
    ✓ 버그 감지            320ms
    ⚠ 정상 코드 통과        280ms  [regression: was passing]
```

### Exit codes

| Code | 의미 |
|------|------|
| `0` | 전체 통과 |
| `1` | 실패 있음 |
| `3` | 회귀 감지 (이전에 통과하던 테스트가 실패) |

## 파일 구조

기존 코드 변경 없음. `src/eval/` 디렉토리만 추가.

```
src/
  eval/
    runner.ts        # claude CLI 호출 + 출력 수집 (~120줄)
    assertions.ts    # assertion 체크 로직 (~80줄)
    baseline.ts      # 결과 저장/비교 (~100줄)
    reporter.ts      # pass/fail 출력 포맷 (~60줄)
    index.ts         # eval 서브커맨드 진입점 (~50줄)
  index.ts           # eval 서브커맨드 등록 추가 (~10줄 수정)
```

## 기술 결정

### Runner: `claude -p` 사용

```typescript
// runner.ts 핵심 로직
import { execSync } from "child_process";

function runSkillTest(skillContent: string, input: string): string {
  const result = execSync(
    `claude -p --system-prompt ${quote(skillContent)} ${quote(input)}`,
    { encoding: "utf-8", timeout: 30000 }
  );
  return result;
}
```

- Claude Code CLI의 `-p` (print) 모드 사용
- `--system-prompt`로 스킬 내용 주입
- 별도 API 키 불필요 (사용자의 기존 Claude Code 인증 사용)
- 타임아웃 30초 (테스트당)

### 제약 사항

- text 출력 스킬만 테스트 가능 (analysis, research, generation, reference)
- execution 타입 스킬(cdp, workspace, notify)은 지원 불가
- `claude -p`는 도구 실행, 파일 I/O가 없는 text-only 모드
- 실제 Claude Code 세션과 100% 동일하지 않음 (근사 테스트)

### eval.yaml 스캐닝

기존 `scanner.ts`의 스킬 탐색 로직을 재사용:
1. 스킬 디렉토리 순회
2. `eval.yaml` 존재 여부 확인
3. yaml 파싱 (gray-matter와 별도, js-yaml 또는 yaml 패키지 사용)

### Baseline 저장

```
~/.pulser/baselines/
  reviewer-a3f2c1.json    # skill content hash 기반
```

```json
{
  "timestamp": "2026-03-26T14:30:00Z",
  "skill": "reviewer",
  "hash": "a3f2c1",
  "results": [
    { "name": "버그 감지", "passed": true, "duration": 320 },
    { "name": "정상 코드 통과", "passed": true, "duration": 280 }
  ]
}
```

## 의존성 추가

- `js-yaml` — eval.yaml 파싱 (gray-matter와 별도, 순수 YAML 파서)

기존 의존성(commander, chalk, gray-matter, boxen)은 그대로.

## 버전

v0.3.1 → v0.4.0 (minor bump, 새 기능 추가)

## 범위 밖 (의도적 제외)

- Karpathy autoresearch loop (v0.5+ 검토)
- LLM judge (v0.5+ 검토)
- `--format json` eval 출력 (수요 확인 후)
- 멀티모델 비교
- 자동 스킬 수정

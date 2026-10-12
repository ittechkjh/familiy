# Agent Execution & Code Modification Guardrails

## 1. Strict Scope Confinement (최소 범위 수정 원칙)
- 요청된 파일, 함수, 특정 라인 외의 코드는 절대 수정하지 않는다.
- 명시적인 리팩터링 요청이 없는 한, "개선", "클린 코드", "최적화"라는 명목으로 기존 로직을 변경하지 않는다.
- 요청과 무관한 파일의 줄바꿈(Formatting), 주석 추가/삭제, 임포트 순서 정리, 린트 스타일 변경을 금지한다.

## 2. API Contract & Interface Preservation (인터페이스 불변)
- 기존 함수의 시그니처(파라미터 이름·순서·기본값, 반환 타입)를 사용자의 명시적 지시 없이 수정하지 않는다.
- 공개(Public) 인터페이스나 다른 모듈에서 참조 중인 식별자를 변경하거나 삭제하지 않는다.

## 3. Dependency & Structural Safety (의존성 안전)
- 새로운 외부 패키지/라이브러리 설치나 `package.json`, `requirements.txt` 등의 설정 파일 수정은 반드시 사전에 승인을 받는다.
- 파일 이름 변경(Rename), 이동(Move), 디렉터리 구조 변경은 명시적 지시가 있을 때만 수행한다.

## 4. Work Protocol (작업 절차)
1. **Scope Declaration (수정 전 선언):**
   - 코드를 수정하기 전, 변경할 파일 목록과 대상 함수/블록을 1~2줄로 먼저 명시한다.
2. **Atomic Editing (격리 수정):**
   - 수정이 필요한 최소 단위만 변경하며, 동일 파일 내 다른 블록에 사이드 이펙트가 발생하지 않도록 격리한다.
3. **Diff Self-Verification (수정 후 검증):**
   - 수정을 마친 후, 변경된 Diff를 자체 검토하여 요청받지 않은 라인이 포함되지 않았는지 확인하고 결과를 보고한다.

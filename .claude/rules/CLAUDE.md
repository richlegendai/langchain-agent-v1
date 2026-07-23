# Agents Project

## 프로젝트 개요

- 프로젝트명: LangChain Agent v1
- 설명: 상품 후기 분석 Tauri 데스크톱 앱과 LangChain 학습 자료를 함께 제공하는 프로젝트
- 주요 기술 스택: Tauri v2, Rust, React, TypeScript, Python 3.12, LangChain, Ollama

## 현재 작업 상태

| 상태 | 작업 | 날짜 |
|------|------|------|
| 완료 | 상품 후기 분석 데스크톱 앱 MVP와 macOS 패키징 | 2026-07-22 |

## AI 실수 방지 메모

| 날짜 | 실수 내용 | 올바른 방법 | 재발 방지 규칙 |
|------|-----------|-------------|----------------|
| 2026-07-22 | `project/02_lcel.py:29`에서 `BaseMessage`를 `langchain.messages`에서 가져와 LSP 오류가 발생했다. | `BaseMessage`는 `langchain_core.messages`에서 가져온다. | LangChain 메시지 타입을 추가한 직후 LSP 진단으로 실제 공개 경로인지 확인한다. |
| 2026-07-22 | 디자인 시스템 교체 패치가 삭제와 추가를 한 번에 처리하다 중간 실패하여 자동 생성 파일이 사라졌다. | 교체 전 파일 존재를 다시 확인하고 한 파일의 Update 패치로 처리한다. | Delete와 Add를 섞은 큰 패치 전에 대상별 작은 패치로 검증한다. |
| 2026-07-22 | `src-tauri/src/events.rs:234`의 Rust raw byte 문자열에 한글을 넣어 테스트가 계약 위반이 아닌 컴파일 오류로 실패했다. | 비 ASCII JSON 테스트 데이터는 일반 raw 문자열에 `.as_bytes()`를 적용한다. | Rust `br#\"...\"#` 테스트 데이터에는 ASCII만 사용하고 한글은 `r#\"...\"#.as_bytes()`로 작성한다. |
| 2026-07-22 | `src-tauri/src/events.rs:21`에서 한글 JSON을 raw byte 문자열로 작성하여 Rust 컴파일이 실패했다. | 한글이 포함된 테스트 입력은 UTF-8 문자열에 `.as_bytes()`를 적용한다. | 비 ASCII 테스트 데이터를 추가할 때 byte 문자열 리터럴을 사용하지 않는다. |
| 2026-07-22 | `src/App.test.tsx:30`의 긴 단일 행이 Biome 포맷 규칙을 위반하여 `pnpm check`가 중단됐다. | 수정 직후 `pnpm exec biome check <파일>`을 실행하고 필요한 줄바꿈을 반영한다. | TypeScript 파일 수정 후 전체 검증 전에 변경 파일 단위 Biome 검사를 실행한다. |
| 2026-07-22 | `pnpm-workspace.yaml`에 7일 공급망 지연을 추가하여 최신 안정 의존성 45개가 정책 검사에서 차단됐다. | 현재 잠금 파일의 출시 시각을 먼저 확인하고 최신 안정 버전 정책과 양립하는 1일 지연을 적용한다. | `minimumReleaseAge` 변경 직후 `pnpm install --frozen-lockfile`로 전체 잠금 파일을 검증한다. |
| 2026-07-22 | `.gitignore:26`에 Tauri 빌드 제외 규칙을 동일하게 두 번 추가했다. | 기존 항목을 먼저 검색하고 필요한 규칙 한 세트만 유지한다. | 설정 파일 패치 후 같은 줄의 중복 여부를 diff로 확인한다. |
| 2026-07-22 | `review_analyzer/service.py:58`에서 예상하지 못한 오류까지 재시도 가능한 후기 실패로 바꿔 프로그래밍 결함을 숨겼다. | 알려진 `ReviewAnalysisError`만 부분 실패로 변환하고 그 밖의 오류는 작업 경계로 전파한다. | 넓은 예외 처리를 추가하기 전에 예상 오류 타입과 전파 테스트를 명시한다. |
| 2026-07-22 | `scripts/build-sidecar.test.mjs`가 Node 내장 테스트인데 Vitest의 `*.test.*` 패턴에도 수집되어 전체 프론트엔드 검증이 실패했다. | Node 전용 테스트는 `*.node-test.mjs`로 구분하고 `node --test`에서 명시적으로 실행한다. | 다른 테스트 러너를 추가할 때 기존 러너의 파일 수집 패턴과 겹치지 않는지 전체 테스트로 확인한다. |
| 2026-07-22 | macOS 앱 QA에서 입력 자동화를 위해 클립보드를 바꾼 뒤 기존 값을 복원하지 못했다. | 클립보드를 사용하기 전에 기존 값을 저장하고 `finally`에 해당하는 정리 단계에서 복원한다. | UI 자동화는 클립보드를 사용하지 않는 입력 방식을 우선하고, 불가피하면 성공과 실패 경로 모두에서 원래 값을 복원한다. |

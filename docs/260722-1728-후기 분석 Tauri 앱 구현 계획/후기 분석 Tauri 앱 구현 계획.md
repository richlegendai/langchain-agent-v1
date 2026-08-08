# 후기 분석 Tauri 앱 구현 계획

> 실행 기준: 작업별로 실패하는 테스트를 먼저 만들고 최소 구현으로 통과시킨 뒤 전체 검증을 수행한다.

## 목표

승인된 PRD를 기준으로 멀티 프로그램 런처와 LangChain 상품 후기 분석을 제공하는 Tauri v2 데스크톱 MVP를 구현한다.

## 아키텍처

React 웹뷰는 사용자 입력과 상태 표시만 담당한다. Rust 명령 계층은 Tauri 권한과 Python sidecar 프로세스를 관리하며, Python은 버전이 있는 JSONL 계약을 Pydantic으로 검증하고 LangChain 구조화 출력을 제한된 동시성으로 실행한다. 후기별 실패는 개별 결과로 보존한다.

## 기술 구성

- Vite, React, TypeScript, Tailwind CSS, Zod, Vitest
- Tauri v2, Rust, serde, thiserror, tauri-plugin-shell
- Python 3.12, uv, Pydantic v2, AnyIO, LangChain, Ollama, Groq, OpenAI
- PyInstaller sidecar 패키징

## 성공 기준

- 런처에서 후기 분석 프로그램에 진입하고 돌아올 수 있다.
- 1건부터 200건의 후기를 검사하고 Ollama로 분석할 수 있다.
- 감성, 요약, 핵심 내용, 대응 전략, 답변 후보 3개가 구조화 결과로 표시된다.
- 일부 실패가 성공 결과를 제거하지 않으며 실패 항목만 재시도할 수 있다.
- CSV와 JSON 내보내기 데이터가 한글과 CSV 수식 주입 방지를 유지한다.
- Python, TypeScript, Rust 테스트와 빌드가 통과하고 실제 Tauri 앱 표면을 확인한다.

## 작업 순서

### 1. 계약과 Python 분석 계층

1. Pydantic 계약과 유효성 검증 테스트를 먼저 작성한다.
2. 가짜 분석기를 이용한 제한 동시성, 부분 실패, 원본 순서 테스트를 작성한다.
3. LangChain 제공자 팩토리와 구조화 출력 체인을 구현한다.
4. stdin 요청과 stdout 이벤트를 연결하는 JSONL sidecar를 구현한다.

검증: `uv run pytest tests/review_analyzer -q`, `uv run basedpyright`, `uv run ruff check review_analyzer tests/review_analyzer`

### 2. React 데이터 계약과 사용자 흐름

1. Zod 계약 파싱, 입력 검사, CSV 내보내기 안전 처리 테스트를 작성한다.
2. 프로그램 등록 정보와 런처를 구현한다.
3. 후기 입력, 모델 설정, 진행률, 결과 목록, 상세 답변 비교를 구현한다.
4. Tauri 이벤트와 브라우저 개발용 데모 어댑터를 연결한다.

검증: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`

### 3. Tauri 명령 계층

1. 계약 버전과 요청 범위 검증 테스트를 작성한다.
2. 등록된 sidecar 실행과 JSONL 이벤트 전달 명령을 구현한다.
3. 필요한 shell sidecar 권한만 Capability에 등록한다.
4. PyInstaller 빌드 스크립트와 Tauri `externalBin` 경로를 구성한다.

검증: `cargo test --manifest-path src-tauri/Cargo.toml`, `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`, `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`

### 4. 문서와 실제 표면 검증

1. README를 후기 분석 앱 중심으로 개편하고 학습 노트북은 별도 섹션에 보존한다.
2. 실제 Ollama 분석을 실행하여 JSONL 구조와 부분 결과를 확인한다.
3. Tauri 앱에서 런처와 분석 흐름을 실행한다.
4. 375px, 768px, 1280px에서 레이아웃과 키보드 접근성을 확인한다.
5. 변경 파일 크기, escape hatch, 조용한 예외, 권한 범위를 최종 검토한다.

검증: `pnpm tauri build`, `git diff --check`, 금지 패턴 검색, 실제 화면 캡처

## Must Not Have

- 웹뷰에서 API 키 저장 또는 직접 모델 호출
- 사용자 승인 없는 외부 게시와 자동 수집
- 후기 원문 또는 비밀값 로그 기록
- 무제한 동시성 또는 무제한 재시도
- `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, Rust `unwrap()`
- 예외를 숨기는 빈 `catch`와 조용한 성공 처리
- 기존 Jupyter 학습 파일 변경

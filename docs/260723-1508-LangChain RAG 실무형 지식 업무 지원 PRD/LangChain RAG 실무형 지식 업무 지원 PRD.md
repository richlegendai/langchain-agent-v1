# LangChain RAG 사내 지식 검색 MVP PRD

## 1. 제품 개요

Jira, Confluence, Slack과 Google Sheets에 흩어진 한 회사의 업무 자료를 중앙 서버로 수집하고, 사용자가 Tauri 데스크톱 앱에서 질문하면 출처가 포함된 답변을 제공하는 사내 지식 검색 프로그램을 만듭니다.

이 프로그램은 기존 `상품 후기 분석`과 별개의 프로그램입니다. 두 프로그램은 Tauri 런처만 공유하며 데이터, 서버 API, Python 패키지와 실행 프로세스를 공유하지 않습니다.

```text
ReviewFlow Desktop
  ├─ 상품 후기 분석
  └─ 사내 지식 검색
```

## 2. 목표

1. 한 회사의 업무 자료를 하루 1~2회 중앙 서버에 동기화합니다.
2. LangChain을 문서 처리, 검색과 답변 생성의 중심 프레임워크로 사용합니다.
3. 사용자는 Tauri 앱에서 자연어로 질문하고 원본 링크가 포함된 답변을 확인합니다.
4. 문서에 근거가 없으면 추측하지 않습니다.
5. 무료 오픈소스 소프트웨어로 개발하고 Docker Compose에서 실행합니다.
6. 상품 후기 분석 기능에 영향을 주지 않는 독립 프로그램으로 구현합니다.

## 3. MVP 원칙

1. 한 회사만 지원하며 멀티테넌트 구조를 만들지 않습니다.
2. 복잡한 자동화보다 실제 검색 가능한 흐름을 먼저 완성합니다.
3. 수집은 MCP가 아닌 각 서비스의 공식 API를 사용합니다.
4. 수집과 색인은 RAG Batch Worker에서 처리합니다.
5. 사용자 질문은 FastAPI의 실시간 RAG 체인에서 처리합니다.
6. 변경된 문서만 다시 임베딩합니다.
7. PostgreSQL을 원본 관리 기준 저장소로 사용합니다.
8. Chroma를 재생성 가능한 벡터 검색 인덱스로 사용합니다.
9. LangGraph, Kafka와 Celery는 MVP에 사용하지 않습니다.
10. 모든 서버 구성요소는 Docker Compose로 실행합니다.

## 4. 사용자

### 4.1 일반 사용자

- Tauri 앱에서 질문 입력
- 답변과 인용 출처 확인
- 원본 Jira, Confluence, Slack 또는 Sheets 링크 열기

### 4.2 관리자

- 서비스 연결 상태 확인
- 수동 동기화 실행
- 서비스별 수집 결과 확인
- 최근 배치 성공과 실패 확인

MVP에서는 별도 관리자 웹사이트를 만들지 않습니다. 관리자 기능은 Tauri의 사내 지식 검색 화면에 제한적으로 제공합니다.

## 5. 전체 아키텍처

```text
회사 사용자
→ Tauri Desktop
→ 사내망 또는 VPN
→ Caddy HTTPS
→ FastAPI
→ LangChain
   ├─ PostgreSQL
   ├─ Chroma Server
   └─ Ollama
       ├─ bge-m3
       └─ gemma4:e2b
```

배치 수집은 실시간 질문 처리와 분리합니다.

```text
서버 cron
→ RAG Batch Worker
→ Jira, Confluence, Slack, Google Sheets
→ PostgreSQL
→ LangChain 문서 처리
→ Ollama bge-m3
→ Chroma Server
```

## 6. 기술 스택

### 6.1 Tauri 클라이언트

- Rust Tauri
- React
- TypeScript

### 6.2 서버

- Python
- FastAPI
- Pydantic
- LangChain

### 6.3 데이터

- PostgreSQL
- Chroma Server

### 6.4 AI 모델

- Ollama `bge-m3`
- Ollama `gemma4:e2b`

### 6.5 배치와 인프라

- Python RAG Batch Worker
- 서버 cron
- Docker Compose
- Caddy
- Docker Volume

소프트웨어는 무료 오픈소스로 구성합니다. 서버, GPU, 저장 공간, 네트워크와 전기 비용은 별도입니다. Ollama에서 실행하는 모델은 회사 사용 전에 각 모델 라이선스를 다시 확인합니다.

## 7. 데이터 원천

### 7.1 Jira

- 지정 프로젝트의 최근 수정 이슈 200개
- 이슈 키
- 제목
- 설명
- 상태
- 라벨
- 최근 댓글
- 수정 시간
- 원본 URL

### 7.2 Confluence

- 지정 스페이스의 최근 수정 페이지 200개
- 페이지 ID
- 제목
- 본문
- 스페이스
- 수정 시간
- 원본 URL

### 7.3 Slack

- 지정 채널별 최근 메시지 500개
- 메시지 ID
- 채널
- 작성자 표시명
- 본문
- 스레드 답글
- 작성 시간
- 원본 URL

### 7.4 Google Sheets

- 지정 스프레드시트와 시트
- 최대 2,000행
- 헤더
- 데이터 행
- 행 번호
- A1 범위
- 원본 URL

Google Drive 전체 검색, Google Docs, Slides, Gmail과 Calendar는 MVP 이후로 미룹니다.

## 8. 서비스 연결

MVP에서는 서버 환경 변수를 사용합니다.

```text
ATLASSIAN_BASE_URL
ATLASSIAN_EMAIL
ATLASSIAN_API_TOKEN
SLACK_BOT_TOKEN
GOOGLE_SERVICE_ACCOUNT_FILE
```

요구사항:

- 읽기 권한만 사용합니다.
- 자격 증명을 Tauri 앱에 전달하지 않습니다.
- 자격 증명과 원문을 로그에 출력하지 않습니다.
- `.env`는 Git에 커밋하지 않습니다.
- Google Sheets는 서비스 계정에 지정 스프레드시트 읽기 권한만 부여합니다.
- 연결 실패는 서비스별로 구분하여 기록합니다.

OAuth 연결 UI와 회사 SSO 연동은 MVP 이후에 구현합니다.

## 9. RAG Batch

### 9.1 실행 방식

기본 실행은 서버 cron을 사용합니다.

```text
업무 시작 전 1회
오후 1회
```

실행 명령:

```bash
docker compose run --rm rag-batch-worker knowledge-sync --all
```

관리자는 Tauri에서 수동 동기화를 요청할 수 있습니다. FastAPI는 별도 Worker 프로세스를 실행하고 `job_id`를 반환합니다.

### 9.2 처리 흐름

```text
서비스별 자료 수집
→ 공통 SourceItem으로 정규화
→ PostgreSQL의 content_hash와 비교
→ 신규 또는 변경 문서 선별
→ LangChain Document 변환
→ 텍스트 분할
→ bge-m3 임베딩
→ Chroma upsert
→ 삭제된 문서 제거
→ PostgreSQL에 실행 결과 기록
```

### 9.3 변경 감지

안정적인 외부 ID를 사용합니다.

```text
jira:PROJ-123
confluence:page-93842
slack:C12345:1721731200.000100
sheets:spreadsheet-id:sheet-name:42
```

처리 규칙:

```text
새 external_id
→ 신규 문서 저장과 임베딩

같은 external_id, 다른 content_hash
→ 원문 갱신과 재임베딩

같은 external_id, 같은 content_hash
→ 처리 생략

기존 external_id가 원본에서 사라짐
→ PostgreSQL 비활성화와 Chroma 삭제
```

삭제 처리는 해당 서비스의 전체 수집이 성공한 경우에만 실행합니다. 일부 페이지 수집이 실패한 상태에서 기존 문서를 삭제하지 않습니다.

### 9.4 배치에서 제외하는 처리

- 모든 문서의 LLM 요약
- 문서별 답변 사전 생성
- LLM 기반 자동 엔터티 추출
- 매 실행 시 전체 재임베딩
- 사용자 질문 처리

배치에서는 결정 가능한 정리, 분할과 변경 판별을 일반 코드로 처리합니다. LLM 답변 모델은 호출하지 않고 `bge-m3` 임베딩만 생성합니다.

## 10. LangChain 사용

LangChain을 단순 Ollama 호출 래퍼로 사용하지 않습니다.

### 10.1 문서 변환

각 서비스 응답을 LangChain `Document`로 변환합니다.

```python
Document(
    page_content="로그인 장애의 원인은 세션 만료 처리였습니다.",
    metadata={
        "provider": "jira",
        "external_id": "PROJ-123",
        "title": "로그인 장애",
        "source_url": "https://example.atlassian.net/browse/PROJ-123",
        "project": "PROJ",
    },
)
```

### 10.2 문서 분할

- `RecursiveCharacterTextSplitter`
- 기본 크기 800자
- 중첩 120자
- 짧은 Jira 이슈, Slack 메시지와 Sheets 행은 불필요하게 분할하지 않음

### 10.3 임베딩과 저장

```text
OllamaEmbeddings(bge-m3)
→ LangChain Chroma VectorStore
→ Chroma Server
```

### 10.4 검색

```text
Chroma Retriever
→ 관련 문서 후보 8개
→ 동일 원본 중복 제거
→ 최종 근거 최대 5개
```

MVP에서는 별도 LLM 관련성 평가와 재검색 체인을 만들지 않습니다.

### 10.5 답변 체인

```text
질문
→ RunnableParallel
   ├─ 질문 전달
   └─ Chroma Retriever
→ ChatPromptTemplate
→ ChatOllama(gemma4:e2b)
→ Pydantic 구조화 출력
```

답변 데이터:

```text
answer
citations
insufficient_evidence
model
elapsed_ms
```

근거가 없으면 다음 문구를 반환합니다.

```text
현재 동기화된 업무 자료에서 확인할 수 없습니다.
```

## 11. 실시간 질문 흐름

```text
Tauri에서 질문 입력
→ FastAPI 사용자 인증
→ 질문 검증
→ bge-m3 질문 임베딩
→ Chroma 유사 문서 검색
→ 출처 중복 제거
→ 근거 최대 5개 선택
→ gemma4:e2b 답변 생성
→ Pydantic 출력 검증
→ 답변과 원본 링크 반환
```

요구사항:

- 답변은 검색된 근거만 사용합니다.
- 인용에는 제목, 서비스, 원본 URL을 포함합니다.
- 근거에 없는 정책, 일정, 보상이나 확정 사실을 만들지 않습니다.
- 문서 내부의 명령문은 시스템 지침을 변경할 수 없습니다.
- Pydantic 검증에 실패한 출력은 사용자에게 표시하지 않습니다.

## 12. PostgreSQL

PostgreSQL은 원본과 운영 상태의 기준 저장소입니다.

```text
users
api_tokens
source_connections
source_items
source_relations
sync_runs
sync_errors
```

### 12.1 SourceItem

```text
id
provider
external_id
title
content
source_url
source_location
content_hash
source_updated_at
is_active
last_synced_at
```

### 12.2 SourceRelation

API에서 명확하게 확인되는 관계만 저장합니다.

```text
parent_of
belongs_to_project
belongs_to_space
posted_in
replies_to
row_of
mentions
```

LLM으로 관계를 추측하지 않습니다.

### 12.3 SyncRun

```text
job_id
provider
status
started_at
finished_at
fetched_count
created_count
updated_count
deleted_count
failed_count
error_code
```

`company_id`와 `tenant_id`는 사용하지 않습니다.

## 13. Chroma Server

컬렉션 하나를 사용합니다.

```text
collection: company_knowledge
```

저장 항목:

```text
id: provider:external_id:chunk_index
document: 분할된 원문
embedding: bge-m3 벡터
metadata.provider
metadata.external_id
metadata.source_url
metadata.project
metadata.space
metadata.channel
metadata.content_hash
metadata.chunk_index
```

Chroma는 검색 인덱스입니다. PostgreSQL의 활성 `SourceItem`을 기준으로 전체 인덱스를 다시 생성할 수 있어야 합니다.

## 14. 사용자 인증과 보안

### 14.1 MVP 인증

- 사내망 또는 VPN에서만 접속
- 사용자별 API 토큰 발급
- PostgreSQL에는 토큰 원문이 아닌 해시 저장
- Tauri는 운영체제 보안 저장소에 토큰 저장
- FastAPI가 모든 요청에서 토큰 검증

### 14.2 네트워크

외부에는 Caddy만 공개합니다.

```text
외부 공개
└─ Caddy 443

Docker 내부 전용
├─ FastAPI 8000
├─ PostgreSQL 5432
├─ Chroma 8000
└─ Ollama 11434
```

금지 연결:

```text
Tauri → PostgreSQL
Tauri → Chroma
Tauri → Ollama
```

모든 사용자 요청은 다음 경로를 사용합니다.

```text
Tauri → Caddy → FastAPI → 내부 서비스
```

### 14.3 로그

- API 토큰을 기록하지 않습니다.
- 질문 원문과 검색 문서 전문을 기본 로그에 기록하지 않습니다.
- 오류 코드, 처리 시간, 문서 수와 모델 이름만 기록합니다.
- 동기화 오류에는 원문이 아닌 provider와 external_id만 기록합니다.

## 15. FastAPI 계약

### 15.1 상태

```text
GET /api/knowledge/health
GET /api/knowledge/sources
```

### 15.2 질문

```text
POST /api/knowledge/query
```

요청:

```text
schema_version
request_id
question
provider_filter
```

응답:

```text
schema_version
request_id
answer
citations
insufficient_evidence
model
elapsed_ms
```

### 15.3 동기화

```text
POST /api/knowledge/sync
GET /api/knowledge/sync/{job_id}
POST /api/knowledge/sync/{job_id}/cancel
```

수동 동기화는 관리자 토큰만 실행할 수 있습니다.

## 16. Tauri 화면

사내 지식 검색 화면 하나를 만듭니다.

```text
사내 지식 검색
  ├─ 서버 연결 상태
  ├─ 서비스별 마지막 동기화
  ├─ 질문 입력
  ├─ 답변
  ├─ 인용 출처 목록
  ├─ 근거 부족 경고
  └─ 관리자용 지금 동기화
```

상품 후기 분석 화면과 상태를 공유하지 않습니다.

```text
src/features/review-analyzer
src/features/knowledge-search
```

## 17. Docker Compose

```text
services
  ├─ caddy
  ├─ knowledge-api
  ├─ rag-batch-worker
  ├─ postgres
  ├─ chroma
  └─ ollama
```

영속 데이터:

```text
postgres-data
chroma-data
ollama-models
caddy-data
```

요구사항:

- 각 컨테이너에 health check를 둡니다.
- FastAPI는 PostgreSQL, Chroma와 Ollama 상태를 확인합니다.
- 컨테이너는 실패 시 재시작하도록 설정합니다.
- Chroma와 PostgreSQL 데이터는 Docker Volume에 저장합니다.
- 개발 환경과 서버 환경은 같은 이미지와 환경 변수 이름을 사용합니다.

## 18. 오류 처리

| 오류 | 동작 |
| --- | --- |
| FastAPI 연결 실패 | Tauri에 서버 연결 실패 표시 |
| 자격 증명 없음 | 누락된 서버 환경 변수 표시 |
| Jira 연결 실패 | Jira만 실패 처리 |
| Confluence 연결 실패 | Confluence만 실패 처리 |
| Slack 연결 실패 | Slack만 실패 처리 |
| Google Sheets 연결 실패 | Sheets만 실패 처리 |
| PostgreSQL 연결 실패 | 동기화와 질문 중단 |
| Chroma 연결 실패 | 색인 또는 검색 중단 |
| Ollama 연결 실패 | 임베딩 또는 답변 생성 중단 |
| `bge-m3` 미설치 | 필요한 모델 이름 표시 |
| `gemma4:e2b` 미설치 | 필요한 모델 이름 표시 |
| 일부 소스 실패 | 성공 소스의 기존 데이터 유지 |
| 배치 취소 | 완료된 upsert는 유지하고 실행 상태를 취소로 기록 |
| 근거 없음 | 추측하지 않고 근거 부족 표시 |

## 19. 구현 단계

### 단계 1. 서버 기반

- Docker Compose
- PostgreSQL
- Chroma Server
- Ollama
- FastAPI health API

완료 기준: 모든 컨테이너가 실행되고 FastAPI에서 의존 서비스 상태를 확인합니다.

### 단계 2. 공통 데이터 계약

- `SourceItem`
- `SourceRelation`
- `SyncRun`
- Pydantic 모델
- PostgreSQL 테이블

완료 기준: 네 서비스의 샘플 데이터를 같은 구조로 저장합니다.

### 단계 3. 최소 커넥터

- Jira
- Confluence
- Slack
- Google Sheets

완료 기준: 제한된 범위의 실제 데이터를 읽기 권한으로 수집합니다.

### 단계 4. RAG Batch

- 콘텐츠 해시
- LangChain `Document`
- 텍스트 분할
- `OllamaEmbeddings(bge-m3)`
- Chroma upsert와 삭제
- 동기화 이력

완료 기준: 변경된 자료만 다시 임베딩하고 Chroma에서 검색할 수 있습니다.

### 단계 5. LangChain 실시간 RAG

- Chroma Retriever
- `RunnableParallel`
- `ChatPromptTemplate`
- `ChatOllama(gemma4:e2b)`
- Pydantic 구조화 출력
- 인용 출처

완료 기준: 질문에 근거 기반 답변과 원본 링크를 반환합니다.

### 단계 6. Tauri 연결

- 서버 상태
- 질문과 답변
- 출처 목록
- 근거 부족 경고
- 관리자 수동 동기화

완료 기준: 상품 후기 분석과 별도로 사내 지식 검색 전체 흐름을 사용할 수 있습니다.

### 단계 7. 서버 배포

- Caddy
- HTTPS
- 사용자별 API 토큰
- 서버 cron
- Docker Volume 백업

완료 기준: 회사 사용자가 Tauri에서 HTTPS로 서버에 접속합니다.

## 20. 테스트

### 20.1 자동 테스트

- 네 서비스 응답을 `SourceItem`으로 변환
- 같은 `external_id`와 `content_hash` 처리 생략
- 변경 문서만 재임베딩
- 서비스 전체 수집 실패 시 기존 문서 삭제 방지
- Chroma ID 중복 방지
- 근거 없는 질문 거부
- Pydantic 출력 검증
- 관리자 토큰 없이 동기화 API 호출 거부
- 사내 지식 검색이 상품 후기 분석 패키지를 참조하지 않음

### 20.2 통합 테스트

1. Docker Compose를 실행합니다.
2. 네 가지 서비스 연결 상태를 확인합니다.
3. RAG Batch를 실행합니다.
4. PostgreSQL의 수집 결과를 확인합니다.
5. Chroma 검색 결과를 확인합니다.
6. Tauri에서 질문합니다.
7. 답변과 원본 링크를 확인합니다.
8. 같은 배치를 다시 실행하여 재임베딩되지 않는지 확인합니다.
9. Chroma를 비운 뒤 PostgreSQL을 기준으로 재색인합니다.
10. 지식 서버를 중단한 상태에서 상품 후기 분석이 동작하는지 확인합니다.

## 21. 출시 기준

- Tauri가 회사 서버의 FastAPI에 HTTPS로 접속합니다.
- Jira, Confluence, Slack과 Google Sheets의 제한된 자료를 수집합니다.
- PostgreSQL에 원본과 동기화 이력을 저장합니다.
- 변경된 문서만 `bge-m3`로 다시 임베딩합니다.
- Chroma에서 관련 문서를 검색합니다.
- LangChain이 검색, 프롬프트와 구조화 출력을 조합합니다.
- `gemma4:e2b`가 검색된 근거만 사용하여 답변합니다.
- 답변에 원본 링크가 표시됩니다.
- 근거가 없으면 추측하지 않습니다.
- 모든 서버 구성요소가 Docker Compose에서 실행됩니다.
- 지식 검색 장애가 상품 후기 분석에 영향을 주지 않습니다.

## 22. MVP 제외 범위

- 여러 회사 지원
- 멀티테넌트
- 결제와 요금제
- Kafka
- Celery
- RabbitMQ
- Valkey
- Kubernetes
- LangGraph
- 자율 Agent
- 실시간 MCP 검색
- 실시간 동기화
- 웹훅
- 자동 온톨로지와 지식 그래프
- LLM 기반 자동 관계 추출
- Google Drive 전체 검색
- Google Docs와 Slides
- Gmail과 Calendar
- Slack 다이렉트 메시지
- 첨부 파일 본문
- OCR
- Chroma Cloud
- 자동 외부 시스템 쓰기

## 23. 후속 로드맵

1. 회사 SSO와 OIDC 연동
2. 사용자와 부서별 문서 접근 권한
3. Google Drive, Docs와 Slides
4. Slack과 Jira 웹훅
5. Celery와 RabbitMQ 기반 작업 큐
6. BM25와 벡터 혼합 검색
7. LangGraph 재검색과 근거 검증
8. Prometheus와 Grafana 모니터링
9. 관리자 대시보드
10. 승인된 사내 답변 피드백

## 24. 기본 가정

- 한 회사에서만 사용합니다.
- 사용자는 사내망 또는 VPN으로 접속합니다.
- 첫 버전은 한 명의 관리자와 제한된 내부 사용자를 대상으로 합니다.
- Chroma 컬렉션은 `company_knowledge` 하나만 사용합니다.
- 자격 증명은 서버에서만 관리합니다.
- 배치는 하루 1~2회 실행합니다.
- PostgreSQL은 원본 관리 기준 저장소입니다.
- Chroma는 재생성 가능한 벡터 검색 인덱스입니다.
- 임베딩과 답변 생성은 서버의 Ollama에서 처리합니다.
- 상품 후기 분석 코드는 변경하지 않습니다.

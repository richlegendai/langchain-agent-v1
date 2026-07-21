# LangChain 기초 강의 실행 계획

## 1. 문서 목적

이 문서는 [pandas-studio/langchain-basic-course](https://github.com/pandas-studio/langchain-basic-course)의 입문 트랙을 AI Agent 중심으로 실행하기 위한 운영 기준입니다.

사용자가 각 셀을 직접 코딩하는 방식이 아니라 AI Agent가 다음 작업을 순서대로 수행하는 것을 전제로 합니다.

- 프로젝트 환경 확인
- Python 가상환경과 의존성 설치
- Jupyter 노트북 실행
- Ollama 모델 관리
- 강의별 오류 분석과 수정
- Ollama와 Groq 실행 결과 비교

## 2. 확정 운영 방향

### 2.1 모델 역할

| 역할 | 기본 선택 | 사용 목적 |
| --- | --- | --- |
| 주력 LLM | Ollama | 인터넷 연결과 API 비용에 덜 의존하는 기본 실행 경로 |
| 보조 LLM | Groq | 같은 실습을 다시 실행하여 속도와 결과를 비교하는 경로 |
| 임베딩 모델 | Ollama `bge-m3` | 03번과 06번 노트북의 예시 선택자와 RAG 임베딩 |
| 로컬 생성 모델 | Ollama `gemma4:e4b` | Ollama를 생성형 LLM으로 사용하는 기본 후보 |

Ollama와 Groq을 동시에 기본 경로로 섞지 않습니다. 각 노트북은 먼저 Ollama로 완료한 뒤, 같은 입력과 구조를 유지하여 Groq으로 재실행합니다.

### 2.2 Jupyter 운영 방식

Jupyter와 `ipykernel`은 프로젝트 실행 환경에 유지합니다. 사용자가 Jupyter Lab 화면을 직접 조작하지 않고 AI Agent가 노트북을 실행합니다.

실행 원칙은 다음과 같습니다.

- AI Agent가 노트북 셀의 실행 순서를 관리합니다.
- AI Agent가 실행 결과와 오류 메시지를 확인합니다.
- 사용자는 필요한 승인과 방향 결정만 합니다.
- 노트북 결과를 보존해야 하는 경우 실행된 `.ipynb` 파일을 저장합니다.
- 노트북 실행이 불편한 경우 AI Agent가 별도 Python 실행 파일로 변환할 수 있지만, 원본 노트북은 보존합니다.

### 2.3 Groq의 사용 범위

이 강의 저장소가 기본 지원하는 클라우드 옵션은 Groq입니다. Groq API 키는 `.env`의 `GROQ_API_KEY`에 설정하고, 키 값 자체는 문서나 Git에 기록하지 않습니다.

Groq은 다음 상황에서 사용합니다.

- Ollama 실행 결과와 클라우드 모델 결과 비교
- Ollama 로컬 모델의 응답 속도가 지나치게 느린 경우의 비교 기준
- Ollama에서 특정 노트북 기능을 지원하지 않는 경우의 대체 실행 경로

자동 fallback은 기본값으로 켜지 않습니다. AI Agent가 Ollama 실행 실패 원인을 먼저 기록한 뒤, 사용자가 확인할 수 있도록 Groq 실행을 별도로 진행합니다.

## 3. 실행 전제 조건

### 3.1 프로젝트 환경

- Python 3.10 이상
- 프로젝트 가상환경
- `uv` 또는 `pip`
- Jupyter와 `ipykernel`
- Ollama 애플리케이션과 CLI
- Groq API 키

프로젝트의 `pyproject.toml`에 Jupyter, LangChain Ollama 통합, LangChain Groq 통합 패키지가 포함되어 있는지 AI Agent가 먼저 확인합니다.

### 3.2 Ollama 모델

기본적으로 다음 모델을 준비합니다.

```bash
ollama pull bge-m3
ollama pull gemma4:e4b
```

모델 크기와 실행 가능 여부는 컴퓨터 메모리와 현재 실행 중인 애플리케이션을 함께 고려합니다.

- RAM 16GB 이상: `gemma4:e4b`와 `bge-m3`를 우선 시도합니다.
- RAM이 부족하거나 응답이 지나치게 느림: 더 작은 Ollama 생성 모델을 검토합니다.
- 로컬 생성 모델 실행이 불안정함: Ollama의 `bge-m3`만 유지하고 생성 LLM은 Groq으로 비교 실행합니다.

AI Agent는 모델을 사용하기 전에 `ollama list`로 설치 상태를 확인하고, 필요하면 Ollama 애플리케이션이 실행 중인지 확인합니다.

### 3.3 API 키와 비밀값

프로젝트 루트의 `.env`에는 필요한 값만 설정합니다.

```env
GROQ_API_KEY=
```

API 키, 토큰, 개인 정보는 문서와 Git diff에 출력하지 않습니다. `.env` 파일은 커밋하지 않습니다.

## 4. 강의 실행 순서

### 단계 1. 프로젝트와 실행 환경 확인

**상태**: 대기

AI Agent가 다음 항목을 확인합니다.

- 저장소 위치와 현재 Git 상태
- Python 버전
- `uv` 또는 가상환경 사용 가능 여부
- 프로젝트 의존성 설치 상태
- Jupyter 커널 상태
- Ollama CLI와 실행 상태
- 사용 가능한 RAM과 저장 공간

**완료 기준**:

- 프로젝트 의존성을 설치할 수 있습니다.
- 실행할 Jupyter 커널을 확인할 수 있습니다.
- Ollama 상태와 설치된 모델을 확인할 수 있습니다.
- Groq API 키의 존재 여부를 값 노출 없이 확인할 수 있습니다.

### 단계 2. Ollama 기본 경로 준비

**상태**: 대기

AI Agent가 `bge-m3`를 준비하고, 컴퓨터 사양에 따라 `gemma4:e4b` 또는 더 작은 생성 모델을 준비합니다.

**완료 기준**:

- Ollama 임베딩 호출이 성공합니다.
- 선택한 Ollama 생성 모델의 간단한 응답이 성공합니다.
- 모델 실행 후 컴퓨터가 정상적으로 반응합니다.

### 단계 3. 강의 노트북을 Ollama로 실행

**상태**: 대기

강의 노트북은 Ollama를 주력으로 사용하여 순서대로 실행합니다.

- 01번: OpenAI SDK 직접 호출 구조를 확인한 뒤 Ollama 주력 원칙에 맞는 실행 경로를 결정합니다.
- 02번: LangChain Core와 LCEL을 Ollama로 실행합니다.
- 03번: 구조화 출력과 예시 선택자를 Ollama 및 `bge-m3`로 실행합니다.
- 04번: Tools 실습을 Ollama로 실행하고, 웹 검색 키가 필요한 부분을 별도로 표시합니다.
- 05번: Agents 실습을 Ollama로 실행합니다.
- 06번: `bge-m3`, FAISS, Ollama를 이용해 RAG 파이프라인을 실행합니다.

01번 노트북이 OpenAI SDK를 전제로 하여 Ollama로 바로 실행되지 않는 경우, AI Agent는 임의로 OpenAI 키를 요구하지 않습니다. 해당 노트북의 실행 구조를 확인하고 Ollama용 최소 변경을 제안하거나 02번부터 진행합니다.

각 단계가 끝날 때 AI Agent는 다음 결과를 기록합니다.

- 실행한 노트북과 셀 범위
- 성공한 호출
- 실패한 호출과 정확한 오류 문자열
- 사용한 Ollama 모델
- 다음 단계로 넘어가기 위한 조건

### 단계 4. 같은 실습을 Groq으로 비교 실행

**상태**: 대기

Ollama 실행이 완료된 노트북부터 Groq으로 다시 실행합니다. 비교를 위해 다음 조건을 유지합니다.

- 같은 입력
- 같은 프롬프트 구조
- 같은 출력 스키마
- 가능한 경우 같은 temperature 설정
- RAG에서는 같은 문서와 같은 `bge-m3` 임베딩

비교 항목은 다음과 같습니다.

- 실행 성공 여부
- 첫 응답까지 걸린 시간
- 전체 응답 시간
- 출력 형식 준수 여부
- 한국어 응답 품질
- Tools와 Agents 호출 안정성
- 로컬 컴퓨터 자원 사용량

### 단계 5. 결과 정리와 다음 학습 결정

**상태**: 대기

AI Agent가 강의별 Ollama와 Groq 결과를 정리합니다. 비교 결과만으로 모델 우열을 일반화하지 않고, 해당 노트북과 입력에서 관찰된 차이로 기록합니다.

최종 정리에는 다음 내용을 포함합니다.

- Ollama 단독 실행 가능 여부
- Groq 비교 실행 가능 여부
- Ollama 모델별 속도와 자원 부담
- Groq API 사용 시 필요한 설정
- 오류가 발생한 노트북과 재현 조건
- 다음 학습 단계에서 사용할 기본 모델

## 5. 운영 및 자원 관리

Ollama 모델은 사용 중 RAM과 CPU 또는 GPU를 사용합니다. AI Agent는 장시간 사용하지 않는 모델을 종료하여 자원을 회수할 수 있습니다.

```bash
ollama ps
ollama stop gemma4:e4b
```

다음 상황에서는 로컬 생성 모델을 중지하거나 작은 모델로 전환합니다.

- 다른 애플리케이션의 반응이 느려집니다.
- 메모리 부족 또는 시스템 스왑이 관찰됩니다.
- 응답 시간이 학습 흐름을 방해합니다.
- `bge-m3`와 생성 모델을 동시에 유지하기 어렵습니다.

## 6. 성공 기준

- Jupyter Lab 화면을 직접 조작하지 않고 AI Agent가 노트북을 실행합니다.
- Ollama가 모든 가능한 강의 실습의 기본 LLM으로 먼저 실행됩니다.
- `bge-m3` 임베딩을 사용하는 03번과 06번 실습이 실행됩니다.
- Groq이 같은 실습의 보조 비교 경로로 실행됩니다.
- API 키가 문서, 로그, Git diff에 노출되지 않습니다.
- 실패한 단계는 숨기지 않고 오류 문자열과 다음 조치를 기록합니다.
- Ollama와 Groq의 비교 결과가 같은 입력 기준으로 정리됩니다.

## 7. 참고 자료

- [강의 저장소](https://github.com/pandas-studio/langchain-basic-course)
- [강의 환경 설정](https://github.com/pandas-studio/langchain-basic-course/blob/main/SETUP.md)
- [Ollama macOS 문서](https://docs.ollama.com/macos)
- [Ollama FAQ](https://docs.ollama.com/faq)
- [Groq API 콘솔](https://console.groq.com/keys)


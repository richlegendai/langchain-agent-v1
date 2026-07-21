# LangChain Agent v1

Python과 Jupyter 기반으로 LLM 애플리케이션 패턴을 확인하는 프로젝트입니다. 직접 SDK 호출부터 LangChain Core, LCEL, 구조화 출력, Tools, Agents, RAG까지 하나의 저장소에서 실행할 수 있습니다.

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![LangChain](https://img.shields.io/badge/LangChain-v1.0%2B-green.svg)](https://python.langchain.com/)

## 프로젝트 구성

| 번호 | 파일 | 주요 내용 |
| --- | --- | --- |
| 01 | `[LLM]_01_GenAI_Intro.ipynb` | OpenAI SDK 기반 LLM 호출, 멀티턴 대화, JSON 출력 |
| 02 | `[LLM]_02_LangChain_Core_LCEL.ipynb` | LangChain Core, LCEL, Runnable, Streaming, Batch |
| 03 | `[LLM]_03_Prompt_Structured_Output.ipynb` | 프롬프트 설계, 예시 선택, Pydantic 기반 구조화 출력 |
| 04 | `[LLM]_04_Tools.ipynb` | `@tool`, `bind_tools`, ReAct 루프, Tavily 검색 |
| 05 | `[LLM]_05_Agents.ipynb` | `create_agent`, 상태 관리, 메모리, 구조화 출력 |
| 06 | `[LLM]_06_RAG_Data_Pipeline.ipynb` | 문서 분할, 임베딩, FAISS, LCEL 기반 RAG |

## 요구사항

- Python 3.10 이상 3.13 미만
- `uv` 또는 Python 가상환경과 `pip`
- Jupyter와 `ipykernel`
- 사용하는 모델 제공자의 API 키
- 03번과 06번에서 로컬 임베딩을 사용하려면 Ollama와 `bge-m3`
- 04번의 웹 검색 예제를 실행하려면 Tavily API 키

## 시작하기

```bash
git clone https://github.com/richlegendai/langchain-agent-v1.git
cd langchain-agent-v1

uv sync
cp .env.example .env
uv run jupyter lab
```

`uv`를 사용하지 않는 경우에는 다음 순서로 실행합니다.

```bash
python3 -m venv .venv
source .venv/bin/activate     # macOS / Linux
# .venv\Scripts\activate      # Windows
pip install -r requirements.txt
jupyter lab
```

환경 변수와 모델 준비 방법은 [`SETUP.md`](./SETUP.md)에 정리되어 있습니다.

## 환경 변수

`.env.example`을 `.env`로 복사한 뒤, 실행할 노트북에 필요한 값만 설정합니다.

| 변수 | 사용처 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI SDK 및 OpenAI 모델 |
| `GOOGLE_API_KEY` | Google Generative AI 모델 |
| `GROQ_API_KEY` | Groq 모델 |
| `TAVILY_API_KEY` | 웹 검색 도구 |
| `LANGSMITH_API_KEY` | 선택적 실행 추적 |

Ollama는 로컬 서비스로 실행되므로 별도의 API 키가 필요하지 않습니다.

## 기술 구성

- Python 3.10 이상 3.13 미만
- LangChain 1.x
- LangGraph 1.x
- Jupyter Notebook
- Pydantic
- FAISS
- Ollama 임베딩 모델 `bge-m3`
- Tavily 검색 도구

주요 의존성은 [`pyproject.toml`](./pyproject.toml)과 [`requirements.txt`](./requirements.txt)에서 관리합니다.

## 실행 순서

노트북은 다음 순서로 확인할 수 있습니다.

1. SDK 직접 호출과 메시지 구조 확인
2. LangChain Core와 LCEL 조합 확인
3. 프롬프트와 구조화 출력 구성
4. Tools와 외부 검색 연결
5. Agents와 상태 관리 구성
6. 문서 검색과 RAG 파이프라인 구성

각 노트북은 독립적으로 실행할 수 있지만, 앞 번호의 개념을 알고 있으면 뒤의 구조를 이해하기 쉽습니다.

## 개발 점검

의존성을 설치한 뒤 Ruff로 Python 파일과 노트북 관련 코드를 점검할 수 있습니다.

```bash
uv run ruff check .
```

API 키와 로컬 설정 파일은 커밋하지 않습니다. `.env`는 `.gitignore`에 포함되어 있습니다.

## 라이선스

이 저장소는 CC BY-NC-ND 4.0 라이선스를 따릅니다. 사용 조건은 [`LICENSE`](./LICENSE)와 [`NOTICE.md`](./NOTICE.md)를 확인하세요.

## 이슈

코드 오류나 실행 문제는 GitHub Issues에 재현 방법, 사용한 Python 버전, 실행한 노트북 번호와 함께 남겨주세요.

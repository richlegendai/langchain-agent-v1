# 환경 설정

이 문서는 프로젝트를 로컬에서 실행하기 위한 Python, Jupyter, 모델과 환경 변수 설정을 설명합니다.

## 1. Python 확인

Python 3.10 이상 3.13 미만 버전을 사용합니다.

```bash
python3 --version
```

macOS에서는 Homebrew를 사용할 수 있습니다.

```bash
brew install python@3.12
```

## 2. 의존성 설치

### uv 사용

```bash
uv sync
```

### pip 사용

```bash
python3 -m venv .venv
source .venv/bin/activate     # macOS / Linux
# .venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

Jupyter에서 사용할 커널을 등록합니다.

```bash
# uv
uv run python -m ipykernel install --user --name=langchain-agent-v1

# pip
python -m ipykernel install --user --name=langchain-agent-v1
```

VS Code 또는 Jupyter Lab에서 `langchain-agent-v1` 커널을 선택합니다.

## 3. 모델 제공자 설정

노트북에서 사용할 모델 제공자의 키를 하나 이상 설정합니다.

### Google Gemini

1. <https://aistudio.google.com/apikey>에서 API 키를 생성합니다.
2. `.env`의 `GOOGLE_API_KEY`에 키를 입력합니다.

### Groq

1. <https://console.groq.com/keys>에서 API 키를 생성합니다.
2. `.env`의 `GROQ_API_KEY`에 키를 입력합니다.

### OpenAI

1. <https://platform.openai.com/api-keys>에서 API 키를 생성합니다.
2. `.env`의 `OPENAI_API_KEY`에 키를 입력합니다.

### Ollama

Ollama를 설치하면 모델을 로컬에서 실행할 수 있습니다.

1. <https://ollama.com>에서 운영체제에 맞는 버전을 설치합니다.
2. 필요한 모델을 내려받습니다.

```bash
ollama pull gemma4:e2b
ollama pull bge-m3
```

`bge-m3`는 03번과 06번의 임베딩에 사용합니다. Ollama는 기본적으로 `http://localhost:11434`에서 실행됩니다.

설치된 모델은 다음 명령으로 확인합니다.

```bash
ollama list
```

### Tavily

04번의 웹 검색 예제를 사용하려면 <https://app.tavily.com>에서 API 키를 생성한 뒤 `.env`의 `TAVILY_API_KEY`에 입력합니다.

## 4. `.env` 작성

프로젝트 루트에서 예시 파일을 복사합니다.

```bash
cp .env.example .env
```

사용할 값만 입력합니다.

```env
GOOGLE_API_KEY=
GROQ_API_KEY=
OPENAI_API_KEY=
TAVILY_API_KEY=
```

`.env`에는 비밀값을 저장하므로 Git에 추가하지 않습니다.

## 5. Jupyter 실행

```bash
# uv
uv run jupyter lab

# pip
jupyter lab
```

프로젝트 루트의 노트북을 번호 순서대로 열어 실행합니다.

## 6. 문제 해결

### `OPENAI_API_KEY`가 설정되지 않았습니다

01번 노트북은 OpenAI SDK 인터페이스로 Gemini, OpenAI 또는 Ollama를 호출합니다. Ollama를 사용할 때는 API 키 없이 Ollama가 실행 중인지 확인하고 `gemma4:e2b` 모델을 사용합니다.

### `ModuleNotFoundError: No module named 'dotenv'`

가상환경이 활성화되어 있는지 확인한 뒤 의존성을 다시 설치합니다.

```bash
uv sync
# 또는
pip install -r requirements.txt
```

### Ollama 모델을 찾을 수 없습니다

모델 이름과 설치 상태를 확인합니다.

```bash
ollama list
ollama pull gemma4:e2b
ollama pull bge-m3
```

### 임베딩 호출이 실패합니다

Ollama가 실행 중인지 확인하고, `bge-m3`가 설치되어 있는지 확인합니다.

```bash
ollama serve
ollama list
```

### `faiss-cpu` 설치가 실패합니다

Python 3.11 또는 3.12 가상환경에서 다시 설치해 봅니다.

```bash
uv venv --python=3.12
uv sync
```

## 7. 실행 확인

설치 후 다음 명령으로 기본 정적 점검을 실행합니다.

```bash
uv run ruff check .
```

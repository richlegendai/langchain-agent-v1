# Agents Project

## 프로젝트 개요

- 프로젝트명: LangChain Agent v1
- 설명: Ollama 기반 LangChain 학습 및 실습 프로젝트
- 주요 기술 스택: Python 3.12, LangChain, Ollama, Jupyter

## 현재 작업 상태

| 상태 | 작업 | 날짜 |
|------|------|------|
| 진행 중 | LCEL 노트북 Python 스크립트 변환 | 2026-07-22 |

## AI 실수 방지 메모

| 날짜 | 실수 내용 | 올바른 방법 | 재발 방지 규칙 |
|------|-----------|-------------|----------------|
| 2026-07-22 | `project/02_lcel.py:29`에서 `BaseMessage`를 `langchain.messages`에서 가져와 LSP 오류가 발생했다. | `BaseMessage`는 `langchain_core.messages`에서 가져온다. | LangChain 메시지 타입을 추가한 직후 LSP 진단으로 실제 공개 경로인지 확인한다. |

# %% [markdown]
# <!-- VIDEO: 1 / Tool Calling — LLM에 외부 기능 연결 -->
#
# # 04. Tools — LLM에 외부 기능 연결하기
#
# > **학습 목표**
# > 1. LLM이 도구를 필요로 하는 상황과 그 이유를 이해한다.
# > 2. `@tool` 데코레이터로 파이썬 함수를 LLM 도구로 변환한다 (docstring과 타입 힌트 활용).
# > 3. `bind_tools()`로 모델에 도구를 등록하고 `tool_calls` 응답을 해석한다.
# > 4. **수동 tool-calling 루프**(Reason → Act → Observe)를 직접 구현한다 — 05번 ReAct의 기초.
# > 5. **Tavily 웹검색 API** 통합과 키 미보유 시 동작하는 폴백 시뮬레이션을 적용한다.
# >
# > **선수 지식**: 02번 (LCEL), 03번 (Pydantic 구조화 출력).
#
# ---
#
# ## 도구(Tool)가 필요한 이유
#
# LLM은 텍스트 생성 능력이 뛰어나지만, 다음과 같은 작업은 자체적으로 수행할 수 없습니다.
#
# | LLM이 자체 수행 가능 | LLM이 외부 도구를 필요로 하는 작업 |
# |---------------------|---------------------------------|
# | 글 작성, 요약, 번역, 분류 | 실시간 정보 조회 (예: 현재 날씨, 환율) |
# | 일반 상식 추론 | 데이터베이스 조회, 외부 API 호출, 파일 입출력 |
# | 코드 설명 및 작성 | 외부 시스템과의 메시지 송수신 (Slack, 이메일 등) |
# | 간단한 산술 추정 | 정확한 수치 연산 (LLM은 산술에서 오류율이 높음) |
#
# **도구(Tool)** 는 LLM이 "이 작업을 수행해 달라"고 요청했을 때, 실제로 코드가 실행되어 결과를 반환하는 함수입니다. 도구를 통해 LLM은 학습 시점 이후의 정보 조회, 외부 시스템 연동, 결정적 연산 등 자체 능력의 한계를 보완할 수 있습니다.
#
# > 본 노트북에서 직접 구현하는 **수동 tool-calling 루프**는 05번 노트북의 `create_agent`가 내부적으로 수행하는 처리 흐름과 동일합니다. 추상화된 인터페이스의 동작 원리를 직접 구현해 봄으로써 에이전트의 내부 메커니즘을 명확히 이해할 수 있습니다.

# %% [markdown]
# ---
#
# ## 1. 환경 설정
#
# 본 노트북에는 **Tavily 웹검색 API**를 사용하는 섹션이 포함되어 있습니다. `.env` 파일에 `TAVILY_API_KEY`가 설정된 경우 실제 API를 호출하며, 키가 없는 경우 자동으로 **폴백 시뮬레이션 함수**로 대체되어 네트워크 연결 없이도 동일한 흐름으로 진행할 수 있습니다.

# %%
from dotenv import load_dotenv
load_dotenv()

from langchain.chat_models import init_chat_model

import os
TAVILY_OK = bool(os.getenv("TAVILY_API_KEY"))
print(f"TAVILY_API_KEY 설정: {'✓' if TAVILY_OK else '✗ (폴백 시뮬레이션 사용)'}")

# ✅ Option 1: Google Gemini 2.5 Flash-Lite — thinking_budget=0 으로 추론 토큰 비활성화
# llm = init_chat_model("google_genai:gemini-2.5-flash-lite", temperature=0,
#                        model_kwargs={"thinking_budget": 0})

# ✅ Option 2: Groq Qwen3 32B — reasoning_effort="none" 으로 <think> 토큰 비활성화
llm = init_chat_model("groq:qwen/qwen3.6-27b", temperature=0, reasoning_effort="none")

# ✅ Option 3: Ollama Gemma 4 E4B (로컬) — reasoning=False 으로 <think> 토큰 비활성화
# llm = init_chat_model("ollama:gemma4:e2b", temperature=0, reasoning=False)

# ⚙️ Option 4: OpenAI (유료) — reasoning 토큰 없음, 추가 파라미터 불필요
# llm = init_chat_model("openai:gpt-4.1-mini", temperature=0)

print("✅ LLM 준비 완료")

# %% [markdown]
# ## 2. `@tool` 데코레이터 — 가장 단순한 도구 정의
#
# LangChain의 `@tool` 데코레이터를 사용하면 일반 파이썬 함수를 LLM이 호출 가능한 도구로 변환할 수 있습니다.
#
# **작성 규칙**
#
# 1. **docstring**: 도구의 용도를 기술합니다. LLM이 어떤 상황에서 이 도구를 호출할지 판단하는 핵심 근거가 됩니다.
# 2. **타입 힌트**: 파라미터의 JSON 스키마로 자동 변환됩니다.
# 3. **반환값**: `str`, `dict`, `list` 등 JSON 직렬화 가능한 형태를 권장합니다.

# %%
from langchain.tools import tool

@tool
def get_schedule(date: str) -> list[dict]:
    """주어진 날짜(YYYY-MM-DD 형식)의 사내 일정 목록을 조회합니다.

    예: get_schedule("2026-04-15")
    """
    # 실제 HR/캘린더 시스템 대신 하드코딩된 시뮬레이션
    fake_db = {
        "2026-04-15": [
            {"time": "10:00", "title": "주간 팀 스탠드업", "room": "회의실 A"},
            {"time": "14:00", "title": "고객 데모 미팅", "room": "Zoom"},
        ],
        "2026-04-16": [
            {"time": "09:30", "title": "분기 OKR 리뷰", "room": "대회의실"},
        ],
    }
    return fake_db.get(date, [])

# 도구의 메타데이터 확인
print("이름:", get_schedule.name)
print("설명:", get_schedule.description)
print("인자 스키마:")
import json
print(json.dumps(get_schedule.args_schema.model_json_schema(), ensure_ascii=False, indent=2))

# %% [markdown]
# 도구를 코드에서 직접 실행할 때는 `.invoke()` 메서드를 사용합니다. 동일한 인터페이스가 LCEL 체인의 다른 컴포넌트와 일관되게 적용됩니다.

# %%
result = get_schedule.invoke({"date": "2026-04-15"})
print(result)

# %% [markdown]
# ## 3. 사내 업무용 시뮬레이션 도구 세트
#
# `hr_manual.md`와 `it_guide.md`의 사내 규정을 반영한 도구 세트를 정의합니다. 모두 네트워크 연결 없이 하드코딩된 데이터로 동작하므로, 실행 중 외부 의존성으로 인한 오류 가능성이 없습니다.

# %%
from datetime import date, datetime
import random

@tool
def calc_leave_days(start: str, end: str) -> dict:
    """휴가 시작일과 종료일 사이의 영업일 기준 휴가 일수를 계산합니다.
    날짜는 YYYY-MM-DD 형식입니다. 주말은 자동 제외됩니다."""
    d1 = datetime.strptime(start, "%Y-%m-%d").date()
    d2 = datetime.strptime(end, "%Y-%m-%d").date()
    if d2 < d1:
        return {"error": "종료일이 시작일보다 빠릅니다"}
    days = 0
    cur = d1
    while cur <= d2:
        if cur.weekday() < 5:  # 0-4 = 월~금
            days += 1
        cur = date.fromordinal(cur.toordinal() + 1)
    return {"start": start, "end": end, "business_days": days}


@tool
def get_leave_balance(employee_id: str) -> dict:
    """사원의 잔여 연차 일수를 조회합니다. employee_id 예: 'E12345'"""
    # 사번 → 잔여 일수 (하드코딩 시뮬레이션)
    balances = {
        "E12345": 12.5,
        "E67890": 7.0,
        "E11111": 15.0,
    }
    balance = balances.get(employee_id, 10.0)
    return {"employee_id": employee_id, "remaining_days": balance}


@tool
def send_notification(channel: str, message: str) -> dict:
    """지정된 Slack 채널로 공지/알림을 발송합니다 (시뮬레이션).
    channel 예: '#team-dev', '#announcements'"""
    print(f"  [📢 SENT] {channel}: {message}")
    return {"status": "sent", "channel": channel, "length": len(message)}


@tool
def search_it_ticket(keyword: str) -> list[dict]:
    """사내 IT 헬프데스크 티켓을 키워드로 검색합니다."""
    tickets = [
        {"id": "IT-2301", "title": "VPN 접속 불가 — FortiClient 재설치", "status": "resolved"},
        {"id": "IT-2345", "title": "노트북 SSD 교체 요청", "status": "in_progress"},
        {"id": "IT-2389", "title": "OTP 앱 재등록", "status": "resolved"},
        {"id": "IT-2401", "title": "VPN 속도 저하 — 해외 리전", "status": "open"},
    ]
    kw = keyword.lower()
    return [t for t in tickets if kw in t["title"].lower()]


# 도구 레지스트리
workplace_tools = [get_schedule, calc_leave_days, get_leave_balance, send_notification, search_it_ticket]
print(f"정의된 사내 업무 도구: {len(workplace_tools)}개")
for t in workplace_tools:
    print(f"  - {t.name}: {t.description.splitlines()[0]}")

# %% [markdown]
# <!-- VIDEO: 2 / Tavily 웹검색 + 폴백 시뮬레이션 -->
#
# ## 4. 외부 API 도구 — Tavily 웹검색
#
# **Tavily**는 LLM 에이전트의 사용 사례에 최적화된 웹검색 API로, 최신 정보 조회에 활용됩니다. LangChain v1.0에서는 `langchain-tavily` 패키지의 `TavilySearch` 클래스 사용이 권장됩니다.
#
# `.env`에 `TAVILY_API_KEY`가 없는 경우, 자동으로 정형화된 가짜 응답을 반환하는 **폴백 도구**로 대체됩니다. 따라서 키가 없어도 본 노트북의 모든 흐름을 동일하게 진행할 수 있습니다.

# %%
if TAVILY_OK:
    from langchain_tavily import TavilySearch
    web_search = TavilySearch(max_results=3, topic="general")
    print("✓ 실제 Tavily 웹검색 도구 활성화")
else:
    @tool
    def web_search(query: str) -> list[dict]:
        """웹을 검색하여 최신 정보를 가져옵니다 (폴백 시뮬레이션)."""
        return [
            {"title": f"(mock) {query} 관련 기사 1", "url": "https://example.com/1",
             "content": f"'{query}' 에 대한 모의 검색 결과입니다. TAVILY_API_KEY 를 설정하면 실제 검색이 됩니다."},
            {"title": f"(mock) {query} 관련 자료 2", "url": "https://example.com/2",
             "content": "두 번째 모의 결과."},
        ]
    print("⚠ 폴백 시뮬레이션 web_search 사용 중")

print("\n이름:", web_search.name)
print("설명:", (web_search.description or "").strip()[:100], "...")

# %%
# 웹검색 테스트 (Tavily 또는 폴백)
result = web_search.invoke({"query": "LangChain v1.0 create_agent"})
print(type(result).__name__)
# Tavily 응답은 dict, 폴백은 list
import json
print(json.dumps(result, ensure_ascii=False, indent=2)[:500], "...")

# %% [markdown]
# <!-- VIDEO: 3 / bind_tools와 tool_calls — 모델 응답 직접 처리 -->
#
# ## 5. `bind_tools` — 모델에 도구 등록
#
# `llm.bind_tools([...])`는 모델이 응답 시 **도구 호출 스키마를 인식하고 활용할 수 있도록** 도구 목록을 모델에 결합합니다. 다만 이 메서드는 **도구를 직접 실행하지 않습니다**. 모델은 "이 도구를 다음 인자로 호출해 달라"는 요청만 반환하며, 실제 실행은 호출 측 코드의 책임입니다.
#
# ### Tool Calling 처리 흐름
#
# ```mermaid
# flowchart TD
#     IN(["💬 사용자 질문"]):::input
#     LLM["🤖 LLM<br/>bind_tools 등록<br/>도구 호출 필요 여부 판단"]:::node
#     TOOL["⚙️ 호출 측 코드<br/>tool.invoke 실행"]:::node
#     OUT(["✅ 최종 답변"]):::output
#
#     IN --> LLM
#     LLM -->|"tool_calls 있음"| TOOL
#     TOOL -->|"ToolMessage 반환"| LLM
#     LLM -->|"tool_calls 없음"| OUT
#
#     classDef input  fill:#4f46e5,stroke:#3730a3,color:#fff
#     classDef node   fill:#1e293b,stroke:#475569,color:#e2e8f0
#     classDef output fill:#059669,stroke:#047857,color:#fff
# ```
#
# 이 처리 사이클이 **ReAct(Reason → Act → Observe) 패턴**의 기본 구조이며, 05번 노트북에서 본격적으로 다룹니다.

# %%
# 모든 도구를 한 번에 연결
all_tools = workplace_tools + [web_search]
llm_with_tools = llm.bind_tools(all_tools)

# LLM에게 도구가 필요한 질문을 던져본다
response = llm_with_tools.invoke("2026년 4월 15일 내 일정 알려줘")

print("content:", repr(response.content))  # 빈 문자열일 수 있음 (도구 호출만 할 때)
print("tool_calls:", response.tool_calls)

# %% [markdown]
# ### 응답 객체 관찰
#
# 도구 호출이 발생하면 응답 객체에서 다음 두 가지 변화를 확인할 수 있습니다.
#
# - `response.content`: 빈 문자열(`""`).
# - `response.tool_calls`: 모델이 실행 요청한 도구의 이름과 인자 목록.
#
# ```python
# [{'name': 'get_schedule', 'args': {'date': '2026-04-15'}, 'id': '...', 'type': 'tool_call'}]
# ```
#
# 즉, 모델은 실행 요청만 생성하며, 실제 도구 실행은 호출 측 코드에서 직접 수행해야 합니다.

# %% [markdown]
# <!-- VIDEO: 4 / 수동 ReAct 루프 + 다음 단계 미리보기 -->
#
# ## 6. 수동 Tool-Calling 루프 구현
#
# 에이전트의 내부 동작 원리를 이해하기 위해 ReAct 루프를 직접 구현해 봅니다. 본 절에서 작성하는 루프는 다음 노트북에서 사용할 `create_agent`가 내부적으로 수행하는 처리 흐름과 동일합니다.

# %%
from langchain.messages import HumanMessage, ToolMessage

tool_map = {t.name: t for t in all_tools}

def run_tool_loop(user_query: str, max_iter: int = 5, verbose: bool = True):
    messages = [HumanMessage(content=user_query)]

    for step in range(max_iter):
        ai = llm_with_tools.invoke(messages)
        messages.append(ai)

        # 더 이상 도구 호출이 없으면 종료
        if not ai.tool_calls:
            if verbose:
                print(f"\n[step {step+1}] FINAL ANSWER")
            return ai.content

        # 도구 호출 실행
        for tc in ai.tool_calls:
            name = tc["name"]
            args = tc["args"]
            if verbose:
                print(f"[step {step+1}] 🔧 {name}({args})")
            try:
                result = tool_map[name].invoke(args)
            except Exception as e:
                result = f"Error: {e}"
            messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

    return "(max iterations reached)"


answer = run_tool_loop("2026년 4월 15일 내 일정을 알려줘")
print("\n=== 최종 답변 ===")
print(answer)

# %% [markdown]
# ### 복합 질문 테스트
#
# 여러 도구를 조합해야 답변 가능한 질문을 입력하여, 모델이 단계별로 도구를 호출하고 결과를 종합하는 과정을 확인합니다.

# %%
answer = run_tool_loop(
    "사번 E12345 인 직원이 2026-04-20부터 2026-04-24까지 휴가를 쓰면 잔여 일수가 얼마나 남을까요?"
)
print("\n=== 최종 답변 ===")
print(answer)

# %%
# 웹검색 + 사내 공지를 조합하는 질문
answer = run_tool_loop(
    "LangChain v1.0 의 주요 변경점을 웹에서 찾아 요약한 뒤, #team-dev 채널에 공지를 발송해주세요."
)
print("\n=== 최종 답변 ===")
print(answer)

# %% [markdown]
# ## 7. 수동 루프 구현의 한계
#
# 위 수동 루프는 정상적으로 동작하지만, 실무 적용 시 다음과 같은 부담이 발생합니다.
#
# - **루프 제어**: 재시도 정책, 최대 반복 횟수, 종료 조건 등을 직접 구현해야 합니다.
# - **스트리밍 구현**: 중간 도구 호출 결과를 실시간으로 사용자에게 노출하려면 별도의 코드가 필요합니다.
# - **메모리 및 체크포인트**: 멀티턴 대화에서 메시지 이력을 직접 관리해야 합니다.
# - **예외 처리, 재시도, 가드레일**: 모두 호출 측 코드에서 구현해야 합니다.
#
# 다음 노트북에서는 위 작업들을 `create_agent(...)` 단일 호출로 대체하고, 미들웨어, 메모리, 스트리밍, 구조화 출력 등의 부가 기능을 결합하는 방법을 다룹니다.

# %% [markdown]
# ---
#
# ## 실습 과제: 사용자 정의 도구 추가
#
# **요구사항**
#
# 1. 다음 두 도구를 `@tool` 데코레이터로 정의합니다.
#    - `get_weather(city: str) -> dict`: 주어진 도시의 날씨를 반환합니다 (하드코딩 시뮬레이션).
#    - `convert_currency(amount: float, from_cur: str, to_cur: str) -> dict`: 환율 변환을 수행합니다 (고정 환율 사용).
# 2. 정의한 두 도구를 포함하여 `llm.bind_tools([...])`를 호출하고, `run_tool_loop`로 다음 질문에 응답하도록 합니다.
#    - "서울 날씨 알려주고, 100달러는 한화로 얼마인지 계산해줘"
# 3. 두 도구가 모두 호출되는지 실행 로그에서 확인합니다.

# %%
# 여기에 코드를 작성하세요
# Hint:
# @tool
# def get_weather(city: str) -> dict:
#     """도시의 현재 날씨를 알려줍니다."""
#     weather_db = {"서울": {"temp": 18, "condition": "맑음"}, ...}
#     return weather_db.get(city, {"error": "정보 없음"})


# %% [markdown]
# <details>
# <summary>모범 답안 보기</summary>
#
# ```python
# @tool
# def get_weather(city: str) -> dict:
#     """주어진 도시의 현재 날씨를 조회합니다."""
#     db = {
#         "서울": {"temp_c": 18, "condition": "맑음", "humidity": 45},
#         "부산": {"temp_c": 22, "condition": "흐림", "humidity": 65},
#         "뉴욕": {"temp_c": 12, "condition": "비", "humidity": 80},
#     }
#     return db.get(city, {"error": f"{city} 정보 없음"})
#
# @tool
# def convert_currency(amount: float, from_cur: str, to_cur: str) -> dict:
#     """통화 변환. 지원: USD, KRW, EUR, JPY."""
#     rates_to_krw = {"USD": 1380.0, "EUR": 1485.0, "JPY": 9.15, "KRW": 1.0}
#     if from_cur not in rates_to_krw or to_cur not in rates_to_krw:
#         return {"error": "지원하지 않는 통화"}
#     krw = amount * rates_to_krw[from_cur]
#     result = krw / rates_to_krw[to_cur]
#     return {"amount": amount, "from": from_cur, "to": to_cur, "result": round(result, 2)}
#
# new_tools = workplace_tools + [web_search, get_weather, convert_currency]
# llm_with_tools = llm.bind_tools(new_tools)
# tool_map = {t.name: t for t in new_tools}
#
# answer = run_tool_loop("서울 날씨 알려주고, 100달러는 한화로 얼마인지 계산해줘")
# print(answer)
# ```
#
# </details>

# %% [markdown]
# ---
#
# ## 트러블슈팅
#
# | 증상 | 원인 | 해결 방법 |
# |---|---|---|
# | `tool_calls`가 항상 비어 있음 | 모델이 도구 사용을 인식하지 못함 | 모델 변경 (Qwen3 또는 Gemini Flash 권장), docstring 명확화 |
# | 도구가 잘못된 인자로 호출됨 | 타입 힌트 정보 부족 | `Annotated[str, "...설명..."]` 또는 Pydantic 모델 사용 |
# | Tavily 응답 형식 불일치 | 버전별 응답 구조 차이 | `langchain-tavily>=0.1.0` 사용, `result["results"]`로 접근 |
# | 최대 반복 횟수 초과 (무한 루프) | 모델이 동일 도구를 반복 호출 | 시스템 프롬프트에 "이미 호출한 도구는 중복 호출 금지" 추가 |
# | Ollama 로컬 모델의 도구 호출 실패 | 일부 로컬 모델의 도구 호출 정확도 부족 | Gemini 또는 Groq Qwen3로 전환 |
#
# ```python
# # 예외 처리를 포함한 안전한 도구 호출
# try:
#     result = tool_map[name].invoke(args)
# except Exception as e:
#     result = {"error": f"{type(e).__name__}: {e}"}
#     # ToolMessage로 LLM에 에러를 전달하면 LLM이 대안적 접근을 시도할 수 있습니다.
# ```
#
# ---
#
# ## 마무리
#
# 본 노트북에서 학습한 내용은 다음과 같습니다.
#
# - LLM이 자체적으로 수행할 수 없는 작업과 도구의 필요성
# - `@tool` 데코레이터를 통한 함수의 도구화 (docstring과 타입 힌트 기반 스키마)
# - `bind_tools`와 `tool_calls`의 역할 분담 (모델은 요청 생성, 호출 측은 실행)
# - 수동 ReAct 루프(Reason → Act → Observe)의 직접 구현
# - Tavily 웹검색 API 통합 및 폴백 시뮬레이션 패턴
# - 사내 업무용 시뮬레이션 도구 세트 (HR, IT, 캘린더, Slack)
#
# ### 다음 노트북(05번) 예고
#
# 본 노트북의 수동 루프는 정상 동작하지만 재시도, 메모리, 스트리밍, 가드레일 등의 처리를 모두 직접 구현해야 합니다. 다음 노트북에서는 이러한 작업을 `create_agent(...)` 단일 호출로 대체하는 방법을 다룹니다.



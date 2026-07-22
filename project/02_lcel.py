#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = [
#     "langchain>=1.2.0",
#     "langchain-core>=1.3.0",
#     "langchain-ollama>=1.1.0",
#     "python-dotenv>=1.0.0",
# ]
# ///

# ─── How to run ───
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run all examples:
#      uv run project/02_lcel.py
# 3. Or make executable and run:
#      chmod +x project/02_lcel.py && ./project/02_lcel.py
# ──────────────────

from __future__ import annotations

import os
from collections.abc import Callable
from typing import Final

from dotenv import load_dotenv
from langchain.chat_models import BaseChatModel, init_chat_model
from langchain.messages import HumanMessage, SystemMessage
from langchain_core.messages import BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import (
    RunnableLambda,
    RunnableParallel,
    RunnablePassthrough,
)

MODEL_NAME: Final = "ollama:gemma4:e2b"
TEMPERATURE: Final = 0.3


def _create_model() -> BaseChatModel:
    return init_chat_model(MODEL_NAME, temperature=TEMPERATURE)


def _create_office_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", "당신은 {role} 입니다. 친절하고 전문적으로 답변하세요."),
            ("human", "{question}"),
        ]
    )


def _create_it_messages() -> list[BaseMessage]:
    return [
        SystemMessage(content="당신은 사내 IT 도우미입니다. 간결하게 답하세요."),
        HumanMessage(content="VPN 연결이 자꾸 끊기는데 어떻게 해야 하나요?"),
    ]


def _shorten(text: str, max_length: int = 80) -> str:
    if len(text) <= max_length:
        return text
    return f"{text[:max_length]} ..."


def example_01() -> None:
    _ = load_dotenv()
    print(
        "키 감지:",
        "Gemini" if os.getenv("GOOGLE_API_KEY") else "없음",
        "Groq" if os.getenv("GROQ_API_KEY") else "없음",
        "OpenAI" if os.getenv("OPENAI_API_KEY") else "없음",
    )


def example_02() -> None:
    print(_create_model())


def example_03() -> None:
    response = _create_model().invoke(
        "LangChain v1.0의 핵심 철학을 한 문장으로 설명하세요."
    )
    print(response.text)


def example_04() -> None:
    response = _create_model().invoke(
        "LangChain v1.0의 핵심 철학을 한 문장으로 설명하세요."
    )
    print(response)


def example_05() -> None:
    reply = _create_model().invoke(_create_it_messages())
    print(reply.text)
    print("\n메시지 타입:", type(reply).__name__)


def example_06() -> None:
    reply = _create_model().invoke(_create_it_messages())
    print("content:", reply.text[:80], "...")
    print("usage_metadata:", reply.usage_metadata)
    print("response_metadata:", reply.response_metadata)


def example_07() -> None:
    filled = _create_office_prompt().invoke(
        {
            "role": "ABC 사내 HR 도우미",
            "question": "연차 사용은 며칠 전까지 신청해야 하나요?",
        }
    )
    print(filled)


def example_08() -> None:
    filled = _create_office_prompt().invoke(
        {
            "role": "ABC 사내 HR 도우미",
            "question": "연차 사용은 며칠 전까지 신청해야 하나요?",
        }
    )
    for message in filled.to_messages():
        message.pretty_print()


def example_09() -> None:
    reply = _create_model().invoke(_create_it_messages())
    text = StrOutputParser().invoke(reply)
    print(type(text), "\n", text[:80], "...")


def example_10() -> None:
    chain = _create_office_prompt() | _create_model() | StrOutputParser()
    answer = chain.invoke(
        {
            "role": "ABC HR 도우미",
            "question": "연차는 언제까지 신청해야 하나요?",
        }
    )
    print(answer)


def example_11() -> None:
    chain = _create_office_prompt() | _create_model() | StrOutputParser()
    for chunk in chain.stream(
        {
            "role": "ABC IT 도우미",
            "question": "비밀번호 정책을 한 문단으로 알려주세요.",
        }
    ):
        print(chunk, end="", flush=True)
    print()


def example_12() -> None:
    chain = _create_office_prompt() | _create_model() | StrOutputParser()
    results = chain.batch(
        [
            {"role": "HR 도우미", "question": "경조사 휴가 일수를 알려주세요."},
            {"role": "IT 도우미", "question": "VPN 접속 방법은?"},
            {"role": "재무 도우미", "question": "출장비는 얼마까지 지원되나요?"},
        ]
    )
    for number, result in enumerate(results, 1):
        print(f"[{number}] {result[:60]}...")


def example_13() -> None:
    model = _create_model()
    parser = StrOutputParser()
    pro_prompt = ChatPromptTemplate.from_messages(
        [("system", "긍정적 관점으로 답하세요."), ("human", "{q}")]
    )
    con_prompt = ChatPromptTemplate.from_messages(
        [("system", "비판적 관점으로 답하세요."), ("human", "{q}")]
    )
    debate = RunnableParallel(
        question=RunnablePassthrough(),
        pros=pro_prompt | model | parser,
        cons=con_prompt | model | parser,
    )
    result = debate.invoke({"q": "재택근무를 전면 도입하는 것은 좋은가?"})
    print("PROS:", result["pros"][:100], "...")
    print("CONS:", result["cons"][:100], "...")


def example_14() -> None:
    prompt = ChatPromptTemplate.from_messages(
        [("system", "한 문장으로 요약하세요."), ("human", "{text}")]
    )
    chain = prompt | _create_model() | StrOutputParser() | RunnableLambda(_shorten)
    print(
        chain.invoke(
            {
                "text": "LangChain은 LLM 기반 애플리케이션을 만들기 위한 "
                + "프레임워크로, 프롬프트 관리, 메모리, 도구 호출, 에이전트 "
                + "실행, RAG 등 여러 기능을 제공합니다."
            }
        )
    )


def example_15() -> None:
    model = _create_model()
    history: list[BaseMessage] = [SystemMessage(content="당신은 ABC IT 도우미입니다.")]

    def chat(user_message: str) -> str:
        history.append(HumanMessage(content=user_message))
        reply = model.invoke(history)
        history.append(reply)
        return reply.text

    print("User:", "안녕, 내 이름은 지훈이야.")
    print("Bot :", chat("안녕, 내 이름은 지훈이야."))
    print()
    print("User:", "내 이름을 기억해?")
    print("Bot :", chat("내 이름을 기억해?"))


def example_16() -> None:
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "당신은 한국 음식점 추천 전문가입니다. 사용자의 기분, 날씨, "
                + "예산을 보고 가장 잘 어울리는 메뉴 3개를 추천하세요. 각 메뉴마다 "
                + "이모지 1개와 한 줄 추천 이유를 붙이세요.",
            ),
            ("human", "기분: {mood}\n날씨: {weather}\n예산: {budget}원"),
        ]
    )
    chain = prompt | _create_model() | StrOutputParser()
    print(
        chain.invoke(
            {
                "mood": "축 처지는 월요일",
                "weather": "비 오고 쌀쌀함",
                "budget": "12000",
            }
        )
    )


def example_17() -> None:
    news = (
        "오늘 코스피 지수가 개장 직후 1.2% 급락하며 약세를 보였다. "
        + "외국인 투자자 순매도가 5일 연속 이어지면서 시장의 우려가 커지고 있다. "
        + "반면 일부 반도체 관련주는 AI 수요 기대감으로 강세를 보였다. "
        + "전문가들은 단기 변동성에 대비한 분산 투자를 권고하고 있다."
    )
    summary_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "다음 뉴스를 정확히 3줄로 요약하세요. 각 줄은 핵심 사실 1개만 "
                + "담습니다.",
            ),
            ("human", "{news}"),
        ]
    )
    sentiment_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "다음 뉴스의 시장 감정을 긍정, 부정, 중립 중 한 단어로 분류하고 "
                + "이유를 한 문장으로 설명하세요.",
            ),
            ("human", "{news}"),
        ]
    )
    model = _create_model()
    parser = StrOutputParser()
    analyze = RunnableParallel(
        summary=summary_prompt | model | parser,
        sentiment=sentiment_prompt | model | parser,
    )
    result = analyze.invoke({"news": news})
    print("[요약]")
    print(result["summary"])
    print("\n[감정 분석]")
    print(result["sentiment"])


EXAMPLES: Final[tuple[Callable[[], None], ...]] = (
    example_01,
    example_02,
    example_03,
    example_04,
    example_05,
    example_06,
    example_07,
    example_08,
    example_09,
    example_10,
    example_11,
    example_12,
    example_13,
    example_14,
    example_15,
    example_16,
    example_17,
)


def main() -> None:
    for number, example in enumerate(EXAMPLES, 1):
        print(f"\n===== 예제 {number:02d} =====")
        example()


if __name__ == "__main__":
    main()

from __future__ import annotations

import sys
from collections.abc import Callable

import anyio
from dotenv import load_dotenv
from pydantic import ValidationError

from review_analyzer.chains import LangChainReviewAnalyzer
from review_analyzer.models import (
    AnalysisRequest,
    ErrorInfo,
    FatalErrorEvent,
    JobFinishedEvent,
    JobStartedEvent,
)
from review_analyzer.service import ReviewAnalyzer, analyze_batch

EventWriter = Callable[[str], None]


def write_line(payload: str) -> None:
    sys.stdout.write(payload)
    sys.stdout.write("\n")
    sys.stdout.flush()


async def run_request(
    request: AnalysisRequest,
    analyzer: ReviewAnalyzer,
    writer: EventWriter = write_line,
) -> None:
    writer(
        JobStartedEvent(job_id=request.job_id, total=len(request.reviews)).model_dump_json()
    )
    succeeded_count = 0
    failed_count = 0

    async for event in analyze_batch(request, analyzer):
        writer(event.model_dump_json())
        if event.status.value == "succeeded":
            succeeded_count += 1
        else:
            failed_count += 1

    writer(
        JobFinishedEvent(
            job_id=request.job_id,
            succeeded_count=succeeded_count,
            failed_count=failed_count,
        ).model_dump_json()
    )


async def run_from_line(line: str, writer: EventWriter = write_line) -> int:
    try:
        request = AnalysisRequest.model_validate_json(line)
    except ValidationError:
        writer(
            FatalErrorEvent(
                error=ErrorInfo(
                    code="invalid_input",
                    message="분석 요청 형식이 올바르지 않습니다.",
                    retryable=False,
                )
            ).model_dump_json()
        )
        return 1

    await run_request(request, LangChainReviewAnalyzer(request.settings), writer)
    return 0


def main() -> None:
    load_dotenv(dotenv_path=".env", override=False)
    line = sys.stdin.readline()
    if not line:
        write_line(
            FatalErrorEvent(
                error=ErrorInfo(
                    code="invalid_input",
                    message="분석 요청이 없습니다.",
                    retryable=False,
                )
            ).model_dump_json()
        )
        raise SystemExit(1)
    exit_code = anyio.run(run_from_line, line)
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()

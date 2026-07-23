from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Protocol

import anyio
from anyio.streams.memory import MemoryObjectSendStream

from review_analyzer.errors import ReviewAnalysisError
from review_analyzer.models import (
    AnalysisRequest,
    ErrorInfo,
    ModelSettings,
    ReviewAnalysis,
    ReviewInput,
    ReviewResultEvent,
    ReviewStatus,
)


class ReviewAnalyzer(Protocol):
    async def analyze(
        self,
        review: ReviewInput,
        settings: ModelSettings,
    ) -> ReviewAnalysis: ...


async def _analyze_one(
    request: AnalysisRequest,
    review: ReviewInput,
    analyzer: ReviewAnalyzer,
    limiter: anyio.CapacityLimiter,
    events: MemoryObjectSendStream[ReviewResultEvent],
) -> None:
    async with events, limiter:
        try:
            analysis = await analyzer.analyze(review, request.settings)
            event = ReviewResultEvent(
                job_id=request.job_id,
                review_id=review.review_id,
                source_index=review.source_index,
                status=ReviewStatus.SUCCEEDED,
                analysis=analysis,
            )
        except ReviewAnalysisError as error:
            event = ReviewResultEvent(
                job_id=request.job_id,
                review_id=review.review_id,
                source_index=review.source_index,
                status=ReviewStatus.FAILED,
                error=ErrorInfo(
                    code=error.code,
                    message="후기 분석에 실패했습니다.",
                    retryable=error.retryable,
                ),
            )
        await events.send(event)


async def analyze_batch(
    request: AnalysisRequest,
    analyzer: ReviewAnalyzer,
) -> AsyncIterator[ReviewResultEvent]:
    send, receive = anyio.create_memory_object_stream[ReviewResultEvent](
        max_buffer_size=len(request.reviews),
    )
    limiter = anyio.CapacityLimiter(request.settings.max_concurrency)

    async with anyio.create_task_group() as task_group:
        for review in request.reviews:
            task_group.start_soon(
                _analyze_one,
                request,
                review,
                analyzer,
                limiter,
                send.clone(),
            )
        await send.aclose()
        async with receive:
            async for event in receive:
                yield event

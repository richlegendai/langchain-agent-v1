from __future__ import annotations

from dataclasses import dataclass

import anyio
import pytest

from review_analyzer.errors import ReviewAnalysisError
from review_analyzer.models import (
    CONTRACT_VERSION,
    AnalysisRequest,
    ModelSettings,
    ProviderName,
    ReplyCandidate,
    ReviewAnalysis,
    ReviewInput,
    ReviewStatus,
    Sentiment,
)
from review_analyzer.service import analyze_batch


@dataclass(frozen=True, slots=True)
class FakeAnalyzer:
    failing_review_id: str | None = None
    unexpected_review_id: str | None = None

    async def analyze(
        self,
        review: ReviewInput,
        settings: ModelSettings,
    ) -> ReviewAnalysis:
        del settings
        await anyio.sleep(0.01 if review.source_index == 0 else 0)
        if review.review_id == self.unexpected_review_id:
            raise AssertionError
        if review.review_id == self.failing_review_id:
            raise ReviewAnalysisError(
                code="provider_unavailable",
                retryable=True,
                detail="테스트 제공자 오류",
            )
        return ReviewAnalysis(
            sentiment=Sentiment.POSITIVE,
            summary=f"요약 {review.source_index}",
            key_points=("배송",),
            response_strategy=("감사를 전한다",),
            reply_candidates=(
                ReplyCandidate(
                    candidate_id="warm",
                    tone="감사 중심",
                    text="소중한 후기 감사합니다.",
                    rationale="긍정 경험에 감사하기 좋습니다.",
                ),
                ReplyCandidate(
                    candidate_id="brief",
                    tone="간결형",
                    text="후기 남겨주셔서 감사합니다.",
                    rationale="짧고 분명하게 답합니다.",
                ),
                ReplyCandidate(
                    candidate_id="care",
                    tone="관계 강화형",
                    text="다음에도 만족하실 수 있도록 노력하겠습니다.",
                    rationale="재구매 관계를 이어갑니다.",
                ),
            ),
            warnings=(),
        )


def make_request() -> AnalysisRequest:
    return AnalysisRequest(
        schema_version=CONTRACT_VERSION,
        job_id="job-1",
        settings=ModelSettings(
            provider=ProviderName.OLLAMA,
            model="gemma4:e2b",
            product_name="테스트 상품",
            max_concurrency=2,
        ),
        reviews=(
            ReviewInput(review_id="review-1", source_index=0, original_text="아주 좋아요"),
            ReviewInput(review_id="review-2", source_index=1, original_text="배송이 늦어요"),
        ),
    )


@pytest.mark.anyio
async def test_batch_emits_completed_items_before_slower_source_order() -> None:
    events = [event async for event in analyze_batch(make_request(), FakeAnalyzer())]

    assert [event.review_id for event in events] == ["review-2", "review-1"]
    assert all(event.status is ReviewStatus.SUCCEEDED for event in events)


@pytest.mark.anyio
async def test_batch_preserves_success_when_one_review_fails() -> None:
    events = [
        event
        async for event in analyze_batch(
            make_request(),
            FakeAnalyzer(failing_review_id="review-2"),
        )
    ]

    by_id = {event.review_id: event for event in events}
    assert by_id["review-1"].status is ReviewStatus.SUCCEEDED
    assert by_id["review-2"].status is ReviewStatus.FAILED
    assert by_id["review-2"].error is not None
    assert by_id["review-2"].error.retryable is True


@pytest.mark.anyio
async def test_batch_propagates_unexpected_analyzer_errors() -> None:
    with pytest.RaisesGroup(
        pytest.RaisesExc(AssertionError),
    ):
        _ = [
            event
            async for event in analyze_batch(
                make_request(),
                FakeAnalyzer(unexpected_review_id="review-2"),
            )
        ]

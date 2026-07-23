from __future__ import annotations

import pytest
from pydantic import ValidationError

from review_analyzer.models import (
    CONTRACT_VERSION,
    AnalysisRequest,
    ModelSettings,
    ProviderName,
    ReplyCandidate,
    ReviewAnalysis,
    ReviewInput,
    Sentiment,
)


def test_request_rejects_unsupported_schema_version() -> None:
    with pytest.raises(ValidationError, match="schema_version"):
        AnalysisRequest.model_validate(
            {
                "schema_version": "2.0",
                "job_id": "job-1",
                "settings": {
                    "provider": "ollama",
                    "model": "gemma4:e2b",
                    "product_name": "테스트 상품",
                },
                "reviews": [
                    {
                        "review_id": "review-1",
                        "source_index": 0,
                        "original_text": "좋아요",
                    }
                ],
            }
        )


def test_analysis_requires_three_distinct_reply_candidates() -> None:
    repeated = ReplyCandidate(
        candidate_id="warm",
        tone="정중함",
        rationale="고객에게 감사 인사를 전달합니다.",
        text="소중한 후기 감사합니다.",
    )

    with pytest.raises(ValidationError, match="서로 다른"):
        ReviewAnalysis(
            sentiment=Sentiment.POSITIVE,
            summary="상품에 만족한 후기입니다.",
            key_points=("전반적인 만족",),
            response_strategy=("감사 인사를 전달합니다.",),
            reply_candidates=(repeated, repeated, repeated),
        )


def test_request_rejects_duplicate_review_identifiers() -> None:
    review = ReviewInput(
        review_id="review-1",
        source_index=0,
        original_text="배송이 빨라요",
    )

    with pytest.raises(ValidationError, match="review_id"):
        AnalysisRequest(
            schema_version=CONTRACT_VERSION,
            job_id="job-1",
            settings=ModelSettings(
                provider=ProviderName.OLLAMA,
                model="gemma4:e2b",
                product_name="테스트 상품",
            ),
            reviews=(review, review),
        )

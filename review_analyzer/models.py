from __future__ import annotations

from enum import StrEnum
from typing import Final, Literal, Self, assert_never

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic_core import PydanticCustomError

CONTRACT_VERSION: Final = "1.0"
ContractVersion = Literal["1.0"]


class StrictModel(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", str_strip_whitespace=True)


class ProviderName(StrEnum):
    OLLAMA = "ollama"
    GROQ = "groq"
    OPENAI = "openai"


class Sentiment(StrEnum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class ReviewStatus(StrEnum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class ModelSettings(StrictModel):
    provider: ProviderName = ProviderName.OLLAMA
    model: str = Field(min_length=1, max_length=120)
    product_name: str = Field(min_length=1, max_length=120)
    max_concurrency: int = Field(default=4, ge=1, le=8)
    brand_voice: str = Field(default="친절하고 구체적인 한국어", max_length=500)


class ReviewInput(StrictModel):
    review_id: str = Field(min_length=1, max_length=100)
    source_index: int = Field(ge=0)
    original_text: str = Field(min_length=1, max_length=10_000)


class AnalysisRequest(StrictModel):
    schema_version: ContractVersion
    type: Literal["analyze"] = "analyze"
    job_id: str = Field(min_length=1, max_length=100)
    settings: ModelSettings
    reviews: tuple[ReviewInput, ...] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_unique_reviews(self) -> Self:
        review_ids = [review.review_id for review in self.reviews]
        source_indexes = [review.source_index for review in self.reviews]
        if len(review_ids) != len(set(review_ids)):
            raise PydanticCustomError(
                "duplicate_review_id",
                "review_id는 작업 안에서 고유해야 합니다.",
            )
        if len(source_indexes) != len(set(source_indexes)):
            raise PydanticCustomError(
                "duplicate_source_index",
                "source_index는 작업 안에서 고유해야 합니다.",
            )
        return self


class ReplyCandidate(StrictModel):
    candidate_id: str = Field(min_length=1, max_length=40)
    tone: str = Field(min_length=1, max_length=40)
    text: str = Field(min_length=1, max_length=2_000)
    rationale: str = Field(min_length=1, max_length=300)


class ReviewAnalysis(StrictModel):
    sentiment: Sentiment
    summary: str = Field(min_length=1, max_length=800)
    key_points: tuple[str, ...] = Field(max_length=5)
    response_strategy: tuple[str, ...] = Field(min_length=1, max_length=4)
    reply_candidates: tuple[ReplyCandidate, ...] = Field(min_length=3, max_length=3)
    warnings: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validate_distinct_candidates(self) -> Self:
        texts = [candidate.text for candidate in self.reply_candidates]
        if len(texts) != len(set(texts)):
            raise PydanticCustomError(
                "duplicate_reply_candidate",
                "답변 후보는 서로 다른 문장이어야 합니다.",
            )
        return self


class ErrorInfo(StrictModel):
    code: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=300)
    retryable: bool


class ReviewResultEvent(StrictModel):
    schema_version: ContractVersion = CONTRACT_VERSION
    event: Literal["review_result"] = "review_result"
    job_id: str
    review_id: str
    source_index: int
    status: ReviewStatus
    analysis: ReviewAnalysis | None = None
    error: ErrorInfo | None = None

    @model_validator(mode="after")
    def validate_outcome(self) -> Self:
        match self.status:
            case ReviewStatus.SUCCEEDED:
                if self.analysis is None or self.error is not None:
                    raise PydanticCustomError(
                        "invalid_success_result",
                        "성공 결과는 analysis만 포함해야 합니다.",
                    )
            case ReviewStatus.FAILED:
                if self.error is None or self.analysis is not None:
                    raise PydanticCustomError(
                        "invalid_failed_result",
                        "실패 결과는 error만 포함해야 합니다.",
                    )
            case _ as unreachable:
                assert_never(unreachable)
        return self


class JobStartedEvent(StrictModel):
    schema_version: ContractVersion = CONTRACT_VERSION
    event: Literal["job_started"] = "job_started"
    job_id: str
    total: int = Field(ge=1, le=200)


class JobFinishedEvent(StrictModel):
    schema_version: ContractVersion = CONTRACT_VERSION
    event: Literal["job_finished"] = "job_finished"
    job_id: str
    succeeded_count: int = Field(ge=0)
    failed_count: int = Field(ge=0)


class FatalErrorEvent(StrictModel):
    schema_version: ContractVersion = CONTRACT_VERSION
    event: Literal["fatal_error"] = "fatal_error"
    error: ErrorInfo

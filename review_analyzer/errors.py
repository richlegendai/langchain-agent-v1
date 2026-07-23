from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ReviewAnalysisError(Exception):
    code: str
    retryable: bool
    detail: str

    def __str__(self) -> str:
        return self.detail

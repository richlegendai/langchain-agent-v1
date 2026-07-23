import { describe, expect, it } from "vitest";

import {
  buildReviewInputs,
  createCsvExport,
  parsePastedReviews,
} from "../../src/features/review-analyzer/review-data";

describe("review input", () => {
  it("빈 줄을 제외하고 중복 후기를 원본 순서로 표시한다", () => {
    const parsed = parsePastedReviews("좋아요\n\n배송이 늦어요\n좋아요");

    expect(parsed).toEqual([
      { sourceIndex: 0, text: "좋아요", duplicate: false },
      { sourceIndex: 1, text: "배송이 늦어요", duplicate: false },
      { sourceIndex: 2, text: "좋아요", duplicate: true },
    ]);
  });

  it("중복 제외를 선택하면 분석 입력에서만 중복을 제거한다", () => {
    const parsed = parsePastedReviews("좋아요\n배송이 늦어요\n좋아요");

    const inputs = buildReviewInputs(parsed, true);

    expect(inputs.map((review) => review.original_text)).toEqual(["좋아요", "배송이 늦어요"]);
    expect(inputs.map((review) => review.source_index)).toEqual([0, 1]);
  });

  it("10,000자를 넘는 후기를 분석 입력에서 제외한다", () => {
    const parsed = parsePastedReviews("가".repeat(10_001));

    expect(buildReviewInputs(parsed, true)).toHaveLength(0);
  });
});

describe("CSV export", () => {
  it("스프레드시트 수식으로 실행될 수 있는 셀을 안전하게 처리한다", () => {
    const csv = createCsvExport([
      {
        sourceIndex: 0,
        originalText: '=HYPERLINK("https://example.com")',
        status: "failed",
        sentiment: "",
        summary: "",
        errorMessage: "+위험한 오류",
      },
    ]);

    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+위험한 오류");
  });
});

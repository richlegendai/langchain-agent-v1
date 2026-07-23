import { describe, expect, it } from "vitest";

import { parseReviewLines } from "./reviews";

describe("parseReviewLines", () => {
  it("빈 줄을 제외하고 원본 순서를 보존한다", () => {
    const result = parseReviewLines("배송이 빨라요\n\n포장이 아쉬워요");

    expect(result.reviews.map((review) => review.sourceIndex)).toEqual([0, 1]);
    expect(result.reviews.map((review) => review.originalText)).toEqual([
      "배송이 빨라요",
      "포장이 아쉬워요",
    ]);
  });

  it("중복 후기를 한 번만 포함하고 문제를 알린다", () => {
    const result = parseReviewLines("좋아요\n좋아요");

    expect(result.reviews).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("duplicate");
  });

  it("201건 입력을 거부한다", () => {
    const result = parseReviewLines(
      Array.from({ length: 201 }, (_, index) => `후기 ${index}`).join("\n"),
    );

    expect(result.reviews).toHaveLength(0);
    expect(result.issues[0]?.code).toBe("too_many");
  });
});

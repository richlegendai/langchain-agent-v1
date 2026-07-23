export type ParsedReview = Readonly<{
  reviewId: string;
  sourceIndex: number;
  originalText: string;
}>;

export type ReviewIssue = Readonly<{
  code: "duplicate" | "too_many" | "empty" | "too_long";
  message: string;
  sourceIndex?: number;
}>;

export type ReviewParseResult = Readonly<{
  reviews: readonly ParsedReview[];
  issues: readonly ReviewIssue[];
}>;

export function parseReviewLines(text: string): ReviewParseResult {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      reviews: [],
      issues: [{ code: "empty", message: "후기를 한 건 이상 입력해 주세요." }],
    };
  }
  if (lines.length > 200) {
    return {
      reviews: [],
      issues: [{ code: "too_many", message: "한 번에 최대 200건까지 분석할 수 있습니다." }],
    };
  }

  const seen = new Set<string>();
  const reviews: ParsedReview[] = [];
  const issues: ReviewIssue[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    if (line.length > 10_000) {
      issues.push({
        code: "too_long",
        message: "후기 한 건은 10,000자를 넘을 수 없습니다.",
        sourceIndex: lineIndex,
      });
    } else if (seen.has(line)) {
      issues.push({
        code: "duplicate",
        message: "중복 후기는 분석 대상에서 제외했습니다.",
        sourceIndex: lineIndex,
      });
    } else {
      seen.add(line);
      reviews.push({
        reviewId: `review-${lineIndex + 1}`,
        sourceIndex: reviews.length,
        originalText: line,
      });
    }
  }

  return { reviews, issues };
}

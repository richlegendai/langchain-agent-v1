import { describe, expect, it } from "vitest";

import { analysisReducer, initialAnalysisState } from "./state";

describe("analysisReducer", () => {
  it("후기 한 건이 실패해도 앞선 성공 결과를 유지한다", () => {
    const started = analysisReducer(initialAnalysisState, {
      type: "started",
      jobId: "job-1",
      total: 2,
    });
    const withSuccess = analysisReducer(started, {
      type: "event",
      event: {
        schema_version: "1.0",
        event: "review_result",
        job_id: "job-1",
        review_id: "review-1",
        source_index: 0,
        status: "succeeded",
        analysis: {
          sentiment: "positive",
          summary: "배송이 빠릅니다.",
          key_points: ["빠른 배송"],
          response_strategy: ["감사를 전합니다."],
          reply_candidates: [
            { candidate_id: "warm", tone: "감사형", text: "감사합니다.", rationale: "감사 전달" },
            {
              candidate_id: "brief",
              tone: "간결형",
              text: "후기 감사합니다.",
              rationale: "간결함",
            },
            {
              candidate_id: "care",
              tone: "관계형",
              text: "다음에도 잘 부탁드립니다.",
              rationale: "관계 강화",
            },
          ],
          warnings: [],
        },
        error: null,
      },
    });
    const withFailure = analysisReducer(withSuccess, {
      type: "event",
      event: {
        schema_version: "1.0",
        event: "review_result",
        job_id: "job-1",
        review_id: "review-2",
        source_index: 1,
        status: "failed",
        analysis: null,
        error: { code: "timeout", message: "시간 초과", retryable: true },
      },
    });

    expect(withFailure.results["review-1"]?.status).toBe("succeeded");
    expect(withFailure.results["review-2"]?.status).toBe("failed");
    expect(withFailure.succeeded).toBe(1);
    expect(withFailure.failed).toBe(1);
  });
});

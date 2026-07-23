import { describe, expect, it } from "vitest";

import { parseSidecarEvent } from "./contracts";

describe("parseSidecarEvent", () => {
  it("지원하지 않는 계약 버전을 거부한다", () => {
    expect(() =>
      parseSidecarEvent({ schema_version: "9.9", event: "job_started", job_id: "job-1", total: 1 }),
    ).toThrow();
  });

  it("실패 후기 이벤트를 구조화한다", () => {
    const event = parseSidecarEvent({
      schema_version: "1.0",
      event: "review_result",
      job_id: "job-1",
      review_id: "review-2",
      source_index: 1,
      status: "failed",
      analysis: null,
      error: { code: "timeout", message: "시간이 초과되었습니다.", retryable: true },
    });

    expect(event.event).toBe("review_result");
    if (event.event === "review_result") {
      expect(event.status).toBe("failed");
    }
  });
});

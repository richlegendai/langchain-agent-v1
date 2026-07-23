import { describe, expect, it } from "vitest";

import { parseSidecarEvent } from "../../src/lib/contracts";

describe("sidecar contract", () => {
  it("지원하지 않는 계약 버전을 거부한다", () => {
    expect(() =>
      parseSidecarEvent({
        schema_version: "2.0",
        event: "job_started",
        job_id: "job-1",
        total: 1,
      }),
    ).toThrow("지원하지 않는 메시지 계약");
  });
});

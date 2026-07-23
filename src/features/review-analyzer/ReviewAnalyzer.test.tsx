import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalysisRequest, SidecarEvent } from "../../lib/contracts";
import type { AnalysisDraft } from "./AnalysisForm";
import { createAnalysisRequest, ReviewAnalyzer } from "./ReviewAnalyzer";

const bridgeMocks = vi.hoisted(() => ({
  cancelAnalysis: vi.fn(async () => undefined),
  runAnalysis: vi.fn(),
  saveExport: vi.fn(async () => undefined),
}));

vi.mock("./bridge", () => bridgeMocks);

const review = {
  review_id: "review-1",
  source_index: 0,
  original_text: "배송이 빨라요",
} as const;

const draft: AnalysisDraft = {
  productName: "테스트 상품",
  provider: "ollama",
  model: "gemma4:e2b",
  brandVoice: "친절하고 구체적인 한국어",
  maxConcurrency: 8,
  reviews: [review],
};

describe("createAnalysisRequest", () => {
  it("요청 생성 시 동시 분석 수를 후기 건수 이하로 제한한다", () => {
    const request = createAnalysisRequest(draft, "job-1");

    expect(request.settings.max_concurrency).toBe(1);
    expect(request.reviews).toHaveLength(1);
  });

  it("빈 후기 목록 요청은 명시적으로 실패한다", () => {
    expect(() => createAnalysisRequest({ ...draft, reviews: [] }, "job-empty")).toThrow(
      "분석할 후기가 없습니다.",
    );
  });
});

describe("ReviewAnalyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("재시도 요청도 실패 후기 건수 이하로 동시 분석 수를 제한한다", async () => {
    const user = userEvent.setup();
    bridgeMocks.runAnalysis.mockImplementationOnce(
      async (request: AnalysisRequest, onEvent: (event: SidecarEvent) => void) => {
        onEvent({
          schema_version: "1.0",
          event: "review_result",
          job_id: request.job_id,
          review_id: request.reviews[0]?.review_id ?? "review-1",
          source_index: request.reviews[0]?.source_index ?? 0,
          status: "failed",
          analysis: null,
          error: { code: "timeout", message: "시간 초과", retryable: true },
        });
        onEvent({
          schema_version: "1.0",
          event: "job_finished",
          job_id: request.job_id,
          succeeded_count: 0,
          failed_count: 1,
        });
      },
    );
    bridgeMocks.runAnalysis.mockImplementationOnce(async () => undefined);

    render(<ReviewAnalyzer onBack={vi.fn()} />);
    await user.type(screen.getByRole("textbox", { name: "상품명" }), "테스트 상품");
    await user.type(
      screen.getByRole("textbox", { name: "후기" }),
      Array.from({ length: 8 }, (_, index) => `후기 ${index + 1}`).join("\n"),
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "동시 분석 수" }), "8");
    await user.click(screen.getByRole("button", { name: "후기 분석 시작" }));

    expect(bridgeMocks.runAnalysis.mock.calls[0]?.[0].settings.max_concurrency).toBe(8);
    await user.click(await screen.findByRole("button", { name: "실패 1건 재시도" }));

    expect(bridgeMocks.runAnalysis.mock.calls[1]?.[0].reviews).toHaveLength(1);
    expect(bridgeMocks.runAnalysis.mock.calls[1]?.[0].settings.max_concurrency).toBe(1);
  });
});

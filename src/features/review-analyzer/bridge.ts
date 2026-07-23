import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type { AnalysisRequest, ReviewResultEvent, SidecarEvent } from "../../lib/contracts";
import { parseSidecarEvent } from "../../lib/contracts";

type EventHandler = (event: SidecarEvent) => void;

function isTauriRuntime(): boolean {
  return window.__TAURI_INTERNALS__ !== undefined;
}

async function runPreview(request: AnalysisRequest, onEvent: EventHandler): Promise<void> {
  onEvent({
    schema_version: "1.0",
    event: "job_started",
    job_id: request.job_id,
    total: request.reviews.length,
  });
  for (const review of request.reviews) {
    await Promise.resolve();
    const event: ReviewResultEvent = {
      schema_version: "1.0",
      event: "review_result",
      job_id: request.job_id,
      review_id: review.review_id,
      source_index: review.source_index,
      status: "succeeded",
      analysis: {
        sentiment: review.original_text.includes("아쉽") ? "negative" : "positive",
        summary: "브라우저 미리보기에서 생성한 예시 요약입니다.",
        key_points: ["상품 경험", "고객 의견"],
        response_strategy: ["후기에 감사하고 언급된 경험에 구체적으로 답합니다."],
        reply_candidates: [
          {
            candidate_id: "warm",
            tone: "감사 중심",
            text: "소중한 후기 남겨주셔서 감사합니다.",
            rationale: "고객 경험에 감사를 전합니다.",
          },
          {
            candidate_id: "brief",
            tone: "간결형",
            text: "후기 감사합니다. 더 나은 경험을 준비하겠습니다.",
            rationale: "짧고 분명하게 답합니다.",
          },
          {
            candidate_id: "care",
            tone: "문제 해결형",
            text: "말씀해 주신 내용을 확인하고 개선에 반영하겠습니다.",
            rationale: "개선 의지를 구체적으로 전합니다.",
          },
        ],
        warnings: ["브라우저 미리보기 데이터입니다."],
      },
      error: null,
    };
    onEvent(event);
  }
  onEvent({
    schema_version: "1.0",
    event: "job_finished",
    job_id: request.job_id,
    succeeded_count: request.reviews.length,
    failed_count: 0,
  });
}

export async function runAnalysis(request: AnalysisRequest, onEvent: EventHandler): Promise<void> {
  if (!isTauriRuntime()) {
    await runPreview(request, onEvent);
    return;
  }

  const unlisten = await listen<unknown>("review-analysis-event", (message) => {
    onEvent(parseSidecarEvent(message.payload));
  });
  try {
    await invoke("start_review_analysis", { request });
  } finally {
    unlisten();
  }
}

export async function saveExport(fileName: string, content: string): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("save_export", { fileName, content });
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function cancelAnalysis(jobId: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("cancel_review_analysis", { jobId });
}

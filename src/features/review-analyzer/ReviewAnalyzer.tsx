import { ArrowLeft, MonitorDot } from "lucide-react";
import { useReducer, useRef, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { type AnalysisRequest, CONTRACT_VERSION, type ReviewInput } from "../../lib/contracts";
import { type AnalysisDraft, AnalysisForm } from "./AnalysisForm";
import { cancelAnalysis, runAnalysis, saveExport } from "./bridge";
import { ResultsPanel } from "./ResultsPanel";
import { createCsvExport, resultToExportRow } from "./review-data";
import { analysisReducer, initialAnalysisState } from "./state";

type ReviewAnalyzerProps = Readonly<{ onBack: () => void }>;

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

export function createAnalysisRequest(draft: AnalysisDraft, jobId: string): AnalysisRequest {
  if (draft.reviews.length === 0) {
    throw new Error("분석할 후기가 없습니다.");
  }

  return {
    schema_version: CONTRACT_VERSION,
    type: "analyze",
    job_id: jobId,
    settings: {
      provider: draft.provider,
      model: draft.model,
      product_name: draft.productName,
      max_concurrency: Math.max(1, Math.min(8, draft.maxConcurrency, draft.reviews.length)),
      brand_voice: draft.brandVoice,
    },
    reviews: draft.reviews,
  };
}

export function ReviewAnalyzer({ onBack }: ReviewAnalyzerProps) {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastDraft = useRef<AnalysisDraft | null>(null);
  const [allReviews, setAllReviews] = useState<readonly ReviewInput[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Readonly<Record<string, string>>>({});
  const preview = window.__TAURI_INTERNALS__ === undefined;
  const originals = new Map(allReviews.map((review) => [review.review_id, review.original_text]));

  async function execute(draft: AnalysisDraft, retry: boolean): Promise<void> {
    const jobId = crypto.randomUUID();
    const request = createAnalysisRequest(draft, jobId);

    if (retry) {
      dispatch({ type: "retrying", jobId });
    } else {
      lastDraft.current = draft;
      setAllReviews(draft.reviews);
      setReplyDrafts({});
      setSelectedId(null);
      dispatch({ type: "started", jobId, total: draft.reviews.length });
    }

    try {
      await runAnalysis(request, (event) => dispatch({ type: "event", event }));
    } catch (error: unknown) {
      dispatch({ type: "local_error", message: errorMessage(error) });
    }
  }

  async function retryFailed(): Promise<void> {
    if (lastDraft.current === null) {
      return;
    }
    const failedIds = new Set(
      Object.values(state.results)
        .filter((result) => result.status === "failed" && result.error?.retryable)
        .map((result) => result.review_id),
    );
    const reviews = allReviews.filter((review) => failedIds.has(review.review_id));
    if (reviews.length > 0) {
      await execute({ ...lastDraft.current, reviews }, true);
    }
  }

  async function cancelCurrent(): Promise<void> {
    if (state.jobId === null) {
      return;
    }
    try {
      await cancelAnalysis(state.jobId);
      dispatch({ type: "local_error", message: "분석을 취소했습니다. 완료된 결과는 유지됩니다." });
    } catch (error: unknown) {
      dispatch({ type: "local_error", message: errorMessage(error) });
    }
  }

  async function returnToLauncher(): Promise<void> {
    if (state.running) {
      const confirmed = window.confirm("진행 중인 분석을 취소하고 프로그램 목록으로 돌아갈까요?");
      if (!confirmed) {
        return;
      }
      await cancelCurrent();
    }
    onBack();
  }

  async function exportResults(format: "csv" | "json"): Promise<void> {
    const results = Object.values(state.results).toSorted(
      (left, right) => left.source_index - right.source_index,
    );
    try {
      if (format === "csv") {
        const rows = results.map((result) =>
          resultToExportRow(result, originals.get(result.review_id) ?? ""),
        );
        await saveExport("review-analysis.csv", createCsvExport(rows));
      } else {
        const payload = results.map((result) => ({
          ...result,
          original_text: originals.get(result.review_id) ?? "",
        }));
        await saveExport("review-analysis.json", JSON.stringify(payload, null, 2));
      }
    } catch (error: unknown) {
      dispatch({ type: "local_error", message: errorMessage(error) });
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label="프로그램 목록"
              onClick={() => void returnToLauncher()}
              size="icon"
              variant="ghost"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-[var(--text)]">상품 후기 분석</h1>
              <p className="truncate text-xs text-[var(--text-muted)]">LangChain 구조화 분석</p>
            </div>
          </div>
          {preview ? (
            <Badge tone="warning">
              <MonitorDot aria-hidden="true" className="mr-1 size-3.5" />
              브라우저 미리보기
            </Badge>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(340px,5fr)_minmax(0,7fr)] lg:py-6">
        <AnalysisForm
          onCancel={cancelCurrent}
          onStart={(draft) => execute(draft, false)}
          running={state.running}
        />
        <ResultsPanel
          drafts={replyDrafts}
          onExport={exportResults}
          onRetry={retryFailed}
          onSelect={setSelectedId}
          onUpdateDraft={(draftId, text) =>
            setReplyDrafts((current) => ({ ...current, [draftId]: text }))
          }
          originals={originals}
          selectedId={selectedId}
          state={state}
        />
      </main>
    </div>
  );
}

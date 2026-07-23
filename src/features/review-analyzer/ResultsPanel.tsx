import { Progress } from "@base-ui/react/progress";
import { Download, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";
import { ResultDetail } from "./ResultDetail";
import type { AnalysisState } from "./state";

type ResultsPanelProps = Readonly<{
  state: AnalysisState;
  originals: ReadonlyMap<string, string>;
  drafts: Readonly<Record<string, string>>;
  selectedId: string | null;
  onSelect: (reviewId: string) => void;
  onUpdateDraft: (draftId: string, text: string) => void;
  onRetry: () => Promise<void>;
  onExport: (format: "csv" | "json") => Promise<void>;
}>;

export function ResultsPanel({
  state,
  originals,
  drafts,
  selectedId,
  onSelect,
  onUpdateDraft,
  onRetry,
  onExport,
}: ResultsPanelProps) {
  const [sort, setSort] = useState<"source" | "completed">("source");
  const completedResults = Object.values(state.results);
  const results = useMemo(
    () =>
      sort === "source"
        ? completedResults.toSorted((left, right) => left.source_index - right.source_index)
        : completedResults,
    [completedResults, sort],
  );
  const effectiveSelectedId = selectedId ?? results[0]?.review_id ?? null;
  const selected = effectiveSelectedId === null ? undefined : state.results[effectiveSelectedId];
  const progress =
    state.total === 0 ? 0 : Math.round(((state.succeeded + state.failed) / state.total) * 100);
  const retryCount = completedResults.filter(
    (result) => result.status === "failed" && result.error?.retryable,
  ).length;

  return (
    <Panel className="min-w-0 overflow-hidden">
      <div className="border-b border-[var(--border)] p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text)]">분석 결과</h2>
            <p aria-live="polite" className="mt-1 text-sm text-[var(--text-muted)]">
              성공 {state.succeeded}건, 실패 {state.failed}건, 전체 {state.total}건
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {retryCount > 0 ? (
              <Button disabled={state.running} onClick={onRetry} variant="secondary">
                <RefreshCw aria-hidden="true" className="size-4" />
                실패 {retryCount}건 재시도
              </Button>
            ) : null}
            <Button
              disabled={completedResults.length === 0}
              onClick={() => onExport("csv")}
              variant="secondary"
            >
              <Download aria-hidden="true" className="size-4" />
              CSV
            </Button>
            <Button
              disabled={completedResults.length === 0}
              onClick={() => onExport("json")}
              variant="secondary"
            >
              JSON
            </Button>
          </div>
        </div>
        <Progress.Root aria-label="분석 진행률" className="mt-5" value={progress}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <Progress.Label>진행률</Progress.Label>
            <Progress.Value />
          </div>
          <Progress.Track className="h-2 overflow-hidden rounded-full bg-[#E5E7E5]">
            <Progress.Indicator className="h-full rounded-full bg-[var(--accent)]" />
          </Progress.Track>
        </Progress.Root>
        {state.fatalError !== null ? (
          <p className="mt-3 rounded-lg bg-[#FFF1F0] p-3 text-sm font-medium text-[var(--danger)]">
            {state.fatalError}
          </p>
        ) : null}
      </div>

      {results.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xl text-[var(--text-muted)]">
            0
          </div>
          <h3 className="mt-4 text-sm font-bold text-[var(--text)]">아직 분석 결과가 없습니다.</h3>
          <p className="mt-2 max-w-sm break-keep text-sm leading-6 text-[var(--text-muted)]">
            분석 설정에 상품명과 후기를 입력해 주세요.
          </p>
        </div>
      ) : (
        <div className="grid min-h-[600px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-[var(--border)] lg:border-r lg:border-b-0">
            <div className="border-b border-[var(--border)] p-3">
              <select
                aria-label="결과 정렬"
                className="min-h-11 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                onChange={(event) =>
                  setSort(event.target.value === "completed" ? "completed" : "source")
                }
                value={sort}
              >
                <option value="source">원본 순서</option>
                <option value="completed">완료 순서</option>
              </select>
            </div>
            <div className="max-h-[360px] overflow-y-auto lg:max-h-[720px]">
              {results.map((result) => (
                <button
                  aria-current={result.review_id === effectiveSelectedId ? "true" : undefined}
                  className="w-full cursor-pointer border-b border-[var(--border)] px-4 py-4 text-left outline-none hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] aria-[current=true]:border-l-2 aria-[current=true]:border-l-[var(--accent)] aria-[current=true]:bg-[#F0F8F7]"
                  key={result.review_id}
                  onClick={() => onSelect(result.review_id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      후기 {result.source_index + 1}
                    </span>
                    <Badge tone={result.status === "failed" ? "danger" : "success"}>
                      {result.status === "failed" ? "실패" : "완료"}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--text)]">
                    {result.analysis?.summary ?? originals.get(result.review_id)}
                  </p>
                </button>
              ))}
            </div>
          </aside>
          <div className="min-w-0">
            {selected === undefined ? null : (
              <ResultDetail
                drafts={drafts}
                onUpdateDraft={onUpdateDraft}
                original={originals.get(selected.review_id) ?? ""}
                result={selected}
              />
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

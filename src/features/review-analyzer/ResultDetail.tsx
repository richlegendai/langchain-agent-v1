import { Check, Clipboard } from "lucide-react";
import { useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { ReviewResultEvent } from "../../lib/contracts";

const SENTIMENT_LABELS = { positive: "긍정", negative: "부정", neutral: "중립" } as const;

function CandidateCard({
  candidate,
  text,
  onTextChange,
}: Readonly<{
  candidate: NonNullable<ReviewResultEvent["analysis"]>["reply_candidates"][number];
  text: string;
  onTextChange: (text: string) => void;
}>) {
  const [copied, setCopied] = useState(false);

  async function copyText(): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-[var(--text)]">{candidate.tone}</h4>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{candidate.rationale}</p>
        </div>
        <Button
          aria-label={`${candidate.tone} 답변 복사`}
          onClick={copyText}
          size="icon"
          variant="ghost"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4 text-[var(--success)]" />
          ) : (
            <Clipboard aria-hidden="true" className="size-4" />
          )}
        </Button>
      </div>
      <textarea
        aria-label={`${candidate.tone} 답변 편집`}
        className="min-h-28 w-full resize-y rounded-lg border border-[var(--border)] bg-white p-3 text-sm leading-6 text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        onChange={(event) => {
          setCopied(false);
          onTextChange(event.target.value);
        }}
        value={text}
      />
    </article>
  );
}

export function ResultDetail({
  result,
  original,
  drafts,
  onUpdateDraft,
}: Readonly<{
  result: ReviewResultEvent;
  original: string;
  drafts: Readonly<Record<string, string>>;
  onUpdateDraft: (draftId: string, text: string) => void;
}>) {
  if (result.status === "failed" || result.analysis === null) {
    return (
      <div className="p-5 lg:p-6">
        <Badge tone="danger">분석 실패</Badge>
        <h3 className="mt-4 text-base font-bold text-[var(--text)]">
          이 후기를 분석하지 못했습니다.
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{result.error?.message}</p>
        <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text)]">
          {original}
        </div>
      </div>
    );
  }

  return (
    <div className="break-keep space-y-6 p-5 lg:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              result.analysis.sentiment === "negative"
                ? "danger"
                : result.analysis.sentiment === "positive"
                  ? "success"
                  : "neutral"
            }
          >
            {SENTIMENT_LABELS[result.analysis.sentiment]}
          </Badge>
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            후기 {result.source_index + 1}
          </span>
        </div>
        <blockquote className="mt-4 border-l-2 border-[var(--accent)] pl-4 text-sm leading-6 text-[var(--text)]">
          {original}
        </blockquote>
      </div>

      <div>
        <h3 className="text-sm font-bold text-[var(--text)]">요약</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{result.analysis.summary}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-[var(--text)]">핵심 내용</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
            {result.analysis.key_points.map((point) => (
              <li className="flex gap-2" key={point}>
                <span aria-hidden="true">-</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text)]">대응 전략</h3>
          <ol className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
            {result.analysis.response_strategy.map((strategy, index) => (
              <li className="flex gap-2" key={strategy}>
                <span className="font-semibold text-[var(--accent)]">{index + 1}.</span>
                <span>{strategy}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-[var(--text)]">추천 답변</h3>
        <div className="mt-3 grid gap-3 xl:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          {result.analysis.reply_candidates.map((candidate) => (
            <CandidateCard
              candidate={candidate}
              key={`${result.review_id}-${candidate.candidate_id}`}
              onTextChange={(text) =>
                onUpdateDraft(`${result.review_id}:${candidate.candidate_id}`, text)
              }
              text={drafts[`${result.review_id}:${candidate.candidate_id}`] ?? candidate.text}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

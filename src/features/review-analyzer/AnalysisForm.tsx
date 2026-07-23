import { LoaderCircle, Play, Square } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";
import type { ProviderName, ReviewInput } from "../../lib/contracts";
import { MODELS, parseProviderName } from "./analysis-options";
import { CsvImport } from "./CsvImport";
import { buildReviewInputs, MAX_REVIEW_LENGTH, parsePastedReviews } from "./review-data";

export type AnalysisDraft = Readonly<{
  productName: string;
  provider: ProviderName;
  model: string;
  brandVoice: string;
  maxConcurrency: number;
  reviews: readonly ReviewInput[];
}>;

type AnalysisFormProps = Readonly<{
  running: boolean;
  onStart: (draft: AnalysisDraft) => Promise<void>;
  onCancel: () => Promise<void>;
}>;

const FIELD_CLASS =
  "min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none placeholder:text-[#8A948F] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[#B9DCD8]";

export function AnalysisForm({ running, onStart, onCancel }: AnalysisFormProps) {
  const [productName, setProductName] = useState("");
  const [rawReviews, setRawReviews] = useState("");
  const [provider, setProvider] = useState<ProviderName>("ollama");
  const [model, setModel] = useState(MODELS.ollama[0] ?? "gemma4:e2b");
  const [brandVoice, setBrandVoice] = useState("친절하고 구체적인 한국어");
  const [maxConcurrency, setMaxConcurrency] = useState(4);
  const [excludeDuplicates, setExcludeDuplicates] = useState(true);
  const [cloudAccepted, setCloudAccepted] = useState(false);
  const pasted = useMemo(() => parsePastedReviews(rawReviews), [rawReviews]);
  const reviews = useMemo(
    () => buildReviewInputs(pasted, excludeDuplicates),
    [excludeDuplicates, pasted],
  );
  const duplicateCount = pasted.filter((review) => review.duplicate).length;
  const tooLongCount = pasted.filter((review) => review.text.length > MAX_REVIEW_LENGTH).length;
  const concurrencyLimit = Math.min(8, reviews.length);
  const effectiveMaxConcurrency =
    reviews.length === 0 ? 0 : Math.min(maxConcurrency, concurrencyLimit);
  const cloudProvider = provider !== "ollama";
  const valid =
    productName.trim().length > 0 &&
    reviews.length > 0 &&
    reviews.length <= 200 &&
    tooLongCount === 0;

  function handleProviderChange(nextProvider: ProviderName) {
    setProvider(nextProvider);
    setModel(MODELS[nextProvider][0] ?? "");
    setCloudAccepted(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!valid || (cloudProvider && !cloudAccepted)) {
      return;
    }
    await onStart({
      productName: productName.trim(),
      provider,
      model,
      brandVoice: brandVoice.trim(),
      maxConcurrency: effectiveMaxConcurrency,
      reviews,
    });
  }

  return (
    <Panel className="p-5 lg:p-6">
      <div className="mb-6">
        <h2 className="text-base font-bold text-[var(--text)]">분석 설정</h2>
        <p className="mt-1 break-keep text-sm leading-6 text-[var(--text-muted)]">
          한 줄에 후기 한 건을 입력하면 완료되는 순서대로 결과를 보여드립니다.
        </p>
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--text)]">상품명</span>
          <input
            className={FIELD_CLASS}
            maxLength={120}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="예: 데일리 머그컵"
            value={productName}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--text)]">후기</span>
          <textarea
            className={`${FIELD_CLASS} min-h-44 resize-y py-3 leading-6`}
            maxLength={2_100_000}
            onChange={(event) => setRawReviews(event.target.value)}
            placeholder={"배송이 빠르고 포장이 꼼꼼해요.\n색상은 예쁘지만 손잡이가 조금 불편해요."}
            value={rawReviews}
          />
        </label>

        <CsvImport onImport={setRawReviews} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">모델 제공자</span>
            <select
              className={FIELD_CLASS}
              onChange={(event) => handleProviderChange(parseProviderName(event.target.value))}
              value={provider}
            >
              <option value="ollama">Ollama 로컬</option>
              <option value="groq">Groq 클라우드</option>
              <option value="openai">OpenAI 클라우드</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">모델</span>
            <select
              className={FIELD_CLASS}
              onChange={(event) => setModel(event.target.value)}
              value={model}
            >
              {MODELS[provider].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label className="block" htmlFor="brand-voice">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
              추천 답변 말투
            </span>
            <input
              aria-describedby="brand-voice-description"
              className={FIELD_CLASS}
              id="brand-voice"
              maxLength={500}
              onChange={(event) => setBrandVoice(event.target.value)}
              value={brandVoice}
            />
          </label>
          <span
            className="mt-2 block break-keep text-xs leading-5 text-[var(--text-muted)]"
            id="brand-voice-description"
          >
            <span>감성, 요약, 핵심 내용은 그대로입니다.</span>{" "}
            <span className="whitespace-nowrap">추천 답변 3건만 말투가 바뀝니다.</span>
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <label className="block" htmlFor="max-concurrency">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                동시 분석 수
              </span>
              <select
                aria-describedby="max-concurrency-description"
                className={FIELD_CLASS}
                disabled={reviews.length === 0}
                id="max-concurrency"
                onChange={(event) => setMaxConcurrency(Number(event.target.value))}
                value={reviews.length === 0 ? "" : effectiveMaxConcurrency}
              >
                {reviews.length === 0 ? (
                  <option disabled value="">
                    후기를 먼저 입력해 주세요.
                  </option>
                ) : (
                  Array.from({ length: concurrencyLimit }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}건
                    </option>
                  ))
                )}
              </select>
            </label>
            <span
              className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
              id="max-concurrency-description"
            >
              {reviews.length === 0
                ? "후기 입력 후 건수에 맞는 동시 분석 수를 선택할 수 있습니다."
                : `후기 ${reviews.length}건을 최대 ${concurrencyLimit}건씩 동시에 분석합니다.`}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
              중복 후기 처리
            </span>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)]">
              <input
                checked={excludeDuplicates}
                className="size-4 accent-[var(--accent)]"
                onChange={(event) => setExcludeDuplicates(event.target.checked)}
                type="checkbox"
              />
              중복 후기 제외
            </label>
            <span className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              같은 내용의 후기를 한 번만 분석합니다.
            </span>
          </div>
        </div>

        {cloudProvider ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E9D39C] bg-[#FFF8E6] p-4 text-sm leading-6 text-[var(--text)]">
            <input
              checked={cloudAccepted}
              className="mt-1 size-4 accent-[var(--accent)]"
              onChange={(event) => setCloudAccepted(event.target.checked)}
              type="checkbox"
            />
            후기 원문이 선택한 클라우드 모델 제공자에게 전송되는 것에 동의합니다.
          </label>
        ) : null}

        <div
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-muted)]"
        >
          <span>
            분석 대상 {reviews.length}건{duplicateCount > 0 ? `, 중복 ${duplicateCount}건` : ""}
          </span>
          {reviews.length > 200 ? (
            <span className="font-semibold text-[var(--danger)]">
              최대 200건까지 입력할 수 있습니다.
            </span>
          ) : null}
          {tooLongCount > 0 ? (
            <span className="font-semibold text-[var(--danger)]">
              후기 {tooLongCount}건이 10,000자를 초과했습니다.
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            data-loading={running}
            disabled={!valid || running || (cloudProvider && !cloudAccepted)}
            type="submit"
          >
            {running ? (
              <LoaderCircle aria-hidden="true" className="size-4" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
            {running ? "분석 중" : "후기 분석 시작"}
          </Button>
          {running ? (
            <Button onClick={onCancel} type="button" variant="danger">
              <Square aria-hidden="true" className="size-4" />
              취소
            </Button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

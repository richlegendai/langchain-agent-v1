import Papa from "papaparse";

import type { ReviewResultEvent } from "../../lib/contracts";
import { createCsv } from "../../lib/export";

export const MAX_REVIEW_LENGTH = 10_000;

export type PastedReview = Readonly<{
  sourceIndex: number;
  text: string;
  duplicate: boolean;
}>;

export type CsvData = Readonly<{
  headers: readonly string[];
  rows: readonly Readonly<Record<string, string>>[];
  errors: readonly string[];
}>;

export function parsePastedReviews(text: string): readonly PastedReview[] {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, sourceIndex) => {
      const duplicate = seen.has(line);
      seen.add(line);
      return { sourceIndex, text: line, duplicate };
    });
}

export function buildReviewInputs(reviews: readonly PastedReview[], excludeDuplicates: boolean) {
  return reviews
    .filter(
      (review) =>
        review.text.length <= MAX_REVIEW_LENGTH && !(excludeDuplicates && review.duplicate),
    )
    .map((review) => ({
      review_id: `review-${review.sourceIndex + 1}`,
      source_index: review.sourceIndex,
      original_text: review.text,
    }));
}

export function parseCsvText(text: string): CsvData {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  return {
    headers,
    rows: parsed.data,
    errors: parsed.errors.map((error) => {
      const location = error.row === undefined ? "행 위치 확인 필요" : `행 ${error.row + 2}`;
      return `${location}: ${error.message}`;
    }),
  };
}

export function createCsvExport(
  rows: readonly Readonly<{
    sourceIndex: number;
    originalText: string;
    status: string;
    sentiment: string;
    summary: string;
    errorMessage: string;
  }>[],
): string {
  return createCsv([
    ["순번", "후기 원문", "상태", "감성", "요약", "오류"],
    ...rows.map((row) => [
      String(row.sourceIndex + 1),
      row.originalText,
      row.status,
      row.sentiment,
      row.summary,
      row.errorMessage,
    ]),
  ]);
}

export function resultToExportRow(event: ReviewResultEvent, originalText: string) {
  return {
    sourceIndex: event.source_index,
    originalText,
    status: event.status,
    sentiment: event.analysis?.sentiment ?? "",
    summary: event.analysis?.summary ?? "",
    errorMessage: event.error?.message ?? "",
  };
}
